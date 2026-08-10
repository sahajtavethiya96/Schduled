"use client";

import { CalendarBlank, X } from "@phosphor-icons/react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import type { DateRange } from "react-day-picker";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

function parseDate(s: string): Date | undefined {
  if (!s) {
    return;
  }
  const d = new Date(s + "T00:00:00");
  return isNaN(d.getTime()) ? undefined : d;
}

function formatISO(d: Date): string {
  return d.toISOString().slice(0, 10);
}

const fmt = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
});

interface BookingsDateFilterProps {
  dateFrom: string;
  dateTo: string;
  tab: string;
}

export function BookingsDateFilter({
  tab,
  dateFrom,
  dateTo,
}: BookingsDateFilterProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  const range: DateRange = {
    from: parseDate(dateFrom),
    to: parseDate(dateTo),
  };

  function push(from: Date | undefined, to: Date | undefined) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    params.delete("page");
    if (from) {
      params.set("dateFrom", formatISO(from));
    } else {
      params.delete("dateFrom");
    }
    if (to) {
      params.set("dateTo", formatISO(to));
    } else {
      params.delete("dateTo");
    }
    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    });
  }

  function handleSelect(next: DateRange | undefined) {
    push(next?.from, next?.to);
    if (next?.from && next?.to) {
      setOpen(false);
    }
  }

  function clear(e: React.MouseEvent) {
    e.stopPropagation();
    push(undefined, undefined);
  }

  const hasFilter = range.from || range.to;
  const label = range.from
    ? range.to
      ? `${fmt.format(range.from)} – ${fmt.format(range.to)}`
      : `From ${fmt.format(range.from)}`
    : "Date range";

  return (
    <Popover onOpenChange={setOpen} open={open}>
      <PopoverTrigger asChild>
        <Button
          className={cn(
            "h-9 gap-2 px-3 font-normal",
            hasFilter
              ? "border-primary/50 text-base-content"
              : "text-muted-foreground hover:text-base-content"
          )}
          size="sm"
          variant="outline"
        >
          <CalendarBlank
            className={cn(hasFilter ? "text-primary" : "text-muted-foreground")}
            size={14}
          />
          <span className="text-sm">{label}</span>
          {hasFilter && (
            <span
              aria-label="Clear date filter"
              className="ml-0.5 flex h-4 w-4 items-center justify-center text-muted-foreground transition-colors hover:text-base-content"
              onClick={clear}
              role="button"
            >
              <X size={11} weight="bold" />
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0">
        <Calendar
          autoFocus
          mode="range"
          numberOfMonths={1}
          onSelect={handleSelect}
          selected={range}
        />
      </PopoverContent>
    </Popover>
  );
}
