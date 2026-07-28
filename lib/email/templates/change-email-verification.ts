import { createElement } from "react";
import { getEmailBranding } from "@/lib/email/branding";
import { ChangeEmailVerificationEmail } from "@/lib/email/components/change-email-verification";
import { renderEmailTemplate } from "@/lib/email/renderer";

export async function changeEmailVerificationTemplate({
  newEmail,
  verificationUrl,
}: {
  newEmail: string;
  verificationUrl: string;
}) {
  const branding = await getEmailBranding();

  const html = await renderEmailTemplate(
    createElement(ChangeEmailVerificationEmail, {
      newEmail,
      verificationUrl,
      branding,
    })
  );

  const text = `Confirm your new ${branding.appName} email address

We received a request to change your account email to ${newEmail}.
Use this link to confirm — your sign-in email won't change until you do:
${verificationUrl}

This link expires shortly and can only be used once. If you did not
request this change, you can ignore this email — your email will not change.`;

  return { html, text };
}
