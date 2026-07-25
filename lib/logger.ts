import pino from "pino";

// One structured logger for both the web process and the worker process.
// Dev gets human-readable pretty-printed output; production emits plain JSON
// lines so a log aggregator (or `docker logs` piped through anything) can
// parse level/module/fields without regexing free-text console output.
//
// NODE_ENV alone isn't a safe gate here: it only reflects reality in code
// that goes through Next's build (webpack/turbopack inlines it as a literal
// "production" at build time). scripts/worker.ts runs straight through tsx
// with no bundler, so it reads whatever NODE_ENV the process actually has —
// and docker-compose's `env_file: .env` happily hands a dev `.env`'s
// NODE_ENV=development straight to the worker container. pino-pretty is a
// devDependency (never installed in the production image's `--prod`
// node_modules), so picking the pretty transport there crashes the worker
// before it processes a single job. Requiring an interactive TTY as well
// keeps pretty output to an actual dev terminal — Docker containers have no
// TTY unless `tty: true` is set, so a leaked NODE_ENV can no longer flip
// production runtime onto the dev-only transport.
const isDevTerminal = process.env.NODE_ENV !== "production" && process.stdout.isTTY === true;

export const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  transport: isDevTerminal
    ? { target: "pino-pretty", options: { colorize: true, translateTime: "SYS:HH:MM:ss", ignore: "pid,hostname" } }
    : undefined,
});

/** Scope a logger to a subsystem, e.g. `createLogger("worker")`. */
export function createLogger(module: string) {
  return logger.child({ module });
}
