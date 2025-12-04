"use server";

import { getApiSettings } from "@/app/actions/api-key";
import { type NextRequest } from "next/server";

const QUERY_PARAMETERS = new Set([
  "agent",
  "application",
  "asn",
  "asn_name",
  "banner",
  "city",
  "county_fips",
  "county_name",
  "device_model",
  "device_sector",
  "device_type",
  "device_vendor",
  "device_version",
  "domain",
  "dst_asn",
  "dst_asn_name",
  "dst_city",
  "dst_county_fips",
  "dst_county_name",
  "dst_geo",
  "dst_ip",
  "dst_isp_name",
  "dst_latitude",
  "dst_longitude",
  "dst_naics",
  "dst_port",
  "dst_region",
  "dst_sector",
  "family",
  "geo",
  "infection",
  "ip",
  "isp_name",
  "latitude",
  "longitude",
  "md5",
  "naics",
  "port",
  "protocol",
  "referer",
  "region",
  "require",
  "registrar",
  "sector",
  "sha1",
  "sha256",
  "sha512",
  "sid",
  "source",
  "source_url",
  "tag",
  "text",
  "timestamp",
  "tld",
  "version",
]);

async function generateHMAC(payload: string, secret: string) {
  // Convert the secret key to a Uint8Array
  const encoder = new TextEncoder();
  const secretKeyData = encoder.encode(secret);

  // Import the secret key for HMAC use
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    secretKeyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  // Encode the payload as Uint8Array
  const payloadData = encoder.encode(payload);

  // Generate the HMAC signature
  const signature = await crypto.subtle.sign("HMAC", cryptoKey, payloadData);

  // Convert the signature to a hexadecimal string
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string[] }> }
) {
  const slug = (await params).slug;
  const apiSettings = await getApiSettings();

  const searchParams = request.nextUrl.searchParams;

  if (!apiSettings.key || !apiSettings.secret) {
    return Response.json({ error: "API key not set" }, { status: 403 });
  }
  if (
    slug.length !== 2 ||
    !(
      (slug[0] === "reports" &&
        ["list", "types", "stats", "query", "schema"].includes(slug[1])) ||
      (slug[0] === "key" && slug[1] === "info")
    )
  ) {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }

  // Create the request body
  const payloadData: Record<string, string | Record<string, string>> = {
    apikey: apiSettings.key,
  };

  const queryParams: Record<string, string> = {};
  let hasQueryParams = false;

  // Check each search parameter
  for (const [key, value] of searchParams.entries()) {
    if (QUERY_PARAMETERS.has(key)) {
      queryParams[key] = value;
      hasQueryParams = true;
    } else {
      payloadData[key] = value;
    }
  }

  // Only add query object if we found relevant parameters
  if (hasQueryParams) {
    payloadData.query = queryParams;
  }

  const payload = JSON.stringify(payloadData);
  const hmac = await generateHMAC(payload, apiSettings.secret);

  const result = await fetch(
    `https://transform.shadowserver.org/api2/${slug[0]}/${slug[1]}`,
    { method: "POST", headers: { HMAC2: hmac }, body: payload }
  );

  if (!result.ok) {
    return Response.json(
      { error: result.statusText },
      { status: result.status, statusText: result.statusText }
    );
  }
  const outcome = await result.json();

  return Response.json(outcome, {
    headers: {
      "Cache-Control": "private, max-age=3600, stale-while-revalidate",
    },
  });
}
