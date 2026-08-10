import { and, count, desc, eq, isNull } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { notification } from "@/db/schema";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const requestHeaders = await headers();
  const current = await auth.api.getSession({ headers: requestHeaders });
  if (!current) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rows = await db
    .select()
    .from(notification)
    .where(eq(notification.userId, current.user.id))
    .orderBy(desc(notification.createdAt))
    .limit(30);

  const [{ unread } = { unread: 0 }] = await db
    .select({ unread: count() })
    .from(notification)
    .where(
      and(eq(notification.userId, current.user.id), isNull(notification.readAt))
    );

  return NextResponse.json({
    notifications: rows.map((n) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      body: n.body,
      bookingId: n.bookingId,
      read: n.readAt !== null,
      createdAt: n.createdAt,
    })),
    unreadCount: unread,
  });
}

// DELETE /api/notifications — clear all notifications for the current user
export async function DELETE() {
  const requestHeaders = await headers();
  const current = await auth.api.getSession({ headers: requestHeaders });
  if (!current) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await db.delete(notification).where(eq(notification.userId, current.user.id));

  return NextResponse.json({ ok: true });
}
