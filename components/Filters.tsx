import { type FilterSettings } from "@/app/actions/filters";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect } from "react";
import type { DateRange } from "react-day-picker";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { ReportTypes } from "./ReportTypes";

export function Filters({
  filters,
  setFilters,
  isAuthenticated,
}: {
  filters: FilterSettings;
  setFilters: (filters: FilterSettings) => void;
  isAuthenticated: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const createQueryString = useCallback(
    (name: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(name, value);
      } else {
        params.delete(name);
      }

      return params.toString();
    },
    [searchParams]
  );

  const handleDateRangeChange = (dateRange: DateRange | undefined) => {
    if (dateRange && dateRange?.from && dateRange?.to) {
      setFilters({
        ...filters,
        dateRange: {
          from: dateRange.from?.toISOString() ?? "",
          to: dateRange.to?.toISOString() ?? "",
        },
      });
    }
  };

  useEffect(() => {
    setFilters({
      ...filters,
      reportType: searchParams.get("report") ?? "",
      severity: searchParams.get("severity") ?? "",
    });
  }, [searchParams, setFilters]);

  return (
    <div className="flex items-center space-x-4">
      <Select
        value={filters.reportType}
        required={false}
        onValueChange={(value) => {
          router.push(
            `${pathname}${value === "all" ? "" : `?report=${value}`}`
          );
        }}
      >
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="Select report type" />
        </SelectTrigger>
        {isAuthenticated && <ReportTypes />}
      </Select>

      <DatePickerWithRange
      // date={{
      //   from: new Date(filters.dateRange.from),
      //   to: new Date(filters.dateRange.to),
      // }}
      // setDate={handleDateRangeChange}
      />
      <Select
        value={filters.severity}
        required={false}
        onValueChange={(value) => {
          setFilters({
            ...filters,
            severity: value,
          });
          router.push(
            pathname +
              "?" +
              createQueryString("severity", value == "any" ? "" : value)
          );
        }}
      >
        <SelectTrigger className="w-[120px]">
          <SelectValue placeholder="Severity" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="any">All</SelectItem>
          <SelectItem value="low">Low</SelectItem>
          <SelectItem value="medium">Medium</SelectItem>
          <SelectItem value="high">High</SelectItem>
          <SelectItem value="critical">Critical</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
