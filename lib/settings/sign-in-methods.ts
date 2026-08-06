import { inArray } from "drizzle-orm";
import { appSetting } from "@/db/schema";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import {
  isGoogleOAuthConfigured,
  isSmtpConfigured,
} from "@/lib/integration-settings";

export interface SignInMethods {
  google: boolean;
  magicLink: boolean;
  password: boolean;
}

const KEYS = {
  password: "signin.password",
  magicLink: "signin.magic_link",
  google: "signin.google",
} as const;

const ALL_KEYS = [KEYS.password, KEYS.magicLink, KEYS.google];

// Availability ("ceiling"): a method the deployment can't physically offer
// can never be turned on, regardless of the admin's stored preference.
//  - password: hard-disabled only if the operator sets the env flag off
//  - google: needs OAuth credentials (DB-configured or env, see
//    lib/integration-settings.ts)
//  - magic link: needs SMTP to actually deliver, so it's only offered in
//    production when SMTP is configured. In development the console fallback
//    makes it usable, so it stays available for local testing.
// Functions, not module-scope consts: SMTP/Google can now be configured via
// the DB (Settings → Services), which a frozen-at-import const would never
// see without a restart.
export const passwordAvailable = env.NEXT_PUBLIC_PASSWORD_AUTH_ENABLED;

export async function getSignInMethodAvailability(): Promise<SignInMethods> {
  const [smtp, google] = await Promise.all([
    isSmtpConfigured(),
    isGoogleOAuthConfigured(),
  ]);
  return {
    password: passwordAvailable,
    magicLink: smtp || env.NODE_ENV !== "production",
    google,
  };
}

// Short-lived process cache so the Better Auth `before` hook (which runs on
// every auth request) doesn't hit the DB each time. Writes invalidate it, and
// the TTL bounds how long a change takes to propagate across web replicas.
let cache: { value: SignInMethods; at: number } | null = null;
const TTL_MS = 15_000;

export function invalidateSignInMethodsCache() {
  cache = null;
}

/** Raw admin-stored intent — defaults every method to true when unset. */
export async function getStoredSignInMethods(): Promise<SignInMethods> {
  const current = Date.now();
  if (cache && current - cache.at < TTL_MS) {
    return cache.value;
  }

  const rows = await db
    .select({ key: appSetting.key, value: appSetting.value })
    .from(appSetting)
    .where(inArray(appSetting.key, ALL_KEYS));

  const stored = new Map(rows.map((r) => [r.key, r.value]));
  // Absent row → default on; only an explicit "false" disables.
  const read = (key: string) => stored.get(key) !== "false";

  const value: SignInMethods = {
    password: read(KEYS.password),
    magicLink: read(KEYS.magicLink),
    google: read(KEYS.google),
  };
  cache = { value, at: current };
  return value;
}

/**
 * What's actually offered = admin intent ∧ availability, with a hard floor:
 * if a stored preference leaves no *available* method on (e.g. the admin chose
 * Google-only and the operator later removed the OAuth creds), fall back to
 * every available method so a login page can never end up with zero options.
 * Availability's `magicLink` is true in dev, so the floor always yields ≥ 1.
 */
export async function getEffectiveSignInMethods(): Promise<SignInMethods> {
  const [stored, availability] = await Promise.all([
    getStoredSignInMethods(),
    getSignInMethodAvailability(),
  ]);
  const effective: SignInMethods = {
    password: stored.password && availability.password,
    magicLink: stored.magicLink && availability.magicLink,
    google: stored.google && availability.google,
  };
  if (!effective.password && !effective.magicLink && !effective.google) {
    return availability;
  }
  return effective;
}

export async function setSignInMethods(next: SignInMethods): Promise<void> {
  const rows = [
    { key: KEYS.password, value: next.password ? "true" : "false" },
    { key: KEYS.magicLink, value: next.magicLink ? "true" : "false" },
    { key: KEYS.google, value: next.google ? "true" : "false" },
  ];

  // One transaction so the three keys never persist in a mixed state.
  await db.transaction(async (tx) => {
    for (const row of rows) {
      await tx
        .insert(appSetting)
        .values({ key: row.key, value: row.value, updatedAt: new Date() })
        .onConflictDoUpdate({
          target: appSetting.key,
          set: { value: row.value, updatedAt: new Date() },
        });
    }
  });
  invalidateSignInMethodsCache();
}
