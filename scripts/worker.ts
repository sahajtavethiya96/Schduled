import { existsSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

if (existsSync(".env")) {
  process.loadEnvFile();
}

// Docker's HEALTHCHECK has no visibility into the worker beyond "is the
// process alive" — this heartbeat file gives it a real liveness signal
// (checked in Dockerfile.worker, which expects /tmp/worker-heartbeat).
// tmpdir() resolves to that same path in the Linux container while still
// working for local dev on Windows. A wedged event loop stops updating it.
const HEARTBEAT_FILE = join(tmpdir(), "worker-heartbeat");
const HEARTBEAT_INTERVAL_MS = 15_000;

async function main() {
  await import("@/lib/env");
  const { startWorker, stopWorker } = await import("@/lib/worker/boss");
  const { createLogger } = await import("@/lib/logger");
  const log = createLogger("worker");

  log.info("Starting Schduled background worker...");
  await startWorker();

  const heartbeat = () => writeFileSync(HEARTBEAT_FILE, String(Date.now()));
  heartbeat();
  const heartbeatTimer = setInterval(heartbeat, HEARTBEAT_INTERVAL_MS);

  let shuttingDown = false;
  async function shutdown(signal: string) {
    if (shuttingDown) {
      return;
    }
    shuttingDown = true;
    clearInterval(heartbeatTimer);
    log.info({ signal }, "received shutdown signal; draining jobs");
    await stopWorker();
    process.exit(0);
  }

  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));
}

main().catch(async (error) => {
  const { createLogger } = await import("@/lib/logger");
  createLogger("worker").fatal({ err: error }, "worker failed to start");
  process.exit(1);
});
