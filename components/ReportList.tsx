import { FilterSettings } from "@/app/actions/filters";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useReportList, useReportStats } from "@/hooks/useShadowserverApi";
import { DownloadIcon } from "@radix-ui/react-icons";
import { ViewReportButton } from "./ViewReportButton";
import { useState } from "react";

export interface Report {
  id: string;
  type: string;
  timestamp: string;
  url: string;
  report: string;
  file: string;
  rows?: number;
  severity?: string;
  definitionUrl?: string;
  description?: string;
}

type SortBy = "date" | "type" | "records";

export function ReportList({ filters }: { filters: FilterSettings }) {
  const { reports, isLoading } = useReportList(filters);
  const { reportStats, isLoading: statsLoading } = useReportStats(filters);
  const [sortBy, setSortBy] = useState<SortBy>("date");

  const toggleSort = (newSort: SortBy) => {
    setSortBy(newSort);
  };

  const getSortLabel = (col: SortBy) => (sortBy === col ? " (sorted)" : "");

  const getSortOrder = (a: Report, b: Report) => {
    if (sortBy === "date") {
      const dateDiff = b.timestamp.localeCompare(a.timestamp);
      if (dateDiff !== 0) return dateDiff;
      const severityOrder = {
        critical: 4,
        high: 3,
        medium: 2,
        low: 1,
        unknown: 0,
      } as const;
      type Severity = keyof typeof severityOrder;
      const sevDiff =
        severityOrder[(b.severity ?? "unknown") as Severity] -
        severityOrder[(a.severity ?? "unknown") as Severity];
      if (sevDiff !== 0) return sevDiff;
      return (a.description ?? a.type).localeCompare(b.description ?? b.type);
    } else if (sortBy === "type") {
      const typeDiff = (a.description ?? a.type).localeCompare(
        b.description ?? b.type
      );
      if (typeDiff !== 0) return typeDiff;
      return b.timestamp.localeCompare(a.timestamp);
    } else {
      // sortBy === "records"
      const aRec = reportStats?.[`${a.timestamp}_${a.type}`] ?? 0;
      const bRec = reportStats?.[`${b.timestamp}_${b.type}`] ?? 0;
      if (aRec !== bRec) return bRec - aRec;
      return b.timestamp.localeCompare(a.timestamp);
    }
  };

  return (
    <div>
      <div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead
                onClick={() => toggleSort("date")}
                style={{ cursor: "pointer" }}
              >
                Date (UTC){getSortLabel("date")}
              </TableHead>
              <TableHead
                onClick={() => toggleSort("type")}
                style={{ cursor: "pointer" }}
              >
                Type{getSortLabel("type")}
              </TableHead>
              <TableHead
                onClick={() => toggleSort("records")}
                style={{ cursor: "pointer" }}
              >
                Records{getSortLabel("records")}
              </TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell>Loading</TableCell>
                <TableCell></TableCell>
                <TableCell></TableCell>
                <TableCell></TableCell>
              </TableRow>
            )}
            {reports
              ?.filter(
                (report) =>
                  (!filters.severity ||
                    filters.severity == "any" ||
                    report.severity === filters.severity) &&
                  (filters.reportType === report.type ||
                    !filters.reportType ||
                    filters.reportType == "all")
              )
              .sort(getSortOrder)
              .map((report, index) => (
                <TableRow
                  key={index}
                  className={
                    report.severity === "critical"
                      ? "bg-red-50 hover:bg-red-100"
                      : report.severity === "high"
                      ? "bg-amber-50 hover:bg-amber-100"
                      : report.severity === "medium"
                      ? "bg-blue-50 hover:bg-blue-100"
                      : report.severity === "low"
                      ? "bg-green-50 hover:bg-green-100"
                      : ""
                  }
                >
                  <TableCell className="text-nowrap">
                    {report.timestamp}
                  </TableCell>
                  <TableCell>
                    {report.definitionUrl ? (
                      <a
                        href={report.url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {report.description}
                      </a>
                    ) : (
                      report.type
                    )}
                  </TableCell>
                  <TableCell>
                    {!statsLoading &&
                      reportStats?.[`${report.timestamp}_${report.type}`]}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <a
                        href={`https://dl.shadowserver.org/${report.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label="Download report"
                        title="Download report"
                        className="text-blue-500 hover:underline"
                      >
                        <DownloadIcon className="h-4 w-4 text-muted-foreground mx-1" />
                      </a>
                      <ViewReportButton
                        link={`/query?reportId=${report.id}&type=${report.type}&timestamp=${report.timestamp}`}
                        reportId={report.id}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
