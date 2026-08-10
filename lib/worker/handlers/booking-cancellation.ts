import { formatInTimeZone } from "date-fns-tz";
import type { Job } from "pg-boss";
import { enqueueEmail } from "@/lib/email";
import { bookingEmail } from "@/lib/email/templates/booking-emails";
import { createNotification } from "@/lib/notifications/create";
import type { BookingCancellationPayload } from "@/lib/worker/job-types";
import {
  loadBookingForLifecycle,
  loadHostPrefs,
  resolveLocationLabel,
  resolveLocationLabelHost,
} from "./booking-lifecycle-data";

export async function handleBookingCancellation(
  jobs: Job<BookingCancellationPayload>[]
) {
  for (const job of jobs) {
    await processOne(job.data.bookingId);
  }
}

async function processOne(bookingId: string) {
  const b = await loadBookingForLifecycle(bookingId);
  if (!b) {
    console.warn(`[booking-cancellation] booking ${bookingId} not found`);
    return;
  }
  if (b.status !== "cancelled") {
    console.log(
      `[booking-cancellation] booking ${bookingId} is ${b.status}, not cancelled — skipping`
    );
    return;
  }

  const prefs = await loadHostPrefs(b.hostUserId);
  const hostTimezone = b.hostTimezone ?? "UTC";
  const locationLabelInvitee = resolveLocationLabel(
    b.etLocationType,
    b.etLocationValue,
    b.inviteePhone
  );
  const locationLabelHost = resolveLocationLabelHost(
    b.etLocationType,
    b.etLocationValue,
    b.inviteePhone
  );
  const startUtc = new Date(b.startTime);

  const baseShared = {
    variant: "cancellation" as const,
    eventName: b.etName,
    startUtc,
    previousStartUtc: null,
    hostTimezone,
    inviteeTimezone: b.inviteeTimezone,
    meetLink: null,
    cancelToken: b.cancelToken,
    rescheduleToken: b.rescheduleToken,
    reason: b.cancellationReason,
  };

  // Always notify invitee of cancellation (transactional)
  {
    const mail = await bookingEmail({
      ...baseShared,
      audience: "invitee",
      locationLabel: locationLabelInvitee,
      locationType: b.etLocationType,
      recipientName: b.inviteeName,
      otherPartyName: b.hostName ?? "your host",
    });
    await enqueueEmail(
      {
        to: b.inviteeEmail,
        subject: mail.subject,
        html: mail.html,
        text: mail.text,
      },
      { idempotencyKey: `cancellation:${b.id}:invitee` }
    );
  }

  if (b.hostEmail && prefs?.cancellationEmail !== false) {
    const mail = await bookingEmail({
      ...baseShared,
      audience: "host",
      locationLabel: locationLabelHost,
      locationType: b.etLocationType,
      recipientName: b.hostName ?? "there",
      otherPartyName: b.inviteeName,
    });
    await enqueueEmail(
      {
        to: b.hostEmail,
        subject: mail.subject,
        html: mail.html,
        text: mail.text,
      },
      { idempotencyKey: `cancellation:${b.id}:host` }
    );
  }

  const whenLabel = formatInTimeZone(
    new Date(b.startTime),
    hostTimezone,
    "MMM d 'at' h:mm a"
  );
  await createNotification({
    userId: b.hostUserId,
    type: "booking_cancelled",
    title: `Booking cancelled: ${b.etName}`,
    body: `${b.inviteeName}'s booking for ${whenLabel} was cancelled`,
    bookingId: b.id,
  });

  console.log(`[booking-cancellation] processed booking ${bookingId}`);
}
