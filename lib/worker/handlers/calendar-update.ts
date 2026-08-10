import { and, eq } from "drizzle-orm";
import type { Job } from "pg-boss";
import { booking, connectedCalendar } from "@/db/schema";
import { db } from "@/lib/db";
import {
  isInvalidGrant,
  markCalendarRevoked,
} from "@/lib/worker/calendar-grant";
import { getGoogleCalendarClient } from "@/lib/worker/google-calendar-client";
import type { CalendarUpdatePayload } from "@/lib/worker/job-types";

export async function handleCalendarUpdate(jobs: Job<CalendarUpdatePayload>[]) {
  for (const job of jobs) {
    await processCalendarUpdate(job);
  }
}

async function processCalendarUpdate(job: Job<CalendarUpdatePayload>) {
  const { bookingId } = job.data;

  const [b] = await db
    .select({
      id: booking.id,
      hostUserId: booking.hostUserId,
      startTime: booking.startTime,
      endTime: booking.endTime,
      calendarEventId: booking.calendarEventId,
    })
    .from(booking)
    .where(eq(booking.id, bookingId))
    .limit(1);

  if (!b) {
    console.warn(`[calendar-update] booking ${bookingId} not found`);
    return;
  }

  if (!b.calendarEventId) {
    console.log(
      `[calendar-update] booking ${bookingId} has no calendarEventId — nothing to update`
    );
    return;
  }

  const [cal] = await db
    .select()
    .from(connectedCalendar)
    .where(
      and(
        eq(connectedCalendar.userId, b.hostUserId),
        eq(connectedCalendar.isWriteTarget, true),
        eq(connectedCalendar.status, "connected")
      )
    )
    .limit(1);

  if (!cal) {
    console.log(
      `[calendar-update] no write-target calendar for host ${b.hostUserId} — skipping`
    );
    return;
  }

  let calApi;
  try {
    calApi = await getGoogleCalendarClient(cal);
  } catch (err) {
    if (isInvalidGrant(err)) {
      await markCalendarRevoked(cal.id, b.hostUserId);
      console.warn(
        `[calendar-update] calendar ${cal.id} grant invalid — marked disconnected + alerted (event ${b.calendarEventId} left at old time)`
      );
      return;
    }
    console.error(
      `[calendar-update] failed to get calendar client for ${cal.id}:`,
      err
    );
    return;
  }

  try {
    await calApi.events.patch({
      calendarId: cal.calendarId ?? cal.accountEmail,
      eventId: b.calendarEventId,
      requestBody: {
        start: { dateTime: b.startTime.toISOString(), timeZone: "UTC" },
        end: { dateTime: b.endTime.toISOString(), timeZone: "UTC" },
      },
      sendNotifications: true,
    });

    console.log(
      `[calendar-update] updated event ${b.calendarEventId} for booking ${bookingId}`
    );
  } catch (err: unknown) {
    const status = (err as { code?: number })?.code;
    if (status === 404 || status === 410) {
      console.warn(
        `[calendar-update] event ${b.calendarEventId} not found (${status}) — clearing`
      );
      await db
        .update(booking)
        .set({ calendarEventId: null, updatedAt: new Date() })
        .where(eq(booking.id, bookingId));
      return;
    }
    console.error(
      `[calendar-update] Google API error for booking ${bookingId}:`,
      err
    );
    throw err;
  }
}
