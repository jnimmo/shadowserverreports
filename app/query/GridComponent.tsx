// components/GridComponent.tsx
"use client";

import { AgGridReact } from "ag-grid-react";
import { useEffect, useState } from "react";
import type { ColDef } from "ag-grid-community";
import { AllCommunityModule, ModuleRegistry } from "ag-grid-community";
import { AdditionalFilterValues } from "./AdditionalFilters";
ModuleRegistry.registerModules([AllCommunityModule]);

const GridComponent = ({ filters }: { filters: AdditionalFilterValues }) => {
  const [rowData, setRowData] = useState<object[]>([]);
  const [queryUri, setQueryUri] = useState<string>("");

  const [columnDefs] = useState<ColDef[]>([
    { field: "timestamp" },
    { field: "ip" },
    { field: "protocol" },
    { field: "port" },
    { field: "tag" },
    { field: "infection" },
    { field: "domain" },
    { field: "geo" },
    { field: "rip" },
    { field: "isp_name" },
    { field: "country_fips" },
    { field: "country_name" },
    { field: "asn" },
    { field: "sid" },
    { field: "asn_name" },
    { field: "tld" },
    { field: "city" },
    { field: "type" },

    { field: "region" },
    { field: "sector" },
    { field: "naics" },
  ]);

  useEffect(() => {
    // build the query string from the filters object using URLSearchParams
    const params = new URLSearchParams();
    for (const key in filters) {
      if (filters[key as keyof AdditionalFilterValues]) {
        params.append(key, filters[key as keyof AdditionalFilterValues]!);
      }
    }
    const newQueryUri = `/api/reports/query?${params}&limit=10&sort=descending`;
    // if the query string has changed, update the state and fetch the data
    if (params && queryUri !== newQueryUri) {
      setQueryUri(newQueryUri);
      fetch(newQueryUri) // Fetch data from server
        .then((result) => result.json()) // Convert to JSON
        .then((rowData) => setRowData(rowData)); // Update state of `rowData`
    }
  }, [filters, queryUri]);

  return (
    <div style={{ width: "100%", height: "100vh" }}>
      <AgGridReact rowData={rowData} columnDefs={columnDefs} />
    </div>
  );
};

export default GridComponent;
