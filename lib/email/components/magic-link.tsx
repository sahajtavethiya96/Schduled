import { Button, Link, Section, Text } from "react-email";
import { type EmailBranding, emailBranding } from "@/lib/email/branding";
import { buildEmailStyles, EmailLayout } from "@/lib/email/components/layout";

export function MagicLinkEmail({
  email,
  magicLinkUrl,
  branding = emailBranding,
}: {
  email: string;
  magicLinkUrl: string;
  branding?: EmailBranding;
}) {
  const productName = branding.appName;
  const emailStyles = buildEmailStyles(branding.brandColor);
  return (
    <EmailLayout
      logoUrl={branding.logoUrl}
      preview={`Sign in to ${productName}`}
      productName={productName}
    >
      <Text style={emailStyles.heading}>Sign in to {productName}</Text>
      <Text style={emailStyles.paragraph}>
        Use the button below to sign in as{" "}
        <strong style={{ color: "#171717" }}>{email}</strong>.
      </Text>
      <Section style={{ margin: "24px 0" }}>
        <Button href={magicLinkUrl} style={emailStyles.button}>
          Sign In
        </Button>
      </Section>
      <Text style={emailStyles.muted}>
        This link expires shortly and can only be used once.
      </Text>
      <Text style={emailStyles.fallbackLink}>
        If the button does not work, paste this link into your browser:{" "}
        <Link href={magicLinkUrl} style={emailStyles.link}>
          {magicLinkUrl}
        </Link>
      </Text>
    </EmailLayout>
  );
}
