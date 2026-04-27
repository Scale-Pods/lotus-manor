import { NextResponse } from 'next/server';

export const runtime = 'edge';
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

    // Helper for fast counts
    const getTableCount = async (tableName: string, filter = "") => {
        try {
            let url = `${baseUrl}/${tableName}?select=count&limit=0`;
            if (filter) url += `&${filter}`;
            
            const response = await fetch(url, { 
                headers: { ...commonHeaders, "Prefer": "count=exact" }, 
                cache: 'no-store' 
            });
            if (!response.ok) return 0;
            
            const contentRange = response.headers.get("content-range");
            if (contentRange) {
                const count = contentRange.split('/')[1];
                return parseInt(count) || 0;
            }
            return 0;
        } catch (e) {
            return 0;
        }
    };

    // Helper for fetching table data
    const fetchTableData = async (tableName: string, filterRange = true, select = "*") => {
        let allData: any[] = [];
        let offset = 0;
        const limit = 1000;
        let hasMore = true;

        while (hasMore) {
            let url = `${baseUrl}/${tableName}?select=${select}&offset=${offset}&limit=${limit}`;
            
            // Only apply Created At filter to Master Leads or if requested
            if (filterRange && from) url += `&"Created At"=gte.${from}`;
            if (filterRange && to) url += `&"Created At"=lte.${to}`;

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
        // Parallel execution
        const [nr_wf, followup, nurture, master_leads, v1Count, v2Count, v3Count] = await Promise.all([
            // Workflows: No date limit, all columns, ensures WhatsApp works
            fetchTableData("nr_wf", false),
            fetchTableData("followup", false),
            fetchTableData("nurture", false),
            
            // Master Leads: Filtered by date for dashboard performance
            fetchTableData("master_leads", true, '"Lead ID",Name,Phone,Email,"Created At"'),
            
            // Background counts for All-Time Voice metric
            getTableCount("nr_wf", '"Voice 1"=not.is.null'),
            getTableCount("followup", '"Voice 1"=not.is.null'),
            getTableCount("nurture", '"Voice 1"=not.is.null')
        ]);

        return NextResponse.json({
            nr_wf,
            followup,
            nurture,
            master_leads,
            allTimeVoiceCount: (v1Count || 0) + (v2Count || 0) + (v3Count || 0)
        });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
