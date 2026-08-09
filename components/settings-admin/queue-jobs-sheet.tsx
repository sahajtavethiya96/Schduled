"use client";

import {
  ArrowClockwise,
  ClockCounterClockwise,
  MagnifyingGlass,
  Stack,
  WarningCircle,
} from "@phosphor-icons/react";
import { format, formatDistanceToNow } from "date-fns";
import { useEffect, useState, useTransition } from "react";
import {
  getQueueJobsAction,
  getQueueStatsAction,
  retryJobAction,
} from "@/app/actions/queues";
import {
  getFriendlyName,
  getQueueDescription,
  StateBadge,
} from "@/components/settings-admin/queue-format";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import type { QueueJobRow, QueueStats } from "@/lib/worker/queue-inspection";

// Tab key === pg-boss state value ("all" means no filter).
const TABS: { key: string; label: string }[] = [
  { key: "all", label: "All" },
  { key: "failed", label: "Failed" },
  { key: "active", label: "Running" },
  { key: "created", label: "Queued" },
  { key: "completed", label: "Completed" },
];

interface JobOutput {
  cause?: { code?: string; name?: string; message?: string; stack?: string };
  message?: string;
  name?: string;
  params?: unknown;
  query?: string;
  stack?: string;
}

function asOutput(output: unknown): JobOutput | null {
  if (output && typeof output === "object") {
    return output as JobOutput;
  }
  return null;
}

function errorSummary(output: unknown): string | null {
  const o = asOutput(output);
  if (!o) {
    return null;
  }
  return o.cause?.message ?? o.message ?? o.name ?? null;
}

function fmtAbs(ts: string | null): string {
  if (!ts) {
    return "—";
  }
  const d = new Date(ts);
  return Number.isNaN(d.getTime()) ? "—" : format(d, "MMM d, yyyy HH:mm:ss");
}

function fmtRel(ts: string | null): string {
  if (!ts) {
    return "—";
  }
  const d = new Date(ts);
  return Number.isNaN(d.getTime())
    ? "—"
    : formatDistanceToNow(d, { addSuffix: true });
}

function duration(start: string | null, end: string | null): string | null {
  if (!(start && end)) {
    return null;
  }
  const ms = new Date(end).getTime() - new Date(start).getTime();
  if (Number.isNaN(ms) || ms < 0) {
    return null;
  }
  if (ms < 1000) {
    return `${ms}ms`;
  }
  const s = ms / 1000;
  if (s < 60) {
    return `${s.toFixed(s < 10 ? 2 : 1)}s`;
  }
  const m = Math.floor(s / 60);
  return `${m}m ${Math.round(s % 60)}s`;
}

function jsonString(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

export function QueueJobsSheet({
  queue,
  onOpenChange,
}: {
  queue: { name: string; state: string } | null;
  onOpenChange: (open: boolean) => void;
}) {
  const [activeTab, setActiveTab] = useState("all");
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<QueueJobRow[]>([]);
  const [total, setTotal] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [stats, setStats] = useState<QueueStats | null>(null);
  const [detailJob, setDetailJob] = useState<QueueJobRow | null>(null);
  const [isPending, startTransition] = useTransition();

  const queueName = queue?.name ?? null;

  // Re-initialise whenever a different queue is opened.
  useEffect(() => {
    if (!queue) {
      return;
    }
    const initial = TABS.some((t) => t.key === queue.state)
      ? queue.state
      : "all";
    setActiveTab(initial);
    setSearchInput("");
    setSearchTerm("");
    setPage(1);
  }, [queue]);

  // Debounce the search box.
  useEffect(() => {
    const id = setTimeout(() => {
      setSearchTerm(searchInput);
      setPage(1);
    }, 300);
    return () => clearTimeout(id);
  }, [searchInput]);

  function reload() {
    if (!queueName) {
      return;
    }
    startTransition(async () => {
      const [jobs, freshStats] = await Promise.all([
        getQueueJobsAction({
          queue: queueName,
          state: activeTab,
          search: searchTerm,
          page,
        }),
        getQueueStatsAction(queueName),
      ]);
      setRows(jobs.rows);
      setTotal(jobs.total);
      setPageSize(jobs.pageSize);
      setStats(freshStats);
    });
  }

  // Fetch on every queue / filter / search / page change.
  // biome-ignore lint/correctness/useExhaustiveDependencies: reload reads latest state via closure each render
  useEffect(() => {
    reload();
  }, [queueName, activeTab, searchTerm, page]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);

  const stateCount = (state: string) =>
    stats?.states.find((s) => s.state === state)?.count ?? 0;
  const completedCount = stateCount("completed");
  const failedCount = stateCount("failed");
  const totalJobs = stats?.total ?? 0;
  const successRate =
    totalJobs > 0 ? Math.round((completedCount / totalJobs) * 100) : 0;

  return (
    <>
      <Sheet onOpenChange={onOpenChange} open={queue !== null}>
        <SheetContent className="w-full gap-0 p-0 data-[side=right]:sm:max-w-[30.6rem]">
          {/* ── Header ───────────────────────────────────────────────── */}
          <SheetHeader className="gap-1 border-b border-base-300 p-6 pr-14">
            <SheetTitle>
              {queue ? getFriendlyName(queue.name) : "Queue"}
            </SheetTitle>
            <SheetDescription>
              {queue ? getQueueDescription(queue.name) : ""}
            </SheetDescription>
            <p className="mt-1 font-mono text-xs text-muted-foreground/70">
              {queue?.name}
            </p>

            <div className="mt-4 grid grid-cols-4 gap-px border border-base-300 bg-base-300">
              <HeaderStat label="Total" value={totalJobs.toLocaleString()} />
              <HeaderStat
                danger={failedCount > 0}
                label="Failed"
                value={failedCount.toLocaleString()}
              />
              <HeaderStat label="Success" value={`${successRate}%`} />
              <HeaderStat
                label="Last run"
                small
                value={
                  stats?.lastProcessedOn
                    ? formatDistanceToNow(new Date(stats.lastProcessedOn))
                    : "—"
                }
              />
            </div>
          </SheetHeader>

          {/* ── Search + filter tabs ─────────────────────────────────── */}
          <div className="space-y-3 border-b border-base-300 px-6 py-3">
            <div className="relative">
              <MagnifyingGlass
                className="-translate-y-1/2 absolute top-1/2 left-2.5 text-muted-foreground"
                size={15}
              />
              <Input
                className="h-9 pl-8 text-sm"
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search job ID or error…"
                value={searchInput}
              />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {TABS.map((tab) => (
                <FilterTab
                  active={activeTab === tab.key}
                  count={tab.key === "all" ? totalJobs : stateCount(tab.key)}
                  key={tab.key}
                  label={tab.label}
                  onClick={() => {
                    setActiveTab(tab.key);
                    setPage(1);
                  }}
                />
              ))}
            </div>
          </div>

          {/* ── Job cards ────────────────────────────────────────────── */}
          <div className="flex-1 space-y-2.5 overflow-y-auto p-4">
            {isPending && rows.length === 0 ? (
              <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
                <ArrowClockwise className="animate-spin" size={16} />
                Loading jobs…
              </div>
            ) : rows.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                <span className="text-muted-foreground/25">
                  <Stack size={40} weight="duotone" />
                </span>
                <p className="text-sm font-medium text-base-content">
                  No jobs found
                </p>
                <p className="text-xs text-muted-foreground">
                  {searchTerm
                    ? "Try a different search term."
                    : "Nothing in this filter."}
                </p>
              </div>
            ) : (
              rows.map((job) => (
                <JobCard
                  job={job}
                  key={job.id}
                  onView={() => setDetailJob(job)}
                />
              ))
            )}
          </div>

          {/* ── Pagination ───────────────────────────────────────────── */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between gap-3 border-t border-base-300 px-6 py-3">
              <p className="text-xs text-muted-foreground">
                Page {safePage} of {totalPages} · {total} jobs
              </p>
              <Pagination className="mx-0 w-auto">
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      aria-disabled={safePage <= 1}
                      className={
                        safePage <= 1 ? "pointer-events-none opacity-40" : ""
                      }
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        if (safePage > 1) {
                          setPage(safePage - 1);
                        }
                      }}
                    />
                  </PaginationItem>
                  <PaginationItem>
                    <PaginationNext
                      aria-disabled={safePage >= totalPages}
                      className={
                        safePage >= totalPages
                          ? "pointer-events-none opacity-40"
                          : ""
                      }
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        if (safePage < totalPages) {
                          setPage(safePage + 1);
                        }
                      }}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <JobDetailDialog
        job={detailJob}
        onClose={() => setDetailJob(null)}
        onRetried={() => {
          setDetailJob(null);
          reload();
        }}
        queueName={queueName}
      />
    </>
  );
}

function HeaderStat({
  label,
  value,
  danger = false,
  small = false,
}: {
  label: string;
  value: string;
  danger?: boolean;
  small?: boolean;
}) {
  return (
    <div className="bg-popover px-3 py-2">
      <p className="text-2xs font-semibold uppercase tracking-ui text-muted-foreground">
        {label}
      </p>
      <p
        className={cn(
          "mt-0.5 font-heading font-bold tabular-nums",
          small ? "text-sm" : "text-lg",
          danger && "text-error"
        )}
      >
        {value}
      </p>
    </div>
  );
}

function FilterTab({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className={cn(
        "inline-flex items-center gap-1.5 border px-2.5 py-1 text-xs font-semibold transition-colors",
        active
          ? "border-primary bg-primary/10 text-primary"
          : "border-base-300 text-muted-foreground hover:bg-base-200"
      )}
      onClick={onClick}
      type="button"
    >
      {label}
      <span className="tabular-nums opacity-70">{count}</span>
    </button>
  );
}

function JobCard({ job, onView }: { job: QueueJobRow; onView: () => void }) {
  const summary = errorSummary(job.output);
  return (
    <button
      className="block w-full border border-base-300 bg-base-200/20 p-3.5 text-left transition-colors hover:bg-base-200/40"
      onClick={onView}
      type="button"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <StateBadge state={job.state} />
          <span className="truncate font-mono text-xs text-muted-foreground">
            {job.id.slice(0, 8)}
          </span>
        </div>
        <span className="whitespace-nowrap text-xs text-muted-foreground">
          {fmtRel(job.createdOn)}
        </span>
      </div>

      {job.retryCount > 0 && (
        <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
          <ClockCounterClockwise size={13} />
          Retried {job.retryCount}/{job.retryLimit}
        </p>
      )}

      {summary && (
        <p className="mt-2 flex items-start gap-1.5 text-sm text-error">
          <WarningCircle className="mt-0.5 shrink-0" size={15} />
          <span className="line-clamp-2">{summary}</span>
        </p>
      )}

      <div className="mt-3 flex justify-end">
        <span className="text-xs font-semibold uppercase tracking-ui text-primary">
          View details →
        </span>
      </div>
    </button>
  );
}

function JobDetailDialog({
  job,
  queueName,
  onClose,
  onRetried,
}: {
  job: QueueJobRow | null;
  queueName: string | null;
  onClose: () => void;
  onRetried: () => void;
}) {
  const [isRetrying, startRetry] = useTransition();
  const o = job ? asOutput(job.output) : null;
  const dur = job ? duration(job.startedOn, job.completedOn) : null;
  const payload = job ? jsonString(job.data) : null;
  const rawOutput = job ? jsonString(job.output) : null;
  const params = o?.params === undefined ? null : jsonString(o.params);
  const canRetry =
    job !== null && ["failed", "cancelled"].includes(job.state);

  function handleRetry() {
    if (!(job && queueName)) {
      return;
    }
    startRetry(async () => {
      await retryJobAction({ queue: queueName, jobId: job.id });
      onRetried();
    });
  }

  return (
    <Dialog onOpenChange={(open) => !open && onClose()} open={job !== null}>
      <DialogContent className="max-h-[85vh] gap-4 overflow-y-auto sm:max-w-6xl">
        <DialogHeader>
          <DialogTitle>Job Details</DialogTitle>
          <DialogDescription className="font-mono text-xs">
            {job?.id}
          </DialogDescription>
        </DialogHeader>

        {job && (
          <div className="space-y-4">
            {/* Meta grid */}
            <div className="grid grid-cols-2 gap-px border border-base-300 bg-base-300 sm:grid-cols-3">
              <MetaCell label="Status">
                <StateBadge state={job.state} />
              </MetaCell>
              <MetaCell label="Retries">
                {job.retryCount}/{job.retryLimit}
              </MetaCell>
              <MetaCell label="Duration">{dur ?? "—"}</MetaCell>
              <MetaCell label="Created">{fmtAbs(job.createdOn)}</MetaCell>
              <MetaCell label="Started">{fmtAbs(job.startedOn)}</MetaCell>
              <MetaCell label="Completed">{fmtAbs(job.completedOn)}</MetaCell>
            </div>

            {o?.message && <Field label="Error message">{o.message}</Field>}
            {(o?.cause?.message || o?.cause?.code) && (
              <Field label="Cause">
                {o?.cause?.code ? `[${o.cause.code}] ` : ""}
                {o?.cause?.message}
              </Field>
            )}
            {o?.query && (
              <Field label="Failed query" mono>
                {o.query}
              </Field>
            )}
            {params && (
              <Field label="Params" mono>
                {params}
              </Field>
            )}
            {(o?.stack || o?.cause?.stack) && (
              <Field label="Stack trace" mono>
                {o?.stack ?? o?.cause?.stack}
              </Field>
            )}
            {payload && (
              <Field label="Payload" mono>
                {payload}
              </Field>
            )}
            {rawOutput && (
              <Field label="Output" mono>
                {rawOutput}
              </Field>
            )}

            {canRetry && (
              <div className="flex justify-end border-t border-base-300 pt-4">
                <Button
                  className="gap-1.5"
                  disabled={isRetrying}
                  onClick={handleRetry}
                  size="sm"
                  variant="outline"
                >
                  <ArrowClockwise
                    className={isRetrying ? "animate-spin" : ""}
                    size={14}
                  />
                  {isRetrying ? "Re-queuing…" : "Retry job"}
                </Button>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function MetaCell({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-popover px-3 py-2">
      <p className="text-2xs font-semibold uppercase tracking-ui text-muted-foreground">
        {label}
      </p>
      <div className="mt-1 text-sm tabular-nums">{children}</div>
    </div>
  );
}

function Field({
  label,
  children,
  mono = false,
}: {
  label: string;
  children: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div>
      <p className="mb-1 text-xs font-semibold uppercase tracking-ui text-muted-foreground">
        {label}
      </p>
      <pre
        className={cn(
          "max-h-60 overflow-auto whitespace-pre-wrap wrap-break-word border border-base-300 bg-base-200/40 p-3 text-xs",
          mono ? "font-mono" : "font-sans text-sm"
        )}
      >
        {children}
      </pre>
    </div>
  );
}
