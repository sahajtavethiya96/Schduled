import { eq } from "drizzle-orm";
import { videoConnection } from "@/db/schema";
import { db } from "@/lib/db";
import { decrypt, encrypt } from "@/lib/encrypt";
import { getAppUrl } from "@/lib/get-app-url";
import {
  getZoomOAuthSettings,
  isZoomOAuthConfigured,
} from "@/lib/integration-settings";

type VideoConnectionRow = typeof videoConnection.$inferSelect;

const ZOOM_OAUTH_BASE = "https://zoom.us/oauth";
const ZOOM_API_BASE = "https://api.zoom.us/v2";

// Scope required to create scheduled meetings on the host's behalf.
// Zoom's "General App" type uses granular scopes — `meeting:write:meeting`
// is the granular replacement for the classic `meeting:write`.
const ZOOM_SCOPES = ["meeting:write:meeting"];

export { isZoomOAuthConfigured as zoomConfigured };

export function zoomRedirectUri(): string {
  return `${getAppUrl()}/api/integrations/zoom/callback`;
}

/** Build the Zoom authorization URL the host is redirected to. Every call
 * site already guards with `zoomConfigured()` first, so this throws rather
 * than building a URL with an undefined client_id. */
export async function getZoomAuthUrl(state: string): Promise<string> {
  const settings = await getZoomOAuthSettings();
  if (!settings) {
    throw new Error("Zoom OAuth is not configured");
  }
  const params = new URLSearchParams({
    response_type: "code",
    client_id: settings.clientId,
    redirect_uri: zoomRedirectUri(),
    state,
    scope: ZOOM_SCOPES.join(" "),
  });
  return `${ZOOM_OAUTH_BASE}/authorize?${params.toString()}`;
}

async function basicAuthHeader(): Promise<string> {
  const settings = await getZoomOAuthSettings();
  if (!settings) {
    throw new Error("Zoom OAuth is not configured");
  }
  const raw = `${settings.clientId}:${settings.clientSecret}`;
  return `Basic ${Buffer.from(raw).toString("base64")}`;
}

interface ZoomTokenResponse {
  access_token: string;
  expires_in: number; // seconds
  refresh_token: string;
}

/** Exchange the OAuth authorization code for access + refresh tokens. */
export async function exchangeZoomCode(
  code: string
): Promise<ZoomTokenResponse> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: zoomRedirectUri(),
  });

  const res = await fetch(`${ZOOM_OAUTH_BASE}/token`, {
    method: "POST",
    headers: {
      Authorization: await basicAuthHeader(),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  if (!res.ok) {
    throw new Error(
      `Zoom token exchange failed: ${res.status} ${await res.text()}`
    );
  }
  return (await res.json()) as ZoomTokenResponse;
}

async function refreshZoomToken(
  refreshToken: string
): Promise<ZoomTokenResponse> {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });

  const res = await fetch(`${ZOOM_OAUTH_BASE}/token`, {
    method: "POST",
    headers: {
      Authorization: await basicAuthHeader(),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  if (!res.ok) {
    throw new Error(
      `Zoom token refresh failed: ${res.status} ${await res.text()}`
    );
  }
  return (await res.json()) as ZoomTokenResponse;
}

/** Fetch the connected Zoom user's id + email (used at connect time). */
export async function getZoomUser(
  accessToken: string
): Promise<{ id: string; email: string }> {
  const res = await fetch(`${ZOOM_API_BASE}/users/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    throw new Error(
      `Zoom user fetch failed: ${res.status} ${await res.text()}`
    );
  }
  const data = (await res.json()) as { id: string; email: string };
  return { id: data.id, email: data.email };
}

/**
 * Returns a valid Zoom access token for the connection, refreshing and
 * persisting the rotated tokens if the current one is within 5 minutes of
 * expiry. Zoom rotates the refresh token on every refresh, so we always
 * persist the new pair.
 */
export async function getValidZoomAccessToken(
  conn: VideoConnectionRow
): Promise<string> {
  const accessToken = await decrypt(conn.accessToken);
  const refreshToken = conn.refreshToken
    ? await decrypt(conn.refreshToken)
    : null;

  const fiveMinutesFromNow = new Date(Date.now() + 5 * 60 * 1000);
  const needsRefresh = conn.tokenExpiresAt
    ? conn.tokenExpiresAt < fiveMinutesFromNow
    : false;

  if (!(needsRefresh && refreshToken)) {
    return accessToken;
  }

  const tokens = await refreshZoomToken(refreshToken);
  const encryptedAccess = await encrypt(tokens.access_token);
  const encryptedRefresh = await encrypt(tokens.refresh_token);
  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

  await db
    .update(videoConnection)
    .set({
      accessToken: encryptedAccess,
      refreshToken: encryptedRefresh,
      tokenExpiresAt: expiresAt,
    })
    .where(eq(videoConnection.id, conn.id));

  return tokens.access_token;
}

export interface CreateZoomMeetingInput {
  agenda?: string;
  durationMinutes: number;
  startTimeIso: string; // ISO 8601 UTC
  timezone: string;
  topic: string;
}

export interface ZoomMeetingResult {
  joinUrl: string; // for the invitee
  meetingId: string;
  password: string | null;
  startUrl: string; // for the host
}

/** Create a scheduled Zoom meeting on behalf of the connected host. */
export async function createZoomMeeting(
  accessToken: string,
  input: CreateZoomMeetingInput
): Promise<ZoomMeetingResult> {
  const res = await fetch(`${ZOOM_API_BASE}/users/me/meetings`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      topic: input.topic,
      type: 2, // scheduled meeting
      start_time: input.startTimeIso,
      duration: input.durationMinutes,
      timezone: input.timezone,
      agenda: input.agenda,
      settings: {
        join_before_host: true,
        waiting_room: false,
      },
    }),
  });

  if (!res.ok) {
    throw new Error(
      `Zoom meeting create failed: ${res.status} ${await res.text()}`
    );
  }

  const data = (await res.json()) as {
    id: number;
    join_url: string;
    password?: string;
    start_url: string;
  };

  return {
    joinUrl: data.join_url,
    startUrl: data.start_url,
    meetingId: String(data.id),
    password: data.password || null,
  };
}
