"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { booking } from "@/db/schema";
import { requireSession } from "@/lib/authz";
import { db } from "@/lib/db";

export async function markNoShow(
  bookingId: string
): Promise<{ error?: string }> {
  const session = await requireSession();

  const [b] = await db
    .select({
      id: booking.id,
      status: booking.status,
      startTime: booking.startTime,
    })
    .from(booking)
    .where(
      and(eq(booking.id, bookingId), eq(booking.hostUserId, session.user.id))
    )
    .limit(1);

  if (!b) {
    return { error: "Booking not found." };
  }
  if (b.status !== "confirmed") {
    return { error: "Only confirmed bookings can be marked as no-show." };
  }
  if (b.startTime > new Date()) {
    return { error: "Meeting has not started yet." };
  }

  await db
    .update(booking)
    .set({ status: "no_show", updatedAt: new Date() })
    .where(eq(booking.id, bookingId));

  revalidatePath(`/bookings/${bookingId}`);
  revalidatePath("/bookings");
  return {};
}
