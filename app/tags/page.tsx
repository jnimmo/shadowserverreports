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
import {
  useReportTypes,
  useReportList,
  useShadowserverApi,
} from "@/hooks/useShadowserverApi";
import {
  type FilterSettings,
  // setFilterSettings,
  // getFilterSettings,
} from "@/app/actions/filters";
import { ReportTypes } from "@/components/ReportTypes";

export default function ShadowserverReports() {
  // const [reportTypes, setReportTypes] = useState<string[]>([]);
  const [filters, setFilters] = useState<FilterSettings>({
    dateRange: { from: "", to: "" },
  });

  const {
    reports,
    isLoading: reportsLoading,
    isError: reportsError,
  } = useReportList(filters) ?? {};

  // useEffect(() => {
  //   setFilters((prev) => ({
  //     ...prev,
  //     dateRange: {
  //       from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  //       to: new Date().toISOString(),
  //     },
  //   }));

  //   // async function loadReportTypes() {
  //   //   const data = await fetch("/api/reports/types");
  //   //   if (data.ok) {
  //   //     const newReportTypes: string[] = await data.json();
  //   //     if (newReportTypes) {
  //   //       setReportTypes(newReportTypes);
  //   //     }
  //   //   }
  //   // }

  //   // loadReportTypes();
  //   // async function loadFilters() {
  //   //   const savedFilters = await getFilterSettings();
  //   //   if (savedFilters) {
  //   //     setFilters(savedFilters);
  //   //   }
  //   // }
  //   // loadFilters();
  // }, []);

  // // useEffect(() => {
  // //   setFilterSettings(filters);
  // // }, [filters]);

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
                  <ReportTypes />
                </Select>
                {filters.dateRange.to && filters.dateRange.from && (
                  <DatePickerWithRange
                    date={{
                      from: new Date(filters.dateRange.from),
                      to: new Date(filters.dateRange.to),
                    }}
                    setDate={handleDateRangeChange}
                  />
                )}
              </div>
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
          {reportsError && (
            <div className="text-red-500 mb-4">{reportsError}</div>
          )}
          {reportsLoading ? (
            <div>Loading...</div>
          ) : (
            !reportsError && <ReportList reports={reports} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
