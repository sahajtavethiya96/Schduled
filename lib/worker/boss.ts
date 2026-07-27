import { type Job, PgBoss } from "pg-boss";
import { env } from "@/lib/env";
import { createLogger } from "@/lib/logger";
import { normalizePgConnectionString } from "@/lib/pg-connection";
import { sleep } from "@/lib/utils";
import { ensureJobQueues } from "@/lib/worker/ensure-queues";
import { JOB_NAMES } from "@/lib/worker/job-types";

const log = createLogger("pg-boss");

const boss = new PgBoss({
  connectionString: normalizePgConnectionString(env.DATABASE_URL),
});

export { boss };

function work<T>(name: string, handler: (jobs: Job<T>[]) => Promise<void>) {
  return boss.work<T>(name, { includeMetadata: true }, handler);
}

async function startBossWithRetry(maxRetries = 10) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await boss.start();
      log.info("pg-boss started");
      return;
    } catch (error) {
      if (attempt === maxRetries) {
        throw error;
      }
      const delay = Math.min(2000 * 2 ** (attempt - 1), 30_000);
      log.error(
        { err: error, attempt, maxRetries, retryInMs: delay },
        "pg-boss start failed; retrying"
      );
      await sleep(delay);
    }
  }
}

export async function startWorker() {
  boss.on("error", (error) => {
    log.error({ err: error }, "pg-boss error");
  });

  await startBossWithRetry();
  await ensureJobQueues(boss);

  // ── Platform handlers ──────────────────────────────────────────────────────
  const { handleIdempotencyKeysPrune } = await import("@/lib/worker/handlers/idempotency-keys-prune");

  // ── Email handlers ─────────────────────────────────────────────────────────
  const { handleEmailSend } = await import("@/lib/worker/handlers/email-send");
  const { handleEmailOutboxReap } = await import("@/lib/worker/handlers/email-outbox-reap");
  const { handleEmailEventsPrune } = await import("@/lib/worker/handlers/email-events-prune");
  const { handlePlatformHealthcheck } = await import("@/lib/worker/handlers/platform-healthcheck");

  // ── Calendar handlers ──────────────────────────────────────────────────────
  const { handleCalendarTokenRefresh } = await import("@/lib/worker/handlers/calendar-token-refresh");
  const { handleCalendarWrite } = await import("@/lib/worker/handlers/calendar-write");
  const { handleCalendarCancel } = await import("@/lib/worker/handlers/calendar-cancel");
  const { handleCalendarUpdate } = await import("@/lib/worker/handlers/calendar-update");
  const { handleCalendarSync }        = await import("@/lib/worker/handlers/calendar-sync");
  const { handleCalendarSyncAll }     = await import("@/lib/worker/handlers/calendar-sync-all");
  const { handleCalendarDisconnectAlert } = await import("@/lib/worker/handlers/calendar-disconnect-alert");

  // ── Video handlers ─────────────────────────────────────────────────────────
  const { handleVideoLinkGenerate } = await import("@/lib/worker/handlers/video-link-generate");

  // ── Booking lifecycle handlers ─────────────────────────────────────────────
  const { handleBookingConfirmation } = await import("@/lib/worker/handlers/booking-confirmation");
  const {
    handleBookingReminder24h,
    handleBookingReminder1h,
    handleBookingReminder10m,
    handleBookingReminder5m,
  } = await import("@/lib/worker/handlers/booking-reminder");
  const { handleBookingCancelReminders } = await import("@/lib/worker/handlers/booking-cancel-reminders");
  const { handleBookingCancellation } = await import("@/lib/worker/handlers/booking-cancellation");
  const { handleBookingRescheduleReminders } = await import("@/lib/worker/handlers/booking-reschedule-reminders");
  const { handleBookingRescheduleNotify } = await import("@/lib/worker/handlers/booking-reschedule-notify");
  const { handleBookingFollowUp } = await import("@/lib/worker/handlers/booking-follow-up");

  // ── Booking approval handlers ──────────────────────────────────────────────
  const { handleBookingApprovalRequest } = await import("@/lib/worker/handlers/booking-approval-request");
  const { handleBookingApproved } = await import("@/lib/worker/handlers/booking-approved");
  const { handleBookingApprovedNotify } = await import("@/lib/worker/handlers/booking-approved-notify");
  const { handleBookingRejected } = await import("@/lib/worker/handlers/booking-rejected");
  const { handleBookingRescheduleRequest } = await import("@/lib/worker/handlers/booking-reschedule-request");
  const { handleBookingRescheduleDeclined } = await import("@/lib/worker/handlers/booking-reschedule-declined");

  await Promise.all([
    // Platform
    work(JOB_NAMES.IDEMPOTENCY_KEYS_PRUNE, handleIdempotencyKeysPrune),

    // Email
    work(JOB_NAMES.EMAIL_SEND,           handleEmailSend),
    work(JOB_NAMES.EMAIL_OUTBOX_REAP,    handleEmailOutboxReap),
    work(JOB_NAMES.EMAIL_EVENTS_PRUNE,   handleEmailEventsPrune),
    work(JOB_NAMES.HEALTHCHECK, handlePlatformHealthcheck),

    // Calendar
    work(JOB_NAMES.CALENDAR_TOKEN_REFRESH, handleCalendarTokenRefresh),
    work(JOB_NAMES.CALENDAR_WRITE,         handleCalendarWrite),
    work(JOB_NAMES.CALENDAR_CANCEL,        handleCalendarCancel),
    work(JOB_NAMES.CALENDAR_UPDATE,        handleCalendarUpdate),
    work(JOB_NAMES.CALENDAR_SYNC,              handleCalendarSync),
    work(JOB_NAMES.CALENDAR_SYNC_ALL,          handleCalendarSyncAll),
    work(JOB_NAMES.CALENDAR_DISCONNECT_ALERT,  handleCalendarDisconnectAlert),

    // Video
    work(JOB_NAMES.VIDEO_LINK_GENERATE, handleVideoLinkGenerate),

    // Booking lifecycle
    work(JOB_NAMES.BOOKING_CONFIRMATION,        handleBookingConfirmation),
    work(JOB_NAMES.BOOKING_REMINDER_24H,        handleBookingReminder24h),
    work(JOB_NAMES.BOOKING_REMINDER_1H,         handleBookingReminder1h),
    work(JOB_NAMES.BOOKING_REMINDER_10M,        handleBookingReminder10m),
    work(JOB_NAMES.BOOKING_REMINDER_5M,         handleBookingReminder5m),
    work(JOB_NAMES.BOOKING_CANCEL_REMINDERS,    handleBookingCancelReminders),
    work(JOB_NAMES.BOOKING_CANCELLATION,        handleBookingCancellation),
    work(JOB_NAMES.BOOKING_RESCHEDULE_REMINDERS, handleBookingRescheduleReminders),
    work(JOB_NAMES.BOOKING_RESCHEDULE_NOTIFY,   handleBookingRescheduleNotify),
    work(JOB_NAMES.BOOKING_FOLLOW_UP,           handleBookingFollowUp),

    // Approval flow
    work(JOB_NAMES.BOOKING_APPROVAL_REQUEST, handleBookingApprovalRequest),
    work(JOB_NAMES.BOOKING_APPROVED,         handleBookingApproved),
    work(JOB_NAMES.BOOKING_APPROVED_NOTIFY,  handleBookingApprovedNotify),
    work(JOB_NAMES.BOOKING_REJECTED,         handleBookingRejected),

    // Reschedule approval flow
    work(JOB_NAMES.BOOKING_RESCHEDULE_REQUEST,  handleBookingRescheduleRequest),
    work(JOB_NAMES.BOOKING_RESCHEDULE_DECLINED, handleBookingRescheduleDeclined),
  ]);

  // ── Cron schedules ─────────────────────────────────────────────────────────
  await boss.schedule(JOB_NAMES.EMAIL_OUTBOX_REAP,       "*/15 * * * *", {});
  await boss.schedule(JOB_NAMES.EMAIL_EVENTS_PRUNE,      "17 3 * * *",   {});
  await boss.schedule(JOB_NAMES.HEALTHCHECK,             "*/10 * * * *", {});
  await boss.schedule(JOB_NAMES.IDEMPOTENCY_KEYS_PRUNE,  "5 4 * * *",    {});
  await boss.schedule(JOB_NAMES.CALENDAR_SYNC_ALL,       "*/20 * * * *", {});
  // Proactively refresh OAuth tokens (and flip status → disconnected + alert
  // when a grant is revoked). The handler was registered but never scheduled,
  // so proactive refresh + disconnect alerts never ran.
  await boss.schedule(JOB_NAMES.CALENDAR_TOKEN_REFRESH,  "*/30 * * * *", {});

  log.info("handlers registered");
}

export async function stopWorker() {
  await boss.stop({ graceful: true });
}
