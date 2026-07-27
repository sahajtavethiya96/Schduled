import { eq } from "drizzle-orm";
import { booking, eventType, notificationPreference, user } from "@/db/schema";
import { db } from "@/lib/db";

export interface BookingLifecycleRow {
  approvalToken: string | null;
  cancellationReason: string | null;
  cancelToken: string;
  endTime: Date;
  etConfirmationNote: string | null;
  etLocationType: string;
  etLocationValue: string | null;
  etName: string;
  hostEmail: string | null;
  hostName: string | null;
  hostTimezone: string | null;
  hostUserId: string;
  id: string;
  inviteeEmail: string;
  inviteeName: string;
  inviteePhone: string | null;
  inviteeTimezone: string;
  rejectionReason: string | null;
  rescheduleToken: string;
  rescheduleRequestedStart: Date | null;
  rescheduleRequestedEnd: Date | null;
  startTime: Date;
  status: string;
  videoLinkHost: string | null;
  videoLinkInvitee: string | null;
  videoLinkPassword: string | null;
}

export async function loadBookingForLifecycle(
  bookingId: string
): Promise<BookingLifecycleRow | null> {
  const [b] = await db
    .select({
      id: booking.id,
      inviteeName: booking.inviteeName,
      inviteeEmail: booking.inviteeEmail,
      inviteePhone: booking.inviteePhone,
      inviteeTimezone: booking.inviteeTimezone,
      startTime: booking.startTime,
      endTime: booking.endTime,
      videoLinkInvitee: booking.videoLinkInvitee,
      videoLinkHost: booking.videoLinkHost,
      videoLinkPassword: booking.videoLinkPassword,
      cancelToken: booking.cancelToken,
      rescheduleToken: booking.rescheduleToken,
      rescheduleRequestedStart: booking.rescheduleRequestedStart,
      rescheduleRequestedEnd: booking.rescheduleRequestedEnd,
      approvalToken: booking.approvalToken,
      status: booking.status,
      cancellationReason: booking.cancellationReason,
      rejectionReason: booking.rejectionReason,
      etName: eventType.name,
      etConfirmationNote: eventType.confirmationNote,
      etLocationType: eventType.locationType,
      etLocationValue: eventType.locationValue,
      hostUserId: user.id,
      hostName: user.name,
      hostEmail: user.email,
      hostTimezone: user.timezone,
    })
    .from(booking)
    .innerJoin(eventType, eq(eventType.id, booking.eventTypeId))
    .innerJoin(user, eq(user.id, booking.hostUserId))
    .where(eq(booking.id, bookingId))
    .limit(1);

  return b ?? null;
}

export async function loadHostPrefs(userId: string) {
  const [prefs] = await db
    .select()
    .from(notificationPreference)
    .where(eq(notificationPreference.userId, userId))
    .limit(1);
  return prefs ?? null;
}

/** Location label shown in the invitee's email. */
export function resolveLocationLabel(
  locationType: string,
  locationValue: string | null,
  inviteePhone?: string | null
): string {
  switch (locationType) {
    case "google_meet":
      return "Google Meet";
    case "zoom":
      return "Zoom";
    case "phone_host_calls":
      return inviteePhone
        ? `Phone — your host will call you at ${inviteePhone}`
        : "Phone (your host will call you)";
    case "phone_invitee_calls":
      return locationValue ? `Phone — call your host at ${locationValue}` : "Phone (call your host)";
    case "in_person":
      return locationValue ?? "In person (see invite for address)";
    case "custom":
      return locationValue ?? "See invite for details";
    default:
      return locationValue ?? "See invite for details";
  }
}

/** Location label shown in the HOST's email — phone labels are reversed. */
export function resolveLocationLabelHost(
  locationType: string,
  locationValue: string | null,
  inviteePhone: string | null
): string {
  switch (locationType) {
    case "google_meet":
      return "Google Meet";
    case "zoom":
      return "Zoom";
    case "phone_host_calls":
      return inviteePhone
        ? `Phone — call invitee at ${inviteePhone}`
        : "Phone (call invitee — number not provided)";
    case "phone_invitee_calls":
      return locationValue
        ? `Phone — invitee will call you at ${locationValue}`
        : "Phone (invitee will call you)";
    case "in_person":
      return locationValue ?? "In person";
    case "custom":
      return locationValue ?? "See details";
    default:
      return locationValue ?? "See details";
  }
}

/** Provider-specific button labels for lifecycle emails (invitee and host views). */
export function resolveMeetLabels(locationType: string): { invitee: string; host: string } {
  switch (locationType) {
    case "google_meet":
      return { invitee: "Join Google Meet", host: "Start Google Meet" };
    case "zoom":
      return { invitee: "Join Zoom Meeting", host: "Start Zoom Meeting" };
    default:
      return { invitee: "Join Meeting", host: "Start Meeting" };
  }
}

/** Convenience wrapper — returns the invitee-facing meet button label. */
export function resolveMeetButtonLabel(locationType: string): string {
  return resolveMeetLabels(locationType).invitee;
}
