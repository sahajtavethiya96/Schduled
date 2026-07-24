import {
  ArrowRight,
  CalendarBlank,
  CalendarCheck,
  CalendarPlus,
  CalendarX,
  Clock,
  LinkSimple,
  Plus,
  ShareNetwork,
} from "@phosphor-icons/react/dist/ssr";
import {
  endOfDay,
  startOfDay,
  startOfMonth,
} from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { and, count, desc, eq, gt, gte, lte } from "drizzle-orm";
import Link from "next/link";
import { PageHeader } from "@/components/scaffold/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { booking, eventType, user } from "@/db/schema";
import { requireSession } from "@/lib/authz";
import { db } from "@/lib/db";
import { getAppUrl } from "@/lib/get-app-url";

export const metadata = { title: "Dashboard" };

function dayLabel(date: Date, tz: string): string {
  const today    = formatInTimeZone(new Date(), tz, 'yyyy-MM-dd')
  const tomorrow = formatInTimeZone(new Date(Date.now() + 86400000), tz, 'yyyy-MM-dd')
  const day      = formatInTimeZone(date, tz, 'yyyy-MM-dd')
  if (day === today)    return "Today"
  if (day === tomorrow) return "Tomorrow"
  return formatInTimeZone(date, tz, "MMM d")
}

export default async function DashboardPage() {
  const session = await requireSession();

  const [freshUser] = await db
    .select({ name: user.name, email: user.email, username: user.username, timezone: user.timezone })
    .from(user)
    .where(eq(user.id, session.user.id))
    .limit(1);

  const hostTz = freshUser?.timezone ?? 'UTC';

  const now = new Date();
  const monthStart = startOfMonth(now);
  const displayName =
    freshUser?.name?.split(" ")[0] ?? freshUser?.email ?? "there";

  // ── Stats (all counts + this-month counts + next meeting) ─────────
  const [
    totalResult,
    totalMonthResult,
    upcomingResult,
    completedResult,
    completedMonthResult,
    cancelledResult,
    cancelledMonthResult,
    nextMeetingResult,
    activeEventTypesResult,
    meetingsTodayResult,
  ] = await Promise.all([
    db
      .select({ value: count() })
      .from(booking)
      .where(eq(booking.hostUserId, session.user.id)),

    db
      .select({ value: count() })
      .from(booking)
      .where(
        and(
          eq(booking.hostUserId, session.user.id),
          gte(booking.createdAt, monthStart)
        )
      ),

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
          lte(booking.endTime, now)
        )
      ),

    db
      .select({ value: count() })
      .from(booking)
      .where(
        and(
          eq(booking.hostUserId, session.user.id),
          eq(booking.status, "confirmed"),
          lte(booking.endTime, now),
          gte(booking.endTime, monthStart)
        )
      ),

    db
      .select({ value: count() })
      .from(booking)
      .where(
        and(
          eq(booking.hostUserId, session.user.id),
          eq(booking.status, "cancelled")
        )
      ),

    db
      .select({ value: count() })
      .from(booking)
      .where(
        and(
          eq(booking.hostUserId, session.user.id),
          eq(booking.status, "cancelled"),
          gte(booking.createdAt, monthStart)
        )
      ),

    db
      .select({ startTime: booking.startTime })
      .from(booking)
      .where(
        and(
          eq(booking.hostUserId, session.user.id),
          eq(booking.status, "confirmed"),
          gt(booking.startTime, now)
        )
      )
      .orderBy(booking.startTime)
      .limit(1),

    db
      .select({ value: count() })
      .from(eventType)
      .where(
        and(eq(eventType.userId, session.user.id), eq(eventType.isActive, true))
      ),

    db
      .select({ value: count() })
      .from(booking)
      .where(
        and(
          eq(booking.hostUserId, session.user.id),
          eq(booking.status, "confirmed"),
          gte(booking.startTime, startOfDay(now)),
          lte(booking.startTime, endOfDay(now))
        )
      ),
  ]);

  const stats = {
    total: totalResult[0]?.value ?? 0,
    totalThisMonth: totalMonthResult[0]?.value ?? 0,
    upcoming: upcomingResult[0]?.value ?? 0,
    nextMeeting: nextMeetingResult[0] ?? null,
    completed: completedResult[0]?.value ?? 0,
    completedThisMonth: completedMonthResult[0]?.value ?? 0,
    cancelled: cancelledResult[0]?.value ?? 0,
    cancelledThisMonth: cancelledMonthResult[0]?.value ?? 0,
    activeEventTypes: activeEventTypesResult[0]?.value ?? 0,
    meetingsToday: meetingsTodayResult[0]?.value ?? 0,
  };

  const username = freshUser?.username ?? null;
  const bookingUrl = username ? `${getAppUrl()}/${username}` : null;

  // ── Lists ──────────────────────────────────────────────────────────
  const [upcomingMeetings, recentBookings] = await Promise.all([
    db
      .select({
        id: booking.id,
        inviteeName: booking.inviteeName,
        startTime: booking.startTime,
        status: booking.status,
        eventName: eventType.name,
        eventColor: eventType.color,
        locationType: eventType.locationType,
      })
      .from(booking)
      .innerJoin(eventType, eq(booking.eventTypeId, eventType.id))
      .where(
        and(
          eq(booking.hostUserId, session.user.id),
          eq(booking.status, "confirmed"),
          gt(booking.startTime, now)
        )
      )
      .orderBy(booking.startTime)
      .limit(5),

    db
      .select({
        id: booking.id,
        inviteeName: booking.inviteeName,
        createdAt: booking.createdAt,
        status: booking.status,
        eventName: eventType.name,
        eventColor: eventType.color,
      })
      .from(booking)
      .innerJoin(eventType, eq(booking.eventTypeId, eventType.id))
      .where(eq(booking.hostUserId, session.user.id))
      .orderBy(desc(booking.createdAt))
      .limit(5),
  ]);

  const upcomingSubtitle = stats.nextMeeting
    ? `Next: ${dayLabel(stats.nextMeeting.startTime, hostTz)}`
    : "None scheduled";

  return (
    <div className="space-y-8">
      {/* ── Welcome + Quick Actions ──────────────────────────────────── */}
      <PageHeader
        title={`Welcome back, ${displayName}`}
        description={`You have ${stats.upcoming} upcoming meetings${stats.meetingsToday > 0 ? `, ${stats.meetingsToday} today` : ''} and ${stats.totalThisMonth} bookings this month.`}
        eyebrow="Dashboard"
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild>
              <Link href="/event-types">
                <Plus className="mr-1.5" size={15} weight="bold" />
                Create Meeting Type
              </Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="/availability">
                <LinkSimple className="mr-1.5" size={15} />
                Set Availability
              </Link>
            </Button>
            {bookingUrl ? (
              <Button asChild variant="secondary" data-tour="booking-link">
                <a href={bookingUrl} rel="noopener noreferrer" target="_blank">
                  <ShareNetwork className="mr-1.5" size={15} />
                  My Booking Page
                </a>
              </Button>
            ) : (
              <Button asChild variant="secondary" data-tour="booking-link">
                <Link href="/settings/my-link">
                  <LinkSimple className="mr-1.5" size={15} />
                  Set Up Link
                </Link>
              </Button>
            )}
          </div>
        }
      />

      {/* ── Next meeting focal strip ─────────────────────────────────── */}
      {upcomingMeetings[0] && (
        <Link
          href={`/bookings/${upcomingMeetings[0].id}`}
          className="group flex flex-wrap items-center gap-4 border border-primary/30 bg-primary/[0.04] px-5 py-4 transition-colors hover:bg-primary/[0.07]"
        >
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center text-white"
            style={{ backgroundColor: upcomingMeetings[0].eventColor ?? "var(--primary)" }}
          >
            <Clock size={22} weight="duotone" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase tracking-ui text-primary">
              Your next meeting
            </p>
            <p className="mt-0.5 truncate text-sm">
              <span className="font-semibold text-foreground">
                {upcomingMeetings[0].inviteeName}
              </span>
              <span className="text-muted-foreground">
                {" · "}
                {upcomingMeetings[0].eventName}
              </span>
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-sm font-bold text-foreground">
              {dayLabel(upcomingMeetings[0].startTime, hostTz)}
            </p>
            <p className="text-sm text-muted-foreground">
              {formatInTimeZone(upcomingMeetings[0].startTime, hostTz, "h:mm a")}
            </p>
          </div>
          <span className="ml-1 hidden shrink-0 items-center gap-1 text-sm font-medium text-primary transition-transform group-hover:translate-x-0.5 sm:inline-flex">
            View <ArrowRight size={14} weight="bold" />
          </span>
        </Link>
      )}

      {/* ── Stat cards ──────────────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
        <StatCard
          accent={stats.activeEventTypes > 0 && stats.total === 0}
          href="/event-types"
          icon={<CalendarPlus size={20} weight="duotone" />}
          label="Meeting Types"
          subtitle="Active"
          value={stats.activeEventTypes}
        />
        <StatCard
          href="/bookings"
          icon={<CalendarBlank size={20} weight="duotone" />}
          label="Total Bookings"
          note={`${stats.totalThisMonth} bookings this month`}
          subtitle="All time"
          value={stats.total}
        />
        <StatCard
          accent={stats.upcoming > 0}
          href="/bookings?tab=upcoming"
          icon={<Clock size={20} weight="duotone" />}
          label="Upcoming"
          subtitle={upcomingSubtitle}
          value={stats.upcoming}
        />
        <StatCard
          href="/bookings?tab=past"
          icon={<CalendarCheck size={20} weight="duotone" />}
          label="Completed"
          subtitle={`${stats.completedThisMonth} this month`}
          value={stats.completed}
        />
        <StatCard
          href="/bookings?tab=cancelled"
          icon={<CalendarX size={20} weight="duotone" />}
          label="Cancelled"
          subtitle={`${stats.cancelledThisMonth} this month`}
          value={stats.cancelled}
        />
      </div>

      {/* ── Upcoming meetings + Recent bookings ─────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between border-b border-border py-4">
            <div className="flex items-center gap-2">
              <CardTitle className="text-sm font-bold uppercase tracking-ui">
                Upcoming Meetings
              </CardTitle>
              {upcomingMeetings.length > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center bg-primary/10 px-1.5 text-xs font-bold text-primary">
                  {upcomingMeetings.length}
                </span>
              )}
            </div>
            <Button asChild className="h-7 text-xs" size="sm" variant="ghost">
              <Link href="/bookings">View all</Link>
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {upcomingMeetings.length === 0 ? (
              <EmptyUpcoming
                bookingUrl={bookingUrl}
                hasEventTypes={stats.activeEventTypes > 0}
              />
            ) : (
              upcomingMeetings.map((m) => (
                <Link
                  key={m.id}
                  href={`/bookings?highlight=${m.id}`}
                  className="flex items-center justify-between gap-4 border-t border-border px-6 py-3.5 transition-colors duration-150 hover:bg-primary/[0.02] group"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold group-hover:text-primary transition-colors">
                      {m.inviteeName}
                    </p>
                    <div className="mt-0.5 flex items-center gap-1.5 flex-wrap">
                      <span
                        className="size-2.5 shrink-0"
                        style={{ backgroundColor: m.eventColor ?? "var(--primary)" }}
                      />
                      <p className="truncate text-sm text-muted-foreground">
                        {m.eventName}
                      </p>
                      <LocationBadge locationType={m.locationType} />
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-semibold text-foreground">
                      {dayLabel(m.startTime, hostTz)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {formatInTimeZone(m.startTime, hostTz, "h:mm a")}
                    </p>
                  </div>
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between border-b border-border py-4">
            <div className="flex items-center gap-2">
              <CardTitle className="text-sm font-bold uppercase tracking-ui">
                Recent Bookings
              </CardTitle>
              {recentBookings.length > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center bg-muted px-1.5 text-xs font-bold text-muted-foreground">
                  {recentBookings.length}
                </span>
              )}
            </div>
            <Button asChild className="h-7 text-xs" size="sm" variant="ghost">
              <Link href="/bookings">View all</Link>
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {recentBookings.length === 0 ? (
              <EmptyBookings bookingUrl={bookingUrl} />
            ) : (
              recentBookings.map((b) => (
                <Link
                  key={b.id}
                  href={`/bookings?highlight=${b.id}`}
                  className="flex items-center justify-between gap-4 border-t border-border px-6 py-3.5 transition-colors duration-150 hover:bg-primary/[0.02] group"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold group-hover:text-primary transition-colors">
                      {b.inviteeName}
                    </p>
                    <div className="mt-0.5 flex items-center gap-1.5">
                      <span
                        className="size-2.5 shrink-0"
                        style={{ backgroundColor: b.eventColor ?? "var(--primary)" }}
                      />
                      <p className="truncate text-sm text-muted-foreground">
                        {b.eventName}
                      </p>
                    </div>
                  </div>
                  <div className="shrink-0 flex flex-col items-end gap-1.5">
                    <StatusBadge status={b.status} />
                    <p className="text-sm text-muted-foreground">
                      {dayLabel(b.createdAt, hostTz)}
                    </p>
                  </div>
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  subtitle,
  icon,
  accent = false,
  note,
  href,
}: {
  label: string;
  value: number;
  subtitle: string;
  icon: React.ReactNode;
  accent?: boolean;
  note?: string;
  href?: string;
}) {
  const inner = (
    <Card
      className={[
        "group relative overflow-hidden transition-all duration-200 h-full flex flex-col",
        href ? "cursor-pointer" : "",
        "hover:border-primary/60 hover:bg-primary/[0.025]",
        accent ? "border-primary/40 bg-primary/[0.03]" : "",
      ].join(" ")}
    >
      {/* Top accent bar — always visible for accent cards, sweeps in on hover for others */}
      <div
        className={[
          "absolute inset-x-0 top-0 h-[3px] bg-primary origin-left transition-transform duration-300 ease-out",
          accent ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100",
        ].join(" ")}
      />

      <CardContent className="px-5 pt-5 pb-4 flex flex-col flex-1">
        <div className="flex items-start justify-between gap-2 flex-1">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-ui text-muted-foreground">
              {label}
            </p>
            <p className="mt-2 font-heading text-4xl font-black leading-none transition-colors duration-200 text-foreground group-hover:text-primary">
              {value}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>
          </div>
          <span
            className={[
              "flex h-9 w-9 shrink-0 items-center justify-center transition-all duration-200",
              accent
                ? "bg-primary/10 text-primary"
                : "bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary",
            ].join(" ")}
          >
            {icon}
          </span>
        </div>

        <div className="mt-3 border-t border-border pt-3">
          <p className="text-sm text-muted-foreground">
            {note ?? <span className="invisible">–</span>}
          </p>
        </div>
      </CardContent>
    </Card>
  )
  if (href) return <Link href={href} className="block h-full">{inner}</Link>
  return inner
}

function EmptyUpcoming({
  hasEventTypes,
  bookingUrl,
}: {
  hasEventTypes: boolean;
  bookingUrl: string | null;
}) {
  if (hasEventTypes) {
    return (
      <div className="flex flex-col items-center px-8 py-12 text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center bg-primary/10">
          <ShareNetwork className="text-primary/60" size={28} weight="duotone" />
        </div>
        <p className="text-base font-semibold text-foreground">
          Your calendar is clear
        </p>
        <p className="mt-1.5 max-w-xs text-sm text-muted-foreground">
          Share your booking link and let people pick a time that works.
        </p>
        {bookingUrl ? (
          <Button asChild className="mt-5" size="sm">
            <a href={bookingUrl} rel="noopener noreferrer" target="_blank">
              <LinkSimple className="mr-1.5" size={15} />
              Open Booking Page
            </a>
          </Button>
        ) : (
          <Button asChild className="mt-5" size="sm">
            <Link href="/event-types">
              <CalendarPlus className="mr-1.5" size={15} />
              View Meeting Types
            </Link>
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center px-8 py-12 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center bg-muted">
        <CalendarBlank className="text-muted-foreground/40" size={28} weight="duotone" />
      </div>
      <p className="text-base font-semibold text-foreground">
        No meeting types yet
      </p>
      <p className="mt-1.5 max-w-xs text-sm text-muted-foreground">
        Create a meeting type and share your link to start getting bookings.
      </p>
      <Button asChild className="mt-5" size="sm">
        <Link href="/event-types">
          <Plus className="mr-1.5" size={15} weight="bold" />
          Create Meeting Type
        </Link>
      </Button>
    </div>
  );
}

function EmptyBookings({ bookingUrl }: { bookingUrl: string | null }) {
  return (
    <div className="flex flex-col items-center px-8 py-12 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center bg-muted">
        <CalendarCheck className="text-muted-foreground/40" size={28} weight="duotone" />
      </div>
      <p className="text-base font-semibold text-foreground">No bookings yet</p>
      <p className="mt-1.5 max-w-xs text-sm text-muted-foreground">
        {bookingUrl
          ? "Share your booking page link and your first booking will show up here."
          : "Create a meeting type, then share your link to receive bookings."}
      </p>
      <Button asChild className="mt-5" size="sm" variant="secondary">
        <Link href="/event-types">
          {bookingUrl ? "View Meeting Types" : "Create Meeting Type"}
        </Link>
      </Button>
    </div>
  );
}

const STATUS_STYLES: Record<
  string,
  { badge: string; dotColor: string; label: string }
> = {
  confirmed: {
    badge:
      "bg-primary/10 text-primary border border-primary/20 text-xs font-medium px-2.5 py-0.5",
    dotColor: "bg-primary",
    label: "Confirmed",
  },
  cancelled: {
    badge:
      "bg-destructive/10 text-destructive border border-destructive/20 text-xs font-medium px-2.5 py-0.5",
    dotColor: "bg-destructive",
    label: "Cancelled",
  },
  pending: {
    badge:
      "bg-amber-500/10 text-amber-700 border border-amber-500/20 text-xs font-medium px-2.5 py-0.5",
    dotColor: "bg-amber-500",
    label: "Pending",
  },
  no_show: {
    badge:
      "bg-muted text-muted-foreground border border-border text-xs font-medium px-2.5 py-0.5",
    dotColor: "bg-muted-foreground",
    label: "No show",
  },
};

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_STYLES[status] ?? STATUS_STYLES.no_show;
  return (
    <span className={`inline-flex items-center gap-1.5 ${s.badge}`}>
      <span className={`size-1.5 shrink-0 ${s.dotColor}`} />
      {s.label}
    </span>
  );
}

const LOCATION_BADGE_STYLES: Record<string, string> = {
  zoom: "bg-muted text-muted-foreground border border-border",
  google_meet: "bg-muted text-muted-foreground border border-border",
  phone_host_calls: "bg-muted text-muted-foreground border border-border",
  phone_invitee_calls: "bg-muted text-muted-foreground border border-border",
  in_person: "bg-muted text-muted-foreground border border-border",
};
const LOCATION_LABEL: Record<string, string> = {
  zoom: "Zoom",
  google_meet: "Google Meet",
  phone_host_calls: "Phone",
  phone_invitee_calls: "Phone",
  in_person: "In Person",
};

function LocationBadge({ locationType }: { locationType: string }) {
  const style = LOCATION_BADGE_STYLES[locationType];
  const label = LOCATION_LABEL[locationType];
  if (!label) {
    return null;
  }
  return (
    <span
      className={`inline-flex items-center text-xs font-medium px-1.5 py-0.5 shrink-0 ${style}`}
    >
      {label}
    </span>
  );
}
