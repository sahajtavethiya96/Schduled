import "server-only";

import { redirect } from "next/navigation";
import { user } from "@/db/schema";
import { db } from "@/lib/db";

/** Check if any user exists in the system. */
export async function hasAnyUser(): Promise<boolean> {
  const [row] = await db.select({ id: user.id }).from(user).limit(1);
  return !!row;
}

/**
 * Call at the top of every unauthenticated entry-point page. On a brand-new
 * instance with zero users, this is the only thing routing a first-time
 * visitor to /setup — nothing else links to it.
 */
export async function redirectToSetupIfNeeded(): Promise<void> {
  if (!(await hasAnyUser())) {
    redirect("/setup");
  }
}
