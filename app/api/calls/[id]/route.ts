import { NextRequest, NextResponse } from 'next/server';

const ELEVENLABS_BASE_URL = 'https://api.elevenlabs.io/v1';

export async function GET(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const apiKey = process.env.ELEVENLABS_API_KEY;
        const { id } = await context.params;
        const conversationId = id;

        if (!apiKey) {
            return NextResponse.json({ error: "Configuration error" }, { status: 500 });
        }

        const response = await fetch(`${ELEVENLABS_BASE_URL}/convai/conversations/${conversationId}`, {
            headers: {
                'xi-api-key': apiKey,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            if (response.status === 404) {
                return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
            }
            throw new Error(`ElevenLabs API error: ${response.status}`);
        }

        const data = await response.json();

        const dynamicVars = data.conversation_initiation_client_data?.dynamic_variables || {};

        // Normalize for frontend
        const normalized = {
            ...data,
            id: data.conversation_id,
            startedAt: data.metadata?.start_time_unix_secs ? new Date(data.metadata.start_time_unix_secs * 1000).toISOString() : null,
            durationSeconds: data.metadata?.call_duration_secs || data.call_duration_secs || data.analysis?.call_duration_secs || 0,
            cost: data.metadata?.cost ? `${data.metadata.cost} credits` : '$0.00',
            // Let the frontend know exact charges if needed
            llm_charge: data.metadata?.charging?.llm_charge || 0,
            llm_price: data.metadata?.charging?.llm_price || 0,
            // Fallback parsing from dynamic vars if missing in standard fields
            caller_number: data.metadata?.caller_number || dynamicVars.caller_number || dynamicVars.caller || "Unknown",
            callee_number: data.metadata?.callee_number || dynamicVars.callee_number || dynamicVars.callee || "Unknown",
            // The real direction stored deeply by ElevenLabs
            type: data.direction || dynamicVars.direction || dynamicVars.type || data.metadata?.direction || "Unknown",
            isInbound: (data.direction || dynamicVars.direction || dynamicVars.type || data.metadata?.direction || "").toLowerCase() === 'inbound',
            audio_url: `${ELEVENLABS_BASE_URL}/convai/conversations/${conversationId}/audio` // frontend will need to pass xi-api-key normally, since this requires auth, we should proxy it or pass URL
        };

        return NextResponse.json(normalized);

    } catch (error) {
        console.error("Error fetching conversation details:", error);
        return NextResponse.json({ error: "Failed to fetch conversation details" }, { status: 500 });
    }
}
