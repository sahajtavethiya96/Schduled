import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { notification } from "@/db/schema";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// DELETE /api/notifications/[id] — dismiss a single notification
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestHeaders = await headers();
  const current = await auth.api.getSession({ headers: requestHeaders });
  if (!current) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  await db
    .delete(notification)
    .where(
      and(eq(notification.id, id), eq(notification.userId, current.user.id))
    );

  return NextResponse.json({ ok: true });
}
