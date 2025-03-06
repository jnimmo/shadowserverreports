"use client";

import { useState, useEffect, Suspense } from "react";

import { SettingsModal } from "@/components/SettingsModal";
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

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  useEffect(() => {
    getApiKey().then((key) => {
      setIsAuthenticated(!!key);
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
      <div className="flex flex-col space-y-4 mb-6">
        <div className="flex justify-between items-center">
          <Suspense>
            <Filters
              filters={filters}
              setFilters={setFilters}
              isAuthenticated={isAuthenticated}
            />
          </Suspense>
          <SettingsModal />
        </div>
        {/* <AdditionalFilters
              geo={filters.geo}
              setGeo={(value) =>
                setFilters((prev) => ({ ...prev, geo: value }))
              }
              asn={filters.asn}
              setAsn={(value) =>
                setFilters((prev) => ({ ...prev, asn: value }))
              }
              ip={filters.ip}
              setIp={(value) => setFilters((prev) => ({ ...prev, ip: value }))}
            /> */}
      </div>
      {isAuthenticated ? (
        <ReportList filters={filters} />
      ) : (
        <p>To get started, specify the API key in Settings</p>
      )}
      {errorMessage && (
        <p className="text-red-500 text-sm mt-4">{errorMessage}</p>
      )}
    </SWRConfig>
  );
}
