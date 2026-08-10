import { and, eq } from "drizzle-orm";
import type { Job } from "pg-boss";
import { booking, connectedCalendar } from "@/db/schema";
import { db } from "@/lib/db";
import {
  isInvalidGrant,
  markCalendarRevoked,
} from "@/lib/worker/calendar-grant";
import { getGoogleCalendarClient } from "@/lib/worker/google-calendar-client";
import type { CalendarCancelPayload } from "@/lib/worker/job-types";

export async function handleCalendarCancel(jobs: Job<CalendarCancelPayload>[]) {
  for (const job of jobs) {
    await processCalendarCancel(job);
  }
}

async function processCalendarCancel(job: Job<CalendarCancelPayload>) {
  const { bookingId } = job.data;

  const [b] = await db
    .select({
      id: booking.id,
      hostUserId: booking.hostUserId,
      calendarEventId: booking.calendarEventId,
    })
    .from(booking)
    .where(eq(booking.id, bookingId))
    .limit(1);

  if (!b) {
    console.warn(`[calendar-cancel] booking ${bookingId} not found`);
    return;
  }

  if (!b.calendarEventId) {
    console.log(
      `[calendar-cancel] booking ${bookingId} has no calendarEventId — nothing to delete`
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
      `[calendar-cancel] no write-target calendar for host ${b.hostUserId} — skipping`
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
        `[calendar-cancel] calendar ${cal.id} grant invalid — marked disconnected + alerted (event ${b.calendarEventId} left on Google)`
      );
      return;
    }
    console.error(
      `[calendar-cancel] failed to get calendar client for ${cal.id}:`,
      err
    );
    return;
  }

  try {
    await calApi.events.delete({
      calendarId: cal.calendarId ?? cal.accountEmail,
      eventId: b.calendarEventId,
      sendNotifications: true,
    });

    await db
      .update(booking)
      .set({ calendarEventId: null, updatedAt: new Date() })
      .where(eq(booking.id, bookingId));

    console.log(
      `[calendar-cancel] deleted event ${b.calendarEventId} for booking ${bookingId}`
    );
  } catch (err: unknown) {
    const status = (err as { code?: number })?.code;
    if (status === 404 || status === 410) {
      // Already deleted — treat as success
      await db
        .update(booking)
        .set({ calendarEventId: null, updatedAt: new Date() })
        .where(eq(booking.id, bookingId));
      console.log(
        `[calendar-cancel] event ${b.calendarEventId} already gone (${status})`
      );
      return;
    }
    console.error(
      `[calendar-cancel] Google API error for booking ${bookingId}:`,
      err
    );
    throw err;
  }
}
