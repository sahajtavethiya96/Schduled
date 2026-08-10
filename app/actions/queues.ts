"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { emailOutbox } from "@/db/schema";
import { requireAdmin } from "@/lib/authz";
import { db, dbClient } from "@/lib/db";
import { enqueueJob } from "@/lib/worker/enqueue";
import { JOB_NAMES } from "@/lib/worker/job-types";
import {
  getQueueJobs,
  getQueueStats,
  type QueueJobRow,
  type QueueStats,
} from "@/lib/worker/queue-inspection";

const JOBS_PAGE_SIZE = 20;

export async function getQueueJobsAction({
  queue,
  state,
  search,
  page = 1,
}: {
  queue: string;
  state?: string;
  search?: string;
  page?: number;
}): Promise<{ rows: QueueJobRow[]; total: number; pageSize: number }> {
  await requireAdmin();
  const result = await getQueueJobs({
    queue,
    state: state && state !== "all" ? state : undefined,
    search,
    page,
    pageSize: JOBS_PAGE_SIZE,
  });
  return { ...result, pageSize: JOBS_PAGE_SIZE };
}

export async function getQueueStatsAction(queue: string): Promise<QueueStats> {
  await requireAdmin();
  return getQueueStats(queue);
}

// Reset a single job back to `created` so the worker picks it up again.
export async function retryJobAction({
  queue,
  jobId,
}: {
  queue: string;
  jobId: string;
}): Promise<void> {
  await requireAdmin();
  try {
    await dbClient`
      update pgboss.job
      set state        = 'created',
          retry_count  = 0,
          output       = null,
          completed_on = null,
          started_on   = null
      where id = ${jobId}
        and name = ${queue}
        and state in ('failed', 'cancelled')
    `;
  } catch {
    // pgboss schema may not exist yet — silently ignore
  }
  revalidatePath("/settings/jobs");
}

export async function retryFailedJobsAction(queueName: string): Promise<void> {
  await requireAdmin();

  // A permanently-failed email leaves its pg-boss job `completed` (the handler
  // returns normally) and records the failure on the email_outbox row instead,
  // so resetting pg-boss `failed` jobs would retry nothing — requeue the
  // outbox rows and enqueue fresh send jobs instead.
  if (queueName === JOB_NAMES.EMAIL_SEND) {
    const failed = await db
      .update(emailOutbox)
      .set({
        attemptCount: 0,
        claimedAt: null,
        status: "queued",
        updatedAt: new Date(),
      })
      .where(eq(emailOutbox.status, "failed"))
      .returning({ id: emailOutbox.id });

    await Promise.allSettled(
      failed.map((row) =>
        enqueueJob(JOB_NAMES.EMAIL_SEND, { outboxId: row.id })
      )
    );

    revalidatePath("/settings/jobs");
    return;
  }

  try {
    await dbClient`
      UPDATE pgboss.job
      SET state        = 'created',
          retry_count  = 0,
          output       = NULL,
          completed_on = NULL,
          started_on   = NULL
      WHERE name  = ${queueName}
        AND state = 'failed'
    `;
  } catch {
    // pgboss schema may not exist yet — silently ignore
  }
  revalidatePath("/settings/jobs");
}
