import { useState, useEffect } from "react";
import { getApiKey } from "../app/actions/api-key";
import type { FilterSettings } from "../app/actions/filters";

interface Report {
  id: string;
  type: string;
  date: string;
  url: string;
  geo: string;
  asn: string;
  ip: string;
}

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

        const queryParams = new URLSearchParams({
          type: filters.reportType,
          start: filters.dateRange.from,
          end: filters.dateRange.to,
          ...(filters.geo && { geo: filters.geo }),
          ...(filters.asn && { asn: filters.asn }),
          ...(filters.ip && { ip: filters.ip }),
        });

        const response = await fetch(
          `https://api.shadowserver.org/reports?${queryParams}`,
          {
            headers: {
              Authorization: `Bearer ${apiKey}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error("Failed to fetch reports");
        }

        const data = await response.json();
        setReports(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchReports();
  }, [filters]);

  return { reports, loading, error };
}
