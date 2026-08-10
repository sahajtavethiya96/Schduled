import { addDays } from "date-fns";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import { and, eq, gte, inArray, lte } from "drizzle-orm";
import { NextResponse } from "next/server";
import {
  availabilityOverride,
  availabilitySchedule,
  booking,
  eventType,
  user,
} from "@/db/schema";
import { checkRateLimit, jsonError, rateLimitKey } from "@/lib/api/helpers";
import { generateSlots } from "@/lib/calendar/slots";
import { db } from "@/lib/db";

export async function GET(request: Request) {
  if (
    !(await checkRateLimit(rateLimitKey("GET:/api/slots", request), 30, 60_000))
  ) {
    return jsonError("Too many requests. Please slow down.", 429);
  }

  const { searchParams } = new URL(request.url);
  const username = searchParams.get("username");
  const slug = searchParams.get("slug");
  const date = searchParams.get("date"); // YYYY-MM-DD in host TZ
  const durationParam = searchParams.get("duration");

  if (!username || !slug || !date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return jsonError("Missing required params", 400);
  }

  const [host] = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.username, username))
    .limit(1);

  if (!host) {
    return jsonError("Host not found", 404);
  }

  const et = await db.query.eventType.findFirst({
    where: and(
      eq(eventType.userId, host.id),
      eq(eventType.slug, slug),
      eq(eventType.isActive, true),
      eq(eventType.isHidden, false)
    ),
    with: { durations: true },
  });

  if (!et) {
    return jsonError("Event type not found", 404);
  }

  const defaultDuration =
    et.durations.find((d) => d.isDefault)?.duration ??
    et.durations[0]?.duration ??
    30;

  // Use duration from query param if valid and belongs to this event type
  const requestedDuration = durationParam
    ? Number.parseInt(durationParam, 10)
    : null;
  const durationMinutes =
    requestedDuration &&
    et.durations.some((d) => d.duration === requestedDuration)
      ? requestedDuration
      : defaultDuration;

  const now = new Date();

  const schedule = await db.query.availabilitySchedule.findFirst({
    where: et.availabilityScheduleId
      ? and(
          eq(availabilitySchedule.id, et.availabilityScheduleId),
          eq(availabilitySchedule.userId, host.id)
        )
      : and(
          eq(availabilitySchedule.userId, host.id),
          eq(availabilitySchedule.isDefault, true)
        ),
    with: { windows: true },
  });

  if (!schedule) {
    return NextResponse.json({ slots: [] });
  }

  const hostTz = schedule.timezone;
  const todayStr = formatInTimeZone(now, hostTz, "yyyy-MM-dd");
  const rollingMax = formatInTimeZone(
    addDays(now, et.bookingWindow ?? 60),
    hostTz,
    "yyyy-MM-dd"
  );

  // Fixed window clamps to [rangeStart, rangeEnd]; otherwise rolling from today.
  const isFixed =
    et.bookingWindowType === "fixed" &&
    !!et.bookingRangeStart &&
    !!et.bookingRangeEnd;
  const today =
    isFixed && et.bookingRangeStart! > todayStr
      ? et.bookingRangeStart!
      : todayStr;
  const maxDate = isFixed ? et.bookingRangeEnd! : rollingMax;

  if (date < today || date > maxDate) {
    return NextResponse.json({ slots: [] });
  }

  // Check overrides for this exact date
  const overrideRows = await db
    .select()
    .from(availabilityOverride)
    .where(
      and(
        eq(availabilityOverride.userId, host.id),
        eq(availabilityOverride.date, date)
      )
    );

  if (overrideRows.some((o) => o.isBlocked)) {
    return NextResponse.json({ slots: [] });
  }

  let windows: { startTime: string; endTime: string }[];

  if (overrideRows.length > 0) {
    // Use override windows if present
    windows = overrideRows
      .filter((o) => !o.isBlocked && o.startTime && o.endTime)
      .map((o) => ({ startTime: o.startTime!, endTime: o.endTime! }));
  } else {
    // Get day of week for this date in the host's timezone
    const dayName = formatInTimeZone(
      new Date(`${date}T12:00:00Z`),
      hostTz,
      "EEEE"
    ).toLowerCase();
    windows = schedule.windows
      .filter((w) => w.dayOfWeek === dayName)
      .map((w) => ({ startTime: w.startTime, endTime: w.endTime }));
  }

  // Deduplicate windows — DB has no unique constraint on (scheduleId, dayOfWeek, startTime, endTime)
  windows = Array.from(
    new Map(windows.map((w) => [`${w.startTime}-${w.endTime}`, w])).values()
  );

  if (windows.length === 0) {
    return NextResponse.json({ slots: [] });
  }

  // Load existing bookings that overlap this calendar day in host TZ
  const dayStartUtc = fromZonedTime(`${date}T00:00:00`, hostTz);
  const dayEndUtc = fromZonedTime(`${date}T23:59:59.999`, hostTz);

  const existingBookings = await db
    .select({ startTime: booking.startTime, endTime: booking.endTime })
    .from(booking)
    .where(
      and(
        eq(booking.hostUserId, host.id),
        // pending (awaiting-approval) bookings also hold the slot — otherwise a
        // second invitee sees it as open and hits a 409 at submit time.
        // reschedule_requested holds its ORIGINAL slot until the host decides.
        inArray(booking.status, [
          "confirmed",
          "pending",
          "reschedule_requested",
        ]),
        lte(booking.startTime, dayEndUtc),
        gte(booking.endTime, dayStartUtc)
      )
    );

  // Count only bookings whose START falls on this day, matching the create
  // path's maxBookingsPerDay check (overlapping prior-day bookings don't count).
  const sameDayStartCount = existingBookings.filter(
    (b) => b.startTime >= dayStartUtc && b.startTime <= dayEndUtc
  ).length;

  if (
    et.maxBookingsPerDay !== null &&
    et.maxBookingsPerDay !== undefined &&
    sameDayStartCount >= et.maxBookingsPerDay
  ) {
    return NextResponse.json({ slots: [] });
  }

  const slots = generateSlots({
    date,
    timezone: hostTz,
    windows,
    durationMinutes,
    bufferBefore: et.bufferBefore ?? 0,
    bufferAfter: et.bufferAfter ?? 0,
    increment: et.startTimeIncrement ?? 30,
    existingBookings: existingBookings.map((b) => ({
      startTime: new Date(b.startTime),
      endTime: new Date(b.endTime),
    })),
    minimumNoticeMinutes: et.minimumNotice ?? 60,
    nowUtc: now,
  });

  // Final guard: deduplicate by startUtc before sending to client
  const uniqueSlots = Array.from(
    new Map(slots.map((s) => [s.startUtc, s])).values()
  );

  return NextResponse.json({ slots: uniqueSlots, hostTimezone: hostTz });
}
