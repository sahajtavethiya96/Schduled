"use client";

import {
  ArrowClockwise,
  CheckCircle,
  Cpu,
  MagnifyingGlass,
  Stack,
  XCircle,
} from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { paginationRange } from "@/lib/utils";

const PAGE_SIZE = 10;

import { retryFailedJobsAction } from "@/app/actions/queues";
import {
  getFriendlyName,
  StateBadge,
} from "@/components/settings-admin/queue-format";
import { QueueJobsSheet } from "@/components/settings-admin/queue-jobs-sheet";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { QueueSummaryRow } from "@/lib/worker/queue-inspection";

// ── Retry button ──────────────────────────────────────────────────────────────

function RetryButton({ queueName }: { queueName: string }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleRetry() {
    startTransition(async () => {
      await retryFailedJobsAction(queueName);
      router.refresh();
    });
  }

  return (
    <Button
      className="h-7 gap-1.5 border-error/30 text-xs text-error hover:bg-error/10"
      disabled={isPending}
      onClick={handleRetry}
      size="sm"
      variant="outline"
    >
      <ArrowClockwise className={isPending ? "animate-spin" : ""} size={12} />
      {isPending ? "Retrying…" : "Retry Failed"}
    </Button>
  );
}

// ── Stat cards ────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  icon,
  accent = false,
  danger = false,
}: {
  label: string;
  value: string | number;
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

type WorkerStatus = "running" | "idle" | "stopped";

function WorkerStatusCard({ status }: { status: WorkerStatus }) {
  const cfg = {
    running: {
      label: "Running",
      textCls: "text-success",
      dotCls: "bg-success",
      cardCls: "border-success/30 bg-success/[0.03]",
    },
    idle: {
      label: "Idle",
      textCls: "text-primary",
      dotCls: "bg-primary",
      cardCls: "border-primary/30 bg-primary/[0.03]",
    },
    stopped: {
      label: "Stopped",
      textCls: "text-error",
      dotCls: "bg-error",
      cardCls: "border-error/30 bg-error/[0.03]",
    },
  }[status];

  return (
    <Card className={cfg.cardCls}>
      <CardContent className="px-5 pb-4 pt-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-ui text-muted-foreground">
              Worker Status
            </p>
            <div className="mt-1.5 flex items-center gap-2">
              <span className={`h-2.5 w-2.5 rounded-full ${cfg.dotCls}`} />
              <p className={`font-heading text-2xl font-bold ${cfg.textCls}`}>
                {cfg.label}
              </p>
            </div>
          </div>
          <span className={cfg.textCls}>
            <Cpu size={20} weight="duotone" />
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

function QueueOverviewCard({
  name,
  failed,
  active,
  pending,
}: {
  name: string;
  failed: number;
  active: number;
  pending: number;
}) {
  const status =
    failed > 0
      ? {
          label: `${failed} Failed`,
          cls: "text-error",
          dot: "bg-error",
          border: "border-error/25",
        }
      : active > 0
        ? {
            label: `${active} Running`,
            cls: "text-primary",
            dot: "bg-primary",
            border: "border-primary/25",
          }
        : pending > 0
          ? {
              label: `${pending} Pending`,
              cls: "text-amber-600 dark:text-amber-500",
              dot: "bg-amber-500",
              border: "border-amber-500/25",
            }
          : {
              label: "Healthy",
              cls: "text-success",
              dot: "bg-success",
              border: "border-success/20",
            };

  return (
    <div className={`flex flex-col gap-2 border p-3.5 ${status.border}`}>
      <p className="truncate text-sm font-medium text-base-content">{name}</p>
      <span
        className={`flex items-center gap-1.5 text-xs font-semibold ${status.cls}`}
      >
        <span className={`size-1.5 rounded-full ${status.dot}`} />
        {status.label}
      </span>
    </div>
  );
}

// ── Timer helpers ─────────────────────────────────────────────────────────────

function formatSecondsAgo(s: number): string {
  if (s < 60) {
    return `${s}s ago`;
  }
  if (s < 3600) {
    return `${Math.floor(s / 60)}m ago`;
  }
  return `${Math.floor(s / 3600)}h ago`;
}

// ── Filter chip + state labels ──────────────────────────────────────────────────

const STATE_LABELS: Record<string, string> = {
  created: "Queued",
  active: "Running",
  completed: "Completed",
  failed: "Failed",
  retry: "Retrying",
  cancelled: "Cancelled",
};

function stateLabel(state: string): string {
  return STATE_LABELS[state] ?? state.charAt(0).toUpperCase() + state.slice(1);
}

// ── Main component ────────────────────────────────────────────────────────────

export function QueuesClient({
  queues,
  fetchedAt,
}: {
  queues: QueueSummaryRow[];
  fetchedAt: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [secondsAgo, setSecondsAgo] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [stateFilter, setStateFilter] = useState("all");
  const [selected, setSelected] = useState<{
    name: string;
    state: string;
  } | null>(null);
  const router = useRouter();

  // Reset and tick timer whenever fresh data arrives
  // biome-ignore lint/correctness/useExhaustiveDependencies: fetchedAt isn't read in the body but must stay — it's the trigger that restarts the ticker on fresh data.
  useEffect(() => {
    setSecondsAgo(0);
    const id = setInterval(() => setSecondsAgo((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [fetchedAt]);

  function handleRefresh() {
    startTransition(() => router.refresh());
  }

  // ── Computed stats ──────────────────────────────────────────────────────
  const { totalQueues, completed, failed, workerStatus } = useMemo(() => {
    const total = new Set(queues.map((q) => q.name)).size;
    const comp = queues
      .filter((q) => q.state === "completed")
      .reduce((s, q) => s + q.count, 0);
    const fail = queues
      .filter((q) => q.state === "failed")
      .reduce((s, q) => s + q.count, 0);
    const ws: WorkerStatus =
      queues.length === 0
        ? "stopped"
        : queues.some((q) => q.state === "active")
          ? "running"
          : "idle";
    return {
      totalQueues: total,
      completed: comp,
      failed: fail,
      workerStatus: ws,
    };
  }, [queues]);

  // ── Sort: app queues first, internal at bottom ──────────────────────────
  const sorted = useMemo(
    () =>
      [...queues].sort((a, b) => {
        const aI = a.name.startsWith("__");
        const bI = b.name.startsWith("__");
        if (aI !== bI) {
          return aI ? 1 : -1;
        }
        return a.name.localeCompare(b.name) || a.state.localeCompare(b.state);
      }),
    [queues]
  );

  // States present in the data (for the filter chips).
  const availableStates = useMemo(
    () => Array.from(new Set(queues.map((q) => q.state))).sort(),
    [queues]
  );

  // ── Per-queue overview (compact cards) ───────────────────────────────────
  // Collapses every state row down to one card per queue name, surfacing
  // whichever count is most actionable: failed > running > pending > healthy.
  const queueOverview = useMemo(() => {
    const byName = new Map<
      string,
      { failed: number; active: number; pending: number }
    >();
    for (const q of queues) {
      if (q.name.startsWith("__")) {
        continue; // internal pg-boss queues — noise in a compact summary
      }
      const entry = byName.get(q.name) ?? { failed: 0, active: 0, pending: 0 };
      if (q.state === "failed") {
        entry.failed += q.count;
      } else if (q.state === "active") {
        entry.active += q.count;
      } else if (q.state === "created" || q.state === "retry") {
        entry.pending += q.count;
      }
      byName.set(q.name, entry);
    }
    return Array.from(byName.entries())
      .map(([name, stats]) => ({ name, ...stats }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [queues]);

  // ── Apply search (queue name) + state filter ────────────────────────────
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return sorted.filter((row) => {
      if (stateFilter !== "all" && row.state !== stateFilter) {
        return false;
      }
      if (
        q &&
        !row.name.toLowerCase().includes(q) &&
        !getFriendlyName(row.name).toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [sorted, search, stateFilter]);

  // Reset to page 1 whenever the filter narrows/changes.
  // biome-ignore lint/correctness/useExhaustiveDependencies: reset page on filter change
  useEffect(() => {
    setPage(1);
  }, [search, stateFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE
  );

  return (
    <div className="space-y-8">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-base-content">Job Queues</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            pg-boss queue state grouped by queue name and job state.
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

      {/* ── Summary cards ───────────────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<Stack size={20} weight="duotone" />}
          label="Total Queues"
          value={totalQueues}
        />
        <StatCard
          accent
          icon={<CheckCircle size={20} weight="duotone" />}
          label="Completed Jobs"
          value={completed.toLocaleString()}
        />
        <StatCard
          danger={failed > 0}
          icon={<XCircle size={20} weight="duotone" />}
          label="Failed Jobs"
          value={failed}
        />
        <WorkerStatusCard status={workerStatus} />
      </div>

      {/* ── Per-queue overview ──────────────────────────────────────────── */}
      {queueOverview.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-semibold text-base-content">
            Queue Overview
          </h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {queueOverview.map((q) => (
              <QueueOverviewCard
                key={q.name}
                {...q}
                name={getFriendlyName(q.name)}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Queue details table ──────────────────────────────────────────── */}
      <Card>
        <CardHeader className="flex flex-col gap-3 border-b border-base-300 py-4 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-base font-semibold">
            Queue Details
          </CardTitle>
          {queues.length > 0 && (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="relative sm:w-52">
                <MagnifyingGlass
                  className="-translate-y-1/2 absolute top-1/2 left-2.5 text-muted-foreground"
                  size={15}
                />
                <Input
                  className="h-9 pl-8 text-sm"
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search queue name…"
                  value={search}
                />
              </div>
              <Select onValueChange={setStateFilter} value={stateFilter}>
                <SelectTrigger
                  aria-label="State"
                  className="h-9 w-full text-sm sm:w-40"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All states</SelectItem>
                  {availableStates.map((st) => (
                    <SelectItem key={st} value={st}>
                      {stateLabel(st)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </CardHeader>
        <CardContent className="p-0">
          {queues.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <span className="text-muted-foreground/25">
                <Stack size={40} weight="duotone" />
              </span>
              <div>
                <p className="text-sm font-medium text-base-content">
                  No queue data yet
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Run{" "}
                  <code className="font-mono text-base-content">
                    pnpm worker
                  </code>{" "}
                  or enqueue an email to populate the pg-boss schema.
                </p>
              </div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
              <span className="text-muted-foreground/25">
                <MagnifyingGlass size={36} />
              </span>
              <p className="text-sm font-medium text-base-content">
                No queues match
              </p>
              <p className="text-xs text-muted-foreground">
                Try a different search or filter.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table className="w-full text-sm">
                <TableHeader>
                  <TableRow className="border-b border-base-300 bg-base-200/40">
                    <TableHead className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-ui text-muted-foreground">
                      Queue
                    </TableHead>
                    <TableHead className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-ui text-muted-foreground">
                      State
                    </TableHead>
                    <TableHead className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-ui text-muted-foreground">
                      Jobs
                    </TableHead>
                    <TableHead className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-ui text-muted-foreground">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageRows.map((row) => (
                    <TableRow
                      className="cursor-pointer border-b border-base-300 transition-colors hover:bg-base-200/20 last:border-0"
                      key={`${row.name}:${row.state}`}
                      onClick={() =>
                        setSelected({ name: row.name, state: row.state })
                      }
                    >
                      {/* Queue name */}
                      <TableCell className="px-6 py-3">
                        <p className="text-sm font-medium">
                          {getFriendlyName(row.name)}
                        </p>
                        <p className="mt-0.5 font-mono text-xs text-muted-foreground/60">
                          {row.name}
                        </p>
                      </TableCell>

                      {/* State badge */}
                      <TableCell className="px-4 py-3">
                        <StateBadge state={row.state} />
                      </TableCell>

                      {/* Job count */}
                      <TableCell className="px-4 py-3">
                        <span className="text-sm font-semibold tabular-nums">
                          {row.count.toLocaleString()}
                        </span>
                      </TableCell>

                      {/* Actions */}
                      <TableCell
                        className="px-4 py-3"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {row.state === "failed" ? (
                          <RetryButton queueName={row.name} />
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            —
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between gap-3 border-t border-base-300 px-5 py-3">
              <p className="text-xs text-muted-foreground">
                {filtered.length} rows
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
                  {paginationRange(safePage, totalPages).map((p) =>
                    typeof p === "string" ? (
                      <PaginationItem key={p}>
                        <PaginationEllipsis />
                      </PaginationItem>
                    ) : (
                      <PaginationItem key={p}>
                        <PaginationLink
                          href="#"
                          isActive={p === safePage}
                          onClick={(e) => {
                            e.preventDefault();
                            setPage(p);
                          }}
                        >
                          {p}
                        </PaginationLink>
                      </PaginationItem>
                    )
                  )}
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
        </CardContent>
      </Card>

      <QueueJobsSheet
        onOpenChange={(open) => {
          if (!open) {
            setSelected(null);
          }
        }}
        queue={selected}
      />
    </div>
  );
}
