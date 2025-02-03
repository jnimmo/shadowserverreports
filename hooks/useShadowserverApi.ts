import { useState, useEffect } from "react";
import { getApiKey } from "../app/actions/api-key";
import type { FilterSettings } from "../app/actions/filters";
import { Report } from "@/components/ReportList";

export function useShadowserverApi(filters: FilterSettings) {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchReports() {
      setLoading(true);
      setError(null);
      try {
        const apiKey = await getApiKey();
        if (!apiKey) {
          throw new Error("API key not set");
        }

        const dateFilter = `${filters.dateRange.from.split("T")[0]}:${
          filters.dateRange.to.split("T")[0]
        }`;

        const queryParams = new URLSearchParams();
        if (filters.reportType) queryParams.append("type", filters.reportType);
        queryParams.append("date", dateFilter);
        if (filters.geo) queryParams.append("geo", filters.geo);
        if (filters.asn) queryParams.append("asn", filters.asn);
        if (filters.ip) queryParams.append("ip", filters.ip);

        const response = await fetch(`/api/reports/list?${queryParams}`);
        if (!response.ok) {
          throw new Error("Failed to fetch reports");
        }

        const data = await response.json();
        if (data.error) {
          throw new Error(data.error);
        }
        setReports(data);
      } catch (err) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError(String(err));
        }
      } finally {
        setLoading(false);
      }
    }
    if (filters.dateRange.from && filters.dateRange.to) {
      fetchReports();
    }
  }, [filters]);

  return { reports, loading, error };
}
