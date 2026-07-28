import { Section, Text } from "react-email";
import { emailBranding, type EmailBranding } from "@/lib/email/branding";
import { buildEmailStyles, EmailLayout } from "@/lib/email/components/layout";

export function DeleteConfirmationEmail({
  code,
  email,
  branding = emailBranding,
}: {
  code: string;
  email: string;
  branding?: EmailBranding;
}) {
  const productName = branding.appName;
  const emailStyles = buildEmailStyles(branding.brandColor);
  return (
    <EmailLayout
      preview={`${code} is your ${productName} account deletion code`}
      productName={productName}
      logoUrl={branding.logoUrl}
    >
      <Text style={emailStyles.heading}>Confirm account deletion</Text>
      <Text style={emailStyles.paragraph}>
        We received a request to permanently delete the {productName} account
        for <strong style={{ color: "#171717" }}>{email}</strong>.
      </Text>
      <Text style={emailStyles.paragraph}>
        Enter this code to confirm:
      </Text>

      {/* OTP code block */}
      <Section style={{ margin: "24px 0" }}>
        <div
          style={{
            backgroundColor: "#f6f4ef",
            border: "1px solid #ded8cc",
            borderRadius: "8px",
            display: "inline-block",
            fontFamily: "monospace",
            fontSize: "36px",
            fontWeight: 800,
            letterSpacing: "12px",
            padding: "16px 28px",
            textAlign: "center" as const,
          }}
        >
          {code}
        </div>
      </Section>

      <Text style={emailStyles.muted}>
        This code expires in <strong>15 minutes</strong>. If you did not
        request account deletion, you can safely ignore this email — your
        account will not be affected.
      </Text>
    </EmailLayout>
  );
}
