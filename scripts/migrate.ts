import { existsSync } from "node:fs";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

// Production migration runner for the Docker `migrate` service — replaces
// `drizzle-kit migrate`, whose CLI was observed to exit 1 on failure without
// ever printing the underlying error (see
// docs/bugs/2026-07-24-bug-drizzle-kit-migrate-silent-failure.md). This uses
// the same `postgres`/drizzle-orm migrator `lib/db.ts` already depends on at
// runtime, with a plain try/catch that always logs whatever it caught.

if (existsSync(".env")) {
  process.loadEnvFile();
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("[migrate] DATABASE_URL is not set. Cannot run migrations.");
  process.exit(1);
}

const MAX_ATTEMPTS = 10;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Block until the database answers, with exponential backoff (2s → 30s). */
async function waitForDatabase(client: postgres.Sql) {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      await client`select 1`;
      return;
    } catch (error) {
      if (attempt === MAX_ATTEMPTS) {
        throw error;
      }
      const delay = Math.min(2000 * 2 ** (attempt - 1), 30_000);
      console.error(
        `[migrate] database unreachable (${attempt}/${MAX_ATTEMPTS}); retrying in ${delay / 1000}s`
      );
      await sleep(delay);
    }
  }
}

async function main() {
  const client = postgres(databaseUrl as string, { max: 1 });

  try {
    await waitForDatabase(client);
    console.log("[migrate] applying migrations from ./db/migrations …");
    await migrate(drizzle(client), { migrationsFolder: "./db/migrations" });
    console.log("[migrate] done.");
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error("[migrate] failed:", error);
  process.exit(1);
});
