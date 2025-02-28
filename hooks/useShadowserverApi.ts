import { useState, useEffect } from "react";
import { getApiKey } from "../app/actions/api-key";
import type { FilterSettings } from "../app/actions/filters";
import { Report } from "@/components/ReportList";
import useSWR from "swr/immutable";
import { Fetcher } from "swr";

async function fetcher(...args: Parameters<typeof fetch>) {
  const response = await fetch(...args);
  if (!response.ok) {
    throw new Error("Failed to fetch report types");
  }
  return response.json();
}

export function useReportTypes() {
  const { data, error, isLoading } = useSWR<string[]>(
    `/api/reports/types`,
    fetcher,
    {
      revalidateIfStale: false,
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    }
  );

  return {
    reportTypes: data,
    isLoading,
    isError: error,
  };
}

export function useReportList(filters: FilterSettings) {
  // If no date range, return default object with empty reports
  if (filters.dateRange && (!filters.dateRange.from || !filters.dateRange.to)) {
    return {
      reports: [],
      isLoading: false,
      isError: null,
    };
  }

  const queryParams = new URLSearchParams({
    date: `${filters.dateRange?.from.split("T")[0]}:${
      filters.dateRange?.to.split("T")[0]
    }`,
    ...(filters.reportType && { type: filters.reportType }),
    ...(filters.geo && { geo: filters.geo }),
    ...(filters.asn && { asn: filters.asn }),
    ...(filters.ip && { ip: filters.ip }),
  });

  const { data, error, isLoading } = useSWR<Report[]>(
    `/api/reports/list?${queryParams}`,
    fetcher,
    {
      //revalidateIfStale: false,
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    }
  );

  return {
    reports: data,
    isLoading,
    isError: error,
  };
}
