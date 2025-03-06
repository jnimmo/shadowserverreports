import { type FilterSettings } from "@/app/actions/filters";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { ReportTypes } from "./ReportTypes";
import { useDebouncedCallback } from "use-debounce";
import { SettingsModal } from "./SettingsModal";

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

  const updateQueryString = (filters: FilterSettings) => {
    const params = new URLSearchParams();
    if (filters.reportType && filters.reportType !== "all") {
      params.set("report", filters.reportType);
    }
    if (filters.severity && filters.severity !== "any") {
      params.set("severity", filters.severity);
    }
    return params.toString();
  };

  useEffect(() => {
    const reportType = searchParams.get("report") ?? "all";
    const severity = searchParams.get("severity") ?? "any";

    const newFilters = {
      ...filters,
      reportType,
      severity,
    };

    // Only update if values actually changed
    if (filters.reportType !== reportType || filters.severity !== severity) {
      setFilters(newFilters);
      setLocalFilters(newFilters); // Sync local state
    }

    return () => {
      // Cleanup any pending updates
      debouncedSetFilters.cancel();
    };
  }, [filters, searchParams, setFilters]);

  // Local state for immediate UI updates
  const [localFilters, setLocalFilters] = useState(filters);

  // Debounced callback for updating global state
  const debouncedSetFilters = useDebouncedCallback(
    (newFilters: FilterSettings) => {
      setFilters(newFilters);
    },
    500 // 500ms delay
  );

  // Update local state immediately, debounce global updates
  const handleFilterChange = (updates: Partial<FilterSettings>) => {
    // Reset severity when report type changes
    const resetSeverity = updates.reportType ? { severity: "any" } : {};

    const newFilters = {
      ...localFilters,
      ...updates,
      ...resetSeverity, // Apply severity reset last to ensure it takes precedence
    };
    setLocalFilters(newFilters);
    debouncedSetFilters(newFilters);

    // Update URL with all active filters
    const queryString = updateQueryString(newFilters);
    router.push(`${pathname}${queryString ? `?${queryString}` : ""}`);
  };

  return (
    <div className="flex flex-wrap gap-4 w-full">
      <Select
        value={localFilters.reportType}
        required={false}
        onValueChange={(value) => {
          handleFilterChange({ reportType: value });
        }}
      >
        <SelectTrigger className="w-1/4">
          <SelectValue placeholder="Select report type" />
        </SelectTrigger>
        {isAuthenticated && <ReportTypes />}
      </Select>

      <DatePickerWithRange
        className=""
        filters={localFilters}
        setFilters={handleFilterChange}
      />
      <Select
        value={localFilters.severity}
        required={false}
        onValueChange={(value) => {
          handleFilterChange({ severity: value });
          router.push(
            pathname +
              "?" +
              createQueryString("severity", value == "any" ? "" : value)
          );
        }}
      >
        <SelectTrigger className="w-1/6">
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
      <SettingsModal />
    </div>
  );
}
