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

        if (!apiKey) return NextResponse.json({ error: "Configuration error" }, { status: 500 });

        const response = await fetch(`${ELEVENLABS_BASE_URL}/convai/conversations/${conversationId}/audio`, {
            headers: { 'xi-api-key': apiKey }
        });

        if (!response.ok) {
            throw new Error(`ElevenLabs error: ${response.status}`);
        }

        // Return the binary audio stream with appropriate content type
        const audioBuffer = await response.arrayBuffer();

        return new NextResponse(audioBuffer, {
            headers: {
                'Content-Type': 'audio/mpeg', // ElevenLabs typically returns mp3
                'Cache-Control': 'public, max-age=3600'
            }
        });

    } catch (error) {
        console.error("Error proxying audio:", error);
        return NextResponse.json({ error: "Failed to fetch audio" }, { status: 500 });
    }
}
