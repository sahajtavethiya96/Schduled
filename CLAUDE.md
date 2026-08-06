# Schduled — Project Rules

Read this file before making any code changes. These rules override all defaults.
Design decisions are documented in [design.md](./design.md) — follow it strictly.

## Tech Stack
- Next.js 16 App Router + Turbopack
- Better Auth v1.6.18 (magic link, admin plugin)
- Drizzle ORM + PostgreSQL
- Tailwind CSS v4
- pg-boss background worker

---

## Design Rules (STRICT — never break these)

### No Shadows
**Never add shadows anywhere in the project.** This includes:
- `shadow-sm`, `shadow-md`, `shadow-lg`, `shadow-xl`, `shadow-2xl`
- Custom shadows: `shadow-[...]`
- Inline `boxShadow` style props
- `drop-shadow-[...]`
- `hover:shadow-*`

The only shadow-related classes allowed are `shadow-none` (to explicitly reset) and `ring-1 ring-foreground/10` for floating UI elements (dialogs, dropdowns, popovers).

### No Border Radius
Zero border radius everywhere. Never use `rounded-*` classes.
Exception: `rounded-full` for circular avatar/icon elements only.

### Colors
- Primary: teal (`--primary` CSS var)
- All icons, buttons, active states use teal
- No other accent colors for UI chrome

### Icons
**Phosphor Icons only.** Never use Lucide or any other icon library.
```tsx
import { IconName } from "@phosphor-icons/react"
// or for SSR:
import { IconName } from "@phosphor-icons/react/dist/ssr"
```

### Typography
- Body text / descriptions: minimum `text-sm` (never `text-xs` for readable content)
- `text-xs` is only for badges, navigation labels, pagination counters, small status chips
- No `text-[10px]` or `text-[11px]` outside of tightly constrained badge-like elements

---

## Component Usage (STRICT)

**Always use the UI Kit components from `components/ui/`.** Never use raw HTML elements where a UI Kit component exists.

| Instead of | Use |
|---|---|
| `<button>` | `<Button>` from `components/ui/button` |
| `<input>` | `<Input>` from `components/ui/input` |
| `<textarea>` | `<Textarea>` from `components/ui/textarea` |
| `<label>` | `<Label>` from `components/ui/label` |
| `<select>` | `<Select>` from `components/ui/select` |
| `<table>` | `<Table>` from `components/ui/table` |
| `<dialog>` / modal | `<Dialog>` or `<AlertDialog>` from `components/ui/` |

Only create a new component when no existing component in `components/ui/` fits the need. See [design.md](./design.md) for the full list of available components.

---

## URL / Route Naming (STRICT)

- All route folder names must be **lowercase**
- Word separators: **hyphens only** (`-`) — no underscores, no spaces, no uppercase
- Landing page must be at `/` (root) — never at `/landing` or `/landing-page`
- Dynamic segments use `[kebab-case]`

Examples:
- ✓ `/event-types`, `/my-link`, `/booking/review`
- ✗ `/EventTypes`, `/my_link`, `/Booking-Review`

---

## Database Rules
- DB: `postgresql://schedica:Schedica123@localhost:5432/schedica`
- Keep `db/` path for schema files
- Singular table names (Better Auth default): `user`, `session`, `verification`, etc.
- Never rename DB tables or change naming conventions

---

## Code Rules
- `tsc --noEmit` must pass clean after every change
- File storage: local disk by default (`./uploads`); S3/R2-compatible storage available via `STORAGE_DRIVER=s3` (see `ENVIRONMENT.md`) — or configure any of this from Settings → Services instead, see Integration Settings below
- Admins are managed via `/settings/users` (promote/suspend) — no separate "Make Admin" button elsewhere in the app
- Booking emails: teal-only color scheme
- No `max-w-4xl` wrappers in admin (`/settings/users`, `/settings/audit`, `/settings/jobs`, `/settings/platform`) pages — full width layouts
- Use `cn()` from `lib/utils` for conditional class merging
- Prefer server components; add `'use client'` only when needed (state, events, browser APIs)
- No comments unless the WHY is non-obvious

---

## Auth
- Admin bootstrap: the account matching `INITIAL_ADMIN_EMAIL` (env var) is auto-promoted to admin on signup
- Users can sign in via magic link, email + password, or Google OAuth (each toggleable via env flags — see `ENVIRONMENT.md`)
- There is no separate admin panel or admin login — admins use the same `/login` and the same dashboard as everyone else
- Use `requireAdmin()` for admin-only routes under `/settings` (users, audit, jobs, platform, branding)
- Use `requireSession()` for app routes

---

## Project Structure
- `app/(app)/` — authenticated user app (includes admin-only screens under `app/(app)/settings/{users,audit,jobs,platform,branding,services}`, gated by `requireAdmin()`)
- `app/(booking)/` — public booking flow
- `app/(landing)/` — public marketing pages
- `components/ui/` — hand-authored UI Kit primitives (customized, no radius, no shadow)
- `components/settings-admin/` — admin-only settings components (users, audit, jobs)
- `components/settings-services/` — SMTP/Google/Zoom/storage settings forms, shared by `/settings/services` and the setup wizard's "Configure services" step
- `components/scaffold/` — app shell (sidebar, header)

---

## Integration Settings (SMTP, Google OAuth, Zoom, Storage)

SMTP, Google OAuth, Zoom OAuth, and file storage are each configurable two
ways — `.env` vars (see `ENVIRONMENT.md`), or from inside the app via the
setup wizard or **Settings → Services** (`app/(app)/settings/services/`,
admin-only). A DB-saved value always wins over the matching `.env` var,
per field, and applies live with no restart — **except** Google *Sign-In*
(the Better Auth social-login button), which is resolved once at process
boot and needs a restart to pick up a DB-only config; Google *Calendar*,
Zoom, SMTP, and storage all resolve fresh on every use.

- Resolution + encryption: `lib/integration-settings.ts` (AES-GCM via the
  existing `lib/encrypt.ts`, keyed by `ENCRYPT_KEY` — no new key to manage)
- Save actions: `app/actions/platform-settings.ts` (`update*SettingsAction`,
  `test*ConnectionAction`)
- Full write-up: [`docs/self-hosting/integrations.md`](./docs/self-hosting/integrations.md#integration-settings-db-configuration)

---

## Bug Documentation (STRICT)

Whenever a bug is found and fixed in this project (whether the user reports it or it turns up during a review pass), write it up in `docs/bugs/` as two paired files:

1. **As soon as the bug is identified** — before or while working on the fix — create:
   `docs/bugs/{YYYY-MM-DD}-bug-{kebab-case-title}.md`
   Contents: what's broken, where (file/page), how it was found or reproduced, and the root cause if already known.

2. **Once the fix is implemented and verified** — create the paired file:
   `docs/bugs/{YYYY-MM-DD}-solution-{kebab-case-title}.md`
   Contents: what changed (files touched), why that fixes the root cause, and how it was verified (typecheck, live test, screenshots, etc).

Rules:
- Use the actual date the file is written (not a placeholder).
- The `{kebab-case-title}` must be **identical** between the bug file and its solution file, so the two pair up when sorted alphabetically.
- One bug = one pair of files. Don't batch multiple unrelated bugs into a single file.
- If a fix is applied in the same turn the bug is found (no separate discovery step), it's fine to write both files back to back — don't skip the bug file just because the fix was fast.
