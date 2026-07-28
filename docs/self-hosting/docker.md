# Docker Guide

Official docs: [Docker](https://docs.docker.com/) · [Docker Compose](https://docs.docker.com/compose/)

## Images

Two images are built from this repo:

| Image | Dockerfile | Purpose |
|---|---|---|
| `web` | `Dockerfile` | The Next.js server (`output: 'standalone'`) — serves traffic once the database is migrated |
| `worker` | `Dockerfile.worker` | The background job processor (pg-boss) — emails, reminders, calendar sync |

Both run as a non-root `app` user, share the same `.env`, and connect to the
same PostgreSQL database — that's the only thing they share. No shared
filesystem is required between them (local file storage, if used, only
needs to be on the `web` container).

## `docker-compose.yml`

The compose file at the repo root brings up three services:

```yaml
services:
  postgres:   # PostgreSQL 16, persisted to the postgres-data volume
  web:        # built from Dockerfile — the Next.js server
  worker:     # built from Dockerfile.worker — the background job processor
```

It's intentionally **minimal** — no bundled reverse proxy, no bundled
object storage. Self-hosters are expected to bring their own TLS-terminating
proxy (Caddy/Traefik/nginx) and choose their own storage backend (local
volume, or an S3-compatible bucket via `STORAGE_DRIVER=s3`).

```bash
docker compose up -d              # build + start everything; migrate runs first
docker compose logs -f migrate    # confirm migrations applied cleanly
docker compose logs -f web worker # tail logs
docker compose ps                 # check health status
docker compose down                # stop (keeps volumes)
```

Migrations are not run by the `web` or `worker` images themselves — a
dedicated `migrate` service (built from `Dockerfile.worker`) runs the
migrator once and must exit successfully before `web`/`worker` start
(`depends_on: migrate: condition: service_completed_successfully`).

### `docker-compose.external-db.yml` — bring your own Postgres

If you already have a Postgres database (a managed service like Supabase,
Neon, or RDS, or an instance you run yourself), use this file instead — it
runs only `web` and `worker`, no local `postgres` service or
`postgres-data` volume:

```bash
docker compose -f docker-compose.external-db.yml up -d
```

Point `DATABASE_URL` at your database in `.env`; `POSTGRES_USER` /
`POSTGRES_PASSWORD` / `POSTGRES_DB` don't apply here (see "Path A2 — External
Postgres" in the [Installation guide](./installation.md)). Everything else on
this page — images, volumes, healthchecks for `web` and `worker`, resource
sizing — applies the same way; only the `postgres` service and its rows below
don't exist in this file.

### Volumes

| Volume | Used by | Purpose |
|---|---|---|
| `postgres-data` | `postgres` | Database files — this is your actual data. Back it up. **Bundled compose file only** — doesn't exist in `docker-compose.external-db.yml`, since your database lives outside Compose entirely. |
| `uploads` | `web` | Avatar/logo uploads, **only when `STORAGE_DRIVER=local`** (the default). Not used at all if `STORAGE_DRIVER=s3`. |

The volume name is pinned in `docker-compose.yml` (`name: schduled_uploads`),
so it's always `schduled_uploads` regardless of your clone directory name.
Confirm with:
```bash
docker volume ls | grep uploads
```
The [Backup](./backup.md) and [Restore](./restore.md) guides' example
commands use this exact name.

### Healthchecks

- `postgres`: `pg_isready`, so `web`/`worker` don't start against a
  not-yet-ready database. **Bundled compose file only** — with
  `docker-compose.external-db.yml` there's no local database to gate on, so
  `web`/`worker` start immediately and rely on `restart: unless-stopped` to
  retry if your external database isn't reachable yet.
- `web`: hits its own `/api/health` endpoint, which does a real `SELECT 1`
  against Postgres — not just "is the process alive."
- `worker`: has a `HEALTHCHECK` in `Dockerfile.worker` that checks a
  heartbeat file the worker writes every 15 seconds
  (`scripts/worker.ts`) — this catches a wedged event loop that a plain
  "is the process running" check would miss.

## Building images directly (without compose)

```bash
docker build -t schduled-web -f Dockerfile .
docker build -t schduled-worker -f Dockerfile.worker .
```

To embed the git commit in `/api/version`:
```bash
docker build \
  --build-arg GIT_SHA=$(git rev-parse --short HEAD) \
  -t schduled-web -f Dockerfile .
```
`.git` itself is excluded from the build context (`.dockerignore`), so the
SHA has to be passed explicitly — it isn't read from inside the image.

## Resource sizing

Rough starting point for a small instance (a handful of users, low booking
volume). Scale up if you see OOM restarts or slow response times.

| Container | RAM | CPU | Notes |
|---|---|---|---|
| `web` | 512MB–1GB | 0.5–1 vCPU | `NODE_OPTIONS=--max-old-space-size=768` caps the heap so an OOM is a clean restart, not a silent kill |
| `worker` | 256–512MB | 0.25–0.5 vCPU | Lighter — no HTTP serving, just job processing. Heap capped at 384MB. |
| `postgres` | 512MB–2GB | 0.5–1 vCPU | Depends on data volume; the default `shared_buffers` etc. are fine for a small instance. Bundled compose file only — not applicable to `docker-compose.external-db.yml`, where sizing is your database provider's concern. |
| Disk | 10GB+ | — | Postgres data + uploads (if `STORAGE_DRIVER=local`) — grows with booking history and avatar count |

If you deploy on a memory-limited host (many VPS/PaaS platforms enforce a
hard container memory limit), make sure `NODE_OPTIONS`'s
`--max-old-space-size` value is comfortably *below* that limit, not above
it — V8's heap is only part of a Node process's total memory footprint.

### `sharp` and native builds

Avatar uploads are processed with `sharp`, a native (libvips-based)
dependency. The web `Dockerfile`'s builder stage runs a full `pnpm install`
(not `--prod`) specifically so `sharp` can pull whatever native binary or
build toolchain it needs for your target platform. If you're building on
**ARM64** (Raspberry Pi, Apple Silicon dev machines targeting ARM), expect a
slower first build while `sharp` fetches/builds ARM binaries — this is
normal, not a bug.

## Updating containers

See [Upgrade](./upgrade.md) for the full procedure (back up first). Short
version:
```bash
git pull
docker compose build
docker compose up -d
```
Migrations run automatically via the dedicated `migrate` service, which
`web`/`worker` wait on before starting.
