import { NextResponse } from 'next/server';
import { subDays, startOfDay } from "date-fns";

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const from = searchParams.get('from');
    const to = searchParams.get('to');

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

        // Default to last 7 days if no date range is provided to ensure maximum performance
        const now = new Date();
        const defaultFrom = subDays(startOfDay(now), 7).toISOString();
        const effectiveFrom = from || defaultFrom;

        while (hasMore) {
            // Pruned columns: Only fetch what's used in the Dashboard and WhatsApp Panels
            const select = 'id,name,"contactNo","createdOn","Voice_1","Voice_2","Whatsapp_1","Whatsapp_1_status","Whatsapp_1_Date","WTS_Reply_Track","retry_1",' +
                '"User_Replied_1","User_Replied_2","User_Replied_3","User_Replied_4","User_Replied_5",' +
                '"Bot_Replied_1","Bot_Replied_2","Bot_Replied_3","Bot_Replied_4","Bot_Replied_5",' +
                '"Bot_Replied_Status_1","Bot_Replied_Status_2","Bot_Replied_Status_3","Bot_Replied_Status_4","Bot_Replied_Status_5"';
            
            let url = `${baseUrl}/${tableName}?select=${select}&offset=${offset}&limit=${limit}`;
            
            // Apply date filtering to keep the payload manageable
            if (effectiveFrom) url += `&createdOn=gte.${effectiveFrom}`;
            if (to) url += `&createdOn=lte.${to}`;
            
            url += `&order=createdOn.desc`;

            try {
                const response = await fetch(url, { 
                    headers: commonHeaders, 
                    cache: 'no-store',
                    signal: AbortSignal.timeout(25000) 
                });
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
            } catch (err) { 
                console.error(`Error fetching ${tableName}:`, err);
                break; 
            }

            // Hybrid Strategy: Cap at 3,000 latest records for dashboard performance
            if (offset >= 3000) break; 
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
