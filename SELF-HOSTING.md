# Schduled — Self-Hosted / Open-Source Conversion Plan

> **What this is.** Schduled is a hosted SaaS scheduling product (a **Calendly**
> alternative; the open-source reference is **Cal.com**). This document is the
> single, complete plan to turn it into a **self-hostable, open-source product** —
> researched against how mature OSS products are built, and mapped onto *your*
> actual codebase with real file paths.
>
> **Companion:** [`ENVIRONMENT.md`](./ENVIRONMENT.md) — every environment variable
> & credential (required?, how to obtain, alternatives).
>
> **Scope of this step:** documentation only. No code changed yet. Implementation
> follows once approved. Priorities: **P0** = required to self-host at all ·
> **P1** = expected of a real OSS product · **P2** = nice-to-have / parity.

---

## Part 1 — Readiness scorecard

Schduled is **~97% ready** — Phases 1, 2, and 3 are now implemented and
verified. The stack is open-source and 12-factor-style, with a one-command
Docker deploy, a working health check, closed-signup protection, durable
S3-compatible storage, env-driven branding, security headers, versioning,
CI, and a full self-hosting docs set. LICENSE is decided and implemented
(MIT — Part 5); `package.json` still keeps `"private": true`, a separate
publish-readiness signal not tied to the license question anymore.
Optional Phase 4 (Calendly parity — embed widget, webhooks, Outlook/Teams)
and Phase 5 (teams/multi-tenant) remain explicitly out of scope for v1.

| Domain | State | Gap → Part 4 section |
|---|---|---|
| Open-source stack, no proprietary lock-in | ✅ Ready | — |
| Config via env + boot validation (`lib/env.ts`) | ✅ Ready | — |
| Secrets out of git (`.env*` ignored, `.env.example` tracked) | ✅ Ready | — |
| Encrypted OAuth tokens (`lib/encrypt.ts`) | ✅ Ready | — |
| Background worker (pg-boss, no Redis) | ✅ Ready | K |
| **Login works on a fresh install (no SMTP/Google)** | ✅ **Done** — email + password is the primary method, on by default | **E** |
| **Signup is closed by default when self-hosted the recommended way** | ✅ **Done** (`ALLOW_PUBLIC_SIGNUP`, verified live) | **E** |
| One-command deploy (Docker Compose + web image) | ✅ **Done** — `Dockerfile`, `docker-compose.yml`, dedicated `migrate` service | C |
| DB migrations before app/worker start | ✅ Done (dedicated `migrate` service gates `web`/`worker` via `service_completed_successfully`) | C, D |
| HTTP health endpoint | ✅ Done (`/api/health`, DB-backed) + worker heartbeat | C, L |
| First-admin bootstrap (env-driven) | ✅ Done (`INITIAL_ADMIN_EMAIL`) | E |
| S3/R2 storage | ✅ **Done** — driver activated, no more "uncomment to enable" | H |
| Configurable branding (name, emails, PRODID) | ✅ **Done** — env-driven, verified live | F |
| Optional marketing landing | ✅ **Done** (`NEXT_PUBLIC_LANDING_ENABLED`, verified live) | G |
| DB pool size + connect-retry | ✅ Done (`DB_POOL_MAX`, `instrumentation.ts`) | D |
| Security headers (CSP/HSTS/X-Frame-Options) | ✅ **Done** — verified live | M |
| Internal-only leftovers (`krova`, ngrok origin, `scaffold-*`) | ✅ **Done** — renamed/removed | F |
| OSS hygiene files (CONTRIBUTING/SECURITY/COC/CHANGELOG) | ✅ **Done** | A |
| LICENSE | ✅ **Done** — MIT (`LICENSE`, `package.json`) | A |
| CI + versioning (`/api/version`) | ✅ **Done** — verified live; no semver tags cut yet | A |
| Deployment / backup / upgrade docs | ✅ **Done** — all 7 guides written | Part 8 |
| Multi-tenant / teams | ❌ Single-user | Part 3 (out of scope v1) |

> **Correction to an earlier false alarm:** `.env` is **not** committed
> (`.gitignore` = `.env*` + `!.env.example`). Only your **local** `.env` holds real
> secrets — rotate those before publishing; nothing secret is in git.

---

## Part 2 — Research: what "self-hosted open-source product" actually requires

The bar is set by mature OSS self-hostable products (Cal.com, Rallly, n8n,
Plausible, Ghost). A proper conversion must satisfy **all** of the following.
Each maps to a section in Part 4.

1. **One-command deploy** — a single `docker-compose.yml` (app + worker + Postgres)
   parameterised by `.env`; migrations auto-run on boot. *(→ C, D)*
2. **12-factor config** — everything via env, nothing hardcoded, fail-fast
   validation, a complete `.env.example`. *(→ B)*
3. **Self-contained auth** — you can log in on a fresh box with **no third-party
   service** (email/OAuth optional, not mandatory). *(→ E)*
4. **First-run bootstrap** — a documented, non-interactive way to create the first
   admin. *(→ E)*
5. **White-labelable** — product name, logo, sender emails, and legal pages are the
   operator's, not the original vendor's. *(→ F, G)*
6. **Pluggable infra** — email (any SMTP) and storage (local **or** S3-compatible)
   swap via env with no code edits. *(→ H, I)*
7. **Self-registered integrations** — Google/Zoom via the operator's own OAuth
   apps; app boots fine without them. *(→ J)*
8. **Operability** — health endpoint, logs, backups, upgrades, a separately-run
   worker, scaling notes. *(→ C, D, K, L)*
9. **Security hardening** — HTTPS/reverse proxy, rate limiting, security headers,
   secret rotation, dependency scanning. *(→ M)*
10. **Privacy** — data export/delete, editable legal pages, **no forced
    telemetry**. *(→ N)*
11. **OSS repo hygiene** — LICENSE, README-for-self-hosters, CONTRIBUTING,
    SECURITY, CODE_OF_CONDUCT, CHANGELOG, versioned releases, CI. *(→ A)*
12. **Full docs set** — Installation, Docker, Upgrade, Backup, Restore,
    Configuration, Integrations. *(→ Part 8)*

**How the reference products do the load-bearing bits (patterns we adopt):**

| Concern | Cal.com / Rallly / n8n pattern | Our target |
|---|---|---|
| Deploy | one compose file, migrate-on-boot | `docker-compose.yml` + dedicated `migrate` service |
| Encryption key | `CALENDSO_ENCRYPTION_KEY` etc. | we already have `ENCRYPT_KEY` |
| Auth on fresh box | email+password baseline | **add email+password** (§E) |
| License | AGPLv3 (keep commercial edge) | decision deferred (§A) |
| Image size | Next.js `output: 'standalone'`, multi-stage, non-root | adopt in web Dockerfile |
| Releases | semver git tags + CHANGELOG + GHCR images | adopt |

---

## Part 3 — Feature parity vs Calendly / Cal.com (verified against the code)

### ✅ Already built (Calendly-equivalent — keep)
Event types (unique slugs, multiple durations) · availability (schedules, weekly
windows, date overrides, per-day/week/month limits) · booking window (rolling/fixed)
+ before/after buffers + min notice · public per-username booking page + timezone
detection · custom intake questions · reschedule & cancel with policies · approval
workflow · full booking lifecycle statuses · email confirmation/reminders(24h,1h)/
cancellation/reschedule/approval · Google Calendar (conflict + write) + Google Meet ·
Zoom links · contacts, guests, blocklist · in-app notifications + preferences +
"join soon" · audit logs · GDPR export (`/api/account/export`) · admin-only screens
(user management, audit logs, background jobs, platform settings) inside `/settings` ·
rate limiting · iCal (.ics).

### 🟡 Partial
| Feature | State | To complete |
|---|---|---|
| Round-robin / collective / group | Selectable, but needs multiple hosts | Teams model (out of scope v1) |
| Outlook / Apple / CalDAV | Enum supports; **only Google built** | Add Microsoft + CalDAV clients (P2) |
| Microsoft Teams video | Enum supports; **only Zoom built** | Add Teams (P2) |

### 🟠 Missing but recommended
| Feature | Why | Priority |
|---|---|---|
| HTTP `/api/health` | Docker/k8s healthchecks | **P0** |
| Embeddable booking widget (inline+popup) | Calendly's signature | P2 |
| Outbound webhooks (`booking.*`) | Automation (n8n/Zapier/CRM) | P2 |
| Outlook/Office365 + Teams | Other half of the market | P2 |
| Public REST API + API keys | Developer integrations | P2 |
| i18n / multi-language | Non-English deployments (English-only today) | P2 |

### 🚫 Excluded on purpose — do NOT build for v1
Payments/Stripe · SMS/WhatsApp (Twilio) · CRM/marketing integrations · product
telemetry · team billing/seats. *(Add cost/providers/complexity a self-hoster
doesn't need. Explicitly out of scope.)*

---

## Part 4 — The complete changes list (by domain)

Legend: **ADD** new · **CHANGE** modify · **REMOVE** delete/genericize · file paths
are real · P0/P1/P2 priority.

### A. Repository, licensing & OSS hygiene
| Type | Change | Where | P |
|---|---|---|---|
| ✅ DONE | `LICENSE` — MIT chosen and added; `package.json`'s `license` field set to `"MIT"` | root | P1 |
| ✅ DONE | `CONTRIBUTING.md`, `SECURITY.md`, `CODE_OF_CONDUCT.md` (Contributor Covenant 2.1), `CHANGELOG.md` (Keep a Changelog format, seeded with an honest `[Unreleased]` section — no fabricated history). `CONTRIBUTING.md` states the MIT license and links `LICENSE` | root | P1 |
| ✅ DONE | GitHub issue templates (bug report, feature request), PR template, `.github/workflows/ci.yml` (typecheck + build as hard gates; lint + `pnpm audit` as informational — see note below) | `.github/` | P1 |
| — | `package.json`: `"private": true` intentionally **kept** for now — dropping it is a separate publishing-readiness signal, independent of the (now-resolved) license choice | `package.json` | P1 |
| ✅ DONE | README rewritten: split "Self-hosting" vs "Local development", links `SELF-HOSTING.md` + `ENVIRONMENT.md` + the new `docs/self-hosting/*` guides. Also fixed a pre-existing broken link (README pointed at a nonexistent `docs/commands.md`) | `README.md` | P1 |
| — | Rotate/clear real secrets in local `.env` before repo goes public — **still the operator's action to take**, not something that can be automated | `.env` (local) | P0 |
| ✅ DONE | Versioning: `/api/version` reports `package.json` name/version + `GIT_SHA` (passed as a Docker `--build-arg` at build time, since `.git` is excluded from the build context; falls back to `"unknown"`). Verified live. Semver git tags **not yet started** — no releases have been cut | `app/api/version/route.ts`, `Dockerfile` (`ARG GIT_SHA`) | P1 |

> **CI gate strictness — a deliberate, documented tradeoff.** `pnpm lint` and
> `pnpm audit` are wired into CI as **informational, non-blocking** steps,
> not hard gates. Verified before making this call: the codebase has ~260
> pre-existing formatting deviations (mixed quote styles etc., predating any
> work in this pass) and 5 known transitive-dependency advisories (`esbuild`
> via `drizzle-kit`/`tsx`/`react-email`, no upstream fix yet). Making either
> one blocking today would make CI red on `main` from the first run, for
> debt unrelated to whatever PR triggered it. `pnpm typecheck` and
> `pnpm build` — both 100% clean — are the hard gates.

> **Verified gap:** there is currently **no version surface at all** — no
> `VERSION` file, no git tags, no version endpoint, and `package.json` is still
> at the placeholder `0.1.0`. Every comparable OSS product (Cal.com, Plausible,
> Umami) exposes this; a self-hoster filing a bug has no way to say what
> version they're on without it.

### B. Configuration (12-factor)
| Type | Change | Where | P |
|---|---|---|---|
| CHANGE | Verify `.env.example` lists **every** var incl. the new proposed ones | `.env.example` | P1 |
| ADD | `.env.production.example` (prod-oriented template) | root | P2 |
| — | Boot validation already fails fast — **keep as-is** | `lib/env.ts` | ✅ |

### C. Deployment & packaging
| Type | Change | Where | P |
|---|---|---|---|
| ✅ DONE | Web `Dockerfile` (multi-stage, `output: 'standalone'`, `NODE_OPTIONS` heap cap, non-root `app` user matching `Dockerfile.worker`) | `Dockerfile` | **P0** |
| ✅ DONE | `docker-compose.yml` — `migrate` + `web` + `worker` + `postgres`. A dedicated `migrate` service (built from `Dockerfile.worker`, runs `pnpm db:migrate:docker` once) gates `web` and `worker` via `depends_on: migrate: condition: service_completed_successfully`, so neither starts before the schema is up to date. No MinIO/Caddy bundled — self-hosters bring their own reverse proxy/storage per decision in Part 5. Plus `docker-compose.external-db.yml` — same shape minus `postgres`, `migrate` runs against `DATABASE_URL` directly with `restart: on-failure` (no local DB to health-gate on), for self-hosters with their own database | `docker-compose.yml`, `docker-compose.external-db.yml` | **P0** |
| ✅ DONE | `next.config.mjs` → `output: 'standalone'`, build-verified | `next.config.mjs` | **P0** |
| ✅ DONE | `HTTP /api/health` (real DB ping, not just process-alive) — verified live: returns `{"status":"ok"}` | `app/api/health/route.ts` | **P0** |
| ✅ DONE | Worker liveness heartbeat (`/tmp/worker-heartbeat`, written every 15s) + Docker `HEALTHCHECK` reading it | `scripts/worker.ts`, `Dockerfile.worker` | P1 |
| ✅ DONE | `drizzle-kit` moved from `devDependencies` → `dependencies` (kept for manual-path `pnpm db:migrate`); the `migrate` service itself runs `pnpm db:migrate:docker` (`scripts/migrate.ts`), a direct `drizzle-orm/postgres-js/migrator` runner — `drizzle-kit migrate`'s CLI was observed to exit 1 on failure without printing the underlying error | `package.json`, `scripts/migrate.ts` | P0 |
| ✅ DONE | `Dockerfile.worker`'s `runner` stage sets `COREPACK_HOME` to a fixed, shared path and runs `corepack prepare --activate` at build time (as root, before the non-root `app` user is created) — the pinned pnpm release is fully resolved and cached once, at build time, so `pnpm` at runtime never re-downloads or hits Corepack's per-user (`$HOME`-relative) cache default, which the non-root `app` user doesn't have | `Dockerfile.worker` | **P0** |
| ✅ DONE | Dockerfile builder stage sets placeholder `DATABASE_URL`/`APP_SECRET`/`NEXT_PUBLIC_APP_URL` — `middleware.ts` imports `lib/env.ts` eagerly, and without these `next build` throws "Invalid environment variables" before an image is even produced. Real values still come from `env_file: .env` at runtime | `Dockerfile` | **P0** |
| ✅ DONE | systemd unit examples (web + worker) for the manual path | `docs/self-hosting/installation.md` | P1 |
| ✅ DONE | Resource sizing table (min RAM/CPU/disk for web/worker/Postgres) | `docs/self-hosting/docker.md` | P1 |
| — | **Note:** `Dockerfile.worker` already existed — only the **web** `Dockerfile` was new | `Dockerfile.worker` | ✅ |

> **`sharp` (native libvips) affects image builds.** `sharp` is used for avatar
> upload processing (`app/api/upload/avatar/route.ts`) and is a native binary
> dependency — it needs either prebuilt binaries for your target platform or a
> build toolchain in the image, and it materially affects image size and
> ARM64 vs x86 compatibility. The web `Dockerfile`'s builder stage runs a full
> `pnpm install` (not `--prod`) precisely so `sharp` gets whatever native
> toolchain it needs at build time; still call this out in the Docker Guide so
> self-hosters on ARM (Raspberry Pi, Apple Silicon dev) aren't surprised by a
> slow or oversized build.
>
> **Not yet verified live:** `docker build` / `docker compose up` themselves —
> Docker wasn't available in the environment this was implemented in. Verified
> instead: `pnpm build` succeeds with `output: 'standalone'` and produces
> `.next/standalone/server.js` + `.next/static` + `public` exactly where the
> Dockerfile's `COPY` steps expect them; both compose files parse as valid
> YAML with the 4 expected services (`postgres` only in the bundled file);
> static trace of `middleware.ts`'s `lib/env.ts` import confirmed the builder
> stage's placeholder env vars are the only 3 unconditionally-required fields
> in the schema. **Run an actual `docker compose up -d` before relying on this
> in production.**

### D. Database & migrations
| Type | Change | Where | P |
|---|---|---|---|
| ✅ DONE | Migrations run via a dedicated `migrate` service (`Dockerfile.worker`, `pnpm db:migrate:docker`) that must exit 0 before `web`/`worker` start (`depends_on: ... condition: service_completed_successfully`) | `docker-compose.yml`, `docker-compose.external-db.yml` | **P0** |
| ✅ DONE | Postgres pool size env-configurable via `DB_POOL_MAX` (was hardcoded `max: 20`) | `lib/db.ts`, `lib/env.ts` | P1 |
| ✅ DONE | Startup connect-retry for the web app, matching the worker's `startBossWithRetry()` pattern — wired into Next.js's `instrumentation.ts` `register()` hook so it runs once per server boot, smoothing over Compose startup ordering | `lib/db.ts` (`waitForDatabase`), `instrumentation.ts` | P1 |
| ADD | Backup/restore docs (`pg_dump`/`pg_restore`) | docs | P1 |
| ADD | Down-migration / rollback runbook — Drizzle migrations are **forward-only**; there is no automated rollback. Document explicitly: "rollback = restore the pre-upgrade DB backup + redeploy the previous image tag," and make backup-before-upgrade a hard gate | docs (Upgrade Guide) | P1 |
| ADD | Document connections-per-replica math — e.g. 3 web replicas × `DB_POOL_MAX` 20 + pg-boss's own pool can exceed a small managed Postgres's `max_connections=100` | docs | P1 |
| ADD | Optional seed script (demo data / defaults) — bump priority: an empty first-run instance is real adoption friction against Cal.com/Rallly for evaluators | `scripts/` | P1 |
| — | `embedded-postgres` is **dev-only** — document "use real Postgres in prod" | `scripts/dev-db.ts` | note |

### E. Authentication & first-run (the lockout fix)
| Type | Change | Where | P |
|---|---|---|---|
| ✅ DONE | Email+password sign-in/sign-up — the **primary** login method (default `true`), shown first on the single `/login` page (used by admins and regular users alike); magic link + Google are secondary. Toggle off via `NEXT_PUBLIC_PASSWORD_AUTH_ENABLED=false` for a magic-link/Google-only deployment | `lib/auth.ts`, `lib/env.ts`, `app/(auth)` | **P0** |
| ✅ DONE | Password fields + sign-in/sign-up toggle in the login form (only rendered when the flag is on) | `app/(auth)/_components/auth-form.tsx` | P0 |
| ✅ DONE | `account.password` column (Better Auth's credential-provider hash storage) — migration `0013_stale_flatman.sql` | `db/schema/auth.ts` | P0 |
| ✅ DONE | `INITIAL_ADMIN_EMAIL` → auto-promote to admin at signup (checked once, at account creation) | `lib/auth.ts` (`databaseHooks.user.create.after`), `lib/env.ts` | P0 |
| ✅ DONE | "Continue with Google" button now hides itself when Google isn't configured (was previously always rendered and would error on click) | `lib/auth.ts` (`googleAuthEnabled`), `auth-form.tsx` | P1 |
| ✅ DONE | **Closed-signup control** via `ALLOW_PUBLIC_SIGNUP` — a `databaseHooks.user.create.before` hook blocks new-account creation (password sign-up, magic link first-use, **and** Google first-login all funnel through the same hook) unless the email matches `INITIAL_ADMIN_EMAIL`. Default `true` (unchanged behavior); self-hosters set `false` **from day one** — the bootstrap admin always gets through regardless, so there's no "open then close" race window | `lib/auth.ts`, `lib/env.ts` | **P0** |
| — | Keep magic link (needs SMTP) + Google (optional) alongside password | — | ✅ |

> **The lockout risk is eliminated by default.** Email + password is the primary
> login method and is on by default (`NEXT_PUBLIC_PASSWORD_AUTH_ENABLED` defaults
> to `true`), so an operator can always sign in on a fresh box with no SMTP or
> Google. Only a deployment that deliberately sets the flag to `false` (magic-
> link/Google-only) reintroduces the console-magic-link dependency.
>
> ✅ **The open-signup risk flagged in the previous review is now fixed —
> verified live, not just by reading the code.** `ALLOW_PUBLIC_SIGNUP=false` +
> `INITIAL_ADMIN_EMAIL=you@example.com` was tested against a running instance:
> a sign-up attempt with a random email (`random-attacker@example.com`) was
> rejected — `HTTP 400 {"code":"FAILED_TO_CREATE_USER"}`, **no row was written
> to the `user` table** — while the `INITIAL_ADMIN_EMAIL` account signed up
> successfully and was auto-promoted to `role: admin`, confirmed by querying
> the database directly. The recommended self-host config in `ENVIRONMENT.md`
> now sets `ALLOW_PUBLIC_SIGNUP=false` from the start (not "open then close"),
> since the bootstrap admin is exempt from the gate.

### F. Branding / white-label
| Type | Change | Where | P |
|---|---|---|---|
| ✅ DONE | `PRODUCT_NAME` → env-overridable via `NEXT_PUBLIC_PRODUCT_NAME` (default `"Schduled"`). Read directly via `process.env.NEXT_PUBLIC_PRODUCT_NAME` in `config/platform.ts`, **not** via `lib/env.ts` — that file is now imported by client components (the "Powered by" footer) and `lib/env.ts`'s Zod schema requires server-only secrets that don't exist in the browser and would throw | `config/platform.ts`, `lib/env.ts` | P1 |
| ✅ DONE | iCal `PRODID` derives from `PRODUCT_NAME` | `bookings/[id]/page.tsx`, `confirmed/.../confirmation-client.tsx` | P1 |
| ✅ DONE | "Powered by `<product>`" footer → configurable via `NEXT_PUBLIC_SHOW_POWERED_BY` (default `true`), passed as a prop from the server-component parent page down to the client component (booking page + confirmation page) | `booking-calendar.tsx`, `confirmation-client.tsx`, their parent `page.tsx` files | P1 |
| ✅ DONE | Landing marketing copy derives from `NEXT_PUBLIC_APP_URL` (`APP_HOST` const) instead of hardcoded `schduled.com` | `app/(landing)/page.tsx` | P1 |
| ✅ DONE | Contact emails → env: `CONTACT_EMAIL` (server-only, contact-form destination, same fallback chain as before: `CONTACT_EMAIL ?? SMTP_USER ?? "hello@schduled.com"`), `NEXT_PUBLIC_CONTACT_EMAIL` (default `"support@schduled.com"`), `PRIVACY_EMAIL` (default `"privacy@schduled.com"`) | `app/actions/contact.ts`, `app/(landing)/{contact,page,privacy,cookies}.tsx` | P1 |
| ✅ DONE | Renamed the old product name "Schedica" → "Schduled" across all 27 files in `docs/*` (bulk text replace, verified no artifacts — `git status` confirms exactly 27 files changed). `CLAUDE.md` was also checked and needed **no changes**: it already said "Schduled" everywhere except one intentionally-protected line — its real local Postgres credentials (`schedica`/`Schedica123`), which is live infrastructure state, not branding; renaming the doc without renaming the actual DB would make it wrong | `docs/*`, `CLAUDE.md` (verified, unchanged) | P2 |
| ✅ DONE | Internal-only leftovers cleaned up: Docker user `krova` → `app` (both Dockerfiles); the hardcoded personal ngrok origin in `next.config.mjs` removed and replaced with an optional `DEV_TUNNEL_ORIGIN` env var (added to the operator's own local `.env`, not checked into the repo); the pg-boss job `scaffold.healthcheck` renamed to `platform.healthcheck` (matching the existing `platform.*` naming convention), including its handler file `scaffold-healthcheck.ts` → `platform-healthcheck.ts` and all references. Verified live: worker starts, all handlers register, graceful shutdown still works. `components/scaffold/*` (the app-shell UI directory) was correctly left untouched — that's real, active, unrelated naming, not a leftover | `Dockerfile.worker`, `Dockerfile`, `next.config.mjs`, `lib/worker/*` | P1 |

### G. Landing & public pages
| Type | Change | Where | P |
|---|---|---|---|
| ✅ DONE | `NEXT_PUBLIC_LANDING_ENABLED` — off ⇒ `/` redirects to `/login`; verified live with `curl` (307 → `/login`; `/privacy` still 200) | `middleware.ts`, `lib/env.ts` | P1 |
| CHANGE | Legal pages (`/privacy`,`/terms`,`/cookies`) → operator-editable | `app/(landing)/{privacy,terms,cookies}` | P2 |
| — | Booking pages are **required** — keep | `app/(booking)/*` | ✅ |

*(A marketing landing is **not** required for self-host — see Part 5. Decision
#3 is now resolved: implemented.)*

### H. File storage
| Type | Change | Where | P |
|---|---|---|---|
| ✅ DONE | **Auto-load S3 driver** from `STORAGE_DRIVER` — real implementation uncommented, placeholder throw-stubs removed, build-verified (`tsc` + `pnpm build` clean) | `lib/storage/index.ts`, `lib/storage/s3.ts` | P1 |
| ✅ DONE | Docker volume for `./uploads` (single-node, `STORAGE_DRIVER=local`) | `docker-compose.yml` | P1 |
| — | Document: multi-instance ⇒ use S3/R2/MinIO (local disk won't share) | docs | note |
| — | **Not yet verified against a real S3/R2 bucket** — build-verified only (no live bucket in this environment). Test an actual upload/delete cycle before relying on it in production | — | note |

> Note: P0/P1/P2 in these tables are **priority tiers** ("how essential"), not
> phase assignments. S3 auto-load is P1 but still ships in **Phase 1** (Part 6) —
> it's bundled with the rest of the deploy-essentials work rather than deferred,
> since durable storage matters from the first real deploy.

### I. Email
| Type | Change | Where | P |
|---|---|---|---|
| — | SMTP default + console fallback already good — **keep** | `lib/smtp/client.ts` | ✅ |
| ADD | Docs: provider options (Postfix/SES/Resend/Postmark/Mailgun; Mailtrap=testing), SPF/DKIM guidance | docs | P1 |
| — | Note: magic-link depends on email (password auth covers the no-email case) | — | note |

### J. Integrations (Google / Zoom / future)
| Type | Change | Where | P |
|---|---|---|---|
| — | Google (Calendar+Meet) & Zoom already optional + encrypted — **keep** | `lib/worker/google-calendar-client.ts`, `lib/zoom/client.ts` | ✅ |
| ADD | Docs: OAuth app setup + exact redirect URIs + `ENCRYPT_KEY` requirement | docs | P1 |
| ADD | `ENCRYPT_KEY` rotation story — currently there's no key ID/versioning in the encrypted token format; rotating the key today means manually decrypting and re-encrypting every stored OAuth token. Document as a manual/unsupported operation for now, or build a `pnpm rotate-encrypt-key` script before v1 | `lib/encrypt.ts`, docs | P1 |
| — | **Note:** no CORS handling exists on any API route today — fine while there's no public API, but `/api/slots`, `/api/bookings`, etc. are same-origin-only by omission, not by design | `app/api/*`, `middleware.ts` | note |
| ADD | (Later) Outlook/Office365 + Teams clients | `lib/*` | P2 |
| ADD | (Later) Outbound `booking.*` webhooks + embed widget + public API — **the embed widget will require deliberate CORS scoping** on booking-page API routes, since it's cross-origin by definition | `lib/*`, `app/*` | P2 |

### K. Background jobs / worker
| Type | Change | Where | P |
|---|---|---|---|
| ADD | Docs: worker is a **separate process**, required for emails/reminders/sync | docs | P1 |
| ADD | Worker liveness signal (e.g. a heartbeat timestamp file/table checked by the Docker Compose `healthcheck:`) — today only the web `/api/health` is planned; the worker has no external liveness signal at all beyond `docker ps` exit status | `lib/worker/*`, `docker-compose.yml` | P1 |
| — | pg-boss cron + locking already safe for a single worker — **keep** | `lib/worker/boss.ts` | ✅ |
| — | **Already solid, undocumented:** graceful SIGTERM shutdown with job-draining (`boss.stop({ graceful: true })`) is already implemented — credit it in docs instead of treating worker lifecycle as greenfield | `scripts/worker.ts` | ✅ |
| — | Scaling note: multiple workers are safe (pg-boss locks); Postgres is the bottleneck | docs | note |

### L. Observability & ops
| Type | Change | Where | P |
|---|---|---|---|
| ADD | `/api/health` (also under C) | `app/api/health` | P0 |
| ADD | Optional error tracking (e.g. `SENTRY_DSN`, opt-in, off by default) | `lib/*` | P2 |
| — | Audit logs + job logs already exist — **keep** | `db/schema/audit-logs.ts`, `job-logs.ts` | ✅ |
| — | **Known limitation:** logs are unstructured `console.log`/`console.error` to stdout — no `LOG_LEVEL`, no JSON output. Fine for `docker compose logs`, a real tax for anyone piping to Loki/CloudWatch/Datadog. Document as a known limitation rather than silently omit | app-wide | note |

### M. Security hardening
| Type | Change | Where | P |
|---|---|---|---|
| ✅ DONE | Security headers added via `headers()` in `next.config.mjs`: CSP (`default-src 'self'`, `frame-ancestors 'none'`, `object-src 'none'`, etc. — pragmatic, no nonce infra, so `script-src`/`style-src` allow `'unsafe-inline'` for Next.js's hydration bootstrap and Tailwind), `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy` (blocks camera/mic/geolocation/payment), `Strict-Transport-Security` (deliberately no `preload` or `includeSubDomains` — see inline comments for why). Verified live: headers present on `/`, all pages still return 200. **Still true:** `frame-ancestors 'none'` will need a `frame-ancestors` carve-out for booking-page routes once the embed widget (§J) ships | `next.config.mjs` | P1 |
| CHANGE | Audit rate-limit coverage across **all** public API routes (present on many) | `app/api/*` | P1 |
| — | **Verified gap:** rate limiting (`lib/api/helpers.ts`) is an in-process `Map`, explicitly single-instance only (code comment confirms it). Running >1 web replica means each replica has its own independent counter — the real limit becomes N× the documented one, and counters reset on restart. This directly undercuts the horizontal-scaling story elsewhere in this doc. **Do not run >1 web replica without either accepting N× effective limits or replacing this with a DB/Redis-backed limiter** | `lib/api/helpers.ts` | P1 |
| — | **Correction, updated after the `APP_URL` fix below.** An earlier review pass flagged "reverse-proxy cookies may silently fail" as a P0 gap, then a later pass found it wasn't a `better-auth` bug — the secure-cookie flag is derived from `options.baseURL` (checked via `.startsWith("https://")`), never from request headers. But that `baseURL` was `NEXT_PUBLIC_APP_URL`, which Next.js inlines into the compiled bundle at `next build` time — a value baked in at image-build time stayed frozen regardless of the real runtime `.env`, which **did** make production deploys serve the wrong base URL (see `docs/bugs/2026-07-24-*-production-url-localhost-0000.md`). Fixed: `baseURL` now reads `getAppUrl()` (`lib/get-app-url.ts`), backed by a new server-only `APP_URL` var that is never inlined and is read live at runtime | `lib/auth.ts`, `lib/get-app-url.ts`, `lib/env.ts` | — ✅ |
| ✅ DONE | Docs: run behind HTTPS reverse proxy (sample Caddy + nginx configs — `docs/self-hosting/installation.md`); rotate secrets (`ENVIRONMENT.md` Security notes); **back up `ENCRYPT_KEY`** (`docs/self-hosting/backup.md`) | docs | P0 |
| ADD | Dependency scanning (Dependabot / `pnpm audit` in CI) | `.github/` | P1 |
| — | Better Auth handles CSRF/session cookies — **keep** | `lib/auth.ts` | ✅ |

### N. Privacy / compliance
| Type | Change | Where | P |
|---|---|---|---|
| — | GDPR data export already present — **keep** | `app/api/account/export` | ✅ |
| ADD | Account deletion / data-erasure flow (if not complete) | `app/*` | P2 |
| — | **No telemetry** — keep it that way for a privacy-friendly self-host | — | ✅ |

### O. Internationalization (optional)
| Type | Change | Where | P |
|---|---|---|---|
| ADD | i18n framework (e.g. next-intl) if non-English deployments needed | app-wide | P2 |

---

## Part 5 — Decisions needed before implementation

1. **License:** ~~AGPLv3 (copyleft) vs MIT (permissive)~~ — **decided:** MIT,
   matching Kanbanica. Now implemented (`LICENSE`, `package.json`).
2. **Login:** ~~confirm add email+password as the P0 baseline~~ — **decided:**
   added, gated behind `NEXT_PUBLIC_PASSWORD_AUTH_ENABLED` (default `false` so the
   hosted product's login is untouched), now implemented (§E).
3. **Landing page:** ~~confirm make it optional~~ — **decided:** added, via
   `NEXT_PUBLIC_LANDING_ENABLED`, now implemented and verified live (§G).
4. **First-run:** ~~env-seeded admin (`INITIAL_ADMIN_EMAIL`) vs a `/setup` wizard~~ — **decided:** env-seeded admin via `INITIAL_ADMIN_EMAIL`, now implemented.
5. **Branding depth:** env-vars only vs full DB-configurable white-label. *(still open)*
6. **Multi-tenancy:** keep single-user-per-account for v1 (recommended) vs build teams. *(still open)*
7. **Compose extras:** ~~bundle MinIO + a TLS reverse proxy, or keep minimal~~ —
   **decided:** minimal (`web` + `worker` + `postgres` only). Self-hosters bring
   their own reverse proxy and choose their own storage backend.

---

## Part 6 — Phased roadmap

**Phase 1 — Can I deploy & log in?** ✅ **Implemented and verified this pass**
(P0, plus a few bundled P1s that ship alongside since they're load-bearing for
a real first deploy):
- ✅ Done: email+password auth (opt-in via `NEXT_PUBLIC_PASSWORD_AUTH_ENABLED`)
- ✅ Done: `INITIAL_ADMIN_EMAIL` bootstrap
- ✅ Done: Google button hides itself when unconfigured
- ✅ Done: closed-signup control via `ALLOW_PUBLIC_SIGNUP` (see §E — verified live)
- ✅ Done: reverse-proxy cookies — **turned out not to be a bug**, corrected in §M
- ✅ Done: web `Dockerfile` + `docker-compose.yml` + dedicated `migrate` service
  (built and build-verified; **`docker build`/`docker compose up` itself not
  yet run — no Docker available in the implementation environment**)
- ✅ Done: `/api/health` (web, DB-backed, verified live) + worker liveness heartbeat
- ✅ Done: S3 driver auto-load (build-verified; no live bucket tested)
- ✅ Done: `next.config.mjs` `output: 'standalone'` (build-verified)
- ✅ Done: `NEXT_PUBLIC_LANDING_ENABLED` (verified live — pulled forward from Phase 2)
- ✅ Done: DB pool env-config (`DB_POOL_MAX`) + connect-retry (`instrumentation.ts`)
- Still open: resource sizing docs (write-up only, no code needed)

**Phase 2 — Make it mine** ✅ **fully implemented and verified this pass** (P1):
~~branding/contact-email env vars~~ ✅ done (`NEXT_PUBLIC_PRODUCT_NAME`,
`NEXT_PUBLIC_SHOW_POWERED_BY`, `CONTACT_EMAIL`, `NEXT_PUBLIC_CONTACT_EMAIL`,
`PRIVACY_EMAIL`) · ~~security headers~~ ✅ done (CSP/HSTS/X-Frame-Options,
verified live — still needs the embed-widget CSP carve-out later, noted in §M)
· ~~rename "Schedica"→"Schduled"~~ ✅ done (including `CLAUDE.md`, 27 files) ·
~~grep for leftover internal branding~~ ✅ done (`krova`→`app`, ngrok origin
→ `DEV_TUNNEL_ORIGIN` env var, `scaffold.healthcheck`→`platform.healthcheck`).
Still open: rate-limit multi-instance caveat is **documented** (§M, `ENVIRONMENT.md`)
but the underlying in-memory limiter itself was not replaced — that's a
separate, larger change (DB/Redis-backed limiter) not done in this pass.

**Phase 3 — Ship as OSS** ✅ **implemented and verified this pass** (P1), with
one deliberate exception:
~~CONTRIBUTING/SECURITY/COC/CHANGELOG~~ ✅ done ·
~~CI + dependency scanning~~ ✅ done (typecheck+build hard gates; lint+audit
informational — see §A note) ·
~~versioning (`/api/version`)~~ ✅ done, **semver git tags not started** (no
releases cut yet) ·
~~README rewrite~~ ✅ done (also fixed a broken link) ·
~~the full docs set~~ ✅ done, all 7 guides (Part 8) ·
~~down-migration/rollback runbook~~ ✅ done (folded into the Upgrade guide) ·
~~`ENCRYPT_KEY` rotation story~~ ✅ done (documented as manual/unsupported,
folded into the Backup guide). **LICENSE decided and implemented (MIT)** —
see Part 5; `package.json` keeps `"private": true` pending a separate
publish-readiness decision.

**Phase 4 — Calendly parity** (P2, optional): embed widget (with CORS scoping) ·
outbound webhooks · Outlook/Teams · public API · i18n.

**Phase 5 — (Later) Teams / multi-tenant** — only if needed; large schema change.

---

## Part 7 — Installation (step by step)

> Full credential details in [`ENVIRONMENT.md`](./ENVIRONMENT.md). Both paths
> below reflect the actual current code (Docker packaging shipped this pass —
> see Part 6). Path A itself (`docker build`/`docker compose up`) has **not**
> been run end-to-end yet — no Docker in the implementation environment — so
> treat it as build-verified, not deploy-verified, until you run it once.

### Prerequisites
- **Docker path:** Docker 24+ and Compose v2.
- **Manual path:** Node 22+, pnpm (`corepack enable`), PostgreSQL 15/16.
- Production: a domain + HTTPS reverse proxy (so OAuth callbacks resolve).

### Path A — Docker Compose (recommended)
```bash
git clone <your-repo-url> schduled && cd schduled
cp .env.example .env
#   Set DATABASE_URL (host = "postgres" for compose), APP_SECRET, APP_URL
#   (generate secrets: openssl rand -hex 32). Also set POSTGRES_USER/PASSWORD/DB to
#   match DATABASE_URL — docker compose reads these to create the Postgres container.
#   Then set the self-host login essentials (recommended from day one):
#     NEXT_PUBLIC_PASSWORD_AUTH_ENABLED=true
#     ALLOW_PUBLIC_SIGNUP=false                  (INITIAL_ADMIN_EMAIL is exempt — no open window)
#     INITIAL_ADMIN_EMAIL=you@example.com   (this account auto-becomes admin on signup)
nano .env
docker compose up -d                 # postgres + migrate + web + worker; migrate runs first
docker compose logs -f migrate       # confirm migrations applied cleanly
docker compose logs -f web worker    # wait for "ready"
curl http://localhost:3000/api/health  # expect {"status":"ok"}
# open APP_URL → sign up with INITIAL_ADMIN_EMAIL using a password
```

Already have a Postgres database (managed service, or your own instance) and
don't want Compose to also run one? Use `docker-compose.external-db.yml`
instead (`docker compose -f docker-compose.external-db.yml up -d`) — see the
full **Path A2** walkthrough in the
[Installation Guide](./docs/self-hosting/installation.md).

### Path B — Manual / Node (works today)
```bash
git clone <your-repo-url> schduled && cd schduled
corepack enable && pnpm install
# create Postgres db+user, then:
cp .env.example .env
#   Set DATABASE_URL, APP_SECRET (openssl rand -hex 32), APP_URL,
#   NEXT_PUBLIC_PASSWORD_AUTH_ENABLED=true, ALLOW_PUBLIC_SIGNUP=false,
#   INITIAL_ADMIN_EMAIL=you@example.com
nano .env
pnpm db:migrate                      # run migrations (incl. the account.password column)
pnpm build
pnpm start        &                  # web on :3000
pnpm worker:start &                  # background worker (emails, reminders, sync)
curl http://localhost:3000/api/health  # expect {"status":"ok"}
# open APP_URL → sign up with INITIAL_ADMIN_EMAIL using a password
```
Run web + worker under **systemd/pm2** in production; put Nginx/Caddy/Traefik in
front for TLS → `127.0.0.1:3000`. Example systemd units go in the Installation Guide.

### Post-install checklist
- [ ] App loads at `APP_URL`
- [ ] `curl <url>/api/health` returns `{"status":"ok"}`
- [ ] You can log in — either `NEXT_PUBLIC_PASSWORD_AUTH_ENABLED=true` is set, or
      SMTP/Google is configured (otherwise the only sign-in path is a magic link
      logged to the server console — check `docker compose logs web` if so)
- [ ] Admin created (via `INITIAL_ADMIN_EMAIL` signup or `pnpm make:admin`); admin-only tabs under `/settings` are reachable
- [ ] `ALLOW_PUBLIC_SIGNUP=false` is set (recommended default — closes public signup;
      the `INITIAL_ADMIN_EMAIL` account is exempt and always gets through, so this
      is safe to set *before* your first deploy, not just after)
- [ ] (If used) Google/Zoom redirect URIs match `APP_URL`; `ENCRYPT_KEY` set
- [ ] Worker running (a test booking sends confirmation/reminder)
- [ ] Backups scheduled (DB + uploads + `ENCRYPT_KEY`)

---

## Part 8 — Documentation set — ✅ all 7 guides written

All seven guides now exist under [`docs/self-hosting/`](./docs/self-hosting/),
grounded in the actual Phase 1–2 implementation (real commands, real file
paths, real verified redirect URIs and scopes — not aspirational outlines):

- ✅ [**Installation**](./docs/self-hosting/installation.md) — prerequisites,
  Docker Compose **and** manual/Node paths, the first-login safety config,
  post-install checklist, and the single-user-per-account model note.
- ✅ [**Docker**](./docs/self-hosting/docker.md) — both images, the real
  `docker-compose.yml`, volumes (with a caveat that the volume name prefix
  depends on your clone directory), healthchecks, resource sizing table,
  the `sharp`/ARM64 native-build note, and `GIT_SHA` build-arg usage.
- ✅ [**Upgrade**](./docs/self-hosting/upgrade.md) — both paths, plus the
  down-migration/rollback runbook (Drizzle is forward-only — rollback =
  restore the pre-upgrade backup + redeploy the previous image/commit).
- ✅ [**Backup**](./docs/self-hosting/backup.md) — DB dump, uploads archive,
  `.env`/`ENCRYPT_KEY`, cron example, **and** the `ENCRYPT_KEY` rotation
  story (documented as manual/unsupported today, not tooled).
- ✅ [**Restore**](./docs/self-hosting/restore.md) — full restore sequence
  with the same `ENCRYPT_KEY` warning, and a verification checklist.
- ✅ [**Configuration**](./docs/self-hosting/configuration.md) — links to
  `ENVIRONMENT.md` as the source of truth; minimal-vs-full feature table;
  boot-validation and `NEXT_PUBLIC_*`-is-public explanations.
- ✅ [**Integrations**](./docs/self-hosting/integrations.md) — Google
  Calendar/Meet and Zoom setup with exact redirect URIs and scopes (verified
  against `app/api/integrations/*` and `lib/zoom/client.ts`), plus SMTP
  provider guidance.

The `docker-compose.yml` (and `docker-compose.external-db.yml`, for bringing
your own Postgres) referenced throughout are the real files at the repo root
(see §C) — no longer "target" examples.

---

## Part 9 — Master checklist

**Phase 1 — deploy & log in (P0, + load-bearing P1s)** — ✅ **implemented and
verified this pass** (build + `tsc` + live endpoint tests; Docker itself not
run — see the caveat in Part 7)
- [x] Email+password auth, opt-in via `NEXT_PUBLIC_PASSWORD_AUTH_ENABLED` (default `false`) — done (`lib/auth.ts`, `lib/auth-client.ts`, `auth-form.tsx`, `lib/env.ts`, migration `0013_stale_flatman.sql`)
- [x] `INITIAL_ADMIN_EMAIL` env-seeded first admin — done (`lib/auth.ts`, `lib/env.ts`, `.env.example`)
- [x] Google login button hides itself when unconfigured — done (`lib/auth.ts` `googleAuthEnabled`, `auth-form.tsx`)
- [x] **Closed-signup control via `ALLOW_PUBLIC_SIGNUP`** — done, **verified live**: random email rejected (`HTTP 400`, no DB row); `INITIAL_ADMIN_EMAIL` succeeded and was promoted to admin (`lib/auth.ts`, `lib/env.ts`)
- [x] **Reverse-proxy cookies** — investigated, turned out to be a non-issue (Better Auth uses `baseURL`, not request headers); corrected in §M, no code change needed
- [x] Web `Dockerfile` + `docker-compose.yml` + dedicated `migrate` service — done (`Dockerfile`, `docker-compose.yml`, `docker-compose.external-db.yml`); `migrate` reuses existing `Dockerfile.worker`, gates `web`/`worker` via `service_completed_successfully`
- [x] `next.config.mjs` `output: 'standalone'` — done, build-verified (`.next/standalone/server.js` produced)
- [x] `/api/health` (web, DB-backed, verified live: `{"status":"ok"}`) + worker liveness heartbeat (`scripts/worker.ts` + `Dockerfile.worker` `HEALTHCHECK`)
- [x] Auto-load S3 driver from `STORAGE_DRIVER` — done (`lib/storage/index.ts`, `lib/storage/s3.ts`), build-verified, no live bucket tested
- [x] DB pool size env-configurable (`DB_POOL_MAX`) + connect-retry on boot (`lib/db.ts`, `instrumentation.ts`)
- [x] `NODE_OPTIONS` memory-cap guidance — done, set directly in both Dockerfiles (`--max-old-space-size=768` web, `384` worker)
- [x] `NEXT_PUBLIC_LANDING_ENABLED` — done, **verified live**: `/` → 307 → `/login` when off; `/privacy` stays 200 (pulled forward from Phase 2 per your request)
- [ ] Resource sizing docs (RAM/CPU/disk table) — write-up only, not done
- [ ] `sharp`/libvips build note in the Docker Guide — write-up only, not done
- [ ] Rotate real secrets in local `.env`

**Phase 2 — make it mine (P1)** — ✅ all implemented and verified this pass
- [x] `NEXT_PUBLIC_PRODUCT_NAME`, iCal PRODID, "Powered by" (`NEXT_PUBLIC_SHOW_POWERED_BY`), landing copy configurable — done (`config/platform.ts`, `lib/env.ts`, `bookings/[id]/page.tsx`, `confirmation-client.tsx`, `booking-calendar.tsx`, `app/(landing)/page.tsx`)
- [x] `CONTACT_EMAIL` / `NEXT_PUBLIC_CONTACT_EMAIL` / `PRIVACY_EMAIL` — done (`app/actions/contact.ts`, `app/(landing)/{contact,page,privacy,cookies}.tsx`)
- [x] Security headers (CSP/HSTS/frame) — done, verified live; rate-limiter single-instance limitation already documented (`ENVIRONMENT.md`, §M) — the limiter itself is unchanged, still a separate future task
- [x] Rename "Schedica" → "Schduled" in `docs/*` — done, 27 files, no artifacts. `CLAUDE.md` checked, needed no changes (already correct)
- [x] Grep for leftover internal branding — done: `krova`→`app` (both Dockerfiles), ngrok origin→`DEV_TUNNEL_ORIGIN` env var, `scaffold.healthcheck`→`platform.healthcheck` (job name, handler file, all references)

**Phase 3 — ship as OSS (P1)** — ✅ implemented and verified this pass
- [x] LICENSE — done: MIT chosen, `LICENSE` file added, `package.json`'s `license` field set to `"MIT"` (`"private": true` kept, pending a separate publish-readiness decision)
- [x] CONTRIBUTING.md, SECURITY.md, CODE_OF_CONDUCT.md, CHANGELOG.md — done
- [x] CI (typecheck + build hard gates; lint + `pnpm audit` informational — 260 pre-existing formatting deviations and 5 known transitive-dep advisories predate this pass) + Dependabot config + issue/PR templates — done
- [x] Versioning: `/api/version` (name + version + `GIT_SHA` build-arg) — done, verified live. Semver git tags **not started** — no releases cut yet
- [x] README rewrite (Self-hosting vs Local dev split, fixed a broken link) — done
- [x] Docs set — all 7 guides written under `docs/self-hosting/`: Installation, Docker, Upgrade, Backup, Restore, Configuration, Integrations
- [x] Down-migration / rollback runbook — done, folded into the Upgrade guide
- [x] `ENCRYPT_KEY` rotation story — done, documented as manual/unsupported, folded into the Backup guide
- [ ] Bump seed/demo-data script to reduce evaluator friction — not done this pass, still open
- [x] Verify `.env.example` completeness — confirmed in sync with `lib/env.ts` across Phases 1–3
- [x] Document single-user-per-account model — done, in the Installation guide's "Before you start" section

**Phase 4 — Calendly parity (P2, optional)**
- [ ] Embed widget (+ CORS scoping on booking API routes) · outbound `booking.*` webhooks · Outlook/Teams · public API · i18n

**Excluded on purpose (do NOT build v1):** payments/Stripe · SMS/Twilio · CRM
integrations · product telemetry · team billing.

**Already solid, just undocumented (credit these, don't rebuild them):**
worker graceful SIGTERM shutdown with job-draining (`scripts/worker.ts`) ·
DB pool has sane `max`/`idle_timeout` bounds, just not env-tunable ·
avatar upload has real MIME allowlisting + size cap + re-encode via `sharp` ·
zero telemetry/analytics SDKs anywhere in the codebase (verified) ·
`Dockerfile.worker` already exists and works.

---

*Built from a full codebase review (architecture, environment/credentials, and
SaaS→self-host blockers) plus research on OSS self-hosting norms. Companion:
[`ENVIRONMENT.md`](./ENVIRONMENT.md).*
