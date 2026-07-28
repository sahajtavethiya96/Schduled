"use server";

import { revalidatePath } from "next/cache";
import { audit } from "@/lib/audit";
import { requireAdmin } from "@/lib/authz";
import {
  type SignInMethods,
  getStoredSignInMethods,
  setSignInMethods,
  signInMethodAvailability,
} from "@/lib/settings/sign-in-methods";
import {
  type StoredBranding,
  getStoredBranding,
  setStoredBranding,
} from "@/lib/settings/branding";

type ActionResult = { error: string } | { ok: true };

export async function updateSignInMethodsAction(
  next: SignInMethods
): Promise<ActionResult> {
  const admin = await requireAdmin();

  const previous = await getStoredSignInMethods();

  // The toggles only govern methods the deployment can actually offer. For an
  // unavailable method, preserve the stored intent instead of forcing it off —
  // so enabling it in the env later (e.g. adding Google OAuth creds) restores
  // the admin's earlier choice rather than silently leaving it disabled.
  const nextStored: SignInMethods = {
    password: signInMethodAvailability.password ? next.password : previous.password,
    magicLink: signInMethodAvailability.magicLink ? next.magicLink : previous.magicLink,
    google: signInMethodAvailability.google ? next.google : previous.google,
  };

  // At least one *effective* method (available AND enabled) must remain, or the
  // deployment would have no working way to sign in.
  const anyEffective =
    (signInMethodAvailability.password && nextStored.password) ||
    (signInMethodAvailability.magicLink && nextStored.magicLink) ||
    (signInMethodAvailability.google && nextStored.google);
  if (!anyEffective) {
    return { error: "At least one sign-in method must stay enabled." };
  }

  await setSignInMethods(nextStored);

  await audit({
    action: "settings.signin_methods_updated",
    actorEmail: admin.user.email,
    actorId: admin.user.id,
    description: `Sign-in methods updated — password: ${nextStored.password}, magic link: ${nextStored.magicLink}, Google: ${nextStored.google}`,
    entityType: "setting",
    metadata: { previous, next: nextStored },
  });

  revalidatePath("/settings/platform");
  return { ok: true };
}

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

export async function updateBrandingAction(
  next: StoredBranding
): Promise<ActionResult> {
  const admin = await requireAdmin();

  if (next.brandColor && !HEX_COLOR.test(next.brandColor)) {
    return { error: "Brand color must be a hex value like #0D9488." };
  }
  if (next.supportEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(next.supportEmail)) {
    return { error: "Support email address doesn't look valid." };
  }

  const previous = await getStoredBranding();
  await setStoredBranding(next);

  await audit({
    action: "settings.branding_updated",
    actorEmail: admin.user.email,
    actorId: admin.user.id,
    description: `Email branding updated — app name: ${next.appName || "(default)"}`,
    entityType: "setting",
    metadata: { previous, next },
  });

  revalidatePath("/settings/platform");
  return { ok: true };
}
