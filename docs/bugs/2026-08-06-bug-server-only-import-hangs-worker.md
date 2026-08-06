# Bug: `server-only` import in `lib/integration-settings.ts` silently hung the background worker, blocking all emails and scheduled jobs

**Found:** 2026-08-06, reported by the user — they configured SMTP via the new `/settings/services` page (Mailtrap credentials), booked a test meeting, and got no confirmation email or in-app notification at all.

**Where:** `lib/integration-settings.ts` (the module added earlier this session for DB-backed integration settings), consumed by `lib/smtp/client.ts`, `lib/zoom/client.ts`, `lib/google/client.ts`, and `lib/storage.ts` — all of which are imported, directly or transitively, by `scripts/worker.ts` (the pg-boss background worker, run via `tsx --watch scripts/worker.ts`, a separate process from the Next.js app).

**How it was found:** `email_outbox` had zero rows for the user's booking despite the booking itself being created and confirmed correctly. Traced the booking-creation code (`app/api/bookings/route.ts`) and confirmed it correctly enqueues a `booking.confirmation` pg-boss job. Checked `pgboss.job` directly and found the job (and 6 siblings for the same booking) permanently stuck in `state='created'` — never picked up. Checked the worker process: it was alive per `ps`, but `/tmp/worker-heartbeat` (written right after `startWorker()` resolves) had been stale for over an hour, and no job of any kind — not even the 10–20 minute cron health-checks — had completed in that entire window. Manually restarting the worker in the foreground (instead of backgrounded, so its stdout was visible) surfaced the real error immediately:

```
Error [ERR_MODULE_NOT_FOUND]: Cannot find package 'server-only' imported from
/home/master/Smit/Schduled/lib/integration-settings.ts
```

**Root cause:** `lib/integration-settings.ts` had `import "server-only";` at the top — a pattern copied from `lib/setup.ts`, which also uses it safely. The difference: `server-only` is a virtual/aliased module that only resolves inside Next.js's own bundler (webpack/Turbopack) — it is *not* a real installed package (confirmed: absent from `node_modules` anywhere in the dependency tree except as a `next` sub-dependency Next's bundler special-cases). `lib/setup.ts` is only ever imported by a Next.js page component, so it never hits this problem. `lib/integration-settings.ts`, however, is imported by four `lib/*.ts` modules that are *shared* between the Next.js app and the standalone worker process (`scripts/worker.ts`, run via plain `tsx`, with no Next.js bundler involved at all) — so the moment any worker code path imported it, `tsx`'s plain Node ESM resolution threw `ERR_MODULE_NOT_FOUND`.

Compounding this: `tsx --watch` does **not** exit or crash-loop visibly on this kind of startup error — it logs the failure once and then sits idle waiting for the next file save, while the process itself stays alive and shows as running in `ps`. With the worker running in the background (as it is under the project's normal `pnpm dev`, which uses `concurrently` to run Next.js and the worker together with interleaved output), this failure was easy to miss — there was no crash, no restart loop, just a permanently stalled queue.

**Impact while broken:** every booking-lifecycle job — confirmation emails, host notifications, calendar writes, reminders, follow-ups, reschedule notices — silently queued in Postgres and never executed, for as long as the worker had been in this state (roughly 12:34 to 14:42 in this session, but in a real deployment this would persist indefinitely until someone noticed and restarted the process).
