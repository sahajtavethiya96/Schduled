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

export type BookingEmailVariant =
  | "confirmation"
  | "cancellation"
  | "reschedule";
export type BookingEmailAudience = "invitee" | "host";

export interface BookingEmailProps {
  audience: BookingEmailAudience;
  branding?: EmailBranding;
  cancelUrl: string | null; // invitee only
  confirmationNote: string | null; // confirmation invitee only
  eventName: string;
  hostTimezone: string;
  inviteeTimezone: string;
  locationLabel: string;
  locationType: string; // e.g. "google_meet" | "zoom" | "phone_host_calls" | …
  locationUrl?: string | null;
  meetLabel: string; // button text, e.g. "Join Google Meet" / "Join Zoom Meeting"
  meetLink: string | null;
  meetPassword?: string | null;
  otherPartyName: string; // invitee email → host name; host email → invitee name
  previousWhen: string | null; // reschedule only — old time (invitee tz)
  reason: string | null; // cancellation only
  recipientName: string;
  rescheduleUrl: string | null; // invitee only
  variant: BookingEmailVariant;
  whenHost: string; // formatted in host tz
  whenInvitee: string; // formatted in invitee tz
}

const red = "#EF4444";
const bg = "#F3F7F6";
const white = "#ffffff";
const text1 = "#171717";
const text2 = "#4B5563";
const border = "#D1FAE5";

// headerColor is "brand" for confirmation/reschedule (resolved against the
// live branding at render time) or a fixed literal (cancellation stays red
// regardless of brand color — it's a semantic/destructive state, not brand).
const COPY: Record<
  BookingEmailVariant,
  {
    badge: string;
    headerColor: "brand" | string;
    preview: (p: BookingEmailProps) => string;
    heading: (p: BookingEmailProps) => string;
    intro: (p: BookingEmailProps) => string;
  }
> = {
  confirmation: {
    badge: "Booking confirmed",
    headerColor: "brand",
    preview: (p) => `Confirmed: ${p.eventName} with ${p.otherPartyName}`,
    heading: (p) => `Hi ${p.recipientName},`,
    intro: (p) =>
      p.audience === "invitee"
        ? `Your booking for ${p.eventName} with ${p.otherPartyName} is confirmed. Details are below.`
        : `${p.otherPartyName} just booked ${p.eventName}. Details are below.`,
  },
  cancellation: {
    badge: "Booking cancelled",
    headerColor: red,
    preview: (p) => `Cancelled: ${p.eventName} with ${p.otherPartyName}`,
    heading: (p) => `Hi ${p.recipientName},`,
    intro: (p) =>
      p.audience === "invitee"
        ? `Your booking for ${p.eventName} with ${p.otherPartyName} has been cancelled.`
        : `${p.otherPartyName}'s booking for ${p.eventName} has been cancelled.`,
  },
  reschedule: {
    badge: "Booking rescheduled",
    headerColor: "brand",
    preview: (p) => `Rescheduled: ${p.eventName} with ${p.otherPartyName}`,
    heading: (p) => `Hi ${p.recipientName},`,
    intro: (p) =>
      p.audience === "invitee"
        ? `Your booking for ${p.eventName} with ${p.otherPartyName} has been rescheduled to a new time.`
        : `${p.otherPartyName}'s booking for ${p.eventName} has been rescheduled.`,
  },
};

export function BookingEmail(props: BookingEmailProps) {
  const branding = props.branding ?? emailBranding;
  const copy = COPY[props.variant];
  const headerColor =
    copy.headerColor === "brand" ? branding.brandColor : copy.headerColor;
  const showManage =
    props.variant !== "cancellation" &&
    props.audience === "invitee" &&
    (props.rescheduleUrl || props.cancelUrl);
  const showMeet = props.variant !== "cancellation" && props.meetLink;

  // A video meeting whose link couldn't be generated (e.g. the host hasn't
  // connected Google Meet / Zoom). Surface a clear message instead of a
  // silently missing link.
  const VIDEO_TYPES = ["google_meet", "zoom", "teams"];
  const linkMissing =
    props.variant !== "cancellation" &&
    !props.meetLink &&
    VIDEO_TYPES.includes(props.locationType);
  const providerName =
    props.locationType === "google_meet"
      ? "Google Meet"
      : props.locationType === "zoom"
        ? "Zoom"
        : props.locationType === "teams"
          ? "Microsoft Teams"
          : "video";

  return (
    <Html>
      <Head />
      <Preview>{copy.preview(props)}</Preview>
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
          {/* Header */}
          <Section
            style={{ backgroundColor: headerColor, padding: "28px 32px" }}
          >
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
                color: "rgba(255,255,255,0.9)",
                fontSize: "14px",
                margin: "6px 0 0",
              }}
            >
              {copy.badge}
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
              {copy.heading(props)}
            </Text>
            <Text
              style={{ color: text2, fontSize: "15px", margin: "0 0 24px" }}
            >
              {copy.intro(props)}
            </Text>

            {/* Details card */}
            <Section
              style={{
                backgroundColor: bg,
                border: `1px solid ${border}`,
                padding: "20px 24px",
                marginBottom: "24px",
              }}
            >
              <Row label="Event" value={props.eventName} />
              <Row
                label={props.audience === "invitee" ? "Host" : "Invitee"}
                value={props.otherPartyName}
              />
              {props.variant === "reschedule" && props.previousWhen && (
                <Row label="Previous time" strike value={props.previousWhen} />
              )}
              <Row
                label={`${props.variant === "reschedule" ? "New time" : "Time"} (${canonicalizeTz(props.hostTimezone)})`}
                value={props.whenHost}
              />
              {canonicalizeTz(props.inviteeTimezone) !==
                canonicalizeTz(props.hostTimezone) && (
                <Row
                  label={`Time (${canonicalizeTz(props.inviteeTimezone)})`}
                  value={props.whenInvitee}
                />
              )}
              <Row
                href={
                  props.locationLabel.startsWith("http")
                    ? props.locationLabel
                    : undefined
                }
                label="Location"
                linkColor={branding.brandColor}
                value={props.locationLabel}
              />
              {props.variant === "cancellation" && props.reason && (
                <Row label="Reason" value={props.reason} />
              )}
            </Section>

            {/* Confirmation note (invitee only, confirmation variant) */}
            {props.confirmationNote && (
              <Section
                style={{
                  backgroundColor: "#F0FDF4",
                  border: "1px solid #BBF7D0",
                  padding: "16px 20px",
                  marginBottom: "24px",
                }}
              >
                <Text
                  style={{
                    color: "#166534",
                    fontSize: "13px",
                    margin: 0,
                    lineHeight: "1.6",
                  }}
                >
                  {props.confirmationNote}
                </Text>
              </Section>
            )}

            {/* Meet button */}
            {showMeet && (
              <Section style={{ textAlign: "center", marginBottom: "24px" }}>
                <a
                  href={props.meetLink!}
                  style={{
                    backgroundColor: branding.brandColor,
                    color: white,
                    display: "inline-block",
                    fontSize: "15px",
                    fontWeight: 700,
                    padding: "12px 28px",
                    textDecoration: "none",
                  }}
                >
                  {props.meetLabel}
                </a>
              </Section>
            )}

            {showMeet && props.meetPassword && (
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
                  {props.meetPassword}
                </Text>
              </Section>
            )}

            {/* Video link couldn't be generated — explain instead of silently
                omitting it. Invitee gets a reassuring note; host gets a fix-it
                warning. */}
            {linkMissing && (
              <Section
                style={{
                  backgroundColor: "#FFFBEB",
                  border: "1px solid #FDE68A",
                  padding: "14px 18px",
                  marginBottom: "24px",
                }}
              >
                <Text
                  style={{
                    color: "#92400E",
                    fontSize: "13px",
                    margin: 0,
                    lineHeight: "1.6",
                  }}
                >
                  {props.audience === "host"
                    ? `⚠ No ${providerName} link was generated for this meeting. Connect ${providerName} in Settings → Integrations so links are created automatically, then share the link with your invitee.`
                    : `The ${providerName} link isn't ready yet — ${props.otherPartyName} will share it with you before the meeting.`}
                </Text>
              </Section>
            )}

            {/* Manage links (invitee, non-cancelled) */}
            {showManage && (
              <>
                <Hr style={{ borderColor: border, margin: "24px 0" }} />
                <Text
                  style={{ color: text2, fontSize: "13px", margin: "0 0 4px" }}
                >
                  Need to make a change?
                </Text>
                <Text style={{ fontSize: "13px", margin: 0 }}>
                  {props.rescheduleUrl && (
                    <a
                      href={props.rescheduleUrl}
                      style={{
                        color: branding.brandColor,
                        marginRight: "16px",
                      }}
                    >
                      Reschedule
                    </a>
                  )}
                  {props.cancelUrl && (
                    <a href={props.cancelUrl} style={{ color: red }}>
                      Cancel
                    </a>
                  )}
                </Text>
              </>
            )}
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
  strike,
  href,
  linkColor = emailBranding.brandColor,
}: {
  label: string;
  value: string;
  strike?: boolean;
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
            textDecoration: strike ? "line-through" : "none",
          }}
        >
          {value}
        </Text>
      )}
    </Section>
  );
}
