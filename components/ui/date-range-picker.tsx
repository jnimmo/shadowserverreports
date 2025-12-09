"use client";

import * as React from "react";
import { CalendarIcon } from "@radix-ui/react-icons";
import { addDays, format } from "date-fns";
import { DateRange } from "react-day-picker";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { FilterSettings } from "@/app/actions/filters";

export function DatePickerWithRange({
  className,
  filters,
  setFilters,
}: {
  className?: React.HTMLAttributes<HTMLDivElement>;
  filters: FilterSettings;
  setFilters: (filters: Partial<FilterSettings>) => void;
}) {
  const parseDate = (value?: string) => {
    if (!value) return undefined;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? undefined : parsed;
  };

  const [date, setDate] = React.useState<DateRange | undefined>(() => ({
    from: parseDate(filters.dateRange?.from) ?? addDays(new Date(), -4),
    to: parseDate(filters.dateRange?.to) ?? new Date(),
  }));

  React.useEffect(() => {
    const nextRange: DateRange | undefined =
      filters.dateRange?.from || filters.dateRange?.to
        ? {
            from: parseDate(filters.dateRange?.from),
            to: parseDate(filters.dateRange?.to),
          }
        : undefined;
    setDate(nextRange);
  }, [filters.dateRange?.from, filters.dateRange?.to]);

  const handleDateRangeChange = (dateRange: DateRange | undefined) => {
    setDate(dateRange);
    setFilters({
      dateRange: {
        from: dateRange?.from ? format(dateRange.from, "yyyy-MM-dd") : "",
        to: dateRange?.to
          ? format(dateRange.to, "yyyy-MM-dd")
          : dateRange?.from
          ? format(dateRange.from, "yyyy-MM-dd")
          : "",
      },
    });
  };

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            className={cn(
              "w-full justify-start text-left font-normal sm:w-[280px]",
              !date && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date?.from ? (
              date.to ? (
                <>
                  {format(date.from, "LLL dd, y")} -{" "}
                  {format(date.to, "LLL dd, y")}
                </>
              ) : (
                format(date.from, "LLL dd, y")
              )
            ) : (
              <span>Pick a date</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={date?.to}
            selected={date}
            onSelect={handleDateRangeChange}
            numberOfMonths={2}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
