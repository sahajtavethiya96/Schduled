import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { bookingBlocklist, user } from "@/db/schema";
import { checkRateLimit, rateLimitKey } from "@/lib/api/helpers";
import { db } from "@/lib/db";

export async function GET(request: Request) {
  if (
    !(await checkRateLimit(
      rateLimitKey("GET:/api/check-blocked", request),
      20,
      60_000
    ))
  ) {
    return NextResponse.json({ blocked: false });
  }

  const { searchParams } = new URL(request.url);
  const username = searchParams.get("username");
  const email = searchParams.get("email");

  if (!username || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ blocked: false });
  }

  const [host] = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.username, username))
    .limit(1);

  if (!host) {
    return NextResponse.json({ blocked: false });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const domain = normalizedEmail.split("@")[1] ?? "";

  const blocklist = await db
    .select({ pattern: bookingBlocklist.pattern, type: bookingBlocklist.type })
    .from(bookingBlocklist)
    .where(eq(bookingBlocklist.userId, host.id));

  const blocked = blocklist.some((b) =>
    b.type === "email"
      ? b.pattern.toLowerCase() === normalizedEmail
      : b.type === "domain"
        ? b.pattern.toLowerCase() === domain
        : false
  );

  return NextResponse.json({ blocked });
}
