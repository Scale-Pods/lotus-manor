import { NextResponse } from 'next/server';

const VAPI_BASE_URL = 'https://api.vapi.ai';

export async function GET() {
    try {
        const apiKey = process.env.VAPI_PUBLIC_KEY;

        if (!apiKey) {
            console.error("VAPI_PUBLIC_KEY is missing");
            return NextResponse.json({ error: "Configuration error" }, { status: 500 });
        }

        const response = await fetch(`${VAPI_BASE_URL}/call`, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorData = await response.text();
            throw new Error(`Vapi API error: ${response.status} ${errorData}`);
        }

        const data = await response.json();
        return NextResponse.json(data);

    } catch (error) {
        console.error("Error fetching calls from Vapi:", error);
        return NextResponse.json({ error: "Failed to fetch calls" }, { status: 500 });
    }
}
