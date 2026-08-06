import { eq } from "drizzle-orm";
import { integrationSetting } from "@/db/schema";
import { db } from "@/lib/db";
import { decrypt } from "@/lib/encrypt";
import { env } from "@/lib/env";

type IntegrationSettingRow = typeof integrationSetting.$inferSelect;

// Short-lived process cache, not a per-request one (React's cache() would be
// a no-op or worse outside a request context) — these getters are read from
// the pg-boss worker process too (SMTP send, Zoom meeting creation), which is
// long-running and has no per-request boundary. Mirrors
// lib/settings/branding.ts / lib/settings/sign-in-methods.ts's identical
// pattern. Writes call invalidateIntegrationSettingsCache().
let rowCache: { value: IntegrationSettingRow | undefined; at: number } | null =
  null;
const TTL_MS = 15_000;

export function invalidateIntegrationSettingsCache() {
  rowCache = null;
}

async function getRow(): Promise<IntegrationSettingRow | undefined> {
  const now = Date.now();
  if (rowCache && now - rowCache.at < TTL_MS) {
    return rowCache.value;
  }

  const [row] = await db
    .select()
    .from(integrationSetting)
    .where(eq(integrationSetting.id, "default"))
    .limit(1);
  rowCache = { value: row, at: now };
  return row;
}

function nonEmpty(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function isPlaceholderHost(host: string) {
  return /(^|\.)example\.(com|org|net)$/i.test(host.trim());
}

async function decryptOrUndefined(
  value: string | null | undefined
): Promise<string | undefined> {
  return value ? decrypt(value) : undefined;
}

export interface SmtpSettings {
  from: string;
  host: string;
  pass: string;
  port: number;
  secure: boolean;
  user: string;
  webhookSecret?: string;
}

export async function getSmtpSettings(): Promise<SmtpSettings | null> {
  const row = await getRow();

  const host = nonEmpty(row?.smtpHost) ?? env.SMTP_HOST;
  const user = nonEmpty(row?.smtpUser) ?? env.SMTP_USER;
  const from = nonEmpty(row?.emailFrom) ?? env.EMAIL_FROM;
  const pass =
    (await decryptOrUndefined(row?.smtpPassEncrypted)) ?? env.SMTP_PASS;

  if (!(host && !isPlaceholderHost(host) && user && pass && from)) {
    return null;
  }

  const port = row?.smtpPort ?? env.SMTP_PORT ?? 587;
  const secure = row?.smtpSecure ?? env.SMTP_SECURE ?? port === 465;
  const webhookSecret =
    (await decryptOrUndefined(row?.emailWebhookSecretEncrypted)) ??
    env.EMAIL_WEBHOOK_SECRET;

  return { host, port, secure, user, pass, from, webhookSecret };
}

export async function isSmtpConfigured(): Promise<boolean> {
  return (await getSmtpSettings()) !== null;
}

export interface GoogleOAuthSettings {
  clientId: string;
  clientSecret: string;
}

export async function getGoogleOAuthSettings(): Promise<GoogleOAuthSettings | null> {
  const row = await getRow();

  const clientId = nonEmpty(row?.googleClientId) ?? env.GOOGLE_CLIENT_ID;
  const clientSecret =
    (await decryptOrUndefined(row?.googleClientSecretEncrypted)) ??
    env.GOOGLE_CLIENT_SECRET;

  if (!(clientId && clientSecret)) {
    return null;
  }
  return { clientId, clientSecret };
}

export async function isGoogleOAuthConfigured(): Promise<boolean> {
  return (await getGoogleOAuthSettings()) !== null;
}

export interface ZoomOAuthSettings {
  clientId: string;
  clientSecret: string;
}

export async function getZoomOAuthSettings(): Promise<ZoomOAuthSettings | null> {
  const row = await getRow();

  const clientId = nonEmpty(row?.zoomClientId) ?? env.ZOOM_CLIENT_ID;
  const clientSecret =
    (await decryptOrUndefined(row?.zoomClientSecretEncrypted)) ??
    env.ZOOM_CLIENT_SECRET;

  if (!(clientId && clientSecret)) {
    return null;
  }
  return { clientId, clientSecret };
}

export async function isZoomOAuthConfigured(): Promise<boolean> {
  return (await getZoomOAuthSettings()) !== null;
}

export type StorageSettings =
  | { driver: "local" }
  | {
      accessKeyId?: string;
      bucket: string;
      driver: "s3";
      endpoint?: string;
      publicBaseUrl?: string;
      region?: string;
      secretAccessKey?: string;
    }
  | {
      accessKeyId?: string;
      accountId: string;
      bucket: string;
      driver: "r2";
      publicBaseUrl?: string;
      secretAccessKey?: string;
    };

export async function getStorageSettings(): Promise<StorageSettings> {
  const row = await getRow();
  const driver =
    (nonEmpty(row?.storageDriver) as "local" | "s3" | "r2" | undefined) ??
    env.STORAGE_DRIVER;
  const publicBaseUrl =
    nonEmpty(row?.storagePublicBaseUrl) ?? env.STORAGE_PUBLIC_BASE_URL;

  if (driver === "s3") {
    const bucket = nonEmpty(row?.s3Bucket) ?? env.S3_BUCKET;
    // No usable bucket configured either place — fall back to local rather
    // than handing storage.ts a driver it can't actually build a client for.
    if (!bucket) {
      return { driver: "local" };
    }
    return {
      driver: "s3",
      bucket,
      region: nonEmpty(row?.s3Region) ?? env.S3_REGION,
      endpoint: nonEmpty(row?.s3Endpoint) ?? env.S3_ENDPOINT,
      accessKeyId: nonEmpty(row?.s3AccessKeyId) ?? env.S3_ACCESS_KEY_ID,
      secretAccessKey:
        (await decryptOrUndefined(row?.s3SecretAccessKeyEncrypted)) ??
        env.S3_SECRET_ACCESS_KEY,
      publicBaseUrl,
    };
  }

  if (driver === "r2") {
    const bucket = nonEmpty(row?.r2Bucket) ?? env.R2_BUCKET;
    const accountId = nonEmpty(row?.r2AccountId) ?? env.R2_ACCOUNT_ID;
    if (!(bucket && accountId)) {
      return { driver: "local" };
    }
    return {
      driver: "r2",
      bucket,
      accountId,
      accessKeyId: nonEmpty(row?.r2AccessKeyId) ?? env.R2_ACCESS_KEY_ID,
      secretAccessKey:
        (await decryptOrUndefined(row?.r2SecretAccessKeyEncrypted)) ??
        env.R2_SECRET_ACCESS_KEY,
      publicBaseUrl,
    };
  }

  return { driver: "local" };
}

export interface IntegrationSettingsSummary {
  google: { clientId: string; hasClientSecret: boolean };
  smtp: {
    from: string;
    hasPass: boolean;
    hasWebhookSecret: boolean;
    host: string;
    port: number | null;
    secure: boolean | null;
    user: string;
  };
  storage: {
    driver: "local" | "s3" | "r2" | "";
    hasR2SecretAccessKey: boolean;
    hasS3SecretAccessKey: boolean;
    publicBaseUrl: string;
    r2AccessKeyId: string;
    r2AccountId: string;
    r2Bucket: string;
    s3AccessKeyId: string;
    s3Bucket: string;
    s3Endpoint: string;
    s3Region: string;
  };
  zoom: { clientId: string; hasClientSecret: boolean };
}

/**
 * DB-only (no env fallback) — used to prefill the admin settings forms and
 * the setup wizard. Secrets are represented only as `has<Field>` booleans,
 * never returned in plaintext to the client. An env-only-configured field
 * intentionally shows blank here rather than being echoed back — otherwise
 * re-saving the form would write the env value into the DB as if the admin
 * had explicitly chosen it.
 */
export async function getIntegrationSettingsSummary(): Promise<IntegrationSettingsSummary> {
  const row = await getRow();
  return {
    smtp: {
      host: row?.smtpHost ?? "",
      port: row?.smtpPort ?? null,
      secure: row?.smtpSecure ?? null,
      user: row?.smtpUser ?? "",
      from: row?.emailFrom ?? "",
      hasPass: !!row?.smtpPassEncrypted,
      hasWebhookSecret: !!row?.emailWebhookSecretEncrypted,
    },
    google: {
      clientId: row?.googleClientId ?? "",
      hasClientSecret: !!row?.googleClientSecretEncrypted,
    },
    zoom: {
      clientId: row?.zoomClientId ?? "",
      hasClientSecret: !!row?.zoomClientSecretEncrypted,
    },
    storage: {
      driver: (row?.storageDriver as "local" | "s3" | "r2" | null) ?? "",
      s3Endpoint: row?.s3Endpoint ?? "",
      s3Region: row?.s3Region ?? "",
      s3Bucket: row?.s3Bucket ?? "",
      s3AccessKeyId: row?.s3AccessKeyId ?? "",
      hasS3SecretAccessKey: !!row?.s3SecretAccessKeyEncrypted,
      r2Bucket: row?.r2Bucket ?? "",
      r2AccountId: row?.r2AccountId ?? "",
      r2AccessKeyId: row?.r2AccessKeyId ?? "",
      hasR2SecretAccessKey: !!row?.r2SecretAccessKeyEncrypted,
      publicBaseUrl: row?.storagePublicBaseUrl ?? "",
    },
  };
}
