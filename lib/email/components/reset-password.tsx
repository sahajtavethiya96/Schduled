import { Button, Link, Section, Text } from "react-email";
import { type EmailBranding, emailBranding } from "@/lib/email/branding";
import { buildEmailStyles, EmailLayout } from "@/lib/email/components/layout";

export function ResetPasswordEmail({
  email,
  resetUrl,
  branding = emailBranding,
}: {
  email: string;
  resetUrl: string;
  branding?: EmailBranding;
}) {
  const productName = branding.appName;
  const emailStyles = buildEmailStyles(branding.brandColor);
  return (
    <EmailLayout
      logoUrl={branding.logoUrl}
      preview={`Reset your ${productName} password`}
      productName={productName}
    >
      <Text style={emailStyles.heading}>Reset your password</Text>
      <Text style={emailStyles.paragraph}>
        We received a request to reset the password for{" "}
        <strong style={{ color: "#171717" }}>{email}</strong>. Use the button
        below to choose a new one.
      </Text>
      <Section style={{ margin: "24px 0" }}>
        <Button href={resetUrl} style={emailStyles.button}>
          Reset Password
        </Button>
      </Section>
      <Text style={emailStyles.muted}>
        This link expires shortly and can only be used once. If you did not
        request a password reset, you can safely ignore this email — your
        password will not change.
      </Text>
      <Text style={emailStyles.fallbackLink}>
        If the button does not work, paste this link into your browser:{" "}
        <Link href={resetUrl} style={emailStyles.link}>
          {resetUrl}
        </Link>
      </Text>
    </EmailLayout>
  );
}
