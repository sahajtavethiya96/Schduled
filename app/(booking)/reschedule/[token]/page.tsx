import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";
import { addDays } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { and, eq } from "drizzle-orm";
import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
  availabilitySchedule,
  booking,
  cancellationPolicy,
  eventType,
  user,
} from "@/db/schema";
import { db } from "@/lib/db";
import { RescheduleClient } from "./reschedule-client";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

function RescheduleNotice({
  children,
  backHref,
}: {
  children: ReactNode;
  backHref: string;
}) {
  return (
    <main className="mx-auto max-w-lg px-4 py-16">
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-sm text-muted-foreground">{children}</p>
          <div className="mt-6 flex justify-center">
            <Link
              className="inline-flex items-center gap-2 border border-base-300 px-4 py-2 text-sm font-semibold text-base-content transition-colors hover:border-primary/40 hover:bg-primary/[0.04] hover:text-primary"
              href={backHref}
            >
              <ArrowLeft size={14} />
              Back to booking page
            </Link>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}

export default async function ReschedulePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const [b] = await db
    .select({
      id: booking.id,
      status: booking.status,
      startTime: booking.startTime,
      rescheduleTokenExpiresAt: booking.rescheduleTokenExpiresAt,
      rescheduleCount: booking.rescheduleCount,
      duration: booking.duration,
      eventTypeId: booking.eventTypeId,
      inviteeTimezone: booking.inviteeTimezone,
      etName: eventType.name,
      etSlug: eventType.slug,
      etUserId: eventType.userId,
      bookingWindow: eventType.bookingWindow,
      bookingWindowType: eventType.bookingWindowType,
      bookingRangeStart: eventType.bookingRangeStart,
      bookingRangeEnd: eventType.bookingRangeEnd,
      availabilityScheduleId: eventType.availabilityScheduleId,
      hostName: user.name,
      hostUsername: user.username,
    })
    .from(booking)
    .innerJoin(eventType, eq(eventType.id, booking.eventTypeId))
    .innerJoin(user, eq(user.id, booking.hostUserId))
    .where(eq(booking.rescheduleToken, token))
    .limit(1);

  if (!b?.hostUsername) {
    return (
      <main className="mx-auto max-w-lg px-4 py-16">
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            This reschedule link is invalid or has expired.
          </CardContent>
        </Card>
      </main>
    );
  }

  if (b.status === "cancelled") {
    return (
      <RescheduleNotice backHref={`/${b.hostUsername}/${b.etSlug}`}>
        This booking has been cancelled and can no longer be rescheduled.
      </RescheduleNotice>
    );
  }

  if (b.startTime < new Date()) {
    return (
      <RescheduleNotice backHref={`/${b.hostUsername}/${b.etSlug}`}>
        This meeting has already passed and can no longer be rescheduled.
      </RescheduleNotice>
    );
  }

  if (b.rescheduleTokenExpiresAt && b.rescheduleTokenExpiresAt < new Date()) {
    return (
      <RescheduleNotice backHref={`/${b.hostUsername}/${b.etSlug}`}>
        This reschedule link has expired. Please contact the host to arrange a
        new time.
      </RescheduleNotice>
    );
  }

  // Enforce reschedule policy before showing the UI — no late 403 surprises
  const [reschedulePolicy] = await db
    .select({
      allowRescheduling: cancellationPolicy.allowRescheduling,
      rescheduleCutoffHours: cancellationPolicy.rescheduleCutoffHours,
      maxReschedules: cancellationPolicy.maxReschedules,
    })
    .from(cancellationPolicy)
    .where(eq(cancellationPolicy.eventTypeId, b.eventTypeId))
    .limit(1);

  if (reschedulePolicy && !reschedulePolicy.allowRescheduling) {
    return (
      <RescheduleNotice backHref={`/${b.hostUsername}/${b.etSlug}`}>
        Rescheduling is not allowed for this event type. Please contact the host
        directly.
      </RescheduleNotice>
    );
  }

  const cutoff = reschedulePolicy?.rescheduleCutoffHours ?? 0;
  if (cutoff > 0) {
    const hoursUntil = (b.startTime.getTime() - Date.now()) / 3_600_000;
    if (hoursUntil < cutoff) {
      return (
        <RescheduleNotice backHref={`/${b.hostUsername}/${b.etSlug}`}>
          Rescheduling must be done at least{" "}
          <strong>
            {cutoff} hour{cutoff === 1 ? "" : "s"}
          </strong>{" "}
          before the meeting. Please contact the host directly.
        </RescheduleNotice>
      );
    }
  }

  const maxReschedules = reschedulePolicy?.maxReschedules;
  if (
    maxReschedules !== null &&
    maxReschedules !== undefined &&
    b.rescheduleCount >= maxReschedules
  ) {
    return (
      <RescheduleNotice backHref={`/${b.hostUsername}/${b.etSlug}`}>
        This booking has already been rescheduled {b.rescheduleCount} time
        {b.rescheduleCount === 1 ? "" : "s"}, which is the maximum allowed.
        Please contact the host directly.
      </RescheduleNotice>
    );
  }

  const schedule = await db.query.availabilitySchedule.findFirst({
    where: b.availabilityScheduleId
      ? and(
          eq(availabilitySchedule.id, b.availabilityScheduleId),
          eq(availabilitySchedule.userId, b.etUserId)
        )
      : and(
          eq(availabilitySchedule.userId, b.etUserId),
          eq(availabilitySchedule.isDefault, true)
        ),
    with: { windows: true },
  });

  const hostTz = schedule?.timezone ?? "UTC";
  const now = new Date();
  const todayStr = formatInTimeZone(now, hostTz, "yyyy-MM-dd");
  const rollingMax = formatInTimeZone(
    addDays(now, b.bookingWindow ?? 60),
    hostTz,
    "yyyy-MM-dd"
  );

  // Mirrors /api/slots and /api/available-days so the calendar never offers a
  // date the reschedule API would reject.
  const isFixed =
    b.bookingWindowType === "fixed" &&
    !!b.bookingRangeStart &&
    !!b.bookingRangeEnd;
  const today =
    isFixed && b.bookingRangeStart! > todayStr
      ? b.bookingRangeStart!
      : todayStr;
  const maxDate = isFixed ? b.bookingRangeEnd! : rollingMax;
  const availableDaysOfWeek = Array.from(
    new Set(schedule?.windows.map((w) => w.dayOfWeek) ?? [])
  );

  return (
    <RescheduleClient
      availableDaysOfWeek={availableDaysOfWeek}
      currentStartUtc={b.startTime.toISOString()}
      duration={b.duration ?? 30}
      eventName={b.etName}
      hostName={b.hostName ?? "your host"}
      inviteeTimezone={b.inviteeTimezone}
      maxDate={maxDate}
      slug={b.etSlug}
      today={today}
      token={token}
      username={b.hostUsername!}
    />
  );
}
