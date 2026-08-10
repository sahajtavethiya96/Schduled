import { PRODUCT_NAME } from "@/config/platform";
import { env } from "@/lib/env";
import { getAppUrl } from "@/lib/get-app-url";
import { getStoredBranding } from "@/lib/settings/branding";

const DEFAULT_BRAND_COLOR = "#0D9488";
const DEFAULT_LOGO_PATH = "/email-logo.png";
const DEFAULT_LOGO_PATH_WHITE = "/email-logo-white.png";

/**
 * Resolution order per field: admin-set value (Settings → Platform →
 * Branding) → env var override → built-in Schduled default.
 *
 * The logo only falls back to Schduled's bundled image when the product
 * name is still "Schduled" and no admin override is set — a renamed,
 * unbranded instance gets a text-only header instead of Schduled's mark.
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
 * Checks the admin-editable DB setting first (short TTL cache). Call once
 * per email template and pass the result down — don't read at module scope,
 * since the long-running worker process would never see a later admin change.
 */
export async function getEmailBranding(): Promise<EmailBranding> {
  const stored = await getStoredBranding();
  return build(stored);
}

/**
 * Env/default-only branding, synchronous — a prop *default* so components
 * still render if `branding` isn't passed. Actual sends should use
 * `getEmailBranding()` above instead, so admin overrides apply.
 */
export const emailBranding: EmailBranding = build({
  appName: null,
  logoUrl: null,
  brandColor: null,
  supportEmail: null,
});
