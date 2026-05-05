import { NextResponse } from 'next/server';

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

        while (hasMore) {
            const select = 'id,name,"contactNo","createdOn","Replied","Last Contacted","Voice_1",voice1_sentiment,call1_note,"call Lead Status","Call_Reply_Track","Whatsapp_1","Whatsapp_1_status",retry_1,retry_1_count,"WTS_Reply_Track","User_Replied_1","User_Replied_2","User_Replied_3","User_Replied_4","User_Replied_5","User_Replied_6","User_Replied_7","User_Replied_8","User_Replied_9","User_Replied_10","Bot_Replied_1","Bot_Replied_2","Bot_Replied_3","Bot_Replied_4","Bot_Replied_5","Bot_Replied_6","Bot_Replied_7","Bot_Replied_8","Bot_Replied_9","Bot_Replied_10","Bot_Replied_Status_1","Bot_Replied_Status_2","Bot_Replied_Status_3","Bot_Replied_Status_4","Bot_Replied_Status_5","Whatsapp_1_Date"';
            let url = `${baseUrl}/${tableName}?select=${select}&offset=${offset}&limit=${limit}`;
            
            // Apply date filtering on createdOn if provided - REMOVED to allow activity-based metrics on older leads
            // if (from) url += `&createdOn=gte.${from}`;
            // if (to) url += `&createdOn=lte.${to}`;
            
            // Order by createdOn descending to get latest first
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

            if (offset > 15000) break; // Safety cap
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
