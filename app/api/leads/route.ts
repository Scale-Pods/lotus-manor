import { NextResponse } from 'next/server';

export async function GET() {
    try {
        const introLoopUrl = process.env.INTRO_LOOP_WEBHOOK_URL;
        const followUpUrl = process.env.FOLLOW_UP_WEBHOOK_URL;
        const nurtureLoopUrl = process.env.NURTURE_LOOP_WEBHOOK_URL;

        if (!introLoopUrl || !followUpUrl || !nurtureLoopUrl) {
            console.warn("One or more webhook URLs are missing");
            // return NextResponse.json({ error: 'Webhook URLs are not configured' }, { status: 500 });
        }

        const [introRes, followUpRes, nurtureRes] = await Promise.all([
            introLoopUrl ? fetch(introLoopUrl, { cache: 'no-store' }) : Promise.resolve({ ok: false, status: 404, statusText: "Not Configured", text: () => "URL Missing", json: () => ({}) } as any),
            followUpUrl ? fetch(followUpUrl, { cache: 'no-store' }) : Promise.resolve({ ok: false, status: 404, statusText: "Not Configured", text: () => "URL Missing", json: () => ({}) } as any),
            nurtureLoopUrl ? fetch(nurtureLoopUrl, { cache: 'no-store' }) : Promise.resolve({ ok: false, status: 404, statusText: "Not Configured", text: () => "URL Missing", json: () => ({}) } as any),
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

        // Process Nurture Loop
        if (nurtureRes.ok) {
            try {
                const data = await nurtureRes.json();
                const items = Array.isArray(data) ? data : [data];
                items.forEach((item: any) => {
                    if (item && typeof item === 'object') {
                        // Keep original current_loop if it exists (e.g. "Email 3"), but maybe prefix or use display_loop logic?
                        // User wants "Intro" / "Follow Up" for those loops.
                        // For Nurture, user wants to use data from backend? 
                        // The JSON example has "current_loop": "Email 3", "display_loop": "Week 3 — Email 3".
                        // Use "Nurture" as a fallback source identifier or just let the data speak?
                        // Let's add a `source` property or just rely on what's there?
                        // The user said: "if lead/data comes from the nurture link it shoulkd make the table like this output format"
                        // So we should probably mark it so the frontend knows it's from Nurture.
                        item.source_loop = "Nurture";
                    }
                });
                results.push(...items);
            } catch (e) {
                console.error("Failed to parse Nurture Loop JSON", e);
                errors.push("Nurture Loop: Invalid JSON");
            }
        } else {
            // It might be undefined if URL not set? logic below handles it.
            if (nurtureRes) {
                const text = await nurtureRes.text();
                console.error(`Nurture Loop failed: ${nurtureRes.status} ${nurtureRes.statusText}`, text);
                if (nurtureRes.status === 404 && text.includes("activate the workflow")) {
                    errors.push("Nurture Loop: Workflow not active");
                } else {
                    errors.push(`Nurture Loop: ${nurtureRes.status} ${nurtureRes.statusText}`);
                }
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
