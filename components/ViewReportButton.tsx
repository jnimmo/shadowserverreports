"use client";
import { ReaderIcon } from "@radix-ui/react-icons";
import Link from "next/link";
import { useRouter } from "next/navigation";
export function ViewReportButton({
  link,
  reportId,
}: {
  link: string;
  reportId: string;
}) {
  const router = useRouter();

  const preload = () => {
    fetch(`/api/reports/download?id=${reportId}`);
  };
  return (
    <Link
      href={link}
      title="View report"
      onMouseDown={() => {
        router.prefetch(link);
        void preload();
        console.log("hey");
      }}
    >
      <ReaderIcon />
    </Link>
  );
}
