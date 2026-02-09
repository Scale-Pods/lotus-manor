import { NextResponse } from 'next/server';

const VAPI_BASE_URL = 'https://api.vapi.ai';

export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const apiKey = process.env.VAPI_PUBLIC_KEY;
        const callId = params.id;

        if (!apiKey) return NextResponse.json({ error: "Configuration error" }, { status: 500 });

        const response = await fetch(`${VAPI_BASE_URL}/call/${callId}`, {
            headers: { 'Authorization': `Bearer ${apiKey}` }
        });

        if (!response.ok) throw new Error(`Vapi error: ${response.status}`);

        const data = await response.json();

        // Extract transcript
        // Vapi structure usually has `transcript` or `messages` or `analysis.transcript`.
        // We'll return the raw transcript fields available.
        const transcript = data.transcript || data.messages || (data.analysis && data.analysis.transcript);

        return NextResponse.json({ transcript });

    } catch (error) {
        console.error("Error fetching transcript:", error);
        return NextResponse.json({ error: "Failed to fetch transcript" }, { status: 500 });
    }
}
