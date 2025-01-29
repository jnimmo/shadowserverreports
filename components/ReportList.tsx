import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

interface Report {
  id: string
  type: string
  date: string
  url: string
  geo: string
  asn: string
  ip: string
}

interface ReportListProps {
  reports: Report[]
}

export function ReportList({ reports }: ReportListProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>ID</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Date</TableHead>
          <TableHead>Geo</TableHead>
          <TableHead>ASN</TableHead>
          <TableHead>IP</TableHead>
          <TableHead>URL</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {reports.map((report) => (
          <TableRow key={report.id}>
            <TableCell>{report.id}</TableCell>
            <TableCell>{report.type}</TableCell>
            <TableCell>{new Date(report.date).toLocaleDateString()}</TableCell>
            <TableCell>{report.geo}</TableCell>
            <TableCell>{report.asn}</TableCell>
            <TableCell>{report.ip}</TableCell>
            <TableCell>
              <a href={report.url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                View Report
              </a>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

