import { useState, useEffect } from "react";
import { getApiKey } from "../app/actions/api-key";
import type { FilterSettings } from "../app/actions/filters";
import { Report } from "@/components/ReportList";
import useSWR from "swr/immutable";
import { Fetcher, SWRConfiguration } from "swr";

const swrConfig: SWRConfiguration = {
  //revalidateIfStale: false,
  revalidateOnFocus: false,
  revalidateOnReconnect: false,
  onErrorRetry: (error, key, config, revalidate, { retryCount }) => {
    // Never retry authentication errors
    if (error.status === 401) return;
    // Only retry up to 10 times.
    if (retryCount >= 10) return;
  },
};

async function fetcher(...args: Parameters<typeof fetch>) {
  const response = await fetch(...args);
  if (response.status === 401) {
    throw { status: 401, message: "Authentication error, check the API key." };
  }
  if (!response.ok) {
    throw { status: 400, message: "Unknown error." };
  }
  return response.json();
}

async function reportStatsFetcher(...args: Parameters<typeof fetch>) {
  const response = await fetch(...args);
  if (response.status === 401) {
    throw new Error("Invalid API key");
  }
  if (!response.ok) {
    throw { status: 400, message: "Unknown error." };
  }
  const data = await response.json();

  // Transform data into dictionary format
  if (!Array.isArray(data)) {
    throw { status: 400, message: "API response is not an array." };
  }
  return Object.fromEntries(
    data
      .slice(1)
      .map(([date, type, events]: [string, string, number]) => [
        `${date}_${type}`,
        events,
      ])
  ) as Record<string, number>;
}

export function useReportStats(filters: FilterSettings) {
  const queryParams = new URLSearchParams({
    date: `${filters.dateRange?.from.split("T")[0]}:${
      filters.dateRange?.to.split("T")[0]
    }`,
  });
  const { data, error, isLoading } = useSWR<Record<string, number>>(
    `/api/reports/stats?${queryParams}`,
    reportStatsFetcher,
    swrConfig
  );

  return {
    reportStats: data,
    isLoading,
    isError: error,
  };
}

export interface ReportDefinition {
  severity: string;
  description: string;
  url: string;
}

// export function useReportDefinitions() {
//   const { data, error, isLoading } = useSWR<Record<string, ReportDefinition>>(
//     `/api/reports/definitions`,
//     fetcher,
//     swrConfig
//   );

//   return {
//     reportDefinitions: data,
//     isLoading,
//     isError: error,
//   };
// }

export function useReportTypes() {
  const queryParams = new URLSearchParams({
    date: `-365:now`,
    detail: "true",
  });
  const { data, error, isLoading } = useSWR<string[]>(
    `/api/reports/types?${queryParams}`,
    fetcher,
    swrConfig
  );

  return {
    reportTypes: data,
    isLoading,
    isError: error,
  };
}

async function reportFetcher(url: string) {
  const [response, definitionsResponse] = await Promise.all([
    fetch(url),
    fetch("/api/reports/definitions"),
  ]);

  if (response.status === 401) {
    throw { status: 401, message: "Authentication error, check the API key." };
  }
  if (!response.ok) {
    throw { status: 400, message: "Unknown error." };
  }

  const [data, definitions] = await Promise.all([
    response.json() as Promise<Report[]>,
    definitionsResponse.json() as Promise<Record<string, ReportDefinition>>,
  ]);

  // Add the severity from definitions dictionary to each report
  const reports = data.toReversed().map((report) => ({
    ...report,
    severity: definitions[report.type]?.severity ?? "unknown",
    definitionUrl: definitions[report.type]?.url ?? undefined,
    description: definitions[report.type]?.description ?? undefined,
  }));

  return reports;
}

export function useReportList(filters: FilterSettings) {
  const queryParams = new URLSearchParams({
    date: `${filters.dateRange?.from.split("T")[0]}:${
      filters.dateRange?.to.split("T")[0]
    }`,
    ...(filters.reportType &&
      filters.reportType != "all" && { type: filters.reportType }),
    ...(filters.geo && { geo: filters.geo }),
    ...(filters.asn && { asn: filters.asn }),
    ...(filters.ip && { ip: filters.ip }),
  });

  const { data, error, isLoading } = useSWR<Report[]>(
    [`/api/reports/list?${queryParams}`],
    ([url, reportDefinitions]: [string, ReportDefinition]) =>
      reportFetcher(url, reportDefinitions),
    swrConfig
  );

  return {
    reports: data,
    isLoading,
    isError: error,
  };
}
