import { and, eq, inArray, isNull } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { notification } from "@/db/schema";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(request: Request) {
  const requestHeaders = await headers();
  const current = await auth.api.getSession({ headers: requestHeaders });
  if (!current) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let ids: string[] | undefined;
  try {
    const body = await request.json();
    ids = Array.isArray(body?.ids) ? body.ids : undefined;
  } catch {
    ids = undefined;
  }

  const now = new Date();

  if (ids && ids.length > 0) {
    await db
      .update(notification)
      .set({ readAt: now })
      .where(
        and(
          eq(notification.userId, current.user.id),
          inArray(notification.id, ids)
        )
      );
  } else {
    await db
      .update(notification)
      .set({ readAt: now })
      .where(
        and(
          eq(notification.userId, current.user.id),
          isNull(notification.readAt)
        )
      );
  }

  return NextResponse.json({ ok: true });
}
