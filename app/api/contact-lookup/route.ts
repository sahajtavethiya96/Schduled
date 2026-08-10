import { and, desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { booking, contact, user } from "@/db/schema";
import { checkRateLimit, rateLimitKey } from "@/lib/api/helpers";
import { db } from "@/lib/db";

export async function GET(request: Request) {
  // This endpoint is unauthenticated (the public booking form prefills a
  // returning invitee's name as they type their email). Rate-limit it hard so
  // it can't be used to enumerate which emails have booked a given host.
  if (
    !(await checkRateLimit(
      rateLimitKey("GET:/api/contact-lookup", request),
      15,
      60_000
    ))
  ) {
    return NextResponse.json({ found: false });
  }

  const { searchParams } = new URL(request.url);
  const username = searchParams.get("username");
  const rawEmail = searchParams.get("email");

  if (!username || !rawEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawEmail)) {
    return NextResponse.json({ found: false });
  }

  // Stored invitee emails / contacts are lowercased — normalize before matching
  // so a capitalized email (e.g. John@Example.com) still finds the prefill.
  const email = rawEmail.toLowerCase().trim();

  // Resolve host userId from username
  const [host] = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.username, username))
    .limit(1);

  if (!host) {
    return NextResponse.json({ found: false });
  }

  // Check contact record for name
  const [contactRow] = await db
    .select({ name: contact.name })
    .from(contact)
    .where(and(eq(contact.hostUserId, host.id), eq(contact.email, email)))
    .limit(1);

  // Most recent booking is only used as a fallback for the name. We
  // deliberately do NOT return the stored phone number — handing a stranger's
  // phone number to anyone who guesses their email is a PII leak.
  const [lastBooking] = await db
    .select({ name: booking.inviteeName })
    .from(booking)
    .where(
      and(eq(booking.hostUserId, host.id), eq(booking.inviteeEmail, email))
    )
    .orderBy(desc(booking.createdAt))
    .limit(1);

  const name = contactRow?.name || lastBooking?.name || null;

  if (!name) {
    return NextResponse.json({ found: false });
  }

  return NextResponse.json({ found: true, name });
}
