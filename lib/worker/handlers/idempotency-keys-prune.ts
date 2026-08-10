import { lt } from "drizzle-orm";
import type { Job } from "pg-boss";
import { idempotencyKey } from "@/db/schema";
import { db } from "@/lib/db";

export async function handleIdempotencyKeysPrune(
  _jobs: Job<Record<string, never>>[]
) {
  await db
    .delete(idempotencyKey)
    .where(lt(idempotencyKey.expiresAt, new Date()));
}
