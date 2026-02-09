import { NextResponse } from 'next/server';

const VAPI_BASE_URL = 'https://api.vapi.ai';

export async function GET(
    request: Request,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const apiKey = process.env.VAPI_PUBLIC_KEY;
        const { id } = await context.params;
        const callId = id;

        if (!apiKey) return NextResponse.json({ error: "Configuration error" }, { status: 500 });

        const response = await fetch(`${VAPI_BASE_URL}/call/${callId}`, {
            headers: { 'Authorization': `Bearer ${apiKey}` }
        });

        if (!response.ok) throw new Error(`Vapi error: ${response.status}`);

        const data = await response.json();

        return NextResponse.json({
            recordingUrl: data.recordingUrl || data.recording_url || null
        });

    } catch (error) {
        console.error("Error fetching recording:", error);
        return NextResponse.json({ error: "Failed to fetch recording" }, { status: 500 });
    }
}
