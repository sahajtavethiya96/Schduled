import type { Job } from "pg-boss";
import { enqueueEmail } from "@/lib/email";
import { approvalPendingTemplate } from "@/lib/email/templates/approval-pending";
import { approvalRequestTemplate } from "@/lib/email/templates/approval-request";
import { createNotification } from "@/lib/notifications/create";
import type { BookingApprovalRequestPayload } from "@/lib/worker/job-types";
import {
  loadBookingForLifecycle,
  loadHostPrefs,
  resolveLocationLabel,
  resolveLocationLabelHost,
} from "./booking-lifecycle-data";

export async function handleBookingApprovalRequest(
  jobs: Job<BookingApprovalRequestPayload>[]
) {
  for (const job of jobs) {
    await processOne(job.data.bookingId, job.data.isReschedule ?? false);
  }
}

async function processOne(bookingId: string, isReschedule: boolean) {
  const b = await loadBookingForLifecycle(bookingId);
  if (!b) {
    console.warn(`[booking-approval-request] booking ${bookingId} not found`);
    return;
  }
  if (b.status !== "pending") {
    console.log(
      `[booking-approval-request] booking ${bookingId} is ${b.status} — skipping`
    );
    return;
  }
  if (!b.approvalToken) {
    console.warn(
      `[booking-approval-request] booking ${bookingId} has no approvalToken`
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

  // Only on first submission — reschedules would otherwise resend a
  // confusing "Booking request received" email for an already-pending booking.
  if (!isReschedule) {
    const mail = await approvalPendingTemplate({
      cancelToken: b.cancelToken,
      eventName: b.etName,
      hostName: b.hostName ?? "your host",
      hostTimezone,
      inviteeName: b.inviteeName,
      inviteeTimezone: b.inviteeTimezone,
      locationLabel: locationLabelInvitee,
      startUtc,
    });
    await enqueueEmail(
      {
        to: b.inviteeEmail,
        subject: mail.subject,
        html: mail.html,
        text: mail.text,
      },
      {
        idempotencyKey: `approval-request:${b.id}:${startUtc.getTime()}:invitee`,
      }
    );
  }

  // Host: "someone wants to book with you — approve or decline"
  if (b.hostEmail && prefs?.bookingNotificationEmail !== false) {
    const mail = await approvalRequestTemplate({
      approvalToken: b.approvalToken,
      eventName: b.etName,
      hostName: b.hostName ?? "there",
      hostTimezone,
      inviteeEmail: b.inviteeEmail,
      inviteeName: b.inviteeName,
      locationLabel: locationLabelHost,
      startUtc,
    });

    await enqueueEmail(
      {
        to: b.hostEmail,
        subject: mail.subject,
        html: mail.html,
        text: mail.text,
      },
      // Keyed on start time so a reschedule re-request still sends but a retry doesn't double-send.
      { idempotencyKey: `approval-request:${b.id}:${startUtc.getTime()}:host` }
    );
  }

  await createNotification({
    userId: b.hostUserId,
    type: "booking_pending_approval",
    title: `Booking request: ${b.etName}`,
    body: `${b.inviteeName} requested a booking — awaiting your approval`,
    bookingId: b.id,
  });

  console.log(`[booking-approval-request] processed booking ${bookingId}`);
}
