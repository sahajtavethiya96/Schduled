import ical, {
  ICalAttendeeRole,
  ICalAttendeeStatus,
  ICalCalendarMethod,
} from "ical-generator";
import type { EmailAttachment } from "@/db/schema";

export interface GenerateICSParams {
  attendeeEmail?: string;
  attendeeName?: string;
  description?: string;
  durationMinutes: number;
  location?: string;
  meetUrl?: string;
  organizerEmail: string;
  organizerName: string;
  startUtc: Date;
  title: string;
  uid: string; // stable unique ID — use bookingId
}

/**
 * Generate an ICS calendar file and return it as an EmailAttachment.
 * The UID must be stable (use bookingId) so re-sends don't create duplicate events.
 */
export function generateBookingICS(params: GenerateICSParams): EmailAttachment {
  const endUtc = new Date(
    params.startUtc.getTime() + params.durationMinutes * 60 * 1000
  );

  const cal = ical({ name: "Schduled", method: ICalCalendarMethod.REQUEST });

  const event = cal.createEvent({
    id: params.uid,
    start: params.startUtc,
    end: endUtc,
    summary: params.title,
    description: params.description ?? params.title,
    location: params.location,
    url: params.meetUrl ?? undefined,
    organizer: {
      name: params.organizerName,
      email: params.organizerEmail,
    },
  });

  if (params.attendeeEmail) {
    event.createAttendee({
      email: params.attendeeEmail,
      name: params.attendeeName,
      role: ICalAttendeeRole.REQ,
      status: ICalAttendeeStatus.ACCEPTED,
    });
  }

  return {
    filename: "invite.ics",
    content: cal.toString(),
    contentType: "text/calendar",
    encoding: "utf8",
  };
}
