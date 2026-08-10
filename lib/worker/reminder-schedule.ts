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
 * Decides which reminder job(s) to schedule for a meeting. 24h/1h reminders
 * fire when there's time; otherwise a last-mile fallback fires at 10 or 5
 * minutes out, or not at all once even that would land too late (<5 min).
 */
export function computeReminderSchedule(
  startTime: Date,
  now: Date
): ReminderScheduleEntry[] {
  const entries: ReminderScheduleEntry[] = [];

  const remind24h = subHours(startTime, 24);
  if (remind24h.getTime() > now.getTime()) {
    entries.push({
      jobName: JOB_NAMES.BOOKING_REMINDER_24H,
      singletonTag: "24h",
      startAfter: remind24h,
    });
  }

  const remind1h = subHours(startTime, 1);
  if (remind1h.getTime() > now.getTime()) {
    entries.push({
      jobName: JOB_NAMES.BOOKING_REMINDER_1H,
      singletonTag: "1h",
      startAfter: remind1h,
    });
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
