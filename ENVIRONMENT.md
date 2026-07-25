# Schduled — Environment Variables & Credentials Reference

> Every environment variable Schduled reads, whether it's **required**, its
> **default**, what it does, **how to obtain the credential**, and **self-hosted
> alternatives** for each. This is the companion to
> [`SELF-HOSTING.md`](./SELF-HOSTING.md).
>
> New here? Jump straight to **[Setup — step by step](#setup--step-by-step-clone-to-running-app)**
> for the full clone-to-running-app walkthrough (13 numbered steps). Everything
> after that is the variable-by-variable reference.

---

## How configuration works

- All config comes from environment variables. In development they're loaded from
  a local **`.env`** file; in production, set them in your host / container / secrets
  manager.
- **`.env` is git-ignored** (`.gitignore` has `.env*` with `!.env.example`). Only
  **`.env.example`** is committed. Never commit a real `.env`.
- Config is **validated at boot** by [`lib/env.ts`](./lib/env.ts) using Zod. If a
  required variable is missing or invalid, the app **refuses to start** and prints
  which variable failed. This is intentional — fail fast, not at runtime.
- A conditional rule is enforced: **if Google or Zoom OAuth is configured,
  `ENCRYPT_KEY` becomes required** (it encrypts the stored OAuth tokens).

---

## Setup — step by step (clone to running app)

> This is the **Manual / Node path** — every step below works with the
> codebase as it exists today. There's also a **Docker Compose** path now
> (`docker-compose.yml` at repo root — see `SELF-HOSTING.md` Part 7), which
> collapses steps 1–11 into `docker compose up -d`. It's build-verified but
> hasn't been run end-to-end in a real Docker environment yet — if you hit
> anything, the Manual path below is the fallback that's been tested live.

### Prerequisites

- **Node.js 22+**
- **pnpm** — this repo pins `pnpm@11.6.0` via `packageManager` in `package.json`;
  run `corepack enable` once and pnpm will auto-use the right version.
- **PostgreSQL 15 or 16** — a server you can create a database on (local install,
  Docker container, or managed: Supabase/Neon/RDS/DigitalOcean).
- A terminal and, for production, a domain name (needed before Google/Zoom OAuth
  will work, since they require a real callback URL).

### 1. Clone the repository

```bash
git clone <your-repo-url> schduled
cd schduled
```

### 2. Install dependencies

```bash
corepack enable
pnpm install
```
Installs the app, the CLI scripts (`tsx`, `drizzle-kit`), and dev tooling.

### 3. Provision a PostgreSQL database

Use any Postgres 15/16 instance. Example — creating one by hand:
```sql
CREATE USER schduled WITH PASSWORD 'strongpass';
CREATE DATABASE schduled OWNER schduled;
```
**Or**, for local development only, skip this step and use the bundled embedded
Postgres instead: `pnpm db:local` (starts a throwaway Postgres 18 process — not
for production; see `SELF-HOSTING.md` Part 4 §D).

### 4. Create your `.env` file

```bash
cp .env.example .env
```
This copies the template. Every variable below is documented in this file —
open `.env` in an editor and fill it in as you go through the next steps.

### 5. Generate the required secrets

```bash
# APP_SECRET — signs Better Auth sessions, needs 32+ chars
openssl rand -hex 32

# ENCRYPT_KEY — AES-256 key for OAuth tokens, needs exactly 64 hex chars
# (only required if you'll enable Google or Zoom — see step 8)
openssl rand -hex 32
```
Paste the outputs into `APP_SECRET` and `ENCRYPT_KEY` in `.env`.

### 6. Fill in the minimum required variables

Open `.env` and set:
```env
DATABASE_URL=postgresql://schduled:strongpass@localhost:5432/schduled
APP_SECRET=<output from step 5>
APP_URL=http://localhost:3000        # or your real https:// domain in production
```
These three are the only variables the app **requires to boot** — see the
next step for why you'll almost certainly want a couple more
(`NEXT_PUBLIC_PASSWORD_AUTH_ENABLED`, `ALLOW_PUBLIC_SIGNUP`) too.

### 7. Set up your first login (self-hosting essential)

```env
NEXT_PUBLIC_PASSWORD_AUTH_ENABLED=true
ALLOW_PUBLIC_SIGNUP=false
INITIAL_ADMIN_EMAIL=you@example.com
```
Email + password is the **primary** login method and is **on by default**, so
the very first sign-in always works on a fresh box with no SMTP or Google. You
only need to touch `NEXT_PUBLIC_PASSWORD_AUTH_ENABLED` if you want to *disable*
password login (`=false`) for a magic-link/Google-only deployment. Magic link
and Google are the optional secondary methods.

`ALLOW_PUBLIC_SIGNUP=false` closes public sign-up — recommended **from the start**,
not "turn it on, then off later": `INITIAL_ADMIN_EMAIL` is exempt from the
gate and can always sign up regardless, so there's no window where a stranger
could register. This was verified directly: with this exact config, a sign-up
attempt from a random email was rejected (`HTTP 400`, no database row
created) while the `INITIAL_ADMIN_EMAIL` account signed up and was
auto-promoted to admin. See §3 below for details.

### 8. (Optional) configure email, Google, Zoom, geocoding, storage

Skip this step entirely for a quick local trial — the app runs fine without
any of it (emails log to the console, Google/Zoom buttons stay hidden, storage
defaults to local disk). Add these later, whenever you need them:
- **Email (§2)** — set `SMTP_*` + `EMAIL_FROM` for real email delivery.
- **Google (§4)** — set `GOOGLE_CLIENT_ID/SECRET` + `ENCRYPT_KEY` for Google sign-in, Calendar sync, and Meet links.
- **Zoom (§5)** — set `ZOOM_CLIENT_ID/SECRET` + `ENCRYPT_KEY` for auto-generated Zoom links.
- **Geocoder (§6)** — optional; free Photon works with zero config.
- **Storage (§7)** — optional; defaults to local disk. `S3`/R2/MinIO is fully wired up now — set `STORAGE_DRIVER=s3` + the `S3_*` vars.

### 9. Run the database migrations

```bash
pnpm db:migrate
```
Creates every table Schduled needs (users, event types, bookings, availability,
audit logs, etc.) — currently 14 migrations, including the `account.password`
column that email+password login (step 7) depends on.

### 10. Build the app (production only — skip for local dev)

```bash
pnpm build
```
For local development, skip this and use `pnpm dev` instead (step 11 covers both).

### 11. Start the app — two processes

Schduled runs as **two separate processes**: the web server and a background
worker (sends emails, reminders, syncs calendars). Both must be running.

**Local development** (single command, runs both together):
```bash
pnpm dev
```

**Production** (run each independently, e.g. under systemd/pm2 — see
`SELF-HOSTING.md` Part 7 for example systemd units):
```bash
pnpm start &          # web server on :3000
pnpm worker:start &   # background worker
```

### 12. Create your admin account

Open `APP_URL` in a browser and sign up using the email you set as
`INITIAL_ADMIN_EMAIL` in step 7 (via the password form, since that's enabled).
That account is automatically promoted to admin — no CLI step needed.

**Alternative:** if you skipped step 7 (or want to promote a *different* or
*second* user), sign up any way that's configured, then run:
```bash
pnpm make:admin you@example.com
```

### 13. Verify

- [ ] App loads at `APP_URL`
- [ ] You're signed in and, as the admin, can see the admin-only tabs under `/settings` (Users, Audit, Jobs, Platform)
- [ ] The background worker is running (check its terminal/logs — a test
      booking should trigger a confirmation email, even if it's just logged to
      the console)
- [ ] If configured, Google/Zoom connect successfully from Settings → Integrations

---

## Minimum required to boot

Only **three** variables are strictly required for the app to start:

| Variable | Example | Notes |
|---|---|---|
| `DATABASE_URL` | `postgresql://schduled:pass@localhost:5432/schduled` | PostgreSQL connection string |
| `APP_SECRET` | *(32+ random chars)* | Better Auth session signing secret |
| `APP_URL` | `https://schedule.example.com` | Public base URL, **no trailing slash** |

Everything else is optional and unlocks specific features (email, Google, Zoom,
richer geocoding, S3 storage).

> **Login works out of the box:** email + password is the primary method and is
> on by default, so the 3 vars above are enough to both *boot* and *log in* on a
> fresh box — no SMTP or Google needed. See §3 below.

---

## Full reference by category

Legend: **Req** = Required · **Opt** = Optional · **Cond** = Conditionally required

### 1. Core / App

| Variable | Req? | Default | Purpose | How to get / alternatives |
|---|---|---|---|---|
| `DATABASE_URL` | **Req** | — | Postgres connection for Drizzle ORM **and** pg-boss job queue | Your Postgres instance. Alternatives: managed (Supabase, Neon, RDS, DO), self-hosted Postgres 15/16, or bundled compose `postgres` service. `postgres://` is auto-normalized to `postgresql://`. |
| `APP_SECRET` | **Req** | — | Signs Better Auth sessions (needs 32+ chars) | `openssl rand -hex 32`. Keep stable — rotating it logs everyone out. |
| `APP_URL` | **Req** | localhost:3000 in dev | Base URL for OAuth callbacks, email links, session baseURL. No trailing slash. Also determines the auth cookie's `secure` flag (checked via `.startsWith("https://")`) — **use the real public `https://` URL in production**, not `http://localhost`. Deliberately **not** prefixed `NEXT_PUBLIC_` — Next.js inlines `NEXT_PUBLIC_*` vars into the compiled bundle at build time, so a value baked in at image-build time would stay frozen forever; `APP_URL` is read live at runtime instead, so the same built image/deploy works across environments. | Your public URL. Must match OAuth redirect URIs exactly. |
| `NEXT_PUBLIC_APP_URL` | Deprecated | — | No longer read anywhere in the app — superseded by `APP_URL` above. Safe to remove; kept in `.env.example` only so older `.env` files don't need to change immediately. | — |
| `NODE_ENV` | Opt | `development` | `development` \| `test` \| `production`. Affects trusted origins & logging. | Set `production` when deployed. |
| `DB_POOL_MAX` | Opt | `20` | Postgres connection pool size per web replica (`lib/db.ts`). | Raise for high traffic; do the math first — `replicas × DB_POOL_MAX` must stay under your database's `max_connections`. |
| `NEXT_PUBLIC_LANDING_ENABLED` | Opt | `true` | **✅ Implemented — verified live.** `false` redirects `/` to `/login` (307, confirmed via `curl`) for internal/team deployments that don't want a public marketing page. Legal pages (`/privacy`, `/terms`, `/cookies`) and booking pages stay public either way (also confirmed live). | Set `false` for internal deployments; leave `true` (default) if you want the marketing landing shown, same as the hosted product. |
| `DEV_TUNNEL_ORIGIN` | Opt | — | **Development only** — allows a tunneling origin (e.g. an ngrok subdomain) to reach `next dev`, for testing OAuth callbacks that need a public URL. Has no effect in production. Not part of `.env.example` on purpose — it's personal to whoever's tunnel it is, not something a template should hardcode. | Set to your own tunnel's hostname if you use one; otherwise leave unset. |
| `GIT_SHA` | Opt | `unknown` | **✅ Implemented — verified live.** Surfaced at `/api/version` alongside the `package.json` name/version. Not a normal `.env` variable — it's a **Docker build-arg** (`.git` is excluded from the build context), so it's set at image-build time, not runtime. See `docs/self-hosting/docker.md`. | `docker build --build-arg GIT_SHA=$(git rev-parse --short HEAD) ...` |

### 2. Email / SMTP

If unset, emails are **logged to the console** instead of sent (fine for dev).
Set these for real delivery (booking confirmations, reminders, magic links).

| Variable | Req? | Default | Purpose | How to get / alternatives |
|---|---|---|---|---|
| `SMTP_HOST` | Cond | — | SMTP server hostname | Any SMTP provider (below) or self-hosted Postfix. |
| `SMTP_PORT` | Opt | `587` | SMTP port | `587` (STARTTLS) or `465` (SSL). |
| `SMTP_SECURE` | Opt | `false` | `true` for SSL/465, else STARTTLS | Set `true` only with port 465. |
| `SMTP_USER` | Cond | — | SMTP username | From your provider. |
| `SMTP_PASS` | Cond | — | SMTP password / API token | From your provider. |
| `EMAIL_FROM` | Opt | — | From header, e.g. `"Schduled <no-reply@example.com>"` | Use a domain you've verified (SPF/DKIM). |
| `EMAIL_WEBHOOK_SECRET` | Opt | — | Bearer token to validate inbound email-provider webhooks (bounces/opens) | From your provider's webhook config. |

**Email provider options (all SMTP-compatible):**

| Provider | Type | Notes |
|---|---|---|
| **Self-hosted Postfix / Maddy / Mailcow** | Self-hosted | Fully in your control; you manage deliverability (SPF/DKIM/DMARC, IP reputation). |
| **Amazon SES** | Cloud, cheap | Great price at scale; SMTP creds from SES console. |
| **Resend** | Cloud, dev-friendly | SMTP + API; simple domain setup. |
| **Postmark** | Cloud | Excellent transactional deliverability. |
| **Mailgun / SendGrid / Brevo** | Cloud | Widely used SMTP. |
| **Mailtrap** | Testing only | Sandbox that captures mail — do **not** use in production. |

### 3. Encryption, admin bootstrap & password login

| Variable | Req? | Default | Purpose | How to get / alternatives |
|---|---|---|---|---|
| `ENCRYPT_KEY` | **Cond** | — | AES-256-GCM key encrypting Google/Zoom OAuth tokens at rest. **Required when Google or Zoom OAuth is set.** 64 hex chars. | `openssl rand -hex 32`. **Back this up** — losing it makes stored tokens unrecoverable (users must reconnect). |
| `INITIAL_ADMIN_EMAIL` | Opt | — | **✅ Implemented.** The moment a user with this email signs up (via password, magic link, or Google), they're auto-promoted to admin. Checked once, at account creation only — demoting them later via the admin panel is not overridden by a later sign-in. | Set it before the operator's first sign-up. Alternative: leave blank and run `pnpm make:admin you@example.com` manually after signup (works for any user, any time — e.g. to add a *second* admin). |
| `NEXT_PUBLIC_PASSWORD_AUTH_ENABLED` | Opt | `true` | **✅ Implemented.** Email + password is the **primary** login method (min. 8-char password), shown first on both the user and admin login pages; magic link and Google are secondary. **On by default** — works on a fresh box with no SMTP or Google. Set `false` only for a magic-link/Google-only deployment. See `SELF-HOSTING.md` Part 4 §E. | Leave at the default (`true`) unless you specifically want to *disable* password login. |
| `ALLOW_PUBLIC_SIGNUP` | Opt | `true` | **✅ Implemented — verified live.** Gates *all* new-account creation (password sign-up, magic link first-use, Google first-login — they all funnel through the same `databaseHooks.user.create.before` hook). The `INITIAL_ADMIN_EMAIL` account is always exempt, so it's safe to close signup from the very start. Tested against a running instance: a random email was rejected (`HTTP 400 FAILED_TO_CREATE_USER`, no DB row written) while the admin email succeeded and was promoted. | **Recommended: set `false` together with `INITIAL_ADMIN_EMAIL`, from day one** — not "open then close." Only set `true` if you deliberately want open public registration. |

> ✅ **Login works out of the box.** Email + password is on by default, so a
> fresh deploy with only the 3 "minimum to boot" vars — no SMTP, no Google — can
> still sign in. Pair `ALLOW_PUBLIC_SIGNUP=false` with `INITIAL_ADMIN_EMAIL` so that
> account can bootstrap while public registration stays closed.
>
> Note: password auth uses the `account.password` column added in migration
> `db/migrations/0013_stale_flatman.sql` — run `pnpm db:migrate` (or let the
> Docker entrypoint do it) so it exists.

### 4. Google OAuth (Sign-in + Calendar + Meet)

Optional. Enables "Continue with Google", Google Calendar sync, and Google Meet
links. **Requires `ENCRYPT_KEY`** when set.

| Variable | Req? | Purpose | How to get |
|---|---|---|---|
| `GOOGLE_CLIENT_ID` | Opt | OAuth client ID | Google Cloud Console → APIs & Services → Credentials → OAuth client (Web). |
| `GOOGLE_CLIENT_SECRET` | Opt | OAuth client secret | Same screen. |

**Setup steps:**
1. Google Cloud Console → create/select a project.
2. Enable **Google Calendar API**.
3. Configure the OAuth consent screen (scopes: `calendar`, `calendar.events`).
4. Create an **OAuth 2.0 Web** client.
5. Add authorized redirect URI:
   `${APP_URL}/api/integrations/google/callback`
   (and the Better Auth sign-in callback if using Google login).
6. Set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `ENCRYPT_KEY`.

> **Google Meet** links are created through the Google Calendar API — no separate
> credential; connecting Google Calendar enables Meet.

### 5. Zoom OAuth (video links)

Optional. Auto-creates Zoom meetings for bookings. **Requires `ENCRYPT_KEY`.**

| Variable | Req? | Purpose | How to get |
|---|---|---|---|
| `ZOOM_CLIENT_ID` | Opt | Zoom OAuth client ID | marketplace.zoom.us → Develop → Build App → **OAuth** (or General app). |
| `ZOOM_CLIENT_SECRET` | Opt | Zoom OAuth client secret | Same app. |

**Setup steps:**
1. marketplace.zoom.us → **Develop → Build App → OAuth**.
2. Scope: `meeting:write:meeting`.
3. Redirect URL: `${APP_URL}/api/integrations/zoom/callback`.
4. Set `ZOOM_CLIENT_ID`, `ZOOM_CLIENT_SECRET`, `ENCRYPT_KEY`.

> Publishing a Zoom app publicly requires Zoom's review (can take weeks). For a
> single self-hosted instance, an unpublished/internal app works for your own account.

### 6. Geocoder (in-person address autocomplete)

Optional. Powers the address field on in-person event types. **Defaults to free,
keyless Photon (OpenStreetMap)** — you don't need to set anything.

| Variable | Req? | Default | Purpose | Alternatives |
|---|---|---|---|---|
| `GEOCODER_PROVIDER` | Opt | auto | Pin provider: `photon` \| `google` \| `mapbox` | Auto-detect order: Mapbox → Google → Photon. |
| `GOOGLE_MAPS_API_KEY` | Opt | — | Google Places key (richer results) | Google Cloud Console → Places API. Paid. |
| `MAPBOX_TOKEN` | Opt | — | Mapbox geocoding token | mapbox.com account. Paid tier above free quota. |

> Self-hosted alternative: run your own **Photon**/**Nominatim** instance for
> full control (no external calls). Default Photon is fine for most.

### 7. File storage

Default is `local` (writes to `./uploads`) — no credentials. Switch to `s3`
or `r2` for durable / multi-instance storage. Uploads are always served
through `/api/files/[...key]`, never a direct/public cloud URL — so no
bucket public-access setup is required for any driver.

| Variable | Req? | Default | Purpose | Alternatives |
|---|---|---|---|---|
| `STORAGE_DRIVER` | Opt | `local` | `local`, `s3`, or `r2` | `local` for single node; `s3`/`r2` for durability/scale. |
| `S3_ENDPOINT` | Opt | — | S3-compatible endpoint | Only for non-AWS endpoints (MinIO, DO Spaces, Backblaze B2, ...); omit for real AWS S3. |
| `S3_REGION` | Cond | — | AWS region | Required when `STORAGE_DRIVER=s3` and not using `S3_ENDPOINT`. |
| `S3_BUCKET` | Cond | — | Bucket name | Required when `STORAGE_DRIVER=s3`. |
| `S3_ACCESS_KEY_ID` | Opt | — | Access key | Omit to use the standard AWS credential chain (IAM role, shared profile). |
| `S3_SECRET_ACCESS_KEY` | Opt | — | Secret key | See above. |
| `R2_BUCKET` | Cond | — | R2 bucket name | Required when `STORAGE_DRIVER=r2`. |
| `R2_ACCOUNT_ID` | Cond | — | Cloudflare account ID | Required when `STORAGE_DRIVER=r2`. |
| `R2_ACCESS_KEY_ID` | Cond | — | R2 access key | Required when `STORAGE_DRIVER=r2`. |
| `R2_SECRET_ACCESS_KEY` | Cond | — | R2 secret key | Required when `STORAGE_DRIVER=r2`. |
| `STORAGE_PUBLIC_BASE_URL` | Opt | — | CDN/public domain bound to the bucket | Not required — reads always go through `/api/files/[...key]`. Only matters if you also want to point external tooling at the bucket yourself. |

**s3 driver also covers:** AWS S3, MinIO (self-hosted), DigitalOcean Spaces,
Backblaze B2, and any other S3-compatible endpoint (via `S3_ENDPOINT`).
**r2 driver** is a dedicated Cloudflare R2 integration.

> ✅ **Implemented**, via [files-sdk](https://files-sdk.dev), in
> [`lib/storage.ts`](./lib/storage.ts) — set `STORAGE_DRIVER=s3` or `r2` and
> the matching vars above, no code edits needed. Every driver is served
> through [`app/api/files/[...key]/route.ts`](./app/api/files/%5B...key%5D/route.ts),
> so the bucket can stay fully private. Build-verified (`tsc` + `pnpm build`
> clean) and round-trip-tested (upload/download/delete) against a live R2
> bucket.

### 8. Branding & contact emails

| Variable | Req? | Default | Purpose | How to get / alternatives |
|---|---|---|---|---|
| `NEXT_PUBLIC_PRODUCT_NAME` | Opt | `Schduled` | **✅ Implemented — verified live.** White-labels the product name: email subjects, iCal `PRODID`, the "Powered by" footer, page titles. Read directly via `process.env.NEXT_PUBLIC_PRODUCT_NAME` in `config/platform.ts` (not via the full `lib/env.ts` — that module is now also imported by client components and requires server secrets that would crash a browser bundle). | Set to your own product/company name. |
| `NEXT_PUBLIC_SHOW_POWERED_BY` | Opt | `true` | **✅ Implemented — verified live.** Shows/hides the "Powered by `<product>`" attribution on public booking pages and the confirmation page. Passed from the parent server-component page down to the client component as a prop. | Set `false` to remove the attribution badge. |
| `CONTACT_EMAIL` | Opt | — | **✅ Implemented.** Server-only — where the `/contact` page's form submissions are routed. Falls back to `SMTP_USER`, then `hello@schduled.com`, if unset (unchanged fallback chain, just now read via the validated `env` object instead of raw `process.env`). | Set to your support inbox. |
| `NEXT_PUBLIC_CONTACT_EMAIL` | Opt | `support@schduled.com` | **✅ Implemented — verified live.** Public "Contact us" address shown on the landing page FAQ and the `/contact` page's "General Enquiries" channel. | Set to your public-facing contact address. |
| `PRIVACY_EMAIL` | Opt | `privacy@schduled.com` | **✅ Implemented — verified live.** Shown on `/contact`, `/privacy`, and `/cookies` for data requests. | Set to your privacy/legal contact address. |

> `INITIAL_ADMIN_EMAIL`, `NEXT_PUBLIC_PASSWORD_AUTH_ENABLED`, `ALLOW_PUBLIC_SIGNUP`,
> and `NEXT_PUBLIC_LANDING_ENABLED` (redirects `/` → `/login` when `false`,
> verified live) are documented in §3 and §1 above.

### 9. Not-yet-implemented integrations (for reference — do NOT set)

These ecosystems appear in the data model but have **no working client yet**, so
there are currently **no env vars to set** and nothing is required. Listed only so
the reference is complete; they're on the "later, for Calendly parity" list in
SELF-HOSTING.md.

| Would-be integration | Future variables (not active) | Status |
|---|---|---|
| Microsoft / Outlook / Office 365 calendar | `MICROSOFT_CLIENT_ID` / `MICROSOFT_CLIENT_SECRET` | Not implemented — only Google works today |
| Microsoft Teams video links | (via Microsoft OAuth above) | Not implemented — only Zoom works today |
| Outbound webhooks | per-user, configured in-app (no global env) | Not implemented |
| Public REST API | API keys stored in DB (no global env) | Not implemented |

> **Today's working integrations are Google (Calendar + Meet) and Zoom only.**
> Don't set Microsoft/Teams variables — they do nothing yet.

---

## Example `.env` files

### Minimal (dev, magic-link only, emails to console)

```env
DATABASE_URL=postgresql://schduled:pass@localhost:5432/schduled
APP_SECRET=<openssl rand -hex 32>
APP_URL=http://localhost:3000
```

Fine for local development — you have a terminal open, so a console-logged
magic link is a non-issue. **Not recommended for a real deployment** — see the
self-hosted example below.

### Self-hosted first boot (recommended starting point)

This example assumes Docker Compose's bundled Postgres (`docker-compose.yml`).
Already have your own database (managed service or self-run)? Use
`docker-compose.external-db.yml` instead, drop `POSTGRES_USER`/
`POSTGRES_PASSWORD`/`POSTGRES_DB` (they don't apply), and point `DATABASE_URL`
at your own host — see `docs/self-hosting/installation.md`, Path A2.

```env
DATABASE_URL=postgresql://schduled:strongpass@postgres:5432/schduled
POSTGRES_USER=schduled
POSTGRES_PASSWORD=strongpass
POSTGRES_DB=schduled
APP_SECRET=<openssl rand -hex 32>
APP_URL=https://schedule.example.com

# Guarantees the first login works even before SMTP/Google are configured
NEXT_PUBLIC_PASSWORD_AUTH_ENABLED=true

# Closes public sign-up from the start — INITIAL_ADMIN_EMAIL is exempt, so
# there's no "open window" between deploy and closing it
ALLOW_PUBLIC_SIGNUP=false

# Auto-promotes this email to admin the moment it signs up
INITIAL_ADMIN_EMAIL=you@example.com
```

Add SMTP/Google/Zoom/storage vars below once you're ready — none of them are
required to get a working, logged-in instance running.

> ✅ **The open-signup gap has been fixed and verified live.**
> `ALLOW_PUBLIC_SIGNUP=false` blocks new-account creation for anyone except the
> `INITIAL_ADMIN_EMAIL` account (tested: a random email got `HTTP 400`, no
> database row written; the admin email succeeded and was promoted). It's
> safe to include `ALLOW_PUBLIC_SIGNUP=false` from your very first deploy — no
> need to "open then close" it manually.

### Production (SMTP + Google + Zoom + local storage)

```env
NODE_ENV=production
DATABASE_URL=postgresql://schduled:strongpass@postgres:5432/schduled
POSTGRES_USER=schduled
POSTGRES_PASSWORD=strongpass
POSTGRES_DB=schduled
APP_SECRET=<openssl rand -hex 32>
APP_URL=https://schedule.example.com

# First-run admin + login safety net (see "Self-hosted first boot" above)
INITIAL_ADMIN_EMAIL=you@example.com
NEXT_PUBLIC_PASSWORD_AUTH_ENABLED=true
ALLOW_PUBLIC_SIGNUP=false

# Email
SMTP_HOST=email-smtp.us-east-1.amazonaws.com
SMTP_PORT=587
SMTP_USER=<smtp-user>
SMTP_PASS=<smtp-pass>
EMAIL_FROM="Schduled <no-reply@example.com>"

# OAuth token encryption (required because Google/Zoom are set)
ENCRYPT_KEY=<openssl rand -hex 32>

# Google Calendar + Meet
GOOGLE_CLIENT_ID=<id>.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=<secret>

# Zoom
ZOOM_CLIENT_ID=<id>
ZOOM_CLIENT_SECRET=<secret>

# Storage (default local; uploads should be on a persistent volume)
STORAGE_DRIVER=local
```

### Production with Cloudflare R2 storage

```env
STORAGE_DRIVER=r2
R2_BUCKET=schduled-uploads
R2_ACCOUNT_ID=<cloudflare-account-id>
R2_ACCESS_KEY_ID=<key>
R2_SECRET_ACCESS_KEY=<secret>
```

### Production with S3-compatible storage (AWS S3, MinIO, DO Spaces, ...)

```env
STORAGE_DRIVER=s3
S3_BUCKET=schduled-uploads
S3_REGION=auto
# S3_ENDPOINT=https://<endpoint>   # only for non-AWS providers
S3_ACCESS_KEY_ID=<key>
S3_SECRET_ACCESS_KEY=<secret>
```

---

## Known limitations for self-hosters (read before production use)

None of these block a self-hosted deployment, but each is a real gap a
production operator should know about up front rather than discover later.
All are tracked with fixes in `SELF-HOSTING.md` Part 4.

- ~~Open signup while password auth is on~~ — **fixed.** `ALLOW_PUBLIC_SIGNUP=false`
  (recommended default for self-host) closes it; `INITIAL_ADMIN_EMAIL` is
  exempt. Verified live — see the "Self-hosted first boot" example above.
- **CSP allows `'unsafe-inline'` for scripts and styles.** Security headers
  (`next.config.mjs`) ship a pragmatic CSP, not a strict nonce-based one —
  `'unsafe-inline'` is needed for Next.js's hydration bootstrap script and
  Tailwind's inline style attributes. `frame-ancestors 'none'` and
  `object-src 'none'` are still enforced (no embedding, no plugins). A fully
  strict CSP would require nonce-generation middleware, a larger change not
  done in this pass.
- **Rate limiting is per-instance, not shared.** `lib/api/helpers.ts` uses an
  in-process `Map` (confirmed via its own code comment: "Single-instance only").
  Running more than one web replica means each replica enforces its own
  independent limit — the *effective* limit becomes N× what's documented, and
  counters reset on every restart/redeploy. Fine for a single instance; don't
  scale to multiple web replicas without replacing this with a shared
  (DB/Redis-backed) limiter.
- ~~Auth cookies behind a reverse proxy aren't explicitly configured~~ —
  **investigated and this isn't actually an issue.** Better Auth derives the
  cookie's `secure` flag from `APP_URL` itself (checked via
  `.startsWith("https://")`), never from request headers — confirmed by
  reading `better-auth`'s own source. Just make sure `APP_URL` is
  the real public `https://` URL in production.
- ~~DB connection pool is fixed at 20, not env-configurable, no connect-retry~~
  — **fixed.** `DB_POOL_MAX` env var (§1) controls pool size; a bounded
  connect-retry now runs once at server boot via `instrumentation.ts`, smoothing
  over Docker Compose startup ordering.
- **Docker packaging is build-verified, not deploy-verified.** The `Dockerfile`,
  `Dockerfile.worker`, and both compose files were written and every piece they
  depend on was individually confirmed (standalone build output exists at the
  right paths, both compose files parse as valid YAML, `drizzle-kit` is a
  production dependency so the dedicated `migrate` service can find it,
  `middleware.ts`'s eager `lib/env.ts` import is satisfied by the Dockerfile's
  build-time placeholder env vars) — but an actual `docker build` /
  `docker compose up` has not been run, since Docker wasn't available in the
  environment this was built in. Run it once yourself before trusting it in
  production.
- **Logs are unstructured.** Plain `console.log`/`console.error` to stdout, no
  `LOG_LEVEL`, no JSON output. Fine for `docker compose logs`; more work if
  you're piping to Loki/CloudWatch/Datadog.
- **No down-migrations.** Drizzle migrations are forward-only. If an upgrade's
  migration causes problems, the recovery path is **restore your pre-upgrade
  database backup and redeploy the previous image/commit** — not an automated
  rollback. Always back up before running `pnpm db:migrate` on an upgrade.
- **`ENCRYPT_KEY` has no rotation tooling.** It's a single static key with no
  versioning. Rotating it today means manually decrypting and re-encrypting
  every stored Google/Zoom token — there's no script for this yet. Treat it
  like a long-lived secret you back up, not one you rotate casually.
- **No CORS policy on API routes.** Fine today (no public/cross-origin API
  surface exists), but relevant if you build anything that calls Schduled's
  API from another origin before an official public API ships.

---

## Security notes

- **Never commit a real `.env`.** Only `.env.example` is tracked.
- **Rotate the secrets** currently in your local `.env` (Google, Zoom, SMTP, S3,
  `APP_SECRET`, `ENCRYPT_KEY`) before making the repo public.
- **Back up `ENCRYPT_KEY`** with your database backups — without it, encrypted
  OAuth tokens can't be decrypted and every user must reconnect calendars/Zoom.
  There is currently no key-rotation tooling (see "Known limitations" above).
- Use a **secrets manager** (Docker secrets, Vault, SSM, Doppler) in production
  rather than a plaintext file where possible.
- `NEXT_PUBLIC_*` variables are **exposed to the browser** — never put secrets in
  a `NEXT_PUBLIC_` name.

---

*Source of truth for the schema: [`lib/env.ts`](./lib/env.ts). Template:
[`.env.example`](./.env.example). Roadmap: [`SELF-HOSTING.md`](./SELF-HOSTING.md).*
