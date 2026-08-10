import { and, asc, eq, gt } from "drizzle-orm";
import { NextResponse } from "next/server";
import { booking, eventType, notificationPreference } from "@/db/schema";
import { getCurrentSession } from "@/lib/authz";
import { db } from "@/lib/db";

// Returns the host's soonest confirmed meeting that hasn't ended yet, with a
// join link if one exists. The client's "Join soon" bar decides when to show it
// (i.e. once it's within the lead window). Returns { meeting: null } otherwise.
export async function GET() {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ meeting: null }, { status: 401 });
  }

  const now = new Date();

  const [pref] = await db
    .select({ leadMinutes: notificationPreference.joinSoonLeadMinutes })
    .from(notificationPreference)
    .where(eq(notificationPreference.userId, session.user.id))
    .limit(1);
  const leadMinutes = pref?.leadMinutes ?? 15;

  // 0 = the user turned the "Join soon" bar off.
  if (leadMinutes === 0) {
    return NextResponse.json({ meeting: null, leadMinutes: 0 });
  }

  const [b] = await db
    .select({
      id: booking.id,
      startTime: booking.startTime,
      endTime: booking.endTime,
      videoLinkHost: booking.videoLinkHost,
      videoLinkInvitee: booking.videoLinkInvitee,
      locationValue: booking.locationValue,
      inviteeName: booking.inviteeName,
      eventName: eventType.name,
      locationType: eventType.locationType,
    })
    .from(booking)
    .innerJoin(eventType, eq(eventType.id, booking.eventTypeId))
    .where(
      and(
        eq(booking.hostUserId, session.user.id),
        eq(booking.status, "confirmed"),
        gt(booking.endTime, now)
      )
    )
    .orderBy(asc(booking.startTime))
    .limit(1);

  if (!b) {
    return NextResponse.json({ meeting: null, leadMinutes });
  }

  // The host joins via the host link (Zoom start URL) when present, else the
  // shared join/meet link, else a custom http location.
  const candidate = b.videoLinkHost || b.videoLinkInvitee || b.locationValue;
  const joinUrl = candidate && candidate.startsWith("http") ? candidate : null;

  return NextResponse.json({
    leadMinutes,
    meeting: {
      id: b.id,
      eventName: b.eventName,
      inviteeName: b.inviteeName,
      startUtc: b.startTime.toISOString(),
      endUtc: b.endTime.toISOString(),
      joinUrl,
      locationType: b.locationType,
    },
  });
}
