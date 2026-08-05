# Schduled — Pre-Development Setup & Planning

> Complete this document **before writing a single line of application code.**
> Every credential, package, folder, and config listed here must be in place so development flows without stopping to hunt for keys or install missing tools.

---


## Table of Contents

1. [Local Machine Requirements](#1-local-machine-requirements)
2. [External Accounts to Create](#2-external-accounts-to-create)
3. [Credential Setup — Step by Step](#3-credential-setup--step-by-step)
4. [Complete Package List](#4-complete-package-list)
5. [Environment Variables — Full Template](#5-environment-variables--full-template)
6. [Project Folder Structure](#6-project-folder-structure)
7. [Database Setup](#7-database-setup)
8. [Pre-Development Checklist](#8-pre-development-checklist)

---

## 1. Local Machine Requirements

Install these tools on your development machine before anything else.

| Tool | Minimum Version | How to Check | Install |
|------|----------------|-------------|---------|
| **Node.js** | 20.x LTS | `node -v` | [nodejs.org](https://nodejs.org) |
| **npm** | 10.x | `npm -v` | Comes with Node.js |
| **PostgreSQL** | 16+ | `psql --version` | [postgresql.org](https://www.postgresql.org) |
| **Git** | Any recent | `git --version` | Pre-installed on most systems |
| **VS Code** | Any | — | [code.visualstudio.com](https://code.visualstudio.com) |

> **No PostgreSQL install? Use `embedded-postgres`.**
> If you prefer not to install PostgreSQL on your machine, `embedded-postgres` downloads and runs a real PostgreSQL 16 binary as a separate local process — no system install needed. Run `pnpm db:local` in one terminal, then `pnpm dev` in another. See [Section 7.1 — Option B](#option-b-embedded-postgres-zero-install) for setup.

**Recommended VS Code Extensions:**
- Biome (replaces ESLint + Prettier — install the `biomejs.biome` extension)
- Tailwind CSS IntelliSense
- Drizzle ORM IntelliSense
- PostgreSQL (for DB browsing)

---

## 2. External Accounts to Create

You need accounts on **5 external services** before starting. Create them in this order — some approvals take time.

| # | Service | Used For | Cost | Time to Set Up |
|---|---------|----------|------|----------------|
| 1 | **Google Cloud Console** | Google OAuth sign-in + Google Calendar API + Google Meet link generation | Free | ~15 minutes |
| 2 | **Microsoft Azure Portal** | Microsoft Graph API — Outlook calendar sync + Teams meeting creation | Free | ~20 minutes |
| 3 | **Zoom Developer Portal** | Zoom OAuth app — create unique Zoom meeting per booking | Free | ~10 minutes |
| 4 | **S3-compatible Storage** | File storage — profile photos, logos, banners | Free tier available | ~10 minutes |
| 5 | **SMTP Email Provider** | Sending transactional emails (confirmations, reminders, resets) | Free tier available | ~5 minutes |

> **Tip:** Set up all 5 accounts in one session. Keep a secure note with all credentials ready before starting `Phase 0` of development.

---

## 3. Credential Setup — Step by Step

### 3.1 Google Cloud Console

**Used for:** Google OAuth sign-in (Better Auth) + Google Calendar API (read/write) + Google Meet link generation

**Steps:**

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create a new project — name it `schduled-dev`
3. Go to **APIs & Services → Library**
   - Enable: **Google Calendar API**
   - Enable: **Google People API** (for OAuth user profile)
4. Go to **APIs & Services → OAuth consent screen**
   - User type: **External**
   - App name: `Schduled`
   - User support email: your email
   - Scopes to add:
     - `openid`
     - `email`
     - `profile`
     - `https://www.googleapis.com/auth/calendar`
     - `https://www.googleapis.com/auth/calendar.events`
   - Add your email as a **Test user** (required before publishing)
5. Go to **APIs & Services → Credentials → Create Credentials → OAuth Client ID**
   - Application type: **Web application**
   - Authorized redirect URIs:
     - `http://localhost:3000/api/auth/callback/google` (development)
     - `https://yourdomain.com/api/auth/callback/google` (production — add later)
6. Copy and save:
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`

---

### 3.2 Microsoft Azure Portal

**Used for:** Microsoft Graph API — reading/writing Outlook calendar + creating Teams meeting links
> **Not** used for user sign-in. This is calendar integration only.

**Steps:**

1. Go to [portal.azure.com](https://portal.azure.com) (create a free account if needed)
2. Search for **App registrations → New registration**
   - Name: `Schduled Calendar Integration`
   - Supported account types: **Accounts in any organizational directory and personal Microsoft accounts**
   - Redirect URI: Web → `http://localhost:3000/api/calendars/microsoft/callback`
3. Go to **API permissions → Add a permission → Microsoft Graph → Delegated permissions**
   - Add:
     - `Calendars.ReadWrite`
     - `OnlineMeetings.ReadWrite` (for Teams meetings)
     - `User.Read`
   - Click **Grant admin consent**
4. Go to **Certificates & secrets → New client secret**
   - Description: `schduled-dev`
   - Expires: 24 months
5. Copy and save **immediately** (shown only once):
   - `MICROSOFT_CLIENT_ID` (from Overview → Application (client) ID)
   - `MICROSOFT_CLIENT_SECRET` (the secret value you just created)

---

### 3.3 Zoom Developer Portal

**Used for:** Creating a unique Zoom meeting link for every booking

**Steps:**

1. Go to [marketplace.zoom.us/develop/create](https://marketplace.zoom.us/develop/create)
2. Choose **OAuth** app type
3. App name: `Schduled`
4. Choose: **User-managed** app
5. Redirect URL: `http://localhost:3000/api/video/zoom/callback`
6. Add scopes:
   - `meeting:write:admin`
   - `meeting:write`
   - `user:read:admin`
7. Copy and save:
   - `ZOOM_CLIENT_ID`
   - `ZOOM_CLIENT_SECRET`
   - `ZOOM_REDIRECT_URI` = `http://localhost:3000/api/video/zoom/callback`

> **Note:** Zoom apps start in development mode. For production you submit for review. Development mode is fine for local testing — only the app owner's Zoom account can connect.

---

### 3.4 S3-Compatible Storage

**Used for:** Storing profile photos, organisation logos, and banner images via presigned upload URLs.

**Choose one provider** (all use the same `@aws-sdk/client-s3` package):

| Provider | Free Tier | Best For | Extra Config |
|----------|----------|---------|-------------|
| **AWS S3** | 5GB / 12 months | Standard choice | Set `S3_ENDPOINT` to blank |
| **Cloudflare R2** | 10GB free forever | No egress fees | Set `S3_ENDPOINT` to R2 URL |
| **Backblaze B2** | 10GB free | Cheapest at scale | Set `S3_ENDPOINT` to B2 URL |
| **MinIO** | Unlimited (self-hosted) | Full control | Set `S3_ENDPOINT` to localhost |

**Steps (example: AWS S3):**

1. Create AWS account at [aws.amazon.com](https://aws.amazon.com)
2. Go to **S3 → Create bucket**
   - Name: `schduled-uploads-dev`
   - Region: closest to your users
   - Block all public access: **ON** (files accessed via presigned URLs only)
3. Go to **IAM → Users → Create user**
   - Username: `schduled-s3-dev`
   - Attach policy: **AmazonS3FullAccess** (or create a custom policy scoped to only your bucket)
4. Go to **Security credentials → Create access key**
5. Copy and save:
   - `S3_ACCESS_KEY_ID`
   - `S3_SECRET_ACCESS_KEY`
   - `S3_REGION` (e.g. `us-east-1`)
   - `S3_BUCKET_NAME` (e.g. `schduled-uploads-dev`)
   - `S3_ENDPOINT` — leave blank for AWS; set for other providers

**Add CORS policy to the bucket** (required for browser direct uploads):
```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["PUT", "GET"],
    "AllowedOrigins": ["http://localhost:3000"],
    "ExposeHeaders": []
  }
]
```

---

### 3.5 SMTP Email

**Used for:** All transactional emails — booking confirmations, reminders, password resets, magic links, welcome emails.

**Choose one option:**

| Option | Cost | Best For | Config |
|--------|------|---------|--------|
| **Gmail SMTP** | Free (500/day) | Development + small scale | Enable 2FA → create App Password |
| **Outlook SMTP** | Free | Same as Gmail | Similar app password setup |
| **Mailhog** (local) | Free | Local dev only — captures emails without sending | `smtp://localhost:1025` |
| **Postfix** (self-hosted) | Free | Full control | Complex setup |
| **Mailtrap** | Free tier | Development testing | Catches all emails, shows in inbox |

**Gmail App Password (recommended for dev):**

1. Google Account → Security → 2-Step Verification (must be enabled)
2. Google Account → Security → App passwords
3. Select app: **Mail** | Device: **Other** → name it `Schduled Dev`
4. Copy the 16-character password

```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=yourname@gmail.com
SMTP_PASS=xxxx xxxx xxxx xxxx   ← the 16-char app password
SMTP_FROM_EMAIL=yourname@gmail.com
SMTP_FROM_NAME=Schduled
```

**Mailhog for local dev (zero config — emails never actually send):**
```bash
# Mac
brew install mailhog && mailhog

# Docker
docker run -d -p 1025:1025 -p 8025:8025 mailhog/mailhog
# View caught emails at http://localhost:8025
```

---

## 4. Complete Package List

### 4.1 Create the Next.js Project First

```bash
npx create-next-app@latest schduled \
  --typescript \
  --tailwind \
  --app \
  --src-dir \
  --import-alias "@/*"

cd schduled
```

### 4.2 Install All Dependencies — One Command

**Production dependencies:**
```bash
pnpm add \
  drizzle-orm postgres \
  better-auth \
  pg-boss \
  nodemailer \
  @react-email/components react-email \
  @react-email/render \
  date-fns date-fns-tz \
  ical-generator \
  zod \
  @hookform/resolvers react-hook-form \
  @aws-sdk/client-s3 @aws-sdk/s3-request-presigner \
  googleapis \
  @microsoft/microsoft-graph-client \
  @paralleldrive/cuid2 \
  sonner \
  next-themes \
  clsx tailwind-merge \
  class-variance-authority \
  @headlessui/react \
  @floating-ui/react \
  @phosphor-icons/react \
  geist \
  tsx
```

**Development dependencies:**
```bash
pnpm add -D \
  drizzle-kit \
  @biomejs/biome \
  concurrently \
  postcss \
  @tailwindcss/postcss \
  @types/node \
  @types/nodemailer \
  @microsoft/microsoft-graph-types \
  embedded-postgres   # optional — only if using Option B (no local PostgreSQL install)
```

> **Note:** `tsdav` (Apple CalDAV) is Phase 2 — do not install at MVP. Add it when implementing iCloud Calendar integration.

**Add `package.json` scripts:**
```json
{
  "scripts": {
    "dev": "concurrently \"next dev\" \"tsx src/lib/worker/index.ts\"",
    "worker": "tsx src/lib/worker/index.ts",
    "db:local": "tsx scripts/dev-db.ts",
    "build": "next build",
    "start": "next start",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "db:studio": "drizzle-kit studio",
    "lint": "biome lint .",
    "format": "biome format --write ."
  }
}
```

**Add `biome.jsonc` to project root:**
```jsonc
{
  "$schema": "https://biomejs.dev/schemas/1.9.4/schema.json",
  "organizeImports": { "enabled": true },
  "linter": {
    "enabled": true,
    "rules": { "recommended": true }
  },
  "formatter": {
    "enabled": true,
    "indentStyle": "space",
    "indentWidth": 2
  },
  "javascript": {
    "formatter": { "quoteStyle": "single", "trailingCommas": "all" }
  }
}
```

### 4.3 Husky Pre-Commit Hook

Husky runs Biome automatically before every `git commit`. This catches formatting and lint errors before they reach the repository — no CI surprise failures because someone forgot to run `pnpm format`.

**1. Install and initialise husky:**

```bash
pnpm add -D husky
npx husky init
```

This creates a `.husky/` directory with a sample `pre-commit` file.

**2. Replace `.husky/pre-commit` with the Biome check:**

```bash
# .husky/pre-commit
pnpm biome check --write .
git add -A   # re-stage any files Biome auto-fixed
```

Or write it in one command:

```bash
echo 'pnpm biome check --write .\ngit add -A' > .husky/pre-commit
```

**3. Verify it works:**

```bash
git add .
git commit -m "test: verify husky hook"
# Should see Biome run and auto-fix before the commit completes
```

> **What `--write` does:** Biome auto-fixes safe issues (formatting, import order) instead of just reporting them. The `git add -A` after it re-stages the fixed files so the commit includes the formatted versions — not the original dirty versions.

> **Skip the hook when needed** (e.g. a WIP commit): `git commit --no-verify -m "wip"` — use sparingly.

---

### 4.5 Shadcn/UI Setup

```bash
npx shadcn@latest init
```

When prompted:
- Style: **Default**
- Base color: **Slate**
- CSS variables: **Yes**

Then add all needed components:
```bash
npx shadcn@latest add \
  button input label form \
  dialog sheet drawer \
  dropdown-menu select \
  checkbox radio-group switch \
  calendar date-picker \
  card badge avatar \
  table tabs \
  toast sonner \
  separator scroll-area \
  skeleton \
  accordion \
  tooltip popover \
  command
```

### 4.6 Full Package Reference Table

| Package | Version | Purpose |
|---------|---------|---------|
| `next` | 15.x | Framework — App Router, Server Components, Server Actions, ISR |
| `react` / `react-dom` | 19.x | Included with Next.js 15 |
| `typescript` | 5.x | Type safety across full stack |
| `tailwindcss` | 4.x | Utility-first CSS *(dev — compiled at build time)* |
| `drizzle-orm` | latest | TypeScript ORM — schema-as-code, type-safe queries |
| `drizzle-kit` | latest | Dev tool — migration generation and Drizzle Studio |
| `postgres` | latest | PostgreSQL client driver (used by Drizzle) |
| `better-auth` | latest | Auth — email/password, Google OAuth, magic link, sessions, admin plugin |
| `pg-boss` | latest | PostgreSQL-backed job queue — no Redis required |
| `nodemailer` | latest | SMTP email delivery |
| `@react-email/components` | latest | Email template component library |
| `@react-email/render` | latest | Renders React Email components to HTML string — used in worker |
| `react-email` | latest | Email template dev server (`pnpm email:preview`) |
| `date-fns` | latest | Date arithmetic (add, subtract, format) |
| `date-fns-tz` | latest | Timezone-aware date arithmetic using IANA names — DST-safe |
| `ical-generator` | latest | RFC 5545-compliant `.ics` calendar invite file generator |
| `zod` | latest | Runtime validation for API inputs, forms, env vars |
| `react-hook-form` | latest | Performant forms with minimal re-renders |
| `@hookform/resolvers` | latest | Zod resolver for react-hook-form |
| `@aws-sdk/client-s3` | latest | S3-compatible storage client (AWS, R2, MinIO, B2) |
| `@aws-sdk/s3-request-presigner` | latest | Generate presigned upload/download URLs |
| `googleapis` | latest | Google Calendar API + Google Meet link generation |
| `@microsoft/microsoft-graph-client` | latest | Microsoft Graph — Outlook calendar + Teams meetings |
| `@paralleldrive/cuid2` | latest | Collision-resistant, URL-safe, sortable IDs for all app tables |
| `sonner` | latest | Toast notifications |
| `next-themes` | latest | Light/dark/system theme switching |
| `clsx` | latest | Conditional className utility |
| `tailwind-merge` | latest | Merge Tailwind classes without conflicts |
| `class-variance-authority` | latest | Type-safe component variants (used by Shadcn/UI) |
| `@phosphor-icons/react` | ^2.1.10 | Icon library — all Phosphor icons; use `/dist/ssr` import in Server Components |
| `geist` | latest | Vercel's Geist font (sans + mono) |
| `@headlessui/react` / `@floating-ui/react` | latest | Headless UI primitives — consumed by Shadcn/UI components |
| `tsx` | latest | Run TypeScript files directly — used by the worker process in production |
| **Dev only** | | |
| `@biomejs/biome` | latest | Linter + formatter — replaces ESLint + Prettier; 10-50× faster |
| `concurrently` | latest | Run Next.js server and pg-boss worker in parallel in dev |
| `postcss` | latest | PostCSS processor — required peer of `@tailwindcss/postcss` |
| `@tailwindcss/postcss` | latest | PostCSS plugin for Tailwind v4 |
| `@types/node` | latest | TypeScript types for Node.js built-ins |
| `tsdav` | latest | CalDAV client — Apple iCloud calendar *(Phase 2 only — do not install at MVP)* |

---

## 5. Environment Variables — Full Template

Create a `.env.local` file in the project root. **Never commit this file to git.**

```bash
# .env.local
# ─────────────────────────────────────────────────────────────
# CORE
# ─────────────────────────────────────────────────────────────

# PostgreSQL connection string
DATABASE_URL=postgresql://postgres:password@localhost:5432/schduled_dev

# Better Auth — generate with: openssl rand -base64 32
BETTER_AUTH_SECRET=

# The full URL of your app (no trailing slash)
BETTER_AUTH_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000

# ─────────────────────────────────────────────────────────────
# GOOGLE — OAuth sign-in + Calendar API + Google Meet
# From: console.cloud.google.com → APIs & Services → Credentials
# ─────────────────────────────────────────────────────────────
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# ─────────────────────────────────────────────────────────────
# MICROSOFT GRAPH API
# Used for: Outlook calendar sync + Teams meeting creation
# NOT used for user sign-in — calendar integration only
# From: portal.azure.com → App registrations
# ─────────────────────────────────────────────────────────────
MICROSOFT_CLIENT_ID=
MICROSOFT_CLIENT_SECRET=

# ─────────────────────────────────────────────────────────────
# ZOOM — meeting link generation
# From: marketplace.zoom.us → Your App
# ─────────────────────────────────────────────────────────────
ZOOM_CLIENT_ID=
ZOOM_CLIENT_SECRET=
ZOOM_REDIRECT_URI=http://localhost:3000/api/video/zoom/callback

# ─────────────────────────────────────────────────────────────
# SMTP EMAIL DELIVERY
# Dev: use Mailhog (smtp://localhost:1025) or Gmail App Password
# Prod: use Gmail SMTP, Outlook SMTP, or self-hosted Postfix
# ─────────────────────────────────────────────────────────────
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_SECURE=false
SMTP_USER=
SMTP_PASS=
SMTP_FROM_EMAIL=noreply@schduled.com
SMTP_FROM_NAME=Schduled

# ─────────────────────────────────────────────────────────────
# S3-COMPATIBLE STORAGE — profile photos, logos, banners
# Compatible providers: AWS S3, Cloudflare R2, MinIO, Backblaze B2
# From: your chosen storage provider dashboard
# ─────────────────────────────────────────────────────────────
S3_ACCESS_KEY_ID=
S3_SECRET_ACCESS_KEY=
S3_REGION=us-east-1
S3_BUCKET_NAME=schduled-uploads-dev
# Leave blank for AWS S3. Set for other providers:
#   Cloudflare R2: https://<accountid>.r2.cloudflarestorage.com
#   MinIO local:   http://localhost:9000
#   Backblaze B2:  https://s3.<region>.backblazeb2.com
S3_ENDPOINT=

# ─────────────────────────────────────────────────────────────
# ENCRYPTION KEY — OAuth tokens stored at rest (AES-256-GCM)
# Generate with: openssl rand -hex 32  (produces exactly 64 hex chars = 32 bytes)
# Keep separate from BETTER_AUTH_SECRET — rotating one must not break the other
# ─────────────────────────────────────────────────────────────
ENCRYPT_KEY=
```

**How to generate `BETTER_AUTH_SECRET`:**
```bash
openssl rand -base64 32
```

**How to generate `ENCRYPT_KEY`:**
```bash
openssl rand -hex 32
```

**Add `.env.local` to `.gitignore`** (Next.js does this automatically, but double-check):
```
.env.local
.env*.local
```

---

## 6. Project Folder Structure

Create this folder structure manually or let the phases build it. Having it mapped out prevents confusion about where files go.

```
schduled/
│
├── src/
│   │
│   ├── middleware.ts                     ← Route protection (auth check on every request)
│   │
│   ├── app/                              ← Next.js App Router
│   │   │
│   │   ├── (auth)/                       ← Unauthenticated auth pages
│   │   │   ├── sign-in/
│   │   │   │   └── page.tsx
│   │   │   ├── sign-up/
│   │   │   │   └── page.tsx
│   │   │   ├── forgot-password/
│   │   │   │   └── page.tsx
│   │   │   ├── reset-password/
│   │   │   │   └── page.tsx
│   │   │   └── verify-email/
│   │   │       └── page.tsx
│   │   │
│   │   ├── (dashboard)/                  ← Host dashboard — protected (requires auth)
│   │   │   ├── layout.tsx
│   │   │   ├── dashboard/
│   │   │   │   └── page.tsx
│   │   │   ├── event-types/
│   │   │   │   ├── page.tsx
│   │   │   │   └── [id]/
│   │   │   │       └── page.tsx
│   │   │   ├── availability/
│   │   │   │   └── page.tsx
│   │   │   ├── integrations/
│   │   │   │   └── page.tsx
│   │   │   └── settings/
│   │   │       ├── profile/
│   │   │       │   └── page.tsx
│   │   │       ├── timezone/
│   │   │       │   └── page.tsx
│   │   │       ├── notifications/
│   │   │       │   └── page.tsx
│   │   │       └── security/
│   │   │           └── page.tsx
│   │   │
│   │   ├── (admin)/                      ← Platform admin — protected by admin role
│   │   │   └── admin/
│   │   │       ├── layout.tsx
│   │   │       ├── page.tsx
│   │   │       ├── users/
│   │   │       │   └── page.tsx
│   │   │       ├── bookings/
│   │   │       │   └── page.tsx
│   │   │       ├── jobs/
│   │   │       │   └── page.tsx
│   │   │       └── settings/
│   │   │           └── page.tsx
│   │   │
│   │   ├── onboarding/                   ← First-run wizard (5 steps)
│   │   │   └── page.tsx
│   │   │
│   │   ├── [username]/                   ← Public booking pages — no auth required
│   │   │   ├── page.tsx                  ← Profile overview (lists all event types)
│   │   │   └── [eventSlug]/
│   │   │       ├── page.tsx              ← Event type booking calendar
│   │   │       └── confirmed/
│   │   │           └── page.tsx          ← Post-booking confirmation page
│   │   │
│   │   ├── api/                          ← Next.js API routes
│   │   │   ├── auth/
│   │   │   │   └── [...all]/
│   │   │   │       └── route.ts          ← Better Auth universal handler
│   │   │   ├── bookings/
│   │   │   │   └── route.ts              ← POST: create booking
│   │   │   ├── bookings/
│   │   │   │   └── [token]/
│   │   │   │       └── route.ts          ← GET/POST: cancel or reschedule
│   │   │   ├── calendars/
│   │   │   │   ├── google/
│   │   │   │   │   └── callback/
│   │   │   │   │       └── route.ts      ← Google Calendar OAuth callback
│   │   │   │   └── microsoft/
│   │   │   │       └── callback/
│   │   │   │           └── route.ts      ← Microsoft Calendar OAuth callback
│   │   │   ├── video/
│   │   │   │   └── zoom/
│   │   │   │       └── callback/
│   │   │   │           └── route.ts      ← Zoom OAuth callback
│   │   │   └── slots/
│   │   │       └── route.ts              ← GET: available time slots for a date
│   │   │
│   │   ├── layout.tsx                    ← Root layout
│   │   ├── page.tsx                      ← Landing page (/)
│   │   ├── privacy/
│   │   │   └── page.tsx
│   │   ├── terms/
│   │   │   └── page.tsx
│   │   └── cookies/
│   │       └── page.tsx
│   │
│   ├── components/
│   │   ├── booking/                      ← Booking page UI
│   │   │   ├── BookingCalendar.tsx
│   │   │   ├── TimeSlotGrid.tsx
│   │   │   ├── BookingForm.tsx
│   │   │   └── ConfirmationScreen.tsx
│   │   ├── dashboard/                    ← Dashboard UI
│   │   │   ├── MeetingList.tsx
│   │   │   ├── EventTypeCard.tsx
│   │   │   └── StatsBar.tsx
│   │   ├── onboarding/                   ← Wizard step components
│   │   │   ├── StepProfile.tsx
│   │   │   ├── StepCalendar.tsx
│   │   │   ├── StepTimezone.tsx
│   │   │   ├── StepEventType.tsx
│   │   │   └── StepShare.tsx
│   │   └── ui/                           ← Shadcn/UI components (auto-generated)
│   │
│   └── lib/
│       │
│       ├── auth/
│       │   ├── config.ts                 ← Better Auth instance — providers, plugins, session
│       │   └── client.ts                 ← Better Auth client (used in Client Components)
│       │
│       ├── db/
│       │   ├── schema/                   ← Drizzle schema — one file per domain (schemaFilter: ['public'])
│       │   │   ├── users.ts              ← users, sessions, accounts, verifications, user_profiles, user_branding, username_redirects
│       │   │   ├── event-types.ts        ← event_types, event_type_durations, cancellation_policies, availability_schedules, availability_windows, availability_overrides, event_type_questions
│       │   │   ├── bookings.ts           ← bookings, booking_answers, booking_guests
│       │   │   ├── calendars.ts          ← connected_calendars, calendar_events_cache
│       │   │   ├── video.ts              ← video_connections
│       │   │   ├── notifications.ts      ← notification_preferences, workflow_jobs, email_outbox, email_events
│       │   │   ├── platform.ts           ← idempotency_keys (platform_settings → env vars; disposable emails → static JSON)
│       │   │   └── index.ts              ← exports all schema tables for Drizzle
│       │   ├── index.ts                  ← Drizzle client + db connection
│       │   ├── audit.ts                  ← DbAudit.log(), auditBatch(), extractRequestContext()
│       │   └── queries/                  ← Reusable typed query helpers
│       │       ├── bookings.ts
│       │       ├── event-types.ts
│       │       └── slots.ts
│       │
│       ├── email/
│       │   ├── client.ts                 ← Nodemailer SMTP transporter singleton
│       │   ├── send.ts                   ← send() wrapper — render template → sendMail()
│       │   └── templates/                ← React Email components (14 templates)
│       │       ├── booking-confirmation.tsx        ← Invitee booking confirmed
│       │       ├── booking-notification-host.tsx   ← Host new booking alert
│       │       ├── reminder-24h.tsx                ← 24-hour reminder to invitee
│       │       ├── reminder-1h.tsx                 ← 1-hour reminder to invitee
│       │       ├── cancellation-invitee.tsx        ← Invitee: booking cancelled
│       │       ├── cancellation-host.tsx           ← Host: booking cancelled by invitee
│       │       ├── reschedule-invitee.tsx          ← Invitee: booking rescheduled
│       │       ├── reschedule-host.tsx             ← Host: booking rescheduled by invitee
│       │       ├── host-cancellation-invitee.tsx   ← Invitee: host cancelled their meeting
│       │       ├── email-verification.tsx          ← Account email verification code
│       │       ├── password-reset.tsx              ← Password reset link
│       │       ├── welcome.tsx                     ← Welcome email after signup
│       │       ├── calendar-disconnect-alert.tsx   ← Host: calendar OAuth token expired
│       │       └── video-link-failed-host.tsx      ← Host: Zoom/Teams link generation failed
│       │
│       ├── storage/
│       │   ├── client.ts                 ← S3Client singleton
│       │   └── upload.ts                 ← getPresignedUploadUrl(), deleteFile(), getPublicUrl()
│       │
│       ├── worker/                       ← pg-boss worker process (run via: pnpm worker)
│       │   ├── boss.ts                   ← pg-boss client init + connection
│       │   ├── index.ts                  ← Entry point: registers all handlers + cron schedules
│       │   ├── job-types.ts             ← TypeScript payload types for all 16 jobs
│       │   ├── work-monitored.ts        ← workMonitored() — DLQ wrapper around boss.work()
│       │   └── handlers/                ← One file per job type
│       │       ├── email-send.ts                    ← EMAIL_SEND
│       │       ├── email-outbox-reap.ts             ← EMAIL_OUTBOX_REAP (cron)
│       │       ├── email-events-prune.ts            ← EMAIL_EVENTS_PRUNE (cron)
│       │       ├── booking-reminder-24h.ts          ← BOOKING_REMINDER_24H
│       │       ├── booking-reminder-1h.ts           ← BOOKING_REMINDER_1H
│       │       ├── booking-cancel-reminders.ts      ← BOOKING_CANCEL_REMINDERS
│       │       ├── booking-reschedule-reminders.ts  ← BOOKING_RESCHEDULE_REMINDERS
│       │       ├── video-link-generate.ts           ← VIDEO_LINK_GENERATE
│       │       ├── video-link-retry.ts              ← VIDEO_LINK_RETRY
│       │       ├── calendar-write.ts                ← CALENDAR_WRITE
│       │       ├── calendar-update.ts               ← CALENDAR_UPDATE
│       │       ├── calendar-cancel.ts               ← CALENDAR_CANCEL
│       │       ├── calendar-sync.ts                 ← CALENDAR_SYNC (cron, every 5 min)
│       │       ├── calendar-token-refresh.ts        ← CALENDAR_TOKEN_REFRESH
│       │       ├── calendar-disconnect-alert.ts     ← CALENDAR_DISCONNECT_ALERT
│       │       └── // disposable-emails-refresh.ts removed — disposable email check uses static JSON
│       │
│       ├── types/
│       │   ├── booking.ts
│       │   ├── event-type.ts
│       │   └── calendar.ts
│       │
│       ├── env.ts                        ← Zod-validated env vars — import env.X, never process.env.X
│       ├── validators.ts                 ← validateName(), validateEmail(), validateUrl(), stripHtml()
│       ├── encrypt.ts                    ← encryptValue() / decryptValue() — AES-256-GCM with ENCRYPT_KEY
│       ├── secret.ts                     ← Secret<T> wrapper — prevents tokens appearing in logs
│       ├── rate-limit.ts                 ← applyRateLimit() — in-memory fixed-window counter per IP
│       └── platform-settings/
│           └── // platform-settings/ directory removed — settings are now env vars (see src/lib/env.ts)
│
├── drizzle/                              ← Auto-generated migration files
│   └── meta/
│
├── features/                             ← Feature specification docs (16 files)
├── drizzle.config.ts                     ← Drizzle Kit config (MUST include schemaFilter)
├── next.config.ts
├── tsconfig.json
├── .env.local                            ← Never commit — all secrets here
├── .env.example                          ← Commit this — template with blank values
├── .gitignore
├── package.json
├── README.md
├── development-plan.md
└── pre-development-setup.md              ← This file
```

---

## 7. Database Setup

Choose **Option A** (you already have PostgreSQL installed) or **Option B** (zero-install, embedded).

### Option A — Local PostgreSQL Install

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database and user
CREATE DATABASE schduled_dev;
CREATE USER schduled_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE schduled_dev TO schduled_user;
\q
```

Your `DATABASE_URL`:
```
postgresql://schduled_user:your_password@localhost:5432/schduled_dev
```

---

### Option B — embedded-postgres (Zero-Install)

No PostgreSQL installation needed. `embedded-postgres` downloads a real PostgreSQL 16 binary and runs it as a **separate local process** via `pnpm db:local`. **Development only — never use in production.**

**1. `embedded-postgres` is already in your dev dependencies** (installed in § 4.2). No extra install needed.

**2. Create `scripts/dev-db.ts`** — the standalone database process:

```typescript
// scripts/dev-db.ts
import EmbeddedPostgres from 'embedded-postgres'
import { existsSync } from 'fs'
import path from 'path'

if (existsSync('.env.local')) {
  process.loadEnvFile('.env.local')
}

const DATABASE_URL = process.env.DATABASE_URL
if (!DATABASE_URL) {
  console.error('DATABASE_URL is not set — add it to .env.local')
  process.exit(1)
}

const url = new URL(DATABASE_URL)
const user = decodeURIComponent(url.username) || 'postgres'
const password = decodeURIComponent(url.password) || 'password'
const port = Number(url.port) || 54329
const database = url.pathname.replace(/^\//, '') || 'postgres'
const dataDir = path.resolve(process.cwd(), '.pgdata')

const pg = new EmbeddedPostgres({ databaseDir: dataDir, user, password, port, persistent: true })

async function main() {
  const alreadyInitialised = existsSync(path.join(dataDir, 'PG_VERSION'))
  if (!alreadyInitialised) {
    console.log(`Initialising data directory at ${dataDir}`)
    await pg.initialise()
  }

  await pg.start()
  console.log(`Embedded Postgres listening on port ${port}`)

  if (!alreadyInitialised && database !== 'postgres') {
    try {
      await pg.createDatabase(database)
      console.log(`Created database '${database}'`)
    } catch {
      // already exists
    }
  }

  const shutdown = async (signal: string) => {
    console.log(`Received ${signal}, stopping Postgres...`)
    try { await pg.stop() } catch (err) { console.error(err) }
    process.exit(0)
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'))
  process.on('SIGINT', () => shutdown('SIGINT'))
}

main().catch((err) => {
  console.error('Failed to start embedded Postgres:', err)
  process.exit(1)
})
```

**3. Set `DATABASE_URL` in `.env.local`** — same as Option A, just pointing to the embedded port:
```bash
DATABASE_URL=postgresql://schduled:password@localhost:54329/schduled_dev
```

**4. How to use** — two terminals:
```bash
# Terminal 1 — start the database (keep running)
pnpm db:local

# Terminal 2 — start the app
pnpm dev
```

> **Switching to a real PostgreSQL:** Update `DATABASE_URL` in `.env.local` to point to your real database and stop running `pnpm db:local`. No code changes needed.

> **Add `.pgdata/` to `.gitignore`** — this directory holds the embedded database files and must not be committed.

### 7.2 Key Configuration — drizzle.config.ts

```typescript
// drizzle.config.ts — MUST include schemaFilter
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/lib/db/schema/*",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  schemaFilter: ["public"],  // ← REQUIRED: prevents pg-boss pgboss schema from being touched
});
```

> **Why `schemaFilter: ["public"]` is required:**
> pg-boss creates its own `pgboss` schema automatically when the app starts. Without this filter, `drizzle-kit generate` detects those tables and tries to drop or alter them — breaking the job queue.

### 7.3 Run Migrations

```bash
# Generate migration from schema
npx drizzle-kit generate

# Apply migration to database
npx drizzle-kit migrate

# Open Drizzle Studio to inspect tables
npx drizzle-kit studio
```

---

## 8. Pre-Development Checklist

Complete every item below before starting Phase 0 of [development-plan.md](./development-plan.md).

### Machine Setup
- [ ] Node.js 20+ installed (`node -v`)
- [ ] **Option A:** PostgreSQL 16+ installed and running (`pg_isready`) — OR — **Option B:** `embedded-postgres` dev dependency installed and `scripts/dev-db.ts` created; `DATABASE_URL` set in `.env.local`; `.pgdata/` added to `.gitignore`
- [ ] Git configured (`git config --global user.email`)

### Credentials Collected
- [ ] `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` — from Google Cloud Console
- [ ] Google Calendar API enabled in Google Cloud project
- [ ] Google OAuth consent screen configured with correct scopes
- [ ] Your email added as test user in Google OAuth consent screen
- [ ] `MICROSOFT_CLIENT_ID` and `MICROSOFT_CLIENT_SECRET` — from Azure App registration
- [ ] Microsoft Graph permissions granted (`Calendars.ReadWrite`, `OnlineMeetings.ReadWrite`, `User.Read`)
- [ ] `ZOOM_CLIENT_ID`, `ZOOM_CLIENT_SECRET`, `ZOOM_REDIRECT_URI` — from Zoom Developer Portal
- [ ] `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_REGION`, `S3_BUCKET_NAME` — from storage provider
- [ ] S3 CORS policy applied to bucket (allows PUT from localhost:3000)
- [ ] SMTP credentials ready (Mailhog running, or Gmail app password generated)
- [ ] `BETTER_AUTH_SECRET` generated (`openssl rand -base64 32`)
- [ ] `ENCRYPT_KEY` generated (`openssl rand -hex 32`) — 64-char hex, stored separately from BETTER_AUTH_SECRET

### Project Init
- [ ] Next.js 15 project created with TypeScript + Tailwind + App Router + src dir
- [ ] All packages installed via `pnpm add` (see [Section 4](#4-complete-package-list); full versioned list in [tools-packages.md](./tools-packages.md#complete-packagejson-dependencies))
- [ ] Shadcn/UI initialized + all components added
- [ ] `biome.jsonc` added to project root
- [ ] `husky` installed and initialised (`npx husky init`)
- [ ] `.husky/pre-commit` set to run `pnpm biome check --write . && git add -A`
- [ ] `package.json` scripts updated (dev = Next.js + worker via concurrently, worker, db:generate, db:migrate, lint, format)
- [ ] `.env.local` file created and all values filled in
- [ ] `.env.example` file created with blank values (safe to commit)
- [ ] `.env.local` confirmed in `.gitignore`
- [ ] PostgreSQL database created
- [ ] `drizzle.config.ts` configured with `schemaFilter: ["public"]`
- [ ] `pnpm dev` runs without errors on `http://localhost:3000`
- [ ] Worker process starts: `pnpm worker` shows "pg-boss started" with no errors
- [ ] Git repository initialized with first commit

### Verify External Services Work
- [ ] Google OAuth: click "Sign in with Google" → redirects to Google consent → returns to app
- [ ] Mailhog / SMTP: trigger a test email → appears in Mailhog at `http://localhost:8025`
- [ ] S3 upload: upload a test file via presigned URL → appears in bucket
- [ ] PostgreSQL: Drizzle Studio opens and shows tables (`npx drizzle-kit studio`)

---

> **Once all items above are checked, start [development-plan.md](./development-plan.md) from Phase 0.**
> Each phase in that document assumes everything in this file is already in place.

---

> [!NOTE]
>
> ## All Tools & Credentials — Master Reference
>
> Every external tool the project needs, why it is needed, which credentials to collect, and where to get them.
>
> ---
>
> ### 1. Google Cloud Console
>
> | Field | Detail |
> |-------|--------|
> | **Why needed** | Sign in with Google (OAuth login) · Read/write Google Calendar (availability sync, booking write) · Auto-generate Google Meet link per booking |
> | **Credentials needed** | `GOOGLE_CLIENT_ID` · `GOOGLE_CLIENT_SECRET` |
> | **APIs to enable** | Google Calendar API · Google People API |
> | **OAuth scopes** | `email` · `profile` · `openid` · `calendar` · `calendar.events` |
> | **Where to get** | [console.cloud.google.com](https://console.cloud.google.com) → APIs & Services → Credentials |
> | **Cost** | Free |
>
> ---
>
> ### 2. Microsoft Azure — App Registration
>
> | Field | Detail |
> |-------|--------|
> | **Why needed** | Read/write Outlook calendar · Auto-generate Microsoft Teams meeting link per booking · *(NOT for user login — calendar integration only)* |
> | **Credentials needed** | `MICROSOFT_CLIENT_ID` · `MICROSOFT_CLIENT_SECRET` |
> | **Graph API permissions** | `Calendars.ReadWrite` · `OnlineMeetings.ReadWrite` · `User.Read` |
> | **Where to get** | [portal.azure.com](https://portal.azure.com) → App registrations → New registration |
> | **Cost** | Free |
>
> ---
>
> ### 3. Zoom Developer Portal
>
> | Field | Detail |
> |-------|--------|
> | **Why needed** | Auto-generate a unique Zoom meeting link for every booking |
> | **Credentials needed** | `ZOOM_CLIENT_ID` · `ZOOM_CLIENT_SECRET` · `ZOOM_REDIRECT_URI` |
> | **Scopes needed** | `meeting:write` · `user:read` |
> | **Where to get** | [marketplace.zoom.us](https://marketplace.zoom.us) → Develop → Create App → OAuth |
> | **Cost** | Free |
>
> ---
>
> ### 4. S3-Compatible File Storage
>
> | Field | Detail |
> |-------|--------|
> | **Why needed** | Store user-uploaded files — profile photos, organisation logos, banner images |
> | **Credentials needed** | `S3_ACCESS_KEY_ID` · `S3_SECRET_ACCESS_KEY` · `S3_REGION` · `S3_BUCKET_NAME` · `S3_ENDPOINT` *(blank for AWS)* |
> | **Provider options** | AWS S3 · Cloudflare R2 · Backblaze B2 · MinIO (self-hosted) |
> | **Bucket setting** | Block all public access ON — files served via presigned URLs only |
> | **Cost** | Free tier on all providers |
>
> ---
>
> ### 5. SMTP Email
>
> | Field | Detail |
> |-------|--------|
> | **Why needed** | Send booking confirmations · Send 24h and 1h reminder emails · Send password reset emails · Send magic sign-in links · Send welcome emails |
> | **Credentials needed** | `SMTP_HOST` · `SMTP_PORT` · `SMTP_USER` · `SMTP_PASS` · `SMTP_FROM_EMAIL` · `SMTP_FROM_NAME` |
> | **Provider options** | Gmail SMTP · Outlook SMTP · Company mail server · Mailhog *(local dev only)* |
> | **Cost** | Free |
>
> ---
>
> ### 6. PostgreSQL Database
>
> | Field | Detail |
> |-------|--------|
> | **Why needed** | Main application database — stores users, bookings, event types, availability schedules, background jobs |
> | **Credentials needed** | `DATABASE_URL` = `postgresql://user:password@host:5432/dbname` |
> | **Options** | Local install · Railway · Supabase · Neon · Any PostgreSQL 16+ host |
> | **Cost** | Free (local) · Free tier on cloud providers |
>
> ---
>
> ### Complete Credentials Summary
>
> | # | Variable | Service | Required For |
> |---|----------|---------|-------------|
> | 1 | `GOOGLE_CLIENT_ID` | Google Cloud | Google sign-in + Calendar API |
> | 2 | `GOOGLE_CLIENT_SECRET` | Google Cloud | Google sign-in + Calendar API |
> | 3 | `MICROSOFT_CLIENT_ID` | Azure Portal | Outlook calendar + Teams |
> | 4 | `MICROSOFT_CLIENT_SECRET` | Azure Portal | Outlook calendar + Teams |
> | 5 | `ZOOM_CLIENT_ID` | Zoom Developer | Zoom meeting links |
> | 6 | `ZOOM_CLIENT_SECRET` | Zoom Developer | Zoom meeting links |
> | 7 | `ZOOM_REDIRECT_URI` | Zoom Developer | Zoom OAuth callback |
> | 8 | `S3_ACCESS_KEY_ID` | Storage provider | File uploads |
> | 9 | `S3_SECRET_ACCESS_KEY` | Storage provider | File uploads |
> | 10 | `S3_REGION` | Storage provider | File uploads |
> | 11 | `S3_BUCKET_NAME` | Storage provider | File uploads |
> | 12 | `S3_ENDPOINT` | Storage provider | File uploads *(blank for AWS S3)* |
> | 13 | `SMTP_HOST` | Email server | Sending all emails |
> | 14 | `SMTP_PORT` | Email server | Sending all emails |
> | 15 | `SMTP_USER` | Email server | Sending all emails |
> | 16 | `SMTP_PASS` | Email server | Sending all emails |
> | 17 | `SMTP_FROM_EMAIL` | Email server | Sender address shown to users |
> | 18 | `SMTP_FROM_NAME` | Email server | Sender name shown to users |
> | 19 | `DATABASE_URL` | PostgreSQL | Application database |
> | 20 | `BETTER_AUTH_SECRET` | Generated locally | Session signing — `openssl rand -base64 32` |
> | 21 | `BETTER_AUTH_URL` | App URL | Auth callbacks — `http://localhost:3000` in dev |
> | 22 | `NEXT_PUBLIC_APP_URL` | App URL | Public-facing links in emails and booking pages |
> | 23 | `ENCRYPT_KEY` | Generated locally | OAuth token encryption at rest — `openssl rand -hex 32` |
>
> **Total: 6 services · 23 environment variables**
