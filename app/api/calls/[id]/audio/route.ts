import { NextRequest, NextResponse } from 'next/server';

const ELEVENLABS_BASE_URL = 'https://api.elevenlabs.io/v1';

export async function GET(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const apiKey = process.env.ELEVENLABS_API_KEY;
        const { id } = await context.params;

        if (!apiKey) return NextResponse.json({ error: "Configuration error" }, { status: 500 });

        const upstream = await fetch(`${ELEVENLABS_BASE_URL}/convai/conversations/${id}/audio`, {
            headers: { 'xi-api-key': apiKey }
        });

        if (!upstream.ok) {
            throw new Error(`ElevenLabs error: ${upstream.status}`);
        }

        // Stream the response body directly to the client instead of buffering
        // the full file. This lets the browser start buffering and playing
        // audio almost immediately rather than waiting for the full download.
        return new NextResponse(upstream.body, {
            status: 200,
            headers: {
                'Content-Type': upstream.headers.get('Content-Type') || 'audio/mpeg',
                'Content-Length': upstream.headers.get('Content-Length') || '',
                // Cache for 1 hour so re-opening the same call is instant
                'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
            },
        });

    } catch (error) {
        console.error("Error proxying audio:", error);
        return NextResponse.json({ error: "Failed to fetch audio" }, { status: 500 });
    }
}
