# Solution: `server-only` import in `lib/integration-settings.ts` silently hung the background worker, blocking all emails and scheduled jobs

**Fixed:** 2026-08-06

**Files changed:** `lib/integration-settings.ts`

**What changed:** Removed the `import "server-only";` line. Nothing else in the file changed — the module's exports and behavior are identical; the guard was purely a compile-time safety net against accidental client-bundle inclusion, and this module (DB access + decryption) is never imported by any client component in the first place.

**Why this fixes the root cause:** The guard was actively harmful here, not just unnecessary — this module is legitimately shared between two different runtimes (the Next.js app, where `server-only` resolves fine via the bundler, and the standalone `tsx`-run worker process, where it doesn't resolve at all). Removing it makes the module resolvable in both. The three other files in this codebase that still use `import "server-only"` (`lib/setup.ts`, `lib/holidays.ts`, and the string appears in a comment in `lib/env.ts` — not an actual import there) were checked and confirmed to never be imported, directly or transitively, by `scripts/worker.ts` — so they're safe as-is and this fix doesn't need to touch them.

**Verified:**
- `tsc --noEmit` — clean.
- Killed the hung worker process and restarted `tsx --watch scripts/worker.ts` in the foreground with stdout visible — it now starts cleanly (`pg-boss started` → handler registration → `/tmp/worker-heartbeat` updating every few seconds) with no error.
- All 7 jobs that had been stuck in `pgboss.job` with `state='created'` for the user's test booking (`booking.confirmation`, `booking.calendar-write`, `booking.calendar-update`, `booking.reschedule-notify`, `booking.reschedule-reminders`, plus two future-scheduled reminder/follow-up jobs) drained within seconds of the restart — the 5 due-now jobs moved to `state='completed'`.
- `email_outbox` went from 0 rows to 4, with `status='sent'` and a real Mailtrap `sent_at` timestamp for 3 of them, confirming the DB-configured SMTP settings (host/port/user/password saved via `/settings/services`) were correctly resolved and used by `sendEmailViaSmtp` inside the worker — i.e. this also serves as an end-to-end confirmation that the DB-backed SMTP integration-settings feature itself works correctly once the worker is healthy. (The 4th email is `status='queued'` with `last_error: "550 5.7.0 Too many emails per second... upgrade your plan"` — a Mailtrap sandbox-account rate limit, unrelated to this bug; it will retry automatically.)

**Note for the user:** Mailtrap's sandbox SMTP inbox (`sandbox.smtp.mailtrap.io`) — what's configured in this dev environment — never delivers to real inboxes like Gmail; it captures mail for viewing in the Mailtrap web dashboard only (already documented in `docs/self-hosting/integrations.md`: "Avoid Mailtrap in production — it's a testing sandbox that never actually delivers mail"). So even with this bug fixed, the confirmation email will show up in the Mailtrap inbox UI, not in the `abc@gmail.com`/real inbox typed into the From-address field. A real provider (SES, Postmark, Resend, etc.) is needed for actual delivery.
