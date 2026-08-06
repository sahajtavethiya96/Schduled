import nodemailer from "nodemailer";
import { getSmtpSettings, isSmtpConfigured } from "@/lib/integration-settings";

export interface SmtpAttachment {
  content: string;
  contentType: string;
  encoding?: "base64" | "utf8";
  filename: string;
}

export interface SmtpSendInput {
  attachments?: SmtpAttachment[];
  html: string;
  idempotencyKey?: string;
  subject: string;
  text?: string;
  to: string | string[];
}

export interface SmtpSendResult {
  id: string;
  status: string;
}

export { isSmtpConfigured };

export async function sendEmailViaSmtp(
  input: SmtpSendInput
): Promise<SmtpSendResult> {
  const settings = await getSmtpSettings();
  if (!settings) {
    console.log("[email:dev]", {
      subject: input.subject,
      text: input.text,
      to: input.to,
    });
    return {
      id: `dev_${input.idempotencyKey ?? Date.now()}`,
      status: "logged",
    };
  }

  const transporter = nodemailer.createTransport({
    host: settings.host,
    port: settings.port,
    secure: settings.secure,
    auth: {
      user: settings.user,
      pass: settings.pass,
    },
  });

  const info = await transporter.sendMail({
    from: settings.from,
    to: Array.isArray(input.to) ? input.to.join(", ") : input.to,
    subject: input.subject,
    html: input.html,
    text: input.text,
    headers: input.idempotencyKey
      ? { "X-Idempotency-Key": input.idempotencyKey }
      : undefined,
    attachments: input.attachments?.map((a) => ({
      filename: a.filename,
      content: a.content,
      contentType: a.contentType,
      encoding: a.encoding,
    })),
  });

  return {
    id: info.messageId ?? `smtp_${Date.now()}`,
    status: "sent",
  };
}
