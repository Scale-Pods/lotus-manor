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

        // Extract function calls / tool executions
        // Often found in `messages` where role='tool' or 'function'.
        const executions = data.functionCalls ||
            (data.messages || []).filter((m: any) => m.role === 'function' || m.role === 'tool' || m.type === 'function-call');

        return NextResponse.json({ executions });

    } catch (error) {
        console.error("Error fetching executions:", error);
        return NextResponse.json({ error: "Failed to fetch executions" }, { status: 500 });
    }
}
