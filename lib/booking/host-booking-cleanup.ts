import { and, eq, gt, inArray, sql } from "drizzle-orm";
import { booking } from "@/db/schema";
import { db } from "@/lib/db";
import { enqueueEmail } from "@/lib/email";
import { bookingEmail } from "@/lib/email/templates/booking-emails";
import { enqueueJob } from "@/lib/worker/enqueue";
import {
  loadBookingForLifecycle,
  resolveLocationLabel,
} from "@/lib/worker/handlers/booking-lifecycle-data";
import { JOB_NAMES } from "@/lib/worker/job-types";

const ACTIVE = sql`${booking.status} IN ('confirmed', 'pending', 'reschedule_requested')`;

/**
 * Cancel a host's upcoming meetings and notify everyone — used when an admin
 * suspends a host, since a suspended host can't take meetings. Booking rows
 * still exist afterward so the async cancellation/calendar jobs can run.
 */
export async function cancelUpcomingBookingsForHost(
  hostUserId: string,
  reason: string
): Promise<number> {
  const rows = await db
    .select({ id: booking.id })
    .from(booking)
    .where(
      and(
        eq(booking.hostUserId, hostUserId),
        gt(booking.startTime, new Date()),
        ACTIVE
      )
    );
  if (rows.length === 0) {
    return 0;
  }

  const ids = rows.map((r) => r.id);
  const now = new Date();
  await db
    .update(booking)
    .set({
      status: "cancelled",
      cancelledBy: "admin",
      cancelledAt: now,
      cancellationReason: reason,
      rescheduleRequestedStart: null,
      rescheduleRequestedEnd: null,
      approvalToken: null,
      updatedAt: now,
    })
    .where(inArray(booking.id, ids));

  await Promise.allSettled(
    ids.flatMap((id) => [
      enqueueJob(JOB_NAMES.BOOKING_CANCELLATION, { bookingId: id }),
      enqueueJob(JOB_NAMES.CALENDAR_CANCEL, { bookingId: id }),
      enqueueJob(JOB_NAMES.BOOKING_CANCEL_REMINDERS, { bookingId: id }),
    ])
  );
  return ids.length;
}

/**
 * Email invitees that their meetings are cancelled because the host's account
 * is being deleted. Built INLINE, not via the async cancellation job — the
 * booking rows are about to be deleted, so that job would find them gone.
 * Best-effort; never throws.
 */
export async function emailInviteesOfHostRemoval(
  hostUserId: string
): Promise<number> {
  try {
    const rows = await db
      .select({ id: booking.id })
      .from(booking)
      .where(
        and(
          eq(booking.hostUserId, hostUserId),
          gt(booking.startTime, new Date()),
          ACTIVE
        )
      );

    let sent = 0;
    for (const row of rows) {
      try {
        const b = await loadBookingForLifecycle(row.id);
        if (!b) {
          continue;
        }
        const mail = await bookingEmail({
          variant: "cancellation",
          audience: "invitee",
          eventName: b.etName,
          startUtc: new Date(b.startTime),
          previousStartUtc: null,
          hostTimezone: b.hostTimezone ?? "UTC",
          inviteeTimezone: b.inviteeTimezone,
          meetLink: null,
          cancelToken: b.cancelToken,
          rescheduleToken: b.rescheduleToken,
          reason: "The host's account was removed.",
          locationLabel: resolveLocationLabel(
            b.etLocationType,
            b.etLocationValue,
            b.inviteePhone
          ),
          locationType: b.etLocationType,
          recipientName: b.inviteeName,
          otherPartyName: b.hostName ?? "your host",
        });
        await enqueueEmail(
          {
            to: b.inviteeEmail,
            subject: mail.subject,
            html: mail.html,
            text: mail.text,
          },
          { idempotencyKey: `host-removed:${b.id}:invitee` }
        );
        sent++;
      } catch (err) {
        console.warn(
          `[host-removal] failed to email invitee for booking ${row.id}:`,
          err
        );
      }
    }
    return sent;
  } catch (err) {
    console.warn("[host-removal] invitee notification failed:", err);
    return 0;
  }
}
