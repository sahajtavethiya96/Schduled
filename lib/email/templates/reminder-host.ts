import { createElement } from "react";
import { formatInTimeZone } from "date-fns-tz";
import { renderEmailTemplate } from "@/lib/email/renderer";
import { ReminderHostEmail } from "@/lib/email/components/reminder-host";
import { getAppUrl } from "@/lib/get-app-url";

interface ReminderHostParams {
  hostName: string;
  inviteeName: string;
  eventName: string;
  startUtc: Date;
  hostTimezone: string;
  inviteeTimezone: string;
  locationLabel: string;
  /** Zoom start URL (host-only) or Google Meet link */
  startMeetLink: string | null;
  /** "Start Google Meet" | "Start Zoom Meeting" */
  meetLabel: string;
  meetPassword?: string | null;
  timeUntil: "24 hours" | "1 hour";
}

const DATE_FMT = "EEEE, MMMM d, yyyy 'at' h:mm a";

export async function reminderHostTemplate(p: ReminderHostParams) {
  const dashboardUrl = `${getAppUrl()}/dashboard`;

  const startFormatted = formatInTimeZone(p.startUtc, p.hostTimezone, DATE_FMT);
  const inviteeTime = formatInTimeZone(
    p.startUtc,
    p.inviteeTimezone,
    DATE_FMT
  );

  const html = await renderEmailTemplate(
    createElement(ReminderHostEmail, {
      hostName: p.hostName,
      inviteeName: p.inviteeName,
      eventName: p.eventName,
      startFormatted,
      hostTimezone: p.hostTimezone,
      inviteeTime,
      inviteeTimezone: p.inviteeTimezone,
      locationLabel: p.locationLabel,
      startMeetLink: p.startMeetLink,
      meetLabel: p.meetLabel,
      meetPassword: p.meetPassword,
      timeUntil: p.timeUntil,
      dashboardUrl,
    })
  );

  const text = `Hi ${p.hostName},

You have an upcoming ${p.eventName} with ${p.inviteeName} in ${p.timeUntil}.

Time (${p.hostTimezone}): ${startFormatted}
Time (${p.inviteeTimezone}): ${inviteeTime}
Location: ${p.locationLabel}
${p.startMeetLink ? `\n${p.meetLabel}: ${p.startMeetLink}` : ""}
${p.startMeetLink && p.meetPassword ? `Meeting Password: ${p.meetPassword}\n` : ""}
Manage your bookings: ${dashboardUrl}

— Schduled`;

  return { html, text };
}
