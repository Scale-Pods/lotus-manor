import { NextResponse } from 'next/server';

export async function GET() {
    try {
        const introLoopUrl = process.env.INTRO_LOOP_WEBHOOK_URL;
        const followUpUrl = process.env.FOLLOW_UP_WEBHOOK_URL;

        if (!introLoopUrl || !followUpUrl) {
            return NextResponse.json({ error: 'Webhook URLs are not configured' }, { status: 500 });
        }

        const [introRes, followUpRes] = await Promise.all([
            fetch(introLoopUrl, { cache: 'no-store' }),
            fetch(followUpUrl, { cache: 'no-store' }),
        ]);

        const results = [];
        const errors = [];

        // Process Intro Loop
        if (introRes.ok) {
            try {
                const data = await introRes.json();
                const items = Array.isArray(data) ? data : [data];
                items.forEach((item: any) => { if (item && typeof item === 'object') item.current_loop = "Intro"; });
                results.push(...items);
            } catch (e) {
                console.error("Failed to parse Intro Loop JSON", e);
                errors.push("Intro Loop: Invalid JSON");
            }
        } else {
            const text = await introRes.text();
            console.error(`Intro Loop failed: ${introRes.status} ${introRes.statusText}`, text);
            // Check for specific N8N error
            if (introRes.status === 404 && text.includes("activate the workflow")) {
                errors.push("Intro Loop: Workflow not active");
            } else {
                errors.push(`Intro Loop: ${introRes.status} ${introRes.statusText}`);
            }
        }

        // Process Follow Up Loop
        if (followUpRes.ok) {
            try {
                const data = await followUpRes.json();
                const items = Array.isArray(data) ? data : [data];
                items.forEach((item: any) => { if (item && typeof item === 'object') item.current_loop = "Follow Up"; });
                results.push(...items);
            } catch (e) {
                console.error("Failed to parse Follow Up JSON", e);
                errors.push("Follow Up: Invalid JSON");
            }

        } else {
            const text = await followUpRes.text();
            console.error(`Follow Up failed: ${followUpRes.status} ${followUpRes.statusText}`, text);
            if (followUpRes.status === 404 && text.includes("activate the workflow")) {
                errors.push("Follow Up: Workflow not active");
            } else {
                errors.push(`Follow Up: ${followUpRes.status} ${followUpRes.statusText}`);
            }
        }

        if (errors.length > 0 && results.length === 0) {
            // If both failed or one failed and other returned nothing (unlikely if successful), 
            // return error. 
            // Actually if ONE succeeds, we might want to show partial data? 
            // But for now, if errors exist, let's signal relevant ones.
            return NextResponse.json({
                error: 'Failed to fetch leads',
                details: errors
            }, { status: 502 });
        }

        // Return combined data (even if one failed, if we have some data?)
        // If one failed and one succeeded, we probably should return the success ones + warnings?
        // But client expects array. 
        // Let's return what we have if any success.

        if (results.length > 0) {
            // Filter out invalid items and N8N default messages
            const validLeads = results.filter((item: any) => {
                if (!item || typeof item !== 'object') return false;
                // If it's the default "Workflow was started" message and has no other data
                if ('message' in item && item.message === 'Workflow was started' && !('name' in item)) {
                    return false;
                }
                return true;
            });
            return NextResponse.json(validLeads);
        }

        // If we are here, it means no successes, but maybe no errors if URLs were wrong? 
        // (errors.length > 0 handled above).

        return NextResponse.json([]);

    } catch (error) {
        console.error('Error fetching leads:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
