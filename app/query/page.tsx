import { Suspense } from "react";
import QueryClientShell from "./QueryClientShell";

export const dynamic = "force-static";

export default function ShadowserverReportPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <QueryClientShell />
    </Suspense>
  );
}
