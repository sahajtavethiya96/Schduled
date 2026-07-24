"use server";

import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import {
  connectedCalendar,
  contact,
  notificationPreference,
  user,
  usernameRedirect,
  userProfile,
  videoConnection,
} from "@/db/schema";
import { audit } from "@/lib/audit";
import { requireSession } from "@/lib/authz";
import { db } from "@/lib/db";
import { getAppUrl } from "@/lib/get-app-url";

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
type ActionResult<T = {}> = { error: string } | ({ ok: true } & T);

const RESERVED = new Set([
  "orbit",
  "api",
  "admin",
  "dashboard",
  "settings",
  "login",
  "signup",
  "post-auth",
  "onboarding",
  "privacy",
  "terms",
  "cookies",
  "cancel",
  "reschedule",
  "help",
  "support",
  "about",
  "pricing",
]);

function validateUsername(raw: string): string | null {
  const u = raw.toLowerCase().trim();
  if (u.length < 3) {
    return "Username must be at least 3 characters";
  }
  if (u.length > 30) {
    return "Username must be 30 characters or less";
  }
  if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(u)) {
    return "Only lowercase letters, numbers, and hyphens. Cannot start or end with a hyphen.";
  }
  if (RESERVED.has(u)) {
    return "That username is reserved. Please choose another.";
  }
  return null;
}

// ── My Link ───────────────────────────────────────────────────────────────────

export async function changeUsername(data: {
  username: string;
}): Promise<ActionResult<{ username: string }>> {
  try {
    const session = await requireSession();
    const username = data.username.toLowerCase().trim();

    const usernameError = validateUsername(username);
    if (usernameError) {
      return { error: usernameError };
    }

    // Check availability
    const [existing] = await db
      .select({ id: user.id })
      .from(user)
      .where(eq(user.username, username))
      .limit(1);

    if (existing && existing.id !== session.user.id) {
      return {
        error: "That username is already taken. Please choose another.",
      };
    }

    // Get current username for redirect record
    const [currentUser] = await db
      .select({ username: user.username })
      .from(user)
      .where(eq(user.id, session.user.id))
      .limit(1);

    const oldUsername = currentUser?.username;

    await db
      .update(user)
      .set({ username, updatedAt: new Date() })
      .where(eq(user.id, session.user.id));

    // Record redirect for old username (30-day TTL)
    if (oldUsername && oldUsername !== username) {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);
      await db.insert(usernameRedirect).values({
        userId: session.user.id,
        oldUsername,
        newUsername: username,
        expiresAt,
      });
    }

    await audit({
      action: "user.username_changed",
      actorId: session.user.id,
      actorEmail: session.user.email,
      entityType: "user",
      entityId: session.user.id,
      description: `Changed username from "${oldUsername}" to "${username}"`,
      metadata: { oldUsername, newUsername: username },
    });

    revalidatePath("/settings/my-link");
    return { ok: true, username };
  } catch {
    return { error: "Something went wrong. Please try again." };
  }
}

// ── Communication Preferences ─────────────────────────────────────────────────

export interface CommPrefs {
  bookingConfirmationEmail: boolean;
  bookingNotificationEmail: boolean;
  cancellationEmail: boolean;
  fromName: string;
  joinSoonLeadMinutes: number;
  reminderEmail1h: boolean;
  reminderEmail24h: boolean;
  replyToEmail: string;
  rescheduleEmail: boolean;
}

const JOIN_SOON_LEAD_OPTIONS = [0, 5, 10, 15, 30, 60];

export async function updateCommunicationPrefs(
  data: CommPrefs
): Promise<ActionResult> {
  try {
    const session = await requireSession();

    const fromName = data.fromName.trim();
    const replyTo = data.replyToEmail.trim();

    if (replyTo && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(replyTo)) {
      return { error: "Reply-to email is not valid" };
    }

    const [existing] = await db
      .select({ id: notificationPreference.id })
      .from(notificationPreference)
      .where(eq(notificationPreference.userId, session.user.id))
      .limit(1);

    // Only accept one of the allowed lead-time choices; default to 15.
    const joinSoonLeadMinutes = JOIN_SOON_LEAD_OPTIONS.includes(data.joinSoonLeadMinutes)
      ? data.joinSoonLeadMinutes
      : 15;

    const values = {
      bookingConfirmationEmail: data.bookingConfirmationEmail,
      bookingNotificationEmail: data.bookingNotificationEmail,
      reminderEmail24h: data.reminderEmail24h,
      reminderEmail1h: data.reminderEmail1h,
      cancellationEmail: data.cancellationEmail,
      rescheduleEmail: data.rescheduleEmail,
      joinSoonLeadMinutes,
      fromName: fromName || null,
      replyToEmail: replyTo || null,
      updatedAt: new Date(),
    };

    if (existing) {
      await db
        .update(notificationPreference)
        .set(values)
        .where(eq(notificationPreference.userId, session.user.id));
    } else {
      await db.insert(notificationPreference).values({
        userId: session.user.id,
        ...values,
      });
    }

    revalidatePath("/settings/communication");
    return { ok: true };
  } catch {
    return { error: "Something went wrong. Please try again." };
  }
}

// ── Calendars ─────────────────────────────────────────────────────────────────

export async function disconnectCalendar(
  calendarId: string
): Promise<ActionResult> {
  try {
    const session = await requireSession();

    const [cal] = await db
      .select({
        id: connectedCalendar.id,
        accountEmail: connectedCalendar.accountEmail,
        isWriteTarget: connectedCalendar.isWriteTarget,
      })
      .from(connectedCalendar)
      .where(
        and(
          eq(connectedCalendar.id, calendarId),
          eq(connectedCalendar.userId, session.user.id)
        )
      )
      .limit(1);

    if (!cal) {
      return { error: "Calendar not found" };
    }

    await db.transaction(async (tx) => {
      // Disconnect: clear stored OAuth tokens and relinquish the write-target
      // flag so future bookings don't try to write to a dead calendar.
      await tx
        .update(connectedCalendar)
        .set({
          status: "disconnected",
          disconnectedAt: new Date(),
          isWriteTarget: false,
          accessToken: null,
          refreshToken: null,
          tokenExpiresAt: null,
        })
        .where(eq(connectedCalendar.id, calendarId));

      // If this was the write target, promote another still-connected calendar
      // so confirmed bookings keep landing on a real calendar.
      if (cal.isWriteTarget) {
        const [next] = await tx
          .select({ id: connectedCalendar.id })
          .from(connectedCalendar)
          .where(
            and(
              eq(connectedCalendar.userId, session.user.id),
              eq(connectedCalendar.status, "connected")
            )
          )
          .limit(1);

        if (next) {
          await tx
            .update(connectedCalendar)
            .set({ isWriteTarget: true })
            .where(eq(connectedCalendar.id, next.id));
        }
      }
    });

    await audit({
      action: "calendar.disconnected",
      actorId: session.user.id,
      actorEmail: session.user.email,
      entityType: "connected_calendar",
      entityId: calendarId,
      description: "Disconnected Google Calendar",
      metadata: { accountEmail: cal.accountEmail },
    });

    revalidatePath("/settings/calendars");
    return { ok: true };
  } catch {
    return { error: "Something went wrong. Please try again." };
  }
}

export async function reconnectCalendar(): Promise<
  ActionResult<{ redirectUrl: string }>
> {
  try {
    await requireSession();
    const redirectUrl = `${getAppUrl()}/api/integrations/google?returnTo=/settings/calendars`;
    return { ok: true, redirectUrl };
  } catch {
    return { error: "Something went wrong. Please try again." };
  }
}

// ── Video conferencing (Zoom) ──────────────────────────────────────────────────

export async function disconnectZoom(): Promise<ActionResult> {
  try {
    const session = await requireSession();

    const [conn] = await db
      .select({
        id: videoConnection.id,
        accountEmail: videoConnection.accountEmail,
      })
      .from(videoConnection)
      .where(
        and(
          eq(videoConnection.userId, session.user.id),
          eq(videoConnection.provider, "zoom")
        )
      )
      .limit(1);

    if (!conn) {
      return { error: "Zoom is not connected" };
    }

    await db.delete(videoConnection).where(eq(videoConnection.id, conn.id));

    await audit({
      action: "video.disconnected",
      actorId: session.user.id,
      actorEmail: session.user.email,
      entityType: "video_connection",
      entityId: conn.id,
      description: "Disconnected Zoom",
      metadata: { provider: "zoom", accountEmail: conn.accountEmail },
    });

    revalidatePath("/settings/integrations");
    return { ok: true };
  } catch {
    return { error: "Something went wrong. Please try again." };
  }
}

// ── Contacts ──────────────────────────────────────────────────────────────────

export async function upsertContactNote(
  email: string,
  name: string,
  notes: string
): Promise<ActionResult> {
  try {
    const session = await requireSession();

    const [existing] = await db
      .select({ id: contact.id })
      .from(contact)
      .where(
        and(eq(contact.hostUserId, session.user.id), eq(contact.email, email))
      )
      .limit(1);

    if (existing) {
      await db
        .update(contact)
        .set({ notes: notes || null, updatedAt: new Date() })
        .where(eq(contact.id, existing.id));
    } else {
      await db.insert(contact).values({
        hostUserId: session.user.id,
        email,
        name,
        notes: notes || null,
      });
    }

    revalidatePath("/contacts");
    return { ok: true };
  } catch {
    return { error: "Something went wrong. Please try again." };
  }
}

export async function archiveContact(
  email: string,
  name: string
): Promise<ActionResult> {
  try {
    const session = await requireSession();

    await db
      .insert(contact)
      .values({
        hostUserId: session.user.id,
        email,
        name: name || email,
        isArchived: true,
      })
      .onConflictDoUpdate({
        target: [contact.hostUserId, contact.email],
        set: { isArchived: true, updatedAt: new Date() },
      });

    revalidatePath("/contacts");
    return { ok: true };
  } catch {
    return { error: "Something went wrong. Please try again." };
  }
}

export async function unarchiveContact(email: string): Promise<ActionResult> {
  try {
    const session = await requireSession();

    await db
      .update(contact)
      .set({ isArchived: false, updatedAt: new Date() })
      .where(
        and(eq(contact.hostUserId, session.user.id), eq(contact.email, email))
      );

    revalidatePath("/contacts");
    return { ok: true };
  } catch {
    return { error: "Something went wrong. Please try again." };
  }
}

export async function deleteContact(email: string): Promise<ActionResult> {
  try {
    const session = await requireSession();

    await db
      .delete(contact)
      .where(
        and(eq(contact.hostUserId, session.user.id), eq(contact.email, email))
      );

    revalidatePath("/contacts");
    return { ok: true };
  } catch {
    return { error: "Something went wrong. Please try again." };
  }
}

// ── Contacts: paginated query helper (called from page) ───────────────────────

export type ContactFilter = "all" | "new" | "upcoming";

export async function getContacts({
  page = 1,
  pageSize = 20,
  search = "",
  archived = false,
  filter = "all",
}: {
  page?: number;
  pageSize?: number;
  search?: string;
  archived?: boolean;
  filter?: ContactFilter;
} = {}) {
  const session = await requireSession();
  const userId = session.user.id;
  const offset = (page - 1) * pageSize;

  // Fetch the exclusion list so we can hide matching contacts
  const [profileRow] = await db
    .select({ excludedContactDomains: userProfile.excludedContactDomains })
    .from(userProfile)
    .where(eq(userProfile.userId, userId))
    .limit(1);
  const excludedEntries = (profileRow?.excludedContactDomains ?? "")
    .split(/[\s,]+/)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  // Split into exact emails vs domain patterns
  const excludedEmails = new Set(excludedEntries.filter((e) => e.includes("@")));
  const excludedDomains = excludedEntries.filter((e) => !e.includes("@"));

  const searchClause = search
    ? sql`AND (b.invitee_email ILIKE ${"%" + search + "%"} OR b.invitee_name ILIKE ${"%" + search + "%"})`
    : sql``;

  // Per-contact (grouped) filters: "upcoming" = has a future booking,
  // "new" = first booking CREATED within the last 30 days (uses created_at,
  //         not start_time, so a returning contact who rescheduled recently
  //         doesn't appear as "new").
  const havingClause =
    filter === "upcoming"
      ? sql`HAVING bool_or(b.start_time >= now())`
      : filter === "new"
        ? sql`HAVING min(b.created_at) >= now() - interval '30 days'`
        : sql``;

  // Fetch all matching rows (no SQL pagination) so that the exclusion filter
  // applied in JS produces a count and page slice that are always consistent.
  const rows = await db.execute(sql`
    SELECT
      b.invitee_email   AS email,
      MAX(b.invitee_name) AS name,
      COUNT(b.id)::int  AS booking_count,
      MAX(b.start_time) AS last_booked_at,
      MAX(b.start_time) FILTER (WHERE b.start_time <  now()) AS last_meeting_at,
      MIN(b.start_time) FILTER (WHERE b.start_time >= now()) AS next_meeting_at,
      c.notes,
      c.is_archived,
      c.id              AS contact_id
    FROM booking b
    LEFT JOIN contact c
      ON c.host_user_id = b.host_user_id
      AND c.email = b.invitee_email
    WHERE b.host_user_id = ${userId}
      AND COALESCE(c.is_archived, false) = ${archived}
      ${searchClause}
    GROUP BY b.invitee_email, c.notes, c.is_archived, c.id
    ${havingClause}
    ORDER BY MAX(b.start_time) DESC
  `);

  function isExcluded(email: string) {
    const lower = email.toLowerCase();
    if (excludedEmails.has(lower)) return true;
    const domain = lower.split("@")[1] ?? "";
    return excludedDomains.some((d) => domain === d || domain.endsWith("." + d));
  }

  const allContacts = (rows as unknown as {
    email: string;
    name: string;
    booking_count: number;
    last_booked_at: string | null;
    last_meeting_at: string | null;
    next_meeting_at: string | null;
    notes: string | null;
    is_archived: boolean | null;
    contact_id: string | null;
  }[]).filter((r) => !isExcluded(r.email));

  const contacts = allContacts.slice(offset, offset + pageSize);

  return {
    contacts,
    total: allContacts.length,
  };
}

// ── Contact settings: auto-create on booking + exclusion list ─────────────────

export async function getContactSettings(): Promise<{
  autoCreateContacts: boolean;
  excludedContactDomains: string;
}> {
  const session = await requireSession();
  const [row] = await db
    .select({
      autoCreateContacts: userProfile.autoCreateContacts,
      excludedContactDomains: userProfile.excludedContactDomains,
    })
    .from(userProfile)
    .where(eq(userProfile.userId, session.user.id))
    .limit(1);

  return {
    autoCreateContacts: row?.autoCreateContacts ?? true,
    excludedContactDomains: row?.excludedContactDomains ?? "",
  };
}

export async function updateContactSettings(data: {
  autoCreateContacts: boolean;
  excludedContactDomains: string;
}): Promise<ActionResult> {
  try {
    const session = await requireSession();

    // Normalise the exclusion list: split on commas/whitespace, lowercase,
    // de-dupe, drop empties, then store as a comma-separated string.
    const excluded = Array.from(
      new Set(
        (data.excludedContactDomains ?? "")
          .split(/[\s,]+/)
          .map((s) => s.trim().toLowerCase())
          .filter(Boolean)
      )
    ).join(", ");

    const [existing] = await db
      .select({ id: userProfile.id })
      .from(userProfile)
      .where(eq(userProfile.userId, session.user.id))
      .limit(1);

    if (existing) {
      await db
        .update(userProfile)
        .set({
          autoCreateContacts: data.autoCreateContacts,
          excludedContactDomains: excluded || null,
          updatedAt: new Date(),
        })
        .where(eq(userProfile.userId, session.user.id));
    } else {
      await db.insert(userProfile).values({
        userId: session.user.id,
        autoCreateContacts: data.autoCreateContacts,
        excludedContactDomains: excluded || null,
      });
    }

    revalidatePath("/settings/contacts");
    return { ok: true };
  } catch {
    return { error: "Something went wrong. Please try again." };
  }
}
