"use client";

import { useReportTypes } from "@/hooks/useShadowserverApi";

import { SelectContent, SelectItem } from "@/components/ui/select";

export function ReportTypes() {
  const { reportTypes } = useReportTypes();

  return (
    <SelectContent>
      {reportTypes &&
        reportTypes.map((type) => (
          <SelectItem key={type} value={type}>
            {type}
          </SelectItem>
        ))}
    </SelectContent>
  );
}
