"use server";

import { getApiSettings } from "@/app/actions/api-key";
import { type NextRequest } from "next/server";

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
  { params }: { params: Promise<{ slug: string }> }
) {
  const slug = (await params).slug; // 'a', 'b', or 'c'
  const apiSettings = await getApiSettings();

  const searchParams = request.nextUrl.searchParams;

  if (!apiSettings.key || !apiSettings.secret) {
    return Response.json({ error: "API key not set" }, { status: 400 });
  }
  if (
    slug.length !== 2 ||
    slug[0] !== "reports" ||
    (slug[1] !== "list" && slug[1] !== "types")
  ) {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }

  // Create the request body
  const payload = JSON.stringify({
    ...Object.fromEntries(searchParams.entries()),
    apikey: apiSettings.key,
  });
  const hmac = await generateHMAC(payload, apiSettings.secret);

  const result = await fetch(
    `https://transform.shadowserver.org/api2/${slug[0]}/${slug[1]}`,
    { method: "POST", headers: { HMAC2: hmac }, body: payload }
  );
  const outcome = await result.json();

  return Response.json(outcome);
}
