import { FilterSettings } from "@/app/actions/filters";
import {
  Table,
  TableBody,
  TableCell,
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
}

interface ReportListProps {
  filters: FilterSettings;
}

export function ReportList({ filters }: ReportListProps) {
  const { reports } = useReportList(filters);

  const { reportStats, isLoading: statsLoading } = useReportStats(filters);
  const { reportDefinitions } = useReportDefinitions();

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
        {reports?.map((report, index) => (
          <TableRow
            key={index}
            className={
              reportDefinitions?.[report.type]?.severity === "high"
                ? "bg-amber-50 hover:bg-amber-100"
                : reportDefinitions?.[report.type]?.severity === "critical"
                ? "bg-red-50 hover:bg-red-100"
                : ""
            }
          >
            <TableCell className="text-nowrap">{report.timestamp}</TableCell>
            <TableCell>
              {reportDefinitions?.[report.type] ? (
                <a
                  href={reportDefinitions[report.type].url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {reportDefinitions[report.type].description}
                </a>
              ) : (
                report.type
              )}
            </TableCell>
            <Suspense fallback={<TableCell>Loading...</TableCell>}>
              <TableCell>
                {!statsLoading &&
                  reportStats &&
                  reportStats[`${report.timestamp}_${report.type}`]}
              </TableCell>
            </Suspense>
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
