import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import { and, eq, gte, lte, ne, sql } from "drizzle-orm";
import { booking, meetingLimit } from "@/db/schema";
import type { db } from "@/lib/db";

// The first argument of the drizzle transaction callback — so this helper can
// run inside the same advisory-locked transaction as the caller.
type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export type LimitViolation =
  | { kind: "daily" }
  | { kind: "global"; period: "day" | "week" | "month" }
  | null;

/**
 * Enforces per-event `maxBookingsPerDay` and the host's global weekly/monthly
 * `meetingLimit` rules. MUST be called inside the booking transaction, after the
 * host-wide advisory lock, so concurrent bookings can't both slip under a limit.
 *
 * Pass `excludeBookingId` when re-checking during a reschedule so the booking
 * being moved doesn't count against itself.
 */
export async function checkBookingLimits(
  tx: Tx,
  opts: {
    hostUserId: string;
    hostTz: string;
    startTime: Date;
    dayStartUtc: Date;
    dayEndUtc: Date;
    maxBookingsPerDay: number | null | undefined;
    excludeBookingId?: string;
  }
): Promise<LimitViolation> {
  const {
    hostUserId,
    hostTz,
    startTime,
    dayStartUtc,
    dayEndUtc,
    maxBookingsPerDay,
    excludeBookingId,
  } = opts;

  const activeStatus = sql`${booking.status} IN ('confirmed', 'pending', 'reschedule_requested')`;
  const excludeSelf = excludeBookingId
    ? ne(booking.id, excludeBookingId)
    : undefined;

  // ── Per-event daily cap ──────────────────────────────────────────────────
  if (maxBookingsPerDay != null) {
    const dayRows = await tx
      .select({ id: booking.id })
      .from(booking)
      .where(
        and(
          eq(booking.hostUserId, hostUserId),
          activeStatus,
          gte(booking.startTime, dayStartUtc),
          lte(booking.startTime, dayEndUtc),
          excludeSelf
        )
      );
    if (dayRows.length >= maxBookingsPerDay) {
      return { kind: "daily" };
    }
  }

  // ── Global weekly/monthly limits ─────────────────────────────────────────
  const globalLimits = await tx
    .select({ period: meetingLimit.period, count: meetingLimit.count })
    .from(meetingLimit)
    .where(eq(meetingLimit.userId, hostUserId));
  if (globalLimits.length === 0) {
    return null;
  }

  const allHostBookings = await tx
    .select({ startTime: booking.startTime })
    .from(booking)
    .where(and(eq(booking.hostUserId, hostUserId), activeStatus, excludeSelf));

  // Week/month boundaries are computed in the HOST's timezone (matching the day
  // window) so a late-evening booking near midnight lands in the right bucket.
  const fmtCal = (d: Date) =>
    `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
  const [ly, lm, ld] = formatInTimeZone(startTime, hostTz, "yyyy-MM-dd")
    .split("-")
    .map(Number);
  const isoDow = Number(formatInTimeZone(startTime, hostTz, "i")); // 1=Mon..7=Sun
  const localCal = new Date(Date.UTC(ly, lm - 1, ld));

  const weekStartCal = new Date(localCal);
  weekStartCal.setUTCDate(localCal.getUTCDate() - (isoDow - 1));
  const weekEndCal = new Date(weekStartCal);
  weekEndCal.setUTCDate(weekStartCal.getUTCDate() + 6);
  const weekStartUtc = fromZonedTime(
    `${fmtCal(weekStartCal)}T00:00:00`,
    hostTz
  );
  const weekEndUtc = fromZonedTime(
    `${fmtCal(weekEndCal)}T23:59:59.999`,
    hostTz
  );

  const monthEndCal = new Date(Date.UTC(ly, lm, 0));
  const monthStartUtc = fromZonedTime(
    `${ly}-${String(lm).padStart(2, "0")}-01T00:00:00`,
    hostTz
  );
  const monthEndUtc = fromZonedTime(
    `${fmtCal(monthEndCal)}T23:59:59.999`,
    hostTz
  );

  for (const lim of globalLimits) {
    let windowStart: Date, windowEnd: Date;
    if (lim.period === "day") {
      windowStart = dayStartUtc;
      windowEnd = dayEndUtc;
    } else if (lim.period === "week") {
      windowStart = weekStartUtc;
      windowEnd = weekEndUtc;
    } else {
      windowStart = monthStartUtc;
      windowEnd = monthEndUtc;
    }

    const windowCount = allHostBookings.filter(
      (row) => row.startTime >= windowStart && row.startTime <= windowEnd
    ).length;
    if (windowCount >= lim.count) {
      return { kind: "global", period: lim.period as "day" | "week" | "month" };
    }
  }
  return null;
}
