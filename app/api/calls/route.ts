import { NextResponse } from 'next/server';

const ELEVENLABS_BASE_URL = 'https://api.elevenlabs.io/v1';

export async function GET() {
    try {
        const apiKey = process.env.ELEVENLABS_API_KEY;
        const agentId = process.env.ELEVENLABS_AGENT_ID;

        if (!apiKey) {
            console.error("ELEVENLABS_API_KEY is missing");
            return NextResponse.json({ error: "Configuration error" }, { status: 500 });
        }

        // Fetch conversations - use agent_id if provided, otherwise fetch all
        let allConversations: any[] = [];
        let cursor = null;
        let hasMore = true;

        while (hasMore && allConversations.length < 5000) {
            let url = agentId
                ? `${ELEVENLABS_BASE_URL}/convai/conversations?agent_id=${agentId}&page_size=100`
                : `${ELEVENLABS_BASE_URL}/convai/conversations?page_size=100`;

            if (cursor) {
                url += `&cursor=${cursor}`;
            }

            const response = await fetch(url, {
                headers: {
                    'xi-api-key': apiKey,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                const errorData = await response.text();
                throw new Error(`ElevenLabs API error: ${response.status} ${errorData}`);
            }

            const data = await response.json();
            const conversations = data.conversations || [];
            allConversations = [...allConversations, ...conversations];

            hasMore = data.has_more !== undefined ? data.has_more : !!data.next_cursor;
            cursor = data.next_cursor;
        }

        // Normalize conversations for the dashboard table
        const normalized = allConversations.map((c: any) => {
            const dynamicVars = c.conversation_initiation_client_data?.dynamic_variables || {};
            const metadata = c.metadata || {};
            const telephony = c.telephony || {};

            // Detailed Number Extraction - Check every possible location including telephony sub-object
            const callerNumber =
                telephony.caller_number ||
                metadata.caller_number ||
                metadata.caller_id ||
                c.caller_number ||
                c.caller_id ||
                dynamicVars.caller_number ||
                dynamicVars.caller ||
                "Unknown";

            const calleeNumber =
                telephony.callee_number ||
                metadata.callee_number ||
                metadata.callee_id ||
                c.callee_number ||
                c.callee_id ||
                dynamicVars.callee_number ||
                dynamicVars.callee ||
                "Unknown";

            const centralNumber = "97148714150";

            // Direction Detection Heuristics
            const initiationType = (c.conversation_initiation_type || "").toString().toLowerCase();
            const rawType = (
                telephony.direction ||
                c.direction ||
                metadata.direction ||
                metadata.type ||
                metadata.call_type ||
                dynamicVars.direction ||
                dynamicVars.type ||
                c.type ||
                "unknown"
            ).toString().toLowerCase();

            let isInbound = rawType.includes('inbound') || initiationType.includes('inbound');

            // heuristic: if it's telephony and initiation type is not specified, but callee is central, it's inbound
            if (!isInbound && calleeNumber.toString().replace(/\D/g, '').includes(centralNumber)) {
                isInbound = true;
            }

            // heuristic: if the caller is our central number, it's definitely outbound
            if (isInbound && callerNumber.toString().replace(/\D/g, '').includes(centralNumber)) {
                isInbound = false;
            }

            const callType = isInbound ? "Inbound" : (rawType.includes('outbound') ? "Outbound" : "unknown");

            // Final fallback for Web Call
            let finalPhone = callerNumber !== "Unknown" ? callerNumber : (calleeNumber !== "Unknown" ? calleeNumber : "Website/API");
            let finalType = callType;

            if (finalPhone === "Website/API" && !initiationType.includes('telephony') && callType === "unknown") {
                finalType = "Web Call";
            } else if (callType === "unknown") {
                finalType = "Outbound"; // Default to outbound if still unknown but has numbers
            }

            return {
                ...c,
                id: c.conversation_id, // Alias for frontend consistency
                startedAt: c.start_time_unix_secs ? new Date(c.start_time_unix_secs * 1000).toISOString() : null,
                durationSeconds: c.call_duration_secs || metadata.call_duration_secs || 0,
                cost: metadata.cost ? `${metadata.cost} credits` : (c.cost ? `${c.cost} credits` : '$0.00'),
                type: finalType,
                isInbound: isInbound,
                calleeNumber: calleeNumber,
                callerNumber: callerNumber,
                // Try to find a phone number for display
                phone: finalPhone,
                customerName: metadata.caller_name || metadata.caller_id || c.agent_name || "Guest"
            };
        });

        return NextResponse.json(normalized);

    } catch (error) {
        console.error("Error fetching calls from ElevenLabs:", error);
        return NextResponse.json({ error: "Failed to fetch calls" }, { status: 500 });
    }
}
