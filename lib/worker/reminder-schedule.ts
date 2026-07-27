import { subHours, subMinutes } from "date-fns";
import { JOB_NAMES } from "@/lib/worker/job-types";

export interface ReminderScheduleEntry {
  jobName:
    | typeof JOB_NAMES.BOOKING_REMINDER_24H
    | typeof JOB_NAMES.BOOKING_REMINDER_1H
    | typeof JOB_NAMES.BOOKING_REMINDER_10M
    | typeof JOB_NAMES.BOOKING_REMINDER_5M;
  singletonTag: "24h" | "1h" | "10m" | "5m";
  startAfter: Date;
}

/**
 * Decides which reminder job(s) to schedule for a meeting starting at
 * `startTime`, given the current time. The normal 24h + 1h reminders are
 * unchanged (each still schedules independently, exactly as before) — the
 * only new behavior is a last-mile fallback for bookings made too close to
 * the meeting for the 1h reminder to ever fire: 10 minutes before if there's
 * enough runway, 5 minutes before if not, or nothing once even that would
 * land too late (<5 min out) to be useful.
 *
 * Shared by every place that (re)schedules reminders — new bookings,
 * approval-gated bookings, and reschedules — so the decision logic lives in
 * exactly one place.
 */
export function computeReminderSchedule(
  startTime: Date,
  now: Date
): ReminderScheduleEntry[] {
  const entries: ReminderScheduleEntry[] = [];

  const remind24h = subHours(startTime, 24);
  if (remind24h.getTime() > now.getTime()) {
    entries.push({ jobName: JOB_NAMES.BOOKING_REMINDER_24H, singletonTag: "24h", startAfter: remind24h });
  }

  const remind1h = subHours(startTime, 1);
  if (remind1h.getTime() > now.getTime()) {
    entries.push({ jobName: JOB_NAMES.BOOKING_REMINDER_1H, singletonTag: "1h", startAfter: remind1h });
    return entries;
  }

  const minutesUntilStart = (startTime.getTime() - now.getTime()) / 60_000;
  if (minutesUntilStart > 15) {
    entries.push({
      jobName: JOB_NAMES.BOOKING_REMINDER_10M,
      singletonTag: "10m",
      startAfter: subMinutes(startTime, 10),
    });
  } else if (minutesUntilStart > 5) {
    entries.push({
      jobName: JOB_NAMES.BOOKING_REMINDER_5M,
      singletonTag: "5m",
      startAfter: subMinutes(startTime, 5),
    });
  }

  return entries;
}
