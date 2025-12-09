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
import { Input } from "./ui/input";
import { useRef } from "react";
import { MagnifyingGlassIcon } from "@radix-ui/react-icons";
import { buildIpQueryUrl } from "@/lib/utils";

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

  // Local state for immediate UI updates with default values
  const [localFilters, setLocalFilters] = useState({
    ...filters,
    reportType: filters.reportType || "all",
    severity: filters.severity || "any",
  });
  const [ipSearch, setIpSearch] = useState("");
  const ipInputRef = useRef<HTMLInputElement>(null);

  // Debounced callback for updating global state
  const debouncedSetFilters = useDebouncedCallback(
    (newFilters: FilterSettings) => {
      setFilters(newFilters);
    },
    500 // 500ms delay
  );

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
  }, [filters, searchParams, setFilters, debouncedSetFilters]);

  // Update local state immediately, debounce global updates
  const handleFilterChange = (
    updates: Partial<FilterSettings>,
    options?: { immediate?: boolean }
  ) => {
    // Reset severity when report type changes
    const resetSeverity = updates.reportType ? { severity: "any" } : {};

    const newFilters = {
      ...localFilters,
      ...updates,
      ...resetSeverity, // Apply severity reset last to ensure it takes precedence
    };
    setLocalFilters(newFilters);
    if (options?.immediate) {
      debouncedSetFilters.cancel();
      setFilters(newFilters);
    } else {
      debouncedSetFilters(newFilters);
    }

    // Update URL with all active filters
    const queryString = updateQueryString(newFilters);
    router.push(`${pathname}${queryString ? `?${queryString}` : ""}`);
  };

  // Handler for IP search
  const handleIpSearch = () => {
    if (!ipSearch.trim()) return;
    // Use date range and geo from filters
    const from = localFilters.dateRange?.from;
    const to = localFilters.dateRange?.to;
    const geo = localFilters.geo;
    const url = buildIpQueryUrl(ipSearch, { from, to }, geo);
    router.push(url);
  };

  return (
    <div className="flex flex-wrap gap-4 w-full">
      {/* Main filters */}
      <Select
        value={localFilters.reportType || "all"}
        required={false}
        onValueChange={(value) => {
          handleFilterChange({ reportType: value });
        }}
      >
        <SelectTrigger className="w-1/5">
          <SelectValue placeholder="Select report type" />
        </SelectTrigger>
        {isAuthenticated && <ReportTypes />}
      </Select>

      <DatePickerWithRange
        filters={localFilters}
        setFilters={(updates) =>
          handleFilterChange(updates, { immediate: true })
        }
      />
      <Select
        value={localFilters.severity || "any"}
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
        <SelectTrigger className="w-1/8">
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
      <div className="flex items-center gap-2">
        <div className="relative">
          <MagnifyingGlassIcon
            className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500"
            onClick={handleIpSearch}
          />
          <Input
            id="ip-search"
            ref={ipInputRef}
            type="text"
            placeholder="IP search"
            aria-label="IP search e.g. 1.2.3.0/24"
            value={ipSearch}
            onChange={(e) => setIpSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleIpSearch();
            }}
            className="w-40 pl-8"
          />
        </div>
      </div>
      <SettingsModal />
      {/* IP Search - visually separated */}
    </div>
  );
}
