import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { booking } from "@/db/schema";
import { checkRateLimit, jsonError, rateLimitKey } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { sanitizeText } from "@/lib/validators";
import { enqueueJob } from "@/lib/worker/enqueue";
import { JOB_NAMES } from "@/lib/worker/job-types";

interface RejectBody {
  reason?: string;
  token: string;
}

export async function POST(request: Request) {
  try {
    if (
      !(await checkRateLimit(
        rateLimitKey("POST:/api/bookings/reschedule-reject", request),
        20,
        60_000
      ))
    ) {
      return jsonError("Too many requests. Please wait a moment.", 429);
    }

    const body: RejectBody = await request.json();
    const { token, reason } = body;
    if (!token) {
      return jsonError("Missing approval token", 400);
    }

    const [b] = await db
      .select({
        id: booking.id,
        status: booking.status,
        startTime: booking.startTime,
      })
      .from(booking)
      .where(eq(booking.approvalToken, token))
      .limit(1);

    if (!b) {
      return jsonError("This approval link is invalid.", 404);
    }

    if (b.status !== "reschedule_requested") {
      return jsonError("This reschedule request is no longer valid.", 409);
    }

    const sanitizedReason = reason ? sanitizeText(reason) : undefined;
    const originalStartUtc = new Date(b.startTime).toISOString();

    // Restore the booking to confirmed at its ORIGINAL time; discard the request.
    await db
      .update(booking)
      .set({
        status: "confirmed",
        rescheduleRequestedStart: null,
        rescheduleRequestedEnd: null,
        approvalToken: null,
        updatedAt: new Date(),
      })
      .where(eq(booking.id, b.id));

    await Promise.allSettled([
      enqueueJob(JOB_NAMES.BOOKING_RESCHEDULE_DECLINED, {
        bookingId: b.id,
        reason: sanitizedReason,
        originalStartUtc,
      }),
    ]);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[POST /api/bookings/reschedule-reject]", err);
    return jsonError("Something went wrong. Please try again.", 500);
  }
}
