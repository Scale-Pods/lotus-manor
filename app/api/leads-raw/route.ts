import { NextResponse } from 'next/server';

export async function GET() {
    const baseUrl = "https://awflugnwzukejohfqkrr.supabase.co/rest/v1/";
    const secretKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

    const headers = {
        "apikey": secretKey,
        "Authorization": `Bearer ${secretKey}`,
        "Content-Type": "application/json"
    };

    const fetchTable = async (tableName: string) => {
        const url = `${baseUrl}${tableName}?select=*`;
        const response = await fetch(url, { headers, cache: 'no-store' });

        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("text/html")) {
            console.error(`Error: HTML returned from ${url}. Endpoint might be wrong.`);
            return [];
        }

        if (!response.ok) {
            console.error(`Error fetching ${tableName}:`, await response.text());
            return [];
        }

        return response.json();
    };

    try {
        const [nr_wf, followup, nurture] = await Promise.all([
            fetchTable("nr_wf"),
            fetchTable("followup"),
            fetchTable("nurture")
        ]);

        return NextResponse.json({
            nr_wf,
            followup,
            nurture
        });

    } catch (error: any) {
        console.error('Raw fetch error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
