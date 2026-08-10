import { and, eq, isNotNull } from "drizzle-orm";
import { booking, connectedCalendar } from "@/db/schema";
import { db } from "@/lib/db";
import { getGoogleCalendarClient } from "@/lib/worker/google-calendar-client";

/**
 * Best-effort removal of the Google Calendar events created for a user's
 * bookings. Deleting an account cascade-deletes the bookings AND the calendar
 * connection, so this must run BEFORE that — otherwise the events are orphaned
 * on the user's Google Calendar with no way for the app to reach them again
 * (normal cancellation removes them, account deletion previously did not).
 *
 * Never throws — a failure here must not block the account/meeting-type delete.
 */
export async function deleteUserCalendarEvents(userId: string): Promise<void> {
  try {
    const [cal] = await db
      .select()
      .from(connectedCalendar)
      .where(
        and(
          eq(connectedCalendar.userId, userId),
          eq(connectedCalendar.isWriteTarget, true),
          eq(connectedCalendar.status, "connected")
        )
      )
      .limit(1);
    if (!cal) {
      return;
    }

    const rows = await db
      .select({ id: booking.id, calendarEventId: booking.calendarEventId })
      .from(booking)
      .where(
        and(eq(booking.hostUserId, userId), isNotNull(booking.calendarEventId))
      );
    if (rows.length === 0) {
      return;
    }

    const calApi = await getGoogleCalendarClient(cal);
    const calendarId = cal.calendarId ?? cal.accountEmail;

    for (const row of rows) {
      try {
        await calApi.events.delete({
          calendarId,
          eventId: row.calendarEventId as string,
          sendNotifications: false,
        });
      } catch (err) {
        const code = (err as { code?: number })?.code;
        // 404/410 = already gone; anything else we log and move on so one bad
        // event doesn't abort the rest of the cleanup.
        if (code !== 404 && code !== 410) {
          console.warn(
            `[cleanup-events] could not delete event for booking ${row.id}:`,
            code ?? err
          );
        }
      }
    }
  } catch (err) {
    console.warn("[cleanup-events] best-effort calendar cleanup failed:", err);
  }
}
