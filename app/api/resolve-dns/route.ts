/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { hostname } = await request.json();
    if (!hostname) {
      return NextResponse.json({ error: "Missing hostname" }, { status: 400 });
    }
    // Use Cloudflare DoH for A record
    const dohUrl = `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(
      hostname
    )}&type=A`;
    const dohHeaders = { Accept: "application/dns-json" };
    let ip = null;
    let response = await fetch(dohUrl, { headers: dohHeaders });
    if (response.ok) {
      const data = await response.json();
      if (data.Answer && data.Answer.length > 0) {
        const aRecord = data.Answer.find((ans: any) => ans.type === 1); // type 1 = A
        if (aRecord) ip = aRecord.data;
      }
    }
    // Fallback to AAAA if no A record
    if (!ip) {
      const dohUrlAAAA = `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(
        hostname
      )}&type=AAAA`;
      response = await fetch(dohUrlAAAA, { headers: dohHeaders });
      if (response.ok) {
        const data = await response.json();
        if (data.Answer && data.Answer.length > 0) {
          const aaaaRecord = data.Answer.find((ans: any) => ans.type === 28); // type 28 = AAAA
          if (aaaaRecord) ip = aaaaRecord.data;
        }
      }
    }
    if (ip) {
      return NextResponse.json(
        { ip },
        {
          status: 200,
          headers: {
            "Cache-Control": "public, s-maxage=3600",
            "CDN-Cache-Control": "public, s-maxage=3600",
            "Vercel-CDN-Cache-Control": "public, s-maxage=3600",
          },
        }
      );
    } else {
      return NextResponse.json(
        { error: "Could not resolve hostname" },
        { status: 404 }
      );
    }
  } catch (error) {
    console.log(error);
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
