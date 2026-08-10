import { eq } from "drizzle-orm";
import type { Job } from "pg-boss";
import { booking, eventType, user } from "@/db/schema";
import { db } from "@/lib/db";
import { enqueueEmail } from "@/lib/email";
import { followUpTemplate } from "@/lib/email/templates/follow-up";
import type { BookingFollowUpPayload } from "@/lib/worker/job-types";

export async function handleBookingFollowUp(
  jobs: Job<BookingFollowUpPayload>[]
) {
  for (const job of jobs) {
    await processOne(job.data);
  }
}

async function processOne({
  bookingId,
  bookingEndUtc,
}: BookingFollowUpPayload) {
  const [b] = await db
    .select({
      id: booking.id,
      status: booking.status,
      endTime: booking.endTime,
      inviteeName: booking.inviteeName,
      inviteeEmail: booking.inviteeEmail,
      inviteeTimezone: booking.inviteeTimezone,
      hostUserId: booking.hostUserId,
      etName: eventType.name,
    })
    .from(booking)
    .innerJoin(eventType, eq(eventType.id, booking.eventTypeId))
    .where(eq(booking.id, bookingId))
    .limit(1);

  if (!b) {
    console.warn(`[follow-up] booking ${bookingId} not found`);
    return;
  }

  // Skip if cancelled, rescheduled, or already a no-show
  if (b.status !== "confirmed" && b.status !== "completed") {
    console.log(
      `[follow-up] booking ${bookingId} status=${b.status} — skipping`
    );
    return;
  }

  // Skip if the booking was rescheduled to a different time (endTime changed)
  if (b.endTime.toISOString() !== new Date(bookingEndUtc).toISOString()) {
    console.log(
      `[follow-up] booking ${bookingId} endTime changed — skipping (rescheduled)`
    );
    return;
  }

  const [hostRow] = await db
    .select({ name: user.name, email: user.email })
    .from(user)
    .where(eq(user.id, b.hostUserId))
    .limit(1);

  if (!hostRow) {
    return;
  }

  const { subject, html } = await followUpTemplate({
    inviteeName: b.inviteeName,
    hostName: hostRow.name ?? hostRow.email,
    eventName: b.etName,
    endUtc: b.endTime,
    inviteeTimezone: b.inviteeTimezone,
    bookingId: b.id,
  });

  await enqueueEmail({ to: b.inviteeEmail, subject, html });

  console.log(
    `[follow-up] queued follow-up email for booking ${bookingId} → ${b.inviteeEmail}`
  );
}
