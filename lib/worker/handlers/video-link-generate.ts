import { and, eq } from "drizzle-orm";
import type { Job } from "pg-boss";
import {
  booking,
  connectedCalendar,
  eventType,
  videoConnection,
} from "@/db/schema";
import { audit } from "@/lib/audit";
import { db } from "@/lib/db";
import { QUEUE_OPTIONS } from "@/lib/worker/ensure-queues";
import {
  JOB_NAMES,
  type VideoLinkGeneratePayload,
} from "@/lib/worker/job-types";
import { createZoomMeeting, getValidZoomAccessToken } from "@/lib/zoom/client";

function jobAttempt(job: Job<unknown>): number {
  return Number(
    (job as { retryCount?: number; retrycount?: number }).retryCount ??
      (job as { retrycount?: number }).retrycount ??
      0
  );
}

export async function handleVideoLinkGenerate(
  jobs: Job<VideoLinkGeneratePayload>[]
) {
  for (const job of jobs) {
    await processVideoLinkGenerate(job);
  }
}

async function processVideoLinkGenerate(job: Job<VideoLinkGeneratePayload>) {
  const { bookingId } = job.data;

  const [b] = await db
    .select({
      id: booking.id,
      hostUserId: booking.hostUserId,
      inviteeName: booking.inviteeName,
      inviteeTimezone: booking.inviteeTimezone,
      startTime: booking.startTime,
      duration: booking.duration,
      status: booking.status,
      videoLinkHost: booking.videoLinkHost,
      videoLinkInvitee: booking.videoLinkInvitee,
      locationType: eventType.locationType,
      etName: eventType.name,
    })
    .from(booking)
    .innerJoin(eventType, eq(eventType.id, booking.eventTypeId))
    .where(eq(booking.id, bookingId))
    .limit(1);

  if (!b) {
    console.warn(`[video-link-generate] booking ${bookingId} not found`);
    return;
  }

  if (b.status === "cancelled") {
    console.log(
      `[video-link-generate] booking ${bookingId} is cancelled — skipping`
    );
    return;
  }

  if (b.locationType === "google_meet") {
    // Google Meet link is created by CALENDAR_WRITE via conferenceData API.
    // If videoLinkHost is already set, nothing more to do.
    if (b.videoLinkHost) {
      console.log(
        `[video-link-generate] booking ${bookingId} already has Meet link — done`
      );
      return;
    }

    // No link yet: retry (CALENDAR_WRITE may still be running) if a write-target
    // calendar exists, otherwise a Meet link can never be created — give up.
    const [writeCal] = await db
      .select({ id: connectedCalendar.id })
      .from(connectedCalendar)
      .where(
        and(
          eq(connectedCalendar.userId, b.hostUserId),
          eq(connectedCalendar.status, "connected"),
          eq(connectedCalendar.isWriteTarget, true)
        )
      )
      .limit(1);

    if (!writeCal) {
      console.warn(
        `[video-link-generate] booking ${bookingId}: no connected write-target calendar — cannot create a Meet link`
      );
      return;
    }

    const retryLimit =
      QUEUE_OPTIONS[JOB_NAMES.VIDEO_LINK_GENERATE].retryLimit ?? 0;
    if (jobAttempt(job) < retryLimit) {
      throw new Error(
        `Meet link for booking ${bookingId} not written yet by calendar-write — retrying`
      );
    }
    console.warn(
      `[video-link-generate] booking ${bookingId}: gave up waiting for the Meet link after retries`
    );
    return;
  }

  if (b.locationType === "zoom") {
    await generateZoomLink(b, jobAttempt(job));
    return;
  }

  // All other location types (phone, in_person, custom) don't need a video link.
  console.log(
    `[video-link-generate] booking ${bookingId}: locationType=${b.locationType} — no video link needed`
  );
}

/**
 * Records why a Zoom link will never be generated so the UI can tell the
 * host instead of silently showing no Join button forever.
 */
async function giveUpOnZoomLink(
  bookingId: string,
  hostUserId: string,
  code: string,
  detail: unknown
) {
  console.warn(
    `[video-link-generate] booking ${bookingId}: giving up on Zoom link (${code})`,
    detail ?? ""
  );
  await db
    .update(booking)
    .set({ videoLinkError: code, updatedAt: new Date() })
    .where(eq(booking.id, bookingId));
  await audit({
    action: "video.link_generation_failed",
    actorId: hostUserId,
    entityType: "video_connection",
    entityId: bookingId,
    description: `Zoom meeting link could not be generated for booking ${bookingId}: ${code}`,
    metadata: { provider: "zoom", code },
  });
}

async function generateZoomLink(
  b: {
    id: string;
    hostUserId: string;
    inviteeName: string;
    inviteeTimezone: string;
    startTime: Date;
    duration: number;
    videoLinkInvitee: string | null;
    etName: string;
  },
  attempt: number
) {
  // Already generated (idempotent re-run)
  if (b.videoLinkInvitee) {
    console.log(
      `[video-link-generate] booking ${b.id} already has Zoom link — done`
    );
    return;
  }

  const retryLimit =
    QUEUE_OPTIONS[JOB_NAMES.VIDEO_LINK_GENERATE].retryLimit ?? 0;
  const isLastAttempt = attempt >= retryLimit;

  const [conn] = await db
    .select()
    .from(videoConnection)
    .where(
      and(
        eq(videoConnection.userId, b.hostUserId),
        eq(videoConnection.provider, "zoom")
      )
    )
    .limit(1);

  if (!conn) {
    // Deterministic failure — retrying won't make a connection appear.
    await giveUpOnZoomLink(b.id, b.hostUserId, "zoom_not_connected", null);
    return;
  }

  let accessToken: string;
  try {
    accessToken = await getValidZoomAccessToken(conn);
  } catch (err) {
    if (isLastAttempt) {
      await giveUpOnZoomLink(
        b.id,
        b.hostUserId,
        "zoom_token_refresh_failed",
        err
      );
      return;
    }
    console.error(
      `[video-link-generate] booking ${b.id}: failed to get Zoom access token:`,
      err
    );
    throw err; // may be transient (network) — let pg-boss retry
  }

  let meeting;
  try {
    meeting = await createZoomMeeting(accessToken, {
      topic: `${b.etName} with ${b.inviteeName}`,
      startTimeIso: b.startTime.toISOString(),
      durationMinutes: b.duration,
      timezone: "UTC",
      agenda: `Scheduled via Schduled with ${b.inviteeName}`,
    });
  } catch (err) {
    if (isLastAttempt) {
      await giveUpOnZoomLink(
        b.id,
        b.hostUserId,
        "zoom_meeting_create_failed",
        err
      );
      return;
    }
    // The meeting was not created — safe for pg-boss to retry.
    console.error(
      `[video-link-generate] booking ${b.id}: Zoom meeting create failed:`,
      err
    );
    throw err;
  }

  // Retry only the DB write on failure — Zoom's create has no idempotency
  // key, so re-running the whole handler would create a second meeting.
  let persisted = false;
  for (let dbAttempt = 0; dbAttempt < 3 && !persisted; dbAttempt++) {
    try {
      await db
        .update(booking)
        .set({
          videoLinkHost: meeting.startUrl,
          videoLinkInvitee: meeting.joinUrl,
          videoLinkPassword: meeting.password,
          locationValue: meeting.joinUrl,
          videoLinkError: null,
          updatedAt: new Date(),
        })
        .where(eq(booking.id, b.id));
      persisted = true;
    } catch (dbErr) {
      if (dbAttempt === 2) {
        throw dbErr;
      }
      console.warn(
        `[video-link-generate] booking ${b.id}: persist attempt ${dbAttempt + 1} failed, retrying:`,
        dbErr
      );
    }
  }

  console.log(
    `[video-link-generate] booking ${b.id}: created Zoom meeting ${meeting.meetingId}`
  );
}
