"use server";

import { cookies } from "next/headers";

interface ApiSettings {
  key: string | undefined;
  secret: string | undefined;
}

export async function setApiKey(apiKey: string) {
  const cookieStore = await cookies();
  cookieStore.set("shadowserver-api-key", apiKey, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 400 * 24 * 60 * 60, // 400 days
  });
}

export async function getApiSettings() {
  const cookieStore = await cookies();
  const settings: ApiSettings = {
    key: cookieStore.get("shadowserver-api-key")?.value,
    secret: cookieStore.get("shadowserver-api-secret")?.value,
  };

  return settings;
}

export async function getApiKey() {
  const cookieStore = await cookies();
  return cookieStore.get("shadowserver-api-key")?.value;
}

export async function setApiSecret(apiKey: string) {
  const cookieStore = await cookies();

  cookieStore.set("shadowserver-api-secret", apiKey, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 400 * 24 * 60 * 60, // 30 days
  });
}

export async function getApiSecret() {
  const cookieStore = await cookies();

  return cookieStore.get("shadowserver-api-secret")?.value;
}
