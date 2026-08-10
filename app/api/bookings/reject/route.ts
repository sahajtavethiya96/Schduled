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
        rateLimitKey("POST:/api/bookings/reject", request),
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

    if (b.status === "cancelled") {
      return NextResponse.json({ ok: true, alreadyRejected: true });
    }

    if (b.status !== "pending") {
      return jsonError("This booking cannot be declined.", 409);
    }

    const sanitizedReason = reason ? sanitizeText(reason) : null;

    await db
      .update(booking)
      .set({
        status: "cancelled",
        cancelledBy: "host",
        cancelledAt: new Date(),
        rejectionReason: sanitizedReason,
        updatedAt: new Date(),
      })
      .where(eq(booking.id, b.id));

    await Promise.allSettled([
      enqueueJob(JOB_NAMES.BOOKING_REJECTED, { bookingId: b.id }),
    ]);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[POST /api/bookings/reject]", err);
    return jsonError("Something went wrong. Please try again.", 500);
  }
}
