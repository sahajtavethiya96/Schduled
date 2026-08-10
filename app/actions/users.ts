"use server";

import { eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ADMIN_ROLE } from "@/config/platform";
import {
  account,
  booking,
  eventType,
  session as sessionTable,
  user,
} from "@/db/schema";
import { audit } from "@/lib/audit";
import { requireAdmin } from "@/lib/authz";
import {
  cancelUpcomingBookingsForHost,
  emailInviteesOfHostRemoval,
} from "@/lib/booking/host-booking-cleanup";
import { deleteUserCalendarEvents } from "@/lib/calendar/cleanup-events";
import { db } from "@/lib/db";
import { enqueueJob } from "@/lib/worker/enqueue";
import { JOB_NAMES } from "@/lib/worker/job-types";

/**
 * Records an admin starting an impersonation session. Impersonation itself runs
 * client-side via authClient.admin.impersonateUser and writes nothing to the
 * audit trail on its own, so this call is what makes it attributable.
 */
export async function recordImpersonationAction(
  targetUserId: string
): Promise<{ error: string } | { ok: true }> {
  const admin = await requireAdmin();
  if (!targetUserId) {
    return { error: "Missing user id." };
  }

  const [target] = await db
    .select({ email: user.email })
    .from(user)
    .where(eq(user.id, targetUserId))
    .limit(1);
  if (!target) {
    return { error: "User not found." };
  }

  await audit({
    action: "orbit.impersonation_start",
    actorId: admin.user.id,
    actorEmail: admin.user.email,
    entityType: "user",
    entityId: targetUserId,
    description: `Admin ${admin.user.email} started impersonating ${target.email}`,
    metadata: { targetUserId, targetEmail: target.email },
  });
  return { ok: true };
}

/** Returns the subset of `ids` that are NOT admins — admins can't be acted on. */
async function nonAdminIds(ids: string[]): Promise<string[]> {
  if (ids.length === 0) {
    return [];
  }
  const rows = await db
    .select({ id: user.id, role: user.role })
    .from(user)
    .where(inArray(user.id, ids));
  return rows.filter((r) => r.role !== ADMIN_ROLE).map((r) => r.id);
}

export async function toggleUserBanAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const userId = String(formData.get("userId") ?? "");
  const banned = String(formData.get("banned") ?? "false") === "true";

  if (userId === admin.user.id && banned) {
    return;
  }

  if (banned) {
    const [target] = await db
      .select({ role: user.role })
      .from(user)
      .where(eq(user.id, userId))
      .limit(1);
    if (target?.role === ADMIN_ROLE) {
      return;
    }
  }

  await db
    .update(user)
    .set({
      banReason: banned ? "Disabled by admin" : null,
      banned,
      updatedAt: new Date(),
    })
    .where(eq(user.id, userId));

  // Kill active sessions so the suspension takes effect immediately, not on session expiry.
  if (banned) {
    await db.delete(sessionTable).where(eq(sessionTable.userId, userId));
    // A suspended host can't take meetings; cancel upcoming bookings and notify
    // invitees + remove calendar events. Reactivating does NOT restore them.
    await cancelUpcomingBookingsForHost(
      userId,
      "The host's account was suspended."
    );
  }

  await audit({
    action: banned ? "orbit.user_suspended" : "orbit.user_reactivated",
    actorEmail: admin.user.email,
    actorId: admin.user.id,
    description: banned ? "Suspended user" : "Reactivated user",
    entityId: userId,
    entityType: "user",
  });

  revalidatePath("/settings/users");
}

export async function deleteUserAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const userId = String(formData.get("userId") ?? "");

  if (!userId || userId === admin.user.id) {
    return;
  }

  const [target] = await db
    .select({ email: user.email, role: user.role })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);

  if (!target) {
    redirect("/settings/users");
  }

  if (target.role === ADMIN_ROLE) {
    redirect("/settings/users");
  }

  // Audit before deletion — audit_logs.actor_id has no FK, so the record survives.
  await audit({
    action: "orbit.user_deleted",
    actorEmail: admin.user.email,
    actorId: admin.user.id,
    description: `Permanently deleted user: ${target.email}`,
    entityId: userId,
    entityType: "user",
    metadata: { email: target.email },
  });

  // Both must run before the account is deleted, or invitees are never told
  // and the calendar events are orphaned.
  await emailInviteesOfHostRemoval(userId);
  await deleteUserCalendarEvents(userId);

  // booking has NO ACTION on the user FK, so it must be removed before the
  // user row; everything else cascades from user/booking.
  await db.transaction(async (tx) => {
    await tx.delete(sessionTable).where(eq(sessionTable.userId, userId));
    await tx.delete(account).where(eq(account.userId, userId));
    await tx.delete(booking).where(eq(booking.hostUserId, userId));
    await tx.delete(user).where(eq(user.id, userId));
  });

  revalidatePath("/settings/users");
  redirect("/settings/users");
}

export async function cancelBookingAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const bookingId = String(formData.get("bookingId") ?? "");
  const hostUserId = String(formData.get("hostUserId") ?? "");
  if (!bookingId) {
    return;
  }

  const [b] = await db
    .select({
      id: booking.id,
      status: booking.status,
      inviteeName: booking.inviteeName,
    })
    .from(booking)
    .where(eq(booking.id, bookingId))
    .limit(1);

  if (!b || b.status === "cancelled") {
    return;
  }

  await db
    .update(booking)
    .set({
      status: "cancelled",
      cancelledBy: "admin",
      cancelledAt: new Date(),
      cancellationReason: "Cancelled by admin",
      updatedAt: new Date(),
    })
    .where(eq(booking.id, bookingId));

  await audit({
    action: "orbit.booking_cancelled",
    actorEmail: admin.user.email,
    actorId: admin.user.id,
    description: `Admin cancelled booking for ${b.inviteeName}`,
    entityId: bookingId,
    entityType: "booking",
  });

  // Same side-effects as an invitee cancellation: notify the invitee, remove
  // the calendar event (otherwise it's orphaned), and cancel pending reminders.
  await Promise.allSettled([
    enqueueJob(JOB_NAMES.BOOKING_CANCELLATION, { bookingId }),
    enqueueJob(JOB_NAMES.CALENDAR_CANCEL, { bookingId }),
    enqueueJob(JOB_NAMES.BOOKING_CANCEL_REMINDERS, { bookingId }),
  ]);

  revalidatePath(`/settings/users/${hostUserId}`);
}

export async function deleteEventTypeAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const eventTypeId = String(formData.get("eventTypeId") ?? "");
  const hostUserId = String(formData.get("hostUserId") ?? "");
  if (!eventTypeId) {
    return;
  }

  const [et] = await db
    .select({ id: eventType.id, name: eventType.name })
    .from(eventType)
    .where(eq(eventType.id, eventTypeId))
    .limit(1);

  if (!et) {
    return;
  }

  await audit({
    action: "orbit.event_type_deleted",
    actorEmail: admin.user.email,
    actorId: admin.user.id,
    description: `Admin deleted event type "${et.name}"`,
    entityId: eventTypeId,
    entityType: "event_type",
  });

  await db.delete(booking).where(eq(booking.eventTypeId, eventTypeId));
  await db.delete(eventType).where(eq(eventType.id, eventTypeId));

  revalidatePath(`/settings/users/${hostUserId}`);
}

export async function bulkBanUsersAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const requested = formData
    .getAll("userId")
    .map(String)
    .filter((id) => id && id !== admin.user.id);
  const ids = await nonAdminIds(requested);
  if (ids.length === 0) {
    return;
  }

  await db
    .update(user)
    .set({
      banned: true,
      banReason: "Bulk suspended by admin",
      updatedAt: new Date(),
    })
    .where(inArray(user.id, ids));

  await db.delete(sessionTable).where(inArray(sessionTable.userId, ids));

  await audit({
    action: "orbit.bulk_suspend",
    actorEmail: admin.user.email,
    actorId: admin.user.id,
    description: `Bulk suspended ${ids.length} user(s)`,
    entityId: admin.user.id,
    entityType: "user",
    metadata: { count: ids.length },
  });

  revalidatePath("/settings/users");
}

export async function bulkDeleteUsersAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const requested = formData
    .getAll("userId")
    .map(String)
    .filter((id) => id && id !== admin.user.id);
  const ids = await nonAdminIds(requested);
  if (ids.length === 0) {
    return;
  }

  const targets = await db
    .select({ id: user.id, email: user.email })
    .from(user)
    .where(inArray(user.id, ids));

  for (const target of targets) {
    await audit({
      action: "orbit.user_deleted",
      actorEmail: admin.user.email,
      actorId: admin.user.id,
      description: `Bulk deleted user: ${target.email}`,
      entityId: target.id,
      entityType: "user",
      metadata: { email: target.email },
    });
  }

  // Notify invitees + clean up calendar events before the cascade below removes bookings.
  for (const id of ids) {
    await emailInviteesOfHostRemoval(id);
    await deleteUserCalendarEvents(id);
  }

  await db.transaction(async (tx) => {
    await tx.delete(sessionTable).where(inArray(sessionTable.userId, ids));
    await tx.delete(account).where(inArray(account.userId, ids));
    await tx.delete(booking).where(inArray(booking.hostUserId, ids));
    await tx.delete(user).where(inArray(user.id, ids));
  });

  revalidatePath("/settings/users");
}
