import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { booking, eventType, user } from "@/db/schema";
import { db } from "@/lib/db";
import { ReviewClient } from "./_components/review-client";

function resolveLocationLabel(
  locationType: string,
  locationValue: string | null
): string {
  switch (locationType) {
    case "google_meet":
      return "Google Meet";
    case "zoom":
      return "Zoom";
    case "phone_host_calls":
      return "Phone (host will call you)";
    case "phone_invitee_calls":
      return locationValue ? `Call: ${locationValue}` : "Phone (you call host)";
    case "in_person":
      return locationValue ?? "In person";
    case "custom":
      return locationValue ?? "See invite for details";
    default:
      return locationValue ?? "See invite for details";
  }
}

export default async function ReviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ action?: string; type?: string }>;
}) {
  const { token } = await params;
  const { action, type } = await searchParams;

  const [b] = await db
    .select({
      id: booking.id,
      approvalToken: booking.approvalToken,
      status: booking.status,
      startTime: booking.startTime,
      rescheduleRequestedStart: booking.rescheduleRequestedStart,
      inviteeName: booking.inviteeName,
      inviteeEmail: booking.inviteeEmail,
      etName: eventType.name,
      etLocationType: eventType.locationType,
      etLocationValue: eventType.locationValue,
      hostName: user.name,
      hostTimezone: user.timezone,
    })
    .from(booking)
    .innerJoin(eventType, eq(eventType.id, booking.eventTypeId))
    .innerJoin(user, eq(user.id, booking.hostUserId))
    .where(eq(booking.approvalToken, token))
    .limit(1);

  if (!b) {
    notFound();
  }

  const isReschedule =
    type === "reschedule" || b.status === "reschedule_requested";
  const isPast = new Date(b.startTime).getTime() < Date.now();
  const locationLabel = resolveLocationLabel(
    b.etLocationType,
    b.etLocationValue
  );

  // A reschedule request is actionable only while still pending — if the
  // booking moved on since, show the "no longer valid" state instead.
  const isAlreadyActioned = isReschedule
    ? b.status !== "reschedule_requested"
    : b.status !== "pending";

  return (
    <ReviewClient
      approvalToken={token}
      bookingStatus={b.status}
      eventName={b.etName}
      hostName={b.hostName ?? "your host"}
      hostTimezone={b.hostTimezone ?? "UTC"}
      initialAction={action === "approve" ? "approve" : null}
      inviteeEmail={b.inviteeEmail}
      inviteeName={b.inviteeName}
      isAlreadyActioned={isAlreadyActioned}
      isPast={isPast}
      locationLabel={locationLabel}
      mode={isReschedule ? "reschedule" : "booking"}
      requestedStartUtc={
        b.rescheduleRequestedStart
          ? new Date(b.rescheduleRequestedStart).toISOString()
          : null
      }
      startUtc={new Date(b.startTime).toISOString()}
    />
  );
}
