import { and, eq, ne } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { eventType } from "@/db/schema";
import { checkRateLimit, rateLimitKey } from "@/lib/api/helpers";
import { getCurrentSession } from "@/lib/authz";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  if (
    !(await checkRateLimit(
      rateLimitKey("GET:/api/slug-check", req),
      30,
      60_000
    ))
  ) {
    return NextResponse.json({ available: false });
  }

  const slug = req.nextUrl.searchParams.get("slug")?.toLowerCase().trim();
  const excludeId = req.nextUrl.searchParams.get("excludeId");

  if (!slug || slug.length < 1) {
    return NextResponse.json({ available: false });
  }

  try {
    const session = await getCurrentSession();
    if (!session?.user) {
      return NextResponse.json({ available: false });
    }

    const [existing] = await db
      .select({ id: eventType.id })
      .from(eventType)
      .where(
        and(
          eq(eventType.userId, session.user.id),
          eq(eventType.slug, slug),
          ...(excludeId ? [ne(eventType.id, excludeId)] : [])
        )
      )
      .limit(1);

    return NextResponse.json({ available: !existing });
  } catch {
    return NextResponse.json({ available: false });
  }
}
