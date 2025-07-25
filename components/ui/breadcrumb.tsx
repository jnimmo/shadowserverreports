import { ChevronRightIcon } from "@radix-ui/react-icons";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

export function Breadcrumb({ items, className }: BreadcrumbProps) {
  return (
    <nav className={cn("flex items-center space-x-1 text-sm", className)}>
      {items.map((item, index) => {
        const isLast = index === items.length - 1;

        return (
          <div key={item.label} className="flex items-center">
            {item.href ? (
              <Link
                href={item.href}
                className={cn(
                  "hover:text-foreground transition-colors",
                  isLast
                    ? "text-foreground font-medium"
                    : "text-muted-foreground hover:underline"
                )}
              >
                {item.label}
              </Link>
            ) : (
              <span
                className={cn(
                  "hover:text-foreground transition-colors",
                  isLast
                    ? "text-foreground font-medium"
                    : "text-muted-foreground hover:underline"
                )}
              >
                {item.label}
              </span>
            )}
            {!isLast && (
              <ChevronRightIcon className="h-4 w-4 text-muted-foreground mx-1" />
            )}
          </div>
        );
      })}
    </nav>
  );
}
