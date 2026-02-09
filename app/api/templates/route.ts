import { NextResponse } from 'next/server';

export async function GET() {
    try {
        const templatesUrl = process.env.TEMPLATES_WEBHOOK_URL;

        if (!templatesUrl) {
            console.warn("TEMPLATES_WEBHOOK_URL is missing");
            return NextResponse.json({ error: "Configuration error" }, { status: 500 });
        }

        const res = await fetch(templatesUrl);

        if (!res.ok) {
            throw new Error(`Failed to fetch templates: ${res.status} ${res.statusText}`);
        }

        const data = await res.json();
        return NextResponse.json(data);

    } catch (error) {
        console.error("Error in templates API:", error);
        return NextResponse.json({ error: "Failed to fetch templates" }, { status: 500 });
    }
}
