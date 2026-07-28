import sharp from "sharp";
import { requireAdmin } from "@/lib/authz";
import { getAppUrl } from "@/lib/get-app-url";
import { invalidateBrandingCache } from "@/lib/settings/branding";
import { storage } from "@/lib/storage";

// SVG is deliberately not accepted — this logo is used in email headers, and
// most email clients (notably Outlook desktop) don't render SVG at all, so
// an SVG upload here would silently produce a broken/missing logo in email.
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_BYTES = 2 * 1024 * 1024; // 2 MB
const MAX_WIDTH = 600;
const MAX_HEIGHT = 160;

// Fixed key — one logo for the whole (single-org) instance, not per-user.
const LOGO_KEY = "branding/logo.png";

export async function POST(req: Request): Promise<Response> {
  try {
    await requireAdmin();

    const form = await req.formData();
    const file = form.get("file");

    if (!(file instanceof File)) {
      return Response.json({ error: "No file provided." }, { status: 400 });
    }

    if (!ALLOWED_TYPES.has(file.type)) {
      return Response.json(
        { error: "Only JPEG, PNG, and WebP images are allowed." },
        { status: 400 }
      );
    }

    if (file.size > MAX_BYTES) {
      return Response.json(
        { error: "File must be under 2 MB." },
        { status: 400 }
      );
    }

    const raw = Buffer.from(await file.arrayBuffer());

    // Cap dimensions (preserving aspect ratio — logos are usually wider than
    // tall, unlike avatars) and normalize to PNG so every upload lands at
    // the same storage key regardless of the source format.
    const processed = await sharp(raw)
      .resize(MAX_WIDTH, MAX_HEIGHT, {
        fit: "inside",
        withoutEnlargement: true,
      })
      .png()
      .toBuffer();

    await storage.upload(LOGO_KEY, processed, "image/png");
    // storage.url() is deliberately relative (proxies through /api/files,
    // fine for in-app <img> tags resolved against the current page) — but
    // this URL gets embedded in email HTML, which has no page context to
    // resolve a relative path against, so it must be absolute here.
    const url = `${getAppUrl()}${storage.url(LOGO_KEY)}`;

    invalidateBrandingCache();

    return Response.json({ url });
  } catch (err) {
    console.error("[upload/branding-logo]", err);
    return Response.json(
      { error: "Upload failed. Please try again." },
      { status: 500 }
    );
  }
}
