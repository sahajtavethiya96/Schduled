import { createId } from "@paralleldrive/cuid2";
import { addHours, addMinutes } from "date-fns";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import { and, eq, gte, lte, ne, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import {
  availabilitySchedule,
  booking,
  cancellationPolicy,
  eventType,
} from "@/db/schema";
import { checkRateLimit, jsonError, rateLimitKey } from "@/lib/api/helpers";
import { getCurrentSession } from "@/lib/authz";
import { checkBookingLimits } from "@/lib/calendar/limits";
import { isSlotBookable } from "@/lib/calendar/validate-slot";
import { db } from "@/lib/db";
import { enqueueJob } from "@/lib/worker/enqueue";
import { JOB_NAMES } from "@/lib/worker/job-types";

interface RescheduleBody {
  startUtc: string;
  token: string;
}

export async function POST(request: Request) {
  try {
    if (
      !(await checkRateLimit(
        rateLimitKey("POST:/api/bookings/reschedule", request),
        10,
        60_000
      ))
    ) {
      return jsonError("Too many requests. Please wait a moment.", 429);
    }

    const body: RescheduleBody = await request.json();
    const { token, startUtc } = body;

    if (!token || !startUtc) {
      return jsonError("Missing required fields", 400);
    }

    const newStart = new Date(startUtc);
    if (isNaN(newStart.getTime())) {
      return jsonError("Invalid start time", 400);
    }

    const nowMs = Date.now();
    if (newStart.getTime() <= nowMs) {
      return jsonError("Cannot reschedule to a time in the past.", 400);
    }

    const [b] = await db
      .select({
        id: booking.id,
        status: booking.status,
        startTime: booking.startTime,
        duration: booking.duration,
        hostUserId: booking.hostUserId,
        rescheduleCount: booking.rescheduleCount,
        eventTypeId: booking.eventTypeId,
        rescheduleTokenExpiresAt: booking.rescheduleTokenExpiresAt,
        approvalToken: booking.approvalToken,
      })
      .from(booking)
      .where(eq(booking.rescheduleToken, token))
      .limit(1);

    if (!b) {
      return jsonError("This reschedule link is invalid.", 404);
    }

    // A host rescheduling their own booking applies immediately. A guest
    // moving an already-confirmed booking instead files a reschedule request
    // for the host to approve — the confirmed meeting stays put until then.
    const session = await getCurrentSession();
    const isHostActor = !!session && session.user.id === b.hostUserId;
    const isGuestRescheduleOfConfirmed =
      !isHostActor &&
      (b.status === "confirmed" || b.status === "reschedule_requested");

    if (b.status === "cancelled") {
      return jsonError("This booking has been cancelled.", 409);
    }

    if (new Date(b.startTime).getTime() < nowMs) {
      return jsonError("This booking has already taken place.", 409);
    }

    if (
      b.rescheduleTokenExpiresAt &&
      b.rescheduleTokenExpiresAt.getTime() < nowMs
    ) {
      return jsonError("This reschedule link has expired.", 410);
    }

    const previousStartUtc = new Date(b.startTime).toISOString();
    const newEnd = addMinutes(newStart, b.duration);

    const et = await db.query.eventType.findFirst({
      where: eq(eventType.id, b.eventTypeId),
    });
    if (!et) {
      return jsonError("Event type not found", 404);
    }

    // ── Enforce the same booking rules as the create path ────────────────────
    const minimumNoticeMs = (et.minimumNotice ?? 60) * 60_000;
    if (minimumNoticeMs > 0 && newStart.getTime() - nowMs < minimumNoticeMs) {
      const mins = et.minimumNotice ?? 60;
      const label =
        mins >= 60
          ? `${mins / 60} hour${mins / 60 === 1 ? "" : "s"}`
          : `${mins} minute${mins === 1 ? "" : "s"}`;
      return jsonError(
        `This event type requires at least ${label} notice before booking.`,
        400
      );
    }

    // Rolling window only — the fixed-range check needs the host timezone and
    // runs after `date` is computed below (mirrors the create path).
    if (et.bookingWindowType !== "fixed") {
      const bookingWindowDays = et.bookingWindow ?? 60;
      const maxBookableMs = nowMs + bookingWindowDays * 86_400_000;
      if (newStart.getTime() > maxBookableMs) {
        return jsonError(
          `Bookings can only be made up to ${bookingWindowDays} days in advance.`,
          400
        );
      }
    }

    // ── Reschedule policy checks ─────────────────────────────────────────────
    const [policy] = await db
      .select({
        maxReschedules: cancellationPolicy.maxReschedules,
        allowRescheduling: cancellationPolicy.allowRescheduling,
        rescheduleCutoffHours: cancellationPolicy.rescheduleCutoffHours,
      })
      .from(cancellationPolicy)
      .where(eq(cancellationPolicy.eventTypeId, b.eventTypeId))
      .limit(1);

    if (policy) {
      if (!policy.allowRescheduling) {
        return jsonError(
          "Rescheduling is not allowed for this event type.",
          403
        );
      }

      // Cutoff is measured against the booking's CURRENT start time — you can't
      // reschedule once you're inside the host's reschedule window.
      const cutoff = policy.rescheduleCutoffHours ?? 0;
      if (cutoff > 0) {
        const hoursUntil =
          (new Date(b.startTime).getTime() - nowMs) / 3_600_000;
        if (hoursUntil < cutoff) {
          return jsonError(
            `Rescheduling must be done at least ${cutoff} hour${cutoff === 1 ? "" : "s"} before the meeting.`,
            403
          );
        }
      }

      if (
        policy.maxReschedules != null &&
        b.rescheduleCount >= policy.maxReschedules
      ) {
        return jsonError(
          `This booking cannot be rescheduled more than ${policy.maxReschedules} time${policy.maxReschedules === 1 ? "" : "s"}.`,
          409
        );
      }
    }

    const schedule = await db.query.availabilitySchedule.findFirst({
      where: et.availabilityScheduleId
        ? and(
            eq(availabilitySchedule.id, et.availabilityScheduleId),
            eq(availabilitySchedule.userId, b.hostUserId)
          )
        : and(
            eq(availabilitySchedule.userId, b.hostUserId),
            eq(availabilitySchedule.isDefault, true)
          ),
    });
    const hostTz = schedule?.timezone ?? "UTC";

    const bufferStart = et.bufferBefore
      ? addMinutes(newStart, -et.bufferBefore)
      : newStart;
    const bufferEnd = et.bufferAfter
      ? addMinutes(newEnd, et.bufferAfter)
      : newEnd;

    const date = formatInTimeZone(newStart, hostTz, "yyyy-MM-dd");
    const dayStartUtc = fromZonedTime(`${date}T00:00:00`, hostTz);
    const dayEndUtc = fromZonedTime(`${date}T23:59:59.999`, hostTz);

    // Fixed booking window — the new date must fall inside the configured range.
    if (
      et.bookingWindowType === "fixed" &&
      et.bookingRangeStart &&
      et.bookingRangeEnd &&
      (date < et.bookingRangeStart || date > et.bookingRangeEnd)
    ) {
      return jsonError(
        `This event can only be booked between ${et.bookingRangeStart} and ${et.bookingRangeEnd}.`,
        400
      );
    }

    // Re-validate against the host's real schedule — a direct API call could
    // otherwise POST any arbitrary time (conflicts + notice checked separately).
    const bookable = await isSlotBookable({
      hostUserId: b.hostUserId,
      scheduleId: schedule?.id,
      hostTz,
      startUtc: newStart,
      durationMinutes: b.duration,
      bufferBefore: et.bufferBefore ?? 0,
      bufferAfter: et.bufferAfter ?? 0,
      increment: et.startTimeIncrement ?? 30,
    });
    if (!bookable) {
      return jsonError(
        "That time isn't available. Please choose an open slot.",
        409
      );
    }

    // Transaction: advisory lock → conflict re-check → UPDATE. Host-wide lock
    // so overlapping-but-different-start moves can't both pass the conflict
    // re-check under READ COMMITTED.
    const result = await db.transaction(async (tx) => {
      await tx.execute(
        sql`SELECT pg_advisory_xact_lock(hashtext(${b.hostUserId}))`
      );

      const existing = await tx
        .select({ startTime: booking.startTime, endTime: booking.endTime })
        .from(booking)
        .where(
          and(
            eq(booking.hostUserId, b.hostUserId),
            // pending + reschedule_requested included so this can't collide with
            // an awaiting-approval slot or another booking's held original slot
            sql`${booking.status} IN ('confirmed', 'pending', 'reschedule_requested')`,
            ne(booking.id, b.id),
            lte(booking.startTime, dayEndUtc),
            gte(booking.endTime, dayStartUtc)
          )
        );

      const hasConflict = existing.some(
        (e) =>
          bufferStart < new Date(e.endTime) && bufferEnd > new Date(e.startTime)
      );
      if (hasConflict) {
        return { conflict: true } as const;
      }

      // Moving to a new day still respects the per-day cap and the host's
      // weekly/monthly limits; the booking being moved is excluded so it
      // never counts against itself.
      const limit = await checkBookingLimits(tx, {
        hostUserId: b.hostUserId,
        hostTz,
        startTime: newStart,
        dayStartUtc,
        dayEndUtc,
        maxBookingsPerDay: et.maxBookingsPerDay,
        excludeBookingId: b.id,
      });
      if (limit) {
        return { limit } as const;
      }

      if (isGuestRescheduleOfConfirmed) {
        // Stage the proposed time and flip to reschedule_requested instead of
        // touching startTime/endTime — the original meeting stays booked until
        // the host approves. Reuse approvalToken for the host's review link.
        const approvalToken = b.approvalToken ?? createId();
        await tx
          .update(booking)
          .set({
            status: "reschedule_requested",
            rescheduleRequestedStart: newStart,
            rescheduleRequestedEnd: newEnd,
            approvalToken,
            updatedAt: new Date(),
          })
          .where(eq(booking.id, b.id));

        return { requested: true } as const;
      }

      await tx
        .update(booking)
        .set({
          startTime: newStart,
          endTime: newEnd,
          // A host reschedule never changes approval state — confirmed stays
          // confirmed, pending stays pending.
          rescheduleCount: b.rescheduleCount + 1,
          rescheduleTokenExpiresAt: addHours(newEnd, 24),
          cancelTokenExpiresAt: addHours(newEnd, 24),
          updatedAt: new Date(),
        })
        .where(eq(booking.id, b.id));

      return { ok: true } as const;
    });

    if ("conflict" in result && result.conflict) {
      return jsonError(
        "That time is no longer available. Please pick another.",
        409
      );
    }

    if ("limit" in result && result.limit) {
      const msg =
        result.limit.kind === "daily"
          ? "The host is fully booked on that day. Please choose another date."
          : `The host has reached their ${{ day: "daily", week: "weekly", month: "monthly" }[result.limit.period]} meeting limit for that period. Please choose another time.`;
      return jsonError(msg, 409);
    }

    if ("requested" in result && result.requested) {
      // Notify the host to approve/reject; no calendar/reminder changes since
      // the original meeting is untouched until approved. The guest gets no
      // email now — their UI shows "Awaiting host approval" via requiresApproval.
      await Promise.allSettled([
        enqueueJob(JOB_NAMES.BOOKING_RESCHEDULE_REQUEST, {
          bookingId: b.id,
          previousStartUtc,
        }),
      ]);

      return NextResponse.json({
        ok: true,
        requiresApproval: true,
        startUtc: newStart.toISOString(),
        endUtc: newEnd.toISOString(),
      });
    }

    if (b.status === "pending") {
      // isReschedule=true suppresses a redundant "pending" email to the invitee
      // (they already got one on the original submission). allSettled so an
      // enqueue failure doesn't surface as a 500 after the reschedule committed.
      await Promise.allSettled([
        enqueueJob(JOB_NAMES.BOOKING_APPROVAL_REQUEST, {
          bookingId: b.id,
          isReschedule: true,
        }),
      ]);
    } else {
      await Promise.allSettled([
        enqueueJob(JOB_NAMES.BOOKING_RESCHEDULE_NOTIFY, {
          bookingId: b.id,
          previousStartUtc,
        }),
        enqueueJob(JOB_NAMES.CALENDAR_UPDATE, { bookingId: b.id }),
        enqueueJob(JOB_NAMES.BOOKING_RESCHEDULE_REMINDERS, {
          bookingId: b.id,
          newStartTime: newStart.toISOString(),
          newEndTime: newEnd.toISOString(),
        }),
      ]);
    }

    return NextResponse.json({
      ok: true,
      requiresApproval: b.status === "pending",
      startUtc: newStart.toISOString(),
      endUtc: newEnd.toISOString(),
    });
  } catch (err) {
    console.error("[POST /api/bookings/reschedule]", err);
    return jsonError("Something went wrong. Please try again.", 500);
  }
}
