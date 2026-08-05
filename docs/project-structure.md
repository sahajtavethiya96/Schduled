# Schduled — Project Structure

Where things actually live in this repo today. For the strict design/coding
rules that apply to each area, see [`../CLAUDE.md`](../CLAUDE.md) — this
document is the map, that one is the rulebook.

> Everything lives at the **repo root** — there is no `src/` directory.
> `app/` is the Next.js App Router; `lib/`, `db/`, `components/`, `config/`,
> and `hooks/` sit alongside it, not nested under it.

---

## Root structure

```
schduled/
├── app/          ← Next.js App Router — route groups, API routes, server actions
├── components/   ← React components (ui/, scaffold/, settings-admin/, landing/, onboarding/, profile/, tour/)
├── lib/          ← Business logic, integrations, auth, env validation
├── db/           ← Drizzle schema + SQL migrations
├── config/       ← Small app-wide config (platform.ts — branding, product name)
├── hooks/        ← Shared client-side React hooks
├── scripts/      ← One-off/dev scripts (make-admin, local db, worker entrypoint)
├── docs/         ← This documentation set
├── public/       ← Static assets
├── docker-compose.yml              ← Bundled Postgres (default)
├── docker-compose.external-db.yml  ← Bring-your-own Postgres
├── Dockerfile / Dockerfile.worker
├── drizzle.config.ts
├── biome.jsonc
└── package.json
```

---

## `app/` — route groups

Route groups (the `(name)` folders) don't affect the URL — they only group
pages under a shared `layout.tsx`.

| Route group | What it is |
|---|---|
| `(landing)` | Public marketing site — home, about, contact, privacy/terms/cookies |
| `(auth)` | Sign-in / login flow |
| `(onboarding)` | First-run wizard for a freshly-created user |
| `(app)` | The authenticated product: `dashboard`, `event-types`, `availability`, `bookings`, `contacts`, `profile`, `settings` (including admin-only tabs — `settings/users`, `settings/audit`, `settings/jobs`, `settings/platform` — gated by `requireAdmin()`, not a separate route group) |
| `(booking)` | Public booking flow — `[username]/[eventSlug]`, confirm/cancel/reschedule |

Plus, not route groups:
- `app/actions/` — Server Actions (`'use server'`), one file per domain: `auth.ts`, `bookings.ts`, `event-types.ts`, `availability.ts`, `profile.ts`, `settings.ts`, `contact.ts`, `onboarding.ts`, `users.ts`, `audit.ts`, `queues.ts`, `platform-settings.ts`, `security.ts`
- `app/api/` — route handlers where a Server Action doesn't fit: `auth/[...all]` (Better Auth), `health`, `version`, `bookings`, `slots`, `available-days`, `upload`, `integrations/*` (Google/Zoom OAuth callbacks), `webhooks`, `notifications`, `username-check`, `slug-check`, `contact-lookup`, `geocode`, `check-blocked`, `account`
- `app/layout.tsx` / `app/globals.css` — root layout, theme, fonts, Tailwind base

## `lib/` — business logic

| Path | Purpose |
|---|---|
| `env.ts` | Zod-validated environment variables — import `env` from here, never read `process.env.X` directly in server-only code (client components must read `process.env.NEXT_PUBLIC_*` directly instead — see `config/platform.ts` for why) |
| `auth.ts`, `auth-client.ts`, `authz.ts` | Better Auth config, client hooks, `requireSession()`/`requireAdmin()` |
| `db.ts`, `pg-connection.ts` | Drizzle client + pool |
| `encrypt.ts` | AES-256-GCM for OAuth tokens at rest |
| `storage.ts` | Upload abstraction — local disk, S3, or R2 driver, selected via `STORAGE_DRIVER`; served through `app/api/files/[...key]` |
| `email/` | React Email templates + `renderer.ts` |
| `smtp/` | SMTP client |
| `calendar/` | Slot generation (`slots.ts`), `.ics` generation |
| `integrations/` | Shared calendar/video connection status helpers |
| `zoom/` | Zoom API client |
| `worker/` | pg-boss setup (`boss.ts`), job payload types (`job-types.ts`), enqueue helpers, and `handlers/` (one file per job) |
| `notifications/` | In-app/email notification creation |
| `audit.ts` | Admin audit-log writer |
| `api/helpers.ts` | Shared API route helpers |
| `validators.ts`, `utils.ts`, `event-colors.ts`, `booking-status.ts` | Misc shared helpers |

## `db/`

- `schema/` — one file per domain (`auth.ts`, `profile.ts`, `event-types.ts`,
  `availability.ts`, `bookings.ts`, `calendars.ts`, `video.ts`, `contacts.ts`,
  `notifications.ts`, `audit-logs.ts`, `email-outbox.ts`, `email-events.ts`,
  `job-logs.ts`, `platform.ts`, `security.ts`, `enums.ts`, `relations.ts`),
  re-exported from `index.ts`
- `migrations/` — SQL migration files (Drizzle), applied by the dedicated
  `migrate` service (`pnpm db:migrate:docker`, `scripts/migrate.ts`) before
  `web`/`worker` start — see
  `docker-compose.yml`
- `reset.ts` — local dev database reset script

## `components/`

| Path | Purpose |
|---|---|
| `ui/` | Hand-authored UI Kit primitives, built on Headless UI/@floating-ui/react, customized to this project's design system (zero radius, no shadow) — see `CLAUDE.md` |
| `scaffold/` | App shell: `app-shell.tsx`, sidebar, header, mobile nav, search, notification bell |
| `settings-admin/` | Admin-only settings components (users, audit, jobs) |
| `landing/` | Marketing page sections, header, footer |
| `onboarding/` | First-run wizard steps |
| `profile/` | Profile/settings page components |
| `tour/` | Guided product tour |

## `config/`, `hooks/`, `scripts/`

- `config/platform.ts` — product name/branding read from `NEXT_PUBLIC_*` env
  vars directly (not via `lib/env.ts`) so it stays safe to import into client
  components
- `hooks/` — shared client hooks (e.g. `use-username-check.ts`)
- `scripts/` — `make-admin.ts` (promote a user via CLI), `dev-db.ts` (local
  embedded Postgres for development), `worker.ts` (worker process entrypoint)

---

## Naming conventions

| Item | Convention | Example |
|---|---|---|
| Files | kebab-case | `event-type-card.tsx`, `calendar-sync.ts` |
| React components | PascalCase | `EventTypeCard` |
| Server Actions | camelCase verb | `cancelBooking`, `updateAvailability` |
| DB table names | snake_case, singular for Better Auth tables (`user`, `session`), otherwise domain-appropriate | see `db/schema/*.ts` |
| Environment vars | SCREAMING_SNAKE | `DATABASE_URL`, `APP_SECRET` |

---

## Where to add new code

| Task | File(s) |
|---|---|
| New page | `app/(route-group)/new-page/page.tsx` |
| New Server Action | `app/actions/<domain>.ts` |
| New API endpoint | `app/api/<name>/route.ts` |
| New UI component | `components/<area>/component-name.tsx` |
| New background job | `lib/worker/handlers/job-name.ts` + register in `lib/worker/boss.ts`/`ensure-queues.ts` + type in `job-types.ts` |
| New database table | Add to `db/schema/<domain>.ts` → `pnpm db:generate` → `pnpm db:migrate` |
| New env var | Add to `lib/env.ts` schema + `.env.example` + [`ENVIRONMENT.md`](../ENVIRONMENT.md) |

For environment variables specifically, [`ENVIRONMENT.md`](../ENVIRONMENT.md)
is the authoritative reference (every var, required/optional, how to obtain
it). For self-hosting/deployment, start at
[`SELF-HOSTING.md`](../SELF-HOSTING.md).
