import { randomUUID } from "node:crypto";
import type { EmailAttachment } from "@/db/schema";
import { emailOutbox } from "@/db/schema";
import { db } from "@/lib/db";
import { enqueueJob } from "@/lib/worker/enqueue";
import { JOB_NAMES } from "@/lib/worker/job-types";

export interface SendEmailOptions {
  attachments?: EmailAttachment[];
  html: string;
  subject: string;
  text?: string;
  to: string;
}

export async function enqueueEmail(
  options: SendEmailOptions,
  jobOptions?: { startAfter?: Date; idempotencyKey?: string }
) {
  // A caller-supplied idempotencyKey makes the enqueue safe to repeat: if a
  // handler crashes after enqueuing and pg-boss retries it, the duplicate
  // insert is skipped (the key is uniquely indexed) instead of sending twice.
  const idempotencyKey = jobOptions?.idempotencyKey ?? randomUUID();

  const [row] = await db
    .insert(emailOutbox)
    .values({
      idempotencyKey,
      payload: options,
      status: "queued",
    })
    .onConflictDoNothing({ target: emailOutbox.idempotencyKey })
    .returning({ id: emailOutbox.id });

  // No row → an email with this key was already enqueued; don't double-send.
  if (!row) {
    return;
  }

  await enqueueJob(
    JOB_NAMES.EMAIL_SEND,
    { outboxId: row.id },
    { startAfter: jobOptions?.startAfter }
  );
}
