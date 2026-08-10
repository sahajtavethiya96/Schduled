import type { Job } from "pg-boss";
import type { BookingCancelRemindersPayload } from "@/lib/worker/job-types";

/**
 * Reminder cancellation is handled lazily: when BOOKING_REMINDER_24H and
 * BOOKING_REMINDER_1H fire, they check booking.status and booking.startTime
 * before sending. If the booking is cancelled or rescheduled, they return
 * early without sending an email.
 *
 * This handler exists as a required job contract; no active work needed here.
 */
export async function handleBookingCancelReminders(
  jobs: Job<BookingCancelRemindersPayload>[]
) {
  for (const job of jobs) {
    console.log(
      `[booking-cancel-reminders] acknowledged cancel-reminders for booking ${job.data.bookingId}`
    );
  }
}
