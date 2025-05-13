"use client";

import GridComponent from "./GridComponent";
import { AdditionalFilters, AdditionalFilterValues } from "./AdditionalFilters";
import { Suspense, useState } from "react";

export default function ShadowserverReportPage() {
  const [additionalFilters, setAdditionalFilters] =
    useState<AdditionalFilterValues>({
      geo: null,
      asn: null,
      ip: null,
      tag: null,
      limit: "100",
    });
  return (
    <>
      <GridComponent />
    </>
  );
}
