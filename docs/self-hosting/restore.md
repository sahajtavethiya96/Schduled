# Restore Guide

Restoring requires the pieces from [Backup](./backup.md): a database dump,
optionally an uploads archive, and your original `.env` (specifically the
same `ENCRYPT_KEY` and `DATABASE_URL` credentials, or equivalents).

## 1. Provision a fresh database

**Docker Compose, bundled Postgres** (`docker-compose.yml`) — nothing to do
here manually. Bringing the stack up fresh (`docker compose up -d`) already
creates the user/database from `POSTGRES_USER`/`POSTGRES_PASSWORD`/
`POSTGRES_DB` in `.env`; skip to step 2.

**Manual/Node path or an external database** — if you don't already have an
empty Postgres instance ready, connect to Postgres first, then run the SQL
below:
```bash
# Linux (Postgres installed via package manager)
sudo -u postgres psql

# macOS (Homebrew) — your own user is already a superuser
psql postgres
```
```sql
CREATE USER schduled WITH PASSWORD 'strongpass';
CREATE DATABASE schduled OWNER schduled;
```

## 2. Restore the database dump

```bash
pg_restore -d "$DATABASE_URL" --clean --if-exists schduled-<date>.dump
```
`--clean --if-exists` drops existing objects before recreating them —
appropriate for restoring into an empty or matching-schema database. If
you're restoring into a genuinely fresh (empty) database, `--clean` is a
no-op safety net, not a risk.

**Docker Compose, bundled Postgres** (`docker-compose.yml`):
```bash
# Same caveat as Backup: export .env first if you changed POSTGRES_USER/DB
# from the defaults, or this falls back to "schduled"/"schduled".
set -a; source .env; set +a

cat schduled-<date>.dump | docker compose exec -T postgres pg_restore \
  -U "${POSTGRES_USER:-schduled}" -d "${POSTGRES_DB:-schduled}" --clean --if-exists
```

**Docker Compose, external Postgres** (`docker-compose.external-db.yml`) —
there's no local `postgres` container to `exec` into; use the plain
`pg_restore -d "$DATABASE_URL" ...` form above instead.

## 3. Restore uploaded files (if `STORAGE_DRIVER=local`)

```bash
# Volume name assumes a "schduled" clone directory — see docker.md's
# Volumes section if `docker volume ls` shows a different name for yours
docker run --rm -v schduled_uploads:/data -v "$(pwd)":/backup \
  alpine tar xzf /backup/uploads-<date>.tar.gz -C /data
```
Skip this step entirely if you use `STORAGE_DRIVER=s3` — your files live in
the bucket, not in a local volume.

## 4. Restore `.env` — the same `ENCRYPT_KEY` matters most

Use the `.env` from the same backup as the database dump, or at minimum
make sure `ENCRYPT_KEY` matches what was used when the data was encrypted.
**A mismatched `ENCRYPT_KEY` makes every stored Google/Zoom token
permanently unreadable** — see [Backup](./backup.md) for why.

If you don't have the original `ENCRYPT_KEY`, you can still restore
everything else — you'll just need every user to reconnect their calendar
and video integrations from Settings → Integrations afterward.

## 5. Start the app and verify

```bash
docker compose up -d
# external DB: docker compose -f docker-compose.external-db.yml up -d
# or, manual path:
pnpm db:migrate   # applies any migrations newer than the backup, if restoring
                   # onto a newer version of the app — see Upgrade guide
pnpm start &
pnpm worker:start &
```

Verification checklist:
- [ ] `curl <your-url>/api/health` returns `{"status":"ok"}`
- [ ] You can sign in with an existing account
- [ ] Existing bookings/event types are present
- [ ] (If applicable) a connected Google Calendar or Zoom integration still
      works — if not, and you don't have the original `ENCRYPT_KEY`,
      reconnect it manually
- [ ] Send a test booking through and confirm the confirmation email
      arrives (or is logged, if SMTP isn't configured)

## Restoring onto a newer app version

If you're restoring a backup taken from an older version onto a newer
codebase, run `pnpm db:migrate` (or simply `docker compose up -d` — the
dedicated `migrate` service re-runs automatically and applies anything
pending) after restoring the dump. See [Upgrade](./upgrade.md) for the
general upgrade procedure.
