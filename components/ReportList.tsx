import { FilterSettings } from "@/app/actions/filters";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useReportList } from "@/hooks/useShadowserverApi";

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
  const {
    reports,
    isLoading: reportsLoading,
    isError: reportsError,
  } = useReportList(filters);

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Type</TableHead>
          <TableHead>Date</TableHead>
          <TableHead>File</TableHead>
          <TableHead>Report</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {reports &&
          reports.map((report) => (
            <TableRow key={report.id}>
              <TableCell>{report.type}</TableCell>
              <TableCell>{report.timestamp}</TableCell>
              <TableCell>{report.file}</TableCell>
              <TableCell>
                <a
                  href={`https://dl.shadowserver.org/${report.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:underline"
                >
                  View Report
                </a>
              </TableCell>
            </TableRow>
          ))}
      </TableBody>
    </Table>
  );
}
