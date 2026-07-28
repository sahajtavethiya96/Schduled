import { PRODUCT_NAME } from "@/config/platform";
import { env } from "@/lib/env";
import { getAppUrl } from "@/lib/get-app-url";
import { getStoredBranding } from "@/lib/settings/branding";

const DEFAULT_BRAND_COLOR = "#0D9488";
const DEFAULT_LOGO_PATH = "/email-logo.png";
const DEFAULT_LOGO_PATH_WHITE = "/email-logo-white.png";

/**
 * Every email template's branding — name, logo, accent color, support
 * address. Resolution order per field: admin-set value (Settings →
 * Platform → Branding, stored in `app_setting`) → env var override → the
 * built-in Schduled default.
 *
 * The logo specifically only falls back to Schduled's own bundled image when
 * NEXT_PUBLIC_PRODUCT_NAME is still at its default ("Schduled") and no admin
 * override is stored — a self-hoster who renames the product but never sets
 * a logo gets a text-only header instead of Schduled's logo, so a rebranded
 * instance never accidentally displays someone else's brand mark.
 */
export interface EmailBranding {
  appName: string;
  brandColor: string;
  /** Absolute URL to a logo suited for a light/neutral header, or null to render name-only. */
  logoUrl: string | null;
  /** Absolute URL to a logo suited for a solid-color (teal) header, or null to render name-only. */
  logoUrlWhite: string | null;
  supportEmail: string | null;
}

function resolveLogo(
  customUrl: string | null,
  appName: string,
  defaultPath: string
): string | null {
  if (customUrl) {
    return customUrl;
  }
  if (appName === "Schduled") {
    return `${getAppUrl()}${defaultPath}`;
  }
  return null;
}

function build(stored: {
  appName: string | null;
  logoUrl: string | null;
  brandColor: string | null;
  supportEmail: string | null;
}): EmailBranding {
  const appName = stored.appName || PRODUCT_NAME;
  const logoUrl = stored.logoUrl || env.NEXT_PUBLIC_LOGO_URL || null;
  return {
    appName,
    brandColor:
      stored.brandColor ||
      env.NEXT_PUBLIC_EMAIL_BRAND_COLOR ||
      DEFAULT_BRAND_COLOR,
    logoUrl: resolveLogo(logoUrl, appName, DEFAULT_LOGO_PATH),
    logoUrlWhite: resolveLogo(logoUrl, appName, DEFAULT_LOGO_PATH_WHITE),
    supportEmail:
      stored.supportEmail || env.NEXT_PUBLIC_EMAIL_SUPPORT_ADDRESS || null,
  };
}

/**
 * The live branding for composing an email — checks the admin-editable DB
 * setting (short TTL cache, see lib/settings/branding.ts) first. Call this
 * once per email template function and pass the result down as a prop;
 * don't read it at module scope, since the worker process can run for days
 * between deploys and a module-level const would never see an admin's change.
 */
export async function getEmailBranding(): Promise<EmailBranding> {
  const stored = await getStoredBranding();
  return build(stored);
}

/**
 * Env/default-only branding, synchronous — used solely as a prop *default*
 * for components so they still render sensibly if a caller forgets to pass
 * `branding` explicitly. Every actual email-sending code path should use
 * `getEmailBranding()` above instead, so admin-set overrides apply.
 */
export const emailBranding: EmailBranding = build({
  appName: null,
  logoUrl: null,
  brandColor: null,
  supportEmail: null,
});
