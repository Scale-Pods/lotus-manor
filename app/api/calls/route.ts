import { NextResponse } from 'next/server';
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
    if (isInbound) return 0; // Inbound is free
    if (!durationSecs || durationSecs <= 0) return 0;
    const rate = getRateInfo(phoneNumber);
    if (!rate || !rate.Rate) return 0;
    return (durationSecs / 60) * rate.Rate;
}

export async function GET() {
    try {
        const apiKey = process.env.ELEVENLABS_API_KEY;
        const agentId = process.env.ELEVENLABS_AGENT_ID;

        // --- 1. ElevenLabs Aggregation ---
        let elNormalized: any[] = [];
        try {
            if (apiKey) {
                const listUrl = agentId
                    ? `${ELEVENLABS_BASE_URL}/convai/conversations?agent_id=${agentId}&page_size=50`
                    : `${ELEVENLABS_BASE_URL}/convai/conversations?page_size=50`;

                const listRes = await fetch(listUrl, {
                    headers: { 'xi-api-key': apiKey, 'Content-Type': 'application/json' }
                });

                if (listRes.ok) {
                    const listData = await listRes.json();
                    const list = listData.conversations || [];

                    // Enrichment: Fetch details for first 50 to get telephony data
                    const details = await Promise.all(
                        list.slice(0, 50).map(async (c: any) => {
                            try {
                                const dr = await fetch(`${ELEVENLABS_BASE_URL}/convai/conversations/${c.conversation_id}`, {
                                    headers: { 'xi-api-key': apiKey }
                                });
                                if (dr.ok) {
                                    const dJson = await dr.json();
                                    return { ...c, ...dJson };
                                }
                            } catch (e) { }
                            return c;
                        })
                    );

                    elNormalized = details.map((c: any) => {
                        const tel = c.telephony || {};
                        const meta = c.metadata || c.metadata_json || {};
                        const dv = (c.conversation_initiation_client_data?.dynamic_variables) || {};

                        const caller = cleanPhoneNumber(tel.caller_number || meta.caller_number || dv.caller_number);
                        const callee = cleanPhoneNumber(tel.callee_number || meta.callee_number || dv.callee_number);

                        const initType = (c.conversation_initiation_type || "").toLowerCase();
                        const direction = (tel.direction || c.direction || meta.direction || dv.direction || dv.type || "").toLowerCase();
                        const rawType = (c.type || meta.type || "").toLowerCase();
                        const src = (c.conversation_initiation_source || "").toLowerCase();

                        // Inbound Detection
                        const isInbound = initType.includes('inbound') || direction === 'inbound' || rawType === 'inbound';
                        const isWeb = initType === 'web' || src === 'react_sdk';

                        const centralNumber = "97148714150";
                        const isCalleeCentral = callee.includes(centralNumber);
                        const phoneRaw = isInbound || isCalleeCentral ? caller : callee;
                        const phone = isInbound || isCalleeCentral ? (caller !== "Unknown" ? `+${caller}` : "Inbound (Unknown)")
                            : (callee !== "Unknown" ? `+${callee}` : (isWeb ? "Website/API" : "Unknown"));

                        const duration = c.call_duration_secs || c.duration_secs || meta.call_duration_secs || 0;
                        const rateEntry: any = getRateInfo(phoneRaw);
                        const costUSD = calculateCostValue(duration, phoneRaw, isInbound);

                        const startTimeSec = c.start_time_unix_secs || c.start_time || 0;
                        const startedAt = startTimeSec ? new Date(startTimeSec * 1000).toISOString() : new Date().toISOString();

                        return {
                            id: c.conversation_id,
                            startedAt,
                            durationSeconds: duration,
                            cost: costUSD > 0 ? `$${costUSD.toFixed(3)}` : (meta.cost ? `${meta.cost} credits` : "$0.00"),
                            costValue: costUSD,
                            type: isInbound ? "Inbound" : (isWeb ? "Web Call" : "Outbound"),
                            isInbound,
                            phone,
                            country: rateEntry?.Country || (phone.startsWith('+') ? "Other" : "Unknown"),
                            source: 'elevenlabs',
                            status: (c.status === 'success' || c.status === 'done' || c.status === 'completed') ? 'answered' : (c.status || 'answered')
                        };
                    });
                }
            }
        } catch (e) {
            console.error("ElevenLabs aggregation fail:", e);
        }

        // --- 2. Maqsam Aggregation ---
        let maqsamNormalized: any[] = [];
        try {
            const mKey = process.env.MAQSAM_ACCESS_KEY_ID || process.env.MAQSAM_ACCESS_KEY;
            const mSecret = process.env.MAQSAM_ACCESS_SECRET;
            const mBase = process.env.MAQSAM_BASE_URL || 'maqsam.com';

            if (mKey && mSecret) {
                const creds = Buffer.from(`${mKey}:${mSecret}`).toString('base64');
                const mUrl = `https://api.${mBase}/v2/calls?limit=100`;

                const mRes = await fetch(mUrl, {
                    headers: { 'Authorization': `Basic ${creds}`, 'Accept': 'application/json' }
                });

                if (mRes.ok) {
                    const mData = await mRes.json();
                    const mcList = mData.calls || mData.data || [];

                    maqsamNormalized = mcList.map((mc: any) => {
                        const mDirect = (mc.direction || mc.type || "").toLowerCase();
                        const isInbound = mDirect === 'inbound' || mDirect === 'incoming';

                        const caller = cleanPhoneNumber(mc.caller_number || mc.from);
                        const callee = cleanPhoneNumber(mc.callee_number || mc.to);

                        const phoneRaw = isInbound ? caller : callee;
                        const phone = phoneRaw !== "Unknown" ? `+${phoneRaw}` : "Unknown";

                        const duration = parseInt(mc.duration || 0);
                        const rateEntry: any = getRateInfo(phoneRaw);
                        const costUSD = calculateCostValue(duration, phoneRaw, isInbound);

                        return {
                            id: (mc.id || mc.uuid || Math.random()).toString(),
                            startedAt: mc.start_time || mc.created_at || new Date().toISOString(),
                            durationSeconds: duration,
                            cost: costUSD > 0 ? `$${costUSD.toFixed(3)}` : "$0.00",
                            costValue: costUSD,
                            type: isInbound ? "Inbound" : "Outbound",
                            isInbound,
                            phone,
                            country: rateEntry?.Country || "Unknown",
                            source: 'maqsam',
                            status: (mc.status === 'answered' || mc.status === 'completed') ? 'answered' : (mc.status || 'missed')
                        };
                    });
                } else {
                    console.error("Maqsam error:", mRes.status);
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
