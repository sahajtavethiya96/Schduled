import { addHours, addMinutes } from "date-fns";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import { and, eq, gte, lte, ne, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { availabilitySchedule, booking, eventType } from "@/db/schema";
import { checkRateLimit, jsonError, rateLimitKey } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { enqueueJob } from "@/lib/worker/enqueue";
import { JOB_NAMES } from "@/lib/worker/job-types";

interface ApproveBody {
  token: string;
}

export async function POST(request: Request) {
  try {
    if (
      !(await checkRateLimit(
        rateLimitKey("POST:/api/bookings/reschedule-approve", request),
        20,
        60_000
      ))
    ) {
      return jsonError("Too many requests. Please wait a moment.", 429);
    }

    const body: ApproveBody = await request.json();
    const { token } = body;
    if (!token) {
      return jsonError("Missing approval token", 400);
    }

    const [b] = await db
      .select({
        id: booking.id,
        status: booking.status,
        startTime: booking.startTime,
        duration: booking.duration,
        hostUserId: booking.hostUserId,
        eventTypeId: booking.eventTypeId,
        rescheduleCount: booking.rescheduleCount,
        rescheduleRequestedStart: booking.rescheduleRequestedStart,
        rescheduleRequestedEnd: booking.rescheduleRequestedEnd,
      })
      .from(booking)
      .where(eq(booking.approvalToken, token))
      .limit(1);

    if (!b) {
      return jsonError("This approval link is invalid.", 404);
    }

    if (
      b.status !== "reschedule_requested" ||
      !b.rescheduleRequestedStart ||
      !b.rescheduleRequestedEnd
    ) {
      return jsonError("This reschedule request is no longer valid.", 409);
    }

    const newStart = new Date(b.rescheduleRequestedStart);
    const newEnd = new Date(b.rescheduleRequestedEnd);
    if (newStart.getTime() < Date.now()) {
      return jsonError(
        "The requested time is now in the past. Please decline and ask for another time.",
        409
      );
    }

    const previousStartUtc = new Date(b.startTime).toISOString();

    // Buffers + host timezone so the conflict re-check matches the create path.
    const et = await db.query.eventType.findFirst({
      where: eq(eventType.id, b.eventTypeId),
    });
    const schedule = await db.query.availabilitySchedule.findFirst({
      where: et?.availabilityScheduleId
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

    const bufferStart = et?.bufferBefore
      ? addMinutes(newStart, -et.bufferBefore)
      : newStart;
    const bufferEnd = et?.bufferAfter
      ? addMinutes(newEnd, et.bufferAfter)
      : newEnd;
    const date = formatInTimeZone(newStart, hostTz, "yyyy-MM-dd");
    const dayStartUtc = fromZonedTime(`${date}T00:00:00`, hostTz);
    const dayEndUtc = fromZonedTime(`${date}T23:59:59.999`, hostTz);

    // Transaction: advisory lock → conflict re-check (against the proposed
    // time) → apply the staged time and confirm.
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

      await tx
        .update(booking)
        .set({
          startTime: newStart,
          endTime: newEnd,
          status: "confirmed",
          rescheduleRequestedStart: null,
          rescheduleRequestedEnd: null,
          approvalToken: null,
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
        "The requested time is no longer available. Please decline this request and ask the guest for another time.",
        409
      );
    }

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

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[POST /api/bookings/reschedule-approve]", err);
    return jsonError("Something went wrong. Please try again.", 500);
  }
}
