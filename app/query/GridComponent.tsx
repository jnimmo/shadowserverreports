// components/GridComponent.tsx
"use client";

import { AgGridReact } from "ag-grid-react";
import { useEffect, useState } from "react";
import type { ColDef } from "ag-grid-community";
import { AllCommunityModule, ModuleRegistry } from "ag-grid-community";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Cross1Icon } from "@radix-ui/react-icons";

ModuleRegistry.registerModules([AllCommunityModule]);

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

  useEffect(() => {
    if (reportId) {
      // Fetch and display the report data
      fetch(`/api/reports/download?id=${reportId}`)
        .then((result) => result.json())
        .then((data) => {
          if (data && data.length > 0) {
            // Dynamically create column definitions from the first row
            const cols = Object.keys(data[0]).map((field) => ({
              field,
              sortable: true,
              filter: true,
            }));
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
          pagination={true}
          autoSizeStrategy={{
            type: "fitCellContents",
          }}
          paginationAutoPageSize={true}
        />
      </div>
    </div>
  );
};

export default GridComponent;
