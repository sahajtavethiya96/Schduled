import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { booking, cancellationPolicy } from "@/db/schema";
import { checkRateLimit, jsonError, rateLimitKey } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { enqueueJob } from "@/lib/worker/enqueue";
import { JOB_NAMES } from "@/lib/worker/job-types";

interface CancelBody {
  reason?: string;
  token: string;
}

export async function POST(request: Request) {
  try {
    if (
      !(await checkRateLimit(
        rateLimitKey("POST:/api/bookings/cancel", request),
        10,
        60_000
      ))
    ) {
      return jsonError("Too many requests. Please wait a moment.", 429);
    }

    const body: CancelBody = await request.json();
    const { token, reason } = body;

    if (!token) {
      return jsonError("Missing cancellation token", 400);
    }

    const [b] = await db
      .select({
        id: booking.id,
        status: booking.status,
        startTime: booking.startTime,
        eventTypeId: booking.eventTypeId,
        cancelTokenExpiresAt: booking.cancelTokenExpiresAt,
      })
      .from(booking)
      .where(eq(booking.cancelToken, token))
      .limit(1);

    if (!b) {
      return jsonError("This cancellation link is invalid.", 404);
    }

    if (b.status === "cancelled") {
      return NextResponse.json({ ok: true, alreadyCancelled: true });
    }

    if (
      b.cancelTokenExpiresAt &&
      b.cancelTokenExpiresAt.getTime() < Date.now()
    ) {
      return jsonError("This cancellation link has expired.", 410);
    }

    if (new Date(b.startTime).getTime() < Date.now()) {
      return jsonError("This booking has already taken place.", 409);
    }

    const [policy] = await db
      .select({
        allowCancellation: cancellationPolicy.allowCancellation,
        cutoffHours: cancellationPolicy.cutoffHours,
        requireCancellationReason: cancellationPolicy.requireCancellationReason,
      })
      .from(cancellationPolicy)
      .where(eq(cancellationPolicy.eventTypeId, b.eventTypeId))
      .limit(1);

    if (policy) {
      if (!policy.allowCancellation) {
        return jsonError(
          "Cancellations are not allowed for this event type.",
          403
        );
      }
      const cutoff = policy.cutoffHours ?? 0;
      if (cutoff > 0) {
        const hoursUntil =
          (new Date(b.startTime).getTime() - Date.now()) / 3_600_000;
        if (hoursUntil < cutoff) {
          return jsonError(
            `Cancellations must be made at least ${cutoff} hour${cutoff === 1 ? "" : "s"} before the meeting.`,
            403
          );
        }
      }
      if (policy.requireCancellationReason && !reason?.trim()) {
        return jsonError("A cancellation reason is required.", 400);
      }
    }

    await db
      .update(booking)
      .set({
        status: "cancelled",
        cancellationReason: reason?.trim() || null,
        cancelledBy: "invitee",
        cancelledAt: new Date(),
        // approvalToken is kept (not nulled) so a stale review link resolves to
        // a friendly "no longer valid" page rather than a 404.
        rescheduleRequestedStart: null,
        rescheduleRequestedEnd: null,
        updatedAt: new Date(),
      })
      .where(eq(booking.id, b.id));

    // Enqueue failures must not fail the cancellation.
    await Promise.allSettled([
      enqueueJob(JOB_NAMES.BOOKING_CANCELLATION, { bookingId: b.id }),
      enqueueJob(JOB_NAMES.CALENDAR_CANCEL, { bookingId: b.id }),
      enqueueJob(JOB_NAMES.BOOKING_CANCEL_REMINDERS, { bookingId: b.id }),
    ]);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[POST /api/bookings/cancel]", err);
    return jsonError("Something went wrong. Please try again.", 500);
  }
}
