import { createElement } from "react";
import { formatInTimeZone } from "date-fns-tz";
import { RescheduleRequestEmail } from "@/lib/email/components/reschedule-request";
import { renderEmailTemplate } from "@/lib/email/renderer";
import { getAppUrl } from "@/lib/get-app-url";
import { PRODUCT_NAME } from "@/config/platform";

const DATE_FMT = "EEEE, MMMM d, yyyy 'at' h:mm a";

interface RescheduleRequestParams {
  approvalToken: string;
  currentStartUtc: Date;
  eventName: string;
  hostName: string;
  hostTimezone: string;
  inviteeEmail: string;
  inviteeName: string;
  locationLabel: string;
  requestedStartUtc: Date;
}

export async function rescheduleRequestTemplate(p: RescheduleRequestParams) {
  const base = getAppUrl();
  const currentWhenHost = formatInTimeZone(p.currentStartUtc, p.hostTimezone, DATE_FMT);
  const requestedWhenHost = formatInTimeZone(p.requestedStartUtc, p.hostTimezone, DATE_FMT);
  const reviewUrl = `${base}/booking/review/${p.approvalToken}?type=reschedule`;
  const approveUrl = `${base}/booking/review/${p.approvalToken}?type=reschedule&action=approve`;

  const html = await renderEmailTemplate(
    createElement(RescheduleRequestEmail, {
      approveUrl,
      currentWhenHost,
      eventName: p.eventName,
      hostName: p.hostName,
      hostTimezone: p.hostTimezone,
      inviteeEmail: p.inviteeEmail,
      inviteeName: p.inviteeName,
      locationLabel: p.locationLabel,
      requestedWhenHost,
      reviewUrl,
    })
  );

  const text = `Hi ${p.hostName},

${p.inviteeName} requested to reschedule a confirmed meeting (${p.eventName}).
The current meeting stays booked until you approve.

Requested by: ${p.inviteeName} (${p.inviteeEmail})
Current:   ${currentWhenHost} (${p.hostTimezone})
Requested: ${requestedWhenHost} (${p.hostTimezone})
Location: ${p.locationLabel}

Approve: ${approveUrl}
Review & Decline: ${reviewUrl}

Rejecting keeps the current meeting exactly as it is.

— ${PRODUCT_NAME}`;

  return {
    html,
    text,
    subject: `Reschedule request: ${p.eventName} with ${p.inviteeName}`,
  };
}
