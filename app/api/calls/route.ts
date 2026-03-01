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

        while (hasMore && allConversations.length < 1000) {
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
            const rawType = dynamicVars.direction || dynamicVars.type || c.metadata?.direction || c.type || c.metadata?.call_type || "unknown";
            const isInbound = rawType === 'inbound';
            const callType = isInbound ? "Inbound" : "Outbound";

            return {
                ...c,
                id: c.conversation_id, // Alias for frontend consistency
                startedAt: c.start_time_unix_secs ? new Date(c.start_time_unix_secs * 1000).toISOString() : null,
                durationSeconds: c.call_duration_secs || c.metadata?.call_duration_secs || 0,
                cost: c.metadata?.cost ? `${c.metadata.cost} credits` : (c.cost ? `${c.cost} credits` : '$0.00'),
                type: callType,
                // Try to find a phone number in metadata
                phone: c.metadata?.caller_number || dynamicVars.caller_number || dynamicVars.caller || "Website/API",
                customerName: c.metadata?.caller_id || "Guest"
            };
        });

        return NextResponse.json(normalized);

    } catch (error) {
        console.error("Error fetching calls from ElevenLabs:", error);
        return NextResponse.json({ error: "Failed to fetch calls" }, { status: 500 });
    }
}
