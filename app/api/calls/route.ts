import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import RATES_DATA from '../../../context/rates.json';

// --- Helper: Timeout Signal (for older Node.js) ---
function getTimeoutSignal(ms: number) {
    if (typeof AbortSignal !== 'undefined' && 'timeout' in AbortSignal) {
        return (AbortSignal as any).timeout(ms);
    }
    const controller = new AbortController();
    setTimeout(() => controller.abort(), ms);
    return controller.signal;
}

const ELEVENLABS_BASE_URL = 'https://api.elevenlabs.io/v1';

// --- Helper: Number Normalization ---
function cleanPhoneNumber(num: any): string {
    if (!num) return "Unknown";
    const str = String(num).replace(/\s+/g, '').replace(/\+/g, '').replace(/\D/g, '');
    if (!str || str.length < 5 || str.length > 22) return "Unknown";
    return str;
}

// --- Rate Lookup ---
let ratesCache: any[] | null = null;
function getRateInfo(phoneNumber: string) {
    try {
        if (!ratesCache) {
            const ratesData = fs.readFileSync(path.join(process.cwd(), 'data', 'rates.json'), 'utf8');
            ratesCache = JSON.parse(ratesData);
        }
    } catch (e) {
        ratesCache = RATES_DATA;
    }
    const cleaned = cleanPhoneNumber(phoneNumber);
    if (cleaned === "Unknown") return null;
    const dataToFilter = Array.isArray(ratesCache) ? ratesCache : (Array.isArray(RATES_DATA) ? RATES_DATA : []);
    const matches = dataToFilter.filter((r: any) => cleaned.startsWith(String(r.Prefix)));
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

    if (botIsUS || botIsUK) {
        if (targetIsUAE) return (durationSecs / 60) * 0.2426;
        if (botIsUS && targetIsUS) return (durationSecs / 60) * 0.013;
        if (botIsUK && targetIsUK) return (durationSecs / 60) * 0.0305;
        return (durationSecs / 60) * 0.05;
    }

    const rate = getRateInfo(tClean);
    return (durationSecs / 60) * (rate?.Rate ?? 0);
}

function getMaqsamSignature(method: string, endpoint: string, timestamp: string, accessSecret: string) {
    const payload = `${method}${endpoint}${timestamp}`;
    return crypto
        .createHmac("sha256", accessSecret)
        .update(payload)
        .digest("base64");
}

// --- Global In-Memory Cache (Expires every 5 minutes) ---
let globalLeadsCache: { data: Map<string, { name: string; status: any }>, timestamp: number } | null = null;
let globalEvalCache: { data: Map<string, string>, timestamp: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// --- Leads Cache (Supabase) ---
async function fetchLeadsCache() {
    const now = Date.now();
    if (globalLeadsCache && (now - globalLeadsCache.timestamp < CACHE_TTL)) {
        return globalLeadsCache.data;
    }

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
                data.forEach((l: any) => {
                    const phoneRaw = l.phone || l.phoneNumber || l.phonenumber || l.customer_number || l.Phone || "";
                    const clean = cleanPhoneNumber(phoneRaw);
                    if (clean !== "Unknown") {
                        const existing = leadsMap.get(clean);
                        leadsMap.set(clean, {
                            name: l.name || existing?.name || "Guest",
                            status: l.lead_status || existing?.status || null
                        });
                    }
                });
            }
        });
        
        globalLeadsCache = { data: leadsMap, timestamp: now };
    } catch (e) { 
        console.error("Leads cache error:", e); 
        return globalLeadsCache ? globalLeadsCache.data : leadsMap;
    }
    return leadsMap;
}

// --- Evaluations Cache (Supabase) ---
async function fetchLlmEvaluationsCache() {
    const now = Date.now();
    if (globalEvalCache && (now - globalEvalCache.timestamp < CACHE_TTL)) {
        return globalEvalCache.data;
    }

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
        globalEvalCache = { data: evalMap, timestamp: now };
    } catch (e) {
        return globalEvalCache ? globalEvalCache.data : evalMap;
    }
    return evalMap;
}

/**
 * Syncs the last 7 days of Vapi calls to Supabase. Includes vapi_account tag.
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
            raw_data: c.raw || {},
            vapi_account: c.vapiAccount || (c.source === 'elevenlabs' ? 'elevenlabs' : 'normal')
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
 * Fetches archived call logs from Supabase for a given date range.
 */
async function fetchArchivedCallLogs(fromDate: Date | null, toDate: Date | null, provider: string = 'all') {
    const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim();
    const secretKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
    if (!supabaseUrl || !secretKey) return [];

    const baseUrl = `${supabaseUrl.replace(/\/$/, "")}/rest/v1`;
    const headers = { "apikey": secretKey, "Authorization": `Bearer ${secretKey}` };

    // Simple range filter only — provider filtering done in JS to avoid PostgREST syntax issues
    let url = `${baseUrl}/vapi_call_logs?select=*&order=started_at.desc`;
    if (fromDate) url += `&started_at=gte.${fromDate.toISOString()}`;
    if (toDate) url += `&started_at=lte.${toDate.toISOString()}`;

    try {
        const res = await fetch(url, { headers });
        if (!res.ok) {
            console.error(`[SupabaseFetch] HTTP ${res.status}:`, await res.text());
            return [];
        }
        const data = await res.json();
        if (!Array.isArray(data)) return [];

        return data.map((d: any) => {
            const rawData = d.raw_data || {};
            const vapiAcc = d.vapi_account || rawData.vapiAccount || null;
            const aId = rawData.assistantId || d.assistant_id || null;
            const dur = d.duration_seconds || rawData.durationSeconds || 0;
            const costVal = d.cost_usd ?? rawData.costValue ?? 0;

            return {
                id: d.id,
                startedAt: d.started_at,
                durationSeconds: dur,
                costValue: costVal,
                cost: `$${Number(costVal).toFixed(3)}`,
                phone: d.customer_phone || rawData.phone || 'Unknown',
                name: d.customer_name || rawData.name || 'Guest',
                phoneNumber: d.customer_phone || rawData.phoneNumber || 'Unknown',
                callSummary: d.summary || rawData.callSummary || '',
                status: d.status || rawData.status || 'answered',
                type: rawData.type || (rawData.isInbound ? 'Inbound' : 'Outbound'),
                isInbound: rawData.isInbound || false,
                country: rawData.country || 'Unknown',
                source: rawData.source || 'vapi',
                vapiAccount: vapiAcc,
                assistantId: aId,
                endedReason: rawData.endedReason || null,
                breakdown: rawData.breakdown || { agent: 0, telephony: 0, total: costVal },
                raw: rawData
            };
        });
    } catch (e) {
        console.error("[SupabaseFetch] Error:", e);
        return [];
    }
}

// --- Global Phone Cache ---
let globalVapiPhoneCache: { data: Map<string, string>, timestamp: number } | null = null;

// --- Vapi Phone Cache ---
async function fetchVapiPhonesCache(vapiPrivKey: string) {
    const now = Date.now();
    if (globalVapiPhoneCache && (now - globalVapiPhoneCache.timestamp < CACHE_TTL)) {
        return globalVapiPhoneCache.data;
    }

    const phoneMap = new Map<string, string>();
    // Manual Overrides
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
        globalVapiPhoneCache = { data: phoneMap, timestamp: now };
    } catch (e) { 
        console.error("Vapi phone cache error:", e); 
    }
    return phoneMap;
}

/**
 * Normalizes a single VAPI call object into our standard format.
 */
function normalizeVapiCall(
    vc: any,
    vapiAccount: 'normal' | 'owners',
    leadsCache: Map<string, { name: string; status: any }>,
    vapiPhoneCache: Map<string, string>,
    evalCache: Map<string, string>,
    twilioLookup: Map<string, any>
) {
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
        startedAt,
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
        vapiAccount,
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
}

/**
 * Fetches all calls for a single VAPI account key within date range.
 */
async function fetchVapiCallsForAccount(
    apiKey: string,
    fromDate: Date | null,
    toDate: Date | null
): Promise<any[]> {
    let allVapiCalls: any[] = [];
    let hasMoreVapi = true;
    let lastCreatedAt: string | null = null;
    const batchSize = 1000;
    let batchedFetched = 0;

    while (hasMoreVapi && batchedFetched < 10) {
        const params = new URLSearchParams({ limit: String(batchSize) });

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
                headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
                signal: getTimeoutSignal(20000)
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

    return allVapiCalls;
}

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const fromParam = searchParams.get('from');
        const toParam = searchParams.get('to');
        const includeElevenLabs = searchParams.get('includeElevenLabs') === 'true';

        const fromDateRaw = fromParam ? new Date(fromParam) : null;
        const toDateRaw = toParam ? new Date(toParam) : null;
        
        const fromDate = fromDateRaw && !isNaN(fromDateRaw.getTime()) ? fromDateRaw : null;
        const toDate = toDateRaw && !isNaN(toDateRaw.getTime()) ? toDateRaw : null;
        // provider: 'vapi' | 'elevenlabs' | 'all'
        const provider = searchParams.get('provider') || 'vapi';

        // Use archive when from-date is older than 7 days (live VAPI API only covers recent ~7 days reliably)
        const now = Date.now();
        const sevenDaysAgo = now - (7 * 24 * 60 * 60 * 1000);
        const useArchiveOnly = fromDate ? fromDate.getTime() < sevenDaysAgo : false;

        const vapiPrivKey = process.env.VAPI_PRIVATE_KEY || "";
        const vapiOwnersKey = process.env.VAPI_OWNERS_DATA_BOT_PRIVATE_KEY || "";

        // FETCH EVERYTHING CONCURRENTLY
        const [leadsCache, evalCache, archivedCalls, vapiPhoneCache] = await Promise.all([
            fetchLeadsCache(),
            fetchLlmEvaluationsCache(),
            fetchArchivedCallLogs(fromDate, toDate, provider),
            fetchVapiPhonesCache(vapiPrivKey)
        ]);

        // --- Twilio Lookup (Async, don't wait for price reconcile if not needed) ---
        const twilioSid = process.env.TWILIO_ACCOUNT_SID;
        const twilioToken = process.env.TWILIO_AUTH_TOKEN;
        let twilioLookup: Map<string, any> = new Map();

        if (twilioSid && twilioToken) {
            fetch(`https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Calls.json?PageSize=50`, {
                headers: { 'Authorization': 'Basic ' + Buffer.from(`${twilioSid}:${twilioToken}`).toString('base64') }
            }).then(r => r.json()).then(twData => {
                const callArray = twData.calls || [];
                callArray.forEach((c: any) => {
                    const to = cleanPhoneNumber(c.to);
                    const from = cleanPhoneNumber(c.from);
                    const key = `${to}_${from}_${new Date(c.start_time).getTime().toString().substring(0, 7)}`;
                    twilioLookup.set(key, c);
                });
            }).catch(() => {});
        }


        // --- ElevenLabs Aggregation (only when provider=elevenlabs or all) ---
        let elNormalized: any[] = [];
        const shouldFetchElevenLabs = provider === 'elevenlabs' || provider === 'all';
        try {
            const apiKey = process.env.ELEVENLABS_API_KEY;
            if (apiKey && shouldFetchElevenLabs) {
                let allConversations: any[] = [];
                let hasMore = true;
                let lastId = null;
                let pagesFetched = 0;
                const MAX_PAGES = 50;

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

                    const oldestInPage = list[list.length - 1].start_time_unix_secs * 1000;
                    if (fromDate && oldestInPage < fromDate.getTime()) break;

                    lastId = listData.next_cursor;
                    hasMore = !!lastId;
                    pagesFetched++;
                }

                const enrichmentLimit = 40;
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
                                    signal: getTimeoutSignal(4000)
                                });
                                if (dr.ok) return await dr.json();
                            } catch (e) {}
                            return null;
                        })
                    );
                    results.forEach(d => {
                        if (d) enrichmentMap.set(d.conversation_id, d);
                    });
                }

                elNormalized = allConversations.map((c: any) => {
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

                    const isInbound = initType.includes('inbound') || direction === 'inbound' || rawType === 'inbound';
                    const isWeb = initType === 'web' || src === 'react_sdk';

                    const phoneRaw = isInbound ? caller : callee;
                    const phone = (phoneRaw !== "Unknown") ? `+${phoneRaw}` : (isWeb ? "Website/API" : "Unknown");

                    const duration = merged.call_duration_secs || merged.duration_secs || meta.call_duration_secs || 0;
                    const rateEntry: any = getRateInfo(phoneRaw);
                    const costUSD = calculateTelephonyCost(duration, phoneRaw, isInbound);

                    const startTimeSec = merged.start_time_unix_secs || merged.start_time || 0;
                    if (!startTimeSec) return null;
                    const startedAt = new Date(startTimeSec * 1000).toISOString();

                    const firstName = dv.first_name || meta.first_name || "";
                    const lastName = dv.last_name || meta.last_name || "";
                    const fullName = (firstName && lastName) ? `${firstName} ${lastName}` : (firstName || lastName);
                    let name = fullName || meta.user_name || meta.name || dv.user_name || dv.name || "Guest";

                    const resolvedFromLead = leadsCache.get(phoneRaw);
                    if (resolvedFromLead) {
                        name = resolvedFromLead.name || name;
                        (merged as any).leadStatus = resolvedFromLead.status;
                    }

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
                        breakdown: { agent: 0, telephony: costUSD, total: costUSD },
                        type: isInbound ? "Inbound" : (isWeb ? "Web Call" : "Outbound"),
                        isInbound,
                        phone,
                        phoneNumber: callee,
                        country: rateEntry?.Country || (phone.startsWith('+') ? "Other" : "Unknown"),
                        source: 'elevenlabs',
                        vapiAccount: 'elevenlabs',
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

        // --- Maqsam Aggregation (skip unless provider=all) ---
        let maqsamNormalized: any[] = [];
        try {
            const mKey = process.env.MAQSAM_ACCESS_KEY_ID;
            const mSecret = process.env.MAQSAM_ACCESS_SECRET;
            const mBase = process.env.MAQSAM_BASE_URL || 'maqsam.com';

            if (mKey && mSecret && provider === 'all') {
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
                    return fetch(mUrl, { method, headers, signal: getTimeoutSignal(20000) });
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

                    return {
                        id: (mc.id || mc.uuid || Math.random()).toString(),
                        name: isNotNumber ? nameValue : "Guest",
                        startedAt: mc.timestamp ? new Date(mc.timestamp * 1000).toISOString() : (mc.start_time || mc.created_at || new Date().toISOString()),
                        durationSeconds: mcDuration,
                        cost: mCostTelephony > 0 ? `$${mCostTelephony.toFixed(3)}` : "$0.00",
                        costValue: mCostTelephony,
                        breakdown: { agent: 0, telephony: mCostTelephony, total: mCostTelephony },
                        type: isInbound ? "Inbound" : (mc.type === 'campaign' ? "Campaign" : "Outbound"),
                        isInbound,
                        phone: phoneRaw !== "Unknown" ? `+${phoneRaw}` : "Unknown",
                        country: getRateInfo(phoneRaw)?.Country || "Unknown",
                        source: 'maqsam',
                        vapiAccount: null,
                        status: (mc.state === 'completed' || mc.state === 'serviced' || mc.status === 'answered') ? 'answered' : (mc.state || mc.status || 'answered'),
                        llmIntent: evalCache.get((mc.id || mc.uuid || "").toString()) || null,
                        leadStatus: leadsCache.get(phoneRaw)?.status || null
                    };
                }).filter(Boolean);
            }
        } catch (e) {
            console.error("Maqsam aggregation fail:", e);
        }

        // --- Dual VAPI Aggregation (only when provider=vapi or all) ---
        let vapiNormalized: any[] = [];
        const shouldFetchVapi = provider === 'vapi' || provider === 'all';

        // Agent ID allow-lists (from env)
        const NORMAL_AGENT_IDS = new Set([
            process.env.VAPI_US_BOT,
            process.env.VAPI_UK_BOT,
            process.env.VAPI_UAE_BOT,
        ].filter(Boolean));
        const OWNERS_AGENT_IDS = new Set([
            process.env.VAPI_OWNERS_DATA_BOT,
        ].filter(Boolean));

        if (!useArchiveOnly && shouldFetchVapi) {
            try {
                // Split logic for large ranges to parallelize
                const midPoint = fromDate && toDate ? new Date((fromDate.getTime() + toDate.getTime()) / 2) : null;
                
                let normalPromises = [];
                let ownersPromises = [];

                if (midPoint && (toDate!.getTime() - fromDate!.getTime() > 3 * 24 * 60 * 60 * 1000)) {
                    // Fragmented fetch
                    normalPromises = [
                        vapiPrivKey ? fetchVapiCallsForAccount(vapiPrivKey, fromDate, midPoint) : Promise.resolve([]),
                        vapiPrivKey ? fetchVapiCallsForAccount(vapiPrivKey, midPoint, toDate) : Promise.resolve([])
                    ];
                    ownersPromises = [
                        vapiOwnersKey ? fetchVapiCallsForAccount(vapiOwnersKey, fromDate, midPoint) : Promise.resolve([]),
                        vapiOwnersKey ? fetchVapiCallsForAccount(vapiOwnersKey, midPoint, toDate) : Promise.resolve([])
                    ];
                } else {
                    normalPromises = [vapiPrivKey ? fetchVapiCallsForAccount(vapiPrivKey, fromDate, toDate) : Promise.resolve([])];
                    ownersPromises = [vapiOwnersKey ? fetchVapiCallsForAccount(vapiOwnersKey, fromDate, toDate) : Promise.resolve([])];
                }

                const [n1, n2, o1, o2] = await Promise.all([
                    normalPromises[0] || Promise.resolve([]),
                    normalPromises[1] || Promise.resolve([]),
                    ownersPromises[0] || Promise.resolve([]),
                    ownersPromises[1] || Promise.resolve([])
                ]);

                const normalRawCalls = [...(n1 || []), ...(n2 || [])];
                const ownersRawCalls = [...(o1 || []), ...(o2 || [])];

                // Filter to only allowed agent IDs before normalizing
                const filteredNormal = NORMAL_AGENT_IDS.size > 0
                    ? normalRawCalls.filter(vc => NORMAL_AGENT_IDS.has(vc.assistantId))
                    : normalRawCalls;

                const filteredOwners = OWNERS_AGENT_IDS.size > 0
                    ? ownersRawCalls.filter(vc => OWNERS_AGENT_IDS.has(vc.assistantId))
                    : ownersRawCalls;

                const normalNormalized = filteredNormal.map(vc =>
                    normalizeVapiCall(vc, 'normal', leadsCache, vapiPhoneCache, evalCache, twilioLookup)
                ).filter(Boolean) as any[];

                const ownersNormalized = filteredOwners.map(vc =>
                    normalizeVapiCall(vc, 'owners', leadsCache, vapiPhoneCache, evalCache, twilioLookup)
                ).filter(Boolean) as any[];

                vapiNormalized = [...normalNormalized, ...ownersNormalized];
            } catch (e) {
                console.error("Dual Vapi aggregation fail:", e);
            }
        }

        // Filter archived calls: provider + agent ID allow-list
        const allAllowedAgentIds = new Set([...NORMAL_AGENT_IDS, ...OWNERS_AGENT_IDS]);
        const filteredArchivedCalls = archivedCalls.filter((c: any) => {
            // Provider filter
            if (provider === 'elevenlabs') return c.vapiAccount === 'elevenlabs';
            if (provider === 'vapi') {
                if (c.vapiAccount === 'elevenlabs') return false; // exclude ElevenLabs
            }

            // Agent ID filter (only filter if we have allow-lists; let legacy records through)
            if (allAllowedAgentIds.size > 0 && c.assistantId) {
                return allAllowedAgentIds.has(c.assistantId);
            }

            return true;
        });

        // --- Final Merge (live + archive) ---
        const allLive = [...elNormalized, ...maqsamNormalized, ...vapiNormalized];

        // Deduplicate: live API data takes priority over archive
        const mergedMap = new Map();
        filteredArchivedCalls.forEach((h: any) => mergedMap.set(h.id, h));
        allLive.forEach((l: any) => mergedMap.set(l.id, l));

        const final = Array.from(mergedMap.values()).sort((a, b) => {
            const timeA = a.startedAt ? new Date(a.startedAt).getTime() : 0;
            const timeB = b.startedAt ? new Date(b.startedAt).getTime() : 0;
            return timeB - timeA;
        });

        // Background sync of recent calls to archive
        if (vapiNormalized.length > 0) {
            syncRecentVapiCalls(vapiNormalized).catch(err => console.error("[SyncTrigger] Error:", err));
        }

        return NextResponse.json(final);

    } catch (globalErr) {
        console.error("Global calls API error:", globalErr);
        return NextResponse.json({ error: "Aggregation failed" }, { status: 500 });
    }
}
