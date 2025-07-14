import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { hostname } = await req.json();
    if (!hostname || typeof hostname !== "string") {
      return NextResponse.json({ error: "Invalid hostname" }, { status: 400 });
    }
    // Query Cloudflare DoH
    const url = `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(
      hostname
    )}&type=A`;
    const dohRes = await fetch(url, {
      headers: { Accept: "application/dns-json" },
    });
    if (!dohRes.ok) {
      return NextResponse.json({ error: "DNS query failed" }, { status: 502 });
    }
    const data = await dohRes.json();
    const answer = data.Answer?.find((a: any) => a.type === 1); // type 1 = A record
    if (!answer) {
      return NextResponse.json({ error: "No A record found" }, { status: 404 });
    }
    return NextResponse.json({ ip: answer.data });
  } catch (e) {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
