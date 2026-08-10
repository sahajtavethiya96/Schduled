"use client";

import { FunnelSimple, MagnifyingGlass, Spinner } from "@phosphor-icons/react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ActionCategory, DateRange } from "@/lib/audit-query";

export function AuditFilters({
  entityTypes,
  category,
  entityType,
  dateRange,
  customFrom,
  customTo,
}: {
  entityTypes: string[];
  category: ActionCategory;
  entityType: string;
  dateRange: DateRange;
  customFrom: string;
  customTo: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [search, setSearch] = useState(searchParams.get("q") ?? "");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (document.activeElement === inputRef.current) {
      return;
    }
    setSearch(searchParams.get("q") ?? "");
  }, [searchParams]);

  function push(next: Record<string, string | undefined>) {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("page");
    for (const [key, value] of Object.entries(next)) {
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    }
    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    });
  }

  function onSearchChange(next: string) {
    setSearch(next);
    if (timer.current) {
      clearTimeout(timer.current);
    }
    timer.current = setTimeout(
      () => push({ q: next.trim() || undefined }),
      350
    );
  }

  useEffect(
    () => () => {
      if (timer.current) {
        clearTimeout(timer.current);
      }
    },
    []
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <form
          className="relative w-full sm:w-auto"
          onSubmit={(e) => {
            e.preventDefault();
            if (timer.current) {
              clearTimeout(timer.current);
            }
            push({ q: search.trim() || undefined });
          }}
        >
          {isPending ? (
            <Spinner
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 animate-spin text-primary"
              size={14}
            />
          ) : (
            <MagnifyingGlass
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              size={14}
            />
          )}
          <Input
            className="h-9 w-full pl-8 pr-3 text-sm sm:w-64"
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search action, user or entity..."
            ref={inputRef}
            type="search"
            value={search}
          />
        </form>

        <Select
          onValueChange={(v) => push({ category: v === "all" ? undefined : v })}
          value={category}
        >
          <SelectTrigger className="h-9 w-40 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Actions</SelectItem>
            <SelectItem value="auth">Authentication</SelectItem>
            <SelectItem value="bookings">Bookings</SelectItem>
            <SelectItem value="events">Events</SelectItem>
            <SelectItem value="emails">Emails</SelectItem>
            <SelectItem value="profile">Profile</SelectItem>
          </SelectContent>
        </Select>

        <Select
          onValueChange={(v) => push({ entity: v === "all" ? undefined : v })}
          value={entityType}
        >
          <SelectTrigger className="h-9 w-40 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Entities</SelectItem>
            {entityTypes.map((t) => (
              <SelectItem key={t} value={t}>
                {t.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          onValueChange={(v) =>
            push({ dateRange: v === "all" ? undefined : v })
          }
          value={dateRange}
        >
          <SelectTrigger className="h-9 w-40 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Time</SelectItem>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="week">Last 7 Days</SelectItem>
            <SelectItem value="month">Last 30 Days</SelectItem>
            <SelectItem value="custom">Custom Range</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {dateRange === "custom" && (
        <div className="flex items-center gap-3 border-t border-base-300 bg-base-200/30 px-1 py-3">
          <FunnelSimple className="text-muted-foreground" size={14} />
          <label className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">From</span>
            <input
              className="h-8 border border-base-300 bg-base-100 px-2 text-sm focus:border-primary focus:outline-none"
              defaultValue={customFrom}
              onChange={(e) => push({ from: e.target.value || undefined })}
              type="date"
            />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">To</span>
            <input
              className="h-8 border border-base-300 bg-base-100 px-2 text-sm focus:border-primary focus:outline-none"
              defaultValue={customTo}
              onChange={(e) => push({ to: e.target.value || undefined })}
              type="date"
            />
          </label>
        </div>
      )}
    </div>
  );
}
