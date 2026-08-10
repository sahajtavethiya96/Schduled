import { formatInTimeZone } from "date-fns-tz";
import { and, eq } from "drizzle-orm";
import { availabilityOverride, availabilityWindow } from "@/db/schema";
import { db } from "@/lib/db";
import { generateSlots } from "./slots";

/**
 * True if `startUtc` is a genuine bookable slot: inside a working window (or
 * override), aligned to the increment, and not on a blocked date.
 *
 * Server-side backstop for create/reschedule — /api/slots only *displays*
 * valid slots, but a direct API call could POST anything. Deliberately does
 * NOT check booking conflicts or minimum notice (routes enforce those
 * separately under an advisory lock) — it only answers "is this a real time
 * on the schedule?".
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
