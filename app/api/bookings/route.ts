import { createId } from "@paralleldrive/cuid2";
import { addMinutes, addHours } from "date-fns";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import { and, eq, gt, gte, lte, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import {
  availabilitySchedule,
  booking,
  bookingAnswer,
  bookingBlocklist,
  connectedCalendar,
  eventType,
  idempotencyKey,
  meetingLimit,
  user,
  videoConnection,
} from "@/db/schema";
import { db } from "@/lib/db";
import { isSlotBookable } from "@/lib/calendar/validate-slot";
import { checkRateLimit, jsonError, rateLimitKey } from "@/lib/api/helpers";
import { isValidTimezone, sanitizeText, validateEmail } from "@/lib/validators";
import { canonicalizeTz } from "@/lib/utils";
import { enqueueJob } from "@/lib/worker/enqueue";
import { JOB_NAMES } from "@/lib/worker/job-types";
import { computeReminderSchedule } from "@/lib/worker/reminder-schedule";

interface BookingBody {
  answers?: {
    questionId: string | null;
    questionLabel: string;
    answer: string;
  }[];
  duration?: number;
  email: string;
  eventSlug: string;
  name: string;
  phone?: string;
  startUtc: string;
  timezone: string;
  username: string;
}

export async function POST(request: Request) {
  try {
    // ── Rate limit: 10 bookings/minute per IP ────────────────────────────────
    if (!(await checkRateLimit(rateLimitKey("POST:/api/bookings", request), 10, 60_000))) {
      return jsonError("Too many requests. Please wait a moment and try again.", 429);
    }

    const body: BookingBody = await request.json();
    const {
      username,
      eventSlug,
      startUtc,
      timezone,
      answers = [],
    } = body;

    // ── Sanitize user-supplied text before any use ───────────────────────────
    const name = sanitizeText(String(body.name ?? ""));
    const email = String(body.email ?? "").trim().toLowerCase();
    const phone = body.phone ? sanitizeText(body.phone) : undefined;

    // ── Input validation ─────────────────────────────────────────────────────
    if (!username || !eventSlug || !startUtc || !name || !email || !timezone) {
      return jsonError("Missing required fields", 400);
    }

    const emailError = validateEmail(email);
    if (emailError) return jsonError(emailError, 400);

    if (!isValidTimezone(timezone)) {
      return jsonError("Invalid timezone", 400);
    }

    const startTime = new Date(startUtc);
    if (isNaN(startTime.getTime())) {
      return jsonError("Invalid start time", 400);
    }

    const nowMs = Date.now();

    if (startTime.getTime() <= nowMs) {
      return jsonError("Cannot book a time in the past.", 400);
    }

    // ── Load host + event type (read-only, outside transaction) ──────────────
    const [host] = await db
      .select({ id: user.id })
      .from(user)
      .where(eq(user.username, username))
      .limit(1);

    if (!host) return jsonError("Host not found", 404);

    const et = await db.query.eventType.findFirst({
      where: and(eq(eventType.userId, host.id), eq(eventType.slug, eventSlug), eq(eventType.isActive, true), eq(eventType.isHidden, false)),
      with: { durations: true },
    });

    if (!et) return jsonError("Event type not found", 404);

    // ── Integration connectivity check ───────────────────────────────────────
    if (et.locationType === 'google_meet') {
      const [cal] = await db
        .select({ id: connectedCalendar.id })
        .from(connectedCalendar)
        .where(
          and(
            eq(connectedCalendar.userId, host.id),
            eq(connectedCalendar.status, 'connected'),
            eq(connectedCalendar.isWriteTarget, true)
          )
        )
        .limit(1);
      if (!cal) {
        return jsonError(
          "This meeting requires Google Meet, but the host hasn't connected their Google Calendar. Please contact the host.",
          422
        );
      }
    }

    if (et.locationType === 'zoom') {
      const [zoomConn] = await db
        .select({ id: videoConnection.id })
        .from(videoConnection)
        .where(
          and(
            eq(videoConnection.userId, host.id),
            eq(videoConnection.provider, 'zoom')
          )
        )
        .limit(1);
      if (!zoomConn) {
        return jsonError(
          "This meeting requires Zoom, but the host hasn't connected their Zoom account. Please contact the host.",
          422
        );
      }
    }

    // ── Blocklist check ──────────────────────────────────────────────────────
    const inviteeDomain = email.split("@")[1] ?? "";
    const blocklist = await db
      .select({ pattern: bookingBlocklist.pattern, type: bookingBlocklist.type })
      .from(bookingBlocklist)
      .where(eq(bookingBlocklist.userId, host.id));

    const isBlocked = blocklist.some((b) =>
      b.type === "email"  ? b.pattern.toLowerCase() === email :
      b.type === "domain" ? b.pattern.toLowerCase() === inviteeDomain :
      false
    );
    if (isBlocked) return jsonError("You have been blocked from booking with this host.", 403);

    // Enforce minimum notice (default 60 — matches the DB column default and
    // the /api/slots display, so a direct API call can't bypass the notice the
    // booking UI already hides).
    const minimumNoticeMs = (et.minimumNotice ?? 60) * 60_000;
    if (minimumNoticeMs > 0 && startTime.getTime() - nowMs < minimumNoticeMs) {
      const mins = et.minimumNotice ?? 60;
      const label = mins >= 60 ? `${mins / 60} hour${mins / 60 === 1 ? "" : "s"}` : `${mins} minute${mins === 1 ? "" : "s"}`;
      return jsonError(`This event type requires at least ${label} notice before booking.`, 400);
    }

    // Enforce booking window (rolling only — the fixed-range check needs the
    // host timezone and runs after `date` is computed below).
    if (et.bookingWindowType !== "fixed") {
      const bookingWindowDays = et.bookingWindow ?? 60;
      const maxBookableMs = nowMs + bookingWindowDays * 86_400_000;
      if (startTime.getTime() > maxBookableMs) {
        return jsonError(`Bookings can only be made up to ${bookingWindowDays} days in advance.`, 400);
      }
    }

    const defaultDuration =
      et.durations.find((d) => d.isDefault)?.duration ?? et.durations[0]?.duration ?? 30;
    // Use client-supplied duration only if it's a valid option for this event type
    const requestedDuration = body.duration ? Number(body.duration) : null;
    const duration =
      requestedDuration && et.durations.some((d) => d.duration === requestedDuration)
        ? requestedDuration
        : defaultDuration;

    const endTime      = addMinutes(startTime, duration);
    const bufferStart  = et.bufferBefore  ? addMinutes(startTime, -et.bufferBefore) : startTime;
    const bufferEnd    = et.bufferAfter   ? addMinutes(endTime,    et.bufferAfter)  : endTime;

    const schedule = await db.query.availabilitySchedule.findFirst({
      where: et.availabilityScheduleId
        ? and(eq(availabilitySchedule.id, et.availabilityScheduleId), eq(availabilitySchedule.userId, host.id))
        : and(eq(availabilitySchedule.userId, host.id), eq(availabilitySchedule.isDefault, true)),
    });

    const hostTz    = schedule?.timezone ?? "UTC";
    const date      = formatInTimeZone(startTime, hostTz, "yyyy-MM-dd");
    const dayStartUtc = fromZonedTime(`${date}T00:00:00`, hostTz);
    const dayEndUtc   = fromZonedTime(`${date}T23:59:59.999`, hostTz);

    // Fixed booking window — the host-local date must fall inside the range.
    if (et.bookingWindowType === "fixed" && et.bookingRangeStart && et.bookingRangeEnd) {
      if (date < et.bookingRangeStart || date > et.bookingRangeEnd) {
        return jsonError(
          `This event can only be booked between ${et.bookingRangeStart} and ${et.bookingRangeEnd}.`,
          400
        );
      }
    }

    // Phone required server-side for phone_host_calls
    if (et.locationType === 'phone_host_calls' && !phone?.trim()) {
      return jsonError('Phone number is required for this meeting type.', 400);
    }

    // Server-side availability check — the requested time must be a real slot on
    // the host's schedule (working hours / override, aligned to the increment,
    // not a blocked date). Without this a direct POST could book any arbitrary
    // time, bypassing the /api/slots gating the UI relies on.
    const bookable = await isSlotBookable({
      hostUserId: host.id,
      scheduleId: schedule?.id,
      hostTz,
      startUtc: startTime,
      durationMinutes: duration,
      bufferBefore: et.bufferBefore ?? 0,
      bufferAfter: et.bufferAfter ?? 0,
      increment: et.startTimeIncrement ?? 30,
    });
    if (!bookable) {
      return jsonError("That time isn't available. Please choose an open slot.", 409);
    }

    // ── Idempotency check ────────────────────────────────────────────────────
    // Key includes duration so two requests for the same slot but different
    // durations are treated as distinct (both are valid for multi-duration events).
    const idemKey = `booking:${email.toLowerCase().trim()}:${et.id}:${startTime.toISOString()}:${duration}`;
    const now = new Date();

    const [existing] = await db
      .select({ result: idempotencyKey.result })
      .from(idempotencyKey)
      .where(and(eq(idempotencyKey.key, idemKey), gt(idempotencyKey.expiresAt, now)))
      .limit(1);

    if (existing?.result) {
      return NextResponse.json(JSON.parse(existing.result));
    }

    // ── Transaction: advisory lock → conflict check → INSERT ─────────────────
    const result = await db.transaction(async (tx) => {
      // Serialise concurrent requests targeting the same host + slot.
      // Host-wide lock: serialise ALL concurrent bookings for this host, not
      // just identical start times — otherwise two overlapping-but-different
      // starts each miss the other's uncommitted row under READ COMMITTED and
      // double-book. Released automatically on COMMIT/ROLLBACK.
      await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${host.id}))`);

      // Re-check conflicts inside the locked transaction
      const existingBookings = await tx
        .select({ startTime: booking.startTime, endTime: booking.endTime })
        .from(booking)
        .where(
          and(
            eq(booking.hostUserId, host.id),
            sql`${booking.status} IN ('confirmed', 'pending', 'reschedule_requested')`,
            lte(booking.startTime, dayEndUtc),
            gte(booking.endTime, dayStartUtc)
          )
        );

      const hasConflict = existingBookings.some(
        (b) => bufferStart < new Date(b.endTime) && bufferEnd > new Date(b.startTime)
      );

      if (hasConflict) return { conflict: true } as const;

      if (et.maxBookingsPerDay != null) {
        const sameDayCount = existingBookings.filter(
          (b) => b.startTime >= dayStartUtc && b.startTime <= dayEndUtc
        ).length;
        if (sameDayCount >= et.maxBookingsPerDay) {
          return { dailyLimit: true } as const;
        }
      }

      // ── Global meeting limits ─────────────────────────────────────────────────
      const globalLimits = await tx
        .select({ period: meetingLimit.period, count: meetingLimit.count })
        .from(meetingLimit)
        .where(eq(meetingLimit.userId, host.id));

      if (globalLimits.length > 0) {
        // Count all active bookings for this host
        const allHostBookings = await tx
          .select({ startTime: booking.startTime })
          .from(booking)
          .where(
            and(
              eq(booking.hostUserId, host.id),
              sql`${booking.status} IN ('confirmed', 'pending', 'reschedule_requested')`,
            )
          );

        // Week/month boundaries are computed in the HOST's timezone (matching
        // the day window), not UTC — otherwise a late-evening booking can fall
        // into the wrong week/month bucket near midnight.
        const fmtCal = (d: Date) =>
          `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
        const [ly, lm, ld] = formatInTimeZone(startTime, hostTz, "yyyy-MM-dd")
          .split("-")
          .map(Number);
        const isoDow = Number(formatInTimeZone(startTime, hostTz, "i")); // 1=Mon..7=Sun
        // Treat the host-local calendar date as a UTC date purely for arithmetic.
        const localCal = new Date(Date.UTC(ly, lm - 1, ld));

        const weekStartCal = new Date(localCal);
        weekStartCal.setUTCDate(localCal.getUTCDate() - (isoDow - 1));
        const weekEndCal = new Date(weekStartCal);
        weekEndCal.setUTCDate(weekStartCal.getUTCDate() + 6);

        const weekStartUtc = fromZonedTime(`${fmtCal(weekStartCal)}T00:00:00`, hostTz);
        const weekEndUtc = fromZonedTime(`${fmtCal(weekEndCal)}T23:59:59.999`, hostTz);

        const monthEndCal = new Date(Date.UTC(ly, lm, 0)); // day 0 of next month = last day
        const monthStartUtc = fromZonedTime(
          `${ly}-${String(lm).padStart(2, "0")}-01T00:00:00`,
          hostTz
        );
        const monthEndUtc = fromZonedTime(`${fmtCal(monthEndCal)}T23:59:59.999`, hostTz);

        for (const lim of globalLimits) {
          let windowStart: Date, windowEnd: Date;
          if (lim.period === 'day')   { windowStart = dayStartUtc;   windowEnd = dayEndUtc; }
          else if (lim.period === 'week')  { windowStart = weekStartUtc;  windowEnd = weekEndUtc; }
          else                         { windowStart = monthStartUtc; windowEnd = monthEndUtc; }

          const windowCount = allHostBookings.filter(
            (b) => b.startTime >= windowStart && b.startTime <= windowEnd
          ).length;

          if (windowCount >= lim.count) {
            return { globalLimit: lim.period } as const;
          }
        }
      }

      const cancelToken     = createId();
      const rescheduleToken = createId();
      const approvalToken   = et.requiresApproval ? createId() : null;

      const [newBooking] = await tx
        .insert(booking)
        .values({
          eventTypeId:      et.id,
          hostUserId:       host.id,
          inviteeName:      name.trim(),
          inviteeEmail:     email.toLowerCase().trim(),
          inviteePhone:     phone?.trim() || null,
          inviteeTimezone:  canonicalizeTz(timezone),
          startTime,
          endTime,
          duration,
          locationValue:    et.locationValue,
          status:           et.requiresApproval ? "pending" : "confirmed",
          cancelToken,
          rescheduleToken,
          approvalToken,
          cancelTokenExpiresAt:     addHours(endTime, 24),
          rescheduleTokenExpiresAt: addHours(endTime, 24),
        })
        .returning();

      if (answers.length > 0) {
        await tx.insert(bookingAnswer).values(
          answers.map((a) => ({
            bookingId:     newBooking.id,
            questionId:    a.questionId,
            questionLabel: a.questionLabel,
            answer:        a.answer,
          }))
        );
      }

      // Persist idempotency result (expires in 24h — same as min booking window)
      // Compute the "effective" location value shown to the invitee after booking:
      // – phone_invitee_calls → host's phone number (they need to call)
      // – in_person / custom  → locationValue (address / custom link)
      const locationValue =
        et.locationType === 'phone_invitee_calls' ? (et.hostPhoneNumber ?? null) :
        (et.locationType === 'in_person' || et.locationType === 'custom') ? (et.locationValue ?? null) :
        null;

      const responsePayload = {
        ok: true,
        bookingId:      newBooking.id,
        cancelToken,
        rescheduleToken,
        eventName:      et.name,
        duration,
        startUtc:       startTime.toISOString(),
        endUtc:         endTime.toISOString(),
        locationValue,
        isPending:      et.requiresApproval,
      };

      await tx
        .insert(idempotencyKey)
        .values({
          key:       idemKey,
          result:    JSON.stringify(responsePayload),
          expiresAt: addHours(now, 24),
        })
        .onConflictDoNothing();

      return { ok: true, data: responsePayload } as const;
    });

    if ("conflict" in result && result.conflict) {
      return jsonError("This time slot is no longer available. Please pick another time.", 409);
    }

    if ("dailyLimit" in result && result.dailyLimit) {
      return jsonError("No more bookings available for this day.", 409);
    }

    if ("globalLimit" in result && result.globalLimit) {
      const period = result.globalLimit as string;
      return jsonError(`The host has reached their maximum bookings for this ${period}.`, 409);
    }

    const { data } = result;

    // ── Fire async booking lifecycle jobs ────────────────────────────────────
    await enqueueBookingJobs({
      bookingId:        data.bookingId,
      startTime,
      endTime,
      locationType:     et.locationType,
      requiresApproval: et.requiresApproval,
    });

    return NextResponse.json(data);
  } catch (err) {
    console.error("[POST /api/bookings]", err);
    return jsonError("Something went wrong. Please try again.", 500);
  }
}

async function enqueueBookingJobs(opts: {
  bookingId:        string;
  startTime:        Date;
  endTime:          Date;
  locationType:     string;
  requiresApproval: boolean;
}) {
  const { bookingId, startTime, endTime, locationType, requiresApproval } = opts;
  const startUtcIso = startTime.toISOString();
  const now = Date.now();

  const jobs: Promise<unknown>[] = [];

  // Pending approval — only send the approval request to the host.
  // Calendar, video, confirmation emails, and reminders are deferred
  // until the host approves.
  if (requiresApproval) {
    jobs.push(enqueueJob(JOB_NAMES.BOOKING_APPROVAL_REQUEST, { bookingId }));
    const results = await Promise.allSettled(jobs);
    for (const r of results) {
      if (r.status === "rejected") {
        console.error(`[enqueueBookingJobs] approval job enqueue failed for booking ${bookingId}:`, r.reason);
      }
    }
    return;
  }

  const needsVideoLink = locationType === "google_meet" || locationType === "zoom";

  // Calendar event (no-op if host has no connected write-target calendar)
  jobs.push(enqueueJob(JOB_NAMES.CALENDAR_WRITE, { bookingId }));

  // Confirmation emails + in-app notification
  // For video events, delay 10 s so VIDEO_LINK_GENERATE can finish first
  jobs.push(
    enqueueJob(
      JOB_NAMES.BOOKING_CONFIRMATION,
      { bookingId },
      needsVideoLink ? { startAfter: 10 } : undefined
    )
  );

  if (needsVideoLink) {
    jobs.push(enqueueJob(JOB_NAMES.VIDEO_LINK_GENERATE, { bookingId }));
  }

  // Reminder(s) — 24h + 1h with plenty of lead time; a single last-mile
  // 10m/5m fallback when the booking is made too close to the meeting for
  // those windows to ever fire. See lib/worker/reminder-schedule.ts.
  for (const reminder of computeReminderSchedule(startTime, new Date(now))) {
    jobs.push(
      enqueueJob(
        reminder.jobName,
        { bookingId, bookingStartUtc: startUtcIso },
        { singletonKey: `reminder-${reminder.singletonTag}-${bookingId}`, startAfter: reminder.startAfter }
      )
    );
  }

  // Follow-up email — 30 min after meeting ends
  const followUpAt = addMinutes(endTime, 30);
  jobs.push(
    enqueueJob(
      JOB_NAMES.BOOKING_FOLLOW_UP,
      { bookingId, bookingEndUtc: endTime.toISOString() },
      { singletonKey: `follow-up-${bookingId}`, startAfter: followUpAt }
    )
  );

  const results = await Promise.allSettled(jobs);
  for (const r of results) {
    if (r.status === "rejected") {
      console.error(`[enqueueBookingJobs] job enqueue failed for booking ${bookingId}:`, r.reason);
    }
  }
}
