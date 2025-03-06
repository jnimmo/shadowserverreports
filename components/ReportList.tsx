import { FilterSettings } from "@/app/actions/filters";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  useReportDefinitions,
  useReportList,
  useReportStats,
} from "@/hooks/useShadowserverApi";
import { Suspense } from "react";

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

interface ReportListProps {
  filters: FilterSettings;
}

export function ReportList({ filters }: ReportListProps) {
  const { reports } = useReportList(filters);
  const { reportStats, isLoading: statsLoading } = useReportStats(filters);
  // const { reportDefinitions } = useReportDefinitions();

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Date (UTC)</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Records</TableHead>
          <TableHead>Download</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {reports
          ?.filter(
            (report) =>
              !filters.severity ||
              filters.severity == "any" ||
              report.severity === filters.severity
          )
          .map((report, index) => (
            <TableRow
              key={index}
              className={
                report.severity === "high"
                  ? "bg-amber-50 hover:bg-amber-100"
                  : report.severity === "critical"
                  ? "bg-red-50 hover:bg-red-100"
                  : ""
              }
            >
              <TableCell className="text-nowrap">{report.timestamp}</TableCell>
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
                <a
                  href={`https://dl.shadowserver.org/${report.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:underline"
                >
                  {report.file}
                </a>
              </TableCell>
            </TableRow>
          ))}
      </TableBody>
    </Table>
  );
}
