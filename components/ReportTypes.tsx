"use client";

import { useReportTypes } from "@/hooks/useShadowserverApi";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function ReportTypes() {
  const { reportTypes, isLoading, isError } = useReportTypes();

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
