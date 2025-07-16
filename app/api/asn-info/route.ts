import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const asn = searchParams.get("asn");
  if (!asn) {
    return NextResponse.json({ error: "Missing ASN" }, { status: 400 });
  }

  const apiUrl = `https://api.cloudflare.com/client/v4/radar/entities/asns/${asn}`;
  const radarSecret = process.env.CLOUDFLARE_RADAR_SECRET;

  if (!radarSecret) {
    return NextResponse.json(
      { error: "Missing Cloudflare Radar secret" },
      { status: 500 }
    );
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${radarSecret}`,
  };

  try {
    const res = await fetch(apiUrl, { headers });
    if (!res.ok) {
      return NextResponse.json(
        { error: "Failed to fetch ASN info" },
        { status: 500 }
      );
    }
    const data = await res.json();
    return NextResponse.json(
      { name: data?.result?.asn?.aka || "" },
      {
        status: 200,
        headers: {
          "Cache-Control": "public, s-maxage=604800",
          "CDN-Cache-Control": "public, s-maxage=604800",
          "Vercel-CDN-Cache-Control": "public, s-maxage=604800",
        },
      }
    );
  } catch (e) {
    console.log(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
