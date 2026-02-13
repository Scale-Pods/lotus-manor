import { NextResponse } from 'next/server';
import dns from 'node:dns';

try {
    dns.setDefaultResultOrder('ipv4first');
} catch (e) {
    // ignore
}

export async function GET() {
    // Try private key first, then fall back to public (though public likely won't work for billing)
    const apiKey = process.env.VAPI_PRIVATE_KEY || process.env.VAPI_PUBLIC_KEY;

    if (!apiKey) {
        return NextResponse.json(
            { error: true, message: 'Configuration error: VAPI_PRIVATE_KEY is missing' },
            { status: 500 }
        );
    }

    try {
        const response = await fetch('https://api.vapi.ai/billing/balance', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Vapi Billing API Error:', response.status, errorText);
            return NextResponse.json(
                { error: true, message: `Vapi API error: ${response.status}`, details: errorText },
                { status: response.status }
            );
        }

        const data = await response.json();
        return NextResponse.json(data);

    } catch (error) {
        console.error('Vapi Balance Route Error:', error);
        return NextResponse.json(
            { error: true, message: 'Internal Server Error' },
            { status: 500 }
        );
    }
}
