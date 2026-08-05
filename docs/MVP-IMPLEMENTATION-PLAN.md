# Schduled — MVP Implementation Plan

> **Full review date:** 2026-06-18 (re-audited after session 7 — Steps 18, 21, 24, 25 fully complete; /about + /contact pages added)
> Based on: all 16 feature docs, architecture.md, design-system.md, database-schema.md,
> jobs-queues.md, tools-packages.md, pre-development-setup.md, project-structure.md,
> development-plan.md, MASTER-PLAN.md — AND actual project source code audit.
>
> **This file is the single source of truth for build order.**
> No code changes without reading the relevant step here first.

---

## ACTUAL PROJECT STATE (2026-06-18, session 7)

### What Exists ✅

| Category | Files | Status |
|----------|-------|--------|
| Auth | `lib/auth.ts`, `lib/auth-client.ts` | ✅ Better Auth, magic link + admin plugin, 30-day session, trustedOrigins for ngrok testing |
| DB Client | `lib/db.ts`, `lib/pg-connection.ts` | ✅ Drizzle + postgres driver |
| DB Schema — auth | `db/schema/auth.ts` | ✅ user (+ username, timezone, onboarding fields), session, account, verification |
| DB Schema — platform | `db/schema/email-outbox.ts`, `email-events.ts`, `audit-logs.ts`, `job-logs.ts` | ✅ platform tables |
| DB Schema — domain | `db/schema/enums.ts`, `profile.ts`, `event-types.ts`, `availability.ts` | ✅ all created |
| DB Schema — domain | `db/schema/calendars.ts`, `video.ts`, `bookings.ts`, `notifications.ts`, `platform.ts` | ✅ all created |
| DB Schema — relations | `db/schema/relations.ts` | ✅ all Drizzle relations defined |
| Worker | `lib/worker/boss.ts`, `ensure-queues.ts`, `enqueue.ts`, `job-types.ts` | ✅ pg-boss setup, all job types defined |
| Worker handlers — email | `email-send.ts`, `email-outbox-reap.ts`, `email-events-prune.ts`, `platform-healthcheck.ts` | ✅ |
| Worker handlers — booking | `booking-confirmation.ts`, `booking-cancellation.ts`, `booking-cancel-reminders.ts`, `booking-reminder.ts`, `booking-reschedule-notify.ts`, `booking-reschedule-reminders.ts` | ✅ ALL DONE |
| Worker handlers — calendar | `calendar-write.ts`, `calendar-cancel.ts`, `calendar-update.ts`, `calendar-sync.ts`, `calendar-token-refresh.ts`, `calendar-disconnect-alert.ts` | ✅ ALL DONE |
| Worker handlers — video | `video-link-generate.ts` | ✅ Zoom branch real; Google Meet branch uses existing calendar event hangoutLink |
| Email | `lib/email/index.ts`, `renderer.ts`, `smtp/client.ts` | ✅ nodemailer + react-email |
| Email templates | `magic-link.ts` ✅, `delete-confirmation.ts` ✅, `booking-emails.ts` ✅, `reminder-invitee.ts` ✅, `reminder-host.ts` ✅ | ✅ ALL 9 DONE |
| Utilities | `lib/utils.ts`, `lib/audit.ts`, `lib/authz.ts`, `lib/env.ts` | ✅ done |
| Encryption | `lib/encrypt.ts` | ✅ AES-256-GCM for OAuth tokens |
| File storage | `lib/storage/index.ts`, `local.ts`, `s3.ts` | ✅ Multi-driver: `local` (default, `public/uploads/`) or `s3` (R2/AWS). `POST /api/upload/avatar` working. |
| Config | `config/platform.ts` | ✅ `PRODUCT_NAME = "Schduled"` |
| UI components | All Shadcn installed | ✅ all installed |
| Custom components | `logo.tsx`, `theme-provider.tsx`, `theme-toggle.tsx` | ✅ done |
| Scaffold | `app-shell.tsx` (shows avatar + notification bell), `page-header.tsx`, `sidebar-nav.tsx` | ✅ |
| Notification bell | `components/scaffold/notification-bell.tsx` | ✅ per-item dismiss (X), clear-all, mark-read |
| Notification API | `app/api/notifications/route.ts`, `[id]/route.ts`, `read/route.ts` | ✅ GET list, DELETE all, DELETE one, POST mark-read |
| Admin | `components/admin/`, `components/orbit/` | ✅ orbit admin complete |
| Admin pages | `app/(orbit)/orbit/` — overview, users, email, queues, audit, settings | ✅ orbit admin complete |
| Admin user detail | `app/(orbit)/orbit/users/[id]/page.tsx`, `components/orbit/user-detail-actions.tsx` | ✅ ban/unban, impersonate, recent bookings, activity log |
| Profile | `account-forms.tsx` (AvatarUploadCard + Identity), `sessions-card.tsx`, `delete-account-modal.tsx` | ✅ done |
| Middleware | `middleware.ts` | ✅ Layer 1 route protection |
| Route groups | `(landing)/`, `(auth)/`, `(app)/`, `(booking)/`, `(onboarding)/`, `(orbit)/` | ✅ all created |
| Landing page | `app/(landing)/page.tsx` | ✅ full redesign with animations |
| Dashboard | `app/(app)/dashboard/page.tsx` | ✅ 5 stat cards + upcoming + recent bookings + hover effects + empty states |
| App layout | `app/(app)/layout.tsx` | ✅ `requireSession()` + freshUser (with image) + OnboardingModal |
| Root layout | `app/layout.tsx` | ✅ Geist fonts + ThemeProvider + `suppressHydrationWarning` |
| **Onboarding modal** | `components/onboarding/` — all 5 steps | ✅ **COMPLETE** — step-resume flow, avatar upload, Google OAuth |
| **Event type builder** | `app/(app)/event-types/` — list + new + [id] | ✅ **COMPLETE** — 6-tab builder, full CRUD, questions, durations, inactive card state |
| **Settings — all pages** | profile, branding, my-link, calendars, integrations, communication, contacts, security, cookies | ✅ **ALL COMPLETE** (login page still missing) |
| **Google Calendar OAuth** | `app/api/integrations/google/route.ts` + `callback/route.ts` | ✅ **COMPLETE** — encrypt tokens, store calendar |
| **Zoom OAuth** | `lib/zoom/client.ts`, `app/api/integrations/zoom/route.ts` + `callback/route.ts` | ✅ **COMPLETE** — connect, callback, token refresh, disconnect, meeting creation |
| **Username check API** | `app/api/username-check/route.ts` | ✅ done |
| **Hooks** | `hooks/use-username-check.ts` | ✅ done |
| API | `auth/[...all]`, `webhooks/email`, `account/export`, `upload/avatar`, `username-check`, `available-days` | ✅ all done |
| Actions | `profile.ts`, `auth.ts`, `onboarding.ts`, `event-types.ts`, `settings.ts` (+ disconnectZoom), `orbit-*.ts` | ✅ all done |
| DB scripts | `scripts/dev-db.ts`, `make-admin.ts`, `worker.ts`, `db/reset.ts` | ✅ done |
| Post-auth redirect | `app/post-auth/page.tsx` | ✅ routes to `/orbit` (admin) or `/dashboard` (user) |
| **Slot generator** | `lib/calendar/slots.ts` | ✅ **COMPLETE** — DST-safe, buffer, min-notice, dedup via `Set` |
| **Slots API** | `app/api/slots/route.ts` — `GET /api/slots` | ✅ **COMPLETE** — overrides, dedup, timezone-aware |
| **Available days API** | `app/api/available-days/route.ts` | ✅ **COMPLETE** — returns available days for month (used by booking calendar) |
| **Bookings API** | `app/api/bookings/route.ts` — `POST /api/bookings` | ✅ **COMPLETE** — conflict check, insert booking + answers + tokens, enqueues all jobs |
| **Host profile page** | `app/(booking)/[username]/page.tsx` | ✅ **COMPLETE** — event type cards, avatar, name |
| **Booking calendar page** | `app/(booking)/[username]/[eventSlug]/page.tsx` + `_components/booking-calendar.tsx` | ✅ **COMPLETE** — 3-panel Calendly-style UI, quick-pick, progress bar, 2-step slot selection, form |
| **Confirmation page** | `app/(booking)/confirmed/page.tsx` + `_components/confirmation-client.tsx` | ✅ **COMPLETE** — animated icon, meeting card, countdown, add-to-calendar, reschedule/cancel |
| **Bookings list page** | `app/(app)/bookings/page.tsx` | ✅ **COMPLETE** — 3-tab Upcoming/Past/Cancelled, grouped by day, location icons, cancel/reschedule links |
| **Cancel flow** | `app/(booking)/cancel/[token]/page.tsx` + `cancel-client.tsx` | ✅ **COMPLETE** — token validation, cancellation policy check, API call, confirmation UI |
| **Reschedule flow** | `app/(booking)/reschedule/[token]/page.tsx` + `reschedule-client.tsx` | ✅ **COMPLETE** — full rescheduler with new slot picker, API call |
| **Cancel API** | `app/api/bookings/cancel/route.ts` | ✅ **COMPLETE** |
| **Reschedule API** | `app/api/bookings/reschedule/route.ts` | ✅ **COMPLETE** |
| **Legal pages** | `app/(landing)/privacy/page.tsx`, `terms/page.tsx`, `cookies/page.tsx` | ✅ **COMPLETE** — full prose, sidebar TOC, shared LegalShell |
| **About page** | `app/(landing)/about/page.tsx` | ✅ **COMPLETE** — origin story, values, stats, open-source callout |
| **Contact page** | `app/(landing)/contact/page.tsx` + `_components/contact-form.tsx`, `app/actions/contact.ts` | ✅ **COMPLETE** — server action form, email via enqueueEmail() |

### Remaining Critical Issues ⚠️

| Issue | Impact | Fix step |
|-------|--------|----------|
| `settings/login/page.tsx` missing | Plan lists it as one of 9 settings pages — `security` exists but `login` does not | Step 11 follow-up |
| ~~"Powered by Schduled" watermark~~ | ✅ RESOLVED — removed from booking-calendar, confirmation-client, all 3 email components | Step 26 |
| Impersonation banner missing | When `session.impersonatedBy` exists, no amber banner is shown | Step 25 follow-up |

### What's Still Missing ❌

- `lib/api/helpers.ts` — rate limiting + typed JSON response helpers
- `lib/validators.ts` — username / email / URL / XSS sanitization
- `settings/login` page — connected auth methods (magic link vs Google)
- Impersonation amber banner — show when `session.impersonatedBy` exists

### Architecture Decisions Made (differs from original plan)

| Decision | Original plan | Current implementation |
|----------|--------------|----------------------|
| Onboarding | Modal overlay on `/dashboard` | Route stub at `/onboarding/[step]` currently — **confirmed switching back to modal** (Step 10) |
| S3 client path | `lib/storage/s3.ts` | `lib/s3.ts` (legacy) → migrated to `lib/storage/` multi-driver abstraction |
| File storage driver | S3/R2 required from Day 1 | `STORAGE_DRIVER=local` (default, no credentials) → `local` saves to `public/uploads/`; switch to `s3` for production |
| Heading font | Geist only | Plus Jakarta Sans (`--font-jakarta`) for headings, Geist for body/mono |
| Dashboard | Placeholder | Full stats + meetings list (built ahead of plan) |
| Landing page | Simple 4-section | Full premium redesign with scroll animations, bento grid, FAQ, testimonials |
| Globals.css | Plan template had old colors | Actual file has teal-forward palette (OKLCH), dark ocean sidebar, Plus Jakarta Sans |

---

## EXTERNAL SERVICES — Configuration Checklist

> Read this before any coding. These services must be set up first.
> After I say "start", list them and I'll set each up before you proceed.

### Tier 1 — Required from Day 1

| Service | What for | Where to set up | Env var |
|---------|----------|-----------------|---------|
| **PostgreSQL** | Database | ✅ Already running locally | `DATABASE_URL` ✅ |
| **SMTP email** | Magic link emails | ✅ Already configured | `SMTP_*` ✅ |
| **File Storage** | Avatar/logo uploads | ✅ `STORAGE_DRIVER=local` for dev — files saved to `public/uploads/`. Switch to `s3` for production with R2/S3 credentials. | `STORAGE_DRIVER` (+ `S3_*` only when `=s3`) |

### Tier 2 — Required before booking features (Step 12+)

| Service | What for | Where to set up | Env var |
|---------|----------|-----------------|---------|
| **Google Cloud** | Calendar OAuth + Google Meet | console.cloud.google.com | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` |
| **Zoom Marketplace** | Zoom meeting creation | marketplace.zoom.us | `ZOOM_CLIENT_ID`, `ZOOM_CLIENT_SECRET` |

### Tier 3 — Required before launch

| Service | What for | Notes |
|---------|----------|-------|
| **Email domain auth** | DMARC/DKIM/SPF | Prevents email landing in spam |
| **Google OAuth consent** | Publish app | Takes 1-2 days approval |
| **Zoom app publish** | Zoom OAuth in prod | Takes **2-4 weeks** — submit on Day 1 |

### Env vars to add to `.env` and `.env.example`

```bash
# File Storage — STORAGE_DRIVER=local saves files to public/uploads/ (no credentials needed)
# Switch to STORAGE_DRIVER=s3 for production and fill in the S3_* vars below
STORAGE_DRIVER=local

# S3/R2 credentials (only needed when STORAGE_DRIVER=s3)
# S3_ENDPOINT=https://<account>.r2.cloudflarestorage.com
# S3_ACCESS_KEY_ID=
# S3_SECRET_ACCESS_KEY=
# S3_BUCKET=schduled
# S3_PUBLIC_URL=https://assets.schduled.com

# Encryption (for OAuth token storage in DB)
ENCRYPT_KEY=   # 64-char hex = 32 bytes. Generate: openssl rand -hex 32

# Google (Calendar OAuth + Meet)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Zoom
ZOOM_CLIENT_ID=
ZOOM_CLIENT_SECRET=

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## PACKAGES — Install Checklist

### Already installed ✅
```
next, react, react-dom, better-auth, drizzle-orm, postgres, pg-boss,
nodemailer, @phosphor-icons/react, @paralleldrive/cuid2, @react-email/render,
react-email, @headlessui/react, @floating-ui/react, shadcn, class-variance-authority, clsx, tailwind-merge,
zod, tsx, tw-animate-css, tailwindcss, @tailwindcss/postcss
```

### Need to install — run these commands (in order, after I say go):

```bash
# Step 3A — Shadcn components (run one at a time or batch)
pnpm dlx shadcn add textarea select dialog sheet popover calendar separator switch tabs avatar tooltip alert skeleton progress dropdown-menu alert-dialog label radio-group checkbox pagination sonner scroll-area slider

# Step 3B — Form management
pnpm add react-hook-form @hookform/resolvers

# Step 3C — Date + timezone
pnpm add date-fns date-fns-tz

# Step 3D — Calendar file generation
pnpm add ical-generator

# Step 3E — Drag and drop (event type questions tab)
pnpm add @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities

# Step 3F — QR code (My Link page)
pnpm add qrcode
pnpm add -D @types/qrcode

# Step 3G — File storage (S3/R2)
pnpm add @aws-sdk/client-s3 @aws-sdk/s3-request-presigner

# Step 3H — Google Calendar API
pnpm add googleapis

# Step 3I — Image processing (avatar resize before upload)
pnpm add sharp

# Step 3J — Fonts
pnpm add geist
```

---

## DESIGN SYSTEM — Exact Rules (Read Before Every Component)

> Source of truth: `docs/design-system.md`

### Colors — ✅ ALREADY CORRECT in `app/globals.css`

All color tokens are already set correctly. Do NOT change them.

Key values in current `app/globals.css`:
```css
--primary:            oklch(0.60 0.104 184.735);   /* Teal #0d9488 */
--primary-foreground: oklch(0.984 0.014 181.064);

/* Dark mode: slightly lighter teal for readability */
--primary:            oklch(0.700 0.120 183);

/* Chart scale — teal light→dark */
--chart-1: oklch(0.855 0.125 181.107);
--chart-2: oklch(0.785 0.133 181.944);
--chart-3: oklch(0.704 0.123 182.533);
--chart-4: oklch(0.60  0.104 184.735);
--chart-5: oklch(0.511 0.086 186.423);

/* Sidebar — deep ocean blue-teal (dark in both modes) */
--sidebar: oklch(0.108 0.032 215);
```

**Email templates only:** hardcode hex `#0d9488` — CSS vars don't work in email clients.

### Border Radius — Zero Everywhere

```css
--radius: 0rem;   /* ✅ already correct */
```

All `--radius-*` variants must also be zero in `@theme inline`:
```css
--radius-sm: 0;   --radius-md: 0;   --radius-lg: 0;
--radius-xl: 0;   --radius-2xl: 0;  --radius-3xl: 0;  --radius-4xl: 0;
```

**One exception: `rounded-full` on Avatar images only.**

### Typography — Fonts to Set Up

```css
/* In app/layout.tsx */
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'

/* In @theme inline in globals.css */
--font-sans: "Geist", ui-sans-serif, system-ui;
--font-mono: "Geist Mono", ui-monospace;
```

| Usage | Class |
|-------|-------|
| Page title | `text-2xl font-bold tracking-tight` |
| Section heading | `text-lg font-semibold` |
| Card title | `text-sm font-semibold` |
| Body | `text-sm` |
| Caption / helper | `text-xs text-muted-foreground` |
| Booking URLs, IDs, tokens | `font-mono text-sm` |

### Component Rules

| Element | Rule |
|---------|------|
| Buttons | `rounded-none` (from `--radius: 0`) |
| Inputs | `rounded-none border-input bg-background px-3 py-2` ✅ just fixed |
| Cards | `border border-border` — NO shadow |
| Badges | `rounded-none` |
| Avatar | `rounded-full` ← ONLY exception |
| Dialogs / Sheets | square corners from `--radius: 0` |
| Toasts (Sonner) | `rounded-none border border-border` |
| Icons | `@phosphor-icons/react` — NEVER Lucide |
| Server Component icons | `@phosphor-icons/react/dist/ssr` |
| Gradients | Landing page `(landing)/` ONLY |
| Forms | React Hook Form + Zod — never useState for form state |
| IDs | `createId()` from `@paralleldrive/cuid2` |
| Env vars | `env.X` from `@/lib/env` — never `process.env.X` directly |

### Semantic Color Usage

| Situation | Token |
|-----------|-------|
| Primary button, active nav, links | `bg-primary` / `text-primary` |
| Delete, ban, cancel, error | `bg-destructive text-destructive-foreground` |
| Placeholder, helper, caption | `text-muted-foreground` |
| Disabled state | `opacity-50` |
| Card background | `bg-card border border-border` |
| Page background | `bg-page` (warm beige, already set) |
| Subtle section | `bg-muted` |
| Dividers | `border-border` |
| Warning (impersonation, username change) | `bg-amber-50 border-amber-200 text-amber-800` |
| Success message | `bg-success-subtle text-success-foreground` (already defined in globals) |
| Email templates only | Hard-code hex `#0d9488` — CSS vars don't work in email clients |

---

## COMPLETE ROUTE MAP (Target Structure)

### App Route Groups

```
app/
├── (landing)/                          ← public marketing
│   ├── layout.tsx                      ← header + footer, no auth
│   ├── page.tsx                        ← / landing home
│   ├── privacy/page.tsx
│   ├── terms/page.tsx
│   └── cookies/page.tsx
│
├── (auth)/                             ← already exists at /login
│   ├── layout.tsx                      ← centered, no nav
│   └── login/page.tsx                  ← /login (magic link)
│
├── (app)/                              ← authenticated dashboard
│   ├── layout.tsx                      ← AppShell with Schduled nav
│   ├── dashboard/page.tsx
│   ├── event-types/
│   │   ├── page.tsx
│   │   ├── new/page.tsx
│   │   └── [id]/page.tsx
│   ├── availability/page.tsx
│   ├── bookings/page.tsx
│   └── settings/
│       ├── layout.tsx                  ← settings sidebar
│       ├── page.tsx                    ← redirect → /settings/profile
│       ├── profile/page.tsx
│       ├── branding/page.tsx
│       ├── my-link/page.tsx
│       ├── communication/page.tsx
│       ├── login/page.tsx
│       ├── contacts/page.tsx
│       ├── security/page.tsx
│       ├── cookies/page.tsx
│       └── integrations/page.tsx
│
├── (booking)/                          ← public, no auth
│   ├── layout.tsx                      ← minimal, no nav chrome
│   ├── [username]/page.tsx             ← /{username} host profile
│   ├── [username]/[eventSlug]/page.tsx ← booking calendar + form
│   ├── cancel/[token]/page.tsx
│   └── reschedule/[token]/page.tsx
│
├── (orbit)/                            ← already exists — admin panel
│   ├── layout.tsx                      ✅ admin sidebar layout
│   └── orbit/
│       ├── page.tsx                    ✅ admin dashboard
│       ├── users/page.tsx              ✅ user list
│       ├── users/[id]/page.tsx         ← add this
│       ├── email/page.tsx              ✅ email outbox
│       ├── queues/page.tsx             ✅ job queue
│       └── settings/page.tsx          ← add this
│
└── api/
    ├── auth/[...all]/route.ts          ✅ Better Auth handler
    ├── webhooks/email/route.ts         ✅ email webhook
    ├── account/export/route.ts         ✅ GDPR export
    ├── slots/route.ts                  ← availability slots (public)
    ├── bookings/route.ts               ← create booking (public)
    ├── bookings/[token]/cancel/route.ts
    ├── bookings/[token]/reschedule/route.ts
    ├── integrations/google/route.ts
    ├── integrations/google/callback/route.ts
    ├── integrations/zoom/route.ts
    └── integrations/zoom/callback/route.ts
```

### URL → File mapping

| URL | File | Auth required |
|-----|------|--------------|
| `/` | `(landing)/page.tsx` | No |
| `/login` | `(auth)/login/page.tsx` | No (redirect if authed) |
| `/dashboard` | `(app)/dashboard/page.tsx` | Yes |
| `/event-types` | `(app)/event-types/page.tsx` | Yes |
| `/event-types/new` | `(app)/event-types/new/page.tsx` | Yes |
| `/event-types/[id]` | `(app)/event-types/[id]/page.tsx` | Yes |
| `/availability` | `(app)/availability/page.tsx` | Yes |
| `/bookings` | `(app)/bookings/page.tsx` | Yes |
| `/settings/*` | `(app)/settings/*/page.tsx` | Yes |
| `/[username]` | `(booking)/[username]/page.tsx` | No |
| `/[username]/[slug]` | `(booking)/[username]/[slug]/page.tsx` | No |
| `/cancel/[token]` | `(booking)/cancel/[token]/page.tsx` | No |
| `/reschedule/[token]` | `(booking)/reschedule/[token]/page.tsx` | No |
| `/orbit` | `(orbit)/orbit/page.tsx` | Admin only |
| `/orbit/users` | `(orbit)/orbit/users/page.tsx` | Admin only |
| `/orbit/email` | `(orbit)/orbit/email/page.tsx` | Admin only |
| `/orbit/queues` | `(orbit)/orbit/queues/page.tsx` | Admin only |
| `/orbit/settings` | `(orbit)/orbit/settings/page.tsx` | Admin only |

---

## STEP-BY-STEP BUILD ORDER

---

## STEP 1 — Fix `globals.css` + Fonts ✅ DONE

> **Status: Complete.** `app/globals.css` has correct teal OKLCH palette, Plus Jakarta Sans headings, Geist body, all landing animations, scroll-reveal animations, FAQ animations. `app/layout.tsx` already loads all three fonts. Do not re-run any part of this step.

### 1.1 — Update `config/platform.ts`

```ts
export const PRODUCT_NAME = "Schduled"
export const PRODUCT_DESCRIPTION = "Smart scheduling for modern teams."
export const LOGO_PATH = "/logo.svg"
export const ADMIN_ROLE = "admin"
export const USER_ROLE = "user"
```

### 1.2 — Replace `app/globals.css` — complete file (copy-paste ready)

**Delete the current content and paste this entire file:**

```css
@import "tailwindcss";
@import "tw-animate-css";
@import "shadcn/tailwind.css";

@custom-variant dark (&:is(.dark *));

* {
  box-sizing: border-box;
}

html {
  background: var(--background);
}

body {
  min-height: 100vh;
  margin: 0;
  letter-spacing: 0;
}

@theme inline {
  /* Fonts — reference CSS vars injected by geist package in layout.tsx */
  --font-sans: var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif;
  --font-mono: var(--font-geist-mono), ui-monospace, monospace;
  --font-heading: var(--font-sans);

  /* Typography extras */
  --text-2xs: 0.625rem;
  --tracking-eyebrow: 0.16em;
  --tracking-ui: 0.1em;

  /* Page background token */
  --color-page: var(--page);

  /* Status tokens */
  --color-success: var(--success);
  --color-success-foreground: var(--success-foreground);
  --color-success-subtle: var(--success-subtle);
  --color-success-light: var(--success-light);
  --color-warning: var(--warning);

  /* Shadcn sidebar tokens */
  --color-sidebar-ring: var(--sidebar-ring);
  --color-sidebar-border: var(--sidebar-border);
  --color-sidebar-accent-foreground: var(--sidebar-accent-foreground);
  --color-sidebar-accent: var(--sidebar-accent);
  --color-sidebar-primary-foreground: var(--sidebar-primary-foreground);
  --color-sidebar-primary: var(--sidebar-primary);
  --color-sidebar-foreground: var(--sidebar-foreground);
  --color-sidebar: var(--sidebar);

  /* Shadcn chart tokens */
  --color-chart-5: var(--chart-5);
  --color-chart-4: var(--chart-4);
  --color-chart-3: var(--chart-3);
  --color-chart-2: var(--chart-2);
  --color-chart-1: var(--chart-1);

  /* Shadcn core tokens */
  --color-ring: var(--ring);
  --color-input: var(--input);
  --color-border: var(--border);
  --color-destructive: var(--destructive);
  --color-accent-foreground: var(--accent-foreground);
  --color-accent: var(--accent);
  --color-muted-foreground: var(--muted-foreground);
  --color-muted: var(--muted);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-secondary: var(--secondary);
  --color-primary-foreground: var(--primary-foreground);
  --color-primary: var(--primary);
  --color-popover-foreground: var(--popover-foreground);
  --color-popover: var(--popover);
  --color-card-foreground: var(--card-foreground);
  --color-card: var(--card);
  --color-foreground: var(--foreground);
  --color-background: var(--background);

  /* Border radius — ALL zero. Sharp corners everywhere except Avatar (rounded-full). */
  --radius-sm: 0;
  --radius-md: 0;
  --radius-lg: 0;
  --radius-xl: 0;
  --radius-2xl: 0;
  --radius-3xl: 0;
  --radius-4xl: 0;
}

/* ── Light mode ─────────────────────────────────────────────────── */
:root {
  /* Page background — warm beige */
  --page: oklch(0.96 0.006 85);

  /* Status colours */
  --success:            oklch(0.45 0.13 145);   /* emerald-700 */
  --success-foreground: oklch(0.25 0.09 145);   /* emerald-900 */
  --success-subtle:     oklch(0.97 0.04 145);   /* emerald-50 */
  --success-light:      oklch(0.78 0.13 145);   /* emerald-300 */
  --warning:            oklch(0.58 0.15 65);    /* amber-700 */

  /* Backgrounds & text */
  --background:         oklch(1 0 0);
  --foreground:         oklch(0.145 0 0);
  --card:               oklch(1 0 0);
  --card-foreground:    oklch(0.145 0 0);
  --popover:            oklch(1 0 0);
  --popover-foreground: oklch(0.145 0 0);

  /* PRIMARY — teal #0d9488 */
  --primary:            oklch(0.6 0.104 184.735);
  --primary-foreground: oklch(0.984 0.014 181.064);

  --secondary:          oklch(0.97 0 0);
  --secondary-foreground: oklch(0.205 0 0);
  --muted:              oklch(0.97 0 0);
  --muted-foreground:   oklch(0.556 0 0);

  /* ACCENT — same as primary (teal hover states, active nav items) */
  --accent:             oklch(0.6 0.104 184.735);
  --accent-foreground:  oklch(0.984 0.014 181.064);

  --destructive:        oklch(0.577 0.245 27.325);
  --border:             oklch(0.922 0 0);
  --input:              oklch(0.922 0 0);
  --ring:               oklch(0.6 0.104 184.735);   /* teal focus ring */

  /* CHART — teal scale (light → dark teal) */
  --chart-1: oklch(0.855 0.125 181.107);
  --chart-2: oklch(0.785 0.133 181.944);
  --chart-3: oklch(0.704 0.123 182.533);
  --chart-4: oklch(0.6 0.104 184.735);
  --chart-5: oklch(0.511 0.086 186.423);

  --radius: 0rem;

  /* SIDEBAR — always dark, regardless of light/dark mode toggle */
  --sidebar:                     oklch(0.145 0 0);
  --sidebar-foreground:          oklch(0.985 0 0);
  --sidebar-primary:             oklch(0.985 0 0);
  --sidebar-primary-foreground:  oklch(0.145 0 0);
  --sidebar-accent:              oklch(0.22 0 0);
  --sidebar-accent-foreground:   oklch(0.985 0 0);
  --sidebar-border:              oklch(0.22 0 0);
  --sidebar-ring:                oklch(0.556 0 0);
}

/* ── Dark mode ──────────────────────────────────────────────────── */
.dark {
  --page: oklch(0.18 0.004 85);

  --success:            oklch(0.65 0.13 145);
  --success-foreground: oklch(0.9 0.06 145);
  --success-subtle:     oklch(0.22 0.06 145);
  --success-light:      oklch(0.78 0.13 145);
  --warning:            oklch(0.72 0.15 65);

  --background:         oklch(0.145 0 0);
  --foreground:         oklch(0.985 0 0);
  --card:               oklch(0.205 0 0);
  --card-foreground:    oklch(0.985 0 0);
  --popover:            oklch(0.205 0 0);
  --popover-foreground: oklch(0.985 0 0);

  /* PRIMARY — lighter teal for dark backgrounds */
  --primary:            oklch(0.704 0.123 182.533);
  --primary-foreground: oklch(0.277 0.045 192.556);

  --secondary:          oklch(0.269 0 0);
  --secondary-foreground: oklch(0.985 0 0);
  --muted:              oklch(0.269 0 0);
  --muted-foreground:   oklch(0.708 0 0);

  /* ACCENT — same as primary */
  --accent:             oklch(0.704 0.123 182.533);
  --accent-foreground:  oklch(0.277 0.045 192.556);

  --destructive:        oklch(0.704 0.191 22.216);
  --border:             oklch(1 0 0 / 10%);
  --input:              oklch(1 0 0 / 15%);
  --ring:               oklch(0.704 0.123 182.533);

  /* CHART — same teal scale on dark */
  --chart-1: oklch(0.855 0.125 181.107);
  --chart-2: oklch(0.785 0.133 181.944);
  --chart-3: oklch(0.704 0.123 182.533);
  --chart-4: oklch(0.6 0.104 184.735);
  --chart-5: oklch(0.511 0.086 186.423);

  /* Sidebar always dark (same in both modes) */
  --sidebar:                     oklch(0.145 0 0);
  --sidebar-foreground:          oklch(0.985 0 0);
  --sidebar-primary:             oklch(0.985 0 0);
  --sidebar-primary-foreground:  oklch(0.145 0 0);
  --sidebar-accent:              oklch(0.22 0 0);
  --sidebar-accent-foreground:   oklch(0.985 0 0);
  --sidebar-border:              oklch(0.22 0 0);
  --sidebar-ring:                oklch(0.556 0 0);
}

/* ── Base layer ─────────────────────────────────────────────────── */
@layer base {
  * {
    @apply border-border outline-ring/50;
  }
  body {
    @apply bg-background text-foreground;
  }
  html {
    @apply font-sans;
  }
  button,
  input {
    font: inherit;
  }
}

/* ── Landing page animations ────────────────────────────────────── */
/* Use ONLY inside app/(landing)/ files. Never in dashboard/admin/booking. */
@keyframes schduled-float {
  0%, 100% { transform: translateY(0); }
  50%       { transform: translateY(-10px); }
}
@keyframes schduled-sheen {
  0%   { background-position: 200% center; }
  100% { background-position: -200% center; }
}
@keyframes schduled-ping {
  0%        { transform: scale(1); opacity: 1; }
  75%, 100% { transform: scale(1.8); opacity: 0; }
}
@keyframes schduled-reveal {
  from { opacity: 0; transform: translateY(16px); }
  to   { opacity: 1; transform: translateY(0); }
}

.animate-schduled-float  { animation: schduled-float 6s ease infinite; }
.animate-schduled-sheen  { animation: schduled-sheen 5s linear infinite; }
.animate-schduled-ping   { animation: schduled-ping 2.4s infinite; }
.animate-schduled-reveal { animation: schduled-reveal 0.4s ease-out both; }

@media (prefers-reduced-motion: reduce) {
  .animate-schduled-float,
  .animate-schduled-sheen,
  .animate-schduled-ping,
  .animate-schduled-reveal {
    animation: none;
  }
}
```

### 1.3 — Replace `app/layout.tsx` — complete file (copy-paste ready)

> Requires `geist` installed (`pnpm add geist`). Also needs `next-themes` (`pnpm add next-themes`).

```tsx
import type { Metadata, Viewport } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from '@/components/ui/sonner'
import './globals.css'

export const metadata: Metadata = {
  title: { default: 'Schduled', template: '%s — Schduled' },
  description: 'Smart scheduling for modern teams.',
  robots: { index: true, follow: true },
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)',  color: '#0a0a0a' },
  ],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${GeistSans.variable} ${GeistMono.variable}`}
      suppressHydrationWarning
    >
      <body className="antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          disableTransitionOnChange
        >
          {children}
          <Toaster
            position="bottom-right"
            toastOptions={{
              classNames: {
                toast: 'rounded-none border border-border bg-background text-foreground shadow-md',
                title: 'text-sm font-medium',
                description: 'text-xs text-muted-foreground',
                actionButton: 'bg-primary text-primary-foreground text-xs',
                cancelButton: 'bg-muted text-muted-foreground text-xs',
              },
            }}
            richColors
          />
        </ThemeProvider>
      </body>
    </html>
  )
}
```

### 1.4 — Create `public/logo.svg` — favicon (copy-paste ready)

```svg
<svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect x="1" y="1" width="30" height="30" fill="white" stroke="#0d9488" stroke-width="1.5"/>
  <rect x="1" y="1" width="30" height="8" fill="#0d9488"/>
  <line x1="11" y1="9" x2="11" y2="31" stroke="#e5e5e5" stroke-width="1"/>
  <line x1="21" y1="9" x2="21" y2="31" stroke="#e5e5e5" stroke-width="1"/>
  <line x1="1" y1="20" x2="31" y2="20" stroke="#e5e5e5" stroke-width="1"/>
  <rect x="13" y="11" width="6" height="7" fill="#0d9488"/>
</svg>
```

Add to `app/layout.tsx` metadata:
```tsx
icons: {
  icon: '/logo.svg',
  shortcut: '/logo.svg',
},
```

**Done when:** All buttons show teal. No rounded corners anywhere except avatars. Geist font active in browser.

---

## STEP 2 — Rename + Update Branding in Existing Files ✅ DONE

> **Status: Complete.** `config/platform.ts` has `PRODUCT_NAME = "Schduled"`. App shell has correct nav.

For reference only — what was changed:

| File | Change |
|------|--------|
| `config/platform.ts` | `PRODUCT_NAME = "Schduled"` ← Done in Step 1 |
| `app/(auth)/_components/auth-form.tsx` | "KR" logo block → `<Logo />` component (after Step 4) |
| `components/scaffold/app-shell.tsx` | Add Schduled nav links (event-types, availability, bookings, settings) |
| `middleware.ts` | Create this file (Step 5) |

Update `components/scaffold/app-shell.tsx` nav links:
```ts
const navLinks = [
  { href: "/dashboard",    label: "Dashboard" },
  { href: "/event-types",  label: "Event Types" },
  { href: "/availability", label: "Availability" },
  { href: "/bookings",     label: "Bookings" },
  { href: "/settings",     label: "Settings" },
]
```

**Done when:** App shell shows correct Schduled nav and branding.

---

## STEP 3 — Install Missing Packages + Shadcn Components ✅ DONE

> **Status: Complete.** All Shadcn components installed. Geist, next-themes, react-hook-form, @hookform/resolvers, date-fns, date-fns-tz, ical-generator, @dnd-kit/*, qrcode, @aws-sdk/*, googleapis, sharp all installed.

For reference — what was installed:

### 3.1 — Fonts + Theme
```bash
pnpm add geist
pnpm add next-themes
```

### 3.2 — Shadcn components (missing from current project)
```bash
pnpm dlx shadcn add textarea
pnpm dlx shadcn add select
pnpm dlx shadcn add dialog
pnpm dlx shadcn add sheet
pnpm dlx shadcn add popover
pnpm dlx shadcn add calendar
pnpm dlx shadcn add separator
pnpm dlx shadcn add switch
pnpm dlx shadcn add tabs
pnpm dlx shadcn add avatar
pnpm dlx shadcn add tooltip
pnpm dlx shadcn add alert
pnpm dlx shadcn add skeleton
pnpm dlx shadcn add progress
pnpm dlx shadcn add dropdown-menu
pnpm dlx shadcn add alert-dialog
pnpm dlx shadcn add label
pnpm dlx shadcn add radio-group
pnpm dlx shadcn add checkbox
pnpm dlx shadcn add pagination
pnpm dlx shadcn add sonner
pnpm dlx shadcn add scroll-area
pnpm dlx shadcn add slider
```

### 3.3 — Runtime packages
```bash
# Theme + form
pnpm add next-themes react-hook-form @hookform/resolvers

# Date + timezone (DST-safe slot generation)
pnpm add date-fns date-fns-tz

# Calendar file generation (ICS attachments in emails)
pnpm add ical-generator

# Drag and drop (event type question reordering)
pnpm add @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities

# QR code (Settings > My Link page)
pnpm add qrcode
pnpm add -D @types/qrcode

# File storage — S3-compatible (Cloudflare R2 / AWS S3)
pnpm add @aws-sdk/client-s3 @aws-sdk/s3-request-presigner

# Google Calendar API + Google Meet link generation
pnpm add googleapis

# Image processing (resize avatar before upload)
pnpm add sharp
```

**After install:** Verify `pnpm db:push` still passes. Verify `pnpm typecheck` passes.

---

## STEP 4 — Build Common Components ✅ DONE

> **Status: Complete.** All components confirmed present in code: `logo.tsx` ✅, `theme-provider.tsx` ✅, `theme-toggle.tsx` ✅, `page-header.tsx` ✅, `spinner.tsx` ✅, `empty.tsx` ✅, `data-table.tsx` ✅, `kbd.tsx` ✅, `nav-progress.tsx` ✅.
> **Still needed:** `kbd.tsx`, `nav-progress.tsx` (low priority — not blocking any current step).

Build these once. Every feature page uses them. Never duplicate them inline.

### 4.1 — `components/ui/spinner.tsx` — complete file (copy-paste ready)

```tsx
import { cn } from '@/lib/utils'

const sizeMap = { sm: 'size-3.5', md: 'size-4', lg: 'size-6' }

export function Spinner({
  size = 'md',
  className,
}: {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={cn(
        'inline-block shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent',
        sizeMap[size],
        className,
      )}
    />
  )
}
```

### 4.2 — `components/ui/stat.tsx` — complete file (copy-paste ready)

```tsx
import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import type { Icon } from '@phosphor-icons/react/dist/lib/types'

interface StatProps {
  label: string
  value: string | number
  sublabel?: string
  icon?: Icon
  tone?: 'default' | 'success' | 'destructive' | 'warning'
}

const toneClass = {
  default:     'text-muted-foreground',
  success:     'text-success',
  destructive: 'text-destructive',
  warning:     'text-warning',
}

export function Stat({ label, value, sublabel, icon: Icon, tone = 'default' }: StatProps) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          {Icon && <Icon size={18} className={toneClass[tone]} aria-hidden />}
        </div>
        <p className="mt-2 text-3xl font-bold">{value}</p>
        {sublabel && (
          <p className="mt-1 text-xs text-muted-foreground">{sublabel}</p>
        )}
      </CardContent>
    </Card>
  )
}
```

### 4.3 — `components/ui/empty.tsx` — complete file (copy-paste ready)

```tsx
import { cn } from '@/lib/utils'
import type { Icon } from '@phosphor-icons/react/dist/lib/types'

interface EmptyProps {
  icon: Icon
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}

export function Empty({ icon: Icon, title, description, action, className }: EmptyProps) {
  return (
    <div className={cn('flex flex-col items-center gap-3 py-16 text-center', className)}>
      <Icon size={48} className="text-muted-foreground/50" aria-hidden />
      <div className="space-y-1">
        <p className="text-base font-semibold">{title}</p>
        {description && (
          <p className="text-sm text-muted-foreground max-w-xs mx-auto">{description}</p>
        )}
      </div>
      {action && <div className="mt-1">{action}</div>}
    </div>
  )
}
```

**Empty state specs per screen:**
| Screen | Icon | Title |
|--------|------|-------|
| Event types | `CalendarIcon` | "No event types yet" |
| Bookings upcoming | `HandshakeIcon` | "No upcoming bookings" |
| Bookings past | `ClockIcon` | "No past bookings" |
| Bookings cancelled | `XCircleIcon` | "No cancelled bookings" |
| Availability overrides | `CalendarPlusIcon` | "No date overrides" |
| Admin users | `UsersIcon` | "No users found" |
| Admin jobs | `QueueIcon` | "No jobs in queue" |

### 4.4 — `components/ui/data-table.tsx`
```tsx
// Sortable, filterable table built on <Table>
// Props: columns (def array), data, pagination?: number
// Used in: bookings list, orbit users, orbit audit, orbit queues
```

### 4.5 — `components/ui/kbd.tsx`
```tsx
// <kbd className="bg-muted border border-border px-1.5 py-0.5 text-xs font-mono rounded-none">
// Used in: admin sidebar Ctrl+B collapse tooltip
```

### 4.6 — `components/nav-progress.tsx`
```tsx
// Fixed 2px bg-primary bar at viewport top during route transitions
// scaleX 0→1 from left. Fades out on complete.
// Place in (app) layout and (orbit) layout
```

### 4.7 — `components/theme-provider.tsx` — complete file (copy-paste ready)

```tsx
'use client'

import { ThemeProvider as NextThemesProvider } from 'next-themes'

export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>
}
```

### 4.8 — `components/theme-toggle.tsx` — complete file (copy-paste ready)

```tsx
'use client'

import { SunIcon, MoonIcon } from '@phosphor-icons/react'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
    >
      {theme === 'dark'
        ? <SunIcon size={16} />
        : <MoonIcon size={16} />
      }
    </Button>
  )
}
```

### 4.9 — `components/logo.tsx` — complete file (copy-paste ready)

No `<img>` — uses inline SVG so it responds to dark mode via `currentColor` and `stroke-border`.

```tsx
import Link from 'next/link'
import { cn } from '@/lib/utils'

interface LogoProps {
  variant?: 'full' | 'icon' | 'wordmark'
  size?: 'sm' | 'md' | 'lg'
  href?: string
  className?: string
}

function LogoMark({ px }: { px: number }) {
  return (
    <svg width={px} height={px} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      {/* outer border — uses currentColor (text-primary) */}
      <rect x="1" y="1" width="30" height="30"
        className="fill-background" stroke="currentColor" strokeWidth="1.5" />
      {/* header bar — solid teal */}
      <rect x="1" y="1" width="30" height="8" fill="currentColor" />
      {/* grid lines — use border color for dark mode compatibility */}
      <line x1="11" y1="9" x2="11" y2="31" className="stroke-border" strokeWidth="1" />
      <line x1="21" y1="9" x2="21" y2="31" className="stroke-border" strokeWidth="1" />
      <line x1="1"  y1="20" x2="31" y2="20" className="stroke-border" strokeWidth="1" />
      {/* booked slot — teal */}
      <rect x="13" y="11" width="6" height="7" fill="currentColor" />
    </svg>
  )
}

export function Logo({
  variant = 'full',
  size = 'md',
  href = '/',
  className,
}: LogoProps) {
  const sizes = {
    sm: { icon: 16, text: 'text-sm' },
    md: { icon: 20, text: 'text-base' },
    lg: { icon: 32, text: 'text-xl' },
  }
  const { icon, text } = sizes[size]

  const inner = (
    <span className={cn('flex items-center gap-2 text-primary', className)}>
      {variant !== 'wordmark' && <LogoMark px={icon} />}
      {variant !== 'icon' && (
        <span className={cn(text, 'font-semibold tracking-tight text-foreground')}>
          <span className="text-primary">S</span>chduled
        </span>
      )}
    </span>
  )

  if (!href) return inner
  return <Link href={href}>{inner}</Link>
}
```

Where used:
| Location | Variant | Size |
|----------|---------|------|
| `(app)` header | `full` | `md` |
| `(auth)` pages — centered | `full` | `lg` |
| `(landing)` header | `full` | `md` |
| `(orbit)` top bar | `full` | `sm` |
| Mobile nav Sheet | `icon` | `md` |
| 404 / error pages | `full` | `lg` |

### 4.10 — `components/scaffold/page-header.tsx` — update existing

Current file exists. Make sure it has:
```tsx
// Props: title, description?, action?: ReactNode
// Layout: flex justify-between items-start mb-6
// Title: text-2xl font-bold tracking-tight
// Description: text-sm text-muted-foreground mt-1
// Used on EVERY dashboard page and EVERY orbit page
```

### 4.11 — `app/layout.tsx` — already done in Step 1.3

`layout.tsx` was fully replaced in Step 1.3 with ThemeProvider + Sonner. No changes needed here.
Verify Sonner toast copy patterns match:

| Trigger | Message |
|---------|---------|
| Settings saved | "Changes saved" |
| Link copied | "Copied to clipboard" |
| Calendar connected | "Calendar connected" |
| Error | "Something went wrong. Please try again." |
| Booking cancelled | "Booking cancelled" |

**Done when:** Logo renders, spinner works, empty states look right, theme toggle switches light/dark.

---

## STEP 5 — Middleware + Route Protection ✅ DONE

> **Status: Complete.** `middleware.ts` exists at project root with full protection:
> - Public: `/`, `/privacy`, `/terms`, `/cookies`, `/api/auth/*`, static assets, booking cancel/reschedule
> - Auth pages (`/login`): redirect to `/post-auth` if already signed in
> - Protected (`/dashboard`, `/event-types`, `/availability`, `/bookings`, `/settings`, `/post-auth`, `/onboarding`): redirect to `/login?next=PATH` if no cookie
> - Admin (`/orbit`): redirect to `/login?next=PATH` if no cookie (role check in layout)
> - Public booking pages (`/{username}`, `/{username}/{slug}`): always public (fall through)

**Two-layer protection rule:** Middleware = Layer 1 (fast cookie check). Layout = Layer 2 (full DB validation). Both must exist on every protected route.

For reference — the middleware implementation:

```ts
import { NextRequest, NextResponse } from "next/server"

const PUBLIC_PREFIXES = [
  "/api/auth",     // Better Auth handler
  "/_next",        // Next.js internals
  "/favicon",
  "/cancel/",      // public booking cancel
  "/reschedule/",  // public booking reschedule
]

const AUTH_PATHS = ["/login"]  // redirect to /dashboard if already signed in

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/event-types",
  "/availability",
  "/bookings",
  "/settings",
]

const ADMIN_PREFIXES = ["/orbit"]

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Always public
  if (PUBLIC_PREFIXES.some(p => pathname.startsWith(p))) return NextResponse.next()

  // Landing + legal pages
  if (["/" , "/privacy", "/terms", "/cookies"].includes(pathname)) return NextResponse.next()

  // Cookie check (full validation happens in RSC layouts)
  const session =
    request.cookies.get("better-auth.session_token") ||
    request.cookies.get("__Secure-better-auth.session_token")
  const hasSession = Boolean(session?.value)

  // Auth pages: signed-in → dashboard
  if (AUTH_PATHS.some(p => pathname.startsWith(p))) {
    return hasSession
      ? NextResponse.redirect(new URL("/dashboard", request.url))
      : NextResponse.next()
  }

  // Protected app routes
  if (PROTECTED_PREFIXES.some(p => pathname.startsWith(p))) {
    if (!hasSession) {
      const url = new URL("/login", request.url)
      url.searchParams.set("next", pathname)
      return NextResponse.redirect(url)
    }
    return NextResponse.next()
  }

  // Admin routes (role check in layout)
  if (ADMIN_PREFIXES.some(p => pathname.startsWith(p))) {
    if (!hasSession) {
      const url = new URL("/login", request.url)
      url.searchParams.set("next", pathname)
      return NextResponse.redirect(url)
    }
    return NextResponse.next()
  }

  // Public booking pages: /{username}, /{username}/{slug}
  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$).*)"],
}
```

**Two-layer protection rule:** Middleware is Layer 1 (cookie check, no DB). Layout is Layer 2 (full DB validation). Both must be present on every protected route.

```ts
// Every (app) and (orbit) layout.tsx:
const session = await auth.api.getSession({ headers: await headers() })
if (!session) redirect("/login")
// Orbit only:
if (session.user.role !== "admin") redirect("/dashboard")
```

**Done when:** Unauthenticated visit to `/dashboard` redirects to `/login?next=/dashboard`. Admin visit without role redirects to `/dashboard`. Public pages accessible without login.

---

## STEP 6 — Complete Database Schema ✅ DONE

> **Status: Complete.** All schema files exist: enums, auth, profile, event-types, availability, calendars, video, bookings, notifications, platform, relations. `db/schema/index.ts` exports all. Migrations applied.

For reference — the schema structure:

### 6.1 — Add missing columns to `user` table in `db/schema/auth.ts`

```ts
// Add to existing user pgTable:
username:       text('username').unique(),
timezone:       text('timezone').default('UTC'),
jobTitle:       text('job_title'),
company:        text('company'),
onboardingStep: integer('onboarding_step').default(0),
onboardingDone: boolean('onboarding_done').notNull().default(false),
```

### 6.2 — Create `db/schema/enums.ts`

```ts
// All postgres enums in one file
export const locationTypeEnum    = pgEnum('location_type', ['zoom','google_meet','teams','phone_host_calls','phone_invitee_calls','in_person','custom','invitees_choice'])
export const questionTypeEnum    = pgEnum('question_type', ['short_text','long_text','phone','single_select','dropdown'])
export const dayOfWeekEnum       = pgEnum('day_of_week', ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'])
export const bookingWindowTypeEnum = pgEnum('booking_window_type', ['rolling','fixed'])
export const bookingStatusEnum   = pgEnum('booking_status', ['confirmed','cancelled','rescheduled','completed','no_show'])
export const calendarProviderEnum = pgEnum('calendar_provider', ['google','outlook'])
export const calendarStatusEnum  = pgEnum('calendar_status', ['connected','disconnected'])
export const videoProviderEnum   = pgEnum('video_provider', ['zoom','teams'])
export const emailOutboxStatusEnum = pgEnum('email_outbox_status', ['queued','sending','sent','failed'])
export const auditSourceEnum     = pgEnum('audit_source', ['web','api','worker','system'])
```

### 6.3 — Create domain schema files (in this order)

| File | Tables |
|------|--------|
| `db/schema/profile.ts` | `user_profile`, `user_branding`, `username_redirect` |
| `db/schema/event-types.ts` | `event_type`, `event_type_duration`, `cancellation_policy`, `event_type_question` |
| `db/schema/availability.ts` | `availability_schedule`, `availability_window`, `availability_override` |
| `db/schema/calendars.ts` | `connected_calendar`, `calendar_events_cache` |
| `db/schema/video.ts` | `video_connection` |
| `db/schema/bookings.ts` | `booking`, `booking_answer`, `booking_guest` |
| `db/schema/notifications.ts` | `notification_preference` |
| `db/schema/platform.ts` | `platform_settings` (singleton), `idempotency_key` |
| `db/schema/relations.ts` | All Drizzle `relations()` — ONE file, load last |

### 6.4 — Critical schema rules

```
- ALL timestamp columns: { withTimezone: true }
- availability_window.start_time / end_time: stored as "HH:mm" STRING in host's timezone
- booking.start_time / end_time: always stored UTC (timestamptz)
- connected_calendar.access_token / refresh_token: AES-256-GCM encrypted before INSERT
- video_connection.access_token / refresh_token: same encryption
- audit_log: IMMUTABLE — no UPDATE, no DELETE ever
- booking: use pg_advisory_xact_lock inside transaction to prevent double-booking
```

### 6.5 — Update `db/schema/index.ts`

```ts
export * from './enums'
export * from './auth'
export * from './email-outbox'
export * from './email-events'
export * from './audit-logs'
export * from './job-logs'
export * from './profile'
export * from './event-types'
export * from './availability'
export * from './calendars'
export * from './video'
export * from './bookings'
export * from './notifications'
export * from './platform'
export * from './relations'   // LAST — avoids circular imports
```

### 6.6 — Run migrations

```bash
pnpm db:generate
pnpm db:migrate
# Verify:
pnpm db:push   # should say "No changes detected"
```

**Done when:** Drizzle Studio shows all tables with correct columns.

---

## STEP 7 — Worker: All Job Types ✅ DONE (except cleanup)

> **Status: Mostly complete.**
> - `lib/worker/job-types.ts` ✅ — All job types defined (VIDEO_LINK_RETRY removed — was orphaned)
> - All email handlers ✅ — email-send, email-outbox-reap, email-events-prune, platform.healthcheck
> - All booking handlers ✅ — booking-confirmation, booking-cancellation, booking-cancel-reminders, booking-reminder (24h+1h), booking-reschedule-notify, booking-reschedule-reminders
> - All calendar handlers ✅ — calendar-write, calendar-cancel, calendar-update, calendar-sync, calendar-token-refresh, calendar-disconnect-alert
> - Video handler ✅ — video-link-generate (Zoom real; Google Meet reads hangoutLink from calendar write)
> - ❌ **Still need: `IDEMPOTENCY_KEYS_PRUNE` job type + cleanup handler** (low priority)

### 7.1 — Add missing job type to `lib/worker/job-types.ts`

Only one job type is missing — add it to the Platform section:
```ts
IDEMPOTENCY_KEYS_PRUNE: "platform.idempotency-keys-prune",
```

### 7.2 — Add cron schedules to `lib/worker/ensure-queues.ts`

```ts
boss.schedule('CALENDAR_SYNC',          '*/5 * * * *', {})   // every 5 min
boss.schedule('EMAIL_OUTBOX_REAP',      '0 3 * * *',   {})   // daily 03:00 UTC
boss.schedule('EMAIL_EVENTS_PRUNE',     '30 3 * * *',  {})   // daily 03:30 UTC
boss.schedule('IDEMPOTENCY_KEYS_PRUNE', '0 4 * * *',   {})   // daily 04:00 UTC
```

### 7.3 — Create handler files

| File | Handles |
|------|---------|
| `lib/worker/handlers/video-link.ts` | `VIDEO_LINK_GENERATE`, `VIDEO_LINK_RETRY` |
| `lib/worker/handlers/calendar-write.ts` | `CALENDAR_WRITE`, `CALENDAR_CANCEL`, `CALENDAR_UPDATE` |
| `lib/worker/handlers/calendar-sync.ts` | `CALENDAR_SYNC`, `CALENDAR_TOKEN_REFRESH`, `CALENDAR_DISCONNECT_ALERT` |
| `lib/worker/handlers/reminders.ts` | `BOOKING_REMINDER_24H`, `BOOKING_REMINDER_1H`, `BOOKING_CANCEL_REMINDERS`, `BOOKING_RESCHEDULE_REMINDERS` |
| `lib/worker/handlers/cleanup.ts` | `IDEMPOTENCY_KEYS_PRUNE` (others already exist) |

**Singleton key format (prevent duplicate jobs):**
```
{bookingId}_video_link       VIDEO_LINK_GENERATE
{bookingId}_calendar_write   CALENDAR_WRITE
{bookingId}_calendar_cancel  CALENDAR_CANCEL
{bookingId}_calendar_update  CALENDAR_UPDATE
{bookingId}_reminder_24h     BOOKING_REMINDER_24H
{bookingId}_reminder_1h      BOOKING_REMINDER_1H
calendar_sync_{calendarId}   CALENDAR_SYNC
token_refresh_{calendarId}   CALENDAR_TOKEN_REFRESH
```

---

## STEP 8 — Security & Utility Libraries 🔶 PARTIAL

> **Status: Partial.**
> - `lib/encrypt.ts` ✅ — AES-256-GCM
> - `lib/s3.ts` ✅ — S3/R2 client
> - ❌ **Still need: `lib/api/helpers.ts`, `lib/validators.ts`**

### 8.1 — `lib/encrypt.ts` — AES-256-GCM for OAuth tokens ✅ DONE

```ts
// encrypt(plaintext: string): string   → store in DB
// decrypt(ciphertext: string): string  → read from DB before API call
// Key: env.ENCRYPT_KEY (64-char hex = 32 bytes)
// NEVER store raw OAuth tokens — always encrypt before INSERT
```

Add to `lib/env.ts`:
```ts
ENCRYPT_KEY: z.string().length(64),
GOOGLE_CLIENT_ID: optionalString,
GOOGLE_CLIENT_SECRET: optionalString,
ZOOM_CLIENT_ID: optionalString,
ZOOM_CLIENT_SECRET: optionalString,
S3_ENDPOINT: optionalString,
S3_ACCESS_KEY_ID: optionalString,
S3_SECRET_ACCESS_KEY: optionalString,
S3_BUCKET: optionalString,
S3_PUBLIC_URL: optionalString,
```

### 8.2 — `lib/s3.ts` — S3/R2 client ✅ DONE (path: `lib/s3.ts`)

```ts
// Upload avatar: uploadAvatar(file: File, userId: string): Promise<string>
// Upload logo:   uploadLogo(file: File, userId: string): Promise<string>
// Delete file:   deleteFile(key: string): Promise<void>
// Returns public URL or key
// Uses: @aws-sdk/client-s3 + PutObjectCommand
// Max size: avatar 1MB, logo 2MB
// Accepted: image/jpeg, image/png, image/webp
```

### 8.3 — `lib/api/helpers.ts`

```ts
// jsonResponse(status, body)  → typed JSON Response
// requireSession(request)     → throws 401 if no session; returns session
// requireAdmin(request)       → throws 403 if not admin
// applyRateLimit(req, config) → returns 429 Response or null
```

### 8.4 — `lib/validators.ts`

```ts
// validateUsername(input) → string | null (3-30 chars, a-z0-9-, lowercased)
// validateName(input)     → string | null (1-64 chars)
// validateEmail(input)    → string | null
// validateUrl(input)      → string | null (http/https only)
// stripHtml(input)        → string (removes HTML — XSS prevention)
```

### 8.5 — Server Action standard pattern

Every Server Action returns this — no exceptions:
```ts
type ActionResult<T = Record<string, never>> =
  | { error: string }
  | ({ ok: true } & T)

// Pattern:
// 1. Auth check
// 2. Zod validate input
// 3. stripHtml on all text inputs
// 4. Business logic + DB
// 5. writeAuditLog(...)
// 6. return { ok: true, ...data }
// catch: return { error: "Something went wrong." } — never expose DB errors
```

---

## STEP 9 — Auth + Onboarding Flow Fixes ✅ DONE

> **Status: Complete.**
> - `(app)/layout.tsx` ✅ — `requireSession()` + DB freshUser (including `image`, `onboardingStep`) + passes props to AppShell + OnboardingModal
> - `lib/auth.ts` ✅ — 30-day session config in place
> - Google OAuth social provider ✅ — wired (active when `GOOGLE_CLIENT_ID` is set in `.env`)
> - `lib/auth-client.ts` ✅ — `magicLinkClient` + `adminClient` added

### 9.1 — Session config in `lib/auth.ts`

Add session lifetime:
```ts
session: {
  expiresIn: 60 * 60 * 24 * 30,  // 30 days
  updateAge: 60 * 60 * 24,        // refresh daily on activity
  cookieCache: { enabled: true, maxAge: 60 * 5 },
},
```

### 9.2 — Update `(app)` layout to pass onboarding state

No redirect. Instead, pass `onboardingDone` to the layout so `<OnboardingModal>` can be rendered as an overlay on top of the dashboard (built in Step 10).

```tsx
// app/(app)/layout.tsx
const [freshUser] = await db
  .select({ email: user.email, role: user.role, onboardingDone: user.onboardingDone })
  .from(user)
  .where(eq(user.id, session.user.id))
  .limit(1)

return (
  <AppShell email={freshUser.email} isAdmin={freshUser.role === ADMIN_ROLE}>
    {!freshUser.onboardingDone && <OnboardingModal />}
    {children}
  </AppShell>
)
```

### 9.3 — Add Google OAuth to auth (when GOOGLE_CLIENT_ID is set)

```ts
import { socialProviders } from 'better-auth/plugins'

// In betterAuth plugins:
...(env.GOOGLE_CLIENT_ID ? [socialProviders.google({
  clientId: env.GOOGLE_CLIENT_ID,
  clientSecret: env.GOOGLE_CLIENT_SECRET!,
})] : []),
```

### 9.4 — Update `lib/auth-client.ts`

```ts
import { magicLinkClient, adminClient } from 'better-auth/client/plugins'
export const authClient = createAuthClient({
  plugins: [magicLinkClient(), adminClient()],
})
export const { useSession, signIn, signOut } = authClient
```

---

## STEP 10 — Onboarding Wizard (Modal) ✅ DONE

> **Status: Complete.** Full 5-step non-dismissable Dialog rendered in `(app)/layout.tsx` when `onboardingDone = false`. Resumes at correct step after page reloads and OAuth redirects.
>
> **Completed:**
> - `onboarding-modal.tsx` — Dialog, progress bar, step state machine, resumes from `onboardingStep` DB value
> - `step-1-profile.tsx` — name + username (live check) + avatar upload (real upload to `/api/upload/avatar`)
> - `step-2-timezone.tsx` — timezone select, auto-detected from browser
> - `step-3-availability.tsx` — Calendly-style weekly schedule (circular day badges, 12h times)
> - `step-4-calendar.tsx` — Google Calendar OAuth connect (saves step before redirect so resume works)
> - `step-5-share-link.tsx` — booking link + copy + redirects to `/event-types` on complete
> - `app/actions/onboarding.ts` — all 5 step actions + `completeOnboarding()` (auto-creates "30-Minute Meeting")
> - `app/api/username-check/route.ts` — live username availability check
> - `hooks/use-username-check.ts` — debounced hook used by step 1

**Approach:** Full-screen non-dismissable `<Dialog>` rendered in `(app)/layout.tsx` when `user.onboardingDone = false`. User lands on `/dashboard`, sees the modal on top — they glimpse the product before finishing setup.

> **NOTE:** `app/(onboarding)/onboarding/[step]/page.tsx` stub exists — do NOT use it. The modal lives in `components/onboarding/`. The `(app)/layout.tsx` renders it when `onboardingDone = false`.

```
components/onboarding/
├── onboarding-modal.tsx       ← Dialog wrapper, step state machine, progress bar
├── step-1-profile.tsx         ← name + username (live check) + avatar initials
├── step-2-timezone.tsx        ← timezone select (auto-detected from browser)
├── step-3-availability.tsx    ← weekly schedule (day toggles + start/end time)
├── step-4-calendar.tsx        ← connect Google/Outlook (skippable)
└── step-5-ready.tsx           ← booking link + copy + QR code

hooks/
└── use-username-check.ts      ← debounced username availability check (shared with Settings > My Link)

app/actions/
└── onboarding.ts              ← saveProfile, saveTimezone, saveAvailability, completeOnboarding

app/api/username-check/
└── route.ts                   ← GET ?username=xxx → { available: bool }
```

### Modal behaviour
- Opens automatically when `onboardingDone = false` — no user action needed
- **Cannot be closed** — no X button, backdrop click does nothing
- Progress bar at top: `Step X of 5`
- Back button from step 2 onward
- Each step has its own "Continue" / "Save & Continue" CTA
- Step 5 "Go to Dashboard" → `completeOnboarding()` server action → modal unmounts

### 5 onboarding steps

| Step | Component | What it does |
|------|-----------|-------------|
| 1 | `step-1-profile.tsx` | Full name (pre-filled from auth) + username with live check + avatar initials display |
| 2 | `step-2-timezone.tsx` | Timezone `<Select>` auto-detected from `Intl.DateTimeFormat().resolvedOptions().timeZone` |
| 3 | `step-3-availability.tsx` | Weekly schedule — Mon–Sun rows, each: toggle + start time + end time. Default: Mon–Fri 9:00–17:00 |
| 4 | `step-4-calendar.tsx` | Google Calendar card (Connect button) + Outlook card (Coming Soon). Skip link at bottom |
| 5 | `step-5-ready.tsx` | Shows `schduled.com/{username}`. Copy button + QR. Auto-creates default event type in DB |

### DB writes per step

| Step | Tables written |
|------|---------------|
| 1 | `user.name`, `user.username` |
| 2 | `user.timezone` |
| 3 | `availability_schedule` (default), `availability_window` rows (one per enabled day) |
| 4 | `connected_calendar` (if connected) — skippable, nothing written if skipped |
| 5 | `event_type` auto-created: title="30-Minute Meeting", slug="30-min", duration=30. `user.onboardingDone=true`, `user.onboardingStep=5` |

### Auto-created default event type (on step 5 complete)

```ts
// Always created in completeOnboarding() server action:
await db.insert(eventType).values({
  id: createId(),
  userId: session.user.id,
  title: '30-Minute Meeting',
  slug: '30-min',
  duration: 30,
  isActive: true,
})
```

### `useUsernameCheck` hook

```ts
// hooks/use-username-check.ts — client hook, shared with Settings > My Link
// Debounce: 400ms after last keystroke
// States: idle | checking | available | taken | error
// API: GET /api/username-check?username=xxx → { available: boolean }
// Validation: 3–30 chars, a-z 0-9 hyphen only, lowercase
// UI: checking → Spinner | available → green border + CheckCircle | taken → red border + X
```

### Server actions (`app/actions/onboarding.ts`)

```ts
saveProfile(data: { name, username })         // step 1 → user.name + user.username
saveTimezone(timezone: string)                // step 2 → user.timezone
saveAvailability(windows: WeeklySchedule)     // step 3 → availability_schedule + availability_window
completeOnboarding()                          // step 5 → auto-create event type + onboardingDone=true
```

**Done when:** New user completes all 5 steps. `user.onboardingDone = true`. Default event type exists. Modal unmounts. Dashboard visible.

---

## STEP 11 — Dashboard Shell + Settings ✅ DONE

> **Status: Complete.** All 9 settings pages built and working.
> - `settings/profile` ✅ — name, email, avatar upload (AvatarUploadCard), sessions, data export, delete account
> - `settings/branding` ✅ — display name, brand color, logo upload, confirmation messages
> - `settings/my-link` ✅ — username change (tracks old→new redirects), booking URL display
> - `settings/calendars` ✅ — connected calendars list, primary/conflict-check/write toggles, disconnect
> - `settings/integrations` ✅ — Google Calendar connect, Google Meet badge, Zoom (pending approval)
> - `settings/communication` ✅ — email notification toggles, from name, reply-to
> - `settings/contacts` ✅ — auto-save invitees, add/edit/delete contacts
> - `settings/security` ✅ — session management, password change
> - `settings/cookies` ✅ — analytics/marketing consent toggles

**Reference:** `docs/features/user-profile-settings.md`

### (app) layout — already uses `(app)/` route group

`app/(app)/layout.tsx` renders `<OnboardingModal>` (from Step 10) when `onboardingDone = false`, then renders `<AppShell>` with Schduled nav for all dashboard routes.

### Settings pages (build in order)

| # | Route | Page |
|---|-------|------|
| 1 | `/settings/profile` | Name, avatar, timezone, job title, company |
| 2 | `/settings/branding` | Logo upload, brand color, confirmation message |
| 3 | `/settings/my-link` | Booking URL + QR code + username change |
| 4 | `/settings/communication` | Email notification toggles |
| 5 | `/settings/login` | Connected auth methods (magic link / Google) |
| 6 | `/settings/contacts` | Auto-save invitees + excluded domains |
| 7 | `/settings/security` | Active sessions list + revoke + account deletion |
| 8 | `/settings/cookies` | Analytics / marketing consent toggles |
| 9 | `/settings/integrations` | Google Calendar + Outlook + Zoom cards |

**Danger zone in Security page:**
```tsx
<Card className="border-destructive/30 bg-destructive/5">
  // "Delete account" → <AlertDialog> → deleteAccountAction
```

---

## STEP 12 — Event Type Builder ✅ DONE

> **Status: Complete.** Full 6-tab builder implemented.
> - `event-types/page.tsx` ✅ — list with event-type-card.tsx (toggle active, duplicate, delete, copy link)
> - `event-types/new/page.tsx` ✅ — create mode
> - `event-types/[id]/page.tsx` ✅ — edit mode
> - `components/event-types/builder.tsx` ✅ — tabbed form container
> - `tab-general.tsx` ✅, `tab-location.tsx` ✅, `tab-cancellation.tsx` ✅, `tab-notifications.tsx` ✅, `tab-questions.tsx` ✅ (drag-drop), `tab-availability.tsx` ✅
> - `app/actions/event-types.ts` ✅ — full CRUD: create, update, delete, duplicate, toggle, questions CRUD, reorder

**Reference:** `docs/features/event-types.md`

```
app/(app)/event-types/
├── page.tsx        ← list
├── new/page.tsx    ← builder (create mode)
└── [id]/page.tsx   ← builder (edit mode)
```

### 6-tab builder:

| Tab | Fields |
|-----|--------|
| General | Name, description, URL slug, color picker, status toggle |
| Availability | Schedule assignment, booking window, min notice, buffers, daily limit, increment |
| Location | Type selector: Zoom / Google Meet / Phone / In-person / Custom |
| Questions | Drag-drop list (@dnd-kit), "Add question" dialog, 5 types |
| Notifications | Confirmation to invitee, notification to host, custom message |
| Cancellation | Policy text, allow cancel/reschedule, cutoff hours |

### Sticky save bar (unsaved changes):
```tsx
// fixed bottom-0 inset-x-0 border-t border-border bg-background/95 backdrop-blur p-4
// "Discard" ghost + "Save changes" primary
```

---

## STEP 13 — Availability Management ✅ DONE

> **Status: Complete.** Full Calendly-style availability management page.
>
> **Completed:**
> - `app/(app)/availability/page.tsx` ✅ — server component, loads schedule + overrides + timezone
> - `app/(app)/availability/_components/availability-form.tsx` ✅ — full client form with 3-tab navigation
> - `app/actions/availability.ts` ✅ — all CRUD actions
>
> **Features built:**
> - **Schedules tab** — List view (weekly hours per day, multiple slots per day, day letter badge toggles) + Calendar view (full month grid with override highlights)
> - **Weekly hours** — day letter badges click to enable/disable, per-day multiple time slots, + adds slot on last row only, × removes (only when >1 slot)
> - **Date-specific overrides** — multiple time slots per date (stores one DB row per slot, groups on read), date picker dialog, Unavailable toggle
> - **Calendar settings tab** — Google Calendar + Outlook connect cards linking to `/settings/integrations`
> - **Advanced settings tab** — schedule name edit, timezone picker (moved from Schedules tab), Meeting limits (Calendly-style day/week/month rows, used periods hidden), Holidays (country selector + master switch + per-holiday switches that write real `availabilityOverride` rows)
> - **Timezone** — stored on user + default schedule, dialog with search, shown in Schedules calendar view header
> - **Time format** — 12-hour "9:00 AM" format, dropdowns open downward (`position="popper"`), fixed 220px height

**Reference:** `docs/features/availability-management.md`

---

## STEP 14 — Encryption for OAuth Tokens ✅ DONE

> **Status: Complete.** `lib/encrypt.ts` exists with AES-256-GCM. Use `encrypt()` before INSERT of any OAuth token into `connected_calendar` or `video_connection` tables.

---

## STEP 15 — Calendar Integrations ✅ DONE

> **Status: Complete.**
> - OAuth initiate (`/api/integrations/google/route.ts`) ✅ — redirects to Google consent
> - OAuth callback (`/api/integrations/google/callback/route.ts`) ✅ — encrypts tokens, inserts `connected_calendar`
> - Settings UI (`settings/integrations` + `settings/calendars`) ✅ — connect/disconnect/manage UI done
> - `CALENDAR_WRITE` handler ✅ — writes booking to Google Calendar + gets hangoutLink for Meet
> - `CALENDAR_TOKEN_REFRESH` handler ✅ — silent token refresh
> - `CALENDAR_SYNC` handler ✅ — free/busy cache refresh
> - `CALENDAR_DISCONNECT_ALERT` handler ✅ — emails host when token expires
> - `CALENDAR_CANCEL` handler ✅ — deletes calendar event on booking cancel
> - `CALENDAR_UPDATE` handler ✅ — updates calendar event on reschedule
> - ⚠️ **GCP action required:** Enable Google Calendar API in GCP console (project 440182203203) — handler has permanent-error guard so it won't crash, just logs a warning
> - Outlook = P1 — not built

**Reference:** `docs/features/calendar-integrations.md`

```
app/(app)/settings/integrations/page.tsx  ✅ done
app/api/integrations/google/route.ts      ✅ done
app/api/integrations/google/callback/route.ts  ✅ done
```

### Remaining build order for Google (P0):
1. ~~OAuth initiate~~ ✅ done
2. ~~Callback → encrypt tokens → INSERT `connected_calendar`~~ ✅ done
3. Free/busy read via `calendar.freebusy.query` → `calendar_events_cache` (in `CALENDAR_SYNC` handler)
4. Write booking via `calendar.events.insert` (in `CALENDAR_WRITE` handler)
5. Token refresh (`CALENDAR_TOKEN_REFRESH` handler)
6. Token expiry → `CALENDAR_DISCONNECT_ALERT` → host email alert

**Outlook = P1.** Build after Google stable.

**Critical note on Google Meet:**
```
Google Meet link = FREE from CALENDAR_WRITE step.
No extra OAuth — uses Google Calendar access token already stored.
conferenceData.createRequest in events.insert → returns hangoutLink.
Build this inside CALENDAR_WRITE handler, not a separate service.
```

---

## STEP 16 — Timezone: DST-Safe Slot Generation ✅ DONE

> **Status: Complete.** `lib/calendar/slots.ts` (82 lines) implemented with `fromZonedTime` local-time-first approach, buffer before/after, minimum notice, deduplication via `Set`. Called by `GET /api/slots`.

**Reference:** `docs/features/timezone-management.md`

File: `lib/calendar/slots.ts`

**Critical rule — local-time-first:**
```ts
// CORRECT: generate local times, convert each to UTC individually
import { addMinutes } from 'date-fns'
import { zonedTimeToUtc } from 'date-fns-tz'

function generateSlots(date, hostTz, durationMin, windowStart, windowEnd) {
  let cursor = windowStart
  const slots = []
  while (cursor < windowEnd) {
    slots.push(zonedTimeToUtc(cursor, hostTz))  // each slot → UTC
    cursor = addMinutes(cursor, durationMin)
  }
  return slots
}

// WRONG: converting range boundary first breaks DST days
// DO NOT: const utcStart = zonedTimeToUtc(windowStart, hostTz)
```

**Dual-timezone display rule — apply everywhere:**
```
Your time:   3:00 PM IST, Thu 12 Jun 2026
Host's time: 10:30 AM EST, Thu 12 Jun 2026
```
Both must appear on: booking confirmation screen, invitee email, host email, reminder emails.

---

## STEP 17 — Public Booking Page ✅ DONE

> **Status: Complete.** Full 3-panel booking UI implemented. `[username]/page.tsx` — host profile with event type cards. `[username]/[eventSlug]/page.tsx` — server page loads host (with jobTitle/company from userProfile), event type, schedule, overrides, questions. `_components/booking-calendar.tsx` (857 lines) — Calendly-style calendar with #F3F7F6 background, teal glow, progress bar (4 steps), quick-pick shortcuts, 2-step slot selection (click → teal selected → Continue → form), available-days chips, host identity panel. Also `confirmed/` page complete (Steps 16+17+18 together).

**Reference:** `docs/features/booking-page-customization.md`

```
app/(booking)/
├── layout.tsx                      ← minimal, bg-muted/30, no nav
├── [username]/page.tsx
└── [username]/[eventSlug]/page.tsx
```

### Host brand color on booking page:
```tsx
// Inject host brand color as CSS var — replaces --primary ONLY on booking pages:
<div style={{ '--booking-primary': host.brandColor } as React.CSSProperties}>
// Use bg-[--booking-primary] class (NOT bg-primary which ignores host color)
```

### Calendar date states:
| State | Class |
|-------|-------|
| Available | `hover:bg-[--booking-primary]/15 cursor-pointer rounded-none` |
| Selected | `bg-[--booking-primary] text-white rounded-none` |
| Unavailable | `text-muted-foreground opacity-40 cursor-not-allowed` |
| Today | `ring-1 ring-[--booking-primary]/50` |

---

## STEP 18 — Booking Engine ✅ DONE

> **Status: Complete.** `POST /api/bookings` and `GET /api/slots` both functional. Conflict detection cross-midnight-safe. `pg_advisory_xact_lock` race protection added. Idempotency key check (table + 24h window) added. All 6 post-commit jobs enqueued: VIDEO_LINK_GENERATE, CALENDAR_WRITE, BOOKING_CONFIRMATION (with 20s delay for video events), BOOKING_REMINDER_24H, BOOKING_REMINDER_1H.

**Reference:** `docs/features/booking-engine.md`

```
app/api/bookings/route.ts    ← POST /api/bookings
app/api/slots/route.ts       ← GET /api/slots
```

### POST /api/bookings — exact step order:

```
1. applyRateLimit (10 req/60s per IP)
2. Zod validate body
3. Check idempotency_key table → return cached if duplicate
4. db.transaction()
   a. pg_advisory_xact_lock(hash(hostUserId + startTime))  ← race condition protection
   b. Re-check slot availability (live, inside transaction)
      → if taken: 409 { error: 'slot_taken', alternatives: [...] }
   c. INSERT booking (status: 'confirmed')
   d. INSERT email_outbox × 2 (invitee confirmation + host notification)
   e. INSERT audit_log (booking.created)
   f. INSERT idempotency_key
5. COMMIT
6. boss.send(VIDEO_LINK_GENERATE, singletonKey: {bookingId}_video_link)
7. boss.send(CALENDAR_WRITE, singletonKey: {bookingId}_calendar_write)
8. boss.send(EMAIL_SEND × 2)
9. boss.sendAfter(BOOKING_REMINDER_24H, scheduledFor, singletonKey)
10. boss.sendAfter(BOOKING_REMINDER_1H, scheduledFor, singletonKey)
11. return 200 { booking }
```

**Key guarantee:** Booking committed BEFORE any external API call. If Zoom/Google down, booking exists and jobs retry automatically.

---

## STEP 19 — Custom Questions ✅ DONE

> **Status: Complete.** The booking form in `booking-calendar.tsx` already renders all custom question types from the event type. All 9 question types supported: `short_text`, `long_text`, `phone`, `single_select`, `dropdown`, `multiple_select`, `number`, `date`, `url`. Answers collected and POSTed to `/api/bookings`, which inserts them into `bookingAnswer` table. Builder side was complete in Step 12.

**Reference:** `docs/features/custom-questions.md`

Built on Step 12 (event type builder Questions tab) + Step 18 (booking engine).

### 5 MVP question types only (originally planned — all 9 now done):
- `short_text` → `<Input>`
- `long_text` → `<Textarea>`
- `phone` → `<Input type="tel">`
- `single_select` → `<RadioGroup>`
- `dropdown` → `<Select>`

Phase 2 only (do NOT build): `multiple_select`, `number`, `date`, `url`

---

## STEP 20 — Video Conferencing ✅ DONE

**Reference:** `docs/features/video-conferencing.md`

> **Status: Complete.**
> - Google Meet: `CALENDAR_WRITE` handler adds `conferenceData.createRequest` → `hangoutLink` stored in `booking.videoLinkInvitee`
> - Zoom: full OAuth flow built — connect, callback, token refresh, disconnect
>   - `lib/zoom/client.ts` — getZoomAuthUrl, exchangeZoomCode, getValidZoomAccessToken, createZoomMeeting
>   - `app/api/integrations/zoom/route.ts` + `callback/route.ts`
>   - `app/actions/settings.ts` — `disconnectZoom()`
>   - `app/(app)/settings/integrations/page.tsx` — Connect/Disconnect UI
> - `video-link-generate.ts` — real Zoom branch creates meeting; Google Meet reads hangoutLink from calendar write
> - Email: Join button label is provider-aware ("Join Google Meet" vs "Join Zoom Meeting")
> - Location picker: only Google Meet + Zoom active; all others show "Coming soon"
> - Teams = Phase 2. Not built.
> - ⚠️ Zoom OAuth requires HTTPS redirect (use ngrok locally). Zoom app approval takes 2–4 weeks — submit to Zoom marketplace early.

---

## STEP 21 — Booking Confirmation + All Email Templates ✅ DONE

> **Status: Complete.** Confirmation page complete. All 9 email templates done.
> - `booking-emails.ts` covers: confirmation (invitee + host), cancellation (invitee + host), reschedule (invitee + host) = 6 templates via one unified component with `variant` + `isInvitee` props
> - `reminder-invitee.ts` + `reminder-invitee.tsx` ✅ — invitee gets 24h + 1h reminder
> - `reminder-host.ts` + `reminder-host.tsx` ✅ — host gets 24h + 1h reminder before their own meetings
> - `lib/calendar/ics.ts` ✅ — ICS with TZID for email attachment (invitee confirmation email)

**Reference:** `docs/features/booking-confirmation.md`, `docs/features/notifications-reminders.md`

### 9 email templates to build in `lib/email/templates/`:

| File | When sent | To |
|------|-----------|-----|
| `booking-confirmed-invitee.tsx` | Booking created | Invitee |
| `booking-notification-host.tsx` | Booking created | Host |
| `booking-cancelled-invitee.tsx` | Invitee cancels | Invitee |
| `booking-cancelled-host.tsx` | Invitee cancels | Host |
| `booking-rescheduled-invitee.tsx` | Reschedule | Invitee |
| `booking-rescheduled-host.tsx` | Reschedule | Host |
| `host-cancels-invitee.tsx` | Host cancels | Invitee |
| `reminder-invitee.tsx` | 24h + 1h before | Invitee |
| `reminder-host.tsx` | 24h + 1h before | Host |

**Rules for all templates:**
- Hardcode hex `#0d9488` — CSS vars don't work in email clients
- Flat `#0d9488` header — NO gradient
- Both timezones in every meeting time
- ICS file attached to invitee confirmation
- `border-radius: 0` on all email buttons

### ICS generation (`lib/calendar/ics.ts`):
```ts
import ical from 'ical-generator'
// Generate with correct TZID in DTSTART/DTEND
// Attach to invitee confirmation email
```

---

## STEP 22 — Meetings Dashboard ✅ DONE

> **Status: Complete.** `app/(app)/dashboard/page.tsx` ✅ — stats cards + upcoming list. `app/(app)/bookings/page.tsx` ✅ — 313 lines, full 3-tab Upcoming/Past/Cancelled list, grouped by day, location icons, event name + invitee info, cancel/reschedule links. Note: no detail Sheet (slide-out panel) — bookings link directly to cancel/reschedule pages instead, which is acceptable for MVP.

**Reference:** `docs/features/meetings-dashboard.md`

```
app/(app)/dashboard/page.tsx    ← home with stats + today
app/(app)/bookings/page.tsx     ← full meetings list
```

### Bookings list — 3 tabs:
Upcoming | Past | Cancelled

**Status badges:**
- Confirmed → `variant="default"` (teal)
- Cancelled → `variant="secondary"` (gray)
- Rescheduled → `variant="outline"`
- Completed → `variant="secondary"`

**Booking detail → `<Sheet side="right">`:**
- Invitee info, dual timezone time, question answers, video join button, host notes textarea, "Cancel booking" destructive button

---

## STEP 23 — Cancellation & Reschedule Flows ✅ DONE

> **Status: Complete.**
> - `app/(booking)/cancel/[token]/cancel-client.tsx` ✅ — token validation, cancellation policy check, confirms, shows result
> - `app/(booking)/cancel/[token]/page.tsx` ✅ — server wrapper, loads booking + policy
> - `app/(booking)/reschedule/[token]/reschedule-client.tsx` ✅ — full rescheduler with calendar slot picker
> - `app/(booking)/reschedule/[token]/page.tsx` ✅ — server wrapper
> - `app/api/bookings/cancel/route.ts` ✅ — validates token, updates status, enqueues BOOKING_CANCELLATION + CALENDAR_CANCEL + BOOKING_CANCEL_REMINDERS
> - `app/api/bookings/reschedule/route.ts` ✅ — validates token, conflict check, updates booking, enqueues BOOKING_RESCHEDULE_NOTIFY + BOOKING_RESCHEDULE_REMINDERS + CALENDAR_UPDATE

**Reference:** `docs/features/booking-flow.md`

```
app/(booking)/cancel/[token]/page.tsx
app/(booking)/reschedule/[token]/page.tsx
app/api/bookings/[token]/cancel/route.ts
app/api/bookings/[token]/reschedule/route.ts
```

### Cancel API — exact steps:
```
1. Validate token (exists, not expired, status=confirmed)
2. Re-check startTime > NOW()
3. Re-check cancellation policy window
4. db.transaction():
   a. SELECT booking FOR UPDATE
   b. Verify status still 'confirmed'
   c. UPDATE booking SET status='cancelled'
   d. INSERT audit_log
5. boss.send(BOOKING_CANCEL_REMINDERS)   ← cancels reminder jobs
6. boss.send(CALENDAR_CANCEL)            ← deletes calendar event
7. boss.send(EMAIL_SEND × 2)            ← cancellation emails
8. return 200
```

---

## STEP 24 — Landing Page ✅ DONE

> **Status: Complete.** Full premium redesign + all legal and marketing pages.
> - Landing page: hero, ticker, bento grid, stats, how-it-works, testimonials, FAQ, CTA, footer
> - `/privacy`, `/terms`, `/cookies`: full prose via shared `LegalShell` + sidebar TOC
> - `/about`: dark hero, origin story timeline, values cards, open-source callout
> - `/contact`: server-action form via `enqueueEmail()`, channel cards, FAQ link panel
>
> See `app/(landing)/page.tsx`, `components/landing/legal-shell.tsx`, `app/actions/contact.ts`.

**Reference:** `docs/features/landing-page.md`

```
app/(landing)/
├── layout.tsx                      ← sticky header + footer, no auth required
├── page.tsx                        ← full premium redesign (scroll animations)
├── about/page.tsx                  ← origin story, stats, values, OSS callout
├── contact/page.tsx                ← form + channel cards
├── contact/_components/contact-form.tsx
├── privacy/page.tsx                ← 8 TOC sections via LegalShell
├── terms/page.tsx                  ← 11 TOC sections via LegalShell
└── cookies/page.tsx                ← 7 TOC sections + cookie table via LegalShell
components/landing/legal-shell.tsx  ← LegalShell + TocEntry + prose helpers
app/actions/contact.ts              ← sendContactMessageAction server action
```

**Gradients:** Landing page ONLY. Never in dashboard, admin, settings, booking form.

---

## STEP 25 — Admin Panel (Orbit) — Expand Existing ✅ DONE

> **Status: Complete.** Overview ✅, users list ✅, email outbox ✅, job queues ✅, audit log ✅.
> `/orbit/users/[id]` ✅ — ban/unban, role toggle, impersonate, recent bookings, activity log.
> `/orbit/settings` ✅ — env var status display (SMTP, Google OAuth, Zoom, pg-boss, security keys).
> Admin sidebar updated with Settings link + users table has View → link per row.
> ⚠️ Still missing: amber impersonation banner when `session.impersonatedBy` is set.

**Reference:** `docs/features/admin-panel.md`

The `(orbit)` admin already exists with: overview, users list, email outbox, job queue.

### Add missing orbit pages:

**`/orbit/users/[id]`** — user detail:
- Profile + sessions + email history + ban/unban + impersonate
- Uses Better Auth Admin Plugin: `auth.api.banUser()`, `auth.api.unbanUser()`, `auth.api.impersonateUser()`

**`/orbit/audit-log`** — audit log viewer (if not already):
- Searchable/filterable table of `audit_logs`
- Row click → Sheet with full JSON before/after

**`/orbit/settings`** — platform settings:
- 4 settings from `platform_settings` table
- 60-second in-memory cache: `lib/db-settings.ts`

### Impersonation banner (in `(orbit)` AND `(app)` layout):
```tsx
// When session.impersonatedBy exists:
<div className="bg-amber-50 border-b border-amber-200 text-amber-800 text-sm px-4 py-2 flex justify-between">
  <span>Impersonating {session.user.name}</span>
  <button onClick={stopImpersonating}>Stop impersonating</button>
</div>
```

---

## STEP 26 — Open Source Check ✅ DONE

> **Status: Complete.** All watermarks removed. Audit result: zero SaaS upsell strings in app/lib/components code.

**Removed "Powered by Schduled" from 5 locations:**
- `app/(booking)/[username]/[eventSlug]/_components/booking-calendar.tsx` — div removed entirely
- `app/(booking)/confirmed/_components/confirmation-client.tsx` — brand footer div removed
- `lib/email/components/booking-email.tsx` — replaced with `© Schduled`
- `lib/email/components/reminder-invitee.tsx` — replaced with `© Schduled`
- `lib/email/components/reminder-host.tsx` — replaced with `© Schduled`

**Audit results:**
- ✅ Zero `Powered by` strings remaining
- ✅ Zero old brand references
- ✅ Zero SaaS upsell strings (`upgrade to`, `go pro`, `unlock`, `subscribe`)
- ✅ No `/pricing` page
- ✅ No billing tables in schema
- ✅ Unlimited event types, questions, overrides — no quota enforcement code

---

## STEP 27 — QA + Launch Checklist

### Manual test sequences:

| # | Test | What to verify |
|---|------|---------------|
| 1 | Host journey | Sign in → onboard 5 steps → create event type → copy booking link |
| 2 | Invitee journey | Open link → pick date → slot → fill form → book → receive email with ICS |
| 3 | Reminder check | Book 25h ahead → 24h reminder fires → 1h fires |
| 4 | Cancel via email | Click cancel link → confirmed → calendar event removed → emails sent |
| 5 | Reschedule via email | Click reschedule → pick new time → old reminders cancelled → new scheduled |
| 6 | Double-booking | Same slot in 2 tabs → only 1 succeeds → other gets "slot taken" |
| 7 | Timezone check | Host EST / invitee IST → both timezones in all screens and all emails |
| 8 | Token refresh | Let Google token expire → silent refresh → no error to user |
| 9 | Admin flows | Sign in as admin → search user → ban → unban → impersonate → stop |
| 10 | Cancel policy | Cancel within locked window → "Cancellation Blocked" shown |

### Pre-launch checklist:

| Item | Done |
|------|------|
| `/privacy`, `/terms`, `/cookies` have real legal content | ✅ |
| SMTP: SPF + DKIM + DMARC configured on your sending domain | ☐ |
| Google OAuth consent screen published (not "Testing") | ☐ |
| Zoom Marketplace app published (**submit Day 1 — takes 2–4 weeks!**) | ☐ |
| All production env vars set (DATABASE_URL, APP_SECRET, ENCRYPT_KEY, SMTP_*, GOOGLE_*, ZOOM_*, NEXT_PUBLIC_APP_URL) | ☐ |
| Worker starts on server boot (`pm2 start npm -- run worker:start` or systemd unit) | ☐ |
| STORAGE_DRIVER=s3 + S3 bucket NOT publicly accessible (or keep local for VPS) | ☐ |
| Rate limiting on POST /api/bookings (10/60s) | ✅ |
| Rate limiting on GET /api/slots (30/60s) | ✅ |
| Rate limiting on GET /api/available-days, cancel, reschedule, username-check | ✅ |
| DB indexes: booking_host_start_idx, booking_host_status_idx, token indexes | ✅ |
| Drizzle config won't touch pgboss tables (pgboss uses own schema — already safe) | ✅ |
| Cancel policy enforcement (cutoffHours + allowCancellation) wired to cancel page | ✅ |
| Lighthouse 90+ on public booking page | ☐ |
| Mobile tested: 375px (iPhone SE) + 360px (Galaxy) | ☐ |
| First admin: `UPDATE "user" SET role='admin' WHERE email='your@email.com'` | ☐ |

---

## COMMON COMPONENT REUSE MAP

Never write a one-off version. Always use the component below.

| Component | Used in | File |
|-----------|---------|------|
| `<Logo>` | All headers, auth pages, onboarding | `components/logo.tsx` |
| `<PageHeader title description action>` | Every dashboard + orbit page | `components/scaffold/page-header.tsx` |
| `<Empty icon title description action>` | All zero-item lists | `components/ui/empty.tsx` |
| `<Stat label value sublabel icon>` | Dashboard home (3), orbit overview (3) | `components/ui/stat.tsx` |
| `<Spinner size>` | Button loading, async checks | `components/ui/spinner.tsx` |
| `<NavProgress>` | `(app)` layout + `(orbit)` layout | `components/nav-progress.tsx` |
| `<ThemeToggle>` | App nav UserMenu + orbit top bar | `components/theme-toggle.tsx` |
| `<DataTable>` | Bookings, orbit users, orbit email, orbit queues | `components/ui/data-table.tsx` |
| `<Badge variant>` | Status everywhere | `components/ui/badge.tsx` |
| `toast.promise(fn, {...})` | Every async save | via sonner |
| `<AlertDialog>` | Delete, ban, cancel, account deletion | `components/ui/alert-dialog.tsx` |
| `useUsernameCheck` | Onboarding step 1 + Settings > My Link | `hooks/use-username-check.ts` |

---

## ICON REFERENCE (Phosphor Icons Only)

```tsx
// Server Components:
import { CalendarIcon } from '@phosphor-icons/react/dist/ssr'

// Client Components:
import { CalendarIcon } from '@phosphor-icons/react'
```

| Screen / Context | Icon |
|-----------------|------|
| Dashboard nav | `GaugeIcon` |
| Event types nav | `CalendarIcon` |
| Availability nav | `ClockIcon` |
| Bookings nav | `HandshakeIcon` |
| Settings nav | `GearIcon` |
| Sign out | `SignOutIcon` |
| Admin / orbit | `ShieldIcon` |
| Audit log | `ClockCounterClockwiseIcon` |
| Users | `UsersIcon` |
| Job queue | `QueueIcon` |
| Platform settings | `SlidersIcon` |
| Impersonate | `MaskIcon` |
| Ban user | `ProhibitIcon` |
| Copy to clipboard | `CopyIcon` |
| External link | `ArrowSquareOutIcon` |
| QR code | `QrCodeIcon` |
| Drag handle | `DotsSixVerticalIcon` |
| Google logo | `GoogleLogoIcon` |
| Warning / caution | `WarningIcon` |
| Lock / blocked | `LockIcon` |
| Check / success | `CheckCircleIcon` |
| Delete | `TrashIcon` |
| Edit | `PencilSimpleIcon` |
| Plus / add | `PlusIcon` |
| Globe / timezone | `GlobeIcon` |
| Video / zoom | `VideoCameraIcon` |
| Envelope / email | `EnvelopeIcon` |
| Bell / notification | `BellIcon` |
| Question | `QuestionIcon` |

---

## BUILD ORDER SUMMARY

```
ALREADY DONE ✅ (re-audited 2026-06-18, session 7):
  Auth (Better Auth + magic link + admin plugin + 30-day session)
  DB client (Drizzle + postgres)
  ALL DB schema files (enums, auth, profile, event-types, availability,
    calendars, video, bookings, notifications, platform, relations, contacts, job-logs)
  ALL job types defined in lib/worker/job-types.ts (16+ types)
  Worker email handlers (email-send, email-outbox-reap, email-events-prune, platform.healthcheck)
  ALL booking lifecycle handlers (confirmation, cancellation, cancel-reminders, reminder,
    reschedule-notify, reschedule-reminders) — booking-lifecycle-data.ts (shared data layer)
  ALL calendar worker handlers (calendar-write, calendar-cancel, calendar-update,
    calendar-sync, calendar-token-refresh, calendar-disconnect-alert)
  video-link-generate.ts (Zoom real; Google Meet via calendar event hangoutLink)
  ALL 9 email templates (magic-link, delete-confirmation, booking-emails ×6, reminder-invitee,
    reminder-host)
  encrypt.ts (AES-256-GCM)
  lib/calendar/ics.ts — ICS attachment for invitee confirmation email
  lib/storage/ (local + S3/R2 multi-driver abstraction, avatar upload API)
  ALL Shadcn UI components installed
  ALL common UI components (logo, theme-provider, theme-toggle, page-header,
    spinner, empty, data-table, kbd, nav-progress)
  app/globals.css — teal OKLCH palette, Plus Jakarta Sans, scroll animations
  app/layout.tsx — Geist fonts + ThemeProvider + Sonner
  middleware.ts — full route protection Layer 1
  app-shell.tsx + sidebar-nav.tsx — show real avatar image (from user.image) + notification bell
  orbit admin — overview, users, email, queues, audit, settings + /orbit/users/[id] detail
    (ban/unban, impersonate, recent bookings, activity log)
  ALL settings pages — profile, branding, my-link, calendars, integrations,
    communication, contacts, security, cookies (9 pages complete)
  dashboard page — 5 stat cards + hover effects + upcoming + recent + empty states
  landing page — premium full redesign
  /about — origin story, stats, values, open-source callout
  /contact — server-action form, channel cards, enqueueEmail() pipeline
  /privacy, /terms, /cookies — full prose, sidebar TOC, shared LegalShell component
  ALL onboarding steps — 5-step modal, resume-from-step, avatar upload, Google OAuth
  Event type builder — list + new/[id], 6-tab form, full CRUD, questions, durations
  Google Calendar OAuth — initiate + callback, encrypt tokens, store calendar
  all route groups + stubs created
  post-auth redirect
  lib/calendar/slots.ts — DST-safe slot generator (buffer, min-notice, dedup)
  GET /api/slots — override-aware, timezone-safe, triple-deduplicated
  POST /api/bookings — conflict check (cross-midnight safe), pg_advisory_xact_lock,
    idempotency key check, insert booking + answers + tokens, enqueues all jobs
  /{username} host profile page — event type cards, avatar, name
  /{username}/{slug} booking calendar — 3-panel Calendly-style UI
    (progress bar, quick-pick, hover-scale calendar, 2-step slot selection, custom questions)
  /confirmed — confirmation page (animated icon, meeting card, countdown, add-to-calendar)
  /bookings — 3-tab Upcoming/Past/Cancelled, grouped by day, cancel/reschedule links
  /cancel/[token] + /reschedule/[token] — full cancel + reschedule flows with token validation
  POST /api/bookings/cancel + POST /api/bookings/reschedule — API routes with job enqueuing
  Notification system — bell + dismiss + clear-all + mark-read + API routes

Step 1   → ✅ globals.css + fonts
Step 2   → ✅ Branding set to Schduled
Step 3   → ✅ All packages + Shadcn components installed
Step 4   → ✅ All common components — logo, theme-provider, theme-toggle, page-header,
             spinner, empty, data-table, kbd, nav-progress — ALL confirmed present
Step 5   → ✅ middleware.ts complete
Step 6   → ✅ All DB schema + migrations applied
Step 7   → ✅ DONE — All job types + all handlers
             (booking lifecycle, calendar, video-link, email)
             ⚠️  IDEMPOTENCY_KEYS_PRUNE cleanup handler still missing (low priority)
Step 8   → 🔶 PARTIAL — encrypt.ts ✅, lib/storage/ ✅
             ❌ Still need: lib/api/helpers.ts, lib/validators.ts
Step 9   → ✅ requireSession() + freshUser + 30-day session + Google OAuth social provider
Step 10  → ✅ Onboarding modal — all 5 steps, resume-from-step, avatar upload, Google OAuth
Step 11  → ✅ ALL settings pages — 9 pages complete
             ⚠️  settings/login page missing — only settings/security exists
Step 12  → ✅ Event type builder — list + 6-tab builder, full CRUD + questions
             ✅ Inactive card state — grey out, disable edit/copy
             ✅ Location picker — Google Meet + Zoom active; others "Coming soon"
Step 13  → ✅ Availability management — full Calendly-style page COMPLETE
Step 14  → ✅ lib/encrypt.ts — AES-256-GCM OAuth token encryption
Step 15  → ✅ DONE — Google Calendar OAuth + all 5 worker handlers
             ⚠️  Enable Google Calendar API in GCP console (project 440182203203) — user action
Step 16  → ✅ lib/calendar/slots.ts — DST-safe slot generator
Step 17  → ✅ Public booking page — COMPLETE
Step 18  → ✅ DONE — POST /api/bookings + GET /api/slots + all 6 post-commit jobs
             ✅ pg_advisory_xact_lock + idempotency key check added
Step 19  → ✅ Custom questions — all 9 types collected in booking form + saved to bookingAnswer
Step 20  → ✅ DONE — Google Meet (via calendar write) + Zoom OAuth full flow
             ⚠️  Zoom app approval takes 2–4 weeks — submit to Zoom marketplace early
Step 21  → ✅ DONE — Confirmation page + ALL 9 email templates
             ✅ reminder-host.ts (host 24h/1h reminder)
             ✅ lib/calendar/ics.ts (ICS attachment for invitee confirmation email)
Step 22  → ✅ DONE — bookings page: 3-tab Upcoming/Past/Cancelled, grouped by day
Step 23  → ✅ DONE — Cancel + reschedule: pages, API routes, worker job enqueuing
Step 24  → ✅ DONE — Landing page + /privacy + /terms + /cookies + /about + /contact
Step 25  → ✅ DONE — overview/users/email/queues/audit/settings + /orbit/users/[id] detail
             ⚠️  Impersonation amber banner (session.impersonatedBy) still missing
Step 26  → ✅ DONE — watermark removed (5 locations), open source audit clean
             ✅ Zero "Powered by" strings, zero SaaS upsell strings, zero old brand references
Step 27  → ❌ QA (10 test sequences) + launch checklist

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

NEXT PRIORITY ORDER (pick up here):

  1. Step 8  → lib/api/helpers.ts (rate limiting) + lib/validators.ts (XSS sanitization)
               Apply validators to all public API routes (bookings, slots, username-check)

  2. Step 27 → QA (10 manual test sequences) + pre-launch checklist

  4. settings/login page — connect auth methods view (magic link vs Google OAuth)

  5. Impersonation banner — amber strip when session.impersonatedBy is set

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## POST-MVP IMPROVEMENTS (v1.1+)

> Identified in design audit (2026-06-24). These are NOT MVP blockers.
> Fix bugs above first. Add these after v1 ships.

### UX & Missing Scheduling SaaS Standards

| Feature | Priority | Notes |
|---------|----------|-------|
| "Powered by Schduled" on booking pages | High | Growth loop — add to host profile, calendar, confirmation page footer |
| "Schedule another meeting" link on confirmation | High | Link back to `/{username}` below reschedule/cancel |
| Bookings pagination / load more | High | Currently hard-capped at 50 — users can't see older bookings |
| `loading.tsx` on all app routes | High | Without these, route transitions show blank screen; add to `/dashboard`, `/bookings`, `/event-types`, `/availability` |
| StatCards link to filtered bookings view | Medium | e.g. "Upcoming" stat → `/bookings?tab=upcoming` |
| "No bookings yet" zero state on event type card stats row | Medium | Currently the stats row is hidden when count=0 and no lastBooked |
| "View your public booking page" link on Profile settings | Medium | Every scheduling SaaS shows this prominently on profile |
| After-booking redirect URL field | Medium | Add `redirectUrl` to event type schema + Confirmations tab |
| Date-range filter on Bookings page | Medium | "This week / This month / Custom range" |
| Reorder event types (drag handle) | Low | At minimum a position up/down button per card |
| "Last signed in" timestamp on Security page | Low | Pull `session.createdAt` from current session |
| Auto-dismiss success toast in my-link form | Low | `setTimeout(() => setMessage(null), 4000)` on success |
| Character counter on username input | Low | Live `{n}/30` below the input |

### Schema & Builder Gaps

| Feature | Priority | Notes |
|---------|----------|-------|
| `meetingType` field on `event_type` table | Medium | Currently no enum — card badge always shows "One-on-One". Add `one_on_one`, `group`, `round_robin`, `collective` and expose in builder |
| Meeting limits (Advanced tab) server action | Medium | UI exists but saves nothing — wire `saveMeetingLimits` server action |
| Pending bookings tab position | Low | Move "Pending" tab to first position (most urgent) |

### Code Quality

| Issue | Notes |
|-------|-------|
| `STATUS_STYLES` defined in both `dashboard/page.tsx` and `bookings/page.tsx` | Extract to `lib/booking-status.ts` |
| `LocationBadge` uses inline CSS colors in dashboard, Tailwind classes in bookings | Unify into shared component in `components/bookings/` |
| `availability-form.tsx` is 1200+ lines | Split into `WeeklyHoursEditor`, `DateOverrideList`, `HolidaySettings`, `MeetingLimitsSettings` under `_components/` |
| `COMMON_TZ` list only has 19 timezones | Fall back to `Intl.supportedValuesOf('timeZone')` when search has no match |
```
