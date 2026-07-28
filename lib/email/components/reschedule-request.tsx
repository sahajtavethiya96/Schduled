import { Button, Hr, Link, Section, Text } from "react-email";
import { emailBranding, type EmailBranding } from "@/lib/email/branding";
import { buildEmailStyles, EmailLayout } from "./layout";

interface RescheduleRequestEmailProps {
  approveUrl: string;
  branding?: EmailBranding;
  currentWhenHost: string;
  eventName: string;
  hostName: string;
  hostTimezone: string;
  inviteeEmail: string;
  inviteeName: string;
  locationLabel: string;
  requestedWhenHost: string;
  reviewUrl: string;
}

export function RescheduleRequestEmail({
  approveUrl,
  branding = emailBranding,
  currentWhenHost,
  eventName,
  hostName,
  hostTimezone,
  inviteeEmail,
  inviteeName,
  locationLabel,
  requestedWhenHost,
  reviewUrl,
}: RescheduleRequestEmailProps) {
  const amber = "#D97706";
  const emailStyles = buildEmailStyles(branding.brandColor);

  return (
    <EmailLayout preview={`Reschedule request: ${eventName} with ${inviteeName}`} productName={branding.appName} logoUrl={branding.logoUrl}>
      {/* Badge */}
      <Section style={{ marginBottom: "8px" }}>
        <Text
          style={{
            backgroundColor: "#FEF3C7",
            borderRadius: "4px",
            color: amber,
            display: "inline-block",
            fontSize: "12px",
            fontWeight: 700,
            letterSpacing: "0.05em",
            padding: "4px 10px",
            textTransform: "uppercase",
          }}
        >
          Reschedule Requested
        </Text>
      </Section>

      <Text style={{ ...emailStyles.heading, color: "#171717" }}>
        {inviteeName} requested to reschedule
      </Text>

      <Text style={emailStyles.paragraph}>
        Hi {hostName}, {inviteeName} asked to move a confirmed meeting to a new
        time. The current meeting stays booked until you approve.
      </Text>

      <Hr style={{ borderColor: "#E5E7EB", margin: "20px 0" }} />

      {/* Current → Requested */}
      <Section>
        <DetailRow label="Event" value={eventName} />
        <DetailRow label="Requested by" value={`${inviteeName} (${inviteeEmail})`} />
        <DetailRow label={`Current (${hostTimezone})`} value={currentWhenHost} />
        <DetailRow label={`Requested (${hostTimezone})`} value={requestedWhenHost} />
        <DetailRow label="Location" value={locationLabel} href={locationLabel.startsWith("http") ? locationLabel : undefined} linkColor={branding.brandColor} />
      </Section>

      <Hr style={{ borderColor: "#E5E7EB", margin: "20px 0" }} />

      {/* Actions */}
      <Section style={{ textAlign: "center" as const }}>
        <Button
          href={approveUrl}
          style={{
            ...emailStyles.button,
            marginBottom: "12px",
            marginRight: "12px",
          }}
        >
          Approve
        </Button>
        <Button
          href={reviewUrl}
          style={{
            ...emailStyles.button,
            backgroundColor: "#374151",
          }}
        >
          Review &amp; Decline
        </Button>
      </Section>

      <Text style={{ ...emailStyles.muted, marginTop: "16px", textAlign: "center" as const }}>
        Rejecting keeps the current meeting exactly as it is. You can also manage
        this from your{" "}
        <a href={reviewUrl} style={emailStyles.link}>
          dashboard
        </a>
        .
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
