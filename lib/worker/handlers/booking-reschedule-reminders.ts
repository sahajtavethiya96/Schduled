import type { Job } from 'pg-boss'
import { enqueueJob } from '@/lib/worker/enqueue'
import type { BookingRescheduleRemindersPayload } from '@/lib/worker/job-types'
import { computeReminderSchedule } from '@/lib/worker/reminder-schedule'

export async function handleBookingRescheduleReminders(
  jobs: Job<BookingRescheduleRemindersPayload>[],
) {
  for (const job of jobs) {
    await processRescheduleReminders(job)
  }
}

async function processRescheduleReminders(job: Job<BookingRescheduleRemindersPayload>) {
  const { bookingId, newStartTime } = job.data

  const newStart = new Date(newStartTime)
  const now      = new Date()

  // Old reminders will self-cancel: they check booking.startTime against their
  // bookingStartUtc and skip if the times differ by more than 60 seconds.

  for (const reminder of computeReminderSchedule(newStart, now)) {
    await enqueueJob(
      reminder.jobName,
      { bookingId, bookingStartUtc: newStart.toISOString() },
      {
        startAfter:   reminder.startAfter,
        singletonKey: `reminder-${reminder.singletonTag}-${bookingId}`,
      },
    )
    console.log(`[reschedule-reminders] scheduled ${reminder.singletonTag} reminder for booking ${bookingId} at ${reminder.startAfter.toISOString()}`)
  }
}
