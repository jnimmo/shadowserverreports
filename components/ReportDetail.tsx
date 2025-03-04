import { FilterSettings } from "@/app/actions/filters";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useReportQuery, useReportStats } from "@/hooks/useShadowserverApi";
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

export function ReportDetail({ filters }: ReportListProps) {
  const { reports } = useReportQuery(filters);

  const { reportStats, isLoading: statsLoading } = useReportStats(filters);
  console.log(reportStats);

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
          <TableRow key={index}>
            <TableCell>{report.timestamp}</TableCell>
            <TableCell>{report.type}</TableCell>
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
