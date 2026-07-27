import { formatInTimeZone } from "date-fns-tz";
import type { Job } from "pg-boss";
import { enqueueEmail } from "@/lib/email";
import { generateBookingICS } from "@/lib/calendar/ics";
import { bookingEmail } from "@/lib/email/templates/booking-emails";
import { createNotification } from "@/lib/notifications/create";
import type { BookingRescheduleNotifyPayload } from "@/lib/worker/job-types";
import {
  loadBookingForLifecycle,
  loadHostPrefs,
  resolveLocationLabel,
  resolveLocationLabelHost,
  resolveMeetButtonLabel,
} from "./booking-lifecycle-data";

export async function handleBookingRescheduleNotify(
  jobs: Job<BookingRescheduleNotifyPayload>[]
) {
  for (const job of jobs) {
    await processOne(job.data.bookingId, job.data.previousStartUtc);
  }
}

async function processOne(bookingId: string, previousStartUtc: string) {
  const b = await loadBookingForLifecycle(bookingId);
  if (!b) {
    console.warn(`[booking-reschedule-notify] booking ${bookingId} not found`);
    return;
  }
  if (b.status !== "confirmed") {
    console.log(
      `[booking-reschedule-notify] booking ${bookingId} is ${b.status} — skipping`
    );
    return;
  }

  const prefs = await loadHostPrefs(b.hostUserId);
  const hostTimezone = b.hostTimezone ?? "UTC";
  const locationLabelInvitee = resolveLocationLabel(b.etLocationType, b.etLocationValue, b.inviteePhone);
  const locationLabelHost = resolveLocationLabelHost(b.etLocationType, b.etLocationValue, b.inviteePhone);
  const meetLabel = resolveMeetButtonLabel(b.etLocationType);

  const baseShared = {
    variant: "reschedule" as const,
    eventName: b.etName,
    startUtc: new Date(b.startTime),
    previousStartUtc: new Date(previousStartUtc),
    hostTimezone,
    inviteeTimezone: b.inviteeTimezone,
    cancelToken: b.cancelToken,
    rescheduleToken: b.rescheduleToken,
    reason: null,
  };

  // Invitee
  {
    const startUtc = new Date(b.startTime);
    const mail = await bookingEmail({
      ...baseShared,
      locationLabel: locationLabelInvitee,
      locationType: b.etLocationType,
      audience: "invitee",
      recipientName: b.inviteeName,
      otherPartyName: b.hostName ?? "your host",
      meetLink: b.videoLinkInvitee,
      meetLabel,
      meetPassword: b.videoLinkPassword,
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
      // Key on the reschedule event (previous start) so each reschedule sends
      // but a handler retry for the same event doesn't double-send.
      { idempotencyKey: `reschedule:${b.id}:${previousStartUtc}:invitee` }
    );
  }

  // Host
  if (b.hostEmail && prefs?.rescheduleEmail !== false) {
    const mail = await bookingEmail({
      ...baseShared,
      locationLabel: locationLabelHost,
      locationType: b.etLocationType,
      audience: "host",
      recipientName: b.hostName ?? "there",
      otherPartyName: b.inviteeName,
      meetLink: b.videoLinkHost,
      meetLabel,
      meetPassword: b.videoLinkPassword,
    });
    await enqueueEmail(
      {
        to: b.hostEmail,
        subject: mail.subject,
        html: mail.html,
        text: mail.text,
      },
      { idempotencyKey: `reschedule:${b.id}:${previousStartUtc}:host` }
    );
  }

  const whenLabel = formatInTimeZone(
    new Date(b.startTime),
    hostTimezone,
    "MMM d 'at' h:mm a"
  );
  await createNotification({
    userId: b.hostUserId,
    type: "booking_rescheduled",
    title: `Booking rescheduled: ${b.etName}`,
    body: `${b.inviteeName}'s booking moved to ${whenLabel}`,
    bookingId: b.id,
  });

  console.log(`[booking-reschedule-notify] processed booking ${bookingId}`);
}
