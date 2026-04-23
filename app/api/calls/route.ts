import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
import crypto from 'crypto';
import RATES_DATA from '../../../context/rates.json';

const ELEVENLABS_BASE_URL = 'https://api.elevenlabs.io/v1';

// --- Improved Helper: Number Normalization ---
function cleanPhoneNumber(num: any): string {
    if (!num) return "Unknown";
    const str = String(num).replace(/\s+/g, '').replace(/\+/g, '').replace(/\D/g, '');
    // Standard phone numbers are between 5 and 20 digits to accommodate all international formats.
    if (!str || str.length < 5 || str.length > 22) return "Unknown";
    return str;
}

// --- Improved Helper: Longest Prefix Matching ---
function getRateInfo(phoneNumber: string) {
    const cleaned = cleanPhoneNumber(phoneNumber);
    if (cleaned === "Unknown") return null;

    // Sort prefixes by length desc for priority
    const matches = RATES_DATA.filter(r => cleaned.startsWith(String(r.Prefix)));
    if (matches.length === 0) return null;
    matches.sort((a, b) => String(b.Prefix).length - String(a.Prefix).length);
    return matches[0];
}

function calculateTelephonyCost(durationSecs: number, phoneNumber: string, isInbound: boolean, providerNumber?: string) {
    if (isInbound) return durationSecs > 0 ? 0.02 : 0;
    if (!durationSecs || durationSecs <= 0) return 0;

    const pClean = (providerNumber || "").replace(/\D/g, '');
    const tClean = (phoneNumber || "").replace(/\D/g, '');

    const botIsUS = pClean.startsWith('1');
    const botIsUK = pClean.startsWith('44');
    const targetIsUAE = tClean.startsWith('971');
    const targetIsUS = tClean.startsWith('1');
    const targetIsUK = tClean.startsWith('44');

    // 🚀 Custom Twilio Partner Rates (Manual Overrides)
    if (botIsUS || botIsUK) {
        // US/UK call to UAE
        if (targetIsUAE) return (durationSecs / 60) * 0.2426;

        // US to US local
        if (botIsUS && targetIsUS) return (durationSecs / 60) * 0.013;

        // UK to UK local
        if (botIsUK && targetIsUK) return (durationSecs / 60) * 0.0305;

        // Fallback for Twilio international calls if no specific rule above is matched
        return (durationSecs / 60) * 0.05;
    }

    // Default rate lookup from rates.json for other regions/providers
    const rate = getRateInfo(tClean);
    return (durationSecs / 60) * (rate?.Rate ?? 0);
}

function calculateCostValue(durationSecs: number, phoneNumber: string, isInbound: boolean) {
    return calculateTelephonyCost(durationSecs, phoneNumber, isInbound);
}

function getMaqsamSignature(method: string, endpoint: string, timestamp: string, accessSecret: string) {
    const payload = `${method}${endpoint}${timestamp}`;
    return crypto
        .createHmac("sha256", accessSecret)
        .update(payload)
        .digest("base64");
}

// --- 1. Leads Cache (Supabase) ---
async function fetchLeadsCache() {
    const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim();
    const secretKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
    if (!supabaseUrl || !secretKey) return new Map();

    const baseUrl = `${supabaseUrl.replace(/\/$/, "")}/rest/v1`;
    const headers = { "apikey": secretKey, "Authorization": `Bearer ${secretKey}` };
    const leadsMap = new Map<string, { name: string; status: any }>();

    try {
        const tables = ["nr_wf", "followup", "nurture", "master_leads"];
        const results = await Promise.all(tables.map(t => 
            fetch(`${baseUrl}/${t}?select=name,phone,Phone,phoneNumber,phonenumber,customer_number,lead_status`, { headers })
                .then(r => r.json())
                .catch(() => [])
        ));

        results.forEach(data => {
            if (Array.isArray(data)) {
                data.forEach(l => {
                    const phoneRaw = l.phone || l.phoneNumber || l.phonenumber || l.customer_number || "";
                    const clean = cleanPhoneNumber(phoneRaw);
                    if (clean !== "Unknown" && (l.name || l.lead_status)) {
                        // Priority: merge if already exists, but master_leads info should take precedence if status exists
                        const existing = leadsMap.get(clean);
                        leadsMap.set(clean, { 
                            name: l.name || existing?.name || "Guest", 
                            status: l.lead_status || existing?.status || null 
                        });
                    }
                });
            }
        });
    } catch (e) { console.error("Leads cache error:", e); }
    return leadsMap;
}

// --- 1.5. Evaluations Cache (Supabase) ---
async function fetchLlmEvaluationsCache() {
    const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim();
    const secretKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
    if (!supabaseUrl || !secretKey) return new Map();

    const baseUrl = `${supabaseUrl.replace(/\/$/, "")}/rest/v1`;
    const headers = { "apikey": secretKey, "Authorization": `Bearer ${secretKey}` };
    const evalMap = new Map<string, string>();

    try {
        const res = await fetch(`${baseUrl}/call_evaluations?select=id,intent`, { headers });
        if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data)) {
                data.forEach(e => evalMap.set(e.id, e.intent));
            }
        }
    } catch (e) {} // Silent fail if table doesn't exist yet
    return evalMap;
}

/**
 * Syncs the last 7 days of Vapi/ElevenLabs calls to Supabase in batches of 70.
 * Triggered on every dashboard visit to ensure data persistence.
 */
async function syncRecentVapiCalls(calls: any[]) {
    const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim();
    const secretKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
    if (!supabaseUrl || !secretKey || !calls.length) return;

    const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    const recentCalls = calls.filter(c => {
        const time = new Date(c.startedAt).getTime();
        return time > sevenDaysAgo && (c.source === 'vapi' || c.source === 'elevenlabs');
    });

    if (recentCalls.length === 0) return;

    const headers = { 
        "apikey": secretKey, 
        "Authorization": `Bearer ${secretKey}`,
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates" 
    };

    const CHUNK_SIZE = 70;
    for (let i = 0; i < recentCalls.length; i += CHUNK_SIZE) {
        const chunk = recentCalls.slice(i, i + CHUNK_SIZE).map(c => ({
            id: c.id,
            started_at: c.startedAt,
            customer_phone: c.phone || c.customer_number || "Unknown",
            customer_name: (c.name && c.name !== "Unknown") ? c.name : "Guest",
            duration_seconds: c.durationSeconds,
            status: c.status,
            cost_usd: c.costValue,
            transcript: c.raw?.transcript || c.raw?.messages || c.raw?.analysis?.transcript || [],
            summary: c.callSummary || "",
            recording_url: c.raw?.audio_url || c.raw?.recordingUrl || c.raw?.artifact?.recordingUrl || "",
            raw_data: c.raw || {}
        }));

        try {
            await fetch(`${supabaseUrl.replace(/\/$/, "")}/rest/v1/vapi_call_logs`, {
                method: "POST",
                headers,
                body: JSON.stringify(chunk)
            });
        } catch (e) {
            console.error(`[SupabaseSync] Batch of ${chunk.length} failed:`, e);
        }
    }
}

/**
 * Fetches archived call logs from Supabase based on the date range.
 */
async function fetchArchivedCallLogs(fromDate: Date | null, toDate: Date | null) {
    const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim();
    const secretKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
    if (!supabaseUrl || !secretKey) return [];

    const baseUrl = `${supabaseUrl.replace(/\/$/, "")}/rest/v1`;
    const headers = { "apikey": secretKey, "Authorization": `Bearer ${secretKey}` };
    
    let url = `${baseUrl}/vapi_call_logs?select=*`;
    if (fromDate) url += `&started_at=gte.${fromDate.toISOString()}`;
    if (toDate) url += `&started_at=lte.${toDate.toISOString()}`;

    try {
        const res = await fetch(url, { headers });
        if (res.ok) {
            const data = await res.json();
            return data.map((d: any) => ({
                ...d,
                startedAt: d.started_at,
                durationSeconds: d.duration_seconds,
                costValue: d.cost_usd,
                cost: `$${(d.cost_usd || 0).toFixed(3)}`,
                phone: d.customer_phone,
                name: d.customer_name,
                phoneNumber: d.customer_phone, // Fallback for some child components
                callSummary: d.summary,
                raw: d.raw_data
            }));
        }
    } catch (e) { console.error("[SupabaseFetch] Error:", e); }
    return [];
}

// --- 2. Vapi Phone Cache ---
async function fetchVapiPhonesCache(vapiPrivKey: string) {
    const phoneMap = new Map<string, string>();

    // 🚀 Manual Overrides (User Provided)
    phoneMap.set('4a7e7a31-0bbc-4fde-831e-2489119ee226', '17624000439');
    phoneMap.set('e66fe46b-9fe2-4628-a32b-08ced680bc04', '97144396291');
    phoneMap.set('4baf3613-ba3d-4860-9ea1-62156686b6f1', '447462179309');
    phoneMap.set('66dff692-d2a5-47d4-bbe0-245509dc7404', '14782159151');
    phoneMap.set('d91ba874-2522-4d62-adf6-681f2a0bf4fe', '97148714150');

    if (!vapiPrivKey) return phoneMap;

    try {
        const res = await fetch('https://api.vapi.ai/phone-number', {
            headers: { 'Authorization': `Bearer ${vapiPrivKey}` }
        });
        if (res.ok) {
            const data = await res.json();
            const list = Array.isArray(data) ? data : (data.data || []);
            list.forEach((p: any) => {
                if (p.id && (p.number || p.phoneNumber)) {
                    const clean = cleanPhoneNumber(p.number || p.phoneNumber);
                    if (clean !== "Unknown") phoneMap.set(p.id, clean);
                }
            });
        }
    } catch (e) { console.error("Vapi phone cache error:", e); }
    return phoneMap;
}

export async function GET(req: Request) {
    try {
        const vapiPrivKey = process.env.VAPI_PRIVATE_KEY || "";
        const { searchParams } = new URL(req.url);
        const fromParam = searchParams.get('from');
        const toParam = searchParams.get('to');
        const includeElevenLabs = searchParams.get('includeElevenLabs') === 'true';
        const fromDate = fromParam ? new Date(fromParam) : null;
        const toDate = toParam ? new Date(toParam) : null;

        const [leadsCache, vapiPhoneCache, evalCache, archivedCalls] = await Promise.all([
            fetchLeadsCache(),
            fetchVapiPhonesCache(vapiPrivKey),
            fetchLlmEvaluationsCache(),
            fetchArchivedCallLogs(fromDate, toDate)
        ]);

        const apiKey = process.env.ELEVENLABS_API_KEY;
        const agentId = process.env.ELEVENLABS_AGENT_ID;

        // --- 1. ElevenLabs Aggregation ---
        let elNormalized: any[] = [];
        try {
            if (apiKey && includeElevenLabs) {
                let allConversations: any[] = [];
                let hasMore = true;
                let lastId = null;
                let pagesFetched = 0;
                const MAX_PAGES = 50; // Increased to catch over 5000 records

                while (hasMore && pagesFetched < MAX_PAGES) {
                    let listUrl = `${ELEVENLABS_BASE_URL}/convai/conversations?page_size=100`;

                    if (lastId) listUrl += `&cursor=${lastId}`;

                    const listRes = await fetch(listUrl, {
                        headers: { 'xi-api-key': apiKey, 'Content-Type': 'application/json' }
                    });

                    if (!listRes.ok) break;

                    const listData = await listRes.json();
                    const list = listData.conversations || [];

                    if (list.length === 0) break;

                    // Filter locally by date if requested to avoid excessive detail fetching
                    let filteredList = list;
                    if (fromDate || toDate) {
                        filteredList = list.filter((c: any) => {
                            const startTime = c.start_time_unix_secs ? c.start_time_unix_secs * 1000 : 0;
                            if (fromDate && startTime < fromDate.getTime()) return false;
                            if (toDate && startTime > toDate.getTime()) return false;
                            return true;
                        });
                    }

                    allConversations = [...allConversations, ...filteredList];

                    // Stop if we've reached conversations older than fromDate
                    const oldestInPage = list[list.length - 1].start_time_unix_secs * 1000;
                    if (fromDate && oldestInPage < fromDate.getTime()) break;

                    // ElevenLabs pagination uses next_cursor
                    lastId = listData.next_cursor;
                    hasMore = !!lastId;
                    pagesFetched++;
                }

                // Enrichment: Fetch details for relevant conversations in small, fast batches
                const enrichmentLimit = 40; // Reduced for performance
                const enrichmentMap = new Map();
                const toEnrich = allConversations.slice(0, enrichmentLimit);
                
                const CHUNK_SIZE = 10;
                for (let i = 0; i < toEnrich.length; i += CHUNK_SIZE) {
                    const chunk = toEnrich.slice(i, i + CHUNK_SIZE);
                    const results = await Promise.all(
                        chunk.map(async (c: any) => {
                            try {
                                const dr = await fetch(`${ELEVENLABS_BASE_URL}/convai/conversations/${c.conversation_id}`, {
                                    headers: { 'xi-api-key': apiKey },
                                    signal: AbortSignal.timeout(4000)
                                });
                                if (dr.ok) return await dr.json();
                            } catch (e) { }
                            return null;
                        })
                    );
                    results.forEach(d => {
                        if (d) enrichmentMap.set(d.conversation_id, d);
                    });
                }

                // Normalize ALL conversations, using enriched data where available
                elNormalized = allConversations.map((c: any, idx: number) => {
                    const enriched = enrichmentMap.get(c.conversation_id) || {};
                    const merged = { ...c, ...enriched };

                    const tel = merged.telephony || {};
                    const meta = merged.metadata || merged.metadata_json || {};
                    const dv = (merged.conversation_initiation_client_data?.dynamic_variables) || {};

                    const caller = cleanPhoneNumber(tel.caller_number || meta.caller_number || dv.caller_number);
                    const callee = cleanPhoneNumber(tel.callee_number || meta.callee_number || dv.callee_number);

                    const initType = (merged.conversation_initiation_type || "").toLowerCase();
                    const direction = (tel.direction || merged.direction || meta.direction || dv.direction || dv.type || "").toLowerCase();
                    const rawType = (merged.type || meta.type || "").toLowerCase();
                    const src = (merged.conversation_initiation_source || "").toLowerCase();

                    // Inbound Detection
                    const isInbound = initType.includes('inbound') || direction === 'inbound' || rawType === 'inbound';
                    const isWeb = initType === 'web' || src === 'react_sdk';

                    // Clean Inbound/Outbound Logic
                    const phoneRaw = isInbound ? caller : callee;
                    const phone = (phoneRaw !== "Unknown") ? `+${phoneRaw}` : (isWeb ? "Website/API" : "Unknown");

                    const duration = merged.call_duration_secs || merged.duration_secs || meta.call_duration_secs || 0;
                    const rateEntry: any = getRateInfo(phoneRaw);
                    const costUSD = calculateCostValue(duration, phoneRaw, isInbound);

                    const startTimeSec = merged.start_time_unix_secs || merged.start_time || 0;
                    if (!startTimeSec) return null; // FIX: Skip ghost entries with no date 
                    const startedAt = new Date(startTimeSec * 1000).toISOString();

                    // Name Detection
                    const firstName = dv.first_name || meta.first_name || "";
                    const lastName = dv.last_name || meta.last_name || "";
                    const fullName = (firstName && lastName) ? `${firstName} ${lastName}` : (firstName || lastName);
                    let name = fullName || meta.user_name || meta.name || dv.user_name || dv.name || "Guest";

                    const resolvedFromLead = leadsCache.get(phoneRaw);
                    if (resolvedFromLead) {
                        name = resolvedFromLead.name || name;
                        (merged as any).leadStatus = resolvedFromLead.status;
                    }

                    // Filter out phone numbers as names
                    if (name && /^\d+$/.test(name.replace(/\D/g, '')) && name.length > 5) {
                        name = "Guest";
                    }

                    return {
                        id: merged.conversation_id,
                        name: name === "Guest" ? "Guest" : name,
                        startedAt,
                        durationSeconds: duration,
                        cost: costUSD > 0 ? `$${costUSD.toFixed(3)}` : (meta.cost ? `${meta.cost} credits` : "$0.00"),
                        costValue: costUSD,
                        breakdown: {
                            agent: 0,
                            telephony: costUSD,
                            total: costUSD
                        },
                        type: isInbound ? "Inbound" : (isWeb ? "Web Call" : "Outbound"),
                        isInbound,
                        phone,
                        phoneNumber: callee,
                        country: rateEntry?.Country || (phone.startsWith('+') ? "Other" : "Unknown"),
                        source: 'elevenlabs',
                        status: (merged.status === 'success' || merged.status === 'done' || merged.status === 'completed' || merged.call_successful === 'success') ? 'answered' : (merged.status || 'answered'),
                        llmIntent: evalCache.get(merged.conversation_id) || null,
                        leadStatus: (merged as any).leadStatus || null,
                        endedReason: merged.termination_reason || null,
                        assistantId: merged.agent_id || null,
                        raw: merged
                    };
                }).filter(Boolean);
            }
        } catch (e) {
            console.error("ElevenLabs aggregation fail:", e);
        }

        // --- 1.2. Twilio Telephony Aggregation ---
        // Fetch real-time billing data from Twilio (BYOC carrier)
        const twilioSid = process.env.TWILIO_ACCOUNT_SID;
        const twilioToken = process.env.TWILIO_AUTH_TOKEN;
        let twilioLookup: Map<string, any> = new Map();

        try {
            if (twilioSid && twilioToken) {
                const twRes = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Calls.json?PageSize=100`, {
                    headers: {
                        'Authorization': 'Basic ' + Buffer.from(`${twilioSid}:${twilioToken}`).toString('base64'),
                    }
                });
                if (twRes.ok) {
                    const twData = await twRes.json();
                    const callArray = twData.calls || [];
                    callArray.forEach((c: any) => {
                        const to = cleanPhoneNumber(c.to);
                        const from = cleanPhoneNumber(c.from);
                        const key = `${to}_${from}_${new Date(c.start_time).getTime().toString().substring(0, 7)}`;
                        twilioLookup.set(key, c);
                    });
                }
            }
        } catch (e) {
            console.error("Twilio fetch fail:", e);
        }

        // --- 1.5. Vapi Aggregation ---
        let vapiNormalized: any[] = [];
        try {
            const vapiPrivKey = process.env.VAPI_PRIVATE_KEY;
            if (vapiPrivKey) {
                let allVapiCalls: any[] = [];
                let hasMoreVapi = true;
                let lastCreatedAt = null;
                const batchSize = 1000;

                let batchedFetched = 0;
                while (hasMoreVapi && batchedFetched < 10) {
                    const params = new URLSearchParams({
                        limit: String(batchSize)
                    });

                    if (lastCreatedAt) {
                        params.set('createdAtLe', lastCreatedAt);
                    } else if (toDate) {
                        params.set('createdAtLe', toDate.toISOString());
                    }

                    if (fromDate) {
                        params.set('createdAtGe', fromDate.toISOString());
                    }

                    const vapiListUrl = `https://api.vapi.ai/call?${params.toString()}`;

                    let vapiRes;
                    try {
                        vapiRes = await fetch(vapiListUrl, {
                            headers: { 'Authorization': `Bearer ${vapiPrivKey}`, 'Content-Type': 'application/json' },
                            signal: AbortSignal.timeout(20000)
                        });
                    } catch (fetchErr) {
                        break; 
                    }

                    if (!vapiRes || !vapiRes.ok) break;
                    const vapiListData = await vapiRes.json();
                    const list = Array.isArray(vapiListData) ? vapiListData : (vapiListData.data || []);

                    if (list.length === 0) break;

                    const newList = list.filter((c: any) => !allVapiCalls.find((existing: any) => existing.id === c.id));
                    if (newList.length === 0) break;

                    allVapiCalls = [...allVapiCalls, ...newList];
                    const oldestCall = list[list.length - 1];
                    lastCreatedAt = oldestCall.createdAt;

                    if (fromDate && oldestCall.createdAt && new Date(oldestCall.createdAt) < fromDate) {
                        hasMoreVapi = false;
                    }

                    if (list.length < batchSize) hasMoreVapi = false;
                    batchedFetched++;
                }

                vapiNormalized = allVapiCalls.map((vc: any) => {
                    const isInbound = vc.type === 'inbound';
                    const customer = vc.customer || {};
                    const phoneRaw = cleanPhoneNumber(customer.number);
                    const durationPref = vc.durationSeconds ?? vc.duration ?? 0;
                    
                    const startedAt = vc.startedAt || vc.createdAt;
                    if (!startedAt) return null;

                    const endedAt = vc.endedAt;

                    let safeDuration = durationPref;
                    if (safeDuration === 0 && endedAt && startedAt) {
                        safeDuration = (new Date(endedAt).getTime() - new Date(startedAt).getTime()) / 1000;
                    }

                    const rateEntry: any = getRateInfo(phoneRaw);
                    const agentCost = vc.cost || 0;

                    const assistantNumRaw = vc.phoneNumber?.number || vapiPhoneCache.get(vc.phoneNumberId) || vc.phoneNumberId || vc.phoneCallProviderId || "Unknown";
                    let vapiAssistantNum = cleanPhoneNumber(assistantNumRaw);

                    if (vapiAssistantNum === "Unknown" && (vc.phoneNumberId || vc.phoneCallProviderId)) {
                        vapiAssistantNum = "Internal-Line";
                    }

                    const startedAtDate = new Date(startedAt);
                    const startedAtTime = isNaN(startedAtDate.getTime()) ? 0 : startedAtDate.getTime();
                    const vapiTimeKey = `${phoneRaw}_${vapiAssistantNum}_${startedAtTime.toString().substring(0, 7)}`;
                    const twMatched = twilioLookup.get(vapiTimeKey);

                    let vapiTelephonyCost = 0;
                    if (twMatched) {
                        vapiTelephonyCost = Math.abs(parseFloat(twMatched.price || 0));
                    }

                    if (vapiTelephonyCost === 0) {
                        vapiTelephonyCost = calculateTelephonyCost(safeDuration, phoneRaw, isInbound, vapiAssistantNum);
                    }

                    const vapiTotalCost = agentCost + vapiTelephonyCost;

                    let vapiName = customer.name || "Guest";
                    if (vapiName === "Guest" || !vapiName || (vapiName && /^\d+$/.test(vapiName.replace(/\D/g, '')) && vapiName.length > 5)) {
                        const metadata = vc.metadata || {};
                        const overrides = vc.assistantOverrides?.variableValues || {};
                        vapiName = metadata.customerName || metadata.name || overrides.customerName || overrides.name || "Guest";
                    }

                    const resolvedFromLead = leadsCache.get(phoneRaw);
                    if (resolvedFromLead) {
                        vapiName = resolvedFromLead.name || vapiName;
                        (vc as any).leadStatus = resolvedFromLead.status;
                    }

                    let callSummary = "";
                    const structuredData = vc.analysis?.structuredData || {};
                    for (const key of Object.keys(structuredData)) {
                        const entry = structuredData[key];
                        if (entry && (entry.name === "Call Summary" || entry.name?.toLowerCase().includes("summary"))) {
                            callSummary = entry.result || entry.value || "";
                            break;
                        }
                    }
                    if (!callSummary) callSummary = vc.analysis?.summary || "";

                    return {
                        id: vc.id,
                        name: vapiName,
                        startedAt: startedAt,
                        durationSeconds: safeDuration,
                        cost: vapiTotalCost > 0 ? `$${vapiTotalCost.toFixed(3)}` : "$0.00",
                        costValue: vapiTotalCost,
                        breakdown: {
                            agent: agentCost,
                            telephony: vapiTelephonyCost,
                            total: vapiTotalCost
                        },
                        type: isInbound ? "Inbound" : "Outbound",
                        isInbound,
                        phone: phoneRaw !== "Unknown" ? `+${phoneRaw}` : "Unknown",
                        country: rateEntry?.Country || "Unknown",
                        source: 'vapi',
                        status: vc.status === 'completed' ? 'answered' : (vc.status || 'answered'),
                        phoneNumber: vapiAssistantNum,
                        customer_number: phoneRaw !== "Unknown" ? `+${phoneRaw}` : "Unknown",
                        callSummary,
                        successEvaluation: vc.analysis?.successEvaluation,
                        llmIntent: evalCache.get(vc.id) || null,
                        leadStatus: (vc as any).leadStatus || null,
                        endedReason: vc.endedReason || null,
                        assistantId: vc.assistantId || null,
                        raw: vc
                    };
                }).filter(Boolean);
            }
        } catch (e) {
            console.error("Vapi aggregation fail:", e);
        }

        // --- 2. Maqsam Aggregation ---
        let maqsamNormalized: any[] = [];
        try {
            const mKey = process.env.MAQSAM_ACCESS_KEY_ID;
            const mSecret = process.env.MAQSAM_ACCESS_SECRET;
            const mBase = process.env.MAQSAM_BASE_URL || 'maqsam.com';

            if (mKey && mSecret) {
                const method = "GET";
                const fetchMaqsam = async (endpoint: string, useBasic: boolean) => {
                    const timestamp = new Date().toISOString();
                    const mUrl = `https://api.${mBase}${endpoint}`;
                    const headers: any = { "Accept": "application/json" };
                    if (useBasic) {
                        headers["Authorization"] = `Basic ${Buffer.from(`${mKey}:${mSecret}`).toString('base64')}`;
                    } else {
                        const payload = `${method}${endpoint}${timestamp}`;
                        headers["X-ACCESS-KEY"] = mKey;
                        headers["X-TIMESTAMP"] = timestamp;
                        headers["X-SIGNATURE"] = crypto.createHmac("sha256", mSecret).update(payload).digest("base64");
                    }
                    return fetch(mUrl, { method, headers, signal: AbortSignal.timeout(20000) });
                };

                let allMaqsamCalls: any[] = [];
                let mPage = 1;
                let hasMoreMaqsam = true;
                const MAX_M_PAGES = 50; 

                while (hasMoreMaqsam && mPage <= MAX_M_PAGES) {
                    let mRes = await fetchMaqsam(`/v2/calls?page=${mPage}&limit=100`, true);
                    if (!mRes.ok) {
                        mRes = await fetchMaqsam("/v1/account/calls", false); 
                        hasMoreMaqsam = false;
                    }

                    if (mRes.ok) {
                        const mData = await mRes.json();
                        const mcList = Array.isArray(mData.message) ? mData.message : (mData.data || mData.calls || []);
                        if (mcList.length === 0) break;

                        allMaqsamCalls = [...allMaqsamCalls, ...mcList];

                        const oldestMc = mcList[mcList.length - 1];
                        const oldestTs = oldestMc.timestamp ? oldestMc.timestamp * 1000 : (oldestMc.start_time ? new Date(oldestMc.start_time).getTime() : null);
                        if (fromDate && oldestTs && oldestTs < fromDate.getTime()) {
                            hasMoreMaqsam = false;
                        }

                        if (mcList.length < 100) hasMoreMaqsam = false;
                        mPage++;
                    } else break;
                }

                maqsamNormalized = allMaqsamCalls.map((mc: any) => {
                    const direction = (mc.direction || "").toLowerCase();
                    const isInbound = direction === 'inbound' || direction === 'incoming';
                    const callerNum = cleanPhoneNumber(mc.callerNumber || mc.caller || mc.from);
                    const calleeNum = cleanPhoneNumber(mc.calleeNumber || mc.callee || mc.to);
                    const phoneRaw = isInbound ? callerNum : calleeNum;

                    const nameValue = isInbound ? (mc.caller || mc.contact_name) : (mc.callee || mc.contact_name);
                    const isNotNumber = nameValue && !nameValue.match(/^\+?\d+$/);

                    const mcDuration = parseInt(mc.duration || 0);
                    const nativePrice = parseFloat(mc.price || mc.cost || 0);
                    const internalRate = calculateTelephonyCost(mcDuration, phoneRaw, isInbound);
                    const mCostTelephony = nativePrice > 0 ? nativePrice : internalRate;
                    const mCostTotal = mCostTelephony;

                    return {
                        id: (mc.id || mc.uuid || Math.random()).toString(),
                        name: isNotNumber ? nameValue : "Guest",
                        startedAt: mc.timestamp ? new Date(mc.timestamp * 1000).toISOString() : (mc.start_time || mc.created_at || new Date().toISOString()),
                        durationSeconds: mcDuration,
                        cost: mCostTotal > 0 ? `$${mCostTotal.toFixed(3)}` : "$0.00",
                        costValue: mCostTotal,
                        breakdown: {
                            agent: 0,
                            telephony: mCostTelephony,
                            total: mCostTotal
                        },
                        type: isInbound ? "Inbound" : (mc.type === 'campaign' ? "Campaign" : "Outbound"),
                        isInbound,
                        phone: phoneRaw !== "Unknown" ? `+${phoneRaw}` : "Unknown",
                        country: getRateInfo(phoneRaw)?.Country || "Unknown",
                        source: 'maqsam',
                        status: (mc.state === 'completed' || mc.state === 'serviced' || mc.status === 'answered') ? 'answered' : (mc.state || mc.status || 'answered'),
                        llmIntent: evalCache.get((mc.id || mc.uuid || "").toString()) || null,
                        leadStatus: leadsCache.get(phoneRaw)?.status || null
                    };
                }).filter(Boolean);
            }
        } catch (e) {
            console.error("Maqsam aggregation fail:", e);
        }

        // --- 3. Final Aggregation (Merge live with archived history) ---
        const allLive = [...elNormalized, ...maqsamNormalized, ...vapiNormalized];
        
        // Use a Map to deduplicate by ID, prioritizing fresh live API data over historical archives
        const mergedMap = new Map();
        archivedCalls.forEach((h: any) => mergedMap.set(h.id, h));
        allLive.forEach((l: any) => mergedMap.set(l.id, l));

        const final = Array.from(mergedMap.values()).sort((a, b) => {
            const timeA = a.startedAt ? new Date(a.startedAt).getTime() : 0;
            const timeB = b.startedAt ? new Date(b.startedAt).getTime() : 0;
            return timeB - timeA;
        });

        // Trigger automatic background sync for the fresh 7 days to keep the archive updated
        if (allLive.length > 0) {
            syncRecentVapiCalls(allLive).catch(err => console.error("[SyncTrigger] Error:", err));
        }

        return NextResponse.json(final);

    } catch (globalErr) {
        console.error("Global calls API error:", globalErr);
        return NextResponse.json({ error: "Aggregation failed" }, { status: 500 });
    }
}
