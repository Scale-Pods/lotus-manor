import { NextResponse } from 'next/server';
import crypto from 'crypto';

export async function GET() {
    const results: any = { maqsam: {} };
    const mKey = process.env.MAQSAM_ACCESS_KEY_ID;
    const mSecret = process.env.MAQSAM_ACCESS_SECRET;

    if (mKey && mSecret) {
        const endpoint = "/v1/calls";
        const method = "GET";
        // Format: YYYY-MM-DDTHH:mm:ssZ (No milliseconds)
        const timestamp = new Date().toISOString().split('.')[0] + 'Z';

        const payload = `${method}${endpoint}${timestamp}`;
        const sig = crypto.createHmac("sha256", mSecret).update(payload).digest("base64");

        const res = await fetch(`https://api.maqsam.com${endpoint}?limit=1`, {
            headers: {
                "X-ACCESS-KEY": mKey,
                "X-TIMESTAMP": timestamp,
                "X-SIGNATURE": sig,
            }
        });

        results.maqsam.no_ms = { status: res.status, body: await res.text(), timestamp, payload };
    }

    return NextResponse.json(results);
}
