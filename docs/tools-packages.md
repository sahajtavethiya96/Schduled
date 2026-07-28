# Schduled — Tools & Packages Reference

Complete documentation of every package, library, service, and tool used in Schduled. For each entry: what it is, why it is needed, which features use it, required environment variables, and setup notes.

---

## Package Manager

### pnpm

| | |
|---|---|
| **Why pnpm** | Faster installs than npm, disk-efficient (hard-links shared packages), strict dependency resolution prevents phantom dependencies |
| **Version** | pnpm@9+ |
| **Usage** | `pnpm install`, `pnpm dev`, `pnpm worker`, `pnpm build` |
| **Key commands** | `pnpm dlx shadcn@latest add <component>` — add Shadcn/UI component |

---

## Core Framework

### next@15

| | |
|---|---|
| **Purpose** | Full-stack React framework — renders UI, handles API routes, server actions, middleware |
| **Features using it** | All 16 features |
| **Why this version** | Next.js 15 App Router with React 19 Server Components — zero-client-bundle for data-fetching pages, server actions for mutations |
| **Key capabilities used** | App Router, Server Components, Server Actions (`'use server'`), API Routes (`route.ts`), Middleware (`middleware.ts`), ISR (`next.revalidate`) |
| **Env vars** | `NEXT_PUBLIC_APP_URL` — public-facing URL (required for OAuth redirect URIs, email links) |
| **Setup note** | Two processes in development: `pnpm dev` (Next.js) + `pnpm worker` (pg-boss). Use `concurrently` to run both from one command. |

### react@19 / react-dom@19

| | |
|---|---|
| **Purpose** | UI rendering library |
| **Features** | All UI features |
| **Why v19** | Paired with Next.js 15; React 19 Server Components avoid client-side waterfall fetching |

### typescript

| | |
|---|---|
| **Purpose** | Static type checking — catches errors at compile time, not runtime |
| **Features** | All |
| **Key config** | `tsconfig.json` — strict mode enabled |
| **Why critical** | pg-boss job payload types, Drizzle schema types, and Better Auth types all benefit from strict TypeScript |

---

## Database

### drizzle-orm

| | |
|---|---|
| **Purpose** | Type-safe ORM for PostgreSQL — defines schema as TypeScript, generates SQL queries with full type inference |
| **Features using it** | All features (every DB read/write) |
| **Why not Prisma** | Better performance, thinner runtime overhead, SQL-first approach, no code generation step |
| **Key patterns** | `pgTable()`, `relations()`, `db.transaction()`, `db.execute(sql\`...\`)` for raw SQL (pgboss schema) |
| **Env vars** | `DATABASE_URL` |
| **Critical config** | `schemaFilter: ['public']` in `drizzle.config.ts` — **required** to prevent Drizzle Kit from touching pg-boss's `pgboss.*` tables |

### drizzle-kit (dev)

| | |
|---|---|
| **Purpose** | CLI for generating and running database migrations |
| **Commands** | `pnpm db:generate` — generate migration from schema diff; `pnpm db:migrate` — apply pending migrations |
| **Never** | Write migrations by hand — always change `schema.ts` and run `db:generate` |

### postgres

| | |
|---|---|
| **Purpose** | PostgreSQL driver for Node.js — low-level connection pool |
| **Used by** | drizzle-orm (underlying transport) + pg-boss (separate pool) |
| **Env vars** | `DATABASE_URL` — connection string format: `postgresql://user:pass@host:5432/dbname` |

---

## Authentication

### better-auth

| | |
|---|---|
| **Purpose** | Complete authentication library — handles sessions, OAuth, email/password, magic links, and admin plugin |
| **Features using it** | User Onboarding, Admin Panel, all protected routes |
| **Auth methods provided** | Email + password (bcrypt), Google OAuth, Magic link (passwordless) |
| **Plugins used** | `admin()` — exposes `listUsers`, `banUser`, `unbanUser`, `impersonateUser`, `listUserSessions`, `revokeUserSessions` |
| **Session storage** | PostgreSQL (`user`, `session`, `account`, `verification` tables — managed by Better Auth) |
| **Env vars** | `BETTER_AUTH_SECRET` (≥32 chars random string), `BETTER_AUTH_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` |
| **Setup** | Mount handler at `app/api/auth/[...all]/route.ts`; configure in `src/lib/auth.ts` |
| **Impersonation** | Admin plugin; admin-to-admin blocked; 1-hour session limit; audit-logged start/stop |
| **Why not NextAuth** | Better Auth has more complete admin tooling, built-in magic link, and cleaner TypeScript API |

---

## Background Job Queue

### pg-boss

| | |
|---|---|
| **Purpose** | PostgreSQL-backed background job queue — no Redis needed, uses the same PostgreSQL database |
| **Features using it** | Notifications, Booking Engine, Calendar Integrations, Video Conferencing, Onboarding, Admin Panel |
| **Why not Bull/BullMQ** | No Redis dependency; job state survives restarts; same DB = same transaction for job + data creation |
| **Key capabilities** | Scheduled jobs (`sendAfter`), recurring cron jobs (`schedule`), singletonKey (prevent duplicate jobs), team concurrency, automatic retries with backoff |
| **Env vars** | `DATABASE_URL` (same connection string as app) |
| **Critical config** | `schemaFilter: ['public']` in Drizzle config — pg-boss manages its own `pgboss.*` schema independently |
| **Worker process** | Separate Node.js process (`pnpm worker`). Reads from `pgboss.job` table. Never runs inside the Next.js process. |
| **Total jobs** | 16 distinct job types — see [jobs-queues.md](jobs-queues.md) |

---

## Input Validation

### zod

| | |
|---|---|
| **Purpose** | Schema-based runtime validation — validates API inputs, form payloads, and environment variables |
| **Features using it** | All API routes, all Server Actions, env var validation |
| **Pattern** | Define schema once → infer TypeScript type → validate at request boundary |
| **Used for** | Booking form validation (invitee name, email, answers), event type form, signup form, admin API inputs, `.env` variable validation |

### @hookform/resolvers

| | |
|---|---|
| **Purpose** | Bridge between react-hook-form and Zod — passes Zod schemas directly to form validation |
| **Features** | All client-side forms |
| **Usage** | `resolver: zodResolver(bookingFormSchema)` in `useForm()` |

---

## Email

### nodemailer

| | |
|---|---|
| **Purpose** | SMTP email delivery — sends transactional emails via any SMTP server |
| **Features using it** | Notifications, Onboarding (verification codes, welcome email), Admin Panel (password reset) |
| **Used with** | react-email (renders HTML), pg-boss `EMAIL_SEND` job (async delivery) |
| **Pattern** | Never send inline in API route. Insert `email_outbox` row, enqueue `EMAIL_SEND` job. |
| **Env vars** | `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE` (`true`/`false`), `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM_EMAIL`, `SMTP_FROM_NAME` |
| **Dev setup** | Use Mailhog (local) or Mailtrap (dev account) — do not send real emails during development |

### @react-email/components + react-email

| | |
|---|---|
| **Purpose** | Write email templates as React components — renders to HTML + plain text |
| **Features using it** | Notifications (all email templates) |
| **Templates needed** | `booking-confirmation`, `booking-notification-host`, `reminder-24h`, `reminder-1h`, `cancellation-invitee`, `cancellation-host`, `reschedule-invitee`, `reschedule-host`, `host-cancellation-invitee`, `email-verification`, `password-reset`, `welcome`, `calendar-disconnect-alert`, `video-link-failed-host` |
| **Preview** | `pnpm email:preview` — opens browser preview of all templates |
| **Why** | Cross-client compatibility (Outlook, Gmail, Apple Mail) handled by the library; write JSX instead of tables |

---

## Calendar Integrations

### googleapis

| | |
|---|---|
| **Purpose** | Official Google API client — Google Calendar read/write and OAuth 2.0 |
| **Features using it** | Calendar Integrations (P0), Video Conferencing (Google Meet) |
| **Scopes required** | `https://www.googleapis.com/auth/calendar.readonly`, `https://www.googleapis.com/auth/calendar.events` |
| **Env vars** | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` |
| **Google Meet** | Included in calendar event creation via `conferenceData.createRequest` — no separate Meet API |
| **Setup** | Enable "Google Calendar API" in Google Cloud Console. Add `NEXT_PUBLIC_APP_URL/api/auth/callback/google` as authorized redirect URI. |

### @microsoft/microsoft-graph-client

| | |
|---|---|
| **Purpose** | Microsoft Graph API client — Outlook calendar read/write and Teams meeting creation |
| **Features using it** | Calendar Integrations (P1 — Outlook), Video Conferencing (Teams — Phase 2) |
| **Scopes required** | `Calendars.ReadWrite`, `OnlineMeetings.ReadWrite` (Teams — Phase 2) |
| **Env vars** | `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET` |
| **Why separate from googleapis** | Different OAuth flows, different API shapes, different token refresh endpoints |
| **Setup** | Register app in Azure Portal → API Permissions → Microsoft Graph. Add redirect URI. |

### @microsoft/microsoft-graph-types (dev)

| | |
|---|---|
| **Purpose** | TypeScript types for Microsoft Graph API responses |
| **Features** | Calendar Integrations (Outlook) |

### tsdav *(Post-MVP — Phase 2)*

| | |
|---|---|
| **Purpose** | CalDAV client for Apple iCloud calendar connection |
| **Features using it** | Calendar Integrations *(Post-MVP — Phase 2 — Apple Calendar)* |
| **Why separate** | Apple Calendar doesn't support standard OAuth; uses CalDAV protocol with app-specific passwords |
| **Env vars** | None — credentials entered per-user via UI (iCloud email + app-specific password) |

---

## Video Conferencing

### Zoom API (No npm package — direct REST)

| | |
|---|---|
| **Purpose** | Create unique Zoom meeting rooms per booking |
| **Features using it** | Video Conferencing (P1) |
| **API endpoint** | `POST https://api.zoom.us/v2/users/me/meetings` |
| **Auth** | OAuth 2.0 — host connects Zoom account once; access token stored (encrypted) in `video_connections` |
| **Env vars** | `ZOOM_CLIENT_ID`, `ZOOM_CLIENT_SECRET`, `ZOOM_REDIRECT_URI` |
| **Marketplace** | Requires Zoom Marketplace app approval (2–4 weeks). Submit Day 1 of development. Use dev-mode app (100 users max) during development. |
| **HTTP client** | Use native `fetch()` — no extra npm package needed |

---

## File Storage

> **Storage driver pattern:** Set `STORAGE_DRIVER=local` (default, no credentials needed) for development.
> Files are saved to `public/uploads/` and served at `/uploads/{key}`.
> Set `STORAGE_DRIVER=s3` for production to use Cloudflare R2 / AWS S3 / MinIO.
> All call sites import from `lib/storage/index.ts` — switching drivers requires only one env var change.

### Local driver (default — development)

| | |
|---|---|
| **Env var** | `STORAGE_DRIVER=local` |
| **Files** | `lib/storage/local.ts` |
| **Saves to** | `public/uploads/{key}` (project root) |
| **Served at** | `/uploads/{key}` (Next.js static file serving) |
| **No credentials needed** | Works out of the box — no S3/R2 setup required |

### @aws-sdk/client-s3 (production — S3/R2 driver)

| | |
|---|---|
| **Env var** | `STORAGE_DRIVER=s3` |
| **Files** | `lib/storage/s3.ts` (code is present but import is commented in `index.ts`) |
| **Purpose** | S3-compatible object storage — stores user profile photos and logos |
| **Features using it** | User Profile & Settings (profile photo upload) |
| **Compatible with** | AWS S3, Cloudflare R2, Backblaze B2, MinIO, DigitalOcean Spaces |
| **Env vars** | `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_REGION`, `S3_BUCKET`, `S3_ENDPOINT`, `S3_PUBLIC_URL` |
| **Activate** | Uncomment the `s3` import and `if (driver === 's3')` block in `lib/storage/index.ts` |

### Upload API

| | |
|---|---|
| **Route** | `POST /api/upload/avatar` |
| **Auth** | Requires session — rejects unauthenticated requests |
| **Input** | `multipart/form-data` with `file` field (image/jpeg, image/png, image/webp — max 5 MB) |
| **Processing** | Resizes to 256×256 WebP via `sharp` before storing |
| **Output** | `{ url: string }` — the public URL of the stored file |
| **Side effect** | Updates `user.image` in the DB automatically |

---

## Date & Time

### date-fns

| | |
|---|---|
| **Purpose** | Date formatting, parsing, arithmetic — all timezone-agnostic operations |
| **Features using it** | All features that display or calculate dates |
| **Used for** | Formatting dates for email templates, calculating buffer times, computing booking window ranges |

### date-fns-tz

| | |
|---|---|
| **Purpose** | IANA timezone-aware date operations — critical for correct scheduling across timezones |
| **Features using it** | Timezone Management, Booking Engine, Notifications (dual-timezone emails) |
| **Key functions** | `zonedTimeToUtc(localTime, timezone)` — convert a local time to UTC; `utcToZonedTime(utcTime, timezone)` — convert UTC to a specific timezone; `formatInTimeZone()` — format a date in a specific timezone |
| **Why not `new Date().toLocaleString()`** | IANA DST handling requires explicit timezone library; `toLocaleString` behavior varies by Node.js version and OS locale settings |
| **Critical rule** | For availability slot generation: generate slots in local time first, then convert each slot to UTC individually using `zonedTimeToUtc()`. Never bulk-convert a time window — DST transitions in the middle of a window will produce wrong slots. |

### ical-generator

| | |
|---|---|
| **Purpose** | Generate RFC 5545-compliant `.ics` calendar files for email attachments |
| **Features using it** | Booking Confirmation (ICS attachment), Notifications (calendar buttons) |
| **Why** | Attendees can import the meeting to Apple Calendar, Outlook, or any calendar app without a direct Google Calendar API connection |
| **Key feature** | `VTIMEZONE` component — ensures the event displays in the correct timezone in every calendar app |

---

## UI Framework

### tailwindcss@4

| | |
|---|---|
| **Purpose** | Utility-first CSS framework — all styling |
| **Features** | All UI |
| **Configuration** | `tailwind.config.ts` — extend with custom colors, fonts, design tokens |

### @shadcn/ui (via radix-ui)

| | |
|---|---|
| **Purpose** | Copy-paste UI component library built on Radix UI primitives — fully accessible, fully customizable |
| **Features** | All UI screens |
| **Key components** | Button, Card, Table, Dialog, Sheet, Badge, Input, Select, Textarea, Switch, Tabs, Popover, Calendar, Command, DropdownMenu, Form, Toast |
| **Install** | `pnpm dlx shadcn@latest add button card table ...` — copies component files into `src/components/ui/` |
| **Why** | No black-box component library dependency; components are owned code; works perfectly with Tailwind |

### class-variance-authority (cva)

| | |
|---|---|
| **Purpose** | Type-safe variant API for component styling — defines size/variant/color combos |
| **Used in** | All Shadcn/UI components |

### clsx + tailwind-merge

| | |
|---|---|
| **Purpose** | Safely merge Tailwind class names — `cn()` utility function |
| **Used in** | All components (`cn(baseClasses, conditionalClasses)`) |

### react-hook-form

| | |
|---|---|
| **Purpose** | Performant, minimal-re-render form state management |
| **Features** | Booking form, Event type form, Signup form, Settings forms |
| **Pattern** | `useForm({ resolver: zodResolver(schema) })` — Zod validates, react-hook-form tracks state |

### sonner

| | |
|---|---|
| **Purpose** | Accessible toast notification system — `toast.success()`, `toast.error()`, `toast.promise()` |
| **Features** | All mutation feedback (booking confirmed, settings saved, errors) |

### next-themes

| | |
|---|---|
| **Purpose** | Dark / light / system theme switching |
| **Features** | User Profile & Settings (theme preference stored in `user_profiles.theme`) |

### geist

| | |
|---|---|
| **Purpose** | Geist Sans + Geist Mono font family (Vercel-designed) |
| **Features** | All UI |
| **Setup** | Import in root `layout.tsx` via `next/font` |

### @phosphor-icons/react

| | |
|---|---|
| **Purpose** | Icon library — flexible, consistent SVG icons; 1000+ icons across 6 weights |
| **Features** | All UI — navigation, actions, status indicators, form labels |
| **Import (server components)** | `@phosphor-icons/react/dist/ssr` |
| **Import (client components)** | `@phosphor-icons/react` |
| **Version** | 2.1.x |
| **Design reference** | See [design-system.md](./design-system.md) — Icons section for full context-to-icon mapping |

### @fontsource-variable/jetbrains-mono *(optional)*

| | |
|---|---|
| **Purpose** | Monospace font for code and token display (e.g., booking confirmation IDs) |
| **Features** | Admin panel (job payload display, audit log JSON) |

---

## ID Generation

### @paralleldrive/cuid2

| | |
|---|---|
| **Purpose** | Collision-resistant, sortable, URL-safe IDs — used as primary keys for all app tables |
| **Features** | All (every `id` field) |
| **Usage** | `import { createId } from '@paralleldrive/cuid2'` → `id: createId()` |
| **Why not UUID** | cuid2 is URL-safe (no hyphens that need encoding), shorter (24 chars vs 36), and embeds a timestamp for natural sort |
| **Note** | Better Auth tables use their own ID generation; only Schduled-owned tables use cuid2 |

---

## Security

### bcryptjs (via better-auth)

| | |
|---|---|
| **Purpose** | Password hashing — bcrypt with configurable rounds |
| **Used by** | Better Auth (handles internally — no direct bcryptjs import needed in app code) |

### AES-256-GCM (via Node.js built-in `crypto`)

| | |
|---|---|
| **Purpose** | Encrypt sensitive data at rest — OAuth tokens in `connected_calendars`, Zoom tokens in `video_connections` |
| **Used in** | Calendar Integrations, Video Conferencing |
| **Env var** | `ENCRYPT_KEY` — 64-char hex string (32 bytes). Generate: `openssl rand -hex 32`. Kept separate from `BETTER_AUTH_SECRET` so rotating the auth secret never silently breaks token decryption. |
| **Implementation** | `src/lib/encrypt.ts` — `encryptValue(plaintext)` / `decryptValue(ciphertext)` using `crypto.createCipheriv('aes-256-gcm', keyBuffer, iv)`. Key derived via PBKDF2 from `env.ENCRYPT_KEY`. |

### `Secret<T>` class (`src/lib/secret.ts`)

| | |
|---|---|
| **Purpose** | Wrapper that prevents sensitive values (OAuth tokens, API keys) from accidentally appearing in logs, error messages, or JSON serialization |
| **Used in** | Calendar Integrations, Video Conferencing — wrap any decrypted OAuth token before passing it to a function |
| **No npm package** | Hand-written utility — no external dependency |
| **Why critical** | Without this, a decrypted access token passed to a function that logs its arguments or throws an Error with the value would expose the raw token in server logs |

```typescript
// src/lib/secret.ts
export class Secret<T extends string = string> {
  #value: T  // private class field — not accessible via Object.keys(), console.log(), JSON.stringify()

  constructor(value: T) {
    this.#value = value
  }

  // Call .reveal() only at the exact point of use — passing to fetch(), nodemailer, etc.
  reveal(): T {
    return this.#value
  }

  // Prevent the value appearing in logs, errors, or JSON
  toString() { return '[REDACTED]' }
  toJSON()   { return '[REDACTED]' }
}
```

**Usage pattern:**

```typescript
// Decrypt the stored token once, wrap it immediately
const raw = await decrypt(row.accessToken)
const token = new Secret(raw)

// Pass the secret around — safe to log, serialize, or throw
console.log('Using token:', token)   // → "Using token: [REDACTED]"

// Reveal only at the point of the actual API call
await fetch('https://api.zoom.us/v2/users/me/meetings', {
  headers: { Authorization: `Bearer ${token.reveal()}` },
})
```

### Node.js `dns` module (built-in)

| | |
|---|---|
| **Purpose** | MX record lookup for email domain validation on signup |
| **Used in** | User Onboarding |
| **Pattern** | `dns.promises.resolveMx(domain)` — if throws with `ENODATA` or `ENOTFOUND`, domain has no MX record |
| **No extra package** | Built-in Node.js module |

---

## Development Tools

### @biomejs/biome

| | |
|---|---|
| **Purpose** | Linter + formatter — replaces ESLint + Prettier with a single fast tool |
| **Why** | 10-50× faster than ESLint, zero config conflicts between linting and formatting |
| **Config** | `biome.jsonc` at project root |
| **Commands** | `pnpm biome check .` — lint + format check; `pnpm biome format --write .` — auto-format |
| **Pre-commit** | Add `biome check` to git pre-commit hook via `husky` |

### husky

| | |
|---|---|
| **Purpose** | Git hooks — run linting before push |
| **Config** | `.husky/pre-push` → `pnpm biome check .` |

### concurrently

| | |
|---|---|
| **Purpose** | Run multiple processes with one command |
| **Used in** | `package.json` `"dev"` script: `concurrently "next dev" "tsx src/lib/worker/index.ts"` |
| **Why critical** | pg-boss worker is a separate process; both must run during development |

### tsx

| | |
|---|---|
| **Purpose** | TypeScript runner for Node.js — runs `.ts` files directly without compiling |
| **Used for** | Running the pg-boss worker process: `tsx src/lib/worker/index.ts` |
| **Alternative** | `ts-node` — but `tsx` is faster and ESM-compatible |

### embedded-postgres *(local dev only)*

| | |
|---|---|
| **Purpose** | Embedded PostgreSQL for local development — no separate PostgreSQL installation needed |
| **Why** | Simplifies onboarding for new developers on the project |
| **Production** | Always use a real PostgreSQL 16+ instance in production |

---

## Linting & Type Checking

### TypeScript strict mode

Key compiler settings in `tsconfig.json`:
```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true
  }
}
```

---

## Package Scripts

```json
{
  "scripts": {
    "dev": "concurrently \"next dev\" \"tsx src/lib/worker/index.ts\"",
    "build": "next build",
    "start": "next start",
    "worker": "tsx src/lib/worker/index.ts",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "db:push": "drizzle-kit push",
    "lint": "biome check .",
    "format": "biome format --write .",
    "type-check": "tsc --noEmit",
    "email:preview": "react-email dev"
  }
}
```

---

## Complete `package.json` Dependencies

### Production

```json
{
  "dependencies": {
    "next": "^15.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "typescript": "^5.6.0",

    "drizzle-orm": "^0.38.0",
    "postgres": "^3.4.0",

    "better-auth": "^1.6.0",

    "pg-boss": "^12.0.0",

    "zod": "^3.23.0",
    "@hookform/resolvers": "^3.9.0",
    "react-hook-form": "^7.53.0",

    "nodemailer": "^6.9.0",
    "@react-email/components": "^0.0.24",
    "@react-email/render": "^0.0.24",
    "react-email": "^3.0.0",

    "date-fns": "^4.1.0",
    "date-fns-tz": "^3.2.0",
    "ical-generator": "^8.0.0",

    "@aws-sdk/client-s3": "^3.670.0",
    "@aws-sdk/s3-request-presigner": "^3.670.0",

    "googleapis": "^144.0.0",
    "@microsoft/microsoft-graph-client": "^3.0.7",

    "class-variance-authority": "^0.7.0",
    "clsx": "^2.1.0",
    "tailwind-merge": "^2.5.0",
    "next-themes": "^0.4.0",
    "sonner": "^1.7.0",
    "geist": "^1.3.0",
    "@phosphor-icons/react": "^2.1.10",

    "@paralleldrive/cuid2": "^2.2.2",
    "radix-ui": "^1.4.0",
    "tsx": "^4.19.0"
  }
}
```

### Development

```json
{
  "devDependencies": {
    "drizzle-kit": "^0.30.0",

    "@biomejs/biome": "^1.9.0",
    "husky": "^9.1.0",
    "concurrently": "^9.0.0",
    "postcss": "^8.5.0",
    "@tailwindcss/postcss": "^4.0.0",
    "tailwindcss": "^4.0.0",

    "@types/node": "^22.0.0",
    "@types/nodemailer": "^6.4.17",
    "@microsoft/microsoft-graph-types": "^2.40.0",

    "embedded-postgres": "^17.0.0"
  }
}
```

---

## Environment Variables Reference

Complete `.env.local` template:

```bash
# ─────────────────────────────────────────────────────────
# CORE (required)
# ─────────────────────────────────────────────────────────
DATABASE_URL=postgresql://schduled:password@localhost:5432/schduled
BETTER_AUTH_SECRET=<32+ char random string>   # openssl rand -base64 32
BETTER_AUTH_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000

# ─────────────────────────────────────────────────────────
# GOOGLE (required for Google OAuth + Google Calendar + Google Meet)
# ─────────────────────────────────────────────────────────
GOOGLE_CLIENT_ID=<from Google Cloud Console>
GOOGLE_CLIENT_SECRET=<from Google Cloud Console>
# Authorized redirect URI: ${NEXT_PUBLIC_APP_URL}/api/auth/callback/google

# ─────────────────────────────────────────────────────────
# MICROSOFT (required for Outlook Calendar)
# ─────────────────────────────────────────────────────────
MICROSOFT_CLIENT_ID=<from Azure Portal>
MICROSOFT_CLIENT_SECRET=<from Azure Portal>
# Authorized redirect URI: ${NEXT_PUBLIC_APP_URL}/api/auth/callback/microsoft

# ─────────────────────────────────────────────────────────
# ZOOM (required for Zoom meeting link generation)
# ─────────────────────────────────────────────────────────
ZOOM_CLIENT_ID=<from Zoom Marketplace>
ZOOM_CLIENT_SECRET=<from Zoom Marketplace>
ZOOM_REDIRECT_URI=${NEXT_PUBLIC_APP_URL}/api/integrations/zoom/callback

# ─────────────────────────────────────────────────────────
# SMTP Email (required for all transactional email)
# ─────────────────────────────────────────────────────────
SMTP_HOST=smtp.gmail.com                     # or mailhog for local dev
SMTP_PORT=587
SMTP_SECURE=false                            # true for port 465
SMTP_USER=your@gmail.com
SMTP_PASS=<app-specific password>
SMTP_FROM_EMAIL=noreply@schduled.app
SMTP_FROM_NAME=Schduled

# ─────────────────────────────────────────────────────────
# S3-Compatible Storage (required for profile photos)
# ─────────────────────────────────────────────────────────
S3_ACCESS_KEY_ID=<access key>
S3_SECRET_ACCESS_KEY=<secret key>
S3_REGION=us-east-1
S3_BUCKET_NAME=schduled-uploads
S3_ENDPOINT=                                 # leave empty for AWS; set for Cloudflare R2/MinIO
```

---

## Tools NOT in Schduled (excluded intentionally)

| Tool | Why Not in Schduled |
|-----------|---------------------|
| Pusher / Soketi | Real-time WebSockets not needed for scheduling; no live VM state to sync |
| Polar SDK | Schduled is free/open source — no billing, no subscriptions |
| Cloudflare for SaaS | No custom domain routing feature in Schduled |
| ssh2 | No server infrastructure to SSH into |
| Stripe | No payments |
| restic / rclone | No VM snapshots/backups |
| Firecracker | No VMs |
| @analytics/google-tag-manager | Could add in Phase 2 for analytics |
| embla-carousel-react | Could add for landing page testimonials carousel |

---

## External Service Setup Checklist

| Service | When Needed | Setup Link | Notes |
|---------|------------|-----------|-------|
| Google Cloud Console | Day 1 | console.cloud.google.com | Enable Calendar API; create OAuth credentials |
| Microsoft Azure Portal | Sprint 2 | portal.azure.com | Register app; add Graph permissions |
| Zoom Marketplace | Day 1 (submit now, use dev mode until approved) | marketplace.zoom.us | Submit for review; approval takes 2–4 weeks |
| S3-compatible storage | Day 1 | AWS / Cloudflare R2 / Backblaze B2 | Create bucket; configure CORS |
| SMTP provider | Day 1 | Gmail / Mailhog (dev) / SendGrid (prod) | For local dev: use Mailhog or Mailtrap |
| PostgreSQL 16+ | Day 1 | Local: `brew install postgresql@16` | Create database + user |
