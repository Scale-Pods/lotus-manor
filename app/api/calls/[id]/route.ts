import { NextResponse } from 'next/server';

const VAPI_BASE_URL = 'https://api.vapi.ai';

export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const apiKey = process.env.VAPI_PUBLIC_KEY;
        const callId = params.id;

        if (!apiKey) {
            return NextResponse.json({ error: "Configuration error" }, { status: 500 });
        }

        const response = await fetch(`${VAPI_BASE_URL}/call/${callId}`, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            if (response.status === 404) {
                return NextResponse.json({ error: "Call not found" }, { status: 404 });
            }
            throw new Error(`Vapi API error: ${response.status}`);
        }

        const data = await response.json();
        return NextResponse.json(data);

    } catch (error) {
        console.error("Error fetching call details:", error);
        return NextResponse.json({ error: "Failed to fetch call details" }, { status: 500 });
    }
}
