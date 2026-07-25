# Configuration Guide

All configuration is environment variables. The full reference — every
variable, whether it's required, its default, and how to obtain it — lives
in **[`ENVIRONMENT.md`](../../ENVIRONMENT.md)**. This page is a short map
of *how* configuration works and *what* the minimal-vs-full setups look
like; it doesn't repeat the full variable list.

## How it's validated

Every environment variable is parsed and validated at boot by
[`lib/env.ts`](../../lib/env.ts) using Zod. If something required is
missing, or a value doesn't match the expected shape, **the app refuses to
start** and prints exactly which variable failed. This is deliberate — a
misconfigured instance fails loudly at boot, not confusingly at 2am when a
feature is first used.

## Minimal config (boots, but read this first)

Only three variables are strictly required to boot:

```env
DATABASE_URL=postgresql://user:pass@host:5432/schduled
APP_SECRET=<openssl rand -hex 32>
APP_URL=https://your-domain.example
```

**This is enough to start the app and log into it** — email + password login is
on by default, so no SMTP or Google is needed for the first sign-in. See
[Installation → "First login"](./installation.md#first-login--read-this-before-you-deploy)
for the recommended setup (add `ALLOW_PUBLIC_SIGNUP=false` + `INITIAL_ADMIN_EMAIL`).

## Full config — by feature

Each of these is fully optional and the app runs without it — set them
when you need the feature:

| Feature | Vars (see `ENVIRONMENT.md` for details) | Guide |
|---|---|---|
| Real email delivery | `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM` | [Integrations](./integrations.md) |
| Google Calendar + Meet | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `ENCRYPT_KEY` | [Integrations](./integrations.md) |
| Zoom | `ZOOM_CLIENT_ID`, `ZOOM_CLIENT_SECRET`, `ENCRYPT_KEY` | [Integrations](./integrations.md) |
| Password login | `NEXT_PUBLIC_PASSWORD_AUTH_ENABLED` | `ENVIRONMENT.md` §3 |
| Closed signup | `ALLOW_PUBLIC_SIGNUP`, `INITIAL_ADMIN_EMAIL` | `ENVIRONMENT.md` §3 |
| S3/R2 storage | `STORAGE_DRIVER=s3` + `S3_*`, or `STORAGE_DRIVER=r2` + `R2_*` | `ENVIRONMENT.md` §7 |
| Address autocomplete | `GEOCODER_PROVIDER`, `GOOGLE_MAPS_API_KEY`, `MAPBOX_TOKEN` | `ENVIRONMENT.md` §6 |
| Branding | `NEXT_PUBLIC_PRODUCT_NAME`, `NEXT_PUBLIC_SHOW_POWERED_BY`, `CONTACT_EMAIL`, `NEXT_PUBLIC_CONTACT_EMAIL`, `PRIVACY_EMAIL` | `ENVIRONMENT.md` §8 |
| Optional landing page | `NEXT_PUBLIC_LANDING_ENABLED` | `ENVIRONMENT.md` §1 |
| DB connection pool | `DB_POOL_MAX` | `ENVIRONMENT.md` §1 |

## Where variables live

- **Docker Compose:** a single `.env` file at the repo root — read both by
  `docker compose` itself (for `${POSTGRES_USER}`-style substitution in
  `docker-compose.yml`) and passed into the containers via `env_file`.
- **Manual/Node:** the same `.env` file, loaded by the app at startup.
- **Never committed:** `.env` is git-ignored; only `.env.example` (the
  template, no real values) is tracked.

## `NEXT_PUBLIC_*` variables are public — and inlined at build time

Anything prefixed `NEXT_PUBLIC_` is bundled into the browser JavaScript and
is visible to anyone who opens dev tools — never put a secret in a
`NEXT_PUBLIC_` variable. All the current `NEXT_PUBLIC_*` variables
(`NEXT_PUBLIC_PASSWORD_AUTH_ENABLED`, `NEXT_PUBLIC_LANDING_ENABLED`,
`NEXT_PUBLIC_PRODUCT_NAME`, `NEXT_PUBLIC_SHOW_POWERED_BY`,
`NEXT_PUBLIC_CONTACT_EMAIL`) are non-sensitive by design.

There's a second, less obvious consequence: Next.js **inlines**
`NEXT_PUBLIC_*` references into the compiled bundle (client *and* server
chunks) at `next build` time — it does not read them live from the
container's environment at runtime like ordinary vars. That's exactly why
the app's own base URL is `APP_URL` (§ above), not `NEXT_PUBLIC_APP_URL`:
a value baked into a Docker image at build time would stay frozen forever,
so redeploying the same image with a different `APP_URL` in `env_file`
wouldn't work if it were `NEXT_PUBLIC_`-prefixed. `APP_URL` is read fresh
from `process.env` at request time instead.
