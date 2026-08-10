import { addMinutes } from "date-fns";
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
        rateLimitKey("POST:/api/bookings/approve", request),
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
        endTime: booking.endTime,
        duration: booking.duration,
        hostUserId: booking.hostUserId,
        eventTypeId: booking.eventTypeId,
      })
      .from(booking)
      .where(eq(booking.approvalToken, token))
      .limit(1);

    if (!b) {
      return jsonError("This approval link is invalid.", 404);
    }

    if (b.status === "confirmed") {
      return NextResponse.json({ ok: true, alreadyApproved: true });
    }

    if (b.status !== "pending") {
      return jsonError("This booking cannot be approved.", 409);
    }

    if (new Date(b.startTime).getTime() < Date.now()) {
      return jsonError("This booking has already taken place.", 409);
    }

    // Load buffers + host timezone so the conflict re-check matches the create path.
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

    const start = new Date(b.startTime);
    const end = new Date(b.endTime);
    const bufferStart = et?.bufferBefore
      ? addMinutes(start, -et.bufferBefore)
      : start;
    const bufferEnd = et?.bufferAfter ? addMinutes(end, et.bufferAfter) : end;

    const date = formatInTimeZone(start, hostTz, "yyyy-MM-dd");
    const dayStartUtc = fromZonedTime(`${date}T00:00:00`, hostTz);
    const dayEndUtc = fromZonedTime(`${date}T23:59:59.999`, hostTz);

    // Transaction: advisory lock → conflict re-check → confirm. Without the
    // lock, two pending bookings for the same slot could both be approved.
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
            // only confirmed bookings block approval — other pending ones don't
            eq(booking.status, "confirmed"),
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
        .set({ status: "confirmed", updatedAt: new Date() })
        .where(eq(booking.id, b.id));

      return { ok: true } as const;
    });

    if ("conflict" in result && result.conflict) {
      return jsonError(
        "That time slot is no longer available — another booking was confirmed for it. Please reschedule or decline this request.",
        409
      );
    }

    await Promise.allSettled([
      enqueueJob(JOB_NAMES.BOOKING_APPROVED, { bookingId: b.id }),
    ]);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[POST /api/bookings/approve]", err);
    return jsonError("Something went wrong. Please try again.", 500);
  }
}
