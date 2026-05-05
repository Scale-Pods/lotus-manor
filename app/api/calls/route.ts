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
            const chunk = recentCalls.slice(i, i + CHUNK_SIZE).map(c => {
                const aid = c.assistantId || c.raw?.assistantId || null;
                
                // Specific requested categorization using environment variables if available
                let categoricalAccount = c.vapiAccount || 'normal';
                
                const ownerBotId = process.env.VAPI_OWNERS_DATA_BOT || "9ac979c3-a0b3-4af6-bb0d-07ddf9c0d1cd";
                const normalBotIds = [
                    process.env.VAPI_US_BOT,
                    process.env.VAPI_UK_BOT,
                    process.env.VAPI_UAE_BOT,
                    "b35e3032-7865-4913-ba22-a913b5d4117b", // Fallback US
                    "918c25eb-9882-452e-86df-b4851d464852", // Fallback UK
                    "70f05e16-18f3-4f6e-964a-f47b299c6c1d"  // Fallback UAE
                ].filter(Boolean);

                if (aid === ownerBotId) categoricalAccount = 'owners';
                else if (normalBotIds.includes(aid)) categoricalAccount = 'normal';
                else if (c.source === 'elevenlabs') categoricalAccount = 'elevenlabs';

                return {
                    id: c.id,
                    started_at: c.startedAt || new Date().toISOString(),
                    customer_phone: c.phone || c.customer_number || "Unknown",
                    customer_name: (c.name && c.name !== "Unknown") ? c.name : "Guest",
                    duration_seconds: c.durationSeconds,
                    status: c.status,
                    cost_usd: c.costValue,
                    transcript: c.raw?.transcript || c.raw?.messages || c.raw?.analysis?.transcript || [],
                    summary: c.callSummary || "",
                    recording_url: c.raw?.audio_url || c.raw?.recordingUrl || c.raw?.artifact?.recordingUrl || "",
                    raw_data: {
                        ...c.raw,
                        vapiAccount: categoricalAccount,
                        isInbound: c.isInbound,
                        type: c.isInbound ? "Inbound" : "Outbound"
                    },
                    vapi_account: categoricalAccount,
                    source: c.source || (categoricalAccount === 'elevenlabs' ? 'elevenlabs' : 'vapi')
                };
            });

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

    // SELECT metadata and extracted fields from raw_data for filtering/display. 
    // We avoid fetching the full 'raw_data' blob to prevent statement timeouts.
    const columns = 'id,started_at,duration_seconds,cost_usd,customer_phone,customer_name,status,summary,vapi_account,recording_url,assistant_id:raw_data->>assistantId,is_inbound:raw_data->>isInbound,ended_reason:raw_data->>endedReason';
    let url = `${baseUrl}/vapi_call_logs?select=${columns}&order=started_at.desc&limit=20000`;
    
    if (fromDate) {
        url += `&started_at=gte.${fromDate.toISOString()}`;
    }
    if (toDate) {
        // Ensure toDate includes the full day if it's just a date (00:00:00)
        const endOfRange = new Date(toDate);
        if (endOfRange.getUTCHours() === 0 && endOfRange.getUTCMinutes() === 0 && endOfRange.getUTCSeconds() === 0) {
            endOfRange.setUTCHours(23, 59, 59, 999);
        }
        url += `&started_at=lte.${endOfRange.toISOString()}`;
    }

    try {
        const res = await fetch(url, { headers });
        if (!res.ok) {
            const errorText = await res.text();
            console.error(`[SupabaseFetch] HTTP ${res.status}:`, errorText);
            return [];
        }
        const data = await res.json();
        if (!Array.isArray(data)) return [];

        return data.map((d: any) => {
            const dur = d.duration_seconds || 0;
            const costVal = d.cost_usd ?? 0;
            const ph = d.customer_phone || 'Unknown';
            const isInbound = d.is_inbound === 'true' || d.is_inbound === true;

            return {
                id: d.id,
                startedAt: d.started_at,
                durationSeconds: dur,
                costValue: costVal,
                cost: `$${Number(costVal).toFixed(3)}`,
                phone: ph,
                name: d.customer_name || 'Guest',
                phoneNumber: ph,
                callSummary: d.summary || '',
                status: d.status || 'answered',
                type: isInbound ? "Inbound" : "Outbound",
                isInbound: isInbound,
                country: getRateInfo(ph)?.Country || 'Unknown',
                source: d.vapi_account === 'elevenlabs' ? 'elevenlabs' : 'vapi',
                vapiAccount: d.vapi_account,
                assistantId: d.assistant_id || null,
                endedReason: d.ended_reason || null,
                breakdown: { agent: costVal, telephony: 0, total: costVal },
                raw: { 
                    id: d.id, 
                    startedAt: d.started_at, 
                    recordingUrl: d.recording_url,
                    assistantId: d.assistant_id || null,
                    isInbound: isInbound,
                    endedReason: d.ended_reason || null
                }
            };
        });
    } catch (e) {
        console.error("[SupabaseFetch] Error:", e);
        return [];
    }
}

// --- Global Phone Cache ---
const CACHE_TTL = 30 * 1000;
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
    vapiPhoneCache: Map<string, string>
) {
    const isInbound = vc.type?.toLowerCase().includes('inbound');
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
    // Agent cost is the total Vapi cost minus any transport (telephony) Vapi might have charged
    const vapiTotalCharge = vc.cost || 0;
    const vapiTransportCharge = vc.costBreakdown?.transport || 0;
    const agentCost = vapiTotalCharge - vapiTransportCharge;

    const assistantNumRaw = vc.phoneNumber?.number || vapiPhoneCache.get(vc.phoneNumberId) || vc.phoneNumberId || vc.phoneCallProviderId || "Unknown";
    let vapiAssistantNum = cleanPhoneNumber(assistantNumRaw);

    if (vapiAssistantNum === "Unknown" && (vc.phoneNumberId || vc.phoneCallProviderId)) {
        vapiAssistantNum = "Internal-Line";
    }

    let vapiTelephonyCost = calculateTelephonyCost(safeDuration, phoneRaw, isInbound, vapiAssistantNum);

    const vapiTotalCost = agentCost + vapiTelephonyCost;

    let vapiName = customer.name || "Guest";
    if (vapiName === "Guest" || !vapiName || (vapiName && /^\d+$/.test(vapiName.replace(/\D/g, '')) && vapiName.length > 5)) {
        const metadata = vc.metadata || {};
        const overrides = vc.assistantOverrides?.variableValues || {};
        vapiName = metadata.customerName || metadata.name || overrides.customerName || overrides.name || "Guest";
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
        llmIntent: null,
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

    while (hasMoreVapi && batchedFetched < 20) {
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

        // HYBRID STRATEGY: Always fetch from Archive, supplement with Live data for a rolling window.
        // We use a 7-day window for 'live' fetching to ensure no gaps exist between the last sync and current time.
        const now = Date.now();
        const liveWindowLimit = new Date(now - (7 * 24 * 60 * 60 * 1000));
        
        const vapiPrivKey = process.env.VAPI_PRIVATE_KEY || "";
        const vapiOwnersKey = process.env.VAPI_OWNERS_DATA_BOT_PRIVATE_KEY || "";

        // Always fetch from Supabase Archive first (extremely fast)
        let archivedCalls = await fetchArchivedCallLogs(fromDate, toDate, 'vapi');
        let vapiNormalized: any[] = [];

        // Determine if we need live data (anything within the last 7 days)
        const needsLive = !toDate || toDate.getTime() > liveWindowLimit.getTime();
        
        // Always fetch the Vapi phone mappings (fast)
        const vapiPhoneCache = await fetchVapiPhonesCache(vapiPrivKey);

        if (needsLive) {
            const liveFrom = fromDate && fromDate.getTime() > liveWindowLimit.getTime() ? fromDate : liveWindowLimit;
            
            const NORMAL_AGENT_IDS = new Set([
                process.env.VAPI_US_BOT,
                process.env.VAPI_UK_BOT,
                process.env.VAPI_UAE_BOT,
            ].filter(Boolean));
            const OWNERS_AGENT_IDS = new Set([
                process.env.VAPI_OWNERS_DATA_BOT,
            ].filter(Boolean));

            try {
                // Fetch only for the small live window (max 24h)
                const [normalRawCalls, ownersRawCalls] = await Promise.all([
                    vapiPrivKey ? fetchVapiCallsForAccount(vapiPrivKey, liveFrom, toDate) : Promise.resolve([]),
                    vapiOwnersKey ? fetchVapiCallsForAccount(vapiOwnersKey, liveFrom, toDate) : Promise.resolve([])
                ]);

                const filteredNormal = NORMAL_AGENT_IDS.size > 0
                    ? normalRawCalls.filter(vc => NORMAL_AGENT_IDS.has(vc.assistantId))
                    : normalRawCalls;

                const filteredOwners = OWNERS_AGENT_IDS.size > 0
                    ? ownersRawCalls.filter(vc => OWNERS_AGENT_IDS.has(vc.assistantId))
                    : ownersRawCalls;

                const normalNormalized = filteredNormal.map(vc =>
                    normalizeVapiCall(vc, 'normal', vapiPhoneCache)
                ).filter(Boolean) as any[];

                const ownersNormalized = filteredOwners.map(vc =>
                    normalizeVapiCall(vc, 'owners', vapiPhoneCache)
                ).filter(Boolean) as any[];

                vapiNormalized = [...normalNormalized, ...ownersNormalized];

            } catch (e) {
                console.error("Vapi live aggregation fail:", e);
            }
        }

        // Filter archived calls if we fetched them (agent ID allow-list)
        const NORMAL_AGENT_IDS_ARCHIVE = new Set([
            process.env.VAPI_US_BOT,
            process.env.VAPI_UK_BOT,
            process.env.VAPI_UAE_BOT,
        ].filter(Boolean));
        const OWNERS_AGENT_IDS_ARCHIVE = new Set([
            process.env.VAPI_OWNERS_DATA_BOT,
        ].filter(Boolean));

        const allAllowedAgentIds = new Set([...NORMAL_AGENT_IDS_ARCHIVE, ...OWNERS_AGENT_IDS_ARCHIVE]);
        
        const filteredArchivedCalls = archivedCalls.filter((c: any) => {
            if (!includeElevenLabs && c.vapiAccount === 'elevenlabs') return false; // exclude ElevenLabs unless requested
            if (allAllowedAgentIds.size > 0 && c.assistantId) {
                return allAllowedAgentIds.has(c.assistantId);
            }
            return true;
        });

        // --- Final Merge ---
        const mergedMap = new Map();
        filteredArchivedCalls.forEach((h: any) => mergedMap.set(h.id, h));
        vapiNormalized.forEach((l: any) => mergedMap.set(l.id, l));

        const final = Array.from(mergedMap.values()).sort((a, b) => {
            const timeA = a.startedAt ? new Date(a.startedAt).getTime() : 0;
            const timeB = b.startedAt ? new Date(b.startedAt).getTime() : 0;
            return timeB - timeA;
        });

        // Background sync of recent calls to archive
        if (vapiNormalized.length > 0) {
            syncRecentVapiCalls(vapiNormalized).catch(err => console.error("[SyncTrigger] Error:", err));
        }

        return new NextResponse(JSON.stringify(final), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0',
            }
        });

    } catch (globalErr) {
        console.error("Global calls API error:", globalErr);
        return NextResponse.json({ error: "Aggregation failed" }, { status: 500 });
    }
}
