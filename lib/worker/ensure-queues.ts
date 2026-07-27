import type { PgBoss } from "pg-boss";
import { JOB_NAMES, type JobName } from "@/lib/worker/job-types";

type QueuePolicy = "standard" | "short" | "singleton" | "stately" | "exclusive";

export const QUEUE_OPTIONS: Record<
  JobName,
  {
    expireInSeconds?: number;
    policy?: QueuePolicy;
    retryDelay?: number;
    retryLimit?: number;
  }
> = {
  [JOB_NAMES.EMAIL_SEND]: {
    expireInSeconds: 300,
    policy: "standard",
    retryLimit: 0,
  },
  [JOB_NAMES.EMAIL_OUTBOX_REAP]: {
    expireInSeconds: 300,
    policy: "exclusive",
    retryLimit: 0,
  },
  [JOB_NAMES.EMAIL_EVENTS_PRUNE]: {
    expireInSeconds: 300,
    policy: "exclusive",
    retryLimit: 0,
  },
  [JOB_NAMES.HEALTHCHECK]: {
    expireInSeconds: 120,
    policy: "exclusive",
    retryLimit: 1,
  },
  [JOB_NAMES.IDEMPOTENCY_KEYS_PRUNE]: {
    expireInSeconds: 120,
    policy: "exclusive",
    retryLimit: 0,
  },

  // Booking lifecycle
  [JOB_NAMES.VIDEO_LINK_GENERATE]: { expireInSeconds: 60,  policy: "singleton", retryLimit: 2, retryDelay: 30 },
  [JOB_NAMES.CALENDAR_WRITE]:      { expireInSeconds: 60,  policy: "singleton", retryLimit: 3, retryDelay: 15 },
  [JOB_NAMES.BOOKING_CONFIRMATION]: { expireInSeconds: 120, policy: "standard", retryLimit: 3, retryDelay: 30 },
  [JOB_NAMES.BOOKING_REMINDER_24H]: { expireInSeconds: 300, policy: "standard", retryLimit: 2 },
  [JOB_NAMES.BOOKING_REMINDER_1H]:  { expireInSeconds: 300, policy: "standard", retryLimit: 2 },
  [JOB_NAMES.BOOKING_REMINDER_10M]: { expireInSeconds: 300, policy: "standard", retryLimit: 2 },
  [JOB_NAMES.BOOKING_REMINDER_5M]:  { expireInSeconds: 300, policy: "standard", retryLimit: 2 },
  [JOB_NAMES.BOOKING_CANCEL_REMINDERS]:    { expireInSeconds: 30, policy: "standard", retryLimit: 2 },
  [JOB_NAMES.BOOKING_CANCELLATION]:        { expireInSeconds: 120, policy: "standard", retryLimit: 3, retryDelay: 30 },
  [JOB_NAMES.CALENDAR_CANCEL]:             { expireInSeconds: 60, policy: "singleton", retryLimit: 3, retryDelay: 15 },
  [JOB_NAMES.BOOKING_RESCHEDULE_REMINDERS]: { expireInSeconds: 30, policy: "standard", retryLimit: 2 },
  [JOB_NAMES.BOOKING_RESCHEDULE_NOTIFY]:   { expireInSeconds: 120, policy: "standard", retryLimit: 3, retryDelay: 30 },
  [JOB_NAMES.CALENDAR_UPDATE]:             { expireInSeconds: 60, policy: "singleton", retryLimit: 3, retryDelay: 15 },
  [JOB_NAMES.BOOKING_FOLLOW_UP]:           { expireInSeconds: 300, policy: "singleton", retryLimit: 2, retryDelay: 60 },

  // Calendar integrations
  [JOB_NAMES.CALENDAR_SYNC_ALL]:         { expireInSeconds: 120, policy: "exclusive", retryLimit: 0 },
  [JOB_NAMES.CALENDAR_SYNC]:             { expireInSeconds: 240, policy: "singleton", retryLimit: 1 },
  [JOB_NAMES.CALENDAR_TOKEN_REFRESH]:    { expireInSeconds: 30,  policy: "singleton", retryLimit: 3, retryDelay: 5 },
  [JOB_NAMES.CALENDAR_DISCONNECT_ALERT]: { expireInSeconds: 60,  policy: "standard",  retryLimit: 2 },

  // Booking approval
  [JOB_NAMES.BOOKING_APPROVAL_REQUEST]: { expireInSeconds: 120, policy: "standard", retryLimit: 3, retryDelay: 30 },
  [JOB_NAMES.BOOKING_APPROVED]:         { expireInSeconds: 120, policy: "standard", retryLimit: 3, retryDelay: 30 },
  [JOB_NAMES.BOOKING_APPROVED_NOTIFY]:  { expireInSeconds: 120, policy: "standard", retryLimit: 3, retryDelay: 30 },
  [JOB_NAMES.BOOKING_REJECTED]:         { expireInSeconds: 120, policy: "standard", retryLimit: 3, retryDelay: 30 },

  // Reschedule approval
  [JOB_NAMES.BOOKING_RESCHEDULE_REQUEST]:  { expireInSeconds: 120, policy: "standard", retryLimit: 3, retryDelay: 30 },
  [JOB_NAMES.BOOKING_RESCHEDULE_DECLINED]: { expireInSeconds: 120, policy: "standard", retryLimit: 3, retryDelay: 30 },
};

export async function ensureJobQueues(boss: PgBoss) {
  for (const [name, options] of Object.entries(QUEUE_OPTIONS)) {
    await boss.createQueue(name, options);
  }
}
