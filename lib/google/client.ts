import { google } from "googleapis";
import { env } from "@/lib/env";
import { getAppUrl } from "@/lib/get-app-url";

export function googleCalendarConfigured(): boolean {
  return !!(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);
}

export function googleRedirectUri(): string {
  return `${getAppUrl()}/api/integrations/google/callback`;
}

/** Shared OAuth2 client builder — every Google Calendar OAuth call site
 * (connect route, callback route, worker token refresh) must use this
 * instead of constructing its own, so the redirect_uri registered with
 * Google is always built the same way. */
export function createGoogleOAuthClient() {
  return new google.auth.OAuth2(
    env.GOOGLE_CLIENT_ID,
    env.GOOGLE_CLIENT_SECRET,
    googleRedirectUri()
  );
}
