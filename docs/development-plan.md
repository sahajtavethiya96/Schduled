# Development Plan — Schduled

## How to use this file

Each phase is a self-contained development step. Work through them **in order** — each phase depends on the previous one being complete. Do not skip ahead.

At the start of each phase, reference the relevant feature doc from the `features/` folder. At the end of each phase, the app should be in a working, testable state before moving to the next.

**Relevant docs:** All feature specs live in `features/`

---

## Tech Stack (reference)

| Layer | Choice |
|-------|--------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript 5 |
| Database | PostgreSQL 16+ |
| ORM | Drizzle ORM |
| Auth | Better Auth (with Admin Plugin) |
| Job Queue | pg-boss (PostgreSQL-backed — no Redis) |
| Styling | Tailwind CSS |
| UI Components | Shadcn/UI (Headless UI / @floating-ui/react primitives) |
| Forms | react-hook-form + Zod (@hookform/resolvers) |
| Email Delivery | Nodemailer (SMTP) |
| Email Templates | React Email (@react-email/components) |
| File Storage | S3-compatible (@aws-sdk/client-s3 + s3-request-presigner) |
| ID Generation | @paralleldrive/cuid2 |
| Linter / Formatter | Biome (replaces ESLint + Prettier) |
| Admin Panel | Custom Next.js pages (Shadcn/UI + Better Auth Admin Plugin) |
| Calendar Libs | date-fns-tz, ical-generator |
| Validation | Zod |
| Full reference | [tools-packages.md](./tools-packages.md) |

---

## Phase Overview

```
Phase 0  →  Project Setup
Phase 1  →  Database Schema
Phase 2  →  Landing Page
Phase 3  →  Authentication
Phase 4  →  User Onboarding
Phase 5  →  User Profile & Settings
Phase 6  →  Event Type Builder
Phase 7  →  Availability Management
Phase 8  →  Calendar Integrations
Phase 9  →  Timezone Management
Phase 10 →  Public Booking Page
Phase 11 →  Booking Engine
Phase 12 →  Custom Questions
Phase 13 →  Video Conferencing
Phase 14 →  Booking Confirmation
Phase 15 →  Notifications & Reminders
Phase 16 →  Meetings Dashboard
Phase 17 →  Cancellation & Reschedule
Phase 18 →  Open Source Configuration
Phase 19 →  Admin Panel
Phase 20 →  QA & Launch Prep
```

---

## Phase 0 — Project Setup

**Goal:** Working Next.js 15 project with all tools configured, connected to the database, and ready for Phase 1.

> **Before starting Phase 0:** Complete every step in [pre-development-setup.md](./pre-development-setup.md) — external accounts (Google, S3, SMTP), credentials, package installation, environment variables, and database creation. Phase 0 assumes all of that is already in place. *(Azure/Microsoft and Zoom accounts are Phase 2 — skip for now)*

### Tasks

- [ ] Create the Next.js 15 project
  ```bash
  npx create-next-app@latest schduled --typescript --tailwind --app --src-dir --import-alias "@/*"
  cd schduled
  ```
- [ ] Install all packages — run the `pnpm add` commands in [pre-development-setup.md § 4](./pre-development-setup.md#4-complete-package-list); for the full versioned dependency list, see [tools-packages.md — Complete Dependencies](./tools-packages.md#complete-packagejson-dependencies)
- [ ] Initialize Shadcn/UI and add all components
  ```bash
  npx shadcn@latest init
  ```
- [ ] Add `biome.jsonc` to project root (config in [pre-development-setup.md § 4](./pre-development-setup.md#4-complete-package-list))
- [ ] Update `package.json` scripts:
  ```json
  "dev": "concurrently \"next dev\" \"tsx --watch src/lib/worker/index.ts\"",
  "worker": "tsx src/lib/worker/index.ts",
  "db:local": "tsx scripts/dev-db.ts",
  "db:generate": "drizzle-kit generate",
  "db:migrate": "drizzle-kit migrate",
  "db:studio": "drizzle-kit studio"
  ```
- [ ] Create `.env.local` from the template in [pre-development-setup.md § 5](./pre-development-setup.md#5-environment-variables--full-template) and fill in all values
- [ ] Create folder structure as defined in [project-structure.md](./project-structure.md)
- [ ] Configure `drizzle.config.ts` — **`schemaFilter: ["public"]` is required**: pg-boss creates its own `pgboss` schema on startup; without this filter, `drizzle-kit generate` detects those tables and tries to drop them
  ```typescript
  // drizzle.config.ts
  export default defineConfig({
    schema: './src/lib/db/schema/*',
    out: './drizzle',
    dialect: 'postgresql',
    dbCredentials: { url: process.env.DATABASE_URL! },
    schemaFilter: ['public'],
  })
  ```
- [ ] Set up `src/lib/env.ts` — Zod-validated env vars (never use `process.env` directly in code)
- [ ] Set up `src/lib/db/index.ts` — Drizzle client singleton
- [ ] Set up `src/lib/email/client.ts` — Nodemailer transporter using `SMTP_*` env vars; use Mailhog (`smtp://localhost:1025`) for local dev
- [ ] Set up `src/lib/email/renderer.ts` — `renderEmailTemplate(template, data)` → HTML string using `@react-email/render`
- [x] Set up `lib/storage/index.ts` — unified storage API (`uploadFile`, `deleteFile`, `getFileUrl`, `avatarKey`, `logoKey`)
- [x] Set up `lib/storage/local.ts` — local disk driver (dev): saves to `public/uploads/`, no credentials needed
- [x] Set up `lib/storage/s3.ts` — S3/R2 driver (prod): `S3Client` singleton using `S3_*` env vars; import is commented in `index.ts` until credentials are available
- [x] Upload API route: `POST /api/upload/avatar` — multipart upload, resizes to 256×256 WebP via `sharp`, updates `user.image` in DB
- [ ] When going live: set `STORAGE_DRIVER=s3`, fill `S3_*` env vars, uncomment S3 driver in `lib/storage/index.ts`
- [ ] Set up `src/lib/worker/boss.ts` — pg-boss client singleton
- [ ] Set up `src/lib/encrypt.ts` — AES-256-GCM `encryptValue(text)` / `decryptValue(ciphertext)` using `ENCRYPT_KEY` env var (for OAuth token storage at rest)
- [ ] Initialize git repository and make initial commit

**Done when:** `pnpm dev` runs both the Next.js server and the pg-boss worker without errors.

---

## Phase 1 — Database Schema

**Goal:** Full Drizzle schema defined for all modules. All tables created in the database.

**Reference docs:** All feature docs (each has a Data Model section)

### Tasks

- [ ] Write Drizzle schema files under `src/lib/db/schema/`:

  **`users.ts` — Auth + profile tables:**
  - [ ] `users` — id, name, email, emailVerified, image, username, timezone, onboardingStep, onboardingDone, createdAt, updatedAt *(extends Better Auth base)*
  - [ ] `sessions` — id, userId, token, expiresAt, ipAddress, userAgent
  - [ ] `accounts` — id, userId, provider, providerAccountId, accessToken, refreshToken, expiresAt
  - [ ] `verifications` — id, identifier, value, expiresAt
  - [ ] `user_profiles` — id, userId, displayName, jobTitle, company, bio, websiteUrl, theme (light/dark/system), dateFormat, timeFormat, updatedAt
  - [ ] `user_branding` — id, userId, brandPrimaryColor, brandTextColor, brandBackgroundColor, logoUrl, bannerUrl, welcomeMessage, confirmationMessage, redirectUrl, customEmailSubject, updatedAt
  - [ ] `username_redirects` — id, userId, oldUsername, newUsername, expiresAt, createdAt — records old usernames for 30-day redirect; without this table, any old booking link in an email signature would 404 the moment a user changes their username

  **`event-types.ts` — Scheduling setup:**
  - [ ] `event_types` — id, userId, name, slug, description, locationType, locationValue, hostPhoneNumber (host's phone shown to invitee when locationType=phone AND phoneCallDirection=invitee_calls_host), phoneCallDirection (host_calls_invitee / invitee_calls_host — only used when locationType = phone; drives whether invitee phone is required on the form and whose number is displayed in confirmation), color, isActive, isHidden, status (active/inactive), minimumNotice, bookingWindow, bookingWindowType (rolling/fixed), bufferBefore, bufferAfter, maxBookingsPerDay, startTimeIncrement, requiresApproval, createdAt, updatedAt
  - [ ] `event_type_durations` — id, eventTypeId, duration, isDefault
  - [ ] `cancellation_policies` — id, eventTypeId, allowCancellation, cutoffHours, allowRescheduling, rescheduleCutoffHours, maxReschedules, requireCancellationReason, cancellationReasonOptions (json), showPolicyText, createdAt
  - [ ] `availability_schedules` — id, userId, name, isDefault, timezone, createdAt
  - [ ] `availability_windows` — id, scheduleId, dayOfWeek, startTime, endTime *(times stored as HH:mm strings in schedule's timezone)*
  - [ ] `availability_overrides` — id, userId, date, isBlocked, startTime, endTime, reason, createdAt
  - [ ] `event_type_questions` — id, eventTypeId, label, type (short_text/long_text/phone/single_select/multi_select/dropdown/number/date/url), isRequired, options (json), position, isActive

  **`calendars.ts` — Calendar integrations:**
  - [ ] `connected_calendars` — id, userId, provider (google/outlook/apple/caldav), accountEmail, accessToken, refreshToken, tokenExpiresAt, calendarId, calendarName, isPrimary, isConflictCheck, isWriteTarget, createdAt — **add partial unique index on (userId) WHERE isWriteTarget=true** to enforce only one write-target calendar per user at the DB level
  - [ ] `calendar_events_cache` — id, connectedCalendarId, externalEventId, title, startTime, endTime, isBusy, hostOverride (null/available/busy), syncedAt

  **`video.ts` — Video conferencing:**
  - [ ] `video_connections` — id, userId, provider (zoom/teams), accountEmail, accessToken, refreshToken, tokenExpiresAt, providerUserId, createdAt

  **`bookings.ts` — Booking records:**
  - [ ] `bookings` — id, eventTypeId, hostUserId, inviteeName, inviteeEmail, inviteePhone, inviteeTimezone, startTime, endTime, status (confirmed/cancelled/rescheduled/completed/no_show), locationValue, videoLinkHost, videoLinkInvitee, cancelToken, rescheduleToken, cancelTokenExpiresAt (set to createdAt + 30 days; null once used), rescheduleTokenExpiresAt (set to createdAt + 30 days; null once used), cancellationReason, cancelledAt, rescheduledFromId, rescheduleCount (int default 0 — tracks how many times this booking has been rescheduled, checked against cancellation_policies.maxReschedules), createdAt, updatedAt
  - [ ] `booking_answers` — id, bookingId, questionId, questionLabel, answer
  - [ ] `booking_guests` — id, bookingId, guestEmail, guestName

  **`notifications.ts` — Notifications & reminders:**
  - [ ] `notification_preferences` — id, userId, bookingConfirmationEmail, bookingNotificationEmail, reminderEmail24h, reminderEmail1h, cancellationEmail, rescheduleEmail, dailyDigestEmail, weeklySummaryEmail, fromName, replyToEmail, emailFormat (detailed/summary), updatedAt
  - [ ] `workflow_jobs` — id, bookingId, jobType text (stores the pg-boss job name directly, e.g. `'BOOKING_REMINDER_24H'` — plain `text`, no Drizzle enum so adding jobs never needs a schema migration), singletonKey, scheduledFor, status, retryCount int default 0, completedAt (timestamp — set when job completes or permanently fails), failureReason (text nullable — last error message if job failed, for admin panel visibility), createdAt

- [ ] Run initial migration:
  ```bash
  npx drizzle-kit generate
  npx drizzle-kit migrate
  ```
- [ ] Confirm Drizzle Studio opens and shows all tables:
  ```bash
  npx drizzle-kit studio
  ```

**Done when:** All tables exist in the database, migrations are tracked, and Drizzle Studio shows all tables correctly.

---

## Phase 2 — Landing Page

**Goal:** Minimal public-facing marketing page is live. Visitors understand the product and can sign up. Target: 1 day to build.

**Reference doc:** [features/landing-page.md](./features/landing-page.md)

> **Scope decision:** Ship 4 content sections only. Social proof bar, features cards, comparison table, testimonials, and FAQ are Post-MVP — added after first real users, not before. Fake testimonials and generic "used by teams worldwide" copy reduce trust. See [features/landing-page.md](./features/landing-page.md) for full rationale.

### Tasks

**Layout & Navigation:**
- [ ] Public layout (separate from app layout — no sidebar, no auth)
- [ ] Sticky nav bar with logo, Sign In + Get Started CTAs
- [ ] Mobile hamburger menu
- [ ] Smooth scroll to section on anchor link click

**MVP Sections (in order) — build these:**
- [ ] Hero — headline, subheadline, primary CTA ("Get Started Free"), product screenshot/animation
- [ ] Key Differentiators — **3 sections only**: (1) Both timezones in every email, (2) Cancellation enforcement, (3) Fully free + open source — each with a 2-line explanation of the specific Calendly gap filled
- [ ] How It Works — **3 steps** (not 4): Sign Up → Connect Calendar → Share Link
- [ ] Final CTA banner — "Start scheduling in minutes. Free, open source, no credit card required."
- [ ] Footer — Product, Open Source, Legal links

**Post-MVP sections — do NOT build at launch:**
- Social proof bar — add after 100+ real users or company logos available
- Features section (6 cards) — add post-launch based on which features visitors ask about
- Comparison table (Schduled vs Calendly vs Cal.com) — add post-launch, goes stale quickly
- Testimonials — add only real quotes; **never ship placeholder/fictional quotes**
- FAQ accordion — write based on real support questions from first 50 users

**Additional pages (required before launch):**
- [ ] `/privacy` — Privacy Policy (required by Google OAuth, Zoom, and law)
- [ ] `/terms` — Terms of Service (required before launch)
- [ ] `/cookies` — Cookie Policy

**SEO:**
- [ ] `<title>` and `<meta description>` on all public pages
- [ ] Open Graph tags (og:title, og:description, og:image 1200×630)
- [ ] `sitemap.xml`
- [ ] `robots.txt`

**Done when:** 4-section landing page renders correctly on desktop and mobile, legal pages are live, and Sign In / Get Started buttons link correctly to auth pages.

---

## Phase 3 — Authentication

**Goal:** Users can sign up, sign in, sign out, verify email, and reset password. Google OAuth and magic link work.

**Reference doc:** [features/user-onboarding.md](./features/user-onboarding.md)

### Tasks

**Better Auth setup:**
- [ ] Configure Better Auth in `src/lib/auth/config.ts`
  - Email + password provider
  - Google OAuth provider (`overrideUserInfoOnSignIn: true` — keeps name/photo in sync on re-login)
  - Magic link provider (passwordless sign-in via email)
  - Admin Plugin (`impersonationSessionDuration: 3600, allowImpersonatingAdmins: false`)
  - Drizzle adapter
  - Session config (7-day TTL, 30-day with "remember me")
  - `cookieCache: { enabled: true, maxAge: 60 }` — caches session in a signed cookie for up to 60 seconds to reduce DB reads per request; **keep maxAge ≤ 60** so ban/role changes propagate within 1 minute
- [ ] Mount Better Auth handler at `src/app/api/auth/[...all]/route.ts`
- [ ] Configure Nodemailer SMTP as the email provider for Better Auth
- [ ] Create Better Auth client in `src/lib/auth/client.ts`

**Pages:**
- [ ] `/sign-up` — sign up form (name, email, password) + Google OAuth button
- [ ] `/sign-in` — sign in form (email, password, remember me checkbox) + Google OAuth button + magic link option
- [ ] `/forgot-password` — email input form
- [ ] `/reset-password` — new password + confirm password (reads token from URL)
- [ ] `/verify-email` — handles code from email, shows success or expired error

**Logic:**
- [ ] On sign-up: send email verification via Nodemailer (SMTP)
- [ ] On Google OAuth: skip email verification (already verified by Google)
- [ ] On password reset: revoke all existing sessions
- [ ] Redirect authenticated users away from auth pages → `/dashboard`
- [ ] Protect all `(dashboard)` routes — unauthenticated users redirected to `/sign-in`
- [ ] Middleware: `src/middleware.ts` — session check on every protected route

**Email templates (React Email → Nodemailer SMTP):**
- [ ] Email verification email (link valid 24 hours)
- [ ] Password reset email (link valid 1 hour, single-use)
- [ ] Welcome email (after first successful sign-up)

**Done when:** A new user can fully sign up, verify email, sign in (email + OAuth), reset password, and sign out. All auth pages are styled consistently.

---

## Phase 4 — User Onboarding

**Goal:** New users are guided from sign-up to their first live booking link in under 3 minutes.

**Reference doc:** [features/user-onboarding.md](./features/user-onboarding.md)

### Tasks

- [ ] `/onboarding` route — protected, only accessible if user has no event types yet
- [ ] Onboarding wizard layout with step indicator (Step 1 of 5)
- [ ] **Step 1 — Profile Setup**
  - [ ] Name (pre-filled from OAuth if available)
  - [ ] Profile photo upload (optional, skip button)
  - [ ] Username / booking URL slug (auto-suggested from name, editable, uniqueness check)
- [ ] **Step 2 — Connect Calendar**
  - [ ] Connect Google Calendar button → OAuth flow
  - [ ] Connect Outlook / Office 365 button — *(Phase 2 — greyed out at launch; show tooltip "Coming soon")*
  - [ ] "I'll connect later" skip button → **immediately deactivates all booking pages** (invitees see "This calendar is currently unavailable") + shows persistent dashboard banner "⚠️ Your booking pages are paused — connect a calendar to start accepting bookings" — booking pages auto-reactivate the moment a calendar is connected
  - [ ] Apple Calendar / iCloud connection — *(Phase 2 — CalDAV is complex, lacks OAuth; do not include in MVP onboarding)*
  - [ ] Show connected calendar with green checkmark after auth
- [ ] **Step 3 — Set Timezone**
  - [ ] Searchable timezone dropdown (IANA timezones)
  - [ ] Auto-detect from browser with confirmation ("We detected: Asia/Kolkata — is this correct?")
- [ ] **Step 4 — Create First Event Type**
  - [ ] Name input (default: "30-Minute Meeting")
  - [ ] Duration selector (15 / 30 / 45 / 60 min)
  - [ ] Location type selector (Google Meet / Custom Link / Phone / In-Person)
- [ ] **Step 5 — Preview & Share**
  - [ ] Live preview of the booking page (iframe or component)
  - [ ] Copy booking link button
  - [ ] "Go to Dashboard" button
- [ ] If user already has event types: redirect away from `/onboarding` to `/dashboard`

**Done when:** A new user after sign-up is guided through all 5 steps and arrives at their dashboard with a working, shareable booking link.

---

## Phase 5 — User Profile & Settings

**Goal:** Hosts can manage their profile, timezone, notification preferences, and account security.

**Reference doc:** [features/user-profile-settings.md](./features/user-profile-settings.md)

### Tasks

**API Routes / Server Actions:**
- [ ] Update profile (name, display name, bio, job title, company, website URL)
- [ ] Upload / remove profile photo
- [ ] Update timezone
- [ ] Update notification preferences
- [ ] Change password (requires current password)
- [ ] Enable / disable 2FA (TOTP via Better Auth) *(Phase 2 — defer to post-MVP)*
- [ ] List active sessions *(Phase 2)*
- [ ] Revoke individual session *(Phase 2)*
- [ ] Revoke all other sessions *(Phase 2)*
- [ ] Update username / booking URL slug (with uniqueness check in real-time)
- [ ] Delete account (with confirmation — type email to confirm)
- [ ] Request GDPR data export *(Phase 2 — at MVP scale, manual export on support request is acceptable; self-serve export adds pg-boss job + S3 + export logic; defer until user base justifies it)*

**UI (`/settings/`):**
- [ ] `/settings/profile` — name, display name, bio, photo, job title, company, website
  - [ ] Live booking page preview on right side as user edits
- [ ] `/settings/timezone` — timezone picker with current time preview
- [ ] `/settings/notifications` — toggle per notification type (booking, reminder, cancellation, reschedule)
  - [ ] From name and reply-to email customization
- [ ] `/settings/security` — change password, 2FA setup *(Phase 2)*, active sessions list with revoke buttons *(Phase 2)*
- [ ] `/settings/integrations` — connected calendars + video platforms (links to Phase 8 and Phase 13)
- [ ] Username change input with real-time uniqueness check; on save: write old username to `username_redirects` with `expiresAt = NOW() + 30 days`
- [ ] Middleware: resolve `GET /[username]/...` — if username not found in `users` table, check `username_redirects` for an unexpired record and return 308 redirect to new username URL
- [ ] "Download my data" button *(Phase 2)* → triggers GDPR export job, shows "You'll receive an email within 24 hours"
- [ ] Danger zone: Delete account with confirmation modal

**Done when:** All profile fields update and persist correctly. Photo upload works. Username change creates a redirect. Account deletion flow works. (GDPR self-serve export is Phase 2 — not a launch blocker.)

---

## Phase 6 — Event Type Builder

**Goal:** Hosts can create, edit, duplicate, hide, and delete event types. Each generates a unique booking link.

**Reference doc:** [features/event-types.md](./features/event-types.md)

### Tasks

**API Routes / Server Actions:**
- [ ] Create event type
- [ ] Get event types for current user
- [ ] Get event type by id
- [ ] Update event type (all fields)
- [ ] Duplicate event type
- [ ] Toggle hide/show event type
- [ ] Delete event type
- [ ] Reorder event types (drag-and-drop position)
- [ ] Check slug uniqueness (per user)

**UI (`/event-types/`):**
- [ ] Event types list page — cards with name, duration, location icon, active/hidden badge, booking link, action menu
- [ ] Create event type button → opens builder
- [ ] Event type builder page `/event-types/new` and `/event-types/[id]/edit`:
  - [ ] **What** tab: name, description, duration (preset + custom), color picker
  - [ ] **Where** tab: location type selector — Google Meet, Custom Link, Phone, In-Person address *(Zoom and Teams are Phase 2 — show greyed out with "Coming soon")*
    - [ ] When "Phone" is selected: show `phoneCallDirection` radio — "Host calls invitee" (invitee phone required in form) vs "Invitee calls host" (host's `hostPhoneNumber` shown in confirmation)
    - [ ] Google Meet option: greyed out with tooltip "Google Meet generates links through your Google Calendar — connect it in Settings first." if the host has not connected a Google Calendar account — Google Meet link generation requires Google Calendar OAuth (see Phase 13)
  - [ ] **When** tab: availability schedule selector, booking window, minimum notice, buffer before/after, daily limit
  - [ ] **Options** tab: URL slug, hide from profile, booking confirmation message, redirect URL after booking
  - [ ] Live preview panel showing how the booking page will look
  - [ ] Save + Publish button
- [ ] Copy booking link button on each event type card
- [ ] Context menu on each card: Edit, Duplicate, Hide, Delete

**Done when:** Event types can be created, edited, duplicated, and hidden. Each event type generates a correct URL at `schduled.com/[username]/[slug]`.

---

## Phase 7 — Availability Management

**Goal:** Hosts can set weekly working hours, buffer times, booking limits, and date-specific overrides.

**Reference doc:** [features/availability-management.md](./features/availability-management.md)

### Tasks

**API Routes / Server Actions:**
- [ ] Get availability schedule for current user
- [ ] Update weekly availability rules (per day: enabled, startTime, endTime)
- [ ] Add multiple time blocks per day (e.g., 9am–12pm and 2pm–5pm)
- [ ] Set buffer time before / after meetings
- [ ] Set minimum notice period
- [ ] Set maximum booking window
- [ ] Set daily meeting limit
- [ ] Get date overrides (specific blocked dates or custom hours)
- [ ] Add date override (block a date or set custom hours for a date)
- [ ] Delete date override

**UI (`/availability/`):**
- [ ] Weekly availability grid — toggle days on/off, set start/end time per day
- [ ] Add multiple time blocks per day (+ Add time range button)
- [ ] Buffer settings: before meeting / after meeting dropdowns (0 / 5 / 10 / 15 / 30 / 60 min)
- [ ] Minimum notice selector (e.g., 1 hour / 2 hours / 1 day / 2 days)
- [ ] Booking window selector (e.g., 14 days / 30 days / 60 days / Indefinite)
- [ ] Daily meeting limit input (None or number)
- [ ] Start time increment selector (every 15 / 30 / 60 minutes)
- [ ] Booking window type toggle: Rolling (e.g., next 30 days) vs Fixed date range (select start + end date)
- [ ] Date overrides section:
  - [ ] Calendar view to pick specific dates
  - [ ] Mark date as fully unavailable (blocked)
  - [ ] Set custom hours for a specific date
  - [ ] Bulk block a date range (e.g., vacation Jan 15–22) via calendar range picker
  - [ ] List of upcoming overrides with edit / delete
- [ ] Save changes button with success toast

**Done when:** Weekly availability rules save correctly and overrides block specific dates. The booking page for an event type reflects all rules accurately.

---

## Phase 8 — Calendar Integrations

**Goal:** Hosts can connect Google Calendar to read free/busy data in real-time and write new bookings. Google Calendar is the only calendar integration at launch. Outlook / Office 365 is Phase 2.

**Reference doc:** [features/calendar-integrations.md](./features/calendar-integrations.md)

### Tasks

**Google Calendar:**
- [ ] OAuth 2.0 flow — `GET /api/calendars/google/connect` → redirect to Google consent
- [ ] OAuth callback — `GET /api/calendars/google/callback` → exchange code for tokens, save to `connected_calendars`
- [ ] Fetch calendar list from Google Calendar API
- [ ] User selects which calendars to check for conflicts + which to write new bookings to
- [ ] Read free/busy data via `calendar.freebusy.query`
- [ ] Write new bookings via `calendar.events.insert`
- [ ] Token refresh logic (access token expires every 1 hour)
- [ ] Disconnect Google Calendar → delete tokens from DB; all event types using this calendar as write target are automatically disabled (booking pages show "This calendar is currently unavailable") until a calendar is reconnected
- [ ] Token expiry detection — if token refresh fails (revoked access), mark calendar as `disconnected` in `connected_calendars` and disable associated booking pages; host receives alert email: "Your Google Calendar has been disconnected — reconnect to resume bookings"

**Microsoft Outlook / Office 365 *(Phase 2 — Post-MVP)*:**
> Google Calendar covers the primary use case at launch. Outlook integration requires Microsoft Graph API registration, additional OAuth scopes review, and separate token management. Defer until Google integration is stable and user demand for Outlook is confirmed.
- [ ] OAuth 2.0 flow via Microsoft Graph API *(Phase 2)*
- [ ] Callback handler — save tokens to `connected_calendars` *(Phase 2)*
- [ ] Read free/busy via `/me/calendarView` *(Phase 2)*
- [ ] Write bookings via `/me/events` *(Phase 2)*
- [ ] Token refresh logic *(Phase 2)*
- [ ] Token expiry detection + disconnect alert *(Phase 2)*

**Apple iCloud / CalDAV *(Phase 2 — Post-MVP)*:**
> CalDAV lacks standard OAuth, requires app-specific passwords, and involves a complex protocol. Include in Phase 2 after Google + Outlook integrations are stable.
- [ ] App-specific password form (no OAuth for Apple)
- [ ] CalDAV connection using provided credentials
- [ ] Read calendar events via CalDAV REPORT request
- [ ] Write bookings via CalDAV PUT request
- [ ] Disconnect Apple Calendar

**Free/Busy Caching:**
- [ ] `CALENDAR_SYNC` pg-boss cron job — runs every 5 minutes (`*/5 * * * *`), refreshes `calendar_events_cache` for all connected calendars
- [ ] Cache free/busy windows in `calendar_events_cache`
- [ ] Booking engine reads from cache first, falls back to live API call

**UI (`/settings/integrations/`):**
- [ ] Connected calendars section:
  - [ ] Google: "Connect Google Calendar" button → OAuth flow
  - [ ] Outlook: "Connect Outlook" button — greyed out with "Coming soon" tooltip *(Phase 2)*
  - [ ] Apple: App-specific password form *(Phase 2)*
  - [ ] Each connected calendar shows: account email, calendars checked for conflicts, write-target calendar, "Disconnect" button
- [ ] Per-calendar toggles: which calendars to include in conflict check

**Done when:** Google Calendar connects via OAuth, reads free/busy data, writes bookings, refreshes tokens silently, and sends an email alert immediately on token expiry. Outlook is Phase 2 — not a launch blocker.

---

## Phase 9 — Timezone Management

**Goal:** Host and invitee always see meeting times in their own local timezone — automatically and accurately.

**Reference doc:** [features/timezone-management.md](./features/timezone-management.md)

### Tasks

**Host Timezone:**
- [ ] Timezone stored on `users` table (IANA identifier, set during onboarding)
- [ ] All dashboard times rendered in host timezone
- [ ] All host-side calendar writes use host timezone
- [ ] Timezone change in settings: recalculate future availability display, keep past bookings in UTC

**Invitee Timezone:**
- [ ] Auto-detect via `Intl.DateTimeFormat().resolvedOptions().timeZone` on booking page load
- [ ] Manual timezone override — dropdown shown on booking page ("Showing times in: Asia/Kolkata ▾")
- [ ] Store detected/selected timezone with the booking record

**Slot Calculation:**
- [ ] Availability windows stored as `HH:mm` strings paired with the schedule's IANA timezone (e.g., `09:00`–`17:00` in `Asia/Kolkata`) — NOT converted to UTC, to handle DST correctly
- [ ] All booking `startTime` / `endTime` stored as UTC timestamps in the database
- [ ] Slot generation — **generate slots as local-time increments first, then convert each slot to UTC** (do NOT convert the window to a UTC range and iterate through it — on DST transition days the local day is 23 or 25 hours long, and a single-offset UTC range produces slots that are 1 hour off after the transition):
  1. For a given date in the host's timezone, expand `HH:mm` windows into local datetime strings (e.g., `2026-03-08 09:00 America/New_York`, `2026-03-08 09:30 America/New_York`, …)
  2. Convert each local datetime to UTC using `date-fns-tz.zonedTimeToUtc()` — each slot gets the correct UTC offset for that exact moment
  3. Filter out UTC slots that overlap busy calendar events
  4. Return remaining UTC slots; convert to invitee timezone for display using `date-fns-tz.utcToZonedTime()`
- [ ] Slot generation uses `date-fns-tz` for DST-safe conversion to invitee timezone
- [ ] Slots display in invitee local time on booking page
- [ ] Confirmation screen shows both: invitee time AND host time

**Emails:**
- [ ] Confirmation email to invitee: "Your time: Thu Jun 5 at 3:00 PM IST" + "Host's time: 10:00 AM EST"
- [ ] Notification email to host: meeting time shown in host's timezone
- [ ] Reminder emails to invitee: invitee timezone shown

**Done when:** An invitee in IST booking a host in EST sees correct local times on the booking page, confirmation screen, and all emails. DST transitions do not cause off-by-one hour errors.

---

## Phase 10 — Public Booking Page

**Goal:** The public-facing booking page is live at `schduled.com/[username]/[eventSlug]`. Invitees can browse and select available time slots.

**Reference doc:** [features/booking-page-customization.md](./features/booking-page-customization.md)

### Tasks

**Profile Overview Page (`/[username]`):**
- [ ] Server-rendered page (no auth required)
- [ ] Host photo, name, bio, job title
- [ ] All active (non-hidden) event type cards
- [ ] Each card: name, duration, location icon, short description, "Book" button
- [ ] If one event type: option to redirect directly (skip profile overview)

**Event Type Booking Page (`/[username]/[eventSlug]`):**
- [ ] Server-rendered page (no auth required)
- [ ] Host info in left panel (photo, name, event type name, duration, location, description)
- [ ] Date picker (calendar) in center — grayed-out unavailable dates, highlighted available dates
- [ ] Time slot grid — available slots listed for selected date in invitee's timezone
- [ ] Timezone selector shown below slot list ("Showing times in: Asia/Kolkata ▾")
- [ ] "No slots available" message for fully booked dates

**Booking Page Customization:**
- [ ] Host brand color applied as accent color on booking page
- [ ] Host profile photo shown (circular avatar)
- [ ] Custom welcome / confirmation message shown after booking
- [ ] No "Powered by Schduled" badge (open source — no branding shown)

**Performance:**
- [ ] Slot calculation is done server-side (Server Component or API route)
- [ ] Static metadata (host info, event type) pre-rendered
- [ ] Slots reload only when a new date is selected (no full page reload)

**Done when:** The booking page is publicly accessible, shows correct available slots for the next 30 days, respects all availability rules, and is mobile-responsive.

---

## Phase 11 — Booking Engine

**Goal:** The core booking processor — slot locking, conflict check, calendar write, and all post-booking jobs.

**Reference doc:** [features/booking-engine.md](./features/booking-engine.md)

### Tasks

**Spam Booking Protection:**
- [ ] Validate email format with Zod before any DB write
- [ ] Block known disposable email domains

**API Route: `POST /api/bookings`**
- [ ] Validate request body with Zod (eventTypeId, startTime, inviteeName, inviteeEmail, inviteeTimezone, answers)
- [ ] **All external/network calls (e.g., idempotency key check, calendar pre-check) happen BEFORE opening the DB transaction** — never call an external API inside an open transaction; a slow or failing external call holds the lock and blocks other writers
- [ ] Acquire PostgreSQL advisory lock for the slot: `pg_advisory_xact_lock(hostUserId + startTime)` — key must be derived from **hostUserId + startTime**, not eventTypeId, so concurrent bookings across different event types for the same host at the same time are serialised correctly
- [ ] Re-verify slot availability inside a DB transaction (final check)
- [ ] Re-validate cancellation cutoff policy inside the transaction — not just on page load; the meeting may have started between page load and form submit
- [ ] Insert booking record into `bookings` table
- [ ] Release advisory lock
- [ ] Enqueue post-booking pg-boss jobs (after transaction commits — all jobs use canonical names from jobs-queues.md):
  - [ ] `VIDEO_LINK_GENERATE` — create video meeting link for Phase 2 integrations (Zoom/Teams); at launch, Google Meet link is generated inside `CALENDAR_WRITE` as part of the calendar event
  - [ ] `CALENDAR_WRITE` — create event on host's Google Calendar (Outlook is Phase 2)
  - [ ] `EMAIL_SEND` ×2 — confirmation email to invitee + notification email to host
  - [ ] `BOOKING_REMINDER_24H` / `BOOKING_REMINDER_1H` — scheduled for 24h and 1h before startTime
- [ ] Return booking confirmation data to client

**pg-boss Workers:**
- [ ] `VIDEO_LINK_GENERATE` handler — at launch: reads Google Meet link from `CALENDAR_WRITE` result (no separate API call needed); in Phase 2: calls Zoom/Teams API; updates `bookings.videoLinkHost` / `videoLinkInvitee`; `localConcurrency: 3`
- [ ] `CALENDAR_WRITE` handler — creates calendar event on host's Google Calendar with invitee as attendee, with `conferenceData` to generate Google Meet link; stores `externalEventId` on booking; `localConcurrency: 1` (must serialize)
- [ ] `EMAIL_SEND` handler — fetches `email_outbox` row, renders React Email template, sends via Nodemailer SMTP, updates status; `localConcurrency: 5`
- [ ] `BOOKING_REMINDER_24H` / `BOOKING_REMINDER_1H` handlers — look up booking, render reminder template, insert `email_outbox` row, enqueue `EMAIL_SEND`; `localConcurrency: 5`

**Booking Status Flow:**
- [ ] `confirmed` — successfully booked
- [ ] `cancelled` — cancelled by host or invitee
- [ ] `rescheduled` — rescheduled (original booking links to new one)
- [ ] `no_show` — host marked invitee as no-show

**Slot Lock Expiry:**
- [ ] If payment/form processing takes > 5 minutes — lock expires and slot is released

**Error Handling:**
- [ ] Slot already taken → return clear error + list alternative available slots
- [ ] Video API failure → booking still confirmed; pg-boss retries video link generation 3× with exponential backoff; if all 3 retries fail, host receives alert email "Video link generation failed for [Invitee Name]'s booking — please add the meeting link manually"; invitee confirmation email says "Your video link will be sent shortly"
- [ ] Calendar write failure → retry via pg-boss (3 retries with exponential backoff)
- [ ] Email failure → retry via pg-boss (3 retries)

**Done when:** Concurrent booking attempts for the same slot cannot both succeed. Post-booking jobs run async and do not block the API response. Failed jobs retry automatically.

---

## Phase 12 — Custom Questions

**Goal:** Hosts can add custom intake questions to their booking form. Invitees answer them before confirming.

**Reference doc:** [features/custom-questions.md](./features/custom-questions.md)

### Tasks

**API Routes / Server Actions:**
- [ ] Get questions for an event type
- [ ] Add question to event type
- [ ] Update question (label, type, options, required, position)
- [ ] Delete question
- [ ] Reorder questions (drag-and-drop position)
- [ ] Save booking answers with the booking record

**Question Types — MVP (5 types):**
- [ ] Short text (single-line, 255 char limit)
- [ ] Long text / paragraph (multi-line, 2000 char limit)
- [ ] Phone number (with country code selector, format validation)
- [ ] Single select (radio buttons)
- [ ] Dropdown (select from list)

**Question Types — Phase 2 (add after MVP launch):**
- [ ] Multi select (checkboxes) *(Phase 2)*
- [ ] Number input (with min/max validation) *(Phase 2)*
- [ ] Date picker *(Phase 2)*
- [ ] URL / website input *(Phase 2)*

**UI — Host (Event Type Builder → Questions tab):**
- [ ] Questions list with drag-and-drop reorder
- [ ] "Add Question" button → opens question type picker
- [ ] Question editor: label, type, required toggle, options editor (for select/dropdown)
- [ ] Delete question with confirmation

**UI — Invitee (Booking Form):**
- [ ] Questions rendered after name + email fields, before confirm button
- [ ] Required fields marked with asterisk (*), validated on submit
- [ ] Phone field shows country code selector

**Answers Storage:**
- [ ] Answers saved to `booking_answers` table on booking creation
- [ ] Answers included in host notification email
- [ ] Answers visible in Meetings Dashboard booking detail view

**Done when:** Hosts can add, reorder, and delete questions. Invitees see and answer them during booking. Answers are stored and visible in the dashboard.

---

## Phase 13 — Video Conferencing

**Goal:** Google Meet and Custom Links work at launch. Zoom is Phase 2.

**Reference doc:** [features/video-conferencing.md](./features/video-conferencing.md)

### Tasks

> ⚠️ **Zoom deferred to Phase 2.** Zoom Marketplace approval requires a published app with a live privacy policy, live terms of service, and a working demo URL — none of which exist before launch. Approval takes 2–4 weeks after a live URL is available. Attempting to submit before launch is impossible; attempting to launch without approval means Zoom doesn't work for any user. Google Meet covers the primary use case at launch.
> **Phase 2 reminder:** Once the app is live, register as Zoom developer → create OAuth app → submit for Marketplace review. Track approval weekly.

**Zoom Integration *(Phase 2 — do not build at launch)*:**
- [ ] Register Zoom OAuth app in Zoom Marketplace *(Phase 2)*
- [ ] OAuth 2.0 connection + callback + token storage *(Phase 2)*
- [ ] `VIDEO_LINK_GENERATE` handler: call Zoom API to create meeting *(Phase 2)*
- [ ] Store `videoLinkHost` (start URL) and `videoLinkInvitee` (join URL) *(Phase 2)*
- [ ] Token refresh + disconnect from settings *(Phase 2)*

**Google Meet Integration:**
- [ ] Google Meet link generated via `conferenceData` on Google Calendar event creation
- [ ] No separate OAuth needed — uses Google Calendar access already granted in Phase 8
- [ ] Extract Meet link from calendar event `conferenceData.entryPoints`

**Microsoft Teams Integration *(Phase 2 — do not build at launch)*:**
> Teams requires Outlook/Microsoft Graph OAuth already in place (Phase 8 P1). Even then, Teams users are a minority of solo freelancers. Build after MVP is stable.
- [ ] Teams meeting created via Microsoft Graph API `POST /me/onlineMeetings` *(Phase 2)*
- [ ] No separate OAuth needed — uses Microsoft Graph access from Phase 8 *(Phase 2)*
- [ ] Extract Teams join link from response *(Phase 2)*

**UI (`/settings/integrations/`):**
- [ ] Video platforms section:
  - [ ] Google Meet: auto-available if Google Calendar is connected (no extra auth needed)
  - [ ] Custom Link: always available — host pastes any video URL
  - [ ] Zoom: greyed out with "Coming soon" tooltip *(Phase 2)*
  - [ ] Microsoft Teams: greyed out with "Coming soon" tooltip *(Phase 2)*
- [ ] Event type builder — location type selector shows available platforms only

**Video Link Failure Handling:**
- [ ] pg-boss retries failed video link generation 3× with exponential backoff (5s → 30s → 2min)
- [ ] If all 3 retries fail: send host alert email "Video link generation failed for [Invitee Name]'s booking — please add the meeting link manually"; invitee confirmation email text reads "Your video link will be sent shortly" instead of showing a broken link
- [ ] Booking is always confirmed regardless of video link failure — video link is non-blocking

**Done when:** Google Meet generates links automatically for any host with Google Calendar connected. Custom Link location type works. Video link failures retry 3× and notify the host if permanently failed. Zoom and Teams are Phase 2 — not launch blockers.

---

## Phase 14 — Booking Confirmation

**Goal:** Invitee sees a confirmation screen instantly after booking. Both parties receive confirmation emails with calendar invites.

**Reference doc:** [features/booking-confirmation.md](./features/booking-confirmation.md)

### Tasks

**Confirmation Screen (Client-side, no page reload):**
- [ ] Booking page transitions to confirmation screen after `POST /api/bookings` succeeds
- [ ] Large green checkmark animation
- [ ] "You're scheduled!" headline
- [ ] Host name + photo
- [ ] Event type name
- [ ] **Invitee time** — full date + time in invitee's timezone
- [ ] **Host time** — same meeting in host's timezone (shown directly below invitee time)
- [ ] Duration
- [ ] Location (video join button or address)
- [ ] "A confirmation has been sent to [email]" message
- [ ] Add to Calendar buttons — Google Calendar, iCal/Outlook, Office 365
- [ ] Reschedule link + Cancel link

**Confirmation Email — Invitee (via Nodemailer SMTP):**
- [ ] Subject: "Confirmed: [Event Type Name] with [Host Name]"
- [ ] Invitee time + host time (both timezones)
- [ ] Video join link (or address)
- [ ] Calendar download buttons (Google, iCal)
- [ ] Invitee's own form answers (for their reference)
- [ ] Reschedule link + Cancel link
- [ ] Host's custom confirmation message (if set)
- [ ] `.ics` file attached (generated via `ical-generator`)

**Notification Email — Host (via Nodemailer SMTP):**
- [ ] Subject: "New booking: [Invitee Name] — [Date + Time]"
- [ ] Invitee name + email
- [ ] Meeting time in host's timezone
- [ ] Video join link (host's moderator/start link for Zoom *(Phase 2)*; Google Meet link for Google-connected hosts)
- [ ] All booking form answers
- [ ] Cancel booking link

**Calendar Event (via Phase 8 calendar connection):**
- [ ] Host calendar event created with: title, start/end, location (video link or address), invitee as attendee, description with form answers
- [ ] ICS invite sent to invitee via email attachment

**Done when:** Invitee sees the confirmation screen immediately after booking. Both parties receive confirmation emails with correct timezones. Calendar invite is attached to invitee email.

---

## Phase 15 — Notifications & Reminders

**Goal:** Automated 24-hour and 1-hour email reminders are sent to invitees before every meeting. All lifecycle events trigger correct emails.

**Reference doc:** [features/notifications-reminders.md](./features/notifications-reminders.md)

### Tasks

**pg-boss Job Scheduling:**
- [ ] On booking created — schedule future jobs via `boss.send(jobName, payload, { startAfter, singletonKey })`:
  - [ ] `BOOKING_REMINDER_24H` — fires 24 hours before `startTime`; singletonKey `{bookingId}_reminder_24h`
  - [ ] `BOOKING_REMINDER_1H` — fires 1 hour before `startTime`; singletonKey `{bookingId}_reminder_1h`
  - [ ] `followup` *(Phase 2)* — fires 30 minutes after `endTime`
  - [ ] `noshow_check` *(Phase 2)* — fires 15 minutes after `startTime`
- [ ] Each MVP job uses `singletonKey` = `{bookingId}_{suffix}` — ensures one job per booking per type
- [ ] On booking cancelled — cancel all pending reminder jobs by `singletonKey`
- [ ] On booking rescheduled — cancel old jobs, schedule new jobs with updated times

**pg-boss Workers:**
- [ ] `BOOKING_REMINDER_24H` and `BOOKING_REMINDER_1H` handlers (`src/lib/worker/handlers/booking-reminder-24h.ts`, `booking-reminder-1h.ts`):
  - [ ] Fetch booking + host + invitee details
  - [ ] Guard: if booking.status !== 'confirmed' → return (idempotent — cancelled bookings must not send reminders)
  - [ ] Render reminder React Email template with both timezones (invitee time + host time)
  - [ ] Insert `email_outbox` row, enqueue `EMAIL_SEND` job
  - [ ] Video join link prominently displayed; reschedule and cancel links in footer
- [ ] All transactional emails go through `EMAIL_SEND` job (never call nodemailer directly in API routes):
  - [ ] Booking confirmation to invitee + host notification — enqueued in booking creation transaction (Phase 14)
  - [ ] Cancellation emails to both parties — enqueued on cancel (Phase 17)
  - [ ] Reschedule emails to both parties — enqueued on reschedule (Phase 17)
- [ ] Cleanup cron jobs registered in `src/lib/worker/index.ts`:
  - [ ] `EMAIL_OUTBOX_REAP` — cron daily 03:00 UTC — delete email_outbox rows >90 days with status=sent/failed
  - [ ] `EMAIL_EVENTS_PRUNE` — cron daily 03:30 UTC — delete email_events rows >30 days

**Email Templates (React Email → Nodemailer SMTP):**
- [ ] Booking confirmation — invitee
- [ ] Booking notification — host
- [ ] 24-hour reminder — invitee
- [ ] 1-hour reminder — invitee
- [ ] Cancellation notice — invitee (when invitee or host cancels)
- [ ] Cancellation notice — host (when invitee cancels)
- [ ] Reschedule confirmation — invitee
- [ ] Reschedule confirmation — host
- [ ] Host cancellation notice — invitee (when host cancels from dashboard)

**Customization:**
- [ ] Host can set: from name, reply-to email (stored in `notification_preferences`)
- [ ] All emails use host's from name (e.g., "Jane Smith" not "Schduled")
- [ ] Custom confirmation message injected into invitee confirmation email

**Done when:** Reminder jobs are scheduled when a booking is created, cancelled when booking is cancelled, and fire correctly at 24h and 1h before the meeting. All reminder emails include both timezones and the join link.

---

## Phase 16 — Meetings Dashboard

**Goal:** Hosts can view, search, filter, and manage all their bookings from a central dashboard.

**Reference doc:** [features/meetings-dashboard.md](./features/meetings-dashboard.md)

### Tasks

**API Routes / Server Actions:**
- [ ] Get upcoming meetings (paginated, sorted by soonest first)
- [ ] Get past meetings (paginated, sorted by most recent first)
- [ ] Get meeting detail (with booking answers, notes)
- [ ] Search meetings by invitee name or event type
- [ ] Filter meetings by status, event type, date range
- [ ] Add / update private notes on a booking
- [ ] Cancel meeting from dashboard (host-initiated)
- [ ] Stats: today's meeting count, upcoming total *(MVP — Phase 2: "this week" count, "cancelled this month", cancellation rate)*

**UI (`/dashboard/`):**
- [ ] **Today's Meetings** section at top — highlighted, with countdown to next meeting, one-click join button (active 15 min before start)
- [ ] **Upcoming Meetings** list — sorted by date, grouped by day ("Tomorrow", "Thursday, June 5", etc.)
- [ ] **Past Meetings** tab — sorted most recent first
- [ ] Meeting card shows: invitee name + photo initials, event type, date + time (host timezone), duration, location icon, status badge (Confirmed / Rescheduled / Cancelled), Join button
- [ ] Click meeting card → open booking detail panel (slide-in):
  - [ ] All booking details (time, both timezones, location, invitee email)
  - [ ] Invitee's form answers
  - [ ] Private notes textarea (host-only, not visible to invitee)
  - [ ] Cancel meeting button
- [ ] Search bar — filter by invitee name in real-time
- [ ] Filter dropdown — by event type, status, date range *(MVP — Phase 2: location type filter, host filter)*
- [ ] Stats bar at top: Today's meetings count + Upcoming total *(MVP — Phase 2: "This week" count, "Cancelled this month", cancellation rate)*
- [ ] Empty state for each tab ("No upcoming meetings — share your booking link to get started")

**Done when:** Dashboard shows all meetings correctly. Today's meetings are highlighted. Search and filters work. Private notes save. Join button activates 15 minutes before meetings.

---

## Phase 17 — Cancellation & Reschedule

**Goal:** Invitees can cancel or reschedule bookings via links in their emails. Hosts can cancel from the dashboard.

**Reference doc:** [features/booking-flow.md](./features/booking-flow.md)

### Tasks

**API Routes:**
- [ ] `GET /api/bookings/[token]/cancel` — load cancellation page (validate token; if `startTime <= NOW()` return "Meeting Already Completed" page — cannot cancel a past meeting)
- [ ] `POST /api/bookings/[token]/cancel` — process cancellation: re-validate `startTime > NOW()` AND re-validate cancellation cutoff policy inside the transaction (cutoff can expire between page load and form submit)
- [ ] `GET /api/bookings/[token]/reschedule` — load reschedule page (validate token; check token not expired; if `startTime <= NOW()` return "Meeting Already Completed" page — cannot reschedule a past meeting)
- [ ] `POST /api/bookings/[token]/reschedule` — confirm reschedule: re-validate `startTime > NOW()` AND re-validate reschedule cutoff inside the transaction

**Cancellation Flow:**
- [ ] Unique cancel token per booking (stored on `bookings` table)
- [ ] Cancel page: shows meeting details, cancellation reason field (free text or host-configured dropdown options), "Cancel Meeting" button
- [ ] Store cancellation reason on `bookings.cancellationReason` column
- [ ] Cancellation policy enforcement — if within locked window: show **Cancellation Blocked** page with: heading, explanation of window, host contact email, add-to-calendar button (booking stays confirmed)
- [ ] Reschedule Blocked page: same design as Cancellation Blocked — shown when reschedule window is also locked
- [ ] On cancel: update booking status to `cancelled`, cancel all pg-boss reminder jobs, remove from host's calendar, send cancellation emails to both parties

**Reschedule Flow:**
- [ ] Unique reschedule token per booking
- [ ] Reschedule page: shows full booking page (same as original event type) with available slots
- [ ] Original time shown at top: "You are rescheduling from: Thu Jun 5, 3:00 PM IST"
- [ ] On reschedule: cancel old booking, create new booking with same invitee details, cancel old pg-boss jobs, schedule new jobs, send reschedule emails to both parties
- [ ] **Propagate `rescheduleCount`**: new booking gets `rescheduleCount = oldBooking.rescheduleCount + 1` — checked against `cancellation_policies.maxReschedules` to prevent unlimited rescheduling
- [ ] Rescheduled booking links to previous via `rescheduledFromId`
- [ ] Null out `cancelTokenExpiresAt` and `rescheduleTokenExpiresAt` on old booking when tokens are consumed (single-use)

**Host Cancellation (from Dashboard):**
- [ ] "Cancel Meeting" button in booking detail panel
- [ ] Cancellation reason input (sent to invitee)
- [ ] On cancel: same flow as invitee cancellation + notification to invitee

**Cancellation Policy:**
- [ ] Host sets policy on event type: allowed always / no cancellations within X hours
- [ ] Policy enforced on both invitee cancel link and host dashboard cancel

**Done when:** Invitees can cancel and reschedule via email links. Hosts can cancel from the dashboard. Cancellation and reschedule emails send correctly. Calendar events are removed on cancellation.

---

## Phase 18 — Open Source Configuration

**Goal:** Confirm no billing or plan enforcement exists — all features are available to all users with no restrictions.

**Note:** No billing or plan system — Schduled is fully open source. All features are available to all users with no restrictions.

### Tasks

- [ ] No billing schema or plan enforcement needed — skip billing-related database tables
- [ ] All feature limits removed — unlimited event types, unlimited custom questions, unlimited date overrides for all users
- [ ] "Powered by Schduled" branding is not shown on any install (open source)
- [ ] No `/pricing` page, no upgrade prompts, no plan gates

**Done when:** Confirmed that no plan checks exist in the codebase and all features work without any limit checks.

---

## Phase 19 — Admin Panel

**Goal:** Platform admins can manage users, view the audit log, monitor the job queue, and configure platform settings. Full MVP admin panel — 5 screens: Dashboard, Audit Log, Users, Jobs, Settings.

**Reference doc:** [features/admin-panel.md](./features/admin-panel.md)

### Tasks

**Access Control:**
- [ ] `/admin` route group — check `session.user.role === 'admin'` via Better Auth Admin Plugin, else redirect to `/`
- [ ] **Defense-in-depth DB re-check** on all `/admin` layout and API routes: re-query `users.role` from DB (do not rely on cookie cache alone) — the session cookie caches role for up to 60 seconds; a user demoted from admin could still have a valid cookie for that window; the DB check closes the gap
- [ ] All `/api/admin/*` routes return 403 for non-platform-admins

**Admin Panel Setup:**
- [ ] Create `src/app/(admin)/admin/layout.tsx` — admin shell layout (sidebar: Dashboard + Users only)
- [ ] Create `src/components/admin/` — shared admin UI components (data table, stats card)
- [ ] All admin pages are Next.js Server Components — data fetched server-side via Drizzle ORM directly

**Dashboard (`/admin`):**
- [ ] 3 stats cards: total users, active bookings count, failed pg-boss jobs count

**User Management:**
- [ ] User list — paginated with search by email / name
- [ ] User detail — profile, active sessions, ban/unban status
- [ ] Ban / Unban user (`auth.api.banUser()` / `auth.api.unbanUser()`)
- [ ] Revoke all sessions for a user (`auth.api.revokeUserSessions()`)
- [ ] Send password reset email to user

**Phase 2 (not in this sprint):**
- [ ] Sign-up trend chart *(Phase 2)*
- [ ] Impersonation — "log in as user" *(Phase 2)*
- [ ] Booking oversight screen — platform-wide booking list + detail *(Phase 2)*
- [ ] Job queue monitor UI — `/admin/jobs` with retry/cancel *(Phase 2)*
- [ ] Platform settings screen + email template preview *(Phase 2)*

**Done when:** Platform admins can access `/admin`, search users by email, ban/unban accounts, and revoke sessions. Job queue checked via direct DB access if needed.

---

## Phase 20 — QA & Launch Prep

**Goal:** The product is stable, fully tested, and ready for real users.

### Tasks

**End-to-End Testing (manual):**
- [ ] Full host journey: Sign up → Onboarding → Create Event Type → Set Availability → Share Link
- [ ] Full invitee journey: Open booking link → Pick slot → Fill form → Book → Receive confirmation email
- [ ] Reminder emails: confirm 24h and 1h reminder jobs fire at correct times
- [ ] Cancellation flow: cancel via email link → calendar event removed → cancellation email sent
- [ ] Reschedule flow: reschedule via email link → new booking created → old reminder jobs cancelled → new jobs scheduled
- [ ] Double-booking prevention: open same slot in two browser tabs simultaneously, confirm only one succeeds
- [ ] Timezone accuracy: host in EST, invitee in IST — confirm all times display correctly in both timezones
- [ ] Token refresh: let calendar OAuth token expire → confirm Schduled refreshes it silently
- [ ] Calendar sync: add personal event to Google Calendar → confirm slot disappears from booking page within minutes

**Security Checks:**
- [ ] All dashboard routes return 401 for unauthenticated requests
- [ ] Cancel / reschedule tokens are single-use and expire
- [ ] Invitee cannot access another host's bookings via token manipulation
- [ ] Better Auth admin routes return 403 for non-admin users
- [ ] OAuth state parameter validated to prevent CSRF on calendar connect flows
- [ ] Rate limiting on booking creation (prevent spam bookings to a single event type)

**Performance:**
- [ ] Database indexes on: `bookings.hostUserId`, `bookings.startTime`, `bookings.status`, `connected_calendars.userId`, `booking_answers.bookingId`
- [ ] No N+1 queries on dashboard booking list
- [ ] Booking page slot calculation completes in < 500ms
- [ ] Lighthouse score 90+ on booking page (Performance, Accessibility, SEO)

**Pre-Launch Checklist:**
- [ ] `/privacy` page live with real content
- [ ] `/terms` page live with real content
- [ ] `/cookies` page live
- [ ] SMTP server configured with SPF, DKIM, and DMARC records on sending domain
- [ ] SMTP sending tested in production — confirm emails arrive in inbox (not spam)
- [ ] S3-compatible storage bucket created with correct access policy (allow PutObject/GetObject/DeleteObject for the app credentials only)
- [ ] S3 bucket not publicly accessible — all access via presigned URLs only
- [ ] Google OAuth app reviewed and not in "Testing" mode (production OAuth consent screen published)
- [ ] Microsoft Graph API app registered *(Phase 2 — Outlook and Teams are Post-MVP)*
- [ ] Zoom OAuth app submitted for Marketplace review *(Phase 2 — requires live demo URL; submit after launch)*
- [ ] All environment variables set in production (SMTP_*, S3_*, BETTER_AUTH_*, GOOGLE_*)
- [ ] pg-boss job workers started on server boot
- [ ] Confirm `console.error` output is captured by hosting platform logs
- [ ] Create first platform admin account
- [ ] Confirm all pages are mobile-responsive (test on iPhone SE and Galaxy S21)

**Done when:** All manual tests pass, all pre-launch checklist items are complete, the app is deployed to production, and the first real booking can be made end-to-end.

---

## Development Notes

- **Always build mobile-responsive** — booking pages especially must work perfectly on mobile; most invitees will book on their phone
- **Both timezones everywhere** — every email and confirmation screen must show both the invitee's time AND the host's time; this is a key differentiator vs Calendly
- **pg-boss jobs are the source of truth for async work** — never send emails or create calendar events synchronously in the booking API response; always enqueue a job
- **Cancel reminder jobs immediately on cancellation/reschedule** — use `singletonKey` to cancel pending pg-boss jobs when a booking changes; no reminders for meetings that no longer exist
- **Advisory locks for slot booking** — use `pg_advisory_xact_lock` (released on transaction end) to prevent two concurrent bookings claiming the same slot
- **External calls before transactions** — never call an external API (calendar, video, email) inside an open DB transaction; slow or failing network calls hold the lock and block other writers; do all external work first, then open the transaction
- **pg-boss v12 `includeMetadata`** — all `boss.work()` handlers that need `retryCount` or `retryLimit` must pass `{ includeMetadata: true }` as the second argument; in pg-boss v12, job metadata is not included by default
- **Server Actions over API Routes where possible** — use Next.js Server Actions for dashboard mutations; API Routes for public-facing booking endpoints (invitees are not logged in)
- **Token refresh is silent** — calendar API token refresh must happen invisibly; never show an OAuth re-auth error to an invitee during booking
- **Error states on every async action** — loading state + error state required for every booking form submit, calendar connect, and settings save
- **Email always async via pg-boss** — never call `nodemailer.sendMail()` directly in an API route; always enqueue a pg-boss job so email failures don't block the user-facing response
- **All file uploads go directly to S3-compatible storage via presigned URLs** — the Next.js server generates a presigned `PUT` URL and returns it to the browser; the browser uploads directly to the bucket without the file passing through the Next.js server
- **Use `console.error` for errors, `console.log` for key events** — no logging library needed; hosting platforms (Vercel, Railway, etc.) capture stdout/stderr automatically
