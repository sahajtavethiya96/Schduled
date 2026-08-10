import { sql } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { db, dbClient } from "@/lib/db";
import { checkRateLimit } from "./helpers";

// Integration tests against the real dev database — the point is to prove
// the atomic upsert behaves correctly, which an in-memory mock couldn't verify.

const TEST_KEY_PREFIX = "vitest:rate-limit:";

async function cleanupTestBuckets() {
  await db.execute(
    sql`DELETE FROM rate_limit_bucket WHERE key LIKE ${TEST_KEY_PREFIX + "%"}`
  );
}

beforeEach(cleanupTestBuckets);
afterAll(async () => {
  await cleanupTestBuckets();
  await dbClient.end();
});

describe("checkRateLimit", () => {
  it("allows requests up to the limit, then blocks", async () => {
    const key = `${TEST_KEY_PREFIX}basic`;
    const results: boolean[] = [];
    for (let i = 0; i < 5; i++) {
      results.push(await checkRateLimit(key, 3, 60_000));
    }
    expect(results).toEqual([true, true, true, false, false]);
  });

  it("tracks separate buckets per key independently", async () => {
    const keyA = `${TEST_KEY_PREFIX}a`;
    const keyB = `${TEST_KEY_PREFIX}b`;

    expect(await checkRateLimit(keyA, 1, 60_000)).toBe(true);
    expect(await checkRateLimit(keyA, 1, 60_000)).toBe(false);
    // A different key's bucket must not be affected by keyA's usage.
    expect(await checkRateLimit(keyB, 1, 60_000)).toBe(true);
  });

  it("resets the count once the window has expired", async () => {
    const key = `${TEST_KEY_PREFIX}expiring`;

    expect(await checkRateLimit(key, 1, 60_000)).toBe(true);
    expect(await checkRateLimit(key, 1, 60_000)).toBe(false);

    // Simulate the window having already elapsed by backdating reset_at,
    // rather than sleeping the test for real.
    await db.execute(sql`
      UPDATE rate_limit_bucket SET reset_at = now() - interval '1 second' WHERE key = ${key}
    `);

    expect(await checkRateLimit(key, 1, 60_000)).toBe(true);
  });

  it("serializes concurrent hits on the same key without over-allowing", async () => {
    const key = `${TEST_KEY_PREFIX}concurrent`;
    const limit = 5;

    const results = await Promise.all(
      Array.from({ length: 10 }, () => checkRateLimit(key, limit, 60_000))
    );

    const allowedCount = results.filter(Boolean).length;
    expect(allowedCount).toBe(limit);
  });
});
