/* eslint-disable @typescript-eslint/no-explicit-any */

"use client";

import { AgGridReact } from "ag-grid-react";
import { useEffect, useState, useCallback, useMemo, useRef } from "react";
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
import { buildIpQueryUrl } from "@/lib/utils";

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

// Types for row data and DNS resolution state
interface ReportRow {
  hostname?: string;
  ip?: string;
  port?: number;
  tag?: string | string[];
  asn?: string | number;
  [key: string]: any;
}
type DnsStatus = "success" | "warning" | "error" | "pending";
interface DnsResolution {
  status: DnsStatus;
  resolvedIp?: string;
}
type DnsResolutions = Record<string, DnsResolution>;

function ipToNumber(ip: string): number {
  if (!ip) return 0;
  return ip
    .split(".")
    .reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0);
}

const LoadingOverlay = (props: any) => {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="flex items-center gap-2">
        <Spinner />
        <span>{props.loadingMessage}</span>
      </div>
    </div>
  );
};

const NoRowsOverlay = (props: any) => {
  return (
    <div className="flex items-center justify-center h-full text-gray-500">
      <div className="flex flex-col items-center gap-2">
        <Cross1Icon className="h-8 w-8" />
        <span>
          {props.error
            ? `Error: ${props.error}`
            : "No data found for the selected date range"}
        </span>
        {props.error && (
          <Button size="sm" onClick={props.onRetry}>
            Retry
          </Button>
        )}
      </div>
    </div>
  );
};

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
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // Parse initial parameters
  const initialIp = searchParams.get("ip") || undefined;
  const geoSetting =
    typeof window !== "undefined"
      ? localStorage.getItem("default-geo")
      : undefined;
  const initialReportId = searchParams.get("reportId") || undefined;
  const initialType = searchParams.get("type") || undefined;
  const initialTimestamp = searchParams.get("timestamp") || undefined;
  const initialGroup = searchParams.get("group") || undefined;

  // Parse date parameters with fallback support
  const initialDateRange = (() => {
    const dateParam = searchParams.get("date");
    if (dateParam) {
      const [from, to] = dateParam.split(":");
      return { from, to: to || from };
    }
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    if (from && to) {
      return { from, to };
    }
    return null;
  })();

  // Initialize state
  const [ip] = useState(initialIp);
  const [reportId] = useState(initialReportId);
  const [type] = useState(initialType);
  const [dateRange, setDateRange] = useState(initialDateRange);
  const [initialGroupCols] = useState(
    initialGroup ? initialGroup.split(",").filter(Boolean) : []
  );
  const initialFilterSet = useRef(false);

  const [rowData, setRowData] = useState<ReportRow[]>([]);
  const [reportInfo, setReportInfo] = useState<{
    type: string;
    timestamp: string;
  } | null>(null);
  const [gridApi, setGridApi] = useState<GridApi | null>(null);
  const [dnsResolutions, setDnsResolutions] = useState<DnsResolutions>({});
  const [asnNames, setAsnNames] = useState<{ [asn: string]: string }>({});
  const [loading, setLoading] = useState(false);

  // Helper to get a unique row key (assume hostname+ip is unique enough)
  const getRowKey = useCallback(
    (row: ReportRow) => row.originalIndex?.toString(),
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
    return Array.from(
      new Set(
        rowData
          .flatMap((row) => {
            if (Array.isArray(row.tag)) return row.tag;
            if (typeof row.tag === "string") return row.tag.split(";");
            return [];
          })
          .map((tag) => tag.trim())
          .filter(Boolean)
      )
    );
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

  const getTimestampColumn = useCallback(
    (): ColDef => ({
      field: "timestamp",
      headerName: "Timestamp",
      filter: "agDateColumnFilter",
      sort: "desc",
      filterParams: {
        inRangeInclusive: true,
        includeBlanks: false,
        browserDatePicker: true,
        defaultOption: "inRange",
        defaultJoinOperator: "AND",
        defaultValue: initialDateRange
          ? {
              type: "inRange",
              dateFrom: initialDateRange.from,
              dateTo: initialDateRange.to,
            }
          : undefined,
      },
    }),
    [initialDateRange]
  );

  const createColumnDef = useCallback(
    (field: string): ColDef => {
      const colDef: ColDef = {
        field,
        sortable: true,
        filter: true,
        enableRowGroup: true,
      };

      if (
        ["port", "src_port", "dst_port", "naics"].includes(field.toLowerCase())
      ) {
        colDef.type = "numericColumn";
        colDef.filter = "agNumberColumnFilter";
        colDef.comparator = (valueA: any, valueB: any) => {
          const numA = Number(valueA) || 0;
          const numB = Number(valueB) || 0;
          return numA - numB;
        };
      } else if (field.toLowerCase() === "severity") {
        const severityOrder: Record<string, number> = {
          critical: 4,
          high: 3,
          medium: 2,
          low: 1,
          info: 0,
        };
        colDef.comparator = (valueA: string, valueB: string, nodeA, nodeB) => {
          const orderA = severityOrder[(valueA || "").toLowerCase()] ?? 0;
          const orderB = severityOrder[(valueB || "").toLowerCase()] ?? 0;
          if (orderB !== orderA) {
            return orderB - orderA;
          }
          const idxA = nodeA?.data?.originalIndex ?? 0;
          const idxB = nodeB?.data?.originalIndex ?? 0;
          return idxA - idxB;
        };
      } else if (field.toLowerCase() === "tag") {
        colDef.valueGetter = (params: ValueGetterParams) => {
          const data = params.data as ReportRow | undefined;
          if (!data || !data.tag) return [];
          if (Array.isArray(data.tag)) {
            return data.tag.map((tag: string) => tag.trim()).filter(Boolean);
          }
          if (typeof data.tag === "string") {
            return data.tag
              .split(";")
              .map((tag: string) => tag.trim())
              .filter(Boolean);
          }
          return [];
        };
        colDef.filterParams = {
          values: tagsArray,
          valueFormatter: (params: ValueFormatterParams) => params.value,
        };
      } else if (field.toLowerCase() === "hostname") {
        colDef.cellRenderer = hostnameCellRenderer;
      } else if (field.toLowerCase() === "asn") {
        colDef.valueFormatter = (params: ValueFormatterParams) => {
          const asn = params.value;
          if (!asn) return "";
          return asnNames[asn] ? `${asnNames[asn]}` : asn;
        };
      } else if (field.toLowerCase() === "ip") {
        colDef.comparator = (valueA: string, valueB: string, nodeA, nodeB) => {
          const numA = nodeA?.data?.ipNumeric ?? 0;
          const numB = nodeB?.data?.ipNumeric ?? 0;
          return numA - numB;
        };
      }
      return colDef;
    },
    [tagsArray, hostnameCellRenderer, asnNames]
  );

  const getOrderedFields = useCallback((fields: string[]) => {
    const specialFields = ["geo", "region", "city", "naics", "sector"];
    const lowerSpecial = specialFields.map((f) => f.toLowerCase());

    // Get timestamp field if present
    const timestampField = fields.find((f) => f.toLowerCase() === "timestamp");

    // Get normal fields (excluding special fields and timestamp)
    const normalFields = fields.filter(
      (f) =>
        !lowerSpecial.includes(f.toLowerCase()) &&
        f.toLowerCase() !== "timestamp"
    );

    // Get special fields in order
    const orderedSpecialFields = lowerSpecial
      .map((f) => fields.find((orig) => orig.toLowerCase() === f))
      .filter(Boolean) as string[];

    return {
      timestampField,
      normalFields,
      specialFields: orderedSpecialFields,
    };
  }, []);

  const columnDefs = useMemo(() => {
    if (ip) {
      // For IP queries, always start with timestamp column
      const columns = [getTimestampColumn()];

      if (!rowData.length) {
        return columns;
      }

      // Add remaining columns if we have data
      const { normalFields, specialFields } = getOrderedFields(
        Object.keys(rowData[0])
      );
      return [
        ...columns,
        ...normalFields.map(createColumnDef),
        ...specialFields.map(createColumnDef),
      ];
    }

    // For report views
    if (!rowData.length) return [];

    const { timestampField, normalFields, specialFields } = getOrderedFields(
      Object.keys(rowData[0])
    );

    return [
      // Put timestamp first if present
      ...(timestampField ? [createColumnDef(timestampField)] : []),
      ...normalFields.map(createColumnDef),
      ...specialFields.map(createColumnDef),
    ];
  }, [ip, rowData, getTimestampColumn, createColumnDef, getOrderedFields]);

  const handleDateFilterChange = useCallback(() => {
    if (!gridApi || initialFilterSet.current) {
      initialFilterSet.current = false;
      return;
    }
    const filterModel = gridApi.getFilterModel();
    const timestampFilter = filterModel["timestamp"];
    // Remove the ip check since we want filter changes to work even without data
    if (timestampFilter && timestampFilter.type === "inRange") {
      const from = timestampFilter.dateFrom?.split("T")[0];
      const to = timestampFilter.dateTo?.split("T")[0];
      if (
        from &&
        to &&
        /^\d{4}-\d{2}-\d{2}$/.test(from) &&
        /^\d{4}-\d{2}-\d{2}$/.test(to) &&
        !isNaN(Date.parse(from)) &&
        !isNaN(Date.parse(to)) &&
        (dateRange?.from !== from || dateRange?.to !== to)
      ) {
        setLoading(true);
        setDateRange({ from, to });
      }
    }
  }, [gridApi, dateRange]);

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
          {
            name: "Shadowserver IP Query",
            action: () => {
              // If viewing a report, use its timestamp, otherwise use current dateRange
              const queryDateRange = initialTimestamp
                ? { from: initialTimestamp, to: initialTimestamp }
                : dateRange;
              const url = buildIpQueryUrl(params.value, queryDateRange);
              window.open(url, "_blank");
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
    [resolveDns, dateRange, initialTimestamp]
  );

  // In the grouping update handler (onColumnRowGroupChanged), update the URL for shareability
  const updateGroupingsInUrl = (groupCols: string[]) => {
    const url = new URL(window.location.href);
    if (groupCols.length > 0) {
      url.searchParams.set("group", groupCols.join(","));
    } else {
      url.searchParams.delete("group");
    }
    router.replace(url.pathname + url.search, { scroll: false });
  };

  // Fetch and display the report data (only on initial load or when component state changes)
  useEffect(() => {
    if (ip) {
      setLoading(true);
      const url = buildIpQueryUrl(
        ip,
        dateRange,
        geoSetting || undefined,
        "/api/reports/query"
      );
      fetch(url)
        .then((result) => result.json())
        .then((data) => {
          const indexedData = (data || []).map((row: any, idx: number) => ({
            ...row,
            originalIndex: idx,
            ipNumeric: ipToNumber(row.ip),
          }));
          setRowData(indexedData);
          setReportInfo({
            type: `IP Search: ${ip}`,
            timestamp:
              dateRange?.from && dateRange?.to
                ? `${dateRange.from} to ${dateRange.to}`
                : "",
          });
          // Update URL params including date range
          const params = new URLSearchParams();
          params.set("ip", ip);
          if (dateRange?.from && dateRange?.to) {
            params.set("from", dateRange.from);
            params.set("to", dateRange.to);
          }
          if (geoSetting) params.set("geo", geoSetting);
          if (initialGroupCols.length > 0) {
            params.set("group", initialGroupCols.join(","));
          }
          router.replace(pathname + "?" + params.toString(), { scroll: false });
          setLoading(false);
        })
        .catch((error) => {
          console.error("Error loading IP search:", error);
          setLoading(false);
        });
      return;
    }
    if (reportId) {
      setLoading(true);
      fetch(`/api/reports/download?id=${reportId}`)
        .then((result) => result.json())
        .then((data) => {
          const indexedData = (data || []).map((row: any, idx: number) => ({
            ...row,
            originalIndex: idx,
            ipNumeric: ipToNumber(row.ip),
          }));
          setRowData(indexedData);
          setReportInfo({
            type: type || "Unknown Report",
            timestamp: initialTimestamp || "",
          });
          setLoading(false);
        })
        .catch((error) => {
          console.error("Error loading report:", error);
          setLoading(false);
        });
    }
  }, [
    ip,
    reportId,
    type,
    initialTimestamp,
    dateRange,
    initialGroupCols,
    pathname,
    router,
    geoSetting,
  ]);

  // Set document title when reportInfo changes
  useEffect(() => {
    if (reportInfo) {
      document.title = `${reportInfo.type} ${reportInfo.timestamp} - Shadowserver Report`;
    }
  }, [reportInfo]);

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

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <Breadcrumb
          items={[
            { label: "Reports", href: "/" },
            {
              label: ip ? ip : reportInfo?.type || "",
              href: ip ? `/query?ip=${ip}` : `/?report=${reportInfo?.type}`,
            },
            {
              label: reportInfo?.timestamp
                ? `${reportInfo?.timestamp}`
                : `${dateRange?.from} to ${dateRange?.to}`,
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
      <div style={{ width: "100%", height: "calc(100vh - 200px)" }}>
        <AgGridReact
          rowData={rowData}
          columnDefs={columnDefs}
          suppressMaintainUnsortedOrder={false}
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
          loading={loading}
          loadingOverlayComponent={LoadingOverlay}
          loadingOverlayComponentParams={{
            loadingMessage: "Loading data...",
          }}
          noRowsOverlayComponent={NoRowsOverlay}
          noRowsOverlayComponentParams={{
            noRowsMessage: "No data found",
          }}
          onGridReady={(params) => {
            setGridApi(params.api);

            // For IP queries, always set the timestamp filter
            if (ip) {
              // Short delay to ensure grid is ready
              setTimeout(() => {
                if (initialDateRange?.from && initialDateRange?.to) {
                  initialFilterSet.current = true;
                  params.api.setFilterModel({
                    timestamp: {
                      type: "inRange",
                      dateFrom: initialDateRange.from,
                      dateTo: initialDateRange.to,
                    },
                  });
                }
              }, 0);
            }

            // Apply initial grouping if specified
            if (initialGroupCols.length > 0) {
              try {
                const validColumns = initialGroupCols.filter((colId) =>
                  columnDefs.some((colDef) => colDef.field === colId)
                );
                params.api.setRowGroupColumns(validColumns);
              } catch (error) {
                console.error("Error applying groupings:", error);
              }
            }
          }}
          onColumnRowGroupChanged={(params) => {
            const groupCols = params.api
              .getRowGroupColumns()
              .map((col: any) => col.getColId());
            updateGroupingsInUrl(groupCols);
          }}
          getContextMenuItems={getContextMenuItems}
          getRowId={(params) => params.data.originalIndex?.toString()}
          onFilterChanged={handleDateFilterChange}
        />
      </div>
    </div>
  );
};

export default GridComponent;
