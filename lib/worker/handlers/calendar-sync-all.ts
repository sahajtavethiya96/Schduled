import { eq } from "drizzle-orm";
import type { Job } from "pg-boss";
import { connectedCalendar } from "@/db/schema";
import { db } from "@/lib/db";
import { enqueueJob } from "@/lib/worker/enqueue";
import { JOB_NAMES } from "@/lib/worker/job-types";

export async function handleCalendarSyncAll(
  jobs: Job<Record<string, never>>[]
) {
  for (const _job of jobs) {
    await dispatchSyncAll();
  }
}

async function dispatchSyncAll() {
  const calendars = await db
    .select({ id: connectedCalendar.id })
    .from(connectedCalendar)
    .where(eq(connectedCalendar.status, "connected"));

  if (!calendars.length) {
    return;
  }

  await Promise.all(
    calendars.map((cal) =>
      enqueueJob(
        JOB_NAMES.CALENDAR_SYNC,
        { connectedCalendarId: cal.id },
        {
          singletonKey: cal.id,
        }
      )
    )
  );

  console.log(
    `[calendar-sync-all] enqueued sync for ${calendars.length} calendar(s)`
  );
}
