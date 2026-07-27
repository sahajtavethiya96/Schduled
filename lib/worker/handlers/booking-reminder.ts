import { eq } from "drizzle-orm";
import type { Job } from "pg-boss";
import { createId } from "@paralleldrive/cuid2";
import { formatInTimeZone } from "date-fns-tz";
import { db } from "@/lib/db";
import { booking, emailOutbox, eventType, user } from "@/db/schema";
import { reminderHostTemplate } from "@/lib/email/templates/reminder-host";
import { reminderInviteeTemplate } from "@/lib/email/templates/reminder-invitee";
import { createNotification } from "@/lib/notifications/create";
import { enqueueJob } from "@/lib/worker/enqueue";
import { type BookingReminderPayload, JOB_NAMES } from "@/lib/worker/job-types";
import { loadHostPrefs, resolveLocationLabel, resolveLocationLabelHost, resolveMeetLabels } from "./booking-lifecycle-data";


export async function handleBookingReminder24h(
  jobs: Job<BookingReminderPayload>[]
) {
  for (const job of jobs) {
    await processReminder(job, "24 hours");
  }
}

export async function handleBookingReminder1h(
  jobs: Job<BookingReminderPayload>[]
) {
  for (const job of jobs) {
    await processReminder(job, "1 hour");
  }
}

async function processReminder(
  job: Job<BookingReminderPayload>,
  timeUntil: "24 hours" | "1 hour"
) {
  const { bookingId, bookingStartUtc } = job.data;

  const [b] = await db
    .select({
      id: booking.id,
      inviteeName: booking.inviteeName,
      inviteeEmail: booking.inviteeEmail,
      inviteePhone: booking.inviteePhone,
      inviteeTimezone: booking.inviteeTimezone,
      startTime: booking.startTime,
      videoLinkInvitee: booking.videoLinkInvitee,
      videoLinkHost: booking.videoLinkHost,
      videoLinkPassword: booking.videoLinkPassword,
      cancelToken: booking.cancelToken,
      rescheduleToken: booking.rescheduleToken,
      status: booking.status,
      etName: eventType.name,
      etLocationType: eventType.locationType,
      etLocationValue: eventType.locationValue,
      hostUserId: user.id,
      hostName: user.name,
      hostEmail: user.email,
      hostTimezone: user.timezone,
    })
    .from(booking)
    .innerJoin(eventType, eq(eventType.id, booking.eventTypeId))
    .innerJoin(user, eq(user.id, booking.hostUserId))
    .where(eq(booking.id, bookingId))
    .limit(1);

  if (!b) {
    console.warn(`[booking-reminder] booking ${bookingId} not found`);
    return;
  }

  if (b.status !== "confirmed") {
    console.log(
      `[booking-reminder] booking ${bookingId} is ${b.status} — skipping`
    );
    return;
  }

  // Skip if booking was rescheduled after this reminder was enqueued
  const scheduledFor = new Date(bookingStartUtc);
  const actual = new Date(b.startTime);
  const drift = Math.abs(actual.getTime() - scheduledFor.getTime());
  if (drift > 60_000) {
    console.log(
      `[booking-reminder] booking ${bookingId} start time drifted ${drift}ms — skipping (rescheduled)`
    );
    return;
  }

  const prefs = await loadHostPrefs(b.hostUserId);
  const hostTimezone = b.hostTimezone ?? "UTC";
  const locationLabelInvitee = resolveLocationLabel(b.etLocationType, b.etLocationValue, b.inviteePhone);
  const locationLabelHost = resolveLocationLabelHost(b.etLocationType, b.etLocationValue, b.inviteePhone);
  const { invitee: inviteeLabel, host: hostLabel } = resolveMeetLabels(b.etLocationType);
  const tag = timeUntil === "24 hours" ? "24h" : "1h";

  // "reminderEmail24h/1h" pref controls INVITEE reminders ("Send invitees a reminder").
  // The host always receives their own reminder regardless of this setting.
  const inviteeReminderEnabled = timeUntil === "24 hours"
    ? prefs?.reminderEmail24h !== false
    : prefs?.reminderEmail1h !== false;

  // ── Invitee reminder email ─────────────────────────────────────────────
  if (inviteeReminderEnabled) {
    const inviteeMail = await reminderInviteeTemplate({
      inviteeName: b.inviteeName,
      hostName: b.hostName ?? "Your host",
      eventName: b.etName,
      startUtc: new Date(b.startTime),
      hostTimezone,
      inviteeTimezone: b.inviteeTimezone,
      locationLabel: locationLabelInvitee,
      meetLink: b.videoLinkInvitee,
      meetLabel: inviteeLabel,
      meetPassword: b.videoLinkPassword,
      cancelToken: b.cancelToken,
      rescheduleToken: b.rescheduleToken,
      timeUntil,
    });
    const inviteeKey = `reminder-invitee-${tag}-${bookingId}-${scheduledFor.toISOString()}`;
    await insertAndEnqueueEmail(
      b.inviteeEmail,
      `Reminder: ${b.etName} with ${b.hostName ?? "your host"} in ${timeUntil}`,
      inviteeMail,
      inviteeKey
    );
  }

  // ── Host reminder email ────────────────────────────────────────────────
  if (b.hostEmail) {
    // For Zoom use videoLinkHost (start URL); for Google Meet the join link works for host too
    const startMeetLink = b.videoLinkHost ?? b.videoLinkInvitee;

    const hostMail = await reminderHostTemplate({
      hostName: b.hostName ?? "there",
      inviteeName: b.inviteeName,
      eventName: b.etName,
      startUtc: new Date(b.startTime),
      hostTimezone,
      inviteeTimezone: b.inviteeTimezone,
      locationLabel: locationLabelHost,
      startMeetLink,
      meetLabel: hostLabel,
      meetPassword: b.videoLinkPassword,
      timeUntil,
    });

    const hostKey = `reminder-host-${tag}-${bookingId}-${scheduledFor.toISOString()}`;
    await insertAndEnqueueEmail(
      b.hostEmail,
      `Reminder: ${b.etName} with ${b.inviteeName} in ${timeUntil}`,
      hostMail,
      hostKey
    );
  }

  // ── Host in-app notification ───────────────────────────────────────────
  const whenLabel = formatInTimeZone(
    new Date(b.startTime),
    hostTimezone,
    "MMM d 'at' h:mm a"
  );
  await createNotification({
    userId: b.hostUserId,
    type: "booking_reminder",
    title: `Reminder: ${b.etName} in ${timeUntil}`,
    body: `${b.inviteeName} · ${whenLabel}`,
    bookingId: b.id,
  });

  console.log(
    `[booking-reminder] processed ${timeUntil} reminder for booking ${bookingId}`
  );
}

/** Insert into email_outbox (idempotent) then enqueue EMAIL_SEND. */
async function insertAndEnqueueEmail(
  to: string,
  subject: string,
  mail: { html: string; text: string },
  idempotencyKey: string
) {
  const newId = createId();
  const inserted = await db
    .insert(emailOutbox)
    .values({
      id: newId,
      idempotencyKey,
      payload: { to, subject, html: mail.html, text: mail.text },
      status: "queued",
      maxAttempts: 3,
    })
    .onConflictDoNothing()
    .returning({ id: emailOutbox.id });

  let outboxId: string;
  if (inserted.length > 0) {
    outboxId = inserted[0].id;
  } else {
    const [existing] = await db
      .select({ id: emailOutbox.id, status: emailOutbox.status })
      .from(emailOutbox)
      .where(eq(emailOutbox.idempotencyKey, idempotencyKey))
      .limit(1);
    if (!existing) {
      console.warn(
        `[booking-reminder] could not find existing outbox row for key ${idempotencyKey}`
      );
      return;
    }
    if (existing.status === "sent") {
      return; // already delivered
    }
    outboxId = existing.id;
  }

  await enqueueJob(JOB_NAMES.EMAIL_SEND, { outboxId });
}
