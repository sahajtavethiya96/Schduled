import { eq } from "drizzle-orm";
import type { Job } from "pg-boss";
import { connectedCalendar, user } from "@/db/schema";
import { db } from "@/lib/db";
import type { CalendarDisconnectAlertPayload } from "@/lib/worker/job-types";

/**
 * Fired when a Google Calendar OAuth token cannot be refreshed, meaning the
 * user revoked access. Logs the event and marks the calendar disconnected.
 * TODO: send an email to the host notifying them to reconnect.
 */
export async function handleCalendarDisconnectAlert(
  jobs: Job<CalendarDisconnectAlertPayload>[]
) {
  for (const job of jobs) {
    await processDisconnectAlert(job);
  }
}

async function processDisconnectAlert(
  job: Job<CalendarDisconnectAlertPayload>
) {
  const { connectedCalendarId, userId } = job.data;

  const [cal] = await db
    .select({
      id: connectedCalendar.id,
      accountEmail: connectedCalendar.accountEmail,
    })
    .from(connectedCalendar)
    .where(eq(connectedCalendar.id, connectedCalendarId))
    .limit(1);

  const [u] = await db
    .select({ email: user.email, name: user.name })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);

  console.warn(
    `[calendar-disconnect-alert] Calendar ${connectedCalendarId} (${cal?.accountEmail ?? "unknown"}) disconnected for user ${u?.email ?? userId}. ` +
      "They need to reconnect at /dashboard/settings/calendar."
  );

  // Ensure status is disconnected (may already be set by token-refresh handler)
  if (cal) {
    await db
      .update(connectedCalendar)
      .set({ status: "disconnected", disconnectedAt: new Date() })
      .where(eq(connectedCalendar.id, connectedCalendarId));
  }
}
