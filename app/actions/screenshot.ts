/* eslint-disable @typescript-eslint/no-explicit-any */

"use server";

import { z } from "zod";

const CLOUDFLARE_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT;
const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;

const ScreenshotSchema = z.object({
  url: z.string().url(),
});

export async function takeScreenshot(formData: FormData) {
  const url = formData.get("url");
  const parse = ScreenshotSchema.safeParse({ url });
  if (!parse.success) {
    return { error: "Invalid URL" };
  }
  if (!CLOUDFLARE_ACCOUNT_ID || !CLOUDFLARE_API_TOKEN) {
    return { error: "Cloudflare credentials not set" };
  }
  try {
    const apiUrl = `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/browser-rendering/screenshot`;
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${CLOUDFLARE_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url,
        viewport: {
          width: 1200,
          height: 800,
        },
        gotoOptions: {
          waitUntil: "domcontentloaded",
          timeout: 30000,
        },
      }),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return { error: err?.errors?.[0]?.message || response.statusText };
    }
    const contentType = response.headers.get("content-type");
    const buffer = Buffer.from(await response.arrayBuffer());
    const base64 = buffer.toString("base64");
    return { image: base64, contentType };
  } catch (e: any) {
    return { error: e?.message || "Unknown error" };
  }
}
