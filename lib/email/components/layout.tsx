import type { ReactNode } from "react";
import {
  Body,
  Container,
  Head,
  Html,
  Img,
  Preview,
  Section,
  Text,
} from "react-email";
import { type EmailBranding, emailBranding } from "@/lib/email/branding";

/**
 * Styles that depend on the brand color. Build fresh per email render from
 * the resolved `EmailBranding` (which may include an admin-set DB override —
 * see lib/email/branding.ts) rather than reading a module-level constant, so
 * a running worker process picks up an admin's change on the next email
 * instead of being stuck with whatever was true when the process started.
 */
export function buildEmailStyles(brandColor: string) {
  return {
    body: {
      backgroundColor: "#f6f4ef",
      color: "#171717",
      fontFamily:
        'Geist, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    },
    button: {
      backgroundColor: brandColor,
      borderRadius: "0",
      color: "#ffffff",
      display: "inline-block",
      fontSize: "14px",
      fontWeight: 700,
      padding: "12px 18px",
      textDecoration: "none",
    },
    container: {
      backgroundColor: "#ffffff",
      border: "1px solid #ded8cc",
      borderRadius: "0",
      margin: "40px auto",
      maxWidth: "560px",
      padding: "32px",
    },
    fallbackLink: {
      color: "#5c554a",
      fontSize: "12px",
      lineHeight: "20px",
    },
    heading: {
      fontSize: "24px",
      fontWeight: 800,
      letterSpacing: "0",
      lineHeight: "32px",
      margin: "0 0 16px",
    },
    link: { color: brandColor },
    muted: {
      color: "#6b665d",
      fontSize: "13px",
      lineHeight: "22px",
    },
    paragraph: {
      color: "#2c2a26",
      fontSize: "15px",
      lineHeight: "24px",
    },
  };
}

/** Env/default-only styles — a safe fallback for callers that don't build their own via `buildEmailStyles`. */
export const emailStyles = buildEmailStyles(emailBranding.brandColor);

export function EmailLayout({
  children,
  logoUrl = emailBranding.logoUrl,
  preview,
  productName = emailBranding.appName,
}: {
  children: ReactNode;
  logoUrl?: string | null;
  preview: string;
  productName?: string;
}) {
  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body style={emailStyles.body}>
        <Container style={emailStyles.container}>
          <Section style={{ marginBottom: "24px" }}>
            {logoUrl ? (
              <Img
                alt={productName}
                height="36"
                src={logoUrl}
                style={{
                  display: "block",
                  height: "36px",
                  maxWidth: "220px",
                  width: "auto",
                }}
              />
            ) : (
              <Text style={{ fontWeight: 900, letterSpacing: "0" }}>
                {productName}
              </Text>
            )}
          </Section>
          {children}
        </Container>
      </Body>
    </Html>
  );
}

export type { EmailBranding };
