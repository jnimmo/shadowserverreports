"use client";

import { Suspense } from "react";
import GridComponent from "./GridComponent";

export default function ShadowserverReportPage() {
  return (
    <>
      <Suspense fallback={<div>Loading...</div>}>
        <GridComponent />
      </Suspense>
    </>
  );
}
