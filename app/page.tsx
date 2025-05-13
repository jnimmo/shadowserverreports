"use client";

import { useState, useEffect, Suspense } from "react";
import { ReportList } from "@/components/ReportList";
import { type FilterSettings } from "@/app/actions/filters";
import { getApiKey } from "@/app/actions/api-key";
import { SWRConfig } from "swr";
import { Filters } from "@/components/Filters";

export default function ShadowserverReports() {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterSettings>({
    dateRange: {
      from: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
        .toISOString()
        .replace("Z", ""),
      to: new Date().toISOString().replace("Z", ""),
    },
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  useEffect(() => {
    getApiKey().then((key) => {
      setIsAuthenticated(!!key);
      setIsLoading(false);
    });
    setFilters({
      dateRange: {
        from: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
          .toISOString()
          .replace("Z", ""),
        to: new Date().toISOString().replace("Z", ""),
      },
    });
  }, []);

  return (
    <SWRConfig
      value={{
        onError: (error) => {
          if (error.status === 401) {
            setErrorMessage("Invalid API key");
            setIsAuthenticated(false);
          }
        },
      }}
    >
      {" "}
      <Suspense>
        <div className="flex flex-col space-y-4 mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <Filters
              filters={filters}
              setFilters={setFilters}
              isAuthenticated={isAuthenticated}
            />
          </div>
        </div>
        {isAuthenticated && !isLoading ? (
          <ReportList filters={filters} />
        ) : (
          <p>To get started, specify the API key in Settings</p>
        )}
        {errorMessage && (
          <p className="text-red-500 text-sm mt-4">{errorMessage}</p>
        )}
      </Suspense>
    </SWRConfig>
  );
}
