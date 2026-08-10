import { CalendarPlus } from "@phosphor-icons/react/dist/ssr";
import { startOfMonth } from "date-fns";
import { and, count, eq, gte, max } from "drizzle-orm";
import Link from "next/link";
import { listEventTypes } from "@/app/actions/event-types";
import { PageHeader } from "@/components/scaffold/page-header";
import { Button } from "@/components/ui/button";
import { Empty } from "@/components/ui/empty";
import { booking, connectedCalendar, user, videoConnection } from "@/db/schema";
import { requireSession } from "@/lib/authz";
import { db } from "@/lib/db";
import { EventTypeList } from "./_components/event-type-list";

export const metadata = { title: "Meeting Types" };

export default async function EventTypesPage() {
  const session = await requireSession();
  const now = new Date();
  const monthStart = startOfMonth(now);

  const [
    eventTypes,
    [currentUser],
    lastBookedStats,
    monthlyStats,
    [googleCal],
    [zoomConn],
  ] = await Promise.all([
    listEventTypes(),
    db
      .select({ username: user.username })
      .from(user)
      .where(eq(user.id, session.user.id))
      .limit(1),
    db
      .select({
        eventTypeId: booking.eventTypeId,
        lastBooked: max(booking.createdAt),
      })
      .from(booking)
      .where(eq(booking.hostUserId, session.user.id))
      .groupBy(booking.eventTypeId),
    db
      .select({ eventTypeId: booking.eventTypeId, countThisMonth: count() })
      .from(booking)
      .where(
        and(
          eq(booking.hostUserId, session.user.id),
          gte(booking.createdAt, monthStart)
        )
      )
      .groupBy(booking.eventTypeId),
    // Google Meet requires a write-target connected calendar
    db
      .select({ id: connectedCalendar.id })
      .from(connectedCalendar)
      .where(
        and(
          eq(connectedCalendar.userId, session.user.id),
          eq(connectedCalendar.status, "connected"),
          eq(connectedCalendar.isWriteTarget, true)
        )
      )
      .limit(1),
    db
      .select({ id: videoConnection.id })
      .from(videoConnection)
      .where(
        and(
          eq(videoConnection.userId, session.user.id),
          eq(videoConnection.provider, "zoom")
        )
      )
      .limit(1),
  ]);

  const username = currentUser?.username ?? null;
  const monthlyMap = new Map(
    monthlyStats.map((s) => [s.eventTypeId, s.countThisMonth ?? 0])
  );
  const statsMap = new Map(
    lastBookedStats.map((s) => [
      s.eventTypeId,
      {
        countThisMonth: monthlyMap.get(s.eventTypeId) ?? 0,
        lastBooked: s.lastBooked ?? null,
      },
    ])
  );

  return (
    <>
      <PageHeader
        action={
          <Button asChild>
            <Link href="/event-types/new">
              <CalendarPlus size={16} />
              New Meeting Type
            </Link>
          </Button>
        }
        description="Create reusable meeting templates that people can book with you."
        eyebrow="Scheduling"
        title="Meeting Types"
      />

      {eventTypes.length === 0 ? (
        <Empty
          action={
            <Button asChild>
              <Link href="/event-types/new">Create meeting type</Link>
            </Button>
          }
          description="Create your first meeting type to start accepting bookings."
          icon={<CalendarPlus size={24} />}
          title="No meeting types yet"
        />
      ) : (
        <EventTypeList
          eventTypes={eventTypes}
          googleMeetConnected={!!googleCal}
          statsMap={statsMap}
          username={username}
          zoomConnected={!!zoomConn}
        />
      )}
    </>
  );
}
