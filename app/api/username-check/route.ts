import { eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { user } from "@/db/schema";
import { checkRateLimit, rateLimitKey } from "@/lib/api/helpers";
import { getCurrentSession } from "@/lib/authz";
import { db } from "@/lib/db";

const RESERVED = new Set([
  "orbit",
  "api",
  "admin",
  "dashboard",
  "settings",
  "login",
  "signup",
  "post-auth",
  "onboarding",
  "privacy",
  "terms",
  "cookies",
  "cancel",
  "reschedule",
  "help",
  "support",
  "about",
  "pricing",
]);

export async function GET(req: NextRequest) {
  if (
    !(await checkRateLimit(
      rateLimitKey("GET:/api/username-check", req),
      20,
      60_000
    ))
  ) {
    return NextResponse.json({
      available: false,
      reason: "Too many requests. Please slow down.",
    });
  }

  const raw = req.nextUrl.searchParams.get("username");
  if (!raw) {
    return NextResponse.json({
      available: false,
      reason: "Username is required",
    });
  }

  const username = raw.toLowerCase().trim();

  if (username.length < 3) {
    return NextResponse.json({
      available: false,
      reason: "At least 3 characters required",
    });
  }
  if (username.length > 30) {
    return NextResponse.json({ available: false, reason: "Max 30 characters" });
  }
  if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(username)) {
    return NextResponse.json({
      available: false,
      reason:
        "Only letters, numbers, and hyphens. Cannot start or end with a hyphen.",
    });
  }
  if (RESERVED.has(username)) {
    return NextResponse.json({
      available: false,
      reason: "That username is reserved",
    });
  }

  const session = await getCurrentSession();

  const [existing] = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.username, username))
    .limit(1);

  // Taken by someone else
  if (existing && existing.id !== session?.user.id) {
    return NextResponse.json({ available: false, reason: "Already taken" });
  }

  return NextResponse.json({ available: true });
}
