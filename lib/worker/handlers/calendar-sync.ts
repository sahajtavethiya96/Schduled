import { addDays, subDays } from "date-fns";
import { and, eq, lt } from "drizzle-orm";
import type { Job } from "pg-boss";
import { calendarEventCache, connectedCalendar } from "@/db/schema";
import { db } from "@/lib/db";
import { getGoogleCalendarClient } from "@/lib/worker/google-calendar-client";
import type { CalendarSyncPayload } from "@/lib/worker/job-types";

export async function handleCalendarSync(jobs: Job<CalendarSyncPayload>[]) {
  for (const job of jobs) {
    await processCalendarSync(job);
  }
}

async function processCalendarSync(job: Job<CalendarSyncPayload>) {
  const { connectedCalendarId } = job.data;

  const [cal] = await db
    .select()
    .from(connectedCalendar)
    .where(eq(connectedCalendar.id, connectedCalendarId))
    .limit(1);

  if (!cal || cal.provider !== "google" || cal.status !== "connected") {
    console.log(
      `[calendar-sync] ${connectedCalendarId}: not found or not connected — skipping`
    );
    return;
  }

  let calApi;
  try {
    calApi = await getGoogleCalendarClient(cal);
  } catch (err) {
    console.error(
      `[calendar-sync] failed to get client for ${connectedCalendarId}:`,
      err
    );
    return;
  }

  const now = new Date();
  const timeMin = now.toISOString();
  const timeMax = addDays(now, 60).toISOString();

  try {
    const res = await calApi.events.list({
      calendarId: cal.calendarId ?? cal.accountEmail,
      timeMin,
      timeMax,
      singleEvents: true,
      orderBy: "startTime",
      maxResults: 500,
      showDeleted: false,
    });

    const events = res.data.items ?? [];
    const now2 = new Date();

    for (const ev of events) {
      if (!ev.id || !ev.start || !ev.end) {
        continue;
      }

      const startRaw = ev.start.dateTime ?? ev.start.date;
      const endRaw = ev.end.dateTime ?? ev.end.date;
      if (!startRaw || !endRaw) {
        continue;
      }

      const startTime = new Date(startRaw);
      const endTime = new Date(endRaw);

      // busy = not free/transparent
      const isBusy = ev.transparency !== "transparent";

      // Atomic upsert on the (connectedCalendarId, externalEventId) unique
      // index — avoids a check-then-insert race that could double-insert and
      // inflate busy time.
      await db
        .insert(calendarEventCache)
        .values({
          connectedCalendarId,
          externalEventId: ev.id,
          startTime,
          endTime,
          isBusy,
          syncedAt: now2,
        })
        .onConflictDoUpdate({
          target: [
            calendarEventCache.connectedCalendarId,
            calendarEventCache.externalEventId,
          ],
          set: { startTime, endTime, isBusy, syncedAt: now2 },
        });
    }

    // Prune stale entries (events that ended more than 7 days ago)
    await db
      .delete(calendarEventCache)
      .where(
        and(
          eq(calendarEventCache.connectedCalendarId, connectedCalendarId),
          lt(calendarEventCache.endTime, subDays(now, 7))
        )
      );

    console.log(
      `[calendar-sync] synced ${events.length} events for ${connectedCalendarId}`
    );
  } catch (err) {
    console.error(
      `[calendar-sync] Google API error for ${connectedCalendarId}:`,
      err
    );
    throw err;
  }
}
