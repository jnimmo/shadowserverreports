/* eslint-disable @typescript-eslint/no-explicit-any */
// components/GridComponent.tsx
"use client";

import { AgGridReact } from "ag-grid-react";
import { useEffect, useState } from "react";
import type { ColDef } from "ag-grid-community";
import { AllEnterpriseModule, ModuleRegistry } from "ag-grid-enterprise";
import "ag-grid-enterprise";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Cross1Icon } from "@radix-ui/react-icons";
import type { GridApi } from "ag-grid-community";

ModuleRegistry.registerModules([AllEnterpriseModule]);

const GridComponent = () => {
  const [rowData, setRowData] = useState<object[]>([]);
  const [columnDefs, setColumnDefs] = useState<ColDef[]>([]);
  const [reportInfo, setReportInfo] = useState<{
    type: string;
    timestamp: string;
  } | null>(null);
  const searchParams = useSearchParams();
  const router = useRouter();
  const reportId = searchParams.get("reportId");
  const [gridApi, setGridApi] = useState<GridApi | null>(null);

  useEffect(() => {
    if (reportId) {
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
            const cols = Object.keys(data[0]).map((field) => {
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
        .catch((error) => console.error("Error loading report:", error));
    }
  }, [reportId, searchParams]);

  useEffect(() => {
    if (gridApi && rowData.length > 0) {
      setTimeout(() => {
        gridApi.sizeColumnsToFit();
      }, 50);
    }
  }, [gridApi, rowData]);

  const handleClose = () => {
    router.push("/");
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
          onGridReady={(params) => {
            setGridApi(params.api);
          }}
        />
      </div>
    </div>
  );
};

export default GridComponent;
