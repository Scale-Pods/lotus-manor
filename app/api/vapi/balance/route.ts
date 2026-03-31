import { NextResponse } from 'next/server';

export async function GET() {
    const elApiKey = process.env.ELEVENLABS_API_KEY;
    const vapiPrivKey = process.env.VAPI_PRIVATE_KEY;

    let elData = null;
    let vapiData = null;

    if (elApiKey) {
        try {
            const elRes = await fetch('https://api.elevenlabs.io/v1/user/subscription', {
                method: 'GET',
                headers: { 'xi-api-key': elApiKey, 'Content-Type': 'application/json' }
            });

            if (elRes.ok) {
                const data = await elRes.json();
                elData = {
                    character_count: data.character_count,
                    character_limit: data.character_limit,
                    reset_at: data.next_character_count_reset_unix,
                    usage_percent: (data.character_count / data.character_limit) * 100
                };
            }
        } catch (e) {
            console.error('ElevenLabs Balance Fetch Error:', e);
        }
    }

    if (vapiPrivKey) {
        try {
            // Try /org first (standard)
            const vapiRes = await fetch('https://api.vapi.ai/org', {
                headers: { 'Authorization': `Bearer ${vapiPrivKey}`, 'Content-Type': 'application/json' }
            });

            if (vapiRes.ok) {
                const rawVapi = await vapiRes.json();
                const balance = rawVapi.balance ??
                    rawVapi.billing?.balance ??
                    rawVapi.credits ??
                    rawVapi.creditsBalance ??
                    rawVapi.billingPlan?.balance ??
                    0;

                vapiData = { ...rawVapi, balance };
            } else {
                // Fallback to /me
                const vapiMeRes = await fetch('https://api.vapi.ai/me', {
                    headers: { 'Authorization': `Bearer ${vapiPrivKey}`, 'Content-Type': 'application/json' }
                });
                if (vapiMeRes.ok) {
                    const rawMe = await vapiMeRes.json();
                    const balance = rawMe.balance ?? rawMe.org?.balance ?? rawMe.billingPlan?.balance ?? 0;
                    vapiData = { ...rawMe, balance };
                } else {
                    const errText = await vapiRes.text();
                    console.error(`[Vapi Balance Error] Org Status: ${vapiRes.status}, Me Status: ${vapiMeRes.status}, Body: ${errText}`);
                }
            }
        } catch (e) {
            console.error('Vapi Balance Fetch Error:', e);
        }
    }

    return NextResponse.json({
        elevenlabs: elData,
        vapi: vapiData,
        // Maintain backward compatibility for character_count if only ElevenLabs is used
        ...(elData || {})
    });
}
