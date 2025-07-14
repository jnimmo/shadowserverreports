/* eslint-disable @typescript-eslint/no-explicit-any */
// components/GridComponent.tsx
"use client";

import { AgGridReact } from "ag-grid-react";
import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import type { ColDef, RowSelectionOptions } from "ag-grid-community";
import { AllEnterpriseModule, ModuleRegistry } from "ag-grid-enterprise";
import "ag-grid-enterprise";
import { useRouter, useSearchParams } from "next/navigation";
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
  const [rowData, setRowData] = useState<object[]>([]);
  const [columnDefs, setColumnDefs] = useState<ColDef[]>([]);
  const [reportInfo, setReportInfo] = useState<{
    type: string;
    timestamp: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();
  const reportId = searchParams.get("reportId");
  const [gridApi, setGridApi] = useState<GridApi | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [dnsResolutions, setDnsResolutions] = useState<{
    [rowKey: string]: {
      status: "success" | "warning" | "error" | "pending";
      resolvedIp?: string;
    };
  }>({});
  const resolvingRowRef = useRef<string | null>(null);

  // Helper to get a unique row key (assume hostname+ip is unique enough)
  const getRowKey = (row: any) => `${row.hostname || ""}|${row.ip || ""}`;

  const DNS_CACHE_TTL = 60 * 60 * 1000; // 1 hour in ms

  const resolveDns = useCallback(async (row: any) => {
    const rowKey = getRowKey(row);
    setDnsResolutions((prev) => ({
      ...prev,
      [rowKey]: { status: "pending" },
    }));
    resolvingRowRef.current = rowKey;
    const cacheKey = `dnsCache:${row.hostname}`;
    try {
      // Check localStorage cache
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.timestamp && Date.now() - parsed.timestamp < DNS_CACHE_TTL) {
          // Use cached result
          setDnsResolutions((prev) => ({
            ...prev,
            [rowKey]: { status: parsed.status, resolvedIp: parsed.resolvedIp },
          }));
          resolvingRowRef.current = null;
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
        const status = data.ip === row.ip ? "success" : "warning";
        setDnsResolutions((prev) => ({
          ...prev,
          [rowKey]: { status, resolvedIp: data.ip },
        }));
        // Cache result
        localStorage.setItem(
          cacheKey,
          JSON.stringify({ status, resolvedIp: data.ip, timestamp: Date.now() })
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
      setDnsResolutions((prev) => ({
        ...prev,
        [rowKey]: { status: "error" },
      }));
      // Cache error result
      localStorage.setItem(
        cacheKey,
        JSON.stringify({ status: "error", timestamp: Date.now() })
      );
    } finally {
      resolvingRowRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (reportId) {
      setIsLoading(true);
      // Fetch and display the report data
      fetch(`/api/reports/download?id=${reportId}`)
        .then((result) => result.json())
        .then((data) => {
          if (data && data.length > 0) {
            // Compute unique tags once
            const tagSet = new Set<string>();
            data.forEach((row: any) => {
              if (row.tag) {
                row.tag.split(";").forEach((tag: string) => {
                  const trimmed = tag.trim();
                  if (trimmed) tagSet.add(trimmed);
                });
              }
            });
            const tagsArray = Array.from(tagSet);
            // Dynamically create column definitions from the first row
            const specialFields = ["geo", "region", "city", "naics", "sector"];
            const allFields = Object.keys(data[0]);
            const orderedFields = reorderFieldsWithSpecialLast(
              allFields,
              specialFields
            );
            const cols = orderedFields.map((field) => {
              const colDef: ColDef = {
                field,
                sortable: true,
                filter: true,
                enableRowGroup: true, // allow grouping by any column
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
              } else if (field.toLocaleLowerCase() === "tag") {
                colDef.filter = "agSetColumnFilter";
                colDef.valueGetter = (params: any) => {
                  if (!params.data || !params.data.tag) return [];
                  return params.data.tag
                    .split(";")
                    .map((tag: string) => tag.trim())
                    .filter((tag: string) => tag);
                };
                colDef.filterParams = {
                  values: tagsArray,
                  valueFormatter: (params: any) => params.value,
                };
              }
              return colDef;
            });
            setColumnDefs(cols);
            setRowData(data);

            // Get report info from the URL parameters
            const type = searchParams.get("type") || "Unknown Report";
            const timestamp = searchParams.get("timestamp") || "";
            setReportInfo({ type, timestamp });
          }
        })
        .catch((error) => console.error("Error loading report:", error))
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [reportId]); // Removed searchParams dependency to prevent refetching on grouping changes

  // Separate useEffect for handling URL parameters that don't require data refetching
  useEffect(() => {
    if (reportInfo) {
      document.title = `Shadowserver Report - ${reportInfo.type} / ${reportInfo.timestamp}`;
    }
  }, [reportInfo]);

  // Apply initial groupings from URL
  useEffect(() => {
    if (gridApi && columnDefs.length > 0 && !isInitialized) {
      const groupCols = searchParams.get("group");
      if (groupCols) {
        try {
          const columns = groupCols.split(",").filter(Boolean);
          // Verify columns exist before applying groupings
          const validColumns = columns.filter((colId) =>
            columnDefs.some((colDef) => colDef.field === colId)
          );
          if (validColumns.length > 0) {
            gridApi.setRowGroupColumns(validColumns);
          }
        } catch (error) {
          console.error("Error applying initial groupings:", error);
        }
      }
      setIsInitialized(true);
    }
  }, [gridApi, columnDefs, searchParams, isInitialized]);

  // Update URL when groupings change
  const updateGroupingsInUrl = (groupCols: string[]) => {
    if (!isInitialized) return; // Don't update URL during initial load

    const url = new URL(window.location.href);
    if (groupCols.length > 0) {
      url.searchParams.set("group", groupCols.join(","));
    } else {
      url.searchParams.delete("group");
    }
    router.replace(url.pathname + url.search, { scroll: false });
  };

  useEffect(() => {
    // if (gridApi && rowData.length > 0) {
    //   setTimeout(() => {
    //     gridApi.sizeColumnsToFit();
    //   }, 100);
    // }
  }, [gridApi, rowData]);

  // Pre-populate dnsResolutions from localStorage on rowData change
  useEffect(() => {
    if (rowData && rowData.length > 0) {
      const newDnsResolutions: typeof dnsResolutions = {};
      rowData.forEach((row: any) => {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rowData]);

  const handleClose = () => {
    router.push("/");
  };

  const getContextMenuItems = (params: any) => {
    const { node } = params;
    const rowData = node.data;
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
            const port = rowData.port;
            const tags = rowData.tag;
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
            const port = rowData.port;
            const textToCopy = port ? `${ip}:${port}` : ip;
            navigator.clipboard.writeText(textToCopy);
          },
        },
        "separator",
        {
          name: "Resolve DNS hostname",
          action: () => resolveDns(rowData),
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
    }
    // Check if it's the specific column you want to customize
    if (
      params.column &&
      params.column.getColId().toLowerCase().includes("ip")
    ) {
      return [
        "copy",
        {
          name: "Copy as curl",
          action: () => {
            const ip = params.value;
            const host = ip && ip.includes(":") ? `[${ip}]` : ip;
            const port = rowData.port;
            const tags = rowData.tag;
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
            const port = rowData.port;
            const textToCopy = port ? `${ip}:${port}` : ip;
            navigator.clipboard.writeText(textToCopy);
          },
        },
        "separator",
        {
          name: "Search IP in Shodan",
          action: () => {
            window.open(`https://www.shodan.io/host/${params.value}`, "_blank");
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
    // Return undefined for other columns to use default menu
    return undefined as any;
  };

  // Add cellRenderer for hostname column to show resolved IP and status icon
  useEffect(() => {
    if (columnDefs.length > 0) {
      setColumnDefs((prev) =>
        prev.map((col) => {
          if (col.field && col.field.toLowerCase() === "hostname") {
            return {
              ...col,
              cellRenderer: (params: any) => {
                const rowKey = getRowKey(params.data);
                const dns = dnsResolutions[rowKey];
                return (
                  <span
                    style={{ display: "flex", alignItems: "center", gap: 4 }}
                  >
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
            };
          }
          return col;
        })
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dnsResolutions]);

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
