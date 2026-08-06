import { and, eq } from "drizzle-orm";
import { connectedCalendar, videoConnection } from "@/db/schema";
import { db } from "@/lib/db";
import {
  getStorageSettings,
  isGoogleOAuthConfigured,
  isSmtpConfigured,
  isZoomOAuthConfigured,
} from "@/lib/integration-settings";

export interface MeetingIntegrations {
  googleConnected: boolean;
  zoomConnected: boolean;
}

/**
 * Whether the host has connected the integrations required to auto-generate
 * meeting links. Google Meet needs a connected Google Calendar; Zoom needs a
 * connected Zoom account. Used to warn in the event-type Location tab.
 */
export async function getMeetingIntegrations(
  userId: string
): Promise<MeetingIntegrations> {
  const [cal, zoom] = await Promise.all([
    db
      .select({ status: connectedCalendar.status })
      .from(connectedCalendar)
      .where(
        and(
          eq(connectedCalendar.userId, userId),
          eq(connectedCalendar.provider, "google")
        )
      )
      .limit(1)
      .then((r) => r[0]),
    db
      .select({ id: videoConnection.id })
      .from(videoConnection)
      .where(
        and(
          eq(videoConnection.userId, userId),
          eq(videoConnection.provider, "zoom")
        )
      )
      .limit(1)
      .then((r) => r[0]),
  ]);

  return {
    googleConnected: cal?.status === "connected",
    zoomConnected: !!zoom,
  };
}

export interface EnvIntegrationStatus {
  googleConfigured: boolean;
  smtpConfigured: boolean;
  storageConfigured: boolean;
  zoomConfigured: boolean;
}

/**
 * Whether each integration is set up (DB-configured, falling back to env —
 * see lib/integration-settings.ts). Shared by /settings/platform (system
 * status) and the setup wizard's "Configure services" step so both read the
 * same boolean logic. `googleConfigured` here reflects the live (DB-or-env)
 * Calendar config, not Better Auth's boot-time Sign-In state — see
 * lib/auth.ts's `googleAuthEnabled` for that.
 */
export async function getEnvIntegrationStatus(): Promise<EnvIntegrationStatus> {
  const [smtpConfigured, googleConfigured, zoomConfigured, storage] =
    await Promise.all([
      isSmtpConfigured(),
      isGoogleOAuthConfigured(),
      isZoomOAuthConfigured(),
      getStorageSettings(),
    ]);
  return {
    smtpConfigured,
    googleConfigured,
    zoomConfigured,
    storageConfigured: storage.driver !== "local",
  };
}
