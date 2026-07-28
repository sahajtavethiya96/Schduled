import { createElement } from "react";
import { getEmailBranding } from "@/lib/email/branding";
import { MagicLinkEmail } from "@/lib/email/components/magic-link";
import { renderEmailTemplate } from "@/lib/email/renderer";

export async function magicLinkTemplate({
  email,
  magicLinkUrl,
}: {
  email: string;
  magicLinkUrl: string;
}) {
  const branding = await getEmailBranding();

  const html = await renderEmailTemplate(
    createElement(MagicLinkEmail, {
      email,
      magicLinkUrl,
      branding,
    })
  );

  const text = `Sign in to ${branding.appName}

Use this link to sign in as ${email}:
${magicLinkUrl}

If you did not request this link, you can ignore this email.`;

  return { html, text };
}
