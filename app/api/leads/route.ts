import { NextResponse } from 'next/server';

export async function GET() {
    try {
        const introLoopUrl = process.env.INTRO_LOOP_WEBHOOK_URL;
        const followUpUrl = process.env.FOLLOW_UP_WEBHOOK_URL;
        const nurtureLoopUrl = process.env.NURTURE_LOOP_WEBHOOK_URL;

        const [introRes, followUpRes, nurtureRes] = await Promise.all([
            introLoopUrl ? fetch(introLoopUrl, { cache: 'no-store' }) : Promise.resolve(null),
            followUpUrl ? fetch(followUpUrl, { cache: 'no-store' }) : Promise.resolve(null),
            nurtureLoopUrl ? fetch(nurtureLoopUrl, { cache: 'no-store' }) : Promise.resolve(null),
        ]);

        const results: any[] = [];
        const errors: string[] = [];

        // Helper to process response
        const processResponse = async (res: Response | null, loopName: string) => {
            if (!res) return; // URL not configured

            try {
                const text = await res.text();
                if (!res.ok) {
                    throw new Error(`${res.status} ${res.statusText} - ${text.substring(0, 100)}`);
                }

                if (!text.trim()) return; // Empty response

                try {
                    const data = JSON.parse(text);
                    const items = Array.isArray(data) ? data : [data];
                    items.forEach((item: any) => {
                        if (item && typeof item === 'object') {
                            item.current_loop = loopName;
                            // Add source tagging
                            if (loopName === "Nurture") item.source_loop = "Nurture";
                        }
                    });
                    results.push(...items);
                } catch (e) {
                    console.error(`${loopName}: Invalid JSON`, text.substring(0, 200));
                    errors.push(`${loopName}: Invalid JSON response`);
                }
            } catch (e: any) {
                console.error(`${loopName} fetch error:`, e.message);
                errors.push(`${loopName}: ${e.message}`);
            }
        };

        await Promise.all([
            processResponse(introRes, "Intro"),
            processResponse(followUpRes, "Follow Up"),
            processResponse(nurtureRes, "Nurture")
        ]);

        // Always return a 200 with whatever data we managed to get, 
        // effectively degrading gracefully instead of breaking the whole dashboard.
        // We filter out the n8n default "Workflow was started" messages.
        const validLeads = results.filter((item: any) => {
            if (!item || typeof item !== 'object') return false;
            if ('message' in item && item.message === 'Workflow was started' && !('name' in item)) {
                return false;
            }
            return true;
        });

        return NextResponse.json(validLeads);

    } catch (error) {
        console.error('Error fetching leads:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
