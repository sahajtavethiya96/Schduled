import type { Job } from "pg-boss";
import { enqueueEmail } from "@/lib/email";
import { rescheduleDeclinedTemplate } from "@/lib/email/templates/reschedule-declined";
import type { BookingRescheduleDeclinedPayload } from "@/lib/worker/job-types";
import {
  loadBookingForLifecycle,
  resolveLocationLabel,
} from "./booking-lifecycle-data";

export async function handleBookingRescheduleDeclined(
  jobs: Job<BookingRescheduleDeclinedPayload>[]
) {
  for (const job of jobs) {
    await processOne(
      job.data.bookingId,
      job.data.originalStartUtc,
      job.data.reason
    );
  }
}

async function processOne(
  bookingId: string,
  originalStartUtc: string,
  reason?: string
) {
  const b = await loadBookingForLifecycle(bookingId);
  if (!b) {
    console.warn(
      `[booking-reschedule-declined] booking ${bookingId} not found`
    );
    return;
  }
  // The reject endpoint restores the booking to 'confirmed' before enqueuing;
  // only skip if it was cancelled out from under us in the meantime.
  if (b.status === "cancelled") {
    console.log(
      `[booking-reschedule-declined] booking ${bookingId} is cancelled — skipping`
    );
    return;
  }

  const hostTimezone = b.hostTimezone ?? "UTC";
  const locationLabel = resolveLocationLabel(
    b.etLocationType,
    b.etLocationValue,
    b.inviteePhone
  );

  const mail = await rescheduleDeclinedTemplate({
    eventName: b.etName,
    hostName: b.hostName ?? "your host",
    hostTimezone,
    inviteeName: b.inviteeName,
    inviteeTimezone: b.inviteeTimezone,
    locationLabel,
    originalStartUtc: new Date(originalStartUtc),
    reason: reason ?? null,
  });

  await enqueueEmail(
    {
      to: b.inviteeEmail,
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
    },
    {
      idempotencyKey: `reschedule-declined:${b.id}:${originalStartUtc}:invitee`,
    }
  );

  console.log(`[booking-reschedule-declined] processed booking ${bookingId}`);
}
