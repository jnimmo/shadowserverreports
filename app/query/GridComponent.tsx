/* eslint-disable @typescript-eslint/no-explicit-any */

"use client";

import { AgGridReact } from "ag-grid-react";
import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import type {
  ColDef,
  RowSelectionOptions,
  ICellRendererParams,
  ValueFormatterParams,
  GetContextMenuItemsParams,
  ValueGetterParams,
  MenuItemDef,
  DefaultMenuItem,
} from "ag-grid-community";
import { AllEnterpriseModule, ModuleRegistry } from "ag-grid-enterprise";
import "ag-grid-enterprise";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Spinner } from "@/components/ui/spinner";
import { Cross1Icon } from "@radix-ui/react-icons";
import type { GridApi } from "ag-grid-community";

ModuleRegistry.registerModules([AllEnterpriseModule]);

// Success, Warning, Error icons (Radix UI or inline SVG)
const SuccessIcon = () => (
  <svg width="16" height="16" fill="none" viewBox="0 0 16 16">
    <circle cx="8" cy="8" r="8" fill="#22c55e" />
    <path
      d="M5 8.5l2 2 4-4"
      stroke="#fff"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
const WarningIcon = () => (
  <svg width="16" height="16" fill="none" viewBox="0 0 16 16">
    <circle cx="8" cy="8" r="8" fill="#f59e42" />
    <path d="M8 5v3.5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" />
    <circle cx="8" cy="11" r="1" fill="#fff" />
  </svg>
);
const ErrorIcon = () => (
  <svg width="16" height="16" fill="none" viewBox="0 0 16 16">
    <circle cx="8" cy="8" r="8" fill="#ef4444" />
    <path
      d="M5.5 5.5l5 5m0-5l-5 5"
      stroke="#fff"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </svg>
);

// Helper to reorder fields so special fields are last
function reorderFieldsWithSpecialLast(
  fields: string[],
  specialFields: string[]
): string[] {
  const lowerSpecial = specialFields.map((f) => f.toLowerCase());
  const normalFields = fields.filter(
    (f) => !lowerSpecial.includes(f.toLowerCase())
  );
  const specialOrdered = lowerSpecial
    .map((f) => fields.find((orig) => orig.toLowerCase() === f))
    .filter(Boolean) as string[];
  return [...normalFields, ...specialOrdered];
}

// Types for row data and DNS resolution state
interface ReportRow {
  hostname?: string;
  ip?: string;
  port?: number;
  tag?: string;
  asn?: string | number;
  [key: string]: any;
}
type DnsStatus = "success" | "warning" | "error" | "pending";
interface DnsResolution {
  status: DnsStatus;
  resolvedIp?: string;
}
type DnsResolutions = Record<string, DnsResolution>;

const GridComponent = () => {
  const rowSelection = useMemo<
    RowSelectionOptions | "single" | "multiple"
  >(() => {
    return {
      mode: "multiRow",
      headerCheckbox: false,
      copySelectedRows: true,
    };
  }, []);
  const statusBar = useMemo(() => {
    return {
      statusPanels: [
        { statusPanel: "agTotalAndFilteredRowCountComponent" },
        { statusPanel: "agTotalRowCountComponent" },
        { statusPanel: "agFilteredRowCountComponent" },
        { statusPanel: "agSelectedRowCountComponent" },
        { statusPanel: "agAggregationComponent" },
      ],
    };
  }, []);
  const [rowData, setRowData] = useState<ReportRow[]>([]);
  const [reportInfo, setReportInfo] = useState<{
    type: string;
    timestamp: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const reportId = searchParams.get("reportId");
  const [gridApi, setGridApi] = useState<GridApi | null>(null);
  const [dnsResolutions, setDnsResolutions] = useState<DnsResolutions>({});
  const initialGroupingApplied = useRef(false);
  const [asnNames, setAsnNames] = useState<{ [asn: string]: string }>({});

  // Helper to get a unique row key (assume hostname+ip is unique enough)
  const getRowKey = useCallback(
    (row: ReportRow) => `${row.hostname || ""}|${row.ip || ""}`,
    []
  );

  const DNS_CACHE_TTL = 60 * 60 * 1000; // 1 hour in ms

  const resolveDns = useCallback(
    async (row: ReportRow) => {
      const rowKey = getRowKey(row);
      setDnsResolutions((prev) => ({
        ...prev,
        [rowKey]: { status: "pending" },
      }));
      const cacheKey = `dnsCache:${row.hostname}`;
      try {
        // Check localStorage cache
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (
            parsed.timestamp &&
            Date.now() - parsed.timestamp < DNS_CACHE_TTL
          ) {
            // Use cached result
            setDnsResolutions((prev) => ({
              ...prev,
              [rowKey]: {
                status: parsed.status,
                resolvedIp: parsed.resolvedIp,
              },
            }));
            return;
          } else {
            // Remove expired cache
            localStorage.removeItem(cacheKey);
          }
        }
        // Not cached or expired, fetch from API
        const res = await fetch("/api/resolve-dns", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ hostname: row.hostname }),
        });
        const data = await res.json();
        if (data.ip) {
          // Compare with IP column
          const status: DnsStatus = data.ip === row.ip ? "success" : "warning";
          setDnsResolutions((prev) => ({
            ...prev,
            [rowKey]: { status, resolvedIp: data.ip },
          }));
          // Cache result
          localStorage.setItem(
            cacheKey,
            JSON.stringify({
              status,
              resolvedIp: data.ip,
              timestamp: Date.now(),
            })
          );
        } else {
          setDnsResolutions((prev) => ({
            ...prev,
            [rowKey]: { status: "error" },
          }));
          // Cache error result
          localStorage.setItem(
            cacheKey,
            JSON.stringify({ status: "error", timestamp: Date.now() })
          );
        }
      } catch (e) {
        console.log(e);
        setDnsResolutions((prev) => ({
          ...prev,
          [rowKey]: { status: "error" },
        }));
        // Cache error result
        localStorage.setItem(
          cacheKey,
          JSON.stringify({ status: "error", timestamp: Date.now() })
        );
      }
    },
    [getRowKey, DNS_CACHE_TTL]
  );

  // Extract tags array from rowData
  const tagsArray = useMemo(() => {
    const tagSet = new Set<string>();
    rowData.forEach((row) => {
      if (row.tag) {
        row.tag.split(";").forEach((tag: string) => {
          const trimmed = tag.trim();
          if (trimmed) tagSet.add(trimmed);
        });
      }
    });
    return Array.from(tagSet);
  }, [rowData]);

  // Memoize hostnameCellRenderer
  const hostnameCellRenderer = useCallback(
    (params: ICellRendererParams) => {
      const rowKey = getRowKey(params.data as ReportRow);
      const dns = dnsResolutions[rowKey];
      return (
        <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
          {params.value}
          {dns?.status === "pending" && <Spinner size="small" />}
          {dns?.status === "success" && <SuccessIcon />}
          {dns?.status === "warning" && (
            <>
              <WarningIcon />
              <span style={{ fontSize: "0.8em", color: "#f59e42" }}>
                {dns.resolvedIp}
              </span>
            </>
          )}
          {dns?.status === "error" && <ErrorIcon />}
        </span>
      );
    },
    [dnsResolutions, getRowKey]
  );

  // Memoize columnDefs based on rowData, tagsArray, and hostnameCellRenderer
  const columnDefs = useMemo(() => {
    if (!rowData.length) return [];
    const specialFields = ["geo", "region", "city", "naics", "sector"];
    const allFields = Object.keys(rowData[0]);
    const orderedFields = reorderFieldsWithSpecialLast(
      allFields,
      specialFields
    );
    return orderedFields.map((field) => {
      const colDef: ColDef = {
        field,
        sortable: true,
        filter: true,
        enableRowGroup: true,
      };
      if (["timestamp", "http_date"].includes(field.toLowerCase())) {
        colDef.filter = "agDateColumnFilter";
        colDef.sort = "desc";
      } else if (
        ["port", "src_port", "dst_port", "naics", "asn"].includes(
          field.toLowerCase()
        )
      ) {
        colDef.type = "numericColumn";
        colDef.filter = "agNumberColumnFilter";
      } else if (field.toLowerCase() === "tag") {
        colDef.valueGetter = (params: ValueGetterParams) => {
          const data = params.data as ReportRow | undefined;
          if (!data || !data.tag) return [];
          return data.tag
            .split(";")
            .map((tag: string) => tag.trim())
            .filter((tag: string) => tag);
        };
        colDef.filterParams = {
          values: tagsArray,
          valueFormatter: (params: ValueFormatterParams) => params.value,
        };
      }
      if (field.toLowerCase() === "hostname") {
        colDef.cellRenderer = hostnameCellRenderer;
      }
      if (field.toLowerCase() === "asn") {
        colDef.valueFormatter = (params: ValueFormatterParams) => {
          const asn = params.value;
          if (!asn) return "";
          return asnNames[asn] ? `${asnNames[asn]}` : asn;
        };
      }
      return colDef;
    });
  }, [rowData, tagsArray, hostnameCellRenderer, asnNames]);

  // When dnsResolutions changes, refresh the grid cells
  useEffect(() => {
    if (gridApi) {
      gridApi.refreshCells({ columns: ["hostname"] });
    }
  }, [dnsResolutions, gridApi]);

  // Fetch and display the report data
  useEffect(() => {
    if (reportId) {
      setIsLoading(true);
      fetch(`/api/reports/download?id=${reportId}`)
        .then((result) => result.json())
        .then((data) => {
          setRowData(data || []);
          // Get report info from the URL parameters
          const type = searchParams.get("type") || "Unknown Report";
          const timestamp = searchParams.get("timestamp") || "";
          setReportInfo({ type, timestamp });
        })
        .catch((error) => console.error("Error loading report:", error))
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, []);

  // Set document title when reportInfo changes
  useEffect(() => {
    if (reportInfo) {
      document.title = `Shadowserver Report - ${reportInfo.type} / ${reportInfo.timestamp}`;
    }
  }, [reportInfo]);

  // Reset the flag when the report changes
  useEffect(() => {
    initialGroupingApplied.current = false;
  }, [reportId]);

  // Apply grouping from URL only once per report
  useEffect(() => {
    if (gridApi && columnDefs.length > 0 && !initialGroupingApplied.current) {
      const groupCols = searchParams.get("group");
      if (groupCols) {
        try {
          const columns = groupCols.split(",").filter(Boolean);
          const validColumns = columns.filter((colId) =>
            columnDefs.some((colDef) => colDef.field === colId)
          );
          gridApi.setRowGroupColumns(validColumns);
        } catch (error) {
          console.error("Error applying groupings:", error);
        }
      }
      initialGroupingApplied.current = true;
    }
  }, [gridApi, columnDefs, reportId, searchParams]);

  // On user grouping, update the URL (already handled in your onColumnRowGroupChanged)
  // No further code needed here

  // Pre-populate dnsResolutions from localStorage on rowData change
  useEffect(() => {
    if (rowData && rowData.length > 0) {
      const newDnsResolutions: DnsResolutions = {};
      rowData.forEach((row) => {
        const rowKey = getRowKey(row);
        const cacheKey = `dnsCache:${row.hostname}`;
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            if (
              parsed.timestamp &&
              Date.now() - parsed.timestamp < DNS_CACHE_TTL
            ) {
              newDnsResolutions[rowKey] = {
                status: parsed.status,
                resolvedIp: parsed.resolvedIp,
              };
            }
          } catch {}
        }
      });
      if (Object.keys(newDnsResolutions).length > 0) {
        setDnsResolutions((prev) => ({ ...prev, ...newDnsResolutions }));
      }
    }
  }, [rowData, getRowKey, DNS_CACHE_TTL]);

  // On data load, fetch ASN names using cache
  useEffect(() => {
    if (rowData.length === 0) return;

    const uniqueAsns = Array.from(
      new Set(rowData.map((row) => String(row.asn)).filter(Boolean))
    );

    const newNamesFromCache: { [key: string]: string } = {};
    const asnsToFetchFromApi: string[] = [];

    for (const asn of uniqueAsns) {
      if (asnNames[asn] !== undefined) {
        continue;
      }
      const cachedName = localStorage.getItem(`asnName:${asn}`);
      if (cachedName !== null) {
        newNamesFromCache[asn] = cachedName;
      } else {
        asnsToFetchFromApi.push(asn);
      }
    }

    if (Object.keys(newNamesFromCache).length > 0) {
      setAsnNames((prev) => ({ ...prev, ...newNamesFromCache }));
    }

    if (asnsToFetchFromApi.length > 0) {
      Promise.all(
        asnsToFetchFromApi.map((asn) =>
          fetch(`/api/asn-info?asn=${asn}`)
            .then((res) => res.json())
            .then((data) => {
              const name = data?.name || "";
              localStorage.setItem(`asnName:${asn}`, name);
              return [asn, name] as [string, string];
            })
            .catch(() => [asn, ""] as [string, string])
        )
      ).then((results) => {
        setAsnNames((prev) => ({
          ...prev,
          ...Object.fromEntries(results),
        }));
      });
    }
  }, [rowData, asnNames]);

  const handleClose = () => {
    router.push("/");
  };

  const getContextMenuItems = useCallback(
    (params: GetContextMenuItemsParams): (MenuItemDef | DefaultMenuItem)[] => {
      const { node } = params;
      const rowData = node?.data as ReportRow;
      // Hostname column context menu
      if (
        params.column &&
        params.column.getColId().toLowerCase() === "hostname"
      ) {
        return [
          "copy",
          {
            name: "Copy as curl",
            action: () => {
              const port = rowData?.port;
              const tags = rowData?.tag;
              const scheme =
                tags && tags.includes("ssl") ? "https://" : "http://";
              const textToCopy = port
                ? `curl --include --insecure ${scheme}${params.value}:${port}`
                : `curl --include --insecure ${scheme}${params.value}`;
              navigator.clipboard.writeText(textToCopy);
            },
          },
          {
            name: "Copy endpoint",
            action: () => {
              const ip = params.value;
              const port = rowData?.port;
              const textToCopy = port ? `${ip}:${port}` : ip;
              navigator.clipboard.writeText(textToCopy);
            },
          },
          "separator",
          {
            name: "Resolve DNS hostname",
            action: () => rowData && resolveDns(rowData),
          },
          {
            name: "Search domain in Shodan",
            action: () => {
              window.open(
                `https://www.shodan.io/domain/${params.value}`,
                "_blank"
              );
            },
          },
        ];
      } else if (
        params.column &&
        params.column.getColId().toLowerCase().includes("ip")
      ) {
        return [
          "copy",
          {
            name: "Copy as curl",
            action: () => {
              const ip = params.value;
              const host =
                ip && typeof ip === "string" && ip.includes(":")
                  ? `[${ip}]`
                  : ip;
              const port = rowData?.port;
              const tags = rowData?.tag;
              const scheme =
                tags && tags.includes("ssl") ? "https://" : "http://";
              const textToCopy = port
                ? `curl --include --insecure ${scheme}${host}:${port}`
                : `curl --include --insecure ${scheme}${host}`;
              navigator.clipboard.writeText(textToCopy);
            },
          },
          {
            name: "Copy endpoint",
            action: () => {
              const ip = params.value;
              const port = rowData?.port;
              const textToCopy = port ? `${ip}:${port}` : ip;
              navigator.clipboard.writeText(textToCopy);
            },
          },
          "separator",
          {
            name: "Search IP in Shodan",
            action: () => {
              window.open(
                `https://www.shodan.io/host/${params.value}`,
                "_blank"
              );
            },
          },
          {
            name: "Search IP in Censys",
            action: () => {
              window.open(
                `https://search.censys.io/hosts/${params.value}`,
                "_blank"
              );
            },
          },
          {
            name: `Search IP in Security Trails`,
            action: () => {
              window.open(
                `https://securitytrails.com/list/ip/${params.value}`,
                "_blank"
              );
            },
          },
        ];
      }
      // Return empty array for other columns to use default menu
      return ["copy", "separator", "export"];
    },
    [resolveDns]
  );

  // Update URL when groupings change
  const updateGroupingsInUrl = (groupCols: string[]) => {
    const url = new URL(window.location.href);
    if (groupCols.length > 0) {
      url.searchParams.set("group", groupCols.join(","));
    } else {
      url.searchParams.delete("group");
    }
    router.replace(pathname + url.search, { scroll: false });
  };

  return (
    <div className="flex flex-col gap-4">
      {reportId && reportInfo && (
        <div className="flex justify-between items-center">
          <Breadcrumb
            items={[
              { label: "Reports", href: "/" },
              { label: reportInfo.type, href: `/?report=${reportInfo.type}` },
              {
                label: `${reportInfo.timestamp}`,
              },
            ]}
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
            className="gap-2"
          >
            <Cross1Icon className="h-4 w-4" />
            Close
          </Button>
        </div>
      )}
      <div style={{ width: "100%", height: "calc(100vh - 200px)" }}>
        {isLoading ? (
          <div className="flex justify-center items-center h-full">
            <Spinner />
          </div>
        ) : (
          <AgGridReact
            rowData={rowData}
            columnDefs={columnDefs}
            autoSizeStrategy={{
              type: "fitCellContents",
            }}
            rowGroupPanelShow="always"
            sideBar={false}
            groupDisplayType="groupRows"
            suppressAggFuncInHeader={true}
            animateRows={true}
            rowSelection={rowSelection}
            statusBar={statusBar}
            onGridReady={(params) => {
              setGridApi(params.api);
            }}
            onColumnRowGroupChanged={(params) => {
              const groupCols = params.api
                .getRowGroupColumns()
                .map((col: any) => col.getColId());
              updateGroupingsInUrl(groupCols);
            }}
            getContextMenuItems={getContextMenuItems}
          />
        )}
      </div>
    </div>
  );
};

export default GridComponent;
