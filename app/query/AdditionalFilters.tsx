import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState } from "react";

export type AdditionalFilterValues = {
  geo: string | null;
  asn: string | null;
  ip: string | null;
  tag: string | null;
  limit: string;
};

export function AdditionalFilters({
  filters,
  setFilters,
}: {
  filters: AdditionalFilterValues;
  setFilters: (filters: AdditionalFilterValues) => void;
}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  // Local state for immediate UI updates
  const [localFilters, setLocalFilters] = useState({
    dateRange: { to: "", from: "" },
  });

  const [geo, setGeo] = useState<string>(filters.geo || "");
  const [asn, setAsn] = useState<string>(filters.asn || "");
  const [ip, setIp] = useState<string>(filters.ip || "");
  const [tag, setTag] = useState<string>(filters.tag || "");

  const createQueryString = useCallback(
    (name: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(name, value);
      } else {
        params.delete(name);
      }

      return params.toString();
    },
    [searchParams]
  );

  const handleBlur = (field: keyof AdditionalFilterValues, value: string) => {
    setFilters({
      ...filters,
      [field]: value || null,
    });
    router.push(pathname + "?" + createQueryString(field, value));
  };

  useState<AdditionalFilterValues>({
    geo: searchParams.get("geo"),
    asn: searchParams.get("asn"),
    ip: searchParams.get("ip"),
    tag: searchParams.get("tag"),
    limit: searchParams.get("limit") ?? "10",
  });

  return (
    <>
      <DatePickerWithRange
        filters={localFilters}
        setFilters={setLocalFilters}
      />
      <div className="grid grid-cols-4 gap-4">
        <div>
          <Label htmlFor="geo">Geo</Label>
          <Input
            id="geo"
            placeholder="e.g., NZ"
            value={geo}
            onChange={(e) => setGeo(e.target.value)}
            onBlur={() => handleBlur("geo", geo)}
          />
        </div>
        <div>
          <Label htmlFor="asn">ASN</Label>
          <Input
            id="asn"
            placeholder="e.g., AS1234"
            value={asn}
            onChange={(e) => setAsn(e.target.value)}
            onBlur={() => handleBlur("asn", asn)}
          />
        </div>
        <div>
          <Label htmlFor="ip">IP/CIDR</Label>
          <Input
            id="ip"
            placeholder="e.g., 192.168.1.0/24"
            value={ip}
            onChange={(e) => setIp(e.target.value)}
            onBlur={() => handleBlur("ip", ip)}
          />
        </div>
        <div>
          <Label htmlFor="ip">Tag</Label>
          <Input
            id="tag"
            placeholder="e.g. sslvpn"
            value={tag}
            onChange={(e) => setTag(e.target.value)}
            onBlur={() => handleBlur("tag", tag)}
          />
        </div>
      </div>
    </>
  );
}
