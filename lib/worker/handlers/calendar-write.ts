import { and, eq } from "drizzle-orm";
import type { calendar_v3 } from "googleapis";
import type { Job } from "pg-boss";
import { booking, connectedCalendar, eventType, user } from "@/db/schema";
import { db } from "@/lib/db";
import { enqueueJob } from "@/lib/worker/enqueue";
import { getGoogleCalendarClient } from "@/lib/worker/google-calendar-client";
import { type CalendarWritePayload, JOB_NAMES } from "@/lib/worker/job-types";
import { resolveLocationLabelHost } from "./booking-lifecycle-data";

export async function handleCalendarWrite(jobs: Job<CalendarWritePayload>[]) {
  for (const job of jobs) {
    await processCalendarWrite(job);
  }
}

async function processCalendarWrite(job: Job<CalendarWritePayload>) {
  const { bookingId } = job.data;

  const [b] = await db
    .select({
      id: booking.id,
      inviteeName: booking.inviteeName,
      inviteeEmail: booking.inviteeEmail,
      inviteeTimezone: booking.inviteeTimezone,
      startTime: booking.startTime,
      endTime: booking.endTime,
      locationValue: booking.locationValue,
      inviteePhone: booking.inviteePhone,
      hostUserId: booking.hostUserId,
      status: booking.status,
      calendarEventId: booking.calendarEventId,
      etName: eventType.name,
      etDescription: eventType.description,
      etLocationType: eventType.locationType,
      etLocationValue: eventType.locationValue,
      hostName: user.name,
      hostEmail: user.email,
    })
    .from(booking)
    .innerJoin(eventType, eq(eventType.id, booking.eventTypeId))
    .innerJoin(user, eq(user.id, booking.hostUserId))
    .where(eq(booking.id, bookingId))
    .limit(1);

  if (!b) {
    console.warn(`[calendar-write] booking ${bookingId} not found`);
    return;
  }

  if (b.status === "cancelled") {
    console.log(
      `[calendar-write] booking ${bookingId} is cancelled — skipping`
    );
    return;
  }

  if (b.calendarEventId) {
    console.log(
      `[calendar-write] booking ${bookingId} already has calendarEventId — skipping`
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
      `[calendar-write] no write-target calendar for host ${b.hostUserId} — skipping`
    );
    return;
  }

  let calApi;
  try {
    calApi = await getGoogleCalendarClient(cal);
  } catch (err) {
    // A revoked/expired grant (invalid_grant) never recovers on retry — flip
    // the calendar to disconnected and alert the host once.
    const msg = getGoogleErrorMessage(err);
    if (/invalid_grant/i.test(msg) || getGoogleErrorStatus(err) === 401) {
      const [flipped] = await db
        .update(connectedCalendar)
        .set({ status: "disconnected", disconnectedAt: new Date() })
        .where(
          and(
            eq(connectedCalendar.id, cal.id),
            eq(connectedCalendar.status, "connected")
          )
        )
        .returning({ id: connectedCalendar.id });
      if (flipped) {
        await enqueueJob(JOB_NAMES.CALENDAR_DISCONNECT_ALERT, {
          connectedCalendarId: cal.id,
          userId: b.hostUserId,
        });
      }
      console.warn(
        `[calendar-write] calendar ${cal.id} grant is invalid — marked disconnected + alerted host`
      );
      return;
    }
    console.error(
      `[calendar-write] failed to get calendar client for ${cal.id}:`,
      err
    );
    return;
  }

  const isGoogleMeet = b.etLocationType === "google_meet";

  // Same resolver used by every host-facing email, so this matches what the
  // host sees in their confirmation email; Google renders it in its own
  // Location UI rather than as plain text in the description.
  const location = resolveLocationLabelHost(
    b.etLocationType,
    b.etLocationValue,
    b.inviteePhone
  );

  const eventBody: calendar_v3.Schema$Event = {
    summary: `${b.etName} with ${b.inviteeName}`,
    description: buildDescription(b),
    location,
    start: {
      dateTime: b.startTime.toISOString(),
      timeZone: "UTC",
    },
    end: {
      dateTime: b.endTime.toISOString(),
      timeZone: "UTC",
    },
    attendees: [
      {
        email: b.hostEmail,
        displayName: b.hostName ?? undefined,
        responseStatus: "accepted",
      },
      {
        email: b.inviteeEmail,
        displayName: b.inviteeName,
        responseStatus: "needsAction",
      },
    ],
    ...(isGoogleMeet && {
      conferenceData: {
        createRequest: {
          requestId: `schduled-${bookingId}`,
          conferenceSolutionKey: { type: "hangoutsMeet" },
        },
      },
    }),
  };

  try {
    const res = await calApi.events.insert({
      calendarId: cal.calendarId ?? cal.accountEmail,
      requestBody: eventBody,
      conferenceDataVersion: isGoogleMeet ? 1 : 0,
      sendNotifications: true,
    });

    const googleEventId = res.data.id!;
    let meetUrl: string | null = null;

    if (isGoogleMeet) {
      const entry = res.data.conferenceData?.entryPoints?.find(
        (ep) => ep.entryPointType === "video"
      );
      meetUrl = entry?.uri ?? null;
    }

    // Retry only the DB write on failure — the Google event has no idempotency
    // key (requestId only dedupes the Meet conference), so re-running the
    // whole handler would create a second calendar event.
    let persisted = false;
    for (let attempt = 0; attempt < 3 && !persisted; attempt++) {
      try {
        await db
          .update(booking)
          .set({
            calendarEventId: googleEventId,
            ...(meetUrl && {
              videoLinkHost: meetUrl,
              videoLinkInvitee: meetUrl,
              locationValue: meetUrl,
            }),
            updatedAt: new Date(),
          })
          .where(eq(booking.id, bookingId));
        persisted = true;
      } catch (dbErr) {
        if (attempt === 2) {
          throw dbErr;
        }
        console.warn(
          `[calendar-write] persist attempt ${attempt + 1} failed for booking ${bookingId}, retrying:`,
          dbErr
        );
      }
    }

    console.log(
      `[calendar-write] created event ${googleEventId} for booking ${bookingId}${meetUrl ? " + Meet link" : ""}`
    );
  } catch (err) {
    // Permanent failures won't fix themselves on retry — log and stop instead
    // of burning retries. Transient failures still re-throw to retry.
    const status = getGoogleErrorStatus(err);
    if (status && PERMANENT_CALENDAR_ERRORS.has(status)) {
      console.warn(
        `[calendar-write] skipping booking ${bookingId} — Google Calendar ${status} (${getGoogleErrorMessage(err)}). Booking is unaffected; calendar event not created.`
      );
      return;
    }
    console.error(
      `[calendar-write] transient Google API error for booking ${bookingId} (will retry):`,
      getGoogleErrorMessage(err)
    );
    throw err; // re-throw so pg-boss retries
  }
}

// HTTP statuses that indicate a misconfiguration rather than a blip —
// retrying gets the same answer, so we skip instead of retrying.
const PERMANENT_CALENDAR_ERRORS = new Set([400, 401, 403, 404]);

function getGoogleErrorStatus(err: unknown): number | null {
  if (err && typeof err === "object" && "status" in err) {
    const s = (err as { status?: unknown }).status;
    if (typeof s === "number") {
      return s;
    }
  }
  if (err && typeof err === "object" && "code" in err) {
    const c = (err as { code?: unknown }).code;
    if (typeof c === "number") {
      return c;
    }
  }
  return null;
}

function getGoogleErrorMessage(err: unknown): string {
  if (err && typeof err === "object") {
    const cause = (err as { cause?: { message?: string } }).cause;
    if (cause?.message) {
      return cause.message;
    }
    const msg = (err as { message?: string }).message;
    if (msg) {
      return msg;
    }
  }
  return String(err);
}

function buildDescription(b: {
  inviteeName: string;
  inviteeEmail: string;
  inviteeTimezone: string;
  locationValue: string | null;
  etDescription: string | null;
}) {
  const lines: string[] = [];
  if (b.etDescription) {
    lines.push(b.etDescription, "");
  }
  lines.push(`Guest: ${b.inviteeName} (${b.inviteeEmail})`);
  lines.push(`Guest timezone: ${b.inviteeTimezone}`);
  if (b.locationValue) {
    lines.push(`Location: ${b.locationValue}`);
  }
  lines.push("", "Scheduled via Schduled");
  return lines.join("\n");
}
