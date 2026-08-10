import { formatInTimeZone } from "date-fns-tz";
import { and, eq } from "drizzle-orm";
import { availabilityOverride, availabilityWindow } from "@/db/schema";
import { db } from "@/lib/db";
import { generateSlots } from "./slots";

/**
 * True if `startUtc` is a genuine bookable slot start for the host on that date:
 * inside a weekly working window (or a date-specific override), aligned to the
 * event's start-time increment, and not on a blocked (holiday / day-off) date.
 *
 * This is the server-side backstop for the create/reschedule routes — the
 * public `/api/slots` endpoint only *displays* valid slots, but a direct API
 * call could otherwise POST any arbitrary time. It deliberately does NOT check
 * existing-booking conflicts or minimum notice (the routes enforce those
 * separately, under an advisory lock), so it can't double-reject a slot for a
 * reason already handled — it answers only "is this a real time on the
 * schedule?".
 */
export async function isSlotBookable({
  hostUserId,
  scheduleId,
  hostTz,
  startUtc,
  durationMinutes,
  bufferBefore = 0,
  bufferAfter = 0,
  increment = 30,
}: {
  hostUserId: string;
  scheduleId: string | null | undefined;
  hostTz: string;
  startUtc: Date;
  durationMinutes: number;
  bufferBefore?: number;
  bufferAfter?: number;
  increment?: number;
}): Promise<boolean> {
  const date = formatInTimeZone(startUtc, hostTz, "yyyy-MM-dd");

  // Date-specific overrides (holidays / custom hours) take precedence.
  const overrides = await db
    .select()
    .from(availabilityOverride)
    .where(
      and(
        eq(availabilityOverride.userId, hostUserId),
        eq(availabilityOverride.date, date)
      )
    );

  if (overrides.some((o) => o.isBlocked)) {
    return false;
  }

  let windows: { startTime: string; endTime: string }[];
  if (overrides.length > 0) {
    windows = overrides
      .filter((o) => !o.isBlocked && o.startTime && o.endTime)
      .map((o) => ({
        startTime: o.startTime as string,
        endTime: o.endTime as string,
      }));
  } else {
    if (!scheduleId) {
      return false;
    }
    const dayName = formatInTimeZone(
      new Date(`${date}T12:00:00Z`),
      hostTz,
      "EEEE"
    ).toLowerCase();
    const rows = await db
      .select({
        dayOfWeek: availabilityWindow.dayOfWeek,
        startTime: availabilityWindow.startTime,
        endTime: availabilityWindow.endTime,
      })
      .from(availabilityWindow)
      .where(eq(availabilityWindow.scheduleId, scheduleId));
    windows = rows
      .filter((w) => w.dayOfWeek === dayName)
      .map((w) => ({ startTime: w.startTime, endTime: w.endTime }));
  }

  // Same dedup as /api/slots — no unique constraint on the window rows.
  windows = Array.from(
    new Map(windows.map((w) => [`${w.startTime}-${w.endTime}`, w])).values()
  );
  if (windows.length === 0) {
    return false;
  }

  const slots = generateSlots({
    date,
    timezone: hostTz,
    windows,
    durationMinutes,
    bufferBefore,
    bufferAfter,
    increment,
    existingBookings: [], // conflicts checked separately, under the advisory lock
    minimumNoticeMinutes: 0, // notice checked separately
    nowUtc: new Date(0), // epoch → don't filter any slot by "now"
  });

  const target = startUtc.toISOString();
  return slots.some((s) => s.startUtc === target);
}
