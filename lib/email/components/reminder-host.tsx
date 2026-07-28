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
  dashboardUrl: string;
  eventName: string;
  hostName: string;
  hostTimezone: string;
  inviteeName: string;
  inviteeTime: string; // same meeting time in invitee tz
  inviteeTimezone: string;
  locationLabel: string;
  meetLabel: string; // "Start Google Meet" | "Start Zoom Meeting"
  meetPassword?: string | null;
  startFormatted: string; // e.g. "Monday, June 17, 2026 at 3:00 PM"
  startMeetLink: string | null; // Zoom start URL or Google Meet link
  timeUntil: string; // "24 hours" | "1 hour"
}

const bg = "#F3F7F6";
const white = "#ffffff";
const text1 = "#171717";
const text2 = "#4B5563";
const border = "#D1FAE5";
const amber = "#FEF3C7";
const amberBorder = "#FDE68A";
const amberText = "#92400E";

export function ReminderHostEmail({
  branding = emailBranding,
  hostName,
  inviteeName,
  eventName,
  startFormatted,
  hostTimezone,
  inviteeTime,
  inviteeTimezone,
  locationLabel,
  startMeetLink,
  meetLabel,
  meetPassword,
  timeUntil,
  dashboardUrl,
}: Props) {
  const teal = branding.brandColor;
  return (
    <Html>
      <Head />
      <Preview>
        Upcoming in {timeUntil}: {eventName} with {inviteeName}
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
              Host reminder
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
              Hi {hostName},
            </Text>
            <Text
              style={{ color: text2, fontSize: "15px", margin: "0 0 24px" }}
            >
              You have an upcoming <strong>{eventName}</strong> with{" "}
              <strong>{inviteeName}</strong> in <strong>{timeUntil}</strong>.
            </Text>

            {/* Amber heads-up banner */}
            <Section
              style={{
                backgroundColor: amber,
                border: `1px solid ${amberBorder}`,
                padding: "12px 16px",
                marginBottom: "20px",
              }}
            >
              <Text
                style={{
                  color: amberText,
                  fontSize: "13px",
                  fontWeight: 600,
                  margin: 0,
                }}
              >
                ⏰ Meeting starts in {timeUntil} — make sure you're ready!
              </Text>
            </Section>

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
              <Row label="With" value={inviteeName} />
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

            {/* Start meeting button */}
            {startMeetLink && (
              <Section style={{ textAlign: "center", marginBottom: "24px" }}>
                <a
                  href={startMeetLink}
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

            {startMeetLink && meetPassword && (
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

            <Text style={{ color: text2, fontSize: "13px", margin: 0 }}>
              This reminder was sent because you have an event scheduled on{" "}
              <strong>{branding.appName}</strong>. Manage your events at{" "}
              <a href={dashboardUrl} style={{ color: teal }}>
                your dashboard
              </a>
              .
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
