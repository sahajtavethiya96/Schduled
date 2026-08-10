import {
  ArrowLeft,
  CalendarCheck,
  CalendarDot,
  CalendarPlus,
  CheckCircle,
  Clock,
  ClockCounterClockwise,
  Globe,
  IdentificationCard,
  PencilSimple,
  Prohibit,
  ShieldCheck,
  SignIn,
  SignOut,
  User,
  UserPlus,
} from "@phosphor-icons/react/dist/ssr";
import { format, formatDistanceToNow } from "date-fns";
import { and, count, desc, eq, ilike, max, min, or } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BookingCancelButton } from "@/components/settings-admin/booking-cancel-button";
import { EventTypeDeleteButton } from "@/components/settings-admin/event-type-delete-button";
import { UserDetailActions } from "@/components/settings-admin/user-detail-actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { ADMIN_ROLE } from "@/config/platform";
import {
  auditLogs,
  booking,
  eventType,
  eventTypeDuration,
  session,
  user,
} from "@/db/schema";
import { requireAdmin } from "@/lib/authz";
import { db } from "@/lib/db";
import { cn, paginationRange } from "@/lib/utils";
import { SectionSearch } from "./_components/section-search";

export const metadata = { title: "Member Detail" };

const PER_PAGE = 5;

export default async function SettingsUserDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string>>;
}) {
  const admin = await requireAdmin();
  const { id } = await params;
  const sp = await searchParams;

  const mpPage = Math.max(1, Number(sp.mp) || 1);
  const bPage = Math.max(1, Number(sp.bp) || 1);
  const aPage = Math.max(1, Number(sp.ap) || 1);

  const mq = sp.mq?.trim() ?? "";
  const bq = sp.bq?.trim() ?? "";
  const aq = sp.aq?.trim() ?? "";

  const [profile] = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      username: user.username,
      role: user.role,
      banned: user.banned,
      banReason: user.banReason,
      timezone: user.timezone,
      createdAt: user.createdAt,
    })
    .from(user)
    .where(eq(user.id, id))
    .limit(1);

  if (!profile) {
    notFound();
  }

  const isSelf = profile.id === admin.user.id;
  const isAdmin = profile.role === ADMIN_ROLE;

  // Search-filtered where clauses
  const bWhere = bq
    ? and(
        eq(booking.hostUserId, id),
        or(
          ilike(booking.inviteeName, `%${bq}%`),
          ilike(booking.inviteeEmail, `%${bq}%`)
        )
      )
    : eq(booking.hostUserId, id);
  const mpWhere = mq
    ? and(
        eq(eventType.userId, id),
        or(ilike(eventType.name, `%${mq}%`), ilike(eventType.slug, `%${mq}%`))
      )
    : eq(eventType.userId, id);
  const aWhere = aq
    ? and(
        eq(auditLogs.actorId, id),
        or(
          ilike(auditLogs.action, `%${aq}%`),
          ilike(auditLogs.description, `%${aq}%`)
        )
      )
    : eq(auditLogs.actorId, id);

  const [
    [bookingCount],
    [eventTypeCount],
    [auditCount],
    [lastSeen],
    recentBookings,
    userEventTypes,
    recentAudit,
  ] = await Promise.all([
    db.select({ value: count() }).from(booking).where(bWhere),
    db.select({ value: count() }).from(eventType).where(mpWhere),
    db.select({ value: count() }).from(auditLogs).where(aWhere),
    db
      .select({ lastSeen: max(session.createdAt) })
      .from(session)
      .where(eq(session.userId, id)),
    db
      .select({
        id: booking.id,
        inviteeName: booking.inviteeName,
        inviteeEmail: booking.inviteeEmail,
        startTime: booking.startTime,
        status: booking.status,
        duration: booking.duration,
      })
      .from(booking)
      .where(bWhere)
      .orderBy(desc(booking.startTime))
      .limit(PER_PAGE)
      .offset((bPage - 1) * PER_PAGE),
    db
      .select({
        id: eventType.id,
        name: eventType.name,
        slug: eventType.slug,
        isActive: eventType.isActive,
        color: eventType.color,
        minDuration: min(eventTypeDuration.duration),
      })
      .from(eventType)
      .leftJoin(
        eventTypeDuration,
        eq(eventTypeDuration.eventTypeId, eventType.id)
      )
      .where(mpWhere)
      .groupBy(eventType.id)
      .orderBy(desc(eventType.createdAt))
      .limit(PER_PAGE)
      .offset((mpPage - 1) * PER_PAGE),
    db
      .select()
      .from(auditLogs)
      .where(aWhere)
      .orderBy(desc(auditLogs.createdAt))
      .limit(PER_PAGE)
      .offset((aPage - 1) * PER_PAGE),
  ]);

  const displayName = profile.name ?? profile.email;
  const initials = displayName.slice(0, 2).toUpperCase();
  const lastSeenStr = lastSeen?.lastSeen
    ? formatDistanceToNow(lastSeen.lastSeen, { addSuffix: true })
    : "Never";

  const mpTotal = Math.ceil((eventTypeCount?.value ?? 0) / PER_PAGE);
  const bTotal = Math.ceil((bookingCount?.value ?? 0) / PER_PAGE);
  const aTotal = Math.ceil((auditCount?.value ?? 0) / PER_PAGE);

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-base-content"
        href="/settings/users"
      >
        <ArrowLeft size={14} />
        Back to Members
      </Link>

      {/* ── Hero ── */}
      <div className="border border-base-300 bg-base-100 p-6">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="flex items-start gap-5">
            <span
              className="flex size-16 shrink-0 items-center justify-center rounded-full text-xl font-black text-white"
              style={{ backgroundColor: "var(--primary)" }}
            >
              {initials}
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1
                  className="text-2xl font-black tracking-tight"
                  style={{ fontFamily: "var(--font-heading)" }}
                >
                  {displayName}
                </h1>
                <span
                  className={cn(
                    "inline-flex items-center border px-2 py-0.5 text-xs font-bold uppercase tracking-wide",
                    isAdmin
                      ? "border-primary/30 bg-primary/10 text-primary"
                      : "border-base-300 bg-base-200 text-muted-foreground"
                  )}
                >
                  {profile.role ?? "user"}
                </span>
                <span
                  className={cn(
                    "inline-flex items-center gap-1 border px-2 py-0.5 text-xs font-bold",
                    profile.banned
                      ? "border-error/30 bg-error/10 text-error"
                      : "border-success/30 bg-success/10 text-success"
                  )}
                >
                  <span
                    className={cn(
                      "size-1.5 rounded-full",
                      profile.banned ? "bg-error" : "bg-success"
                    )}
                  />
                  {profile.banned ? "Suspended" : "Active"}
                </span>
                {isSelf && (
                  <span className="border border-primary/20 bg-primary/[0.06] px-2 py-0.5 text-xs font-bold text-primary">
                    You
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {profile.email}
              </p>
              <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Clock size={12} /> Last active · {lastSeenStr}
                </span>
                <span className="flex items-center gap-1.5">
                  <CalendarDot size={12} /> Joined ·{" "}
                  {format(profile.createdAt, "MMM d, yyyy")}
                </span>
                {profile.timezone && (
                  <span className="flex items-center gap-1.5">
                    <Globe size={12} /> {profile.timezone}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
        {profile.banned && profile.banReason && (
          <div className="mt-4 flex items-start gap-2 border border-error/20 bg-error/[0.04] px-4 py-3">
            <Prohibit className="mt-0.5 shrink-0 text-error" size={14} />
            <p className="text-sm text-error">
              <span className="font-semibold">Suspend reason:</span>{" "}
              {profile.banReason}
            </p>
          </div>
        )}
      </div>

      {/* ── 4 KPI Cards ── */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KpiCard
          icon={<CalendarCheck size={16} />}
          label="Total Bookings"
          numeric
          value={String(bookingCount?.value ?? 0)}
        />
        <KpiCard
          icon={<CalendarDot size={16} />}
          label="Meeting Types"
          numeric
          value={String(eventTypeCount?.value ?? 0)}
        />
        <KpiCard
          icon={<Clock size={16} />}
          label="Last Active"
          value={lastSeenStr}
        />
        <KpiCard
          icon={<CalendarDot size={16} />}
          label="Member Since"
          value={format(profile.createdAt, "MMM yyyy")}
        />
      </div>

      {/* ── Profile + Actions ── */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className={isSelf ? "lg:col-span-3" : "lg:col-span-2"}>
          <CardHeader className="border-b border-base-300 py-3.5">
            <div className="flex items-center gap-2">
              <span className="flex size-6 items-center justify-center bg-primary/10 text-primary">
                <User size={13} weight="bold" />
              </span>
              <CardTitle className="text-sm font-bold uppercase tracking-ui text-base-content/70">
                Profile
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="grid divide-y divide-base-300 sm:grid-cols-2 sm:divide-x sm:divide-y-0">
              <div className="divide-y divide-base-300">
                <InfoRow
                  icon={<User size={14} />}
                  label="Username"
                  value={profile.username ? `@${profile.username}` : "—"}
                />
                <InfoRow
                  icon={<IdentificationCard size={14} />}
                  label="User ID"
                  mono
                  value={profile.id}
                />
                <InfoRow
                  icon={<Clock size={14} />}
                  label="Last Active"
                  value={lastSeenStr}
                />
              </div>
              <div className="divide-y divide-base-300">
                <InfoRow
                  icon={<Globe size={14} />}
                  label="Timezone"
                  value={profile.timezone ?? "UTC"}
                />
                <InfoRow
                  icon={<CalendarDot size={14} />}
                  label="Joined"
                  value={format(profile.createdAt, "MMM d, yyyy")}
                />
                <InfoRow
                  highlight={profile.banned ? "destructive" : "success"}
                  icon={
                    profile.banned ? (
                      <Prohibit size={14} />
                    ) : (
                      <CheckCircle size={14} />
                    )
                  }
                  label="Status"
                  value={profile.banned ? "Suspended" : "Active"}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {!isSelf && (
          <div className="lg:sticky lg:top-6 lg:self-start">
            <Card>
              <CardHeader className="border-b border-base-300 py-3.5">
                <div className="flex items-center gap-2">
                  <span className="flex size-6 items-center justify-center bg-primary/10 text-primary">
                    <ShieldCheck size={13} weight="bold" />
                  </span>
                  <CardTitle className="text-sm font-bold uppercase tracking-ui text-base-content/70">
                    Account Actions
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="px-4 py-4">
                <UserDetailActions
                  banned={profile.banned}
                  userId={profile.id}
                />
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* ── Meeting Types + Bookings side by side ── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Meeting Types */}
        <Card className="h-full">
          <CardHeader className="border-b border-base-300 py-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="flex size-6 items-center justify-center bg-primary/10 text-primary">
                  <CalendarDot size={13} weight="bold" />
                </span>
                <CardTitle className="text-sm font-bold uppercase tracking-ui text-base-content/70">
                  Meeting Types
                </CardTitle>
                <span className="text-xs text-muted-foreground">
                  ({eventTypeCount?.value ?? 0})
                </span>
              </div>
              <SectionSearch
                initialValue={mq}
                pageKey="mp"
                paramKey="mq"
                placeholder="Search name…"
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {userEventTypes.length === 0 ? (
              <EmptyState
                description="This user hasn't created any meeting types."
                icon={<CalendarDot size={24} />}
                title="No meeting types yet"
              />
            ) : (
              userEventTypes.map((et) => (
                <div
                  className="flex items-center justify-between gap-4 border-t border-base-300 px-5 py-4 first:border-0 transition-colors hover:bg-base-200/30"
                  key={et.id}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className="size-3 shrink-0"
                      style={{ backgroundColor: et.color ?? "var(--primary)" }}
                    />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold truncate">
                          {et.name}
                        </p>
                        <span
                          className={cn(
                            "shrink-0 inline-flex items-center gap-1 border px-1.5 py-0.5 text-xs font-semibold",
                            et.isActive
                              ? "border-success/25 bg-success/10 text-success"
                              : "border-base-300 bg-base-200 text-muted-foreground"
                          )}
                        >
                          <span
                            className={cn(
                              "size-1 rounded-full",
                              et.isActive
                                ? "bg-success"
                                : "bg-muted-foreground/40"
                            )}
                          />
                          {et.isActive ? "Active" : "Inactive"}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        /{et.slug}
                        {et.minDuration ? ` · ${et.minDuration} min` : ""}
                      </p>
                    </div>
                  </div>
                  <EventTypeDeleteButton eventTypeId={et.id} hostUserId={id} />
                </div>
              ))
            )}
            {mpTotal > 1 && (
              <SectionPager
                page={mpPage}
                paramKey="mp"
                perPage={PER_PAGE}
                sp={sp}
                total={eventTypeCount?.value ?? 0}
                totalPages={mpTotal}
              />
            )}
          </CardContent>
        </Card>

        {/* Bookings */}
        <Card className="h-full">
          <CardHeader className="border-b border-base-300 py-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="flex size-6 items-center justify-center bg-primary/10 text-primary">
                  <CalendarCheck size={13} weight="bold" />
                </span>
                <CardTitle className="text-sm font-bold uppercase tracking-ui text-base-content/70">
                  Bookings
                </CardTitle>
                <span className="text-xs text-muted-foreground">
                  ({bookingCount?.value ?? 0})
                </span>
              </div>
              <SectionSearch
                initialValue={bq}
                pageKey="bp"
                paramKey="bq"
                placeholder="Search name or email…"
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {recentBookings.length === 0 ? (
              <EmptyState
                description="Bookings created by this user will appear here."
                icon={<CalendarCheck size={24} />}
                title="No bookings yet"
              />
            ) : (
              recentBookings.map((b) => (
                <div
                  className="flex items-center justify-between gap-4 border-t border-base-300 px-5 py-3.5 first:border-0 transition-colors hover:bg-base-200/30"
                  key={b.id}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">
                      {b.inviteeName}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground truncate">
                      {b.inviteeEmail} ·{" "}
                      {format(b.startTime, "MMM d, yyyy 'at' h:mm a")}
                      {b.duration ? ` · ${b.duration} min` : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 border px-2 py-0.5 text-xs font-semibold capitalize",
                        b.status === "confirmed"
                          ? "border-success/25 bg-success/10 text-success"
                          : b.status === "cancelled"
                            ? "border-error/25 bg-error/10 text-error"
                            : "border-base-300 bg-base-200 text-muted-foreground"
                      )}
                    >
                      <span
                        className={cn(
                          "size-1 rounded-full",
                          b.status === "confirmed"
                            ? "bg-success"
                            : b.status === "cancelled"
                              ? "bg-error"
                              : "bg-muted-foreground/40"
                        )}
                      />
                      {b.status}
                    </span>
                    <BookingCancelButton
                      bookingId={b.id}
                      hostUserId={id}
                      status={b.status}
                    />
                  </div>
                </div>
              ))
            )}
            {bTotal > 1 && (
              <SectionPager
                page={bPage}
                paramKey="bp"
                perPage={PER_PAGE}
                sp={sp}
                total={bookingCount?.value ?? 0}
                totalPages={bTotal}
              />
            )}
          </CardContent>
        </Card>
      </div>
      {/* end side-by-side grid */}

      {/* ── Activity Timeline ── */}
      <Card>
        <CardHeader className="border-b border-base-300 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="flex size-6 items-center justify-center bg-primary/10 text-primary">
                <ClockCounterClockwise size={13} weight="bold" />
              </span>
              <CardTitle className="text-sm font-bold uppercase tracking-ui text-base-content/70">
                Activity Log
              </CardTitle>
              <span className="text-xs text-muted-foreground">
                ({auditCount?.value ?? 0})
              </span>
            </div>
            <SectionSearch
              initialValue={aq}
              pageKey="ap"
              paramKey="aq"
              placeholder="Search action…"
            />
          </div>
        </CardHeader>
        <CardContent className="px-5 py-4">
          {recentAudit.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm text-muted-foreground">
                No activity recorded yet.
              </p>
            </div>
          ) : (
            <ol className="space-y-0">
              {recentAudit.map((log, i) => {
                const { iconEl, colorClass } = getAuditMeta(log.action);
                return (
                  <li
                    className="relative flex gap-4 pb-5 last:pb-0"
                    key={log.id}
                  >
                    {i < recentAudit.length - 1 && (
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
                      {iconEl}
                    </span>
                    <div className="min-w-0 flex-1 pt-1">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold capitalize">
                            {log.action.replace(/[._]/g, " ")}
                          </p>
                          {log.description && (
                            <p className="mt-0.5 truncate text-xs text-muted-foreground">
                              {log.description}
                            </p>
                          )}
                        </div>
                        <p className="shrink-0 text-xs text-muted-foreground whitespace-nowrap">
                          {format(log.createdAt, "MMM d, h:mm a")}
                        </p>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </CardContent>
        {aTotal > 1 && (
          <SectionPager
            page={aPage}
            paramKey="ap"
            perPage={PER_PAGE}
            sp={sp}
            total={auditCount?.value ?? 0}
            totalPages={aTotal}
          />
        )}
      </Card>
    </div>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function getAuditMeta(action: string): {
  iconEl: React.ReactNode;
  colorClass: string;
} {
  const a = action.toLowerCase();
  if (a.includes("user") && a.includes("creat")) {
    return {
      iconEl: <UserPlus size={14} />,
      colorClass: "bg-primary/10 text-primary",
    };
  }
  if (a.includes("logout") || a.includes("sign_out")) {
    return {
      iconEl: <SignOut size={14} />,
      colorClass: "bg-amber-500/10 text-amber-600",
    };
  }
  if (a.includes("login") || a.includes("sign_in")) {
    return {
      iconEl: <SignIn size={14} />,
      colorClass: "bg-success/10 text-success",
    };
  }
  if (a.includes("event_type") || a.includes("meeting")) {
    return {
      iconEl: <CalendarPlus size={14} />,
      colorClass: "bg-primary/10 text-primary",
    };
  }
  if (a.includes("availability")) {
    return {
      iconEl: <CalendarCheck size={14} />,
      colorClass: "bg-primary/10 text-primary",
    };
  }
  if (a.includes("profile") || a.includes("update")) {
    return {
      iconEl: <PencilSimple size={14} />,
      colorClass: "bg-base-200 text-muted-foreground",
    };
  }
  if (a.includes("ban") || a.includes("suspend")) {
    return {
      iconEl: <Prohibit size={14} />,
      colorClass: "bg-error/10 text-error",
    };
  }
  return {
    iconEl: <ClockCounterClockwise size={14} />,
    colorClass: "bg-base-200 text-muted-foreground",
  };
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function KpiCard({
  icon,
  label,
  value,
  numeric = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  numeric?: boolean;
}) {
  return (
    <div className="border border-base-300 bg-base-100 p-4">
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground">{icon}</span>
      </div>
      <p
        className={cn(
          "mt-2 tracking-tight text-base-content",
          numeric ? "text-3xl font-bold" : "text-lg font-semibold leading-tight"
        )}
      >
        {value}
      </p>
      <p className="mt-0.5 text-xs font-medium uppercase tracking-ui text-muted-foreground">
        {label}
      </p>
    </div>
  );
}

function InfoRow({
  icon,
  label,
  value,
  mono = false,
  highlight,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  mono?: boolean;
  highlight?: "success" | "destructive";
}) {
  return (
    <div className="flex items-start gap-3 px-5 py-3.5">
      <span className="mt-0.5 shrink-0 text-muted-foreground">{icon}</span>
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-ui text-muted-foreground">
          {label}
        </p>
        <p
          className={cn(
            "mt-0.5 truncate text-sm font-semibold",
            mono && "font-mono text-xs text-muted-foreground",
            highlight === "success" && "text-success",
            highlight === "destructive" && "text-error"
          )}
        >
          {value}
        </p>
      </div>
    </div>
  );
}

function EmptyState({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <span className="flex size-12 items-center justify-center bg-base-200 text-muted-foreground">
        {icon}
      </span>
      <p className="mt-3 text-sm font-semibold text-base-content">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function SectionPager({
  page,
  totalPages,
  total,
  paramKey,
  sp,
  perPage,
}: {
  page: number;
  totalPages: number;
  total: number;
  paramKey: string;
  sp: Record<string, string>;
  perPage: number;
}) {
  const from = (page - 1) * perPage + 1;
  const to = Math.min(page * perPage, total);

  function href(p: number) {
    const params = new URLSearchParams(sp);
    params.set(paramKey, String(p));
    return `?${params.toString()}`;
  }

  return (
    <div className="flex items-center justify-between gap-3 border-t border-base-300 px-5 py-3">
      <p className="text-xs text-muted-foreground">
        <strong className="font-semibold text-base-content">
          {from}–{to}
        </strong>{" "}
        of <strong className="font-semibold text-base-content">{total}</strong>
      </p>
      <Pagination className="mx-0 w-auto">
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              aria-disabled={page <= 1}
              className={page <= 1 ? "pointer-events-none opacity-40" : ""}
              href={page > 1 ? href(page - 1) : "#"}
            />
          </PaginationItem>
          {paginationRange(page, totalPages).map((p, i, arr) =>
            p === "ellipsis" ? (
              <PaginationItem key={`ellipsis-${arr[i - 1]}-${arr[i + 1]}`}>
                <PaginationEllipsis />
              </PaginationItem>
            ) : (
              <PaginationItem key={p}>
                <PaginationLink href={href(p)} isActive={p === page}>
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
              href={page < totalPages ? href(page + 1) : "#"}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
}
