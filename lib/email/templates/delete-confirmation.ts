import { createElement } from "react";
import { getEmailBranding } from "@/lib/email/branding";
import { DeleteConfirmationEmail } from "@/lib/email/components/delete-confirmation";
import { renderEmailTemplate } from "@/lib/email/renderer";

export async function deleteConfirmationTemplate({
  code,
  email,
}: {
  code: string;
  email: string;
}) {
  const branding = await getEmailBranding();

  const html = await renderEmailTemplate(
    createElement(DeleteConfirmationEmail, {
      code,
      email,
      branding,
    })
  );

  const text = `Confirm account deletion — ${branding.appName}

Your confirmation code is: ${code}

This code expires in 15 minutes.

If you did not request account deletion, ignore this email — your account is safe.`;

  return { html, text };
}
