import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Builds a URL for IP query with all necessary parameters
 * @param ip - The IP address to query
 * @param dateRange - Optional date range {from, to}
 * @param geo - Optional geo filter
 * @param basePath - Base path for the query (defaults to '/query')
 * @param useDefaultGeo - Whether to use default geo from localStorage if no geo provided (defaults to true)
 * @returns Complete URL string
 */
export function buildIpQueryUrl(
  ip: string,
  dateRange?: { from: string; to: string } | null,
  geo?: string,
  basePath: string = "/query",
  useDefaultGeo: boolean = true
): string {
  const params = new URLSearchParams();
  params.set("ip", ip.trim());

  if (dateRange?.from && dateRange?.to) {
    params.set("date", `${dateRange.from}:${dateRange.to}`);
  }

  // Use provided geo, or fall back to default from localStorage
  const defaultGeo =
    typeof window !== "undefined"
      ? localStorage.getItem("default-geo") || "NZ"
      : "NZ";

  const geoToUse = geo || (useDefaultGeo ? defaultGeo : undefined);
  if (geoToUse) params.set("geo", geoToUse);

  return `${basePath}?${params.toString()}`;
}
