import { createElement } from "react";
import { getEmailBranding } from "@/lib/email/branding";
import { ResetPasswordEmail } from "@/lib/email/components/reset-password";
import { renderEmailTemplate } from "@/lib/email/renderer";

export async function resetPasswordTemplate({
  email,
  resetUrl,
}: {
  email: string;
  resetUrl: string;
}) {
  const branding = await getEmailBranding();

  const html = await renderEmailTemplate(
    createElement(ResetPasswordEmail, {
      email,
      resetUrl,
      branding,
    })
  );

  const text = `Reset your ${branding.appName} password

We received a request to reset the password for ${email}.
Use this link to choose a new password:
${resetUrl}

This link expires shortly and can only be used once. If you did not
request a password reset, you can ignore this email — your password
will not change.`;

  return { html, text };
}
