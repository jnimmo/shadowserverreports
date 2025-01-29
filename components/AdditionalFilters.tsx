import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface AdditionalFiltersProps {
  geo: string
  setGeo: (value: string) => void
  asn: string
  setAsn: (value: string) => void
  ip: string
  setIp: (value: string) => void
}

export function AdditionalFilters({ geo, setGeo, asn, setAsn, ip, setIp }: AdditionalFiltersProps) {
  return (
    <div className="grid grid-cols-3 gap-4">
      <div>
        <Label htmlFor="geo">Geo</Label>
        <Input id="geo" placeholder="e.g., NZ" value={geo} onChange={(e) => setGeo(e.target.value)} />
      </div>
      <div>
        <Label htmlFor="asn">ASN</Label>
        <Input id="asn" placeholder="e.g., AS1234" value={asn} onChange={(e) => setAsn(e.target.value)} />
      </div>
      <div>
        <Label htmlFor="ip">IP/CIDR</Label>
        <Input id="ip" placeholder="e.g., 192.168.1.0/24" value={ip} onChange={(e) => setIp(e.target.value)} />
      </div>
    </div>
  )
}

