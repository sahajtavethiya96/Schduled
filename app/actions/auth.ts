"use server";

import { eq } from "drizzle-orm";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { user } from "@/db/schema";
import { safeReturnTo } from "@/lib/api/helpers";
import { audit } from "@/lib/audit";
import { auth } from "@/lib/auth";
import { userHasPassword } from "@/lib/auth-password";
import { db } from "@/lib/db";
import { env } from "@/lib/env";

// `redirectTo` is bound per call-site so sign-out returns to the surface the user signed out from.
export async function logoutAction(
  redirectTo = "/login",
  _formData?: FormData
) {
  const requestHeaders = await headers();
  const session = await auth.api.getSession({ headers: requestHeaders });
  await auth.api.signOut({ headers: requestHeaders });

  // Server action responses don't forward Set-Cookie from auth.api.signOut, so clear manually.
  const cookieStore = await cookies();
  cookieStore.delete("better-auth.session_token");
  cookieStore.delete("__Secure-better-auth.session_token");

  if (session) {
    await audit({
      action: "auth.logout",
      actorEmail: session.user.email,
      actorId: session.user.id,
      description: `User logged out: ${session.user.email}`,
      entityId: session.user.id,
      entityType: "user",
    });
  }

  // safeReturnTo also rejects protocol-relative ("//evil.com") and backslash
  // targets that a plain startsWith("/") check would let through.
  redirect(safeReturnTo(redirectTo, "/login"));
}

/**
 * Sets a password for a user with none yet (signed up via magic link/Google).
 * Better Auth's `setPassword` is server-only, unlike `authClient.changePassword`
 * which requires the current password and is used to change an existing one.
 */
export async function setPasswordAction(
  newPassword: string
): Promise<{ ok: true } | { error: string }> {
  const requestHeaders = await headers();
  const session = await auth.api.getSession({ headers: requestHeaders });
  if (!session) {
    return { error: "Unauthorized" };
  }

  if (await userHasPassword(session.user.id)) {
    return { error: "A password is already set. Use Change password instead." };
  }

  try {
    await auth.api.setPassword({
      body: { newPassword },
      headers: requestHeaders,
    });
  } catch {
    return { error: "Could not set the password. Please try again." };
  }

  await audit({
    action: "auth.password_set",
    actorEmail: session.user.email,
    actorId: session.user.id,
    description: `Password set for ${session.user.email}`,
    entityId: session.user.id,
    entityType: "user",
  });

  return { ok: true };
}

/**
 * Pre-flight check for magic-link send: the real gate
 * (databaseHooks.user.create.before in lib/auth.ts) only rejects an unknown
 * email once the link is clicked, so this lets the form reject it upfront.
 */
export async function canSignInByEmail(email: string): Promise<boolean> {
  if (env.ALLOW_PUBLIC_SIGNUP) {
    return true;
  }

  const normalized = email.trim().toLowerCase();
  if (
    env.INITIAL_ADMIN_EMAIL &&
    normalized === env.INITIAL_ADMIN_EMAIL.toLowerCase()
  ) {
    return true;
  }

  const [existing] = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.email, normalized))
    .limit(1);
  return !!existing;
}
