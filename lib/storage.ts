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

// Writes to ./uploads (not public/) since every driver is served through the
// /api/files/[...key] proxy below, never directly. Must be a persistent
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

// Cloud drivers (s3 / r2), via files-sdk. Lazily dynamic-imported so the
// local-disk default never pulls in files-sdk/AWS SDK. Cache is keyed on the
// resolved settings, not just "built one yet" — settings can change live via
// Settings → Services, so a stale client must not survive a settings change.
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
  // settings.driver === "r2" ("local" never reaches this function).
  return (async () => {
    const [{ Files: FilesCtor }, { r2 }] = await Promise.all([
      import("files-sdk"),
      import("files-sdk/r2"),
    ]);
    return new FilesCtor({
      adapter: r2({
        bucket: settings.bucket,
        accountId: settings.accountId,
        // A DB-configured key/secret isn't necessarily mirrored into
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
  async upload(key: string, buffer: Buffer, mimeType: string): Promise<void> {
    const settings = await getStorageSettings();
    if (settings.driver === "local") {
      await fsDriver.upload(key, buffer);
      return;
    }
    const files = await getCloudFiles(settings);
    await files.upload(key, buffer, { contentType: mimeType });
  },

  async download(key: string): Promise<Buffer> {
    const settings = await getStorageSettings();
    if (settings.driver === "local") {
      return fsDriver.download(key);
    }
    const files = await getCloudFiles(settings);
    const file = await files.download(key);
    return Buffer.from(await file.arrayBuffer());
  },

  /** Does not throw if the file does not exist. */
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
   * Always our own proxy route, never a direct/signed cloud URL — keeps this
   * synchronous, keeps access control local, and means no bucket needs
   * public read access.
   */
  url(key: string): string {
    return `/api/files/${key}`;
  },
};

// Always .webp — uploads are converted to webp before storing, and the
// /api/files proxy derives Content-Type from this extension.
export function avatarKey(userId: string): string {
  return `avatars/${userId}.webp`;
}

export function logoKey(userId: string): string {
  return `logos/${userId}`;
}
