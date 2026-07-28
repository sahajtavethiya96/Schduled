# Installation Guide

Two ways to run Schduled on your own infrastructure: **Docker Compose**
(recommended) or **manual/Node**. Both are covered below. For every
environment variable referenced here, see [`ENVIRONMENT.md`](../../ENVIRONMENT.md).

## Before you start

**A note on the data model:** Schduled today is **single-user-per-account** —
there's no team/workspace concept yet (tracked as a possible future Phase 5
in `SELF-HOSTING.md`, not started). Each person who signs in gets their own
event types, availability, and bookings; there's no shared team calendar or
multi-user workspace. One instance can host multiple independent users (each
with their own booking page), but they don't share data with each other
beyond what any user could already see (e.g. contacts they've added).
Admins (via the admin-only tabs under `/settings`) can see all users, but
that's an administration view, not a shared workspace.

### Prerequisites

- **Docker path:** [Docker](https://docs.docker.com/engine/install/) 24+ and
  [Docker Compose](https://docs.docker.com/compose/) v2.
- **Manual path:** Node.js 22+, pnpm (`corepack enable` installs the pinned
  version automatically), [PostgreSQL](https://www.postgresql.org/docs/) 15 or 16.
- **Both paths, for production:** a domain name and an HTTPS reverse proxy
  (Caddy, Traefik, or nginx) in front of the app — Google/Zoom OAuth
  callbacks require a real `https://` URL, and `APP_URL` should
  reflect it (see [Configuration](./configuration.md)).

## Path A — Docker Compose (recommended)

```bash
git clone <your-repo-url> schduled
cd schduled
cp .env.example .env
```

Two database options — pick one before editing `.env`:

- **A1 — Let Compose run Postgres for you** (simplest, good default). Use
  `docker-compose.yml` as-is.
- **A2 — Bring your own Postgres** (managed service like Supabase/Neon/RDS,
  or an instance you already run). Use `docker-compose.external-db.yml`
  instead — it only runs `migrate`, `web`, and `worker`, no local database
  container.

### A1 — Bundled Postgres

Edit `.env`:
```env
# Required to boot
DATABASE_URL=postgresql://schduled:strongpass@postgres:5432/schduled
APP_SECRET=<openssl rand -hex 32>
APP_URL=https://schedule.example.com

# Must match DATABASE_URL above — docker compose uses these to create the
# Postgres container's initial user/db
POSTGRES_USER=schduled
POSTGRES_PASSWORD=strongpass
POSTGRES_DB=schduled

# Recommended for self-hosting — see the "first login" note below
NEXT_PUBLIC_PASSWORD_AUTH_ENABLED=true
ALLOW_PUBLIC_SIGNUP=false
INITIAL_ADMIN_EMAIL=you@example.com
```

Start the stack:
```bash
docker compose up -d
docker compose logs -f migrate      # confirm migrations applied cleanly, exits 0
docker compose logs -f web worker   # watch until both say "ready"/"started"
curl http://localhost:3000/api/health   # expect {"status":"ok"}
```

> **Changing `POSTGRES_USER`/`PASSWORD`/`DB` later won't do anything by
> itself.** The Postgres image only applies those variables the *first* time
> it initializes an empty `postgres-data` volume. If you edit them in `.env`
> after that volume already exists and restart, `DATABASE_URL` will silently
> point at credentials/a database that no longer match what's actually in
> Postgres. To change them, either do it before the first `docker compose up
> -d`, or wipe the volume (`docker compose down -v` — **destroys all data**)
> and start fresh.

### A2 — External Postgres

Edit `.env` — point `DATABASE_URL` at your existing database.
`POSTGRES_USER`/`POSTGRES_PASSWORD`/`POSTGRES_DB` aren't used here (those only
configure the bundled Postgres container, which this path doesn't run):
```env
# Required to boot — your existing database, not a Compose-managed one
DATABASE_URL=postgresql://myuser:mypass@my-db-host.example.com:5432/schduled
APP_SECRET=<openssl rand -hex 32>
APP_URL=https://schedule.example.com

# Recommended for self-hosting — see the "first login" note below
NEXT_PUBLIC_PASSWORD_AUTH_ENABLED=true
ALLOW_PUBLIC_SIGNUP=false
INITIAL_ADMIN_EMAIL=you@example.com
```

Start the stack:
```bash
docker compose -f docker-compose.external-db.yml up -d
docker compose -f docker-compose.external-db.yml logs -f migrate
docker compose -f docker-compose.external-db.yml logs -f web worker
curl http://localhost:3000/api/health   # expect {"status":"ok"}
```

There's no local database container to wait on in this path, so if your
database isn't reachable yet when `migrate` starts, it fails and — because
it's `restart: on-failure` — keeps retrying until the database is reachable
and migrations succeed. `web`/`worker` won't start until `migrate` exits 0.

---

Migrations run once via a dedicated `migrate` service (`pnpm db:migrate:docker`)
that must complete successfully before `web`/`worker` start — no manual
migration step, either way.

Open `APP_URL` in a browser and sign up with the email you set
as `INITIAL_ADMIN_EMAIL` — that account is automatically promoted to admin.

## Path B — Manual / Node

```bash
git clone <your-repo-url> schduled
cd schduled
corepack enable
pnpm install
```

Provision a database (or use a managed Postgres, in which case skip straight
to the next step and use its connection details instead). Connect to
Postgres first:
```bash
# Linux (Postgres installed via package manager)
sudo -u postgres psql

# macOS (Homebrew) — your own user is already a superuser
psql postgres
```
Then run:
```sql
CREATE USER schduled WITH PASSWORD 'strongpass';
CREATE DATABASE schduled OWNER schduled;
```

Configure and migrate:
```bash
cp .env.example .env
# edit .env — same variables as the Docker path above, but DATABASE_URL's
# host is wherever your Postgres actually is (often "localhost")
pnpm db:migrate
pnpm build
```

Run **both** processes — the web server and the background worker are
separate; both must be running for the app to fully work (emails,
reminders, and calendar sync happen in the worker):
```bash
pnpm start &
pnpm worker:start &
```

For production, run these under a process manager instead of background
shell jobs — see the systemd example below.

### systemd units (manual path, production)

Find your actual `pnpm` path first — it's often **not** `/usr/bin/pnpm`,
especially if you installed Node via nvm/fnm/volta rather than a system
package:
```bash
which pnpm
```
Use whatever that prints for `ExecStart` below instead of `/usr/bin/pnpm` if
it differs.

```ini
# /etc/systemd/system/schduled-web.service
[Unit]
Description=Schduled web
After=network.target postgresql.service

[Service]
WorkingDirectory=/opt/schduled
EnvironmentFile=/opt/schduled/.env
ExecStart=/usr/bin/pnpm start
Restart=always
User=schduled

[Install]
WantedBy=multi-user.target
```

```ini
# /etc/systemd/system/schduled-worker.service
[Unit]
Description=Schduled background worker
After=network.target postgresql.service

[Service]
WorkingDirectory=/opt/schduled
EnvironmentFile=/opt/schduled/.env
ExecStart=/usr/bin/pnpm worker:start
Restart=always
User=schduled

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable --now schduled-web schduled-worker
```

Put your reverse proxy in front of `127.0.0.1:3000` for TLS termination —
see the next section for real config to copy.

## Reverse proxy (both paths, production)

Required for production either way: Google/Zoom OAuth callbacks need a real
`https://` URL, and `APP_URL` should match it exactly. The app
itself always listens on plain HTTP at `3000` (`127.0.0.1:3000` for the
manual path, `localhost:3000` for Docker Compose) — your proxy handles TLS
in front of it.

**Caddy** (simplest — automatic HTTPS via Let's Encrypt, no manual cert
handling):
```caddyfile
# /etc/caddy/Caddyfile
schedule.example.com {
	reverse_proxy localhost:3000
}
```
```bash
sudo systemctl reload caddy
```

**nginx** (you manage certs yourself, e.g. via `certbot`):
```nginx
# /etc/nginx/sites-available/schduled
server {
	listen 80;
	server_name schedule.example.com;
	return 301 https://$host$request_uri;
}

server {
	listen 443 ssl;
	server_name schedule.example.com;

	ssl_certificate     /etc/letsencrypt/live/schedule.example.com/fullchain.pem;
	ssl_certificate_key /etc/letsencrypt/live/schedule.example.com/privkey.pem;

	location / {
		proxy_pass http://localhost:3000;
		proxy_set_header Host $host;
		proxy_set_header X-Real-IP $remote_addr;
		proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
		proxy_set_header X-Forwarded-Proto $scheme;
	}
}
```
```bash
sudo ln -s /etc/nginx/sites-available/schduled /etc/nginx/sites-enabled/
sudo certbot --nginx -d schedule.example.com
sudo systemctl reload nginx
```

Either way, once it's up: `APP_URL=https://schedule.example.com`
in `.env`, and confirm `curl https://schedule.example.com/api/health` returns
`{"status":"ok"}` through the proxy, not just on `localhost:3000` directly.

## First login — read this before you deploy

**Email + password is the primary login method and is on by default**, so a
fresh deploy with no SMTP and no Google can still sign in — no lockout risk.
(Magic link and Google are optional secondary methods; magic link needs SMTP
to actually deliver, otherwise the link only reaches the server console.)

**Recommended:** set these two alongside the default password login, from the
start:
```env
ALLOW_PUBLIC_SIGNUP=false
INITIAL_ADMIN_EMAIL=you@example.com
# NEXT_PUBLIC_PASSWORD_AUTH_ENABLED defaults to true — only set it to false
# if you want a magic-link/Google-only deployment.
```
This closes public sign-up while the `INITIAL_ADMIN_EMAIL` account stays exempt
(so it can always create itself, even with signup closed) and is auto-promoted
to admin. See `ENVIRONMENT.md` §3 for the full explanation.

## Post-install checklist

- [ ] `curl <your-url>/api/health` returns `{"status":"ok"}`
- [ ] You can sign in with the `INITIAL_ADMIN_EMAIL` account
- [ ] Signed in as the admin, the admin-only tabs under `/settings` (Users, Audit, Jobs, Platform) are reachable
- [ ] `ALLOW_PUBLIC_SIGNUP=false` is set (or you've deliberately chosen open signup)
- [ ] The worker is running — a test booking sends a confirmation
      (or logs one to the console if SMTP isn't configured)
- [ ] Backups are scheduled — see [Backup](./backup.md)
- [ ] If using Google/Zoom, redirect URIs match `APP_URL` exactly
      — see [Integrations](./integrations.md)

## Next steps

- [Docker Guide](./docker.md) — image details, volumes, healthchecks, updating
- [Configuration](./configuration.md) — every env var, minimal vs full setup
- [Integrations](./integrations.md) — Google Calendar/Meet, Zoom, SMTP
- [Backup](./backup.md) and [Restore](./restore.md) — before you need them
- [Upgrade](./upgrade.md) — how to update safely later
