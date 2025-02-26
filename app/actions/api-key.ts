"use server";

import { cookies } from "next/headers";
import { getIronSession } from "iron-session";
import {
  experimental_taintObjectReference,
  experimental_taintUniqueValue,
} from "react";

const IRONSESSION_SECRET = process.env.IRONSESSION_SECRET;

type ApiSettings = {
  key: string | undefined;
  secret: string | undefined;
};

export async function setApiKey(apiKey: string) {
  const session = await getApiSettings();
  session.key = apiKey;
  await session.save();
}

export async function getApiSettings() {
  if (IRONSESSION_SECRET === undefined) {
    throw new Error("IRONSESSION_SECRET is not defined");
  }

  const session = await getIronSession<ApiSettings>(await cookies(), {
    password: IRONSESSION_SECRET,
    cookieName: "apikey",
    ttl: 0, //indefinite
    cookieOptions: {
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    },
  });

  experimental_taintObjectReference(
    "Do not pass unencrypted data to the client",
    session
  );

  return session;
}

export async function getApiKey() {
  const session = await getApiSettings();
  return session.key;
}

export async function setApiSecret(apiSecret: string) {
  const session = await getApiSettings();
  session.secret = apiSecret;
  await session.save();
}

export async function getApiSecret() {
  const session = await getApiSettings();
  if (session.secret) {
    experimental_taintUniqueValue(
      "Do not pass tokens to the client",
      session,
      session.secret
    );
  }

  return session.secret;
}
