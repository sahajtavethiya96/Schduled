import fs from "node:fs/promises";
import path from "node:path";
import type { Files } from "files-sdk";
import {
  getStorageSettings,
  type StorageSettings,
} from "@/lib/integration-settings";

const UPLOADS_DIR = path.join(process.cwd(), "uploads");

type CloudStorageSettings = Extract<StorageSettings, { driver: "s3" | "r2" }>;

async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true });
}

// ── Local filesystem driver — the default, and the only one with no setup.
// Writes to ./uploads (not public/) since every driver is served through the
// /api/files/[...key] proxy below, never directly. MUST be a persistent
// volume in Docker or a redeploy wipes uploads.
const fsDriver = {
  async upload(key: string, buffer: Buffer): Promise<void> {
    const dest = path.join(UPLOADS_DIR, ...key.split("/"));
    await ensureDir(path.dirname(dest));
    await fs.writeFile(dest, buffer);
  },
  async download(key: string): Promise<Buffer> {
    const src = path.join(UPLOADS_DIR, ...key.split("/"));
    return fs.readFile(src);
  },
  async delete(key: string): Promise<void> {
    const target = path.join(UPLOADS_DIR, ...key.split("/"));
    await fs.unlink(target).catch(() => undefined);
  },
};

// ── Cloud drivers (s3 / r2), via files-sdk (https://files-sdk.dev).
// Lazily constructed via dynamic import so the local-disk (default) path
// never pulls in files-sdk or the AWS SDK — no added cold-start cost for
// deployments that don't use them. Cached, but keyed on the resolved
// settings (not just "have I built one yet") — settings can now change live
// via Settings → Services, so a stale client built from the previous
// driver/credentials must not survive a settings change.
let cloudFilesCache: { key: string; promise: Promise<Files> } | null = null;

function buildCloudFiles(settings: CloudStorageSettings): Promise<Files> {
  if (settings.driver === "s3") {
    return (async () => {
      const [{ Files: FilesCtor }, { s3 }] = await Promise.all([
        import("files-sdk"),
        import("files-sdk/s3"),
      ]);
      return new FilesCtor({
        adapter: s3({
          bucket: settings.bucket,
          region: settings.region,
          // Only for non-AWS S3-compatible endpoints (MinIO, DO Spaces,
          // Backblaze B2, ...). Omit for real AWS S3.
          endpoint: settings.endpoint,
          forcePathStyle: !!settings.endpoint,
          credentials:
            settings.accessKeyId && settings.secretAccessKey
              ? {
                  accessKeyId: settings.accessKeyId,
                  secretAccessKey: settings.secretAccessKey,
                }
              : undefined,
          publicBaseUrl: settings.publicBaseUrl,
        }),
      });
    })();
  }
  // settings.driver === "r2" (the only remaining branch; "local" never
  // reaches this function — see the driver switch below).
  return (async () => {
    const [{ Files: FilesCtor }, { r2 }] = await Promise.all([
      import("files-sdk"),
      import("files-sdk/r2"),
    ]);
    return new FilesCtor({
      adapter: r2({
        bucket: settings.bucket,
        accountId: settings.accountId,
        // Explicit here (unlike the old env-only version) since a
        // DB-configured key/secret isn't necessarily mirrored into
        // R2_ACCESS_KEY_ID/R2_SECRET_ACCESS_KEY — the adapter falls back to
        // those env vars only when these are omitted.
        accessKeyId: settings.accessKeyId,
        secretAccessKey: settings.secretAccessKey,
        publicBaseUrl: settings.publicBaseUrl,
      }),
    });
  })();
}

function getCloudFiles(settings: CloudStorageSettings): Promise<Files> {
  const key = JSON.stringify(settings);
  if (!cloudFilesCache || cloudFilesCache.key !== key) {
    cloudFilesCache = { key, promise: buildCloudFiles(settings) };
  }
  return cloudFilesCache.promise;
}

export const storage = {
  /** Store a file. */
  async upload(key: string, buffer: Buffer, mimeType: string): Promise<void> {
    const settings = await getStorageSettings();
    if (settings.driver === "local") {
      await fsDriver.upload(key, buffer);
      return;
    }
    const files = await getCloudFiles(settings);
    await files.upload(key, buffer, { contentType: mimeType });
  },

  /** Read a file as a Buffer. */
  async download(key: string): Promise<Buffer> {
    const settings = await getStorageSettings();
    if (settings.driver === "local") {
      return fsDriver.download(key);
    }
    const files = await getCloudFiles(settings);
    const file = await files.download(key);
    return Buffer.from(await file.arrayBuffer());
  },

  /** Delete a file. Does not throw if the file does not exist. */
  async delete(key: string): Promise<void> {
    const settings = await getStorageSettings();
    if (settings.driver === "local") {
      await fsDriver.delete(key);
      return;
    }
    const files = await getCloudFiles(settings);
    await files.delete(key).catch(() => undefined);
  },

  /**
   * Return the URL to serve the file from. Always our own proxy route,
   * regardless of driver — deliberately NOT a direct/signed cloud URL:
   *   - keeps this synchronous, since callers build it inline;
   *   - means no cloud bucket ever needs public read access — avatars stay
   *     servable even on a private R2/S3 bucket;
   *   - keeps access control in our own route rather than handing out cloud
   *     URLs (signed or public) directly.
   * `/api/files/[...key]` calls `storage.download()` under the hood, which
   * already supports every driver.
   */
  url(key: string): string {
    return `/api/files/${key}`;
  },
};

// Always .webp — the avatar upload route (app/api/upload/avatar/route.ts)
// converts every upload to webp before storing, and the /api/files proxy
// route derives Content-Type from this extension.
export function avatarKey(userId: string): string {
  return `avatars/${userId}.webp`;
}

export function logoKey(userId: string): string {
  return `logos/${userId}`;
}
