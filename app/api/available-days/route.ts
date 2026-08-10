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
    !(await checkRateLimit(
      rateLimitKey("GET:/api/available-days", request),
      30,
      60_000
    ))
  ) {
    return jsonError("Too many requests. Please slow down.", 429);
  }

  const { searchParams } = new URL(request.url);
  const username = searchParams.get("username");
  const slug = searchParams.get("slug");
  const month = searchParams.get("month"); // YYYY-MM
  const durationParam = searchParams.get("duration");

  if (!username || !slug || !month || !/^\d{4}-\d{2}$/.test(month)) {
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

  const requestedDuration = durationParam
    ? Number.parseInt(durationParam, 10)
    : null;
  const durationMinutes =
    requestedDuration &&
    et.durations.some((d) => d.duration === requestedDuration)
      ? requestedDuration
      : defaultDuration;

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
    return NextResponse.json({ availableDates: [] });
  }

  const hostTz = schedule.timezone;
  const now = new Date();
  const todayStr = formatInTimeZone(now, hostTz, "yyyy-MM-dd");
  const rollingMax = formatInTimeZone(
    new Date(now.getTime() + (et.bookingWindow ?? 60) * 24 * 60 * 60 * 1000),
    hostTz,
    "yyyy-MM-dd"
  );

  // For a fixed window, clamp the bookable range to [rangeStart, rangeEnd];
  // otherwise use the rolling window from today.
  const isFixed =
    et.bookingWindowType === "fixed" &&
    !!et.bookingRangeStart &&
    !!et.bookingRangeEnd;
  const today =
    isFixed && et.bookingRangeStart! > todayStr
      ? et.bookingRangeStart!
      : todayStr;
  const maxDate = isFixed ? et.bookingRangeEnd! : rollingMax;

  // Build day list using UTC-based iteration — local-time Date constructors
  // shift dates by the server's TZ offset when formatted back in UTC, causing
  // today and the last day of the month to be skipped on non-UTC servers.
  const [year, mon] = month.split("-").map(Number);
  const daysInMonthCount = new Date(Date.UTC(year, mon, 0)).getUTCDate();
  const monthPad = String(mon).padStart(2, "0");
  const daysInMonth: string[] = [];
  for (let d = 1; d <= daysInMonthCount; d++) {
    daysInMonth.push(`${year}-${monthPad}-${String(d).padStart(2, "0")}`);
  }

  const monthFirstDate = daysInMonth[0];
  const monthLastDate = daysInMonth[daysInMonth.length - 1];

  const overrideRows = await db
    .select()
    .from(availabilityOverride)
    .where(
      and(
        eq(availabilityOverride.userId, host.id),
        gte(availabilityOverride.date, monthFirstDate),
        lte(availabilityOverride.date, monthLastDate)
      )
    );

  const blockedDates = new Set(
    overrideRows.filter((o) => o.isBlocked).map((o) => o.date)
  );
  const overridesByDate = new Map<
    string,
    { startTime: string; endTime: string }[]
  >();
  for (const o of overrideRows) {
    if (!o.isBlocked && o.startTime && o.endTime) {
      const existing = overridesByDate.get(o.date) ?? [];
      existing.push({ startTime: o.startTime, endTime: o.endTime });
      overridesByDate.set(o.date, existing);
    }
  }

  const monthStartUtc = fromZonedTime(`${monthFirstDate}T00:00:00`, hostTz);
  const monthEndUtc = fromZonedTime(`${monthLastDate}T23:59:59.999`, hostTz);

  const monthBookings = await db
    .select({ startTime: booking.startTime, endTime: booking.endTime })
    .from(booking)
    .where(
      and(
        eq(booking.hostUserId, host.id),
        // pending + reschedule_requested bookings also occupy the day (the
        // latter still holds its original slot) — keep them out of open slots
        inArray(booking.status, [
          "confirmed",
          "pending",
          "reschedule_requested",
        ]),
        lte(booking.startTime, monthEndUtc),
        gte(booking.endTime, monthStartUtc)
      )
    );

  const availableDates: string[] = [];

  for (const dateStr of daysInMonth) {
    if (dateStr < today || dateStr > maxDate) {
      continue;
    }
    if (blockedDates.has(dateStr)) {
      continue;
    }

    let windows: { startTime: string; endTime: string }[];

    if (overridesByDate.has(dateStr)) {
      windows = overridesByDate.get(dateStr)!;
    } else {
      const dayName = formatInTimeZone(
        new Date(`${dateStr}T12:00:00Z`),
        hostTz,
        "EEEE"
      ).toLowerCase();
      windows = schedule.windows
        .filter((w) => w.dayOfWeek === dayName)
        .map((w) => ({ startTime: w.startTime, endTime: w.endTime }));
    }

    if (windows.length === 0) {
      continue;
    }

    const dayStartUtc = fromZonedTime(`${dateStr}T00:00:00`, hostTz);
    const dayEndUtc = fromZonedTime(`${dateStr}T23:59:59.999`, hostTz);

    const dayBookings = monthBookings.filter(
      (b) =>
        new Date(b.startTime) <= dayEndUtc && new Date(b.endTime) >= dayStartUtc
    );

    // Count only bookings that START on this day, matching the create path's
    // maxBookingsPerDay check.
    const sameDayStartCount = dayBookings.filter((b) => {
      const s = new Date(b.startTime);
      return s >= dayStartUtc && s <= dayEndUtc;
    }).length;

    if (
      et.maxBookingsPerDay !== null &&
      et.maxBookingsPerDay !== undefined &&
      sameDayStartCount >= et.maxBookingsPerDay
    ) {
      continue;
    }

    const slots = generateSlots({
      date: dateStr,
      timezone: hostTz,
      windows,
      durationMinutes,
      bufferBefore: et.bufferBefore ?? 0,
      bufferAfter: et.bufferAfter ?? 0,
      increment: et.startTimeIncrement ?? 30,
      existingBookings: dayBookings.map((b) => ({
        startTime: new Date(b.startTime),
        endTime: new Date(b.endTime),
      })),
      minimumNoticeMinutes: et.minimumNotice ?? 60,
      nowUtc: now,
    });

    if (slots.length > 0) {
      availableDates.push(dateStr);
    }
  }

  return NextResponse.json({ availableDates });
}
