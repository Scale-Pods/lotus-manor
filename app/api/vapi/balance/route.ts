import { NextResponse } from 'next/server';

export async function GET() {
    const apiKey = process.env.ELEVENLABS_API_KEY;

    if (!apiKey) {
        return NextResponse.json(
            { error: true, message: 'Configuration error: ELEVENLABS_API_KEY is missing' },
            { status: 500 }
        );
    }

    try {
        const response = await fetch('https://api.elevenlabs.io/v1/user/subscription', {
            method: 'GET',
            headers: {
                'xi-api-key': apiKey,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('ElevenLabs Subscription API Error:', response.status, errorText);
            return NextResponse.json(
                { error: true, message: `ElevenLabs API error: ${response.status}`, details: errorText },
                { status: response.status }
            );
        }

        const data = await response.json();

        // Normalize for frontend - we'll send characters used vs limit as a "balance" concept
        // or just return the raw data and handle in frontend. 
        // For simplicity, we'll return an object that can be interpreted easily.
        return NextResponse.json({
            character_count: data.character_count,
            character_limit: data.character_limit,
            reset_at: data.next_character_count_reset_unix,
            // Calculate a percentage for UI if needed
            usage_percent: (data.character_count / data.character_limit) * 100
        });

    } catch (error) {
        console.error('ElevenLabs Balance Route Error:', error);
        return NextResponse.json(
            { error: true, message: 'Internal Server Error' },
            { status: 500 }
        );
    }
}
