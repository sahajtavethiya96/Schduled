import { NextResponse } from "next/server";
import { dbClient } from "@/lib/db";
import { createLogger } from "@/lib/logger";

const log = createLogger("health");

// Checks real DB connectivity, not just "the process is alive" — a Next.js
// process can be up while unable to reach Postgres.
export async function GET() {
  try {
    await dbClient`select 1`;
    return NextResponse.json({ status: "ok" });
  } catch (error) {
    log.error({ err: error }, "database check failed");
    return NextResponse.json({ status: "error" }, { status: 503 });
  }
}
