import { inArray } from "drizzle-orm";
import { appSetting } from "@/db/schema";
import { db } from "@/lib/db";

export interface StoredBranding {
  appName: string | null;
  brandColor: string | null;
  logoUrl: string | null;
  supportEmail: string | null;
}

const KEYS = {
  appName: "branding.app_name",
  logoUrl: "branding.logo_url",
  brandColor: "branding.brand_color",
  supportEmail: "branding.support_email",
} as const;

const ALL_KEYS = Object.values(KEYS);

const EMPTY: StoredBranding = {
  appName: null,
  logoUrl: null,
  brandColor: null,
  supportEmail: null,
};

// Short-lived process cache — emails render in the worker process, which can
// run for days between deploys, so branding reads can't be a one-time module
// const (an admin's change would never take effect). Mirrors
// lib/settings/sign-in-methods.ts's TTL cache.
let cache: { value: StoredBranding; at: number } | null = null;
const TTL_MS = 15_000;

export function invalidateBrandingCache() {
  cache = null;
}

/** Admin-stored branding overrides. Any field is null if never set (falls through to env/default). */
export async function getStoredBranding(): Promise<StoredBranding> {
  const current = Date.now();
  if (cache && current - cache.at < TTL_MS) {
    return cache.value;
  }

  const rows = await db
    .select({ key: appSetting.key, value: appSetting.value })
    .from(appSetting)
    .where(inArray(appSetting.key, ALL_KEYS));

  const stored = new Map(rows.map((r) => [r.key, r.value]));
  const read = (key: string) => {
    const v = stored.get(key);
    return v && v.trim() !== "" ? v : null;
  };

  const value: StoredBranding = {
    appName: read(KEYS.appName),
    logoUrl: read(KEYS.logoUrl),
    brandColor: read(KEYS.brandColor),
    supportEmail: read(KEYS.supportEmail),
  };
  cache = { value, at: current };
  return value;
}

/** Persist branding overrides. An empty string clears that field back to the env/default fallback. */
export async function setStoredBranding(next: StoredBranding): Promise<void> {
  const rows: { key: string; value: string }[] = [
    { key: KEYS.appName, value: next.appName?.trim() ?? "" },
    { key: KEYS.logoUrl, value: next.logoUrl?.trim() ?? "" },
    { key: KEYS.brandColor, value: next.brandColor?.trim() ?? "" },
    { key: KEYS.supportEmail, value: next.supportEmail?.trim() ?? "" },
  ];

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
  invalidateBrandingCache();
}

export { EMPTY as emptyBranding };
