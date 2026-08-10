import {
  ArrowCounterClockwise,
  CalendarBlank,
  CalendarCheck,
  CalendarX,
  Check,
  EnvelopeOpen,
  EnvelopeSimple,
  Eye,
  Hourglass,
  MagnifyingGlass,
  MapPin,
  Phone,
  Sliders,
  VideoCamera,
  X,
} from "@phosphor-icons/react/dist/ssr";
import { formatInTimeZone } from "date-fns-tz";
import { and, count, desc, eq, gt, gte, ilike, lte, or } from "drizzle-orm";
import Link from "next/link";
import { Suspense } from "react";
import { PageHeader } from "@/components/scaffold/page-header";
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
import { booking, eventType, user } from "@/db/schema";
import { requireSession } from "@/lib/authz";
import { db } from "@/lib/db";
import { cn, paginationRange } from "@/lib/utils";
import { BookingHighlighter } from "./_components/booking-highlighter";
import { BookingsDateFilter } from "./_components/bookings-date-filter";
import { BookingsSearch } from "./_components/bookings-search";

export const metadata = { title: "Bookings" };

type Tab = "upcoming" | "past" | "cancelled" | "pending";

const PLATFORM_META: Record<
  string,
  { label: string; color: string; icon: React.ElementType }
> = {
  zoom: {
    label: "Zoom",
    color: "bg-base-200 text-muted-foreground",
    icon: VideoCamera,
  },
  google_meet: {
    label: "Google Meet",
    color: "bg-primary/10 text-primary",
    icon: VideoCamera,
  },
  teams: {
    label: "Teams",
    color: "bg-purple-500/10 text-purple-600",
    icon: VideoCamera,
  },
  phone_host_calls: {
    label: "Phone",
    color: "bg-base-200 text-muted-foreground",
    icon: Phone,
  },
  phone_invitee_calls: {
    label: "Phone",
    color: "bg-base-200 text-muted-foreground",
    icon: Phone,
  },
  in_person: {
    label: "In-person",
    color: "bg-amber-500/10 text-amber-700",
    icon: MapPin,
  },
  invitees_choice: {
    label: "Flexible",
    color: "bg-base-200 text-muted-foreground",
    icon: VideoCamera,
  },
  custom: {
    label: "Online",
    color: "bg-base-200 text-muted-foreground",
    icon: VideoCamera,
  },
};

import { STATUS_STYLES } from "@/lib/booking-status";

const TAB_DOTS: Record<Tab, string> = {
  upcoming: "bg-primary",
  past: "bg-muted-foreground/60",
  cancelled: "bg-error",
  pending: "bg-amber-500",
};

const PAGE_SIZE = 15;

export default async function BookingsPage({
  searchParams,
}: {
  searchParams: Promise<{
    tab?: string;
    q?: string;
    page?: string;
    dateFrom?: string;
    dateTo?: string;
    highlight?: string;
  }>;
}) {
  const session = await requireSession();
  const {
    tab: rawTab,
    q,
    page: rawPage,
    dateFrom: rawDateFrom,
    dateTo: rawDateTo,
    highlight,
  } = await searchParams;
  const search = q?.trim() ?? "";
  const page = Math.max(1, Number.parseInt(rawPage ?? "1", 10) || 1);
  const dateFrom = rawDateFrom?.match(/^\d{4}-\d{2}-\d{2}$/) ? rawDateFrom : "";
  const dateTo = rawDateTo?.match(/^\d{4}-\d{2}-\d{2}$/) ? rawDateTo : "";

  const [hostRow] = await db
    .select({ timezone: user.timezone })
    .from(user)
    .where(eq(user.id, session.user.id))
    .limit(1);
  const hostTz = hostRow?.timezone ?? "UTC";

  const now = new Date();

  // When opened from a notification (?highlight=<id>) with no explicit tab,
  // resolve the tab from the booking's own status so it lands on the list that
  // actually contains it (e.g. a cancelled booking opens the Cancelled tab).
  let resolvedTab: Tab | null = null;
  if (!rawTab && highlight) {
    const [hb] = await db
      .select({ status: booking.status, startTime: booking.startTime })
      .from(booking)
      .where(
        and(eq(booking.id, highlight), eq(booking.hostUserId, session.user.id))
      )
      .limit(1);
    if (hb) {
      resolvedTab =
        hb.status === "pending" || hb.status === "reschedule_requested"
          ? "pending"
          : hb.status === "cancelled" || hb.status === "rescheduled"
            ? "cancelled"
            : hb.startTime > now
              ? "upcoming"
              : "past";
    }
  }

  const tab: Tab =
    rawTab === "past" ||
    rawTab === "cancelled" ||
    rawTab === "pending" ||
    rawTab === "upcoming"
      ? (rawTab as Tab)
      : (resolvedTab ?? "upcoming");

  // ── Tab counts ───────────────────────────────────────────────────────────────
  const [upcomingCount, pastCount, cancelledCount, pendingCount] =
    await Promise.all([
      db
        .select({ value: count() })
        .from(booking)
        .where(
          and(
            eq(booking.hostUserId, session.user.id),
            eq(booking.status, "confirmed"),
            gt(booking.startTime, now)
          )
        ),
      db
        .select({ value: count() })
        .from(booking)
        .where(
          and(
            eq(booking.hostUserId, session.user.id),
            eq(booking.status, "confirmed"),
            lte(booking.startTime, now)
          )
        ),
      db
        .select({ value: count() })
        .from(booking)
        .where(
          and(
            eq(booking.hostUserId, session.user.id),
            or(
              eq(booking.status, "cancelled"),
              eq(booking.status, "rescheduled")
            )
          )
        ),
      db
        .select({ value: count() })
        .from(booking)
        .where(
          and(
            eq(booking.hostUserId, session.user.id),
            or(
              eq(booking.status, "pending"),
              eq(booking.status, "reschedule_requested")
            )
          )
        ),
    ]);

  const counts = {
    upcoming: upcomingCount[0]?.value ?? 0,
    past: pastCount[0]?.value ?? 0,
    cancelled: cancelledCount[0]?.value ?? 0,
    pending: pendingCount[0]?.value ?? 0,
  };

  // ── Fetch bookings ───────────────────────────────────────────────────────────
  const baseWhere =
    tab === "upcoming"
      ? and(
          eq(booking.hostUserId, session.user.id),
          eq(booking.status, "confirmed"),
          gt(booking.startTime, now)
        )
      : tab === "past"
        ? and(
            eq(booking.hostUserId, session.user.id),
            eq(booking.status, "confirmed"),
            lte(booking.startTime, now)
          )
        : tab === "pending"
          ? and(
              eq(booking.hostUserId, session.user.id),
              or(
                eq(booking.status, "pending"),
                eq(booking.status, "reschedule_requested")
              )
            )
          : and(
              eq(booking.hostUserId, session.user.id),
              or(
                eq(booking.status, "cancelled"),
                eq(booking.status, "rescheduled")
              )
            );

  const dateFromFilter = dateFrom
    ? gte(booking.startTime, new Date(`${dateFrom}T00:00:00`))
    : undefined;
  const dateToFilter = dateTo
    ? lte(booking.startTime, new Date(`${dateTo}T23:59:59`))
    : undefined;
  const searchFilter = search
    ? or(
        ilike(booking.inviteeName, `%${search}%`),
        ilike(booking.inviteeEmail, `%${search}%`)
      )
    : undefined;
  const whereClause = and(
    baseWhere,
    dateFromFilter,
    dateToFilter,
    searchFilter
  );

  const [totalResult, bookings] = await Promise.all([
    db
      .select({ value: count() })
      .from(booking)
      .innerJoin(eventType, eq(booking.eventTypeId, eventType.id))
      .where(whereClause),
    db
      .select({
        id: booking.id,
        inviteeName: booking.inviteeName,
        inviteeEmail: booking.inviteeEmail,
        startTime: booking.startTime,
        endTime: booking.endTime,
        duration: booking.duration,
        status: booking.status,
        locationValue: booking.locationValue,
        cancelToken: booking.cancelToken,
        rescheduleToken: booking.rescheduleToken,
        cancellationReason: booking.cancellationReason,
        approvalToken: booking.approvalToken,
        rejectionReason: booking.rejectionReason,
        rescheduleRequestedStart: booking.rescheduleRequestedStart,
        eventName: eventType.name,
        locationType: eventType.locationType,
        eventColor: eventType.color,
      })
      .from(booking)
      .innerJoin(eventType, eq(booking.eventTypeId, eventType.id))
      .where(whereClause)
      .orderBy(
        tab === "upcoming" || tab === "pending"
          ? booking.startTime
          : desc(booking.startTime)
      )
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),
  ]);

  const total = totalResult[0]?.value ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageBookings = bookings;

  const TABS: { key: Tab; label: string }[] = [
    { key: "upcoming", label: "Upcoming" },
    { key: "pending", label: "Pending" },
    { key: "past", label: "Past" },
    { key: "cancelled", label: "Cancelled" },
  ];

  function pageHref(p: number) {
    const params = new URLSearchParams({ tab });
    if (search) {
      params.set("q", search);
    }
    if (dateFrom) {
      params.set("dateFrom", dateFrom);
    }
    if (dateTo) {
      params.set("dateTo", dateTo);
    }
    if (p > 1) {
      params.set("page", String(p));
    }
    return `/bookings?${params.toString()}`;
  }

  // Group bookings by calendar day in the host's timezone.
  const todayKey = formatInTimeZone(now, hostTz, "yyyy-MM-dd");
  const dayGroups = (() => {
    const map = new Map<string, typeof pageBookings>();
    for (const b of pageBookings) {
      const key = formatInTimeZone(b.startTime, hostTz, "yyyy-MM-dd");
      const arr = map.get(key) ?? [];
      arr.push(b);
      map.set(key, arr);
    }
    return Array.from(map.entries()).map(([key, items]) => ({
      key,
      label: formatInTimeZone(items[0].startTime, hostTz, "EEE, d MMM"),
      isToday: key === todayKey,
      items,
    }));
  })();

  return (
    <>
      <Suspense>
        <BookingHighlighter />
      </Suspense>
      <PageHeader
        description="View and manage all your upcoming and past bookings."
        eyebrow="Scheduling"
        title="Bookings"
      />

      {/* ── Toolbar: pill tabs + search ──────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        {/* Pill tabs */}
        <div className="flex flex-wrap items-center gap-1.5">
          {TABS.map(({ key, label }) => (
            <Link
              className={cn(
                "inline-flex items-center gap-1.5 px-3.5 py-1.5 text-sm font-medium border transition-all",
                tab === key
                  ? "bg-primary text-primary-content border-primary"
                  : "bg-base-100 text-muted-foreground border-base-300 hover:text-base-content hover:border-primary/40"
              )}
              href={`/bookings?tab=${key}`}
              key={key}
            >
              <span
                className={cn(
                  "size-2 rounded-full shrink-0",
                  tab === key ? "bg-primary-content/70" : TAB_DOTS[key]
                )}
              />
              {label}
              <span
                className={cn(
                  "text-xs font-bold",
                  tab === key
                    ? "text-primary-content/80"
                    : "text-muted-foreground"
                )}
              >
                {counts[key]}
              </span>
            </Link>
          ))}
        </div>

        {/* Date range filter */}
        <Suspense>
          <BookingsDateFilter dateFrom={dateFrom} dateTo={dateTo} tab={tab} />
        </Suspense>

        {/* Search — debounced, updates URL as you type */}
        <Suspense>
          <BookingsSearch tab={tab} />
        </Suspense>
      </div>

      {/* ── List ─────────────────────────────────────────────────────────────── */}
      {pageBookings.length === 0 ? (
        <EmptyState hasSearch={!!(search || dateFrom || dateTo)} tab={tab} />
      ) : (
        <div className="space-y-6">
          {dayGroups.map((g) => (
            <div key={g.key}>
              {/* Day header */}
              <div className="mb-2 flex items-center gap-2">
                <h3 className="text-sm font-semibold text-base-content">
                  {g.label}
                </h3>
                {g.isToday && (
                  <span className="border border-primary/30 bg-primary/5 px-1.5 py-0.5 text-xs font-medium text-primary">
                    Today
                  </span>
                )}
              </div>

              {/* Rows for the day */}
              <div className="divide-y divide-base-300 border border-base-300 bg-base-100">
                {g.items.map((b) => {
                  const isUpcoming = tab === "upcoming";
                  const isPending = tab === "pending";
                  const isRescheduleReq = b.status === "reschedule_requested";
                  // A pending request whose slot has passed can no longer be
                  // approved — show it as expired and drop the action buttons.
                  // For a reschedule request, the slot that matters is the
                  // REQUESTED time, not the still-confirmed original.
                  const isExpired =
                    isPending &&
                    (isRescheduleReq
                      ? (b.rescheduleRequestedStart ?? b.startTime)
                      : b.startTime) < now;
                  const statusMeta =
                    STATUS_STYLES[b.status] ?? STATUS_STYLES.no_show;
                  const platform =
                    PLATFORM_META[b.locationType ?? "custom"] ??
                    PLATFORM_META.custom;
                  const PlatformIcon = platform.icon;

                  const joinUrl =
                    b.locationValue?.startsWith("http") &&
                    [
                      "zoom",
                      "google_meet",
                      "teams",
                      "custom",
                      "in_person",
                    ].includes(b.locationType ?? "")
                      ? b.locationValue
                      : null;

                  const joinLabel =
                    b.locationType === "zoom"
                      ? "Open Zoom"
                      : b.locationType === "google_meet"
                        ? "Join Meet"
                        : b.locationType === "in_person"
                          ? "View Location"
                          : "Join Meeting";

                  return (
                    <div
                      className="group relative flex flex-col gap-3 px-4 py-3.5 transition-colors hover:bg-primary/[0.02] scroll-mt-24 target:bg-primary/5 sm:flex-row sm:items-center"
                      id={`booking-${b.id}`}
                      key={b.id}
                    >
                      {/* Time range */}
                      <div className="w-[140px] shrink-0 text-sm font-medium text-muted-foreground tabular-nums">
                        {formatInTimeZone(b.startTime, hostTz, "h:mm a")} –{" "}
                        {formatInTimeZone(b.endTime, hostTz, "h:mm a")}
                      </div>

                      {/* Color dot + name + event + meta */}
                      <div className="flex min-w-0 flex-1 items-start gap-2.5">
                        <span
                          className="mt-1.5 size-2.5 shrink-0 rounded-full"
                          style={{
                            backgroundColor: b.eventColor ?? "var(--primary)",
                          }}
                        />
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-baseline gap-x-2 min-w-0">
                            <Link
                              className="truncate font-semibold text-base-content underline-offset-2 transition-colors hover:underline group-hover:text-primary"
                              href={`/bookings/${b.id}`}
                            >
                              {b.inviteeName}
                            </Link>
                            <p className="truncate text-sm text-muted-foreground">
                              {b.eventName}
                            </p>
                          </div>
                          <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                            <span className="inline-flex max-w-[240px] items-center gap-1 truncate">
                              <EnvelopeSimple className="shrink-0" size={12} />
                              <span className="truncate">{b.inviteeEmail}</span>
                            </span>
                            {tab === "cancelled" && b.cancellationReason && (
                              <span className="max-w-xs truncate text-error/70">
                                &ldquo;{b.cancellationReason}&rdquo;
                              </span>
                            )}
                            {isPending &&
                              (isExpired ? (
                                <span className="inline-flex items-center gap-1 text-muted-foreground">
                                  <Hourglass size={12} weight="fill" />
                                  Expired — time passed
                                </span>
                              ) : isRescheduleReq ? (
                                <span className="inline-flex items-center gap-1 text-amber-600">
                                  <ArrowCounterClockwise
                                    size={12}
                                    weight="bold"
                                  />
                                  Reschedule requested →{" "}
                                  {formatInTimeZone(
                                    b.rescheduleRequestedStart ?? b.startTime,
                                    hostTz,
                                    "MMM d, h:mm a"
                                  )}
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-amber-600">
                                  <Hourglass size={12} weight="fill" />
                                  Awaiting your review
                                </span>
                              ))}
                          </div>
                        </div>
                      </div>

                      {/* Platform + status + actions */}
                      <div className="flex shrink-0 flex-wrap items-center gap-1.5 pl-[18px] sm:pl-0">
                        <span
                          className={cn(
                            "hidden items-center gap-1 px-1.5 py-0.5 text-xs font-medium md:inline-flex",
                            platform.color
                          )}
                        >
                          <PlatformIcon size={12} weight="fill" />
                          {platform.label}
                        </span>
                        <span
                          className={cn(
                            "inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-semibold",
                            statusMeta.badge
                          )}
                        >
                          <span
                            className={cn(
                              "size-1.5 rounded-full shrink-0",
                              statusMeta.dotClass
                            )}
                          />
                          {statusMeta.label}
                        </span>

                        {/* View details — available on every booking, all tabs */}
                        <Button
                          asChild
                          className="h-7 gap-1 px-2 text-xs text-muted-foreground hover:text-primary"
                          size="sm"
                          title="View details"
                          variant="ghost"
                        >
                          <Link href={`/bookings/${b.id}`}>
                            <Eye size={14} />
                            <span className="hidden lg:inline">Details</span>
                          </Link>
                        </Button>

                        {isUpcoming && b.status === "confirmed" && (
                          <div className="flex items-center gap-1">
                            {joinUrl && (
                              <Button
                                asChild
                                className="h-7 gap-1 px-2.5 text-xs"
                                size="sm"
                              >
                                <a
                                  href={joinUrl}
                                  rel="noopener noreferrer"
                                  target="_blank"
                                >
                                  {b.locationType === "in_person" ? (
                                    <MapPin size={13} weight="fill" />
                                  ) : (
                                    <VideoCamera size={13} weight="fill" />
                                  )}
                                  {joinLabel}
                                </a>
                              </Button>
                            )}
                            {b.rescheduleToken && (
                              <Button
                                asChild
                                className="h-7 gap-1 px-2 text-xs"
                                size="sm"
                                title="Reschedule"
                                variant="outline"
                              >
                                <Link href={`/reschedule/${b.rescheduleToken}`}>
                                  <ArrowCounterClockwise size={14} />
                                  <span className="hidden lg:inline">
                                    Reschedule
                                  </span>
                                </Link>
                              </Button>
                            )}
                            {b.cancelToken && (
                              <Button
                                asChild
                                className="h-7 w-7 p-0 text-muted-foreground hover:bg-error/5 hover:text-error"
                                size="sm"
                                title="Cancel"
                                variant="ghost"
                              >
                                <Link href={`/cancel/${b.cancelToken}`}>
                                  <X size={14} />
                                </Link>
                              </Button>
                            )}
                          </div>
                        )}

                        {tab === "pending" && b.approvalToken && !isExpired && (
                          <div className="flex items-center gap-1">
                            <Button
                              asChild
                              className="h-7 gap-1 bg-primary px-2.5 text-xs hover:bg-primary/90"
                              size="sm"
                            >
                              <Link
                                href={
                                  isRescheduleReq
                                    ? `/booking/review/${b.approvalToken}?type=reschedule&action=approve`
                                    : `/booking/review/${b.approvalToken}?action=approve`
                                }
                              >
                                <Check size={13} weight="bold" />
                                Approve
                              </Link>
                            </Button>
                            <Button
                              asChild
                              className="h-7 gap-1 border-error/40 px-2 text-xs text-error hover:border-error hover:bg-error/5"
                              size="sm"
                              variant="outline"
                            >
                              <Link
                                href={
                                  isRescheduleReq
                                    ? `/booking/review/${b.approvalToken}?type=reschedule`
                                    : `/booking/review/${b.approvalToken}`
                                }
                              >
                                <X size={13} weight="bold" />
                                Decline
                              </Link>
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Pagination ── */}
      {total > 0 && (
        <div className="mt-4 flex items-center justify-between gap-3 border-t border-base-300 pt-4">
          <p className="text-xs text-muted-foreground">
            {totalPages > 1 ? (
              <>
                <strong className="font-semibold text-base-content">
                  {(page - 1) * PAGE_SIZE + 1}–
                  {Math.min(page * PAGE_SIZE, total)}
                </strong>{" "}
                of{" "}
                <strong className="font-semibold text-base-content">
                  {total}
                </strong>{" "}
                bookings
              </>
            ) : (
              <>
                <strong className="font-semibold text-base-content">
                  {total}
                </strong>{" "}
                booking{total === 1 ? "" : "s"}
              </>
            )}
          </p>
          {totalPages > 1 && (
            <Pagination className="mx-0 w-auto">
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    aria-disabled={page <= 1}
                    className={
                      page <= 1 ? "pointer-events-none opacity-40" : ""
                    }
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
      )}
    </>
  );
}

function EmptyState({ tab, hasSearch }: { tab: Tab; hasSearch: boolean }) {
  if (hasSearch) {
    return (
      <div className="flex flex-col items-center py-20 text-center">
        <MagnifyingGlass
          className="mb-3 text-muted-foreground/30"
          size={40}
          weight="thin"
        />
        <p className="font-medium text-base-content">No results found</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Try a different name or email address.
        </p>
        <Button asChild className="mt-4" size="sm" variant="outline">
          <Link href={`/bookings?tab=${tab}`}>Clear search</Link>
        </Button>
      </div>
    );
  }

  if (tab === "pending") {
    return (
      <div className="flex justify-center py-10">
        <div className="w-full max-w-lg border border-base-300 bg-base-100 overflow-hidden">
          {/* Header */}
          <div className="flex items-center gap-3 border-b border-base-300 bg-amber-500/[0.06] px-6 py-5">
            <span className="flex size-10 shrink-0 items-center justify-center bg-amber-500/10 text-amber-600">
              <Hourglass size={20} weight="fill" />
            </span>
            <div>
              <p className="font-semibold text-base-content text-sm">
                No pending requests
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Booking requests awaiting your approval will appear here.
              </p>
            </div>
          </div>

          {/* How it works */}
          <div className="px-6 py-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">
              How approval works
            </p>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <span className="flex size-7 shrink-0 items-center justify-center bg-primary/10 text-primary text-xs font-bold">
                  1
                </span>
                <div>
                  <p className="text-sm font-medium text-base-content">
                    Enable approval on a meeting type
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Edit any meeting type → Details tab → turn on{" "}
                    <strong>Require Approval</strong>.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="flex size-7 shrink-0 items-center justify-center bg-primary/10 text-primary text-xs font-bold">
                  2
                </span>
                <div>
                  <p className="text-sm font-medium text-base-content">
                    Invitee submits a request
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    They book a time slot and see "Awaiting Approval" instead of
                    a confirmation.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="flex size-7 shrink-0 items-center justify-center bg-primary/10 text-primary text-xs font-bold">
                  3
                </span>
                <div>
                  <p className="text-sm font-medium text-base-content">
                    You approve or decline
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Requests appear here with <strong>Approve</strong> and{" "}
                    <strong>Decline</strong> buttons, or act directly from the
                    email notification you receive.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 border-t border-base-300 bg-base-200/30 px-6 py-4">
            <Button asChild className="gap-1.5" size="sm">
              <Link href="/event-types">
                <Sliders size={15} weight="bold" />
                Go to Meeting Types
              </Link>
            </Button>
            <Button asChild className="gap-1.5" size="sm" variant="outline">
              <Link href="/bookings">
                <EnvelopeOpen size={13} />
                View all bookings
              </Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (tab === "upcoming") {
    return (
      <div className="flex justify-center py-6">
        <div className="w-full max-w-lg border border-base-300 bg-base-100 overflow-hidden">
          {/* Header */}
          <div className="flex items-center gap-3 border-b border-base-300 bg-primary/[0.04] px-6 py-5">
            <span className="flex size-10 shrink-0 items-center justify-center bg-primary/10 text-primary">
              <CalendarBlank size={20} weight="duotone" />
            </span>
            <div>
              <p className="font-semibold text-base-content text-base">
                No upcoming bookings
              </p>
              <p className="text-sm text-muted-foreground mt-0.5">
                Your confirmed meetings will appear here once people start
                booking.
              </p>
            </div>
          </div>

          {/* Steps */}
          <div className="px-6 py-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">
              Get your first booking
            </p>
            <div className="space-y-4">
              {[
                {
                  step: "1",
                  title: "Create a meeting type",
                  desc: "Define the meeting length, location, and any custom questions you want to ask.",
                  href: "/event-types",
                  cta: "Go to Meeting Types",
                },
                {
                  step: "2",
                  title: "Share your booking link",
                  desc: "Copy your personal link and paste it in your email signature, LinkedIn bio, or Slack profile.",
                  href: "/settings/my-link",
                  cta: "Get your link",
                },
                {
                  step: "3",
                  title: "Set your availability",
                  desc: "Make sure your working hours are configured so invitees see the right time slots.",
                  href: "/availability",
                  cta: "Set availability",
                },
              ].map(({ step, title, desc, href, cta }) => (
                <div className="flex items-start gap-3" key={step}>
                  <span className="flex size-7 shrink-0 items-center justify-center bg-primary/10 text-primary text-xs font-bold">
                    {step}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-base-content">
                      {title}
                    </p>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {desc}
                    </p>
                  </div>
                  <Button
                    asChild
                    className="shrink-0 text-xs h-7 px-2.5"
                    size="sm"
                    variant="outline"
                  >
                    <Link href={href}>{cta}</Link>
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* Footer CTA */}
          <div className="flex items-center gap-3 border-t border-base-300 bg-base-200/30 px-6 py-4">
            <Button asChild className="gap-1.5" size="sm">
              <Link href="/event-types">
                <CalendarBlank size={15} weight="bold" />
                Create Meeting Type
              </Link>
            </Button>
            <Button asChild className="gap-1.5" size="sm" variant="outline">
              <Link href="/settings/my-link">View my booking page</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (tab === "past") {
    return (
      <div className="flex justify-center py-6">
        <div className="w-full max-w-lg border border-base-300 bg-base-100 overflow-hidden">
          <div className="flex items-center gap-3 border-b border-base-300 bg-base-200/30 px-6 py-5">
            <span className="flex size-10 shrink-0 items-center justify-center bg-base-200 text-muted-foreground">
              <CalendarCheck size={20} weight="duotone" />
            </span>
            <div>
              <p className="font-semibold text-base-content text-sm">
                No past bookings yet
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Completed meetings will appear here once they have passed.
              </p>
            </div>
          </div>
          <div className="px-6 py-5 text-sm text-muted-foreground leading-relaxed">
            Once you have upcoming bookings confirmed and those meetings pass,
            they will automatically move here. You can review details, see who
            attended, and download ICS files.
          </div>
          <div className="flex items-center border-t border-base-300 bg-base-200/30 px-6 py-4">
            <Button asChild className="gap-1.5" size="sm" variant="outline">
              <Link href="/bookings?tab=upcoming">
                <CalendarBlank size={15} />
                View upcoming
              </Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // cancelled
  return (
    <div className="flex justify-center py-6">
      <div className="w-full max-w-lg border border-base-300 bg-base-100 overflow-hidden">
        <div className="flex items-center gap-3 border-b border-base-300 bg-base-200/30 px-6 py-5">
          <span className="flex size-10 shrink-0 items-center justify-center bg-base-200 text-muted-foreground">
            <CalendarX size={20} weight="duotone" />
          </span>
          <div>
            <p className="font-semibold text-base-content text-sm">
              No cancelled bookings
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Meetings that are cancelled will be logged here for reference.
            </p>
          </div>
        </div>
        <div className="px-6 py-5 text-sm text-muted-foreground leading-relaxed">
          When you or an invitee cancels a meeting, it moves here along with the
          cancellation reason. You can use this history to spot patterns or
          follow up with invitees.
        </div>
        <div className="flex items-center border-t border-base-300 bg-base-200/30 px-6 py-4">
          <Button asChild className="gap-1.5" size="sm" variant="outline">
            <Link href="/bookings?tab=upcoming">
              <CalendarBlank size={13} />
              View upcoming
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
