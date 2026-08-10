const QUEUE_LABELS: Record<string, string> = {
  "email.send": "Email Send",
  "email.outbox-reap": "Email Cleanup",
  "email.outbox_reap": "Email Cleanup",
  "email.events-prune": "Email Events Cleanup",
  "email.events_prune": "Email Events Cleanup",
  "scaffold.healthcheck": "Health Check",
  "__pgboss__send-it": "Internal Worker",
  __pgboss__maintain: "pg-boss Maintenance",
  __pgboss__cron: "Cron Scheduler",
  __pgboss__archive: "Job Archive",
  "booking.video-link-generate": "Video Link Generator",
  "booking.calendar-write": "Calendar Event Writer",
  "booking.reminder-24h": "24h Reminder",
  "booking.reminder-1h": "1h Reminder",
  "booking.cancel-reminders": "Cancel Reminders",
  "booking.calendar-cancel": "Calendar Cancellation",
  "booking.reschedule-reminders": "Reschedule Reminders",
  "booking.calendar-update": "Calendar Update",
  "calendar.sync": "Calendar Sync",
  "calendar.token-refresh": "Token Refresh",
  "calendar.disconnect-alert": "Disconnect Alert",
};

const QUEUE_DESCRIPTIONS: Record<string, string> = {
  "email.send": "Delivers queued outbox emails via SMTP.",
  "email.outbox-reap":
    "Marks emails stuck in 'sending' as failed (every 15 min).",
  "email.events-prune": "Prunes old email delivery events (daily).",
  "scaffold.healthcheck": "Periodic worker liveness check (every 10 min).",
  "platform.idempotency-keys-prune":
    "Removes expired idempotency keys (daily).",
  "booking.video-link-generate": "Generates video meeting links for bookings.",
  "booking.calendar-write": "Writes confirmed bookings to connected calendars.",
  "booking.calendar-update": "Pushes booking changes to connected calendars.",
  "booking.calendar-cancel": "Removes cancelled bookings from calendars.",
  "booking.confirmation": "Sends booking confirmation emails.",
  "booking.reminder-24h": "Sends 24-hour booking reminders.",
  "booking.reminder-1h": "Sends 1-hour booking reminders.",
  "booking.cancel-reminders": "Cancels scheduled reminders for a booking.",
  "booking.reschedule-reminders":
    "Reschedules reminders after a booking moves.",
  "booking.reschedule-notify": "Notifies attendees of a rescheduled booking.",
  "booking.approval-request":
    "Notifies the host of a booking awaiting approval.",
  "booking.approved": "Sends notifications when a booking is approved.",
  "booking.rejected": "Sends notifications when a booking is rejected.",
  "calendar.sync": "Syncs a single connected calendar's busy times.",
  "calendar.sync-all": "Syncs all connected calendars (every 20 min).",
  "calendar.token-refresh": "Refreshes expiring calendar OAuth tokens.",
  "calendar.disconnect-alert": "Alerts users when a calendar disconnects.",
  "__pgboss__send-it": "pg-boss internal dispatcher.",
  __pgboss__maintain: "pg-boss internal maintenance.",
  __pgboss__cron: "pg-boss internal cron scheduler.",
  __pgboss__archive: "pg-boss internal job archiver.",
};

export function getQueueDescription(raw: string): string {
  return QUEUE_DESCRIPTIONS[raw] ?? "Background job queue.";
}

export function getFriendlyName(raw: string): string {
  if (QUEUE_LABELS[raw]) {
    return QUEUE_LABELS[raw];
  }
  return (
    raw
      .replace(/^__[^_]+__/, "")
      .replace(/[-_.]/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase())
      .trim() || raw
  );
}

const STATE_CONFIG: Record<
  string,
  { label: string; cls: string; dot: string }
> = {
  completed: {
    label: "Completed",
    cls: "bg-success/10 text-success border-success/25",
    dot: "bg-success",
  },
  failed: {
    label: "Failed",
    cls: "bg-error/10 text-error border-error/20",
    dot: "bg-error",
  },
  active: {
    label: "Running",
    cls: "bg-primary/10 text-primary border-primary/20",
    dot: "bg-primary",
  },
  created: {
    label: "Queued",
    cls: "bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400",
    dot: "bg-amber-500",
  },
  retry: {
    label: "Retrying",
    cls: "bg-orange-500/10 text-orange-600 border-orange-500/20 dark:text-orange-400",
    dot: "bg-orange-500",
  },
  expired: {
    label: "Expired",
    cls: "bg-base-200 text-muted-foreground border-base-300",
    dot: "bg-muted-foreground",
  },
  cancelled: {
    label: "Cancelled",
    cls: "bg-base-200 text-muted-foreground border-base-300",
    dot: "bg-muted-foreground",
  },
};

export function StateBadge({ state }: { state: string }) {
  const cfg = STATE_CONFIG[state] ?? {
    label: state,
    cls: "bg-base-200 text-muted-foreground border-base-300",
    dot: "bg-muted-foreground",
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 border px-2 py-0.5 text-xs font-semibold ${cfg.cls}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}
