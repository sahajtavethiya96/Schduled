"use server";

import { revalidatePath } from "next/cache";
import nodemailer from "nodemailer";
import { integrationSetting } from "@/db/schema";
import { audit } from "@/lib/audit";
import { requireAdmin } from "@/lib/authz";
import { db } from "@/lib/db";
import { encrypt } from "@/lib/encrypt";
import {
  getSmtpSettings,
  getStorageSettings,
  invalidateIntegrationSettingsCache,
} from "@/lib/integration-settings";
import {
  getStoredBranding,
  type StoredBranding,
  setStoredBranding,
} from "@/lib/settings/branding";
import {
  getSignInMethodAvailability,
  getStoredSignInMethods,
  type SignInMethods,
  setSignInMethods,
} from "@/lib/settings/sign-in-methods";

type ActionResult = { error: string } | { ok: true };

const ENCRYPT_KEY_MISSING_ERROR =
  "ENCRYPT_KEY is not set in your environment — set it before saving secrets here (see .env.example).";

/** Encrypts a secret for DB storage, turning a missing ENCRYPT_KEY into a
 * clean action error instead of an unhandled throw. */
async function encryptSecretOrError(
  plaintext: string
): Promise<{ value: string } | { error: string }> {
  try {
    return { value: await encrypt(plaintext) };
  } catch {
    return { error: ENCRYPT_KEY_MISSING_ERROR };
  }
}

export async function updateSignInMethodsAction(
  next: SignInMethods
): Promise<ActionResult> {
  const admin = await requireAdmin();

  const [previous, availability] = await Promise.all([
    getStoredSignInMethods(),
    getSignInMethodAvailability(),
  ]);

  // The toggles only govern methods the deployment can actually offer. For an
  // unavailable method, preserve the stored intent instead of forcing it off —
  // so enabling it later (e.g. adding Google OAuth creds) restores the
  // admin's earlier choice rather than silently leaving it disabled.
  const nextStored: SignInMethods = {
    password: availability.password ? next.password : previous.password,
    magicLink: availability.magicLink ? next.magicLink : previous.magicLink,
    google: availability.google ? next.google : previous.google,
  };

  // At least one *effective* method (available AND enabled) must remain, or the
  // deployment would have no working way to sign in.
  const anyEffective =
    (availability.password && nextStored.password) ||
    (availability.magicLink && nextStored.magicLink) ||
    (availability.google && nextStored.google);
  if (!anyEffective) {
    return { error: "At least one sign-in method must stay enabled." };
  }

  await setSignInMethods(nextStored);

  await audit({
    action: "settings.signin_methods_updated",
    actorEmail: admin.user.email,
    actorId: admin.user.id,
    description: `Sign-in methods updated — password: ${nextStored.password}, magic link: ${nextStored.magicLink}, Google: ${nextStored.google}`,
    entityType: "setting",
    metadata: { previous, next: nextStored },
  });

  revalidatePath("/settings/platform");
  return { ok: true };
}

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

export async function updateBrandingAction(
  next: StoredBranding
): Promise<ActionResult> {
  const admin = await requireAdmin();

  if (next.brandColor && !HEX_COLOR.test(next.brandColor)) {
    return { error: "Brand color must be a hex value like #0D9488." };
  }
  if (
    next.supportEmail &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(next.supportEmail)
  ) {
    return { error: "Support email address doesn't look valid." };
  }

  const previous = await getStoredBranding();
  await setStoredBranding(next);

  await audit({
    action: "settings.branding_updated",
    actorEmail: admin.user.email,
    actorId: admin.user.id,
    description: `Email branding updated — app name: ${next.appName || "(default)"}`,
    entityType: "setting",
    metadata: { previous, next },
  });

  revalidatePath("/settings/platform");
  return { ok: true };
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface SmtpSettingsInput {
  from: string;
  host: string;
  /** undefined = leave unchanged, "" = clear, non-empty = set (encrypted). */
  pass?: string;
  port: number | null;
  secure: boolean | null;
  user: string;
  /** Same tri-state as `pass`. */
  webhookSecret?: string;
}

function revalidateServicePages() {
  revalidatePath("/settings/services");
  revalidatePath("/settings/platform");
  revalidatePath("/settings/authentication");
}

export async function updateSmtpSettingsAction(
  input: SmtpSettingsInput
): Promise<ActionResult> {
  const admin = await requireAdmin();

  if (input.port !== null && (input.port < 1 || input.port > 65_535)) {
    return { error: "Port must be between 1 and 65535." };
  }
  if (input.from.trim() && !EMAIL_RE.test(input.from.trim())) {
    return { error: "From address doesn't look like a valid email." };
  }

  const set: Partial<typeof integrationSetting.$inferInsert> = {
    smtpHost: input.host.trim() || null,
    smtpPort: input.port,
    smtpSecure: input.secure,
    smtpUser: input.user.trim() || null,
    emailFrom: input.from.trim() || null,
    updatedAt: new Date(),
  };

  if (input.pass !== undefined) {
    if (input.pass === "") {
      set.smtpPassEncrypted = null;
    } else {
      const result = await encryptSecretOrError(input.pass);
      if ("error" in result) {
        return result;
      }
      set.smtpPassEncrypted = result.value;
    }
  }
  if (input.webhookSecret !== undefined) {
    if (input.webhookSecret === "") {
      set.emailWebhookSecretEncrypted = null;
    } else {
      const result = await encryptSecretOrError(input.webhookSecret);
      if ("error" in result) {
        return result;
      }
      set.emailWebhookSecretEncrypted = result.value;
    }
  }

  await db
    .insert(integrationSetting)
    .values({ id: "default", ...set })
    .onConflictDoUpdate({ target: integrationSetting.id, set });
  invalidateIntegrationSettingsCache();

  await audit({
    action: "settings.smtp_updated",
    actorEmail: admin.user.email,
    actorId: admin.user.id,
    description: `SMTP settings updated — host: ${input.host.trim() || "(env fallback)"}`,
    entityType: "setting",
  });

  revalidateServicePages();
  return { ok: true };
}

export interface SmtpTestInput {
  from?: string;
  host?: string;
  /** Blank/omitted falls back to the currently saved (DB or env) password —
   * lets "Test connection" verify an already-saved secret without the form
   * ever holding its plaintext. */
  pass?: string;
  port?: number | null;
  secure?: boolean | null;
  user?: string;
}

/** Verifies SMTP credentials without saving them or sending an email —
 * nodemailer's `verify()` opens the connection and authenticates, nothing
 * more. Fields left blank in the form fall back to the currently resolved
 * (DB-or-env) settings, so testing works whether or not the admin retyped
 * an already-saved value. */
export async function testSmtpConnectionAction(
  input: SmtpTestInput
): Promise<ActionResult> {
  await requireAdmin();

  const resolved = await getSmtpSettings();
  const host = input.host?.trim() || resolved?.host;
  const user = input.user?.trim() || resolved?.user;
  const pass = input.pass || resolved?.pass;
  const port = input.port ?? resolved?.port ?? 587;
  const secure = input.secure ?? resolved?.secure ?? port === 465;

  if (!(host && user && pass)) {
    return { error: "Host, user, and password are required to test." };
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
    connectionTimeout: 10_000,
  });

  try {
    await transporter.verify();
    return { ok: true };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Connection failed.",
    };
  }
}

export interface GoogleOAuthSettingsInput {
  clientId: string;
  /** undefined = leave unchanged, "" = clear, non-empty = set (encrypted). */
  clientSecret?: string;
}

export async function updateGoogleOAuthSettingsAction(
  input: GoogleOAuthSettingsInput
): Promise<ActionResult> {
  const admin = await requireAdmin();

  const set: Partial<typeof integrationSetting.$inferInsert> = {
    googleClientId: input.clientId.trim() || null,
    updatedAt: new Date(),
  };

  if (input.clientSecret !== undefined) {
    if (input.clientSecret === "") {
      set.googleClientSecretEncrypted = null;
    } else {
      const result = await encryptSecretOrError(input.clientSecret);
      if ("error" in result) {
        return result;
      }
      set.googleClientSecretEncrypted = result.value;
    }
  }

  await db
    .insert(integrationSetting)
    .values({ id: "default", ...set })
    .onConflictDoUpdate({ target: integrationSetting.id, set });
  invalidateIntegrationSettingsCache();

  await audit({
    action: "settings.google_oauth_updated",
    actorEmail: admin.user.email,
    actorId: admin.user.id,
    description: `Google OAuth settings updated — client ID: ${input.clientId.trim() || "(env fallback)"}`,
    entityType: "setting",
  });

  revalidateServicePages();
  return { ok: true };
}

export interface ZoomOAuthSettingsInput {
  clientId: string;
  /** undefined = leave unchanged, "" = clear, non-empty = set (encrypted). */
  clientSecret?: string;
}

export async function updateZoomOAuthSettingsAction(
  input: ZoomOAuthSettingsInput
): Promise<ActionResult> {
  const admin = await requireAdmin();

  const set: Partial<typeof integrationSetting.$inferInsert> = {
    zoomClientId: input.clientId.trim() || null,
    updatedAt: new Date(),
  };

  if (input.clientSecret !== undefined) {
    if (input.clientSecret === "") {
      set.zoomClientSecretEncrypted = null;
    } else {
      const result = await encryptSecretOrError(input.clientSecret);
      if ("error" in result) {
        return result;
      }
      set.zoomClientSecretEncrypted = result.value;
    }
  }

  await db
    .insert(integrationSetting)
    .values({ id: "default", ...set })
    .onConflictDoUpdate({ target: integrationSetting.id, set });
  invalidateIntegrationSettingsCache();

  await audit({
    action: "settings.zoom_oauth_updated",
    actorEmail: admin.user.email,
    actorId: admin.user.id,
    description: `Zoom OAuth settings updated — client ID: ${input.clientId.trim() || "(env fallback)"}`,
    entityType: "setting",
  });

  revalidateServicePages();
  return { ok: true };
}

export interface StorageSettingsInput {
  accessKeyId: string;
  accountId: string;
  bucket: string;
  driver: "local" | "s3" | "r2";
  endpoint: string;
  publicBaseUrl: string;
  region: string;
  /** undefined = leave unchanged, "" = clear, non-empty = set (encrypted). */
  secretAccessKey?: string;
}

export async function updateStorageSettingsAction(
  input: StorageSettingsInput
): Promise<ActionResult> {
  const admin = await requireAdmin();

  if (input.driver === "s3" && !input.bucket.trim()) {
    return { error: "S3 bucket is required." };
  }
  if (
    input.driver === "r2" &&
    !(input.bucket.trim() && input.accountId.trim())
  ) {
    return { error: "R2 bucket and account ID are required." };
  }

  const set: Partial<typeof integrationSetting.$inferInsert> = {
    storageDriver: input.driver,
    storagePublicBaseUrl: input.publicBaseUrl.trim() || null,
    updatedAt: new Date(),
  };

  if (input.driver === "s3") {
    set.s3Endpoint = input.endpoint.trim() || null;
    set.s3Region = input.region.trim() || null;
    set.s3Bucket = input.bucket.trim() || null;
    set.s3AccessKeyId = input.accessKeyId.trim() || null;
  } else if (input.driver === "r2") {
    set.r2Bucket = input.bucket.trim() || null;
    set.r2AccountId = input.accountId.trim() || null;
    set.r2AccessKeyId = input.accessKeyId.trim() || null;
  }

  if (input.secretAccessKey !== undefined) {
    const column =
      input.driver === "r2"
        ? "r2SecretAccessKeyEncrypted"
        : "s3SecretAccessKeyEncrypted";
    if (input.secretAccessKey === "") {
      set[column] = null;
    } else {
      const result = await encryptSecretOrError(input.secretAccessKey);
      if ("error" in result) {
        return result;
      }
      set[column] = result.value;
    }
  }

  await db
    .insert(integrationSetting)
    .values({ id: "default", ...set })
    .onConflictDoUpdate({ target: integrationSetting.id, set });
  invalidateIntegrationSettingsCache();

  await audit({
    action: "settings.storage_updated",
    actorEmail: admin.user.email,
    actorId: admin.user.id,
    description: `Storage settings updated — driver: ${input.driver}`,
    entityType: "setting",
  });

  revalidateServicePages();
  return { ok: true };
}

export interface StorageTestInput {
  accessKeyId?: string;
  accountId?: string;
  bucket: string;
  driver: "s3" | "r2";
  endpoint?: string;
  region?: string;
  /** Blank falls back to the currently saved (DB or env) secret. */
  secretAccessKey?: string;
}

/** Round-trips a small marker object (upload + delete) through the
 * submitted credentials — a real connectivity + permissions check, not just
 * a client construction. Uses the resolved (DB-or-env) secret when the form
 * field is left blank, same as testSmtpConnectionAction. */
export async function testStorageConnectionAction(
  input: StorageTestInput
): Promise<ActionResult> {
  await requireAdmin();

  const resolved = await getStorageSettings();
  const resolvedCloud = resolved.driver === input.driver ? resolved : undefined;
  const secretAccessKey =
    input.secretAccessKey || resolvedCloud?.secretAccessKey;

  if (!(input.bucket.trim() && secretAccessKey)) {
    return { error: "Bucket and secret access key are required to test." };
  }
  if (input.driver === "r2" && !input.accountId?.trim()) {
    return { error: "Account ID is required to test R2." };
  }

  try {
    const { Files } = await import("files-sdk");
    const files =
      input.driver === "s3"
        ? new Files({
            adapter: (await import("files-sdk/s3")).s3({
              bucket: input.bucket.trim(),
              region: input.region?.trim(),
              endpoint: input.endpoint?.trim(),
              forcePathStyle: !!input.endpoint?.trim(),
              credentials: {
                accessKeyId: input.accessKeyId?.trim() ?? "",
                secretAccessKey,
              },
            }),
          })
        : new Files({
            adapter: (await import("files-sdk/r2")).r2({
              bucket: input.bucket.trim(),
              accountId: input.accountId?.trim() ?? "",
              accessKeyId: input.accessKeyId?.trim(),
              secretAccessKey,
            }),
          });

    const marker = `schduled-connection-test-${Date.now()}.txt`;
    await files.upload(marker, Buffer.from("ok"), {
      contentType: "text/plain",
    });
    await files.delete(marker).catch(() => undefined);
    return { ok: true };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Connection failed.",
    };
  }
}
