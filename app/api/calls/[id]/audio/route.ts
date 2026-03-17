import { NextRequest, NextResponse } from 'next/server';

// ─── CRITICAL for Vercel ─────────────────────────────────────────────────────
// Serverless (Lambda) functions on Vercel buffer the entire response body before
// sending anything. For a multi-minute audio file, that means the user waits the
// full download time before a single byte reaches their browser.
//
// Edge Runtime runs at the CDN edge node closest to the user, has ZERO cold-start
// time, and truly streams bytes as they arrive from ElevenLabs — so the browser
// can start playing almost immediately.
// ─────────────────────────────────────────────────────────────────────────────
export const runtime = 'edge';

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
            headers: {
                'xi-api-key': apiKey,
                // Forward range request headers if the browser is seeking mid-file
                ...(request.headers.get('Range') ? { 'Range': request.headers.get('Range')! } : {}),
            }
        });

        if (!upstream.ok && upstream.status !== 206) {
            throw new Error(`ElevenLabs error: ${upstream.status}`);
        }

        // Stream ElevenLabs response body directly to the browser.
        // On Edge Runtime this is a true zero-copy stream — no buffering.
        return new NextResponse(upstream.body, {
            status: upstream.status,
            headers: {
                'Content-Type': upstream.headers.get('Content-Type') || 'audio/mpeg',
                'Content-Length': upstream.headers.get('Content-Length') || '',
                // Allow browser to seek by byte range (needed for <audio> scrubbing)
                'Accept-Ranges': 'bytes',
                // Cache at CDN edge for 1h; instant on subsequent opens
                'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
                // Suggested filename for download
                'Content-Disposition': `inline; filename="call-${id}.mp3"`,
            },
        });

    } catch (error) {
        console.error("Error proxying audio:", error);
        return NextResponse.json({ error: "Failed to fetch audio" }, { status: 500 });
    }
}
