import { and, eq } from "drizzle-orm";
import { connectedCalendar } from "@/db/schema";
import { db } from "@/lib/db";
import { enqueueJob } from "@/lib/worker/enqueue";
import { JOB_NAMES } from "@/lib/worker/job-types";

/** True when a Google API error means the OAuth grant is revoked/expired. */
export function isInvalidGrant(err: unknown): boolean {
  if (!err || typeof err !== "object") {
    return /invalid_grant/i.test(String(err));
  }
  const msg =
    "message" in err
      ? String((err as { message?: unknown }).message ?? "")
      : "";
  const status = Number(
    (err as { status?: unknown }).status ??
      (err as { code?: unknown }).code ??
      Number.NaN
  );
  return /invalid_grant/i.test(msg) || status === 401;
}

/**
 * Flip a connected calendar to `disconnected` and alert the host once. Guarded
 * on the current status so concurrent handlers only alert a single time.
 * Returns whether this call performed the flip.
 */
export async function markCalendarRevoked(
  connectedCalendarId: string,
  userId: string
): Promise<boolean> {
  const [flipped] = await db
    .update(connectedCalendar)
    .set({ status: "disconnected", disconnectedAt: new Date() })
    .where(
      and(
        eq(connectedCalendar.id, connectedCalendarId),
        eq(connectedCalendar.status, "connected")
      )
    )
    .returning({ id: connectedCalendar.id });

  if (flipped) {
    await enqueueJob(JOB_NAMES.CALENDAR_DISCONNECT_ALERT, {
      connectedCalendarId,
      userId,
    });
  }
  return !!flipped;
}
