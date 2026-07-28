# Backup Guide

Three things need backing up: the **database**, **uploaded files** (if
using local storage), and your **`.env` file** (especially `ENCRYPT_KEY`).
Missing any one of these makes a full restore impossible.

## 1. Database

```bash
pg_dump "$DATABASE_URL" -Fc -f schduled-$(date +%F).dump
```

The `-Fc` (custom format) flag produces a compressed, restore-flexible dump
— it's what [Restore](./restore.md) expects.

**Docker Compose, bundled Postgres** (`docker-compose.yml`):
```bash
# ${POSTGRES_USER}/${POSTGRES_DB} below come from your shell, not from .env —
# if you changed them from the defaults, export .env into your shell first,
# otherwise this silently falls back to "schduled"/"schduled" and backs up
# the wrong database.
set -a; source .env; set +a

docker compose exec postgres pg_dump -U "${POSTGRES_USER:-schduled}" -Fc "${POSTGRES_DB:-schduled}" > schduled-$(date +%F).dump
```

**Docker Compose, external Postgres** (`docker-compose.external-db.yml`) —
there's no local `postgres` container to `exec` into; use the plain
`pg_dump "$DATABASE_URL" ...` form above instead, from anywhere with network
access to your database.

### Cron example (daily, 7-day retention)

```cron
0 3 * * * pg_dump "$DATABASE_URL" -Fc -f /backups/schduled-$(date +\%F).dump && find /backups -name 'schduled-*.dump' -mtime +7 -delete
```

## 2. Uploaded files

Only relevant if `STORAGE_DRIVER=local` (the default) — files live in
`./uploads` (or the `uploads` Docker volume). If `STORAGE_DRIVER=s3`,
your files live in your S3/R2 bucket, which has its own durability (still
worth checking your provider's backup/versioning story, but that's outside
Schduled's scope).

```bash
# Docker Compose — volume name assumes you cloned into a "schduled"
# directory; run `docker volume ls | grep uploads` to confirm yours
# (see docker.md's Volumes section)
docker run --rm -v schduled_uploads:/data -v "$(pwd)":/backup \
  alpine tar czf /backup/uploads-$(date +%F).tar.gz -C /data .
```

## 3. Your `.env` file — especially `ENCRYPT_KEY`

Store `.env` somewhere secure (a secrets manager, encrypted backup, or at
minimum a password manager) — not in plaintext next to your database dumps.

**`ENCRYPT_KEY` is the most critical single value to preserve.** It encrypts
every stored Google/Zoom OAuth token (`lib/encrypt.ts`, AES-256-GCM). If you
restore a database backup with a *different* `ENCRYPT_KEY` than the one that
encrypted it, every connected calendar/Zoom integration becomes unreadable
garbage — not just inconvenient, unrecoverable. Users would need to
reconnect every integration from scratch.

### `ENCRYPT_KEY` has no rotation tooling today

There is currently **no supported way to rotate `ENCRYPT_KEY`** — it's a
single static key with no versioning in the encrypted-token format
(`lib/encrypt.ts`). Rotating it would mean manually decrypting every stored
token with the old key and re-encrypting with the new one; no script exists
for this yet. Treat `ENCRYPT_KEY` as a long-lived secret you back up
carefully, not one you rotate casually. If you suspect it's compromised,
the practical response today is: generate a new key, accept that existing
Google/Zoom connections will need to be reconnected by each user, and plan
the token migration as a one-off manual job if you have many users affected.

## What a complete backup looks like

- [ ] Database dump (`.dump` file)
- [ ] Uploads archive (only if `STORAGE_DRIVER=local`)
- [ ] A secure copy of `.env` (or at minimum `ENCRYPT_KEY`, `APP_SECRET`,
      and `DATABASE_URL`)
- [ ] Documented git commit / image tag you backed up from (`/api/version`)

See [Restore](./restore.md) for how these pieces come back together.
