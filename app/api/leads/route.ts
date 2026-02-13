import { NextResponse } from 'next/server';

export async function GET() {
    // Ensure we are using the correct REST endpoint structure
    const projectRef = "awflugnwzukejohfqkrr";
    const baseUrl = `https://${projectRef}.supabase.co/rest/v1`;
    const secretKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

    if (!secretKey) {
        console.error("Critical Error: SUPABASE_SERVICE_ROLE_KEY is missing in env.");
    }

    const headers = {
        "apikey": secretKey,
        "Authorization": `Bearer ${secretKey}`,
        "Content-Type": "application/json"
    };

    const fetchTable = async (tableName: string) => {
        // Construct URL without potential double slashes
        const url = `${baseUrl}/${tableName}?select=*`;
        console.log(`Fetching from Supabase: ${url}`);

        try {
            const response = await fetch(url, {
                headers,
                cache: 'no-store',
                // Adding redirect: 'follow' (default) but being explicit
                redirect: 'follow'
            });

            const contentType = response.headers.get("content-type");

            // If we get HTML, something is wrong with the auth or URL
            if (contentType && contentType.includes("text/html")) {
                const htmlSnippet = (await response.text()).substring(0, 200);
                console.error(`Error: HTML returned from ${tableName}. Check API keys/URL. Snippet: ${htmlSnippet}`);
                return [];
            }

            if (!response.ok) {
                const errorText = await response.text();
                console.error(`Error fetching ${tableName} (${response.status}):`, errorText);
                return [];
            }

            const data = await response.json();
            return Array.isArray(data) ? data : [];
        } catch (err) {
            console.error(`Fetch error for ${tableName}:`, err);
            return [];
        }
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
        console.error('Consolidated fetch error:', error);
        return NextResponse.json({
            nr_wf: [],
            followup: [],
            nurture: [],
            error: error.message
        }, { status: 500 });
    }
}
