"use server";

import { getApiKey, getApiSecret } from "@/app/actions/api-key";

async function generateHMAC(payload, secret) {
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

export async function GET() {
  const key = await getApiKey();
  const secret = await getApiSecret();

  // Create the request body
  const payload = JSON.stringify({ apikey: key });
  const hmac = await generateHMAC(payload, secret);

  console.log(hmac);

  const result = await fetch(
    "https://transform.shadowserver.org/api2/reports/subscribed",
    { method: "POST", headers: { HMAC2: hmac }, body: payload }
  );
  const outcome = await result.json();

  return Response.json({ outcome });
}
