import { Button, Hr, Link, Section, Text } from "react-email";
import { type EmailBranding, emailBranding } from "@/lib/email/branding";
import { buildEmailStyles, EmailLayout } from "./layout";

interface ApprovalRequestEmailProps {
  approveUrl: string;
  branding?: EmailBranding;
  eventName: string;
  hostName: string;
  hostTimezone: string;
  inviteeEmail: string;
  inviteeName: string;
  locationLabel: string;
  reviewUrl: string;
  whenHost: string;
}

export function ApprovalRequestEmail({
  approveUrl,
  branding = emailBranding,
  eventName,
  hostName,
  inviteeEmail,
  inviteeName,
  locationLabel,
  reviewUrl,
  whenHost,
  hostTimezone,
}: ApprovalRequestEmailProps) {
  const amber = "#D97706";
  const emailStyles = buildEmailStyles(branding.brandColor);

  return (
    <EmailLayout
      logoUrl={branding.logoUrl}
      preview={`New booking request: ${eventName} with ${inviteeName}`}
      productName={branding.appName}
    >
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
          Booking Request
        </Text>
      </Section>

      <Text style={{ ...emailStyles.heading, color: "#171717" }}>
        New request from {inviteeName}
      </Text>

      <Text style={emailStyles.paragraph}>
        Hi {hostName}, someone wants to book time with you. Review the details
        below and approve or decline.
      </Text>

      <Hr style={{ borderColor: "#E5E7EB", margin: "20px 0" }} />

      {/* Details */}
      <Section>
        <DetailRow label="Event" value={eventName} />
        <DetailRow
          label="Requested by"
          value={`${inviteeName} (${inviteeEmail})`}
        />
        <DetailRow
          label="Date & Time"
          value={`${whenHost} (${hostTimezone})`}
        />
        <DetailRow
          href={locationLabel.startsWith("http") ? locationLabel : undefined}
          label="Location"
          linkColor={branding.brandColor}
          value={locationLabel}
        />
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

      <Text
        style={{
          ...emailStyles.muted,
          marginTop: "16px",
          textAlign: "center" as const,
        }}
      >
        You can also manage this request from your{" "}
        <a href={reviewUrl} style={emailStyles.link}>
          dashboard
        </a>
        .
      </Text>
    </EmailLayout>
  );
}

function DetailRow({
  label,
  value,
  href,
  linkColor = emailBranding.brandColor,
}: {
  label: string;
  value: string;
  href?: string;
  linkColor?: string;
}) {
  const emailStyles = buildEmailStyles(linkColor);
  return (
    <Section style={{ marginBottom: "8px" }}>
      <Text style={{ ...emailStyles.muted, margin: "0" }}>{label}</Text>
      {href ? (
        <Link
          href={href}
          style={{
            color: linkColor,
            fontSize: "14px",
            fontWeight: 600,
            display: "block",
            textDecoration: "underline",
          }}
        >
          View Location
        </Link>
      ) : (
        <Text
          style={{
            ...emailStyles.paragraph,
            fontWeight: 600,
            margin: "2px 0 0",
          }}
        >
          {value}
        </Text>
      )}
    </Section>
  );
}
