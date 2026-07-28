# Getting Started with Schduled

Run Schduled on your own machine in **5–10 minutes**. No prior knowledge of the project needed — just follow the steps top to bottom.

Schduled is a scheduling platform (event types → availability → bookings) with calendar sync, video-link creation, and email reminders. This guide gets a full local copy running: web app **and** the background worker, backed by a database — **without installing Postgres or Docker** (a local database is bundled).

---

## 1. Prerequisites (install these once)

You need three things. Check what you already have:

```bash
node --version   # must be 22.x  (see .node-version)
pnpm --version   # must be 11+   (project uses pnpm 11.6.0)
git --version    # any recent version
```

If any are missing:

| Tool | How to get it |
|------|---------------|
| **Node.js 22** | Install from <https://nodejs.org> (choose the "22 LTS" build), or with a version manager: `nvm install 22 && nvm use 22`. |
| **pnpm** | `corepack enable` (recommended — picks up the version pinned in `package.json`), or `npm install -g pnpm`. |
| **git** | <https://git-scm.com/downloads> |

> 💡 You do **not** need to install PostgreSQL or Docker. Schduled starts a private database for you in step 4.

---

## 2. Get the code

```bash
git clone https://github.com/dhruti-snapdevio/Schduled.git schduled
cd schduled
pnpm install
```

`pnpm install` downloads all dependencies. It takes a minute or two the first time.

---

## 3. Create your config file

Copy the example environment file. The defaults already work for local development — you don't need to edit anything to get started.

```bash
cp .env.example .env
```

That's it for now. (Email, Google, Zoom, and cloud file storage are all **optional** and covered in [Optional extras](#7-optional-extras) later. For the full meaning of every variable, see [ENVIRONMENT.md](./ENVIRONMENT.md).)

---

## 4. Start the database

Schduled ships with a self-contained PostgreSQL that runs from a local folder — nothing to install.

Open a terminal and run:

```bash
pnpm db:local
```

Leave this terminal **running**. When you see a line like:

```
Postgres running at postgresql://user:password@localhost:5432/schduled
```

…the database is up. The data is saved in a `.schduled-postgres/` folder, so it survives restarts.

> Keep this window open the whole time you use the app. To stop the database later, press `Ctrl+C` here.

---

## 5. Set up the database tables (first time only)

Open a **second** terminal (leave the database running in the first one) and run:

```bash
pnpm db:migrate
```

This creates all the tables. You only need to run this once (and again after pulling changes that add new migrations).

---

## 6. Start the app

In that second terminal, run:

```bash
pnpm dev
```

This starts **two** things at once (you'll see color-coded logs):

- `next` — the web app at **<http://localhost:3000>**
- `worker` — the background worker (sends emails, booking reminders, calendar sync)

Open <http://localhost:3000> in your browser. 🎉

### Create your admin account (fresh install)

Unlike a lot of self-hosted apps, Schduled has **email + password sign-in on by default** (`NEXT_PUBLIC_PASSWORD_AUTH_ENABLED=true`) — no SMTP or Google needed for the very first login.

The very first time you open the app with an empty database, every page redirects you to the **setup wizard** at [`/setup`](http://localhost:3000/setup):

1. Pick an appearance (Light / Dark / System) — purely cosmetic, changeable later.
2. Create your administrator account (name, email, password).
3. You're signed straight in as an admin and redirected to onboarding.

Nothing else to do — the page disappears once the first user exists, and the account is created as a platform admin (`role: admin`) with no extra CLI step.

### Alternative ways to sign in / become admin

**Prefer a magic link?** It still works — enter any email on `/login` and submit. Without SMTP configured, the link is **printed in your terminal** (search the `next`/`worker` logs for a line containing `localhost:3000`). A magic-link account is created as a regular user, not an admin — promote it afterward:

```bash
pnpm make:admin you@example.com
```

**Already have a user you want to promote** (e.g. you signed up before reading this, or want a second admin), the same command works for any existing account, any sign-in method.

**Deploying somewhere and want a zero-click bootstrap?** Set `INITIAL_ADMIN_EMAIL=you@example.com` in `.env` *before* that email's first sign-up (any method) — it's auto-promoted to admin the moment it signs up. See [ENVIRONMENT.md](./ENVIRONMENT.md) § 3 "Encryption, admin bootstrap & password login" for the full self-hosting bootstrap story (this is the recommended approach for production; `/setup` is the friendlier path for local dev and small self-hosted instances).

---

## ✅ You're running!

You should now have:

| Terminal 1 | Terminal 2 | Browser |
|------------|------------|---------|
| `pnpm db:local` (database) | `pnpm dev` (app + worker) | <http://localhost:3000> |

Create an event type, set your availability, and share your booking link.

**To start again next time:** run `pnpm db:local` in one terminal and `pnpm dev` in another. (You do **not** need to repeat `pnpm install` or `pnpm db:migrate` unless dependencies or migrations changed.)

---

## 7. Optional extras

Everything below is optional — the app works fully without it in local development.

### Real email (SMTP)
Without SMTP, emails (including magic links, booking confirmations, and reminders) are logged to the terminal instead of sent — which is all you need for local development. To send real email, fill these in `.env`:

```
SMTP_HOST=...
SMTP_PORT=587
SMTP_USER=...
SMTP_PASS=...
EMAIL_FROM="Schduled <you@yourdomain.com>"
```

Restart `pnpm dev` after editing `.env`.

### Google sign-in + Calendar/Meet
Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in `.env` to enable "Sign in with Google" and two-way Google Calendar sync + Meet link creation. Leave blank to skip. Requires `ENCRYPT_KEY` (see [ENVIRONMENT.md](./ENVIRONMENT.md)) to store OAuth tokens.

### Zoom (video meeting links)
Set `ZOOM_CLIENT_ID` and `ZOOM_CLIENT_SECRET` to let hosts create Zoom links automatically for video event types.

### Address autocomplete (in-person meeting locations)
Works out of the box with the free, keyless Photon (OpenStreetMap) provider. Set `GOOGLE_MAPS_API_KEY` or `MAPBOX_TOKEN` for richer coverage.

### Cloud file storage (S3 / Cloudflare R2)
By default, uploads are stored in the local `./uploads` folder (served through an API route, not `/public`). For production, set `STORAGE_DRIVER=s3` and the `S3_*` credentials in `.env`.

---

## 8. Handy commands

| Command | What it does |
|---------|--------------|
| `pnpm db:local` | Start the bundled local database (keep running) |
| `pnpm db:migrate` | Create/update database tables (uses `drizzle-kit migrate`) |
| `pnpm db:generate` | Generate a new migration from schema changes |
| `pnpm db:push` | Push schema changes directly without a migration file (dev convenience) |
| `pnpm dev` | Start web app + worker together |
| `pnpm dev:next` | Start only the web app (no worker) |
| `pnpm worker` | Start only the worker, with auto-restart on change |
| `pnpm worker:start` | Start only the worker, no auto-restart (closer to production) |
| `pnpm make:admin <email>` | Promote an existing user to admin |
| `pnpm db:reset` | ⚠️ Wipe the database and re-apply all migrations |
| `pnpm lint` / `pnpm lint:fix` | Check / fix code style (Biome) |
| `pnpm format` | Format code (Biome) |
| `pnpm typecheck` | Check types (`tsc --noEmit`) |
| `pnpm build` | Production build |
| `pnpm start` | Run the production build |

---

## 9. Troubleshooting

**`DATABASE_URL is not set`** — You skipped step 3. Run `cp .env.example .env`.

**`pnpm db:migrate` errors with a connection refused** — The database isn't running. Make sure `pnpm db:local` is running in another terminal and shows "Postgres running…" before you migrate.

**Port 3000 already in use** — Another app is using it. Stop that app, or run `next dev -p 3001` and update `APP_URL` in `.env` to match.

**Port 5432 already in use** — A previous database is still running (or a system Postgres is already on that port). Find and stop it, change the port in `DATABASE_URL`, or delete the `.schduled-postgres/` folder to start fresh (this erases local data).

**I never got the magic-link email** — That's expected without SMTP. The link is printed in the terminal running `pnpm dev`. Search the logs for `localhost:3000`.

**Wrong Node version** — Run `node --version`; it must be `22.x`. Switch with `nvm use 22`.

**Start completely over** — Stop everything (`Ctrl+C` in both terminals), delete `.schduled-postgres/`, then repeat steps 4 → 5 → 6.

---

## 10. What's running under the hood

- **Web app** (Next.js + Turbopack) — the UI and API at `localhost:3000`.
- **Worker** — a separate process (pg-boss) that handles background jobs: sending queued emails, booking reminders, and Google Calendar sync. It's why `pnpm dev` starts *two* things.
- **Database** (PostgreSQL) — stores everything; runs locally from `.schduled-postgres/` in development via `pnpm db:local`.

In production these run as separate processes (web app + worker) against a managed PostgreSQL — see [SELF-HOSTING.md](./SELF-HOSTING.md) and [docs/self-hosting/](./docs/self-hosting/) for the full deployment guide, and [ENVIRONMENT.md](./ENVIRONMENT.md) for every environment variable.

---

Questions or stuck? Open an issue — and welcome to Schduled. 🚀
