import { Suspense } from "react";
import GridComponent from "./GridComponent";

export const dynamic = "force-static";

export default function ShadowserverReportPage() {
  return (
    <>
      <Suspense fallback={<div>Loading...</div>}>
        <GridComponent />
      </Suspense>
    </>
  );
}
