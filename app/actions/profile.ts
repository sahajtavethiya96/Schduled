"use server";

import { createId } from "@paralleldrive/cuid2";
import { and, eq, gt, inArray, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  account,
  booking,
  session as sessionTable,
  user,
  userProfile,
  verification,
} from "@/db/schema";
import { audit } from "@/lib/audit";
import { requireSession } from "@/lib/authz";
import { emailInviteesOfHostRemoval } from "@/lib/booking/host-booking-cleanup";
import { deleteUserCalendarEvents } from "@/lib/calendar/cleanup-events";
import { db } from "@/lib/db";
import { deleteConfirmationTemplate } from "@/lib/email/templates/delete-confirmation";
import { sendEmailViaSmtp } from "@/lib/smtp/client";

export interface ActionState {
  error?: string;
  success?: string;
}

export async function updateNameAction(
  _state: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await requireSession();
  const name = String(formData.get("name") ?? "").trim();

  if (!name) {
    return { error: "Name is required." };
  }
  if (name.length > 100) {
    return { error: "Name must be 100 characters or fewer." };
  }

  await db
    .update(user)
    .set({ name, updatedAt: new Date() })
    .where(eq(user.id, session.user.id));

  // Keep booking page display name in sync
  const [existing] = await db
    .select({ id: userProfile.id })
    .from(userProfile)
    .where(eq(userProfile.userId, session.user.id))
    .limit(1);
  if (existing) {
    await db
      .update(userProfile)
      .set({ displayName: name, updatedAt: new Date() })
      .where(eq(userProfile.userId, session.user.id));
  } else {
    await db
      .insert(userProfile)
      .values({ id: createId(), userId: session.user.id, displayName: name });
  }

  await audit({
    action: "profile.name_updated",
    actorEmail: session.user.email,
    actorId: session.user.id,
    description: "Updated profile name",
    entityId: session.user.id,
    entityType: "user",
    metadata: { name },
  });

  revalidatePath("/dashboard");
  revalidatePath("/profile/profile");
  revalidatePath("/", "layout");
  return { success: "Name updated." };
}

export async function removeAvatarAction(): Promise<ActionState> {
  try {
    const session = await requireSession();
    await db
      .update(user)
      .set({ image: null, updatedAt: new Date() })
      .where(eq(user.id, session.user.id));
    revalidatePath("/profile/profile");
    revalidatePath("/", "layout");
    return { success: "Photo removed." };
  } catch {
    return { error: "Failed to remove photo. Please try again." };
  }
}

export async function revokeSessionAction(formData: FormData): Promise<void> {
  const current = await requireSession();
  const sessionId = String(formData.get("sessionId") ?? "");

  const [row] = await db
    .select({
      id: sessionTable.id,
      token: sessionTable.token,
      userId: sessionTable.userId,
    })
    .from(sessionTable)
    .where(eq(sessionTable.id, sessionId))
    .limit(1);

  if (!row || row.userId !== current.user.id) {
    return;
  }
  if (row.token === current.session.token) {
    return;
  }

  await db.delete(sessionTable).where(eq(sessionTable.id, sessionId));
  await audit({
    action: "profile.session_revoked",
    actorEmail: current.user.email,
    actorId: current.user.id,
    description: "Revoked an active session",
    entityId: sessionId,
    entityType: "session",
  });

  revalidatePath("/profile/security");
}

export async function signOutOtherSessionsAction(): Promise<void> {
  const current = await requireSession();
  const rows = await db
    .select({ id: sessionTable.id })
    .from(sessionTable)
    .where(
      and(
        eq(sessionTable.userId, current.user.id),
        ne(sessionTable.token, current.session.token)
      )
    );

  const ids = rows.map((row) => row.id);
  if (ids.length > 0) {
    await db.delete(sessionTable).where(inArray(sessionTable.id, ids));
  }

  await audit({
    action: "profile.other_sessions_revoked",
    actorEmail: current.user.email,
    actorId: current.user.id,
    description: `Signed out ${ids.length} other session(s)`,
    entityId: current.user.id,
    entityType: "user",
    metadata: { revokedCount: ids.length },
  });

  revalidatePath("/profile/security");
}

// ── Delete account: step 1 — send OTP code to email ─────────────────────────

export async function sendDeleteCodeAction(): Promise<ActionState> {
  try {
    const current = await requireSession();

    const [freshUser] = await db
      .select({ email: user.email, id: user.id })
      .from(user)
      .where(eq(user.id, current.user.id))
      .limit(1);

    if (!freshUser) {
      return { error: "Account not found." };
    }

    // Generate a 6-digit numeric OTP
    const code = String(Math.floor(100_000 + Math.random() * 900_000));
    const identifier = `delete-account:${freshUser.id}`;
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Upsert into the verification table (replace any existing code)
    await db
      .delete(verification)
      .where(eq(verification.identifier, identifier));

    await db.insert(verification).values({
      id: createId(),
      identifier,
      value: code,
      expiresAt,
    });

    const { html, text } = await deleteConfirmationTemplate({
      code,
      email: freshUser.email,
    });

    // Send directly (not via queue) — OTP codes must arrive immediately,
    // not wait for the pg-boss worker to pick them up.
    // When SMTP is not configured, sendEmailViaSmtp() logs to terminal instead.
    await sendEmailViaSmtp({
      to: freshUser.email,
      subject: `${code} — confirm your account deletion`,
      html,
      text,
    });

    await audit({
      action: "profile.delete_code_sent",
      actorEmail: freshUser.email,
      actorId: freshUser.id,
      description: "Account deletion confirmation code sent",
      entityId: freshUser.id,
      entityType: "user",
    });

    return { success: "Code sent. Check your email." };
  } catch {
    return { error: "Failed to send confirmation code. Try again." };
  }
}

// ── Delete account: step 2 — verify code + reason + delete ───────────────────

export async function deleteAccountAction(
  _state: ActionState,
  formData: FormData
): Promise<ActionState> {
  const current = await requireSession();
  const code = String(formData.get("code") ?? "").trim();
  const reason = String(formData.get("reason") ?? "").trim();

  if (!reason) {
    return { error: "Please select a reason for leaving." };
  }
  if (!code || code.length !== 6) {
    return { error: "Enter the 6-digit code from your email." };
  }

  const [freshUser] = await db
    .select({ email: user.email, id: user.id })
    .from(user)
    .where(eq(user.id, current.user.id))
    .limit(1);

  if (!freshUser) {
    return { error: "Account not found." };
  }

  // Verify the OTP code
  const identifier = `delete-account:${freshUser.id}`;
  const now = new Date();

  const [verificationRow] = await db
    .select({ id: verification.id, value: verification.value })
    .from(verification)
    .where(
      and(
        eq(verification.identifier, identifier),
        gt(verification.expiresAt, now)
      )
    )
    .limit(1);

  if (!verificationRow) {
    return { error: "Code expired or not found. Request a new one." };
  }

  if (verificationRow.value !== code) {
    return { error: "Incorrect code. Check your email and try again." };
  }

  // Clean up verification record
  await db.delete(verification).where(eq(verification.id, verificationRow.id));

  await audit({
    action: "profile.account_deleted",
    actorEmail: freshUser.email,
    actorId: freshUser.id,
    description: `Deleted account. Reason: ${reason}`,
    entityId: freshUser.id,
    entityType: "user",
    metadata: { reason },
  });

  // Tell invitees their upcoming meetings are cancelled and remove the Google
  // Calendar events before the account (and its bookings + calendar connection)
  // is deleted.
  await emailInviteesOfHostRemoval(freshUser.id);
  await deleteUserCalendarEvents(freshUser.id);

  await db.transaction(async (tx) => {
    await tx.delete(sessionTable).where(eq(sessionTable.userId, freshUser.id));
    await tx.delete(account).where(eq(account.userId, freshUser.id));
    // booking has NO ACTION on user FK — must delete before user
    // booking_answer, booking_guest, notification, workflow_job all CASCADE from booking
    await tx.delete(booking).where(eq(booking.hostUserId, freshUser.id));
    await tx.delete(user).where(eq(user.id, freshUser.id));
  });

  redirect("/");
}
