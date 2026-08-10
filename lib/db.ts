import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@/db/schema";
import { env } from "@/lib/env";

export const dbClient = postgres(env.DATABASE_URL, {
  max: env.DB_POOL_MAX,
  idle_timeout: 30,
  connect_timeout: 10,
});

export const db = drizzle(dbClient, { schema });

// Retries with backoff to smooth over Docker Compose startup ordering
// (Postgres not yet accepting connections when web starts). Bounded and
// non-fatal — a genuine outage still surfaces via normal query-time errors.
export async function waitForDatabase(maxRetries = 10) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await dbClient`select 1`;
      return;
    } catch (error) {
      if (attempt === maxRetries) {
        console.error(`[db] not reachable after ${maxRetries} attempts`, error);
        return;
      }
      const delay = Math.min(1000 * 2 ** (attempt - 1), 15_000);
      console.error(
        `[db] connection attempt ${attempt}/${maxRetries} failed; retrying in ${delay / 1000}s`
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}
