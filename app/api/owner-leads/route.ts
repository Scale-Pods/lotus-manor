import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim();
    const secretKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();

    if (!supabaseUrl || !secretKey) {
        return NextResponse.json({ error: "Config missing" }, { status: 500 });
    }

    const baseUrl = `${supabaseUrl.replace(/\/$/, "")}/rest/v1`;
    const commonHeaders = {
        "apikey": secretKey,
        "Authorization": `Bearer ${secretKey}`,
        "Content-Type": "application/json"
    };

    const fetchAllRows = async (tableName: string) => {
        let allData: any[] = [];
        let offset = 0;
        const limit = 1000;
        let hasMore = true;

        while (hasMore) {
            const url = `${baseUrl}/${tableName}?select=*&offset=${offset}&limit=${limit}`;
            try {
                const response = await fetch(url, { headers: commonHeaders, cache: 'no-store' });
                if (!response.ok) {
                    const errMsg = await response.text();
                    console.error(`Fetch error for ${tableName}:`, errMsg);
                    break;
                }
                const data = await response.json();
                if (Array.isArray(data)) {
                    allData = allData.concat(data);
                    if (data.length < limit) hasMore = false;
                    else offset += limit;
                } else { hasMore = false; }
            } catch (err) { break; }

            if (offset > 20000) break; // Safety cap
        }
        return allData;
    };

    try {
        const ownerData = await fetchAllRows("owner_data");

        return new NextResponse(JSON.stringify({ owner_data: ownerData }), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0',
            }
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
