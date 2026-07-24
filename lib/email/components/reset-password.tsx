import { Button, Link, Section, Text } from "react-email";
import { PRODUCT_NAME } from "@/config/platform";
import { getAppUrl } from "@/lib/get-app-url";
import { EmailLayout, emailStyles } from "@/lib/email/components/layout";

export function ResetPasswordEmail({
  email,
  resetUrl,
  productName = PRODUCT_NAME,
}: {
  email: string;
  resetUrl: string;
  productName?: string;
}) {
  const logoUrl = `${getAppUrl()}/email-logo.png`;

  return (
    <EmailLayout
      preview={`Reset your ${productName} password`}
      productName={productName}
      logoUrl={logoUrl}
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
