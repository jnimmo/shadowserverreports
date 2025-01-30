import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export interface Report {
  id: string;
  type: string;
  timestamp: string;
  url: string;
  report: string;
  file: string;
}

interface ReportListProps {
  reports: Report[];
}

export function ReportList({ reports }: ReportListProps) {
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
        {reports.map((report) => (
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
