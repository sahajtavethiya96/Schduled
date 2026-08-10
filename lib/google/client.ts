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

/** Shared OAuth2 client builder so redirect_uri stays consistent across call
 * sites. Throws rather than building from undefined credentials — callers
 * must check isGoogleOAuthConfigured() first. */
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
