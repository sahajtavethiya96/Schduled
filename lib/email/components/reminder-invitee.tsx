import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from "react-email";
import { type EmailBranding, emailBranding } from "@/lib/email/branding";
import { canonicalizeTz } from "@/lib/utils";

interface Props {
  branding?: EmailBranding;
  cancelUrl: string;
  eventName: string;
  hostName: string;
  hostTimezone: string;
  inviteeName: string;
  inviteeTime: string; // same meeting time in invitee tz
  inviteeTimezone: string;
  locationLabel: string;
  meetLabel: string;
  meetLink: string | null;
  meetPassword?: string | null;
  rescheduleUrl: string;
  startFormatted: string; // e.g. "Monday, June 17, 2026 at 3:00 PM"
  timeUntil: string; // e.g. "24 hours" or "1 hour"
}

const bg = "#F3F7F6";
const white = "#ffffff";
const text1 = "#171717";
const text2 = "#4B5563";
const border = "#D1FAE5";

export function ReminderInviteeEmail({
  branding = emailBranding,
  inviteeName,
  hostName,
  eventName,
  startFormatted,
  hostTimezone,
  inviteeTime,
  inviteeTimezone,
  locationLabel,
  meetLink,
  meetLabel,
  meetPassword,
  cancelUrl,
  rescheduleUrl,
  timeUntil,
}: Props) {
  const teal = branding.brandColor;
  return (
    <Html>
      <Head />
      <Preview>
        Reminder: Your {eventName} with {hostName} is in {timeUntil}
      </Preview>
      <Body
        style={{
          backgroundColor: bg,
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
          margin: 0,
        }}
      >
        <Container
          style={{
            backgroundColor: white,
            maxWidth: "560px",
            margin: "40px auto",
            border: `1px solid ${border}`,
          }}
        >
          {/* Teal header */}
          <Section style={{ backgroundColor: teal, padding: "28px 32px" }}>
            {branding.logoUrlWhite ? (
              <Img
                alt={branding.appName}
                height="36"
                src={branding.logoUrlWhite}
                style={{
                  display: "block",
                  marginBottom: "8px",
                  height: "36px",
                  maxWidth: "220px",
                  width: "auto",
                }}
              />
            ) : (
              <Text
                style={{
                  color: white,
                  fontSize: "18px",
                  fontWeight: 800,
                  margin: "0 0 8px",
                }}
              >
                {branding.appName}
              </Text>
            )}
            <Text
              style={{
                color: "rgba(255,255,255,0.85)",
                fontSize: "14px",
                margin: "6px 0 0",
              }}
            >
              Meeting reminder
            </Text>
          </Section>

          {/* Body */}
          <Section style={{ padding: "28px 32px" }}>
            <Text
              style={{
                color: text1,
                fontSize: "18px",
                fontWeight: 700,
                margin: "0 0 4px",
              }}
            >
              Hi {inviteeName},
            </Text>
            <Text
              style={{ color: text2, fontSize: "15px", margin: "0 0 24px" }}
            >
              This is a reminder that your <strong>{eventName}</strong> with{" "}
              <strong>{hostName}</strong> is coming up in{" "}
              <strong>{timeUntil}</strong>.
            </Text>

            {/* Meeting details card */}
            <Section
              style={{
                backgroundColor: bg,
                border: `1px solid ${border}`,
                padding: "20px 24px",
                marginBottom: "24px",
              }}
            >
              <Row label="Event" value={eventName} />
              <Row label="Host" value={hostName} />
              <Row
                label={`Time (${canonicalizeTz(hostTimezone)})`}
                value={startFormatted}
              />
              {canonicalizeTz(inviteeTimezone) !==
                canonicalizeTz(hostTimezone) && (
                <Row
                  label={`Time (${canonicalizeTz(inviteeTimezone)})`}
                  value={inviteeTime}
                />
              )}
              <Row
                href={
                  locationLabel.startsWith("http") ? locationLabel : undefined
                }
                label="Location"
                linkColor={teal}
                value={locationLabel}
              />
            </Section>

            {/* Meet link button */}
            {meetLink && (
              <Section style={{ textAlign: "center", marginBottom: "24px" }}>
                <a
                  href={meetLink}
                  style={{
                    backgroundColor: teal,
                    color: white,
                    display: "inline-block",
                    fontSize: "15px",
                    fontWeight: 700,
                    padding: "12px 28px",
                    textDecoration: "none",
                  }}
                >
                  {meetLabel}
                </a>
              </Section>
            )}

            {meetLink && meetPassword && (
              <Section style={{ textAlign: "center", marginBottom: "24px" }}>
                <Text
                  style={{
                    color: "#6B7280",
                    fontSize: "12px",
                    margin: "0 0 2px",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  Meeting Password
                </Text>
                <Text
                  style={{
                    color: text1,
                    fontSize: "16px",
                    fontWeight: 700,
                    margin: 0,
                  }}
                >
                  {meetPassword}
                </Text>
              </Section>
            )}

            <Hr style={{ borderColor: border, margin: "24px 0" }} />

            {/* Manage links */}
            <Text style={{ color: text2, fontSize: "13px", margin: "0 0 4px" }}>
              Need to make a change?
            </Text>
            <Text style={{ fontSize: "13px", margin: 0 }}>
              <a
                href={rescheduleUrl}
                style={{ color: teal, marginRight: "16px" }}
              >
                Reschedule
              </a>
              <a href={cancelUrl} style={{ color: "#EF4444" }}>
                Cancel
              </a>
            </Text>
          </Section>

          {/* Footer */}
          <Section
            style={{
              backgroundColor: bg,
              padding: "16px 32px",
              borderTop: `1px solid ${border}`,
            }}
          >
            <Text
              style={{
                color: text2,
                fontSize: "12px",
                margin: 0,
                textAlign: "center",
              }}
            >
              © {branding.appName}
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

function Row({
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
  return (
    <Section style={{ marginBottom: "8px" }}>
      <Text
        style={{
          color: "#6B7280",
          fontSize: "12px",
          margin: "0 0 1px",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
        }}
      >
        {label}
      </Text>
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
            color: "#111827",
            fontSize: "14px",
            fontWeight: 600,
            margin: 0,
          }}
        >
          {value}
        </Text>
      )}
    </Section>
  );
}
