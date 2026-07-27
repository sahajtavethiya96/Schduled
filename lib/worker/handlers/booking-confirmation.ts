import { formatInTimeZone } from "date-fns-tz";
import { eq } from "drizzle-orm";
import type { Job } from "pg-boss";
import { contact, userProfile } from "@/db/schema";
import { db } from "@/lib/db";
import { enqueueEmail } from "@/lib/email";
import { bookingEmail } from "@/lib/email/templates/booking-emails";
import { generateBookingICS } from "@/lib/calendar/ics";
import { createNotification } from "@/lib/notifications/create";
import type { BookingConfirmationPayload } from "@/lib/worker/job-types";
import {
  loadBookingForLifecycle,
  loadHostPrefs,
  resolveLocationLabel,
  resolveLocationLabelHost,
  resolveMeetButtonLabel,
} from "./booking-lifecycle-data";

// Matches an invitee email against the host's exclusion list (comma/space
// separated emails or domains, e.g. "person@acme.com, acme.com").
function isContactExcluded(email: string, excludedRaw: string | null): boolean {
  if (!excludedRaw) return false;
  const lowerEmail = email.trim().toLowerCase();
  const domain = lowerEmail.split("@")[1] ?? "";
  return excludedRaw
    .split(/[\s,]+/)
    .map((s) => s.trim().toLowerCase().replace(/^@/, ""))
    .filter(Boolean)
    .some((entry) => entry === lowerEmail || entry === domain);
}

export async function handleBookingConfirmation(
  jobs: Job<BookingConfirmationPayload>[]
) {
  for (const job of jobs) {
    await processOne(job);
  }
}

async function processOne(job: Job<BookingConfirmationPayload>) {
  const bookingId = job.data.bookingId;
  const b = await loadBookingForLifecycle(bookingId);
  if (!b) {
    console.warn(`[booking-confirmation] booking ${bookingId} not found`);
    return;
  }
  if (b.status !== "confirmed") {
    console.log(
      `[booking-confirmation] booking ${bookingId} is ${b.status} — skipping`
    );
    return;
  }

  // Video events carry a join link written by CALENDAR_WRITE (Meet) /
  // VIDEO_LINK_GENERATE (Zoom), which may still be running. Wait via retries
  // instead of firing on a fixed timer, so the invitee never receives a
  // "confirmed" email with no join link. On the final attempt, send anyway —
  // a link-less confirmation still beats no confirmation at all.
  const needsVideoLink =
    b.etLocationType === "google_meet" || b.etLocationType === "zoom";
  if (needsVideoLink && !b.videoLinkInvitee) {
    const attempt = Number(
      (job as { retryCount?: number; retrycount?: number }).retryCount ??
        (job as { retrycount?: number }).retrycount ??
        0
    );
    if (attempt < 2) {
      throw new Error(
        `[booking-confirmation] booking ${bookingId}: video link not ready yet — retrying`
      );
    }
    console.warn(
      `[booking-confirmation] booking ${bookingId}: sending confirmation without a video link after retries`
    );
  }

  const prefs = await loadHostPrefs(b.hostUserId);
  const hostTimezone = b.hostTimezone ?? "UTC";
  const locationLabelInvitee = resolveLocationLabel(b.etLocationType, b.etLocationValue, b.inviteePhone);
  const locationLabelHost = resolveLocationLabelHost(b.etLocationType, b.etLocationValue, b.inviteePhone);
  const meetLabel = resolveMeetButtonLabel(b.etLocationType);
  const startUtc = new Date(b.startTime);

  // Invitee confirmation (with ICS calendar attachment)
  if (prefs?.bookingConfirmationEmail !== false) {
    const mail = await bookingEmail({
      variant: "confirmation",
      audience: "invitee",
      eventName: b.etName,
      startUtc,
      previousStartUtc: null,
      hostTimezone,
      inviteeTimezone: b.inviteeTimezone,
      locationLabel: locationLabelInvitee,
      locationType: b.etLocationType,
      cancelToken: b.cancelToken,
      rescheduleToken: b.rescheduleToken,
      reason: null,
      confirmationNote: b.etConfirmationNote ?? null,
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
      { idempotencyKey: `confirmation:${b.id}:invitee` }
    );
  }

  // Host notification
  if (b.hostEmail && prefs?.bookingNotificationEmail !== false) {
    const mail = await bookingEmail({
      variant: "confirmation",
      audience: "host",
      eventName: b.etName,
      startUtc,
      previousStartUtc: null,
      hostTimezone,
      inviteeTimezone: b.inviteeTimezone,
      locationLabel: locationLabelHost,
      locationType: b.etLocationType,
      cancelToken: b.cancelToken,
      rescheduleToken: b.rescheduleToken,
      reason: null,
      confirmationNote: null,
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
      { idempotencyKey: `confirmation:${b.id}:host` }
    );
  }

  // In-app notification for host
  const whenLabel = formatInTimeZone(
    new Date(b.startTime),
    hostTimezone,
    "MMM d 'at' h:mm a"
  );
  await createNotification({
    userId: b.hostUserId,
    type: "booking_created",
    title: `New booking: ${b.etName}`,
    body: `${b.inviteeName} booked for ${whenLabel}`,
    bookingId: b.id,
  });

  // Auto-save invitee as a contact for the host — honouring their contact
  // settings (auto-create toggle + exclusion list). Unique index on
  // (hostUserId, email) prevents duplicates silently.
  const [profile] = await db
    .select({
      autoCreate: userProfile.autoCreateContacts,
      excluded: userProfile.excludedContactDomains,
    })
    .from(userProfile)
    .where(eq(userProfile.userId, b.hostUserId))
    .limit(1);

  const autoCreate = profile?.autoCreate ?? true;
  if (autoCreate && !isContactExcluded(b.inviteeEmail, profile?.excluded ?? null)) {
    await db
      .insert(contact)
      .values({
        hostUserId: b.hostUserId,
        email: b.inviteeEmail,
        name: b.inviteeName,
      })
      .onConflictDoNothing();
  }

  console.log(`[booking-confirmation] processed booking ${bookingId}`);
}
