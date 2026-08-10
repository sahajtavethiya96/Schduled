"use client";

import {
  CalendarPlus,
  CheckCircle,
  ClockCounterClockwise,
  Envelope,
  Export,
  type Icon,
  PencilSimple,
  Prohibit,
  SignIn,
  SignOut,
  UserPlus,
} from "@phosphor-icons/react";
import { format, isThisYear, isToday, isYesterday } from "date-fns";
import { useTransition } from "react";
import { toast } from "sonner";
import {
  type ExportAuditRow,
  exportAuditLogsAction,
} from "@/app/actions/audit";
import { Button } from "@/components/ui/button";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import type { AuditFilters } from "@/lib/audit-query";
import { cn, paginationRange } from "@/lib/utils";
import { AuditFilters as AuditFiltersBar } from "./audit-filters";

// ── Types ─────────────────────────────────────────────────────────────────────

export type AuditRow = {
  id: string;
  action: string;
  actorId: string | null;
  actorEmail: string | null;
  entityType: string;
  entityId: string | null;
  description: string;
  metadata: Record<string, unknown> | null;
  createdAt: string; // ISO string — serialized from server
};

// ── Action labels ─────────────────────────────────────────────────────────────

const ACTION_LABELS: Record<string, string> = {
  "auth.magic_link_sent": "Magic Link Sent",
  "auth.login": "User Logged In",
  "auth.logout": "User Logged Out",
  "auth.session_created": "Session Created",
  "profile.session_revoked": "Session Revoked",
  "profile.data_exported": "Profile Exported",
  "profile.updated": "Profile Updated",
  "profile.password_changed": "Password Changed",
  "orbit.user_role_updated": "Role Updated",
  "orbit.user_suspended": "User Suspended",
  "orbit.user_reactivated": "User Reactivated",
  "orbit.user_deleted": "User Deleted",
  "orbit.impersonation_start": "Impersonation Started",
  "booking.created": "Booking Created",
  "booking.cancelled": "Booking Cancelled",
  "booking.rescheduled": "Booking Rescheduled",
  "event_type.created": "Event Type Created",
  "event_type.updated": "Event Type Updated",
  "event_type.deleted": "Event Type Deleted",
  "email.sent": "Email Sent",
  "email.failed": "Email Failed",
  "calendar.connected": "Calendar Connected",
  "calendar.disconnected": "Calendar Disconnected",
  "video.connected": "Video Integration Connected",
};

function getFriendlyLabel(action: string): string {
  if (ACTION_LABELS[action]) {
    return ACTION_LABELS[action];
  }
  const parts = action.split(".");
  const raw = parts[parts.length - 1] ?? action;
  return raw
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function EntityBadge({ type }: { type: string }) {
  return (
    <span className="inline-flex items-center rounded-none border border-base-300 bg-base-200 px-2 py-0.5 text-xs font-semibold uppercase tracking-ui text-muted-foreground">
      {type.replace(/_/g, " ")}
    </span>
  );
}

// Semantic icon + colour per action — positive (green), negative/neutral
// (muted), destructive (red). Order matters: check "deactivat"/"suspend"
// before "activat"/"creat" (substring overlap), mirroring the same
// categorization already used on the member-detail activity timeline.
function getAuditMeta(action: string): { icon: Icon; colorClass: string } {
  const a = action.toLowerCase();
  if (a.includes("user") && a.includes("creat")) {
    return { icon: UserPlus, colorClass: "bg-primary/10 text-primary" };
  }
  if (a.includes("logout") || a.includes("sign_out")) {
    return { icon: SignOut, colorClass: "bg-amber-500/10 text-amber-600" };
  }
  if (a.includes("login") || a.includes("sign_in")) {
    return { icon: SignIn, colorClass: "bg-success/10 text-success" };
  }
  if (a.includes("event_type") || a.includes("meeting")) {
    return { icon: CalendarPlus, colorClass: "bg-primary/10 text-primary" };
  }
  if (a.includes("email")) {
    return { icon: Envelope, colorClass: "bg-primary/10 text-primary" };
  }
  if (a.includes("ban") || a.includes("suspend") || a.includes("delet")) {
    return { icon: Prohibit, colorClass: "bg-error/10 text-error" };
  }
  if (a.includes("profile") || a.includes("updat")) {
    return {
      icon: PencilSimple,
      colorClass: "bg-base-200 text-muted-foreground",
    };
  }
  if (
    a.includes("creat") ||
    a.includes("activat") ||
    a.includes("connect") ||
    a.includes("reactivat")
  ) {
    return { icon: CheckCircle, colorClass: "bg-success/10 text-success" };
  }
  return {
    icon: ClockCounterClockwise,
    colorClass: "bg-base-200 text-muted-foreground",
  };
}

// Groups already-sorted (newest-first) rows into consecutive same-day
// buckets — cheap enough to do per-render at this page size (max 15 rows).
function groupByDay(logs: AuditRow[]): { label: string; rows: AuditRow[] }[] {
  const groups: { label: string; rows: AuditRow[] }[] = [];
  for (const log of logs) {
    const d = new Date(log.createdAt);
    const label = isToday(d)
      ? "Today"
      : isYesterday(d)
        ? "Yesterday"
        : isThisYear(d)
          ? format(d, "MMMM d")
          : format(d, "MMMM d, yyyy");
    const last = groups[groups.length - 1];
    if (last && last.label === label) {
      last.rows.push(log);
    } else {
      groups.push({ label, rows: [log] });
    }
  }
  return groups;
}

// ── Export ────────────────────────────────────────────────────────────────────

function buildCSV(rows: ExportAuditRow[]): string {
  const headers = [
    "Action",
    "Actor",
    "Entity Type",
    "Entity ID",
    "Description",
    "IP",
    "Date",
  ];
  const lines = rows.map((r) => [
    getFriendlyLabel(r.action),
    r.actorEmail ?? "System",
    r.entityType,
    r.entityId ?? "",
    r.description,
    (r.metadata?.ip as string) ?? "",
    format(new Date(r.createdAt), "yyyy-MM-dd HH:mm:ss"),
  ]);
  return [headers, ...lines]
    .map((row) =>
      row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")
    )
    .join("\n");
}

function downloadBlob(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Main component ────────────────────────────────────────────────────────────

export function AuditTable({
  logs,
  total,
  page,
  totalPages,
  entityTypes,
  filters,
}: {
  logs: AuditRow[];
  total: number;
  page: number;
  totalPages: number;
  entityTypes: string[];
  filters: AuditFilters;
}) {
  const [exporting, startExport] = useTransition();

  function pageHref(p: number) {
    const params = new URLSearchParams();
    if (filters.search) {
      params.set("q", filters.search);
    }
    if (filters.category !== "all") {
      params.set("category", filters.category);
    }
    if (filters.entityType !== "all") {
      params.set("entity", filters.entityType);
    }
    if (filters.dateRange !== "all") {
      params.set("dateRange", filters.dateRange);
    }
    if (filters.customFrom) {
      params.set("from", filters.customFrom);
    }
    if (filters.customTo) {
      params.set("to", filters.customTo);
    }
    if (p > 1) {
      params.set("page", String(p));
    }
    const qs = params.toString();
    return qs ? `/settings/audit?${qs}` : "/settings/audit";
  }

  function runExport(format: "csv" | "json") {
    startExport(async () => {
      const { rows, truncated } = await exportAuditLogsAction(filters);
      if (truncated) {
        toast.warning(
          `Export capped at ${rows.length} rows — narrow the date range for more.`
        );
      }
      const todayStamp = new Date().toISOString().slice(0, 10);
      if (format === "csv") {
        downloadBlob(
          buildCSV(rows),
          `audit-logs-${todayStamp}.csv`,
          "text/csv"
        );
      } else {
        const data = rows.map((r) => ({
          action: r.action,
          friendlyAction: getFriendlyLabel(r.action),
          actor: r.actorEmail ?? "System",
          entityType: r.entityType,
          entityId: r.entityId,
          description: r.description,
          ip: (r.metadata?.ip as string) ?? null,
          timestamp: r.createdAt,
        }));
        downloadBlob(
          JSON.stringify(data, null, 2),
          `audit-logs-${todayStamp}.json`,
          "application/json"
        );
      }
    });
  }

  return (
    <div>
      {/* ── Toolbar ───────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 border-b border-base-300 p-4 lg:flex-row lg:items-start lg:justify-between">
        <AuditFiltersBar
          category={filters.category}
          customFrom={filters.customFrom}
          customTo={filters.customTo}
          dateRange={filters.dateRange}
          entityType={filters.entityType}
          entityTypes={entityTypes}
        />

        <div className="flex items-center gap-2">
          <Button
            className="h-9 gap-1.5 text-xs"
            disabled={exporting}
            onClick={() => runExport("csv")}
            size="sm"
            variant="outline"
          >
            <Export size={14} />
            Export CSV
          </Button>
          <Button
            className="h-9 gap-1.5 text-xs"
            disabled={exporting}
            onClick={() => runExport("json")}
            size="sm"
            variant="outline"
          >
            <Export size={14} />
            Export JSON
          </Button>
        </div>
      </div>

      {/* ── Timeline ──────────────────────────────────────────────────── */}
      {logs.length === 0 ? (
        <div className="px-6 py-16 text-center">
          <p className="text-sm text-muted-foreground">
            No audit logs match your filters.
          </p>
        </div>
      ) : (
        <div className="px-6 py-5">
          {groupByDay(logs).map((group) => (
            <div className="mb-6 last:mb-0" key={group.label}>
              <p className="mb-3 text-xs font-bold uppercase tracking-ui text-muted-foreground/70">
                {group.label}
              </p>
              <ol>
                {group.rows.map((log, i) => {
                  const { icon: EventIcon, colorClass } = getAuditMeta(
                    log.action
                  );
                  return (
                    <li
                      className="relative flex gap-4 pb-5 last:pb-0"
                      key={log.id}
                    >
                      {i < group.rows.length - 1 && (
                        <span
                          aria-hidden
                          className="absolute left-[15px] top-8 h-full w-px bg-base-300"
                        />
                      )}
                      <span
                        className={cn(
                          "relative z-10 flex size-8 shrink-0 items-center justify-center",
                          colorClass
                        )}
                      >
                        <EventIcon size={14} weight="bold" />
                      </span>
                      <div className="min-w-0 flex-1 pt-1">
                        <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-sm font-semibold">
                                {getFriendlyLabel(log.action)}
                              </p>
                              <EntityBadge type={log.entityType} />
                            </div>
                            <p className="mt-0.5 text-sm text-muted-foreground">
                              {log.actorEmail ?? "System"}
                              {log.description ? ` — ${log.description}` : ""}
                            </p>
                          </div>
                          <p className="shrink-0 whitespace-nowrap text-xs text-muted-foreground">
                            {format(new Date(log.createdAt), "h:mm a")}
                          </p>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </div>
          ))}
        </div>
      )}

      {/* Row count + pagination */}
      <div className="flex items-center justify-between gap-3 border-t border-base-300 px-6 py-3">
        <p className="text-xs text-muted-foreground">
          Page {page} of {totalPages} · {total} log{total === 1 ? "" : "s"}
        </p>
        {totalPages > 1 && (
          <Pagination className="mx-0 w-auto">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  aria-disabled={page <= 1}
                  className={page <= 1 ? "pointer-events-none opacity-40" : ""}
                  href={page > 1 ? pageHref(page - 1) : "#"}
                />
              </PaginationItem>
              {paginationRange(page, totalPages).map((p, i) =>
                p === "ellipsis" ? (
                  <PaginationItem key={`e-${i}`}>
                    <PaginationEllipsis />
                  </PaginationItem>
                ) : (
                  <PaginationItem key={p}>
                    <PaginationLink href={pageHref(p)} isActive={p === page}>
                      {p}
                    </PaginationLink>
                  </PaginationItem>
                )
              )}
              <PaginationItem>
                <PaginationNext
                  aria-disabled={page >= totalPages}
                  className={
                    page >= totalPages ? "pointer-events-none opacity-40" : ""
                  }
                  href={page < totalPages ? pageHref(page + 1) : "#"}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        )}
      </div>
    </div>
  );
}
