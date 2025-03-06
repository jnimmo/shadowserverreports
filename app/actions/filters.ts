"use server";

import { cookies } from "next/headers";

export type FilterSettings = {
  reportType?: string;
  dateRange: { from: string; to: string };
  geo?: string;
  asn?: string;
  ip?: string;
  severity?: string;
};

export async function setFilterSettings(settings: FilterSettings) {
  const cookieStore = await cookies();
  cookieStore.set("shadowserver-filter-settings", JSON.stringify(settings), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  });
}

export async function getFilterSettings(): Promise<FilterSettings | null> {
  const cookieStore = await cookies();

  const settings = cookieStore.get("shadowserver-filter-settings")?.value;
  return settings ? JSON.parse(settings) : null;
}
