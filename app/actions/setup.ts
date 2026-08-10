"use server";

import { eq, ne } from "drizzle-orm";
import { ADMIN_ROLE } from "@/config/platform";
import { user } from "@/db/schema";
import { audit } from "@/lib/audit";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { passwordComplexityError } from "@/lib/password";

type ActionResult<T = Record<never, never>> =
  | { error: string }
  | ({ ok: true } & T);

export async function createFirstAdmin(data: {
  name: string;
  email: string;
  password: string;
}): Promise<ActionResult> {
  try {
    // Check if any user exists
    const [existing] = await db.select({ id: user.id }).from(user).limit(1);

    if (existing) {
      return { error: "An admin account already exists." };
    }

    // Validate inputs
    const name = data.name.trim();
    const email = data.email.trim().toLowerCase();
    const password = data.password.trim();

    if (!name || name.length < 1) {
      return { error: "Full name is required." };
    }
    if (name.length > 128) {
      return { error: "Full name is too long (max 128 characters)." };
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return { error: "Enter a valid email address." };
    }

    const complexityError = passwordComplexityError(password);
    if (complexityError) {
      return { error: complexityError };
    }

    // Create admin user using Better Auth's sign-up
    const result = await auth.api.signUpEmail({
      body: {
        email,
        password,
        name,
      },
    });

    if (!result?.user?.id) {
      return { error: "Failed to create user account." };
    }

    const adminId = result.user.id;

    // Re-check + promote atomically: if a concurrent submission (double
    // form-submit, two tabs) already created a different user first, this
    // account isn't the legitimate first admin — delete it rather than
    // leaving two admins. Wrapping in a transaction also means a failure
    // partway through can't strand a non-admin user behind a gated /setup:
    // the catch block below deletes the just-created account so setup stays
    // retryable.
    let promoted: boolean;
    try {
      promoted = await db.transaction(async (tx) => {
        const others = await tx
          .select({ id: user.id })
          .from(user)
          .where(ne(user.id, adminId));

        if (others.length > 0) {
          await tx.delete(user).where(eq(user.id, adminId));
          return false;
        }

        await tx
          .update(user)
          .set({ role: ADMIN_ROLE, updatedAt: new Date() })
          .where(eq(user.id, adminId));
        return true;
      });
    } catch (err) {
      console.error(
        "[setup] createFirstAdmin: promotion failed, rolling back",
        err
      );
      await db
        .delete(user)
        .where(eq(user.id, adminId))
        .catch(() => {});
      return {
        error: "Something went wrong finishing setup. Please try again.",
      };
    }

    if (!promoted) {
      return {
        error: "An admin account already exists. Refresh and sign in instead.",
      };
    }

    await audit({
      action: "user.created_as_admin",
      actorId: adminId,
      actorEmail: email,
      entityType: "user",
      entityId: adminId,
      description: "First admin account created during setup",
    });

    return { ok: true };
  } catch (err) {
    console.error("[setup] createFirstAdmin", err);
    return { error: "Something went wrong. Please try again." };
  }
}
