# Schduled

Schduled is a smart scheduling platform for modern professionals. Share a booking link, set your availability, and let invitees pick a time — no back-and-forth.

- Next.js App Router UI
- Postgres and Drizzle ORM
- Better Auth — magic-link, email + password, and Google login
- pg-boss background worker queues
- Durable email outbox via SMTP (nodemailer)
- Admin-only screens (users, queue state, email visibility) built into the dashboard, gated by role
- S3/R2-compatible file storage (or local disk)
- Self-hostable — Docker Compose or manual/Node deploy

## Two ways to run this

### Self-hosting (production / your own server)

See **[SELF-HOSTING.md](./SELF-HOSTING.md)** for the full guide, and
**[ENVIRONMENT.md](./ENVIRONMENT.md)** for every environment variable
(what it does, whether it's required, how to obtain it). Quick version:

```bash
git clone <this-repo-url> schduled && cd schduled
cp .env.example .env
# set DATABASE_URL, APP_SECRET, NEXT_PUBLIC_APP_URL, and (recommended)
# NEXT_PUBLIC_PASSWORD_AUTH_ENABLED=true + ALLOW_PUBLIC_SIGNUP=false + INITIAL_ADMIN_EMAIL
docker compose up -d
```

Already have a Postgres database (managed service, or your own instance)?
Use `docker compose -f docker-compose.external-db.yml up -d` instead — see
Installation's Path A2 for the full walkthrough.

The full guide set lives in [`docs/self-hosting/`](./docs/self-hosting/):
[Installation](./docs/self-hosting/installation.md) ·
[Docker](./docs/self-hosting/docker.md) ·
[Upgrade](./docs/self-hosting/upgrade.md) ·
[Backup](./docs/self-hosting/backup.md) ·
[Restore](./docs/self-hosting/restore.md) ·
[Configuration](./docs/self-hosting/configuration.md) ·
[Integrations](./docs/self-hosting/integrations.md).

### Local development (working on Schduled itself)

```bash
corepack enable
pnpm install
cp .env.example .env
pnpm db:local       # starts a throwaway embedded Postgres — dev only
pnpm db:migrate
pnpm dev            # runs the web app + background worker together
```

Open `http://localhost:3000` — on a fresh (empty) database you're redirected
straight to the **setup wizard** at `/setup`, which creates your admin
account in one step (pick an appearance, set a name/email/password, you're
signed in). No separate promote step needed.

Prefer a magic link, or already have a non-admin account to promote?

```bash
pnpm make:admin you@example.com
```

Without `SMTP_HOST`, `SMTP_USER`, and `SMTP_PASS`, the worker logs emails to
the console instead of sending them.

📖 Full step-by-step walkthrough (with troubleshooting): **[SETUP.md](./SETUP.md)**.

See [CONTRIBUTING.md](./CONTRIBUTING.md) for coding conventions and the PR
checklist before submitting changes, [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md)
for community expectations, and [SECURITY.md](./SECURITY.md) to report a
vulnerability.

## Structure

- `app/` — public landing, auth, user dashboard (including admin-only settings tabs), booking pages, and API routes
- `db/schema/` — all database table definitions
- `lib/auth.ts` — Better Auth configuration (magic link, password, Google OAuth)
- `lib/email/` — persists outbound email before enqueueing work
- `lib/worker/` — pg-boss queues and job handlers
- `components/` — shared UI kit and scaffold shell
- `docker/` — Docker Compose entrypoint script
- `docs/self-hosting/` — the self-hosting guide set
- [SETUP.md](./SETUP.md) — local development, start to finish

See [docs/project-structure.md](./docs/project-structure.md) for the full
project layout.

## Status

Version and current git commit are exposed at `/api/version` on a running
instance. See [CHANGELOG.md](./CHANGELOG.md) for what's changed.
