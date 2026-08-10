import pino from "pino";

// Dev gets pretty-printed output; production emits JSON lines for log
// aggregators. NODE_ENV alone isn't a safe gate: scripts/worker.ts runs via
// tsx (no bundler) and can inherit a dev NODE_ENV from docker-compose's env
// file. pino-pretty is a devDependency (absent from the prod image), so also
// requiring a TTY stops a leaked dev NODE_ENV from crashing the worker.
const isDevTerminal =
  process.env.NODE_ENV !== "production" && process.stdout.isTTY === true;

export const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  transport: isDevTerminal
    ? {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "SYS:HH:MM:ss",
          ignore: "pid,hostname",
        },
      }
    : undefined,
});

/** Scope a logger to a subsystem, e.g. `createLogger("worker")`. */
export function createLogger(module: string) {
  return logger.child({ module });
}
