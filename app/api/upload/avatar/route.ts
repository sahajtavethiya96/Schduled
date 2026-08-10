import { eq } from "drizzle-orm";
import sharp from "sharp";
import { user } from "@/db/schema";
import { requireSession } from "@/lib/authz";
import { db } from "@/lib/db";
import { avatarKey, storage } from "@/lib/storage";

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const OUTPUT_SIZE = 256; // resize to 256×256 WebP

export async function POST(req: Request): Promise<Response> {
  try {
    const session = await requireSession();

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
        { error: "File must be under 5 MB." },
        { status: 400 }
      );
    }

    const raw = Buffer.from(await file.arrayBuffer());

    // Keeps file size tiny regardless of source dimensions.
    const processed = await sharp(raw)
      .resize(OUTPUT_SIZE, OUTPUT_SIZE, { fit: "cover", position: "centre" })
      .webp({ quality: 85 })
      .toBuffer();

    const key = avatarKey(session.user.id);
    await storage.upload(key, processed, "image/webp");
    const url = storage.url(key);

    await db
      .update(user)
      .set({ image: url, updatedAt: new Date() })
      .where(eq(user.id, session.user.id));

    return Response.json({ url });
  } catch (err) {
    console.error("[upload/avatar]", err);
    return Response.json(
      { error: "Upload failed. Please try again." },
      { status: 500 }
    );
  }
}
