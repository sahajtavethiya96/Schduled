"use server";

import { PRODUCT_NAME } from "@/config/platform";
import { enqueueEmail } from "@/lib/email";
import { env } from "@/lib/env";
import { escapeHtml } from "@/lib/validators";

interface ContactResult {
  error?: string;
  ok: boolean;
}

export async function sendContactMessageAction(
  _prev: ContactResult,
  formData: FormData
): Promise<ContactResult> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const subject = String(formData.get("subject") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();

  if (!name || !email || !subject || !message) {
    return { ok: false, error: "All fields are required." };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: "Please enter a valid email address." };
  }
  if (message.length < 20) {
    return { ok: false, error: "Message must be at least 20 characters." };
  }

  // Escape all user-supplied values before interpolating into the HTML email.
  const eName = escapeHtml(name);
  const eEmail = escapeHtml(email);
  const eSubject = escapeHtml(subject);
  const eMessage = escapeHtml(message);

  const html = `
    <div style="font-family:ui-sans-serif,system-ui,sans-serif;max-width:600px;margin:0 auto;padding:32px;background:#fff;border:1px solid #e5e7eb;">
      <div style="background:#0D9488;padding:20px 24px;margin-bottom:24px;">
        <p style="color:#fff;font-size:18px;font-weight:700;margin:0;">New Contact Message</p>
        <p style="color:rgba(255,255,255,0.75);font-size:13px;margin:4px 0 0;">via ${PRODUCT_NAME} contact form</p>
      </div>
      <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
        <tr><td style="padding:8px 0;font-size:12px;color:#6B7280;text-transform:uppercase;letter-spacing:0.05em;font-weight:600;width:80px;">From</td><td style="padding:8px 0;font-size:14px;color:#111827;font-weight:600;">${eName} &lt;${eEmail}&gt;</td></tr>
        <tr><td style="padding:8px 0;font-size:12px;color:#6B7280;text-transform:uppercase;letter-spacing:0.05em;font-weight:600;">Subject</td><td style="padding:8px 0;font-size:14px;color:#111827;">${eSubject}</td></tr>
      </table>
      <div style="background:#F9FAFB;border-left:3px solid #0D9488;padding:16px 20px;margin-bottom:24px;">
        <p style="font-size:14px;line-height:1.6;color:#374151;margin:0;white-space:pre-wrap;">${eMessage}</p>
      </div>
      <p style="font-size:12px;color:#9CA3AF;margin:0;">Reply directly to this email to respond to ${eName}.</p>
    </div>
  `;

  try {
    await enqueueEmail({
      to: env.CONTACT_EMAIL ?? env.SMTP_USER ?? "hello@schduled.com",
      subject: `[Contact] ${subject}`,
      html,
      text: `From: ${name} <${email}>\nSubject: ${subject}\n\n${message}`,
    });
    return { ok: true };
  } catch (err) {
    console.error("[contact form]", err);
    return { ok: false, error: "Failed to send message. Please try again." };
  }
}
