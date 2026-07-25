import { Button, Link, Section, Text } from "react-email";
import { PRODUCT_NAME } from "@/config/platform";
import { EmailLayout, emailStyles } from "@/lib/email/components/layout";
import { getAppUrl } from "@/lib/get-app-url";

export function ChangeEmailVerificationEmail({
  newEmail,
  verificationUrl,
  productName = PRODUCT_NAME,
}: {
  newEmail: string;
  verificationUrl: string;
  productName?: string;
}) {
  const logoUrl = `${getAppUrl()}/email-logo.png`;

  return (
    <EmailLayout
      logoUrl={logoUrl}
      preview={`Confirm your new ${productName} email address`}
      productName={productName}
    >
      <Text style={emailStyles.heading}>Confirm your new email address</Text>
      <Text style={emailStyles.paragraph}>
        We received a request to change your {productName} account email to{" "}
        <strong style={{ color: "#171717" }}>{newEmail}</strong>. Use the button
        below to confirm — your sign-in email won't change until you do.
      </Text>
      <Section style={{ margin: "24px 0" }}>
        <Button href={verificationUrl} style={emailStyles.button}>
          Confirm Email Change
        </Button>
      </Section>
      <Text style={emailStyles.muted}>
        This link expires shortly and can only be used once. If you did not
        request this change, you can safely ignore this email — your account's
        email will not change.
      </Text>
      <Text style={emailStyles.fallbackLink}>
        If the button does not work, paste this link into your browser:{" "}
        <Link href={verificationUrl} style={emailStyles.link}>
          {verificationUrl}
        </Link>
      </Text>
    </EmailLayout>
  );
}
