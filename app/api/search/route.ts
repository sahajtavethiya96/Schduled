import { and, eq, ilike, ne, or } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { ADMIN_ROLE } from "@/config/platform";
import { booking, contact, eventType, user } from "@/db/schema";
import { checkRateLimit, rateLimitKey } from "@/lib/api/helpers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

const RESULT_LIMIT = 5;

export async function GET(request: Request) {
  const requestHeaders = await headers();
  const current = await auth.api.getSession({ headers: requestHeaders });
  if (!current) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (
    !(await checkRateLimit(
      rateLimitKey("GET:/api/search", request),
      30,
      60_000
    ))
  ) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const q = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) {
    return NextResponse.json({
      bookings: [],
      contacts: [],
      eventTypes: [],
      users: [],
    });
  }

  const hostUserId = current.user.id;
  const like = `%${q}%`;

  const [currentRow] = await db
    .select({ role: user.role })
    .from(user)
    .where(eq(user.id, hostUserId))
    .limit(1);
  const isAdmin = currentRow?.role === ADMIN_ROLE;

  const [bookingRows, contactRows, eventTypeRows, userRows] = await Promise.all(
    [
      db
        .select({
          id: booking.id,
          inviteeName: booking.inviteeName,
          inviteeEmail: booking.inviteeEmail,
          startTime: booking.startTime,
        })
        .from(booking)
        .where(
          and(
            eq(booking.hostUserId, hostUserId),
            or(
              ilike(booking.inviteeName, like),
              ilike(booking.inviteeEmail, like)
            )
          )
        )
        .limit(RESULT_LIMIT),
      db
        .select({ id: contact.id, name: contact.name, email: contact.email })
        .from(contact)
        .where(
          and(
            eq(contact.hostUserId, hostUserId),
            eq(contact.isArchived, false),
            or(ilike(contact.name, like), ilike(contact.email, like))
          )
        )
        .limit(RESULT_LIMIT),
      db
        .select({
          id: eventType.id,
          name: eventType.name,
          slug: eventType.slug,
        })
        .from(eventType)
        .where(
          and(
            eq(eventType.userId, hostUserId),
            or(ilike(eventType.name, like), ilike(eventType.slug, like))
          )
        )
        .limit(RESULT_LIMIT),
      isAdmin
        ? db
            .select({
              id: user.id,
              name: user.name,
              email: user.email,
              role: user.role,
            })
            .from(user)
            .where(
              and(
                ne(user.id, hostUserId),
                or(
                  ilike(user.name, like),
                  ilike(user.email, like),
                  ilike(user.username, like)
                )
              )
            )
            .limit(RESULT_LIMIT)
        : Promise.resolve([]),
    ]
  );

  return NextResponse.json({
    bookings: bookingRows.map((b) => ({
      ...b,
      startTime: b.startTime.toISOString(),
    })),
    contacts: contactRows,
    eventTypes: eventTypeRows,
    users: userRows,
  });
}
