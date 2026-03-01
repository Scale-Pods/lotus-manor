import { NextResponse } from "next/server";
import crypto from "crypto";

export async function GET() {
  try {
    const ACCESS_KEY_ID = process.env.MAQSAM_ACCESS_KEY_ID!;
    const ACCESS_SECRET = process.env.MAQSAM_ACCESS_SECRET!;

    const endpoint = "/v1/account/balance";
    const method = "GET";
    const timestamp = new Date().toISOString();

    const payload = `${method}${endpoint}${timestamp}`;

    const signature = crypto
      .createHmac("sha256", ACCESS_SECRET)
      .update(payload)
      .digest("base64");

    const response = await fetch(`https://api.maqsam.com${endpoint}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        "X-ACCESS-KEY": ACCESS_KEY_ID,
        "X-TIMESTAMP": timestamp,
        "X-SIGNATURE": signature,
      },
    });

    const text = await response.text();

    return NextResponse.json({
      status: response.status,
      response: text,
    });

  } catch (err: any) {
    return NextResponse.json({
      error: err.message,
    });
  }
}
