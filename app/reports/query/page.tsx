"use client";

import { useState, useEffect } from "react";
// import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { DateRange } from "react-day-picker";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import { SettingsModal } from "@/components/SettingsModal";
import { ReportList } from "@/components/ReportList";
// import { AdditionalFilters } from "../components/AdditionalFilters";
import { useReportList } from "@/hooks/useShadowserverApi";
import {
  type FilterSettings,
  setFilterSettings,
  getFilterSettings,
} from "@/app/actions/filters";
import { ReportTypes } from "@/components/ReportTypes";
import { getApiKey } from "@/app/actions/api-key";
import { SWRConfig } from "swr";
import { AdditionalFilters } from "@/components/AdditionalFilters";
import { ReportDetail } from "@/components/ReportDetail";

export default function ShadowserverReports() {
  // const [reportTypes, setReportTypes] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterSettings>({
    dateRange: {
      from: "",
      to: "",
    },
  });

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  useEffect(() => {
    getApiKey().then((key) => {
      setIsAuthenticated(!!key);
    });
  }, []);

  useEffect(() => {
    setFilters({
      dateRange: {
        from: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
          .toISOString()
          .replace("Z", ""),
        to: new Date().toISOString().replace("Z", ""),
      },
      asn: "",
      geo: "",
      ip: "",
    });
  }, []);

  const handleDateRangeChange = (dateRange: DateRange | undefined) => {
    if (dateRange && dateRange?.from && dateRange?.to) {
      setFilters((prev) => ({
        ...prev,
        dateRange: {
          from: dateRange.from?.toISOString() ?? "",
          to: dateRange.to?.toISOString() ?? "",
        },
      }));
    }
  };

  return (
    <SWRConfig
      value={{
        onError: (error, key) => {
          if (error.status === 401) {
            setErrorMessage("Invalid API key");
            setIsAuthenticated(false);
          }
        },
      }}
    >
      <div className="container mx-auto py-10">
        <Card>
          <CardHeader>
            <CardTitle>Shadowserver Reports</CardTitle>
            <CardDescription>
              Unofficial web client to query and display reports from the
              Shadowserver API. See{" "}
              <a
                href={`https://github.com/jnimmo/shadowserverreports/tree/main/`}
                target="_blank"
                className="underline hover:no-underline"
              >
                Github
              </a>{" "}
              for more information.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col space-y-4 mb-6">
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-4">
                  <Select
                    value={filters.reportType}
                    required={false}
                    onValueChange={(value) =>
                      setFilters((prev) => ({ ...prev, reportType: value }))
                    }
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Select report type" />
                    </SelectTrigger>
                    {isAuthenticated && <ReportTypes />}
                  </Select>

                  <DatePickerWithRange
                    date={{
                      from: new Date(filters.dateRange.from),
                      to: new Date(filters.dateRange.to),
                    }}
                    setDate={handleDateRangeChange}
                  />
                </div>
                <SettingsModal />
              </div>
              <AdditionalFilters
                geo={filters.geo}
                setGeo={(value) =>
                  setFilters((prev) => ({ ...prev, geo: value }))
                }
                asn={filters.asn}
                setAsn={(value) =>
                  setFilters((prev) => ({ ...prev, asn: value }))
                }
                ip={filters.ip}
                setIp={(value) =>
                  setFilters((prev) => ({ ...prev, ip: value }))
                }
              />
            </div>
            {isAuthenticated ? (
              <ReportDetail filters={filters} />
            ) : (
              <p>To get started, specify the API key in Settings</p>
            )}
            {errorMessage && (
              <p className="text-red-500 text-sm mt-4">{errorMessage}</p>
            )}
          </CardContent>
        </Card>
      </div>
    </SWRConfig>
  );
}
