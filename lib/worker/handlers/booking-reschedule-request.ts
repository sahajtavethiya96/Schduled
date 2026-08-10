import { formatInTimeZone } from "date-fns-tz";
import type { Job } from "pg-boss";
import { enqueueEmail } from "@/lib/email";
import { rescheduleRequestTemplate } from "@/lib/email/templates/reschedule-request";
import { createNotification } from "@/lib/notifications/create";
import type { BookingRescheduleRequestPayload } from "@/lib/worker/job-types";
import {
  loadBookingForLifecycle,
  loadHostPrefs,
  resolveLocationLabelHost,
} from "./booking-lifecycle-data";

export async function handleBookingRescheduleRequest(
  jobs: Job<BookingRescheduleRequestPayload>[]
) {
  for (const job of jobs) {
    await processOne(job.data.bookingId, job.data.previousStartUtc);
  }
}

async function processOne(bookingId: string, previousStartUtc: string) {
  const b = await loadBookingForLifecycle(bookingId);
  if (!b) {
    console.warn(`[booking-reschedule-request] booking ${bookingId} not found`);
    return;
  }
  if (b.status !== "reschedule_requested" || !b.rescheduleRequestedStart) {
    console.log(
      `[booking-reschedule-request] booking ${bookingId} is ${b.status} — skipping`
    );
    return;
  }
  if (!b.approvalToken) {
    console.warn(
      `[booking-reschedule-request] booking ${bookingId} has no approvalToken`
    );
    return;
  }

  const prefs = await loadHostPrefs(b.hostUserId);
  const hostTimezone = b.hostTimezone ?? "UTC";
  const requestedStart = b.rescheduleRequestedStart;
  const locationLabelHost = resolveLocationLabelHost(
    b.etLocationType,
    b.etLocationValue,
    b.inviteePhone
  );

  if (b.hostEmail && prefs?.bookingNotificationEmail !== false) {
    const mail = await rescheduleRequestTemplate({
      approvalToken: b.approvalToken,
      currentStartUtc: new Date(previousStartUtc),
      eventName: b.etName,
      hostName: b.hostName ?? "there",
      hostTimezone,
      inviteeEmail: b.inviteeEmail,
      inviteeName: b.inviteeName,
      locationLabel: locationLabelHost,
      requestedStartUtc: requestedStart,
    });

    await enqueueEmail(
      {
        to: b.hostEmail,
        subject: mail.subject,
        html: mail.html,
        text: mail.text,
      },
      // Keyed on requested time so a revised request re-sends but a retry doesn't double-send.
      {
        idempotencyKey: `reschedule-request:${b.id}:${requestedStart.getTime()}:host`,
      }
    );
  }

  const whenLabel = formatInTimeZone(
    requestedStart,
    hostTimezone,
    "MMM d 'at' h:mm a"
  );
  await createNotification({
    userId: b.hostUserId,
    type: "booking_reschedule_requested",
    title: `Reschedule request: ${b.etName}`,
    body: `${b.inviteeName} asked to move their meeting to ${whenLabel} — awaiting your approval`,
    bookingId: b.id,
  });

  console.log(`[booking-reschedule-request] processed booking ${bookingId}`);
}
