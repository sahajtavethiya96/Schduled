import { Hr, Link, Section, Text } from "react-email";
import { emailBranding, type EmailBranding } from "@/lib/email/branding";
import { canonicalizeTz } from "@/lib/utils";
import { buildEmailStyles, EmailLayout } from "./layout";

interface RescheduleDeclinedEmailProps {
  branding?: EmailBranding;
  eventName: string;
  hostName: string;
  hostTimezone: string;
  inviteeName: string;
  inviteeTimezone: string;
  locationLabel: string;
  reason?: string | null;
  whenHost: string;
  whenInvitee: string;
}

const red = "#EF4444";

export function RescheduleDeclinedEmail({
  branding = emailBranding,
  eventName,
  hostName,
  hostTimezone,
  inviteeName,
  inviteeTimezone,
  locationLabel,
  reason,
  whenHost,
  whenInvitee,
}: RescheduleDeclinedEmailProps) {
  const teal = branding.brandColor;
  const emailStyles = buildEmailStyles(teal);
  return (
    <EmailLayout preview={`Reschedule declined — your ${eventName} is still confirmed`} productName={branding.appName} logoUrl={branding.logoUrl}>
      {/* Badge */}
      <Section style={{ marginBottom: "8px" }}>
        <Text
          style={{
            backgroundColor: "#FEE2E2",
            borderRadius: "4px",
            color: red,
            display: "inline-block",
            fontSize: "12px",
            fontWeight: 700,
            letterSpacing: "0.05em",
            padding: "4px 10px",
            textTransform: "uppercase",
          }}
        >
          Reschedule Declined
        </Text>
      </Section>

      <Text style={{ ...emailStyles.heading, color: "#171717" }}>
        Your reschedule request wasn&apos;t approved
      </Text>

      <Text style={emailStyles.paragraph}>
        Hi {inviteeName}, {hostName} wasn&apos;t able to move your {eventName} to the
        new time you requested.
      </Text>

      {/* Reassurance — original meeting remains */}
      <Section
        style={{
          backgroundColor: "#F0FDF4",
          border: "1px solid #BBF7D0",
          padding: "14px 18px",
          marginBottom: "8px",
        }}
      >
        <Text style={{ ...emailStyles.paragraph, color: "#166534", margin: 0, fontWeight: 600 }}>
          Your original meeting is still confirmed.
        </Text>
      </Section>

      {reason && (
        <Section
          style={{
            backgroundColor: "#FEE2E2",
            borderLeft: `3px solid ${red}`,
            marginBottom: "16px",
            padding: "12px 16px",
          }}
        >
          <Text style={{ ...emailStyles.muted, margin: "0", fontWeight: 600 }}>
            Reason provided:
          </Text>
          <Text style={{ ...emailStyles.paragraph, margin: "4px 0 0" }}>{reason}</Text>
        </Section>
      )}

      <Hr style={{ borderColor: "#E5E7EB", margin: "20px 0" }} />

      {/* Details of the still-confirmed original meeting */}
      <Section>
        <DetailRow label="Event" value={eventName} />
        <DetailRow label="With" value={hostName} />
        <DetailRow label={`Date & Time (${canonicalizeTz(hostTimezone)})`} value={whenHost} />
        {canonicalizeTz(inviteeTimezone) !== canonicalizeTz(hostTimezone) && (
          <DetailRow label={`Date & Time (${canonicalizeTz(inviteeTimezone)})`} value={whenInvitee} />
        )}
        <DetailRow label="Location" value={locationLabel} href={locationLabel.startsWith("http") ? locationLabel : undefined} linkColor={teal} />
      </Section>

      <Text style={{ ...emailStyles.muted, textAlign: "center" as const, marginTop: "16px" }}>
        Feel free to reach out to {hostName} directly if you have questions.
      </Text>
    </EmailLayout>
  );
}

function DetailRow({ label, value, href, linkColor = emailBranding.brandColor }: { label: string; value: string; href?: string; linkColor?: string }) {
  const emailStyles = buildEmailStyles(linkColor);
  return (
    <Section style={{ marginBottom: "8px" }}>
      <Text style={{ ...emailStyles.muted, margin: "0" }}>{label}</Text>
      {href ? (
        <Link href={href} style={{ color: linkColor, fontSize: "14px", fontWeight: 600, display: "block", textDecoration: "underline" }}>
          View Location
        </Link>
      ) : (
        <Text style={{ ...emailStyles.paragraph, fontWeight: 600, margin: "2px 0 0" }}>
          {value}
        </Text>
      )}
    </Section>
  );
}
