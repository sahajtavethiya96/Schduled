import { formatInTimeZone } from "date-fns-tz";
import { createElement } from "react";
import { getEmailBranding } from "@/lib/email/branding";
import { FollowUpEmail } from "@/lib/email/components/follow-up";
import { renderEmailTemplate } from "@/lib/email/renderer";
import { getAppUrl } from "@/lib/get-app-url";

interface FollowUpParams {
  bookingId: string;
  endUtc: Date;
  eventName: string;
  hostName: string;
  inviteeName: string;
  inviteeTimezone: string;
}

const DATE_FMT = "EEEE, MMMM d, yyyy 'at' h:mm a";

export async function followUpTemplate(p: FollowUpParams) {
  const branding = await getEmailBranding();
  const when = formatInTimeZone(p.endUtc, p.inviteeTimezone, DATE_FMT);
  const bookingUrl = `${getAppUrl()}/bookings/${p.bookingId}`;

  const html = await renderEmailTemplate(
    createElement(FollowUpEmail, {
      branding,
      inviteeName: p.inviteeName,
      hostName: p.hostName,
      eventName: p.eventName,
      when,
      bookingUrl,
    })
  );

  return {
    subject: `Thanks for meeting — ${p.eventName}`,
    html,
  };
}
