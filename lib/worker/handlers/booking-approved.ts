import type { Job } from "pg-boss";
import { createNotification } from "@/lib/notifications/create";
import { enqueueJob } from "@/lib/worker/enqueue";
import { JOB_NAMES } from "@/lib/worker/job-types";
import type { BookingApprovedPayload } from "@/lib/worker/job-types";
import { computeReminderSchedule } from "@/lib/worker/reminder-schedule";
import { loadBookingForLifecycle } from "./booking-lifecycle-data";

export async function handleBookingApproved(jobs: Job<BookingApprovedPayload>[]) {
  for (const job of jobs) {
    await processOne(job.data.bookingId);
  }
}

async function processOne(bookingId: string) {
  const b = await loadBookingForLifecycle(bookingId);
  if (!b) {
    console.warn(`[booking-approved] booking ${bookingId} not found`);
    return;
  }
  if (b.status !== "confirmed") {
    console.log(
      `[booking-approved] booking ${bookingId} is ${b.status} — skipping`
    );
    return;
  }

  const startUtc = new Date(b.startTime);

  // In-app notification to host
  await createNotification({
    userId: b.hostUserId,
    type: "booking_created",
    title: `Booking approved: ${b.etName}`,
    body: `You approved ${b.inviteeName}'s booking`,
    bookingId: b.id,
  });

  // Schedule reminder job(s) — see lib/worker/reminder-schedule.ts.
  const startUtcIso = startUtc.toISOString();
  const reminders: Promise<unknown>[] = [];

  for (const reminder of computeReminderSchedule(startUtc, new Date())) {
    reminders.push(
      enqueueJob(
        reminder.jobName,
        { bookingId: b.id, bookingStartUtc: startUtcIso },
        { singletonKey: `reminder-${reminder.singletonTag}-${b.id}`, startAfter: reminder.startAfter }
      )
    );
  }

  // Calendar write (no-op if no connected calendar)
  reminders.push(enqueueJob(JOB_NAMES.CALENDAR_WRITE, { bookingId: b.id }));

  // Generate meeting link for approval-gated bookings (was skipped at booking-time)
  if (b.etLocationType === "zoom" || b.etLocationType === "google_meet") {
    reminders.push(enqueueJob(JOB_NAMES.VIDEO_LINK_GENERATE, { bookingId: b.id }));
  }

  // Send the invitee "approved" email via a delayed job so CALENDAR_WRITE and
  // VIDEO_LINK_GENERATE have time to populate the meet link before the template
  // is rendered (the email is built at job-fire time, not here).
  reminders.push(
    enqueueJob(
      JOB_NAMES.BOOKING_APPROVED_NOTIFY,
      { bookingId: b.id },
      {
        startAfter: (b.etLocationType === "zoom" || b.etLocationType === "google_meet")
          ? new Date(Date.now() + 30_000)
          : undefined,
      }
    )
  );

  await Promise.allSettled(reminders);

  console.log(`[booking-approved] processed booking ${bookingId}`);
}
