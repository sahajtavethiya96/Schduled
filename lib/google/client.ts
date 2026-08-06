import { google } from "googleapis";
import { getAppUrl } from "@/lib/get-app-url";
import {
  getGoogleOAuthSettings,
  isGoogleOAuthConfigured,
} from "@/lib/integration-settings";

export { isGoogleOAuthConfigured as googleCalendarConfigured };

export function googleRedirectUri(): string {
  return `${getAppUrl()}/api/integrations/google/callback`;
}

/** Shared OAuth2 client builder — every Google Calendar OAuth call site
 * (connect route, callback route, worker token refresh) must use this
 * instead of constructing its own, so the redirect_uri registered with
 * Google is always built the same way. Every call site already guards with
 * `googleCalendarConfigured()`/`isGoogleOAuthConfigured()` first, so this
 * throws rather than returning a client built from undefined credentials. */
export async function createGoogleOAuthClient() {
  const settings = await getGoogleOAuthSettings();
  if (!settings) {
    throw new Error("Google OAuth is not configured");
  }
  return new google.auth.OAuth2(
    settings.clientId,
    settings.clientSecret,
    googleRedirectUri()
  );
}
