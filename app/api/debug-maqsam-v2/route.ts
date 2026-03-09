import { NextResponse } from 'next/server';

export async function GET() {
    const results: any = {
        v2_attempt: null,
        v1_basic_attempt: null
    };

    const mKey = process.env.MAQSAM_ACCESS_KEY_ID;
    const mSecret = process.env.MAQSAM_ACCESS_SECRET;

    if (mKey && mSecret) {
        const auth = Buffer.from(`${mKey}:${mSecret}`).toString('base64');

        // Attempt V2 with Basic Auth
        try {
            const resV2 = await fetch(`https://api.maqsam.com/v2/calls?limit=1`, {
                headers: {
                    'Authorization': `Basic ${auth}`,
                    'Content-Type': 'application/json'
                }
            });
            results.v2_attempt = {
                status: resV2.status,
                body: await resV2.text()
            };
        } catch (e: any) {
            results.v2_error = e.message;
        }

        // Attempt V1 with Basic Auth (just in case)
        try {
            const resV1 = await fetch(`https://api.maqsam.com/v1/calls?limit=1`, {
                headers: {
                    'Authorization': `Basic ${auth}`,
                    'Content-Type': 'application/json'
                }
            });
            results.v1_basic_attempt = {
                status: resV1.status,
                body: await resV1.text()
            };
        } catch (e: any) {
            results.v1_error = e.message;
        }
    }

    return NextResponse.json(results);
}
