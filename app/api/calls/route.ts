import { NextResponse } from 'next/server';
import crypto from 'crypto';
import RATES_DATA from '../../../context/rates.json';

const ELEVENLABS_BASE_URL = 'https://api.elevenlabs.io/v1';

// --- Improved Helper: Number Normalization ---
function cleanPhoneNumber(num: any): string {
    if (!num) return "Unknown";
    const str = String(num).replace(/\s+/g, '').replace(/\+/g, '').replace(/\D/g, '');
    if (!str || str.length < 5) return "Unknown";
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

function calculateCostValue(durationSecs: number, phoneNumber: string, isInbound: boolean) {
    if (isInbound) return durationSecs > 0 ? 0.02 : 0; // Inbound is $0.02 if answered
    if (!durationSecs || durationSecs <= 0) return 0;
    const rate = getRateInfo(phoneNumber);
    if (!rate || !rate.Rate) return 0;
    return (durationSecs / 60) * rate.Rate;
}

function getMaqsamSignature(method: string, endpoint: string, timestamp: string, accessSecret: string) {
    const payload = `${method}${endpoint}${timestamp}`;
    return crypto
        .createHmac("sha256", accessSecret)
        .update(payload)
        .digest("base64");
}

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const fromParam = searchParams.get('from');
        const toParam = searchParams.get('to');
        const fromDate = fromParam ? new Date(fromParam) : null;
        const toDate = toParam ? new Date(toParam) : null;

        const apiKey = process.env.ELEVENLABS_API_KEY;
        const agentId = process.env.ELEVENLABS_AGENT_ID;

        // --- 1. ElevenLabs Aggregation ---
        let elNormalized: any[] = [];
        try {
            if (apiKey) {
                let allConversations: any[] = [];
                let hasMore = true;
                let lastId = null;
                let pagesFetched = 0;
                const MAX_PAGES = 30; // Fetch up to 3000 records to stay within limits

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

                // Enrichment: Fetch details for relevant conversations
                // We enrich the most recent ones to get duration/telephony info
                const enrichmentLimit = 200;
                const enrichmentMap = new Map();

                // Fetch details in batches to avoid overwhelming the API
                const toEnrich = allConversations.slice(0, enrichmentLimit);
                const details = await Promise.all(
                    toEnrich.map(async (c: any) => {
                        try {
                            const dr = await fetch(`${ELEVENLABS_BASE_URL}/convai/conversations/${c.conversation_id}`, {
                                headers: { 'xi-api-key': apiKey }
                            });
                            if (dr.ok) {
                                return await dr.json();
                            }
                        } catch (e) { }
                        return null;
                    })
                );

                details.forEach(d => {
                    if (d) enrichmentMap.set(d.conversation_id, d);
                });

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

                    const centralNumber = "97148714150";
                    const isCalleeCentral = callee.includes(centralNumber);
                    const phoneRaw = isInbound || isCalleeCentral ? caller : callee;
                    const phone = isInbound || isCalleeCentral ? (caller !== "Unknown" ? `+${caller}` : "Inbound (Unknown)")
                        : (callee !== "Unknown" ? `+${callee}` : (isWeb ? "Website/API" : "Unknown"));

                    const duration = merged.call_duration_secs || merged.duration_secs || meta.call_duration_secs || 0;
                    const rateEntry: any = getRateInfo(phoneRaw);
                    const costUSD = calculateCostValue(duration, phoneRaw, isInbound);

                    const startTimeSec = merged.start_time_unix_secs || merged.start_time || 0;
                    const startedAt = startTimeSec ? new Date(startTimeSec * 1000).toISOString() : new Date().toISOString();

                    // Name Detection
                    const firstName = dv.first_name || meta.first_name || "";
                    const lastName = dv.last_name || meta.last_name || "";
                    const fullName = (firstName && lastName) ? `${firstName} ${lastName}` : (firstName || lastName);

                    const name = fullName || meta.user_name || meta.name || dv.user_name || dv.name || dv.custom__name || dv.audient__name || dv.customer_name || "Guest";

                    return {
                        id: merged.conversation_id,
                        name: name === "Guest" ? "Guest" : name,
                        startedAt,
                        durationSeconds: duration,
                        cost: costUSD > 0 ? `$${costUSD.toFixed(3)}` : (meta.cost ? `${meta.cost} credits` : "$0.00"),
                        costValue: costUSD,
                        type: isInbound ? "Inbound" : (isWeb ? "Web Call" : "Outbound"),
                        isInbound,
                        phone,
                        country: rateEntry?.Country || (phone.startsWith('+') ? "Other" : "Unknown"),
                        source: 'elevenlabs',
                        status: (merged.status === 'success' || merged.status === 'done' || merged.status === 'completed' || merged.call_successful === 'success') ? 'answered' : (merged.status || 'answered')
                    };
                });
            }
        } catch (e) {
            console.error("ElevenLabs aggregation fail:", e);
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
                    return fetch(mUrl, { method, headers });
                };

                let mRes = await fetchMaqsam("/v2/calls", true);
                if (!mRes.ok) {
                    mRes = await fetchMaqsam("/v1/account/calls", false); // Try Balance-style Signature auth
                }

                if (mRes.ok) {
                    const mData = await mRes.json();
                    const mcList = Array.isArray(mData.message) ? mData.message : (mData.data || mData.calls || []);

                    maqsamNormalized = mcList.map((mc: any) => {
                        const direction = (mc.direction || "").toLowerCase();
                        const isInbound = direction === 'inbound' || direction === 'incoming';
                        const callerNum = cleanPhoneNumber(mc.callerNumber || mc.caller || mc.from);
                        const calleeNum = cleanPhoneNumber(mc.calleeNumber || mc.callee || mc.to);
                        const phoneRaw = isInbound ? callerNum : calleeNum;

                        const nameValue = isInbound ? (mc.caller || mc.contact_name) : (mc.callee || mc.contact_name);
                        const isNotNumber = nameValue && !nameValue.match(/^\+?\d+$/);

                        return {
                            id: (mc.id || mc.uuid || Math.random()).toString(),
                            name: isNotNumber ? nameValue : "Guest",
                            startedAt: mc.timestamp ? new Date(mc.timestamp * 1000).toISOString() : (mc.start_time || mc.created_at || new Date().toISOString()),
                            durationSeconds: parseInt(mc.duration || 0),
                            cost: calculateCostValue(parseInt(mc.duration || 0), phoneRaw, isInbound) > 0 ? `$${calculateCostValue(parseInt(mc.duration || 0), phoneRaw, isInbound).toFixed(3)}` : "$0.00",
                            costValue: calculateCostValue(parseInt(mc.duration || 0), phoneRaw, isInbound),
                            type: isInbound ? "Inbound" : (mc.type === 'campaign' ? "Campaign" : "Outbound"),
                            isInbound,
                            phone: phoneRaw !== "Unknown" ? `+${phoneRaw}` : "Unknown",
                            country: getRateInfo(phoneRaw)?.Country || "Unknown",
                            source: 'maqsam',
                            status: (mc.state === 'completed' || mc.state === 'serviced' || mc.status === 'answered') ? 'answered' : (mc.state || mc.status || 'answered')
                        };
                    });
                } else if (mRes.status !== 401) {
                    const err = await mRes.text();
                    console.error("[Maqsam] Request Failed:", { status: mRes.status, response: err });
                }
            }
        } catch (e) {
            console.error("Maqsam aggregation fail:", e);
        }

        // --- 3. Final Aggregation ---
        const final = [...elNormalized, ...maqsamNormalized].sort((a, b) =>
            new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
        );

        return NextResponse.json(final);

    } catch (globalErr) {
        console.error("Global calls API error:", globalErr);
        return NextResponse.json({ error: "Aggregation failed" }, { status: 500 });
    }
}
