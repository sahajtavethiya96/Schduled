import { and, eq, lt } from "drizzle-orm";
import type { Job } from "pg-boss";
import { emailOutbox } from "@/db/schema";
import { db } from "@/lib/db";
import { enqueueJob } from "@/lib/worker/enqueue";
import { JOB_NAMES } from "@/lib/worker/job-types";

// Rows stuck in `sending` past this window mean the worker died mid-send
// (EMAIL_SEND has retryLimit 0, so pg-boss won't retry it on its own).
const STUCK_AFTER_MS = 30 * 60 * 1000;

export async function handleEmailOutboxReap(
  _jobs: Job<Record<string, never>>[]
) {
  const cutoff = new Date(Date.now() - STUCK_AFTER_MS);

  const stuck = await db
    .select({
      id: emailOutbox.id,
      attemptCount: emailOutbox.attemptCount,
      maxAttempts: emailOutbox.maxAttempts,
    })
    .from(emailOutbox)
    .where(
      and(eq(emailOutbox.status, "sending"), lt(emailOutbox.claimedAt, cutoff))
    );

  for (const row of stuck) {
    // Requeue while attempts remain; the status guard avoids racing with a
    // late-arriving send that already flipped the row to sent/failed.
    if (row.attemptCount < row.maxAttempts) {
      const [requeued] = await db
        .update(emailOutbox)
        .set({
          status: "queued",
          claimedAt: null,
          lastError:
            "Requeued by email.outbox-reap after the worker stalled mid-send.",
          updatedAt: new Date(),
        })
        .where(
          and(eq(emailOutbox.id, row.id), eq(emailOutbox.status, "sending"))
        )
        .returning({ id: emailOutbox.id });

      if (requeued) {
        await enqueueJob(JOB_NAMES.EMAIL_SEND, { outboxId: row.id });
      }
    } else {
      await db
        .update(emailOutbox)
        .set({
          status: "failed",
          lastError: "Stuck in sending and out of send attempts.",
          updatedAt: new Date(),
        })
        .where(
          and(eq(emailOutbox.id, row.id), eq(emailOutbox.status, "sending"))
        );
    }
  }
}
