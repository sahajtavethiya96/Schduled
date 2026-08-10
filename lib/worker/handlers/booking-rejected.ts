import type { Job } from "pg-boss";
import { enqueueEmail } from "@/lib/email";
import { approvalRejectedTemplate } from "@/lib/email/templates/approval-rejected";
import { createNotification } from "@/lib/notifications/create";
import type { BookingRejectedPayload } from "@/lib/worker/job-types";
import {
  loadBookingForLifecycle,
  resolveLocationLabel,
} from "./booking-lifecycle-data";

export async function handleBookingRejected(
  jobs: Job<BookingRejectedPayload>[]
) {
  for (const job of jobs) {
    await processOne(job.data.bookingId);
  }
}

async function processOne(bookingId: string) {
  const b = await loadBookingForLifecycle(bookingId);
  if (!b) {
    console.warn(`[booking-rejected] booking ${bookingId} not found`);
    return;
  }
  if (b.status !== "cancelled") {
    console.log(
      `[booking-rejected] booking ${bookingId} is ${b.status} — skipping`
    );
    return;
  }

  const hostTimezone = b.hostTimezone ?? "UTC";
  const locationLabel = resolveLocationLabel(
    b.etLocationType,
    b.etLocationValue,
    b.inviteePhone
  );

  const mail = await approvalRejectedTemplate({
    eventName: b.etName,
    hostName: b.hostName ?? "your host",
    hostTimezone,
    inviteeName: b.inviteeName,
    inviteeTimezone: b.inviteeTimezone,
    locationLabel,
    rejectionReason: b.rejectionReason,
    startUtc: new Date(b.startTime),
  });

  await enqueueEmail(
    {
      to: b.inviteeEmail,
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
    },
    { idempotencyKey: `rejected:${b.id}:invitee` }
  );

  await createNotification({
    userId: b.hostUserId,
    type: "booking_rejected",
    title: `Booking declined: ${b.etName}`,
    body: `You declined ${b.inviteeName}'s booking request`,
    bookingId: b.id,
  });

  console.log(`[booking-rejected] processed booking ${bookingId}`);
}
