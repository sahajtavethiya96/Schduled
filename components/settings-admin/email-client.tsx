"use client";

import {
  ArrowClockwise,
  CalendarBlank,
  CheckCircle,
  Clock,
  Envelope,
  EnvelopeSimple,
  MagnifyingGlass,
  X,
  XCircle,
} from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import type { DateRange } from "react-day-picker";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn, paginationRange } from "@/lib/utils";

function parseDate(s: string): Date | undefined {
  if (!s) return undefined
  const d = new Date(s + 'T00:00:00')
  return isNaN(d.getTime()) ? undefined : d
}
function fmtISO(d: Date): string { return d.toISOString().slice(0, 10) }
const dateFmt = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' })

// ── Types ─────────────────────────────────────────────────────────────────────

export type OutboxRow = {
  id: string;
  status: string;
  payload: { to: string; subject: string };
  attemptCount: number;
  sentAt: string | null;
  createdAt: string;
};

export type EventRow = {
  id: string;
  eventType: string;
  recipient: string | null;
  receivedAt: string;
};

export type EmailStats = {
  total: number;
  sent: number;
  failed: number;
  pending: number;
};

// ── Friendly subject names ────────────────────────────────────────────────────

function getFriendlySubject(subject: string): string {
  const s = subject.toLowerCase();
  if (
    s.includes("sign in") ||
    s.includes("magic link") ||
    s.includes("log in")
  ) {
    return "Magic Link Login";
  }
  if (
    s.includes("booking confirmation") ||
    s.includes("confirmed your booking")
  ) {
    return "Booking Confirmation";
  }
  if (s.includes("reminder") || s.includes("upcoming meeting")) {
    return "Meeting Reminder";
  }
  if (s.includes("password reset") || s.includes("reset your password")) {
    return "Password Reset";
  }
  if (s.includes("welcome")) {
    return "Welcome Email";
  }
  if (s.includes("reschedule") || s.includes("rescheduled")) {
    return "Booking Rescheduled";
  }
  if (s.includes("cancel")) {
    return "Booking Cancelled";
  }
  return subject;
}

// ── Outbox status badge ───────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  string,
  { label: string; cls: string; dot: string }
> = {
  sent: {
    label: "Sent",
    cls: "bg-success/10 text-success border-success/25",
    dot: "bg-success",
  },
  failed: {
    label: "Failed",
    cls: "bg-error/10 text-error border-error/20",
    dot: "bg-error",
  },
  queued: {
    label: "Queued",
    cls: "bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400",
    dot: "bg-amber-500",
  },
  sending: {
    label: "Sending",
    cls: "bg-primary/10 text-primary border-primary/20",
    dot: "bg-primary",
  },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? {
    label: status,
    cls: "bg-base-200 text-muted-foreground border-base-300",
    dot: "bg-muted-foreground",
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-none border px-2 py-0.5 text-xs font-semibold ${cfg.cls}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

// ── Event type badge ──────────────────────────────────────────────────────────

const EVENT_CONFIG: Record<
  string,
  { label: string; cls: string; dot: string }
> = {
  delivered: {
    label: "Delivered",
    cls: "bg-success/10 text-success border-success/25",
    dot: "bg-success",
  },
  opened: {
    label: "Opened",
    cls: "bg-blue-500/10 text-blue-600 border-blue-500/25 dark:text-blue-400",
    dot: "bg-blue-500",
  },
  open: {
    label: "Opened",
    cls: "bg-blue-500/10 text-blue-600 border-blue-500/25 dark:text-blue-400",
    dot: "bg-blue-500",
  },
  bounced: {
    label: "Bounced",
    cls: "bg-error/10 text-error border-error/20",
    dot: "bg-error",
  },
  bounce: {
    label: "Bounced",
    cls: "bg-error/10 text-error border-error/20",
    dot: "bg-error",
  },
  complained: {
    label: "Complained",
    cls: "bg-orange-500/10 text-orange-600 border-orange-500/20 dark:text-orange-400",
    dot: "bg-orange-500",
  },
  complaint: {
    label: "Complained",
    cls: "bg-orange-500/10 text-orange-600 border-orange-500/20 dark:text-orange-400",
    dot: "bg-orange-500",
  },
};

function EventTypeBadge({ type }: { type: string }) {
  const key = type.toLowerCase();
  const cfg = EVENT_CONFIG[key] ?? {
    label: type,
    cls: "bg-base-200 text-muted-foreground border-base-300",
    dot: "bg-muted-foreground",
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-none border px-2 py-0.5 text-xs font-semibold ${cfg.cls}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  icon,
  accent = false,
  danger = false,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  accent?: boolean;
  danger?: boolean;
}) {
  return (
    <Card
      className={
        accent
          ? "border-primary/40 bg-primary/[0.04]"
          : danger
            ? "border-error/30 bg-error/[0.03]"
            : ""
      }
    >
      <CardContent className="px-5 pb-4 pt-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-ui text-muted-foreground">
              {label}
            </p>
            <p className="mt-1.5 font-heading text-3xl font-bold text-base-content">
              {value}
            </p>
          </div>
          <span
            className={
              accent
                ? "text-primary"
                : danger
                  ? "text-error"
                  : "text-muted-foreground/60"
            }
          >
            {icon}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Timer ─────────────────────────────────────────────────────────────────────

function formatSecondsAgo(s: number): string {
  if (s < 60) {
    return `${s}s ago`;
  }
  if (s < 3600) {
    return `${Math.floor(s / 60)}m ago`;
  }
  return `${Math.floor(s / 3600)}h ago`;
}

function formatDate(iso: string): { date: string; time: string } {
  const d = new Date(iso);
  const date = d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const time = d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
  return { date, time };
}

// ── Main component ────────────────────────────────────────────────────────────

export type EmailFilter = {
  status: string;
  q: string;
  from: string;
  to: string;
};

const OUTBOX_STATUS_TABS: { key: string; label: string }[] = [
  { key: "all", label: "All" },
  { key: "sent", label: "Sent" },
  { key: "failed", label: "Failed" },
  { key: "queued", label: "Queued" },
  { key: "sending", label: "Sending" },
];

export function EmailClient({
  outbox,
  events,
  stats,
  outboxPage,
  outboxTotalPages,
  filter,
  filteredTotal,
  fetchedAt,
}: {
  outbox: OutboxRow[];
  events: EventRow[];
  stats: EmailStats;
  outboxPage: number;
  outboxTotalPages: number;
  filter: EmailFilter;
  filteredTotal: number;
  fetchedAt: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [secondsAgo, setSecondsAgo] = useState(0);
  const [searchInput, setSearchInput] = useState(filter.q);
  const [dateOpen, setDateOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setSecondsAgo(0);
    const id = setInterval(() => setSecondsAgo((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [fetchedAt]);

  // Keep the search box in sync if the URL filter changes externally.
  useEffect(() => {
    setSearchInput(filter.q);
  }, [filter.q]);

  function buildUrl(next: Partial<EmailFilter> & { page?: number }): string {
    const status = next.status ?? filter.status;
    const q = next.q ?? filter.q;
    const from = next.from ?? filter.from;
    const to = next.to ?? filter.to;
    // Any filter change resets to page 1; only explicit paging keeps a page.
    const page = next.page ?? 1;
    const params = new URLSearchParams();
    // Keep the Email tab active across filter/pagination navigations —
    // otherwise the merged /settings/jobs page would snap back to Queues.
    params.set("tab", "email");
    if (status && status !== "all") {
      params.set("outboxStatus", status);
    }
    if (q) {
      params.set("outboxQ", q);
    }
    if (from) {
      params.set("outboxFrom", from);
    }
    if (to) {
      params.set("outboxTo", to);
    }
    if (page > 1) {
      params.set("outboxPage", String(page));
    }
    return `/settings/jobs?${params.toString()}`;
  }

  function navigate(next: Partial<EmailFilter> & { page?: number }) {
    startTransition(() => router.push(buildUrl(next)));
  }

  // Debounce the search box → URL.
  // biome-ignore lint/correctness/useExhaustiveDependencies: only react to the typed value
  useEffect(() => {
    if (searchInput === filter.q) {
      return;
    }
    const id = setTimeout(() => navigate({ q: searchInput }), 350);
    return () => clearTimeout(id);
  }, [searchInput]);

  const filtersActive =
    filter.status !== "all" || !!filter.q || !!filter.from || !!filter.to;

  function handleRefresh() {
    startTransition(() => router.refresh());
  }

  function goToPage(p: number) {
    startTransition(() => router.push(buildUrl({ page: p })));
  }

  return (
    <div className="space-y-8">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-base-content">Email</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Transactional email queue and inbound delivery events.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <p className="text-xs text-muted-foreground">
            Updated {formatSecondsAgo(secondsAgo)}
          </p>
          <Button
            className="h-8 gap-1.5 text-xs"
            disabled={isPending}
            onClick={handleRefresh}
            size="sm"
            variant="outline"
          >
            <ArrowClockwise
              className={isPending ? "animate-spin" : ""}
              size={13}
            />
            {isPending ? "Refreshing…" : "Refresh"}
          </Button>
        </div>
      </div>

      {/* ── Summary stat cards ───────────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<Envelope size={20} weight="duotone" />}
          label="Total Emails"
          value={stats.total}
        />
        <StatCard
          accent
          icon={<CheckCircle size={20} weight="duotone" />}
          label="Sent"
          value={stats.sent}
        />
        <StatCard
          danger={stats.failed > 0}
          icon={<XCircle size={20} weight="duotone" />}
          label="Failed"
          value={stats.failed}
        />
        <StatCard
          icon={<Clock size={20} weight="duotone" />}
          label="Pending"
          value={stats.pending}
        />
      </div>

      {/* ── Outbox + Events ──────────────────────────────────────────────── */}
      <div className="grid gap-6 xl:grid-cols-3">
        {/* Outbox — 2/3 width */}
        <Card className="xl:col-span-2">
          <CardHeader className="flex flex-col gap-3 border-b border-base-300 py-4 lg:flex-row lg:items-center lg:justify-between">
            <CardTitle className="text-base font-semibold">
              Outbox{" "}
              <span className="font-normal text-muted-foreground">
                ({filteredTotal})
              </span>
            </CardTitle>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="relative sm:w-52">
                <MagnifyingGlass
                  className="-translate-y-1/2 absolute top-1/2 left-2.5 text-muted-foreground"
                  size={15}
                />
                <Input
                  className="h-9 pl-8 text-sm"
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Search recipient or subject…"
                  value={searchInput}
                />
              </div>
              <Select
                value={filter.status}
                onValueChange={(v) => navigate({ status: v })}
              >
                <SelectTrigger className="h-9 w-full text-sm sm:w-32" aria-label="Status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {OUTBOX_STATUS_TABS.map((tab) => (
                    <SelectItem key={tab.key} value={tab.key}>
                      {tab.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex w-full items-center gap-2 sm:w-auto">
                <Popover open={dateOpen} onOpenChange={setDateOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className={cn(
                        'h-9 gap-2 px-3 font-normal',
                        (filter.from || filter.to)
                          ? 'border-primary/50 text-base-content'
                          : 'text-muted-foreground hover:text-base-content'
                      )}
                    >
                      <CalendarBlank
                        size={14}
                        className={cn(filter.from || filter.to ? 'text-primary' : 'text-muted-foreground')}
                      />
                      <span className="text-sm">
                        {filter.from
                          ? filter.to
                            ? `${dateFmt.format(parseDate(filter.from)!)} – ${dateFmt.format(parseDate(filter.to)!)}`
                            : `From ${dateFmt.format(parseDate(filter.from)!)}`
                          : 'Date range'}
                      </span>
                      {(filter.from || filter.to) && (
                        <span
                          role="button"
                          aria-label="Clear date filter"
                          onClick={(e) => { e.stopPropagation(); navigate({ from: '', to: '' }) }}
                          className="ml-0.5 flex h-4 w-4 items-center justify-center text-muted-foreground transition-colors hover:text-base-content"
                        >
                          <X size={11} weight="bold" />
                        </span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="range"
                      selected={{ from: parseDate(filter.from), to: parseDate(filter.to) } as DateRange}
                      onSelect={(range) => {
                        navigate({ from: range?.from ? fmtISO(range.from) : '', to: range?.to ? fmtISO(range.to) : '' })
                        if (range?.from && range?.to) setDateOpen(false)
                      }}
                      numberOfMonths={1}
                      autoFocus
                    />
                  </PopoverContent>
                </Popover>
                {filtersActive && (
                  <Button
                    className="h-9 text-xs"
                    onClick={() => navigate({ status: "all", q: "", from: "", to: "" })}
                    size="sm"
                    variant="ghost"
                  >
                    Clear all
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {outbox.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                <span className="text-muted-foreground/25">
                  <Envelope size={40} weight="duotone" />
                </span>
                <div>
                  <p className="text-sm font-medium text-base-content">
                    {filtersActive ? "No emails match" : "No emails yet"}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {filtersActive
                      ? "Try a different search, status, or date range."
                      : "Emails will appear here once the queue starts processing."}
                  </p>
                </div>
              </div>
            ) : (
              <TooltipProvider delayDuration={200}>
                <Table className="w-full table-fixed text-sm">
                  <TableHeader>
                    <TableRow className="border-b border-base-300 bg-base-200/40">
                      <TableHead className="w-[28%] px-5 py-3 text-left text-xs font-semibold uppercase tracking-ui text-muted-foreground">
                        Recipient
                      </TableHead>
                      <TableHead className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-ui text-muted-foreground">
                        Subject
                      </TableHead>
                      <TableHead className="w-[104px] px-4 py-3 text-left text-xs font-semibold uppercase tracking-ui text-muted-foreground">
                        Status
                      </TableHead>
                      <TableHead className="w-[88px] px-4 py-3 text-left text-xs font-semibold uppercase tracking-ui text-muted-foreground">
                        Attempts
                      </TableHead>
                      <TableHead className="w-[120px] px-4 py-3 text-left text-xs font-semibold uppercase tracking-ui text-muted-foreground">
                        Sent At
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {outbox.map((email) => {
                      const sentAt = email.sentAt
                        ? formatDate(email.sentAt)
                        : null;
                      const friendlySubject = getFriendlySubject(
                        email.payload.subject
                      );
                      return (
                        <TableRow
                          className="border-b border-base-300 transition-colors hover:bg-base-200/20 last:border-0"
                          key={email.id}
                        >
                          {/* Recipient */}
                          <TableCell className="px-5 py-3">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <p className="truncate text-sm">
                                  {email.payload.to}
                                </p>
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs break-all">
                                {email.payload.to}
                              </TooltipContent>
                            </Tooltip>
                          </TableCell>

                          {/* Subject */}
                          <TableCell className="px-4 py-3">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <p className="truncate text-sm font-medium">
                                  {friendlySubject}
                                </p>
                              </TooltipTrigger>
                              <TooltipContent className="max-w-sm break-words">
                                {email.payload.subject}
                              </TooltipContent>
                            </Tooltip>
                            {friendlySubject !== email.payload.subject && (
                              <p className="mt-0.5 truncate text-xs text-muted-foreground/60">
                                {email.payload.subject}
                              </p>
                            )}
                          </TableCell>

                          {/* Status */}
                          <TableCell className="px-4 py-3">
                            <StatusBadge status={email.status} />
                          </TableCell>

                          {/* Attempts */}
                          <TableCell className="px-4 py-3">
                            <span className="text-sm tabular-nums text-muted-foreground">
                              {email.attemptCount}
                            </span>
                          </TableCell>

                          {/* Sent At */}
                          <TableCell className="px-4 py-3 text-xs text-muted-foreground">
                            {sentAt ? (
                              <>
                                <p>{sentAt.date}</p>
                                <p className="text-muted-foreground/60">
                                  {sentAt.time}
                                </p>
                              </>
                            ) : (
                              <span className="text-muted-foreground/40">
                                —
                              </span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TooltipProvider>
            )}

            {/* Pagination */}
            {outboxTotalPages > 1 && (
              <div className="flex items-center justify-between border-t border-base-300 px-5 py-3">
                <p className="text-xs text-muted-foreground">
                  Page{" "}
                  <span className="font-semibold text-base-content">
                    {outboxPage}
                  </span>{" "}
                  of {outboxTotalPages}
                </p>
                <Pagination className="mx-0 w-auto">
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        aria-disabled={outboxPage <= 1}
                        className={
                          outboxPage <= 1
                            ? "pointer-events-none opacity-40"
                            : ""
                        }
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          if (outboxPage > 1) {
                            goToPage(outboxPage - 1);
                          }
                        }}
                      />
                    </PaginationItem>
                    {paginationRange(outboxPage, outboxTotalPages).map(
                      (p, i) =>
                        p === "ellipsis" ? (
                          <PaginationItem key={`e-${i}`}>
                            <PaginationEllipsis />
                          </PaginationItem>
                        ) : (
                          <PaginationItem key={p}>
                            <PaginationLink
                              href="#"
                              isActive={p === outboxPage}
                              onClick={(e) => {
                                e.preventDefault();
                                goToPage(p);
                              }}
                            >
                              {p}
                            </PaginationLink>
                          </PaginationItem>
                        )
                    )}
                    <PaginationItem>
                      <PaginationNext
                        aria-disabled={outboxPage >= outboxTotalPages}
                        className={
                          outboxPage >= outboxTotalPages
                            ? "pointer-events-none opacity-40"
                            : ""
                        }
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          if (outboxPage < outboxTotalPages) {
                            goToPage(outboxPage + 1);
                          }
                        }}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Events — 1/3 width */}
        <Card>
          <CardHeader className="py-4">
            <CardTitle className="text-base font-semibold">Events</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {events.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                <span className="text-muted-foreground/25">
                  <EnvelopeSimple size={40} weight="duotone" />
                </span>
                <div>
                  <p className="text-sm font-medium text-base-content">
                    No email events yet
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                    SMTP delivery, opens, bounces
                    <br />
                    and complaints will appear here.
                  </p>
                </div>
              </div>
            ) : (
              <div>
                {events.map((event) => {
                  const received = formatDate(event.receivedAt);
                  return (
                    <div
                      className="flex items-start justify-between gap-4 border-b border-base-300 px-5 py-3 last:border-0"
                      key={event.id}
                    >
                      <div className="min-w-0">
                        <EventTypeBadge type={event.eventType} />
                        {event.recipient && (
                          <p className="mt-1 truncate text-xs text-muted-foreground max-w-[160px]">
                            {event.recipient}
                          </p>
                        )}
                      </div>
                      <div className="shrink-0 text-right text-xs text-muted-foreground">
                        <p>{received.date}</p>
                        <p className="text-muted-foreground/60">
                          {received.time}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
