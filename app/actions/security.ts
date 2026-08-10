"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { bookingBlocklist, eventType } from "@/db/schema";
import { requireSession } from "@/lib/authz";
import { db } from "@/lib/db";

type ActionResult = { error: string } | { ok: true };

export async function toggleEmailVerification(
  id: string,
  value: boolean
): Promise<ActionResult> {
  try {
    const session = await requireSession();
    const [et] = await db
      .select({ id: eventType.id })
      .from(eventType)
      .where(and(eq(eventType.id, id), eq(eventType.userId, session.user.id)))
      .limit(1);
    if (!et) {
      return { error: "Meeting type not found" };
    }

    await db
      .update(eventType)
      .set({ requiresEmailVerification: value, updatedAt: new Date() })
      .where(eq(eventType.id, id));

    revalidatePath("/profile/security");
    return { ok: true };
  } catch (err) {
    console.error("[security] toggleEmailVerification", err);
    return { error: "Something went wrong. Please try again." };
  }
}

export async function addBlocklistEntry(
  pattern: string,
  type: "email" | "domain",
  note?: string
): Promise<ActionResult> {
  try {
    const session = await requireSession();

    const normalized = pattern.trim().toLowerCase();
    if (!normalized) {
      return { error: "Pattern is required" };
    }

    if (type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
      return { error: "Invalid email address" };
    }
    if (type === "domain" && !/^[a-z0-9.-]+\.[a-z]{2,}$/.test(normalized)) {
      return { error: "Invalid domain (e.g. example.com)" };
    }

    const existing = await db
      .select({ id: bookingBlocklist.id })
      .from(bookingBlocklist)
      .where(
        and(
          eq(bookingBlocklist.userId, session.user.id),
          eq(bookingBlocklist.pattern, normalized)
        )
      )
      .limit(1);
    if (existing.length > 0) {
      return { error: "This pattern is already blocked" };
    }

    await db.insert(bookingBlocklist).values({
      userId: session.user.id,
      pattern: normalized,
      type,
      note: note?.trim() || null,
    });

    revalidatePath("/profile/security");
    return { ok: true };
  } catch (err) {
    console.error("[security] addBlocklistEntry", err);
    return { error: "Something went wrong. Please try again." };
  }
}

export async function removeBlocklistEntry(id: string): Promise<ActionResult> {
  try {
    const session = await requireSession();
    await db
      .delete(bookingBlocklist)
      .where(
        and(
          eq(bookingBlocklist.id, id),
          eq(bookingBlocklist.userId, session.user.id)
        )
      );

    revalidatePath("/profile/security");
    return { ok: true };
  } catch (err) {
    console.error("[security] removeBlocklistEntry", err);
    return { error: "Something went wrong. Please try again." };
  }
}
