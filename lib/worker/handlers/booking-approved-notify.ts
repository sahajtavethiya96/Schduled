import type { Job } from "pg-boss";
import { enqueueEmail } from "@/lib/email";
import { generateBookingICS } from "@/lib/calendar/ics";
import { approvalApprovedTemplate } from "@/lib/email/templates/approval-approved";
import { bookingEmail } from "@/lib/email/templates/booking-emails";
import type { BookingApprovedPayload } from "@/lib/worker/job-types";
import {
  loadBookingForLifecycle,
  loadHostPrefs,
  resolveLocationLabel,
  resolveLocationLabelHost,
  resolveMeetButtonLabel,
} from "./booking-lifecycle-data";

export async function handleBookingApprovedNotify(jobs: Job<BookingApprovedPayload>[]) {
  for (const job of jobs) {
    await processOne(job.data.bookingId);
  }
}

async function processOne(bookingId: string) {
  // Re-read booking AFTER CALENDAR_WRITE and VIDEO_LINK_GENERATE have run so
  // that videoLinkInvitee is populated for Google Meet / Zoom bookings.
  const b = await loadBookingForLifecycle(bookingId);
  if (!b) {
    console.warn(`[booking-approved-notify] booking ${bookingId} not found`);
    return;
  }
  if (b.status !== "confirmed") {
    console.log(
      `[booking-approved-notify] booking ${bookingId} is ${b.status} — skipping`
    );
    return;
  }

  const hostTimezone = b.hostTimezone ?? "UTC";
  const locationLabelInvitee = resolveLocationLabel(b.etLocationType, b.etLocationValue, b.inviteePhone);
  const locationLabelHost = resolveLocationLabelHost(b.etLocationType, b.etLocationValue, b.inviteePhone);
  const meetLabel = resolveMeetButtonLabel(b.etLocationType);
  const startUtc = new Date(b.startTime);

  const mail = await approvalApprovedTemplate({
    cancelToken: b.cancelToken,
    confirmationNote: b.etConfirmationNote ?? null,
    eventName: b.etName,
    hostName: b.hostName ?? "your host",
    hostTimezone,
    inviteeName: b.inviteeName,
    inviteeTimezone: b.inviteeTimezone,
    locationLabel: locationLabelInvitee,
    locationType: b.etLocationType,
    meetLabel,
    meetLink: b.videoLinkInvitee,
    meetPassword: b.videoLinkPassword,
    rescheduleToken: b.rescheduleToken,
    startUtc,
  });

  const icsAttachment = generateBookingICS({
    uid: b.id,
    title: `${b.etName} with ${b.hostName ?? "your host"}`,
    description: `${b.etName} meeting via Schduled`,
    startUtc,
    durationMinutes: Math.round(
      (new Date(b.endTime).getTime() - startUtc.getTime()) / 60000
    ),
    organizerName: b.hostName ?? "Your host",
    organizerEmail: b.hostEmail ?? "",
    attendeeEmail: b.inviteeEmail,
    attendeeName: b.inviteeName,
    location: locationLabelInvitee,
    meetUrl: b.videoLinkInvitee ?? undefined,
  });

  await enqueueEmail(
    {
      to: b.inviteeEmail,
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
      attachments: [icsAttachment],
    },
    { idempotencyKey: `approved:${b.id}:invitee` }
  );

  // Host: booking confirmation summary (gated on notification pref)
  const prefs = await loadHostPrefs(b.hostUserId);
  if (b.hostEmail && prefs?.bookingNotificationEmail !== false) {
    const hostMail = await bookingEmail({
      variant: "confirmation",
      audience: "host",
      eventName: b.etName,
      startUtc,
      previousStartUtc: null,
      hostTimezone,
      inviteeTimezone: b.inviteeTimezone,
      locationLabel: locationLabelHost,
      locationType: b.etLocationType,
      meetLabel,
      meetLink: b.videoLinkHost,
      meetPassword: b.videoLinkPassword,
      recipientName: b.hostName ?? "there",
      otherPartyName: b.inviteeName,
      cancelToken: b.cancelToken,
      rescheduleToken: b.rescheduleToken,
      reason: null,
      confirmationNote: null,
    });
    await enqueueEmail(
      {
        to: b.hostEmail,
        subject: hostMail.subject,
        html: hostMail.html,
        text: hostMail.text,
      },
      { idempotencyKey: `approved:${b.id}:host` }
    );
  }

  console.log(`[booking-approved-notify] sent approval email for booking ${bookingId}`);
}
