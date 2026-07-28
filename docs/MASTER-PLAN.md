# Schduled — Master Build Order

This is the single reference document for the full project order. Read this first, then use the linked files for detail on each item.

> **Pre-development planning document.** This describes the original build
> order and plan before the MVP existed — it does not reflect the current,
> shipped implementation (e.g. actual env vars are `APP_SECRET`/`APP_URL`, not
> `BETTER_AUTH_SECRET`/`BETTER_AUTH_URL`; there is no `src/` directory). For
> accurate, current documentation, see the root
> [README.md](../README.md), [SETUP.md](../SETUP.md),
> [ENVIRONMENT.md](../ENVIRONMENT.md), and [SELF-HOSTING.md](../SELF-HOSTING.md).

---

## Part 1 — Planning Docs (All Complete ✅)

All documentation is written and ready before development starts.

### Root-Level Docs (8 files)

| # | File | What It Covers |
|---|------|----------------|
| 1 | [README.md](./README.md) | Project overview, tech stack, competitive positioning |
| 2 | [architecture.md](./architecture.md) | System architecture — request flow, two-process model, data flow |
| 3 | [design-system.md](./design-system.md) | Complete UI design system — colors, fonts, components, layouts, screens, dark mode |
| 4 | [database-schema.md](./database-schema.md) | All 30 tables + 3 query files (audit.ts, email.ts, settings.ts) |
| 5 | [jobs-queues.md](./jobs-queues.md) | All 16 pg-boss job types, payloads, retry config, cron schedules |
| 6 | [project-structure.md](./project-structure.md) | Full folder and file layout for the Next.js app |
| 7 | [tools-packages.md](./tools-packages.md) | Every package used, why it was chosen, version notes |
| 8 | [pre-development-setup.md](./pre-development-setup.md) | External accounts, credentials, env vars, full package install list |
| 9 | [development-plan.md](./development-plan.md) | Detailed task list for each of the 21 build phases |

### Feature Docs (16 files in `features/`)

| # | File | What It Covers |
|---|------|----------------|
| 1 | [landing-page.md](./features/landing-page.md) | Public marketing page — 4 sections, legal pages, SEO |
| 2 | [user-onboarding.md](./features/user-onboarding.md) | Sign-up, email verification, 5-step onboarding wizard, auth flows |
| 3 | [user-profile-settings.md](./features/user-profile-settings.md) | Profile, My Link (URL + QR code), branding, communication, login preferences, contacts settings, cookie settings, security, account deletion |
| 4 | [event-types.md](./features/event-types.md) | Creating and managing event types, durations, cancellation policies |
| 5 | [availability-management.md](./features/availability-management.md) | Weekly hours, buffers, booking windows, date overrides |
| 6 | [calendar-integrations.md](./features/calendar-integrations.md) | Google Calendar (P0), Outlook (P1), Apple CalDAV (Phase 2) |
| 7 | [timezone-management.md](./features/timezone-management.md) | DST-safe slot generation, dual-timezone emails, IANA storage |
| 8 | [booking-page-customization.md](./features/booking-page-customization.md) | Public booking page branding — logo, color, confirmation message |
| 9 | [custom-questions.md](./features/custom-questions.md) | Custom intake form questions on booking forms |
| 10 | [video-conferencing.md](./features/video-conferencing.md) | Zoom, Google Meet, Teams (Phase 2) |
| 11 | [booking-engine.md](./features/booking-engine.md) | Slot locking, conflict check, advisory lock, post-booking jobs |
| 12 | [booking-confirmation.md](./features/booking-confirmation.md) | Confirmation screen, emails, ICS calendar invites |
| 13 | [booking-flow.md](./features/booking-flow.md) | Cancel and reschedule flows, cancellation policy enforcement |
| 14 | [meetings-dashboard.md](./features/meetings-dashboard.md) | Host dashboard — upcoming, past, search, notes |
| 15 | [notifications-reminders.md](./features/notifications-reminders.md) | 24h/1h reminders, all email types, dual-timezone in every email |
| 16 | [admin-panel.md](./features/admin-panel.md) | Admin dashboard — users, audit log, job queue, platform settings |

---

## Part 2 — Pre-Development Setup (Before Writing Any Code)

Complete every item in [pre-development-setup.md](./pre-development-setup.md) before starting Phase 0.

| # | Task | Notes |
|---|------|-------|
| 1 | **Create external accounts** | Google Cloud Console, Azure Active Directory, Zoom Marketplace, S3-compatible storage provider (AWS/Cloudflare R2/MinIO), SMTP provider |
| 2 | **Submit Zoom Marketplace app for review** | ⚠️ Do this on Day 1 — Zoom approval takes 2–4 weeks. Use development-mode app during dev. |
| 3 | **Set up PostgreSQL database** | Local: Docker (`postgres:16-alpine`); Production: any managed Postgres provider |
| 4 | **Install all packages** | Full install list in [pre-development-setup.md](./pre-development-setup.md) — production + dev dependencies |
| 5 | **Prepare `.env.local`** | All env vars listed in [pre-development-setup.md](./pre-development-setup.md) — fill every value before starting Phase 0 |

---

## Part 3 — Development Order (Phase 0 → Phase 20)

Build phases **in this exact order**. Each phase depends on the previous one.

---

### Phase 0 — Project Setup
**Builds:** Working Next.js 15 app with all tools wired up, no features yet
**Reference:** [development-plan.md § Phase 0](./development-plan.md)
**Key tasks:**
- Create Next.js 15 project with TypeScript + Tailwind + App Router
- Install all packages
- Configure Drizzle (`schemaFilter: ['public']` — required for pg-boss coexistence)
- Set up singletons: Drizzle client, Nodemailer transporter, S3 client, pg-boss client
- Set up `src/lib/env.ts` (Zod-validated env vars — never use `process.env` directly)
- Set up AES-256-GCM encryption for OAuth token storage
- Initialize git

**Done when:** `npm run dev` starts both the Next.js server and pg-boss worker without errors.

---

### Phase 1 — Database Schema
**Builds:** All 30 tables created in PostgreSQL
**Reference:** [database-schema.md](./database-schema.md), [development-plan.md § Phase 1](./development-plan.md)

**Table groups to write (in order):**

| Group | Tables | Schema File |
|-------|--------|-------------|
| Auth + Profile | `users`, `sessions`, `accounts`, `verifications`, `user_profiles`, `user_branding`, `username_redirects` | `src/lib/db/schema/users.ts` |
| Event Types | `event_types`, `event_type_durations`, `cancellation_policies` | `src/lib/db/schema/event-types.ts` |
| Availability | `availability_schedules`, `availability_windows`, `availability_overrides`, `event_type_questions` | `src/lib/db/schema/event-types.ts` |
| Calendars | `connected_calendars`, `calendar_events_cache` | `src/lib/db/schema/calendars.ts` |
| Video | `video_connections` | `src/lib/db/schema/video.ts` |
| Bookings | `bookings`, `booking_answers`, `booking_guests` | `src/lib/db/schema/bookings.ts` |
| Notifications | `notification_preferences`, `workflow_jobs` | `src/lib/db/schema/notifications.ts` |
| Email Queue | `email_outbox`, `email_events` | `src/lib/db/schema/email.ts` |
| Audit | `audit_logs` | `src/lib/db/schema/audit.ts` |
| Admin | `platform_settings`, `disposable_email_domains`, `idempotency_keys` | `src/lib/db/schema/admin.ts` |

**After writing schemas:** Run `drizzle-kit generate` then `drizzle-kit migrate`. Confirm all tables visible in Drizzle Studio.

**Done when:** All 30 tables exist in the database and migrations are tracked.

---

### Phase 2 — Landing Page
**Builds:** Public marketing page at `/`
**Reference:** [features/landing-page.md](./features/landing-page.md), [development-plan.md § Phase 2](./development-plan.md)

**Build order:**
1. Public layout (no sidebar, no auth)
2. Sticky navbar (logo + Sign In + Get Started)
3. Hero section
4. 3 Key Differentiators (dual-timezone emails, cancellation enforcement, open source)
5. How It Works (3 steps)
6. Final CTA banner
7. Footer
8. `/privacy`, `/terms`, `/cookies` pages (required before launch)
9. SEO metadata, Open Graph, sitemap.xml, robots.txt

**Do NOT build:** social proof bar, features grid, comparison table, testimonials, FAQ — all Post-MVP.

**Done when:** 4-section landing page renders on desktop and mobile. Legal pages live. CTAs link to auth pages.

---

### Phase 3 — Authentication
**Builds:** Sign up, sign in, sign out, email verification, password reset, Google OAuth, magic link
**Reference:** [features/user-onboarding.md](./features/user-onboarding.md), [development-plan.md § Phase 3](./development-plan.md)

**Build order:**
1. Better Auth config (`email+password`, `googleOAuth`, `magicLink`, `adminPlugin`, Drizzle adapter)
2. Mount Better Auth at `/api/auth/[...all]/route.ts`
3. Better Auth client singleton
4. Pages: `/sign-up`, `/sign-in`, `/forgot-password`, `/reset-password`, `/verify-email`
5. Email templates: verification, password reset, welcome (React Email → Nodemailer)
6. Middleware route protection for all `(dashboard)` routes

**Done when:** Full auth cycle works — sign up → verify email → sign in → reset password → sign out.

---

### Phase 4 — User Onboarding
**Builds:** 5-step onboarding wizard shown to every new user
**Reference:** [features/user-onboarding.md](./features/user-onboarding.md), [development-plan.md § Phase 4](./development-plan.md)

**Steps to build (in order):**
1. Step 1 — Profile setup (name, photo, username/booking URL slug)
2. Step 2 — Connect calendar (Google OAuth, Outlook OAuth, skip option)
3. Step 3 — Set timezone (auto-detect + confirm)
4. Step 4 — Create first event type (name, duration, location)
5. Step 5 — Preview & share booking link

**Done when:** New user goes from sign-up through all 5 steps and arrives at dashboard with a working booking link.

---

### Phase 5 — User Profile & Settings
**Builds:** Full settings area for hosts — 8-section settings sidebar
**Reference:** [features/user-profile-settings.md](./features/user-profile-settings.md), [development-plan.md § Phase 5](./development-plan.md)

**Pages to build (in order):**
1. `/dashboard/settings/profile` — name, photo, job title, company, timezone; bio + website *(Post-MVP — Phase 2)*
2. `/dashboard/settings/branding` — logo upload, brand colour picker, custom confirmation message
3. `/dashboard/settings/my-link` — booking URL display, copy button, open in new tab, share via email, QR code download, change username with real-time availability check and 30-day redirect (`username_redirects` table)
4. `/dashboard/settings/communication` — per-notification-type email toggles (new booking, cancellation, reschedule, reminder confirmation)
5. `/dashboard/settings/login` — connected auth methods table; Google OAuth connect/disconnect; add password to OAuth-only account
6. `/dashboard/settings/contacts` — auto-save invitees as contacts toggle (default on); domain/email exclusion list; `contacts` + `contacts_settings` tables
7. `/dashboard/settings/security` — change password form; active sessions list with per-session Revoke; Danger Zone (account deletion); 2FA *(Post-MVP — Phase 2)*
8. `/dashboard/settings/cookies` — necessary/analytics/marketing cookie toggles; preferences stored in `localStorage` under `cookie-consent`

**Done when:** All profile fields save. Photo upload works. My Link page shows QR code and copy works. Username change creates a 30-day redirect. Login preferences correctly handle Google connect/disconnect and add-password flows. Contacts auto-save toggle persists. Cookie preferences save to localStorage. Account deletion works.

---

### Phase 6 — Event Type Builder
**Builds:** Full event type creation and management
**Reference:** [features/event-types.md](./features/event-types.md), [development-plan.md § Phase 6](./development-plan.md)

**Build order:**
1. Event types list page (`/event-types`)
2. Event type builder — 4 tabs: What / Where / When / Options
3. Location type selector (Zoom, Google Meet, Teams, Phone, In-Person, Custom)
4. Phone direction option (host calls invitee / invitee calls host)
5. Multi-duration toggle
6. Duplicate, hide, delete actions
7. Copy booking link button

**Done when:** Event types can be created, edited, duplicated, hidden. Each generates a correct URL at `/{username}/{slug}`.

---

### Phase 7 — Availability Management
**Builds:** Weekly hours, buffers, booking windows, date overrides
**Reference:** [features/availability-management.md](./features/availability-management.md), [development-plan.md § Phase 7](./development-plan.md)

**Build order:**
1. Weekly availability grid (toggle days, set start/end time)
2. Multiple time blocks per day
3. Buffer before/after meeting
4. Minimum notice period
5. Booking window (rolling vs fixed)
6. Daily meeting limit
7. Date overrides — block dates, custom hours, bulk vacation block

**Done when:** Availability rules save and the booking page reflects them accurately.

---

### Phase 8 — Calendar Integrations
**Builds:** Google Calendar (P0 — launch blocker), Outlook (P1 — sprint 2)
**Reference:** [features/calendar-integrations.md](./features/calendar-integrations.md), [development-plan.md § Phase 8](./development-plan.md)

**Build order (P0 first, P1 after P0 is stable):**
1. Google Calendar OAuth connect + callback
2. Calendar list fetch — user picks conflict-check calendars + write-target
3. Free/busy read via `calendar.freebusy.query`
4. Write booking via `calendar.events.insert`
5. Token refresh logic (silent — never shown to invitee)
6. Token expiry detection → disconnect → alert email to host
7. `CALENDAR_SYNC` cron job (pg-boss, every 5 min)
8. — P1 — Outlook/Office 365 OAuth + same flow as Google

**Apple CalDAV = Phase 2.** Do not build at launch.

**Done when (P0):** Google Calendar connects, reads free/busy, writes bookings, refreshes tokens silently, sends alert on expiry. **Done when (P1):** Outlook mirrors Google behavior.

---

### Phase 9 — Timezone Management
**Builds:** DST-safe slot generation, dual-timezone display everywhere
**Reference:** [features/timezone-management.md](./features/timezone-management.md), [development-plan.md § Phase 9](./development-plan.md)

**Build order:**
1. Slot generation — local-time-first approach (NOT UTC-range-first — breaks on DST days)
2. Invitee timezone auto-detect via `Intl.DateTimeFormat().resolvedOptions().timeZone`
3. Manual timezone override on booking page
4. Confirmation screen — show invitee time + host time (both timezones)
5. Email templates — invitee email shows "Your time" + "Host's time"; host email shows same

**Key rule:** Generate slots as local-time increments first, then convert each to UTC via `date-fns-tz.zonedTimeToUtc()`. Never convert the availability window to a UTC range first.

**Done when:** Host in EST / invitee in IST sees correct times on booking page, confirmation, and all emails. DST transitions don't cause 1-hour errors.

---

### Phase 10 — Public Booking Page
**Builds:** Publicly accessible booking page at `/{username}/{eventSlug}`
**Reference:** [features/booking-page-customization.md](./features/booking-page-customization.md), [development-plan.md § Phase 10](./development-plan.md)

**Build order:**
1. Profile overview page `/{username}` — host info + event type cards
2. Booking page `/{username}/{eventSlug}` — date picker + slot grid + timezone selector
3. Multi-duration picker step (if event type has multiple durations — must be shown before calendar)
4. Host branding: profile photo, brand color, welcome message
5. "No slots available" state
6. ISR on-demand revalidation (`revalidatePath`) when host changes branding or availability

**Done when:** Booking page is publicly accessible, shows correct available slots, is mobile-responsive.

---

### Phase 11 — Booking Engine
**Builds:** The core slot-claiming processor with race condition protection
**Reference:** [features/booking-engine.md](./features/booking-engine.md), [development-plan.md § Phase 11](./development-plan.md)

**Build order:**
1. `POST /api/bookings` — Zod validation
2. PostgreSQL advisory lock (`pg_advisory_xact_lock(hostUserId + startTime)`)
3. Final slot availability check inside transaction
4. Insert `bookings` row
5. Enqueue post-booking pg-boss jobs: `VIDEO_LINK_GENERATE`, `CALENDAR_WRITE`, `EMAIL_SEND` ×2, `BOOKING_REMINDER_24H`, `BOOKING_REMINDER_1H`
6. pg-boss worker handlers for all 5 job types
7. Error handling: slot-taken → suggest alternatives; video failure → retry 3×; calendar failure → retry 3×

**Done when:** Two concurrent requests for the same slot cannot both succeed. Post-booking jobs run async without blocking the API response.

---

### Phase 12 — Custom Questions
**Builds:** Custom intake form questions on booking forms
**Reference:** [features/custom-questions.md](./features/custom-questions.md), [development-plan.md § Phase 12](./development-plan.md)

**Build order:**
1. Questions tab in event type builder (add, edit, reorder, delete)
2. 5 MVP question types: short text, long text, phone, single select, dropdown
3. Questions rendered on booking form (after name + email fields)
4. Answers saved to `booking_answers` on booking creation
5. Answers shown in host notification email and dashboard booking detail
6. Auto-remember: on email blur, query previous answers from same host + invitee email, pre-fill form

**Phase 2 types (do NOT build now):** multi-select, number, date picker, URL.

**Done when:** Hosts add questions. Invitees answer them. Answers appear in the host's email and dashboard. Repeat invitees see pre-filled answers.

---

### Phase 13 — Video Conferencing
**Builds:** Automatic unique video link per booking
**Reference:** [features/video-conferencing.md](./features/video-conferencing.md), [development-plan.md § Phase 13](./development-plan.md)

**Build order:**
1. Google Meet — generated via `conferenceData` in `CALENDAR_WRITE` job (no extra OAuth — uses Phase 8)
2. Zoom — OAuth connect + callback, `VIDEO_LINK_GENERATE` handler, store host + invitee links
3. Token refresh for Zoom
4. Video link failure handling — retry 3× with exponential backoff (5s → 30s → 2min), host alert email on permanent failure
5. Event type builder — show only connected video platforms in location selector

**Teams = Phase 2.** Do not build at launch.

**Done when:** Google Meet links generate automatically. Zoom creates unique meeting per booking. All failures retry and notify host if permanent.

---

### Phase 14 — Booking Confirmation
**Builds:** Confirmation screen + confirmation emails + ICS calendar invites
**Reference:** [features/booking-confirmation.md](./features/booking-confirmation.md), [development-plan.md § Phase 14](./development-plan.md)

**Build order:**
1. Confirmation screen (client-side transition after `POST /api/bookings` succeeds)
   - Both timezones shown: "Your time: 3:00 PM IST" + "Host's time: 10:00 AM EST"
   - Add to Calendar buttons (Google, iCal, Outlook)
   - Reschedule + Cancel links
2. Confirmation email to invitee (React Email → Nodemailer) with ICS attachment
3. Notification email to host with all form answers
4. ICS file generation via `ical-generator` with correct `TZID` metadata

**Done when:** Invitee sees confirmation instantly. Both parties receive emails with correct times. ICS file opens correctly in Google Calendar, Outlook, and Apple Calendar.

---

### Phase 15 — Notifications & Reminders
**Builds:** All automated email reminders + email queue architecture
**Reference:** [features/notifications-reminders.md](./features/notifications-reminders.md), [development-plan.md § Phase 15](./development-plan.md)

**Build order:**
1. `BOOKING_REMINDER_24H` and `BOOKING_REMINDER_1H` pg-boss worker handlers
   - Guard: `booking.status !== 'confirmed'` → skip (don't send reminder for cancelled bookings)
   - Both timezones in reminder body
2. On booking cancelled → cancel all pending reminder jobs by `singletonKey`
3. On booking rescheduled → cancel old jobs, schedule new jobs with new times
4. All remaining email templates (cancellation, reschedule, host-cancels-invitee)
5. Cleanup cron jobs: `EMAIL_OUTBOX_REAP` (daily 03:00 UTC), `EMAIL_EVENTS_PRUNE` (daily 03:30 UTC)
6. Host notification preferences — from name + reply-to email

**Done when:** Reminder jobs fire at 24h and 1h before every confirmed booking. Reminders are cancelled when booking is cancelled or rescheduled. All 9 email types send correctly with dual-timezone content.

---

### Phase 16 — Meetings Dashboard
**Builds:** Host's central view of all their bookings
**Reference:** [features/meetings-dashboard.md](./features/meetings-dashboard.md), [development-plan.md § Phase 16](./development-plan.md)

**Build order:**
1. `/dashboard` — Today's meetings section (highlighted, countdown, one-click join 15 min before)
2. Upcoming meetings list (sorted by date, grouped by day)
3. Past meetings tab
4. Booking detail slide-in panel (full details, form answers, private notes, cancel button)
5. Search by invitee name
6. Filter by event type, status, date range
7. Stats bar (today's count + upcoming total)
8. Empty states for each tab

**Done when:** Dashboard shows all meetings. Today's section highlighted. Search and filters work. Notes save. Join button activates 15 min before meetings.

---

### Phase 17 — Cancellation & Reschedule
**Builds:** Cancel and reschedule flows for both invitees (via email link) and hosts (via dashboard)
**Reference:** [features/booking-flow.md](./features/booking-flow.md), [development-plan.md § Phase 17](./development-plan.md)

**Build order:**
1. Cancel page at `/cancel/[token]` — validate token, show meeting details, reason input
2. `POST /cancel/[token]` — re-validate `startTime > NOW()` before writing (prevents race condition)
3. Cancellation policy enforcement — if within locked window: show "Cancellation Blocked" page
4. Reschedule page at `/reschedule/[token]` — show full booking calendar with original time at top
5. `POST /reschedule/[token]` — cancel old booking, create new, cancel old jobs, schedule new jobs
6. Host cancel from dashboard — same flow + notification email to invitee
7. Cancellation + reschedule emails to both parties (via `EMAIL_SEND` jobs)

**Done when:** Invitees can cancel and reschedule via email links. Hosts can cancel from dashboard. Policy enforcement blocks cancellations within the locked window. Calendar events removed on cancel.

---

### Phase 18 — Open Source Configuration
**Builds:** Confirms no billing/plan enforcement exists anywhere in the codebase
**Reference:** [development-plan.md § Phase 18](./development-plan.md)

**Tasks:**
- Verify no plan check, feature gate, or upgrade prompt exists in any route or component
- Confirm all features (unlimited event types, unlimited questions, unlimited overrides) work without any limit check
- No `/pricing` page, no billing database tables

**Done when:** All features work for all users with no restrictions.

---

### Phase 19 — Admin Panel
**Builds:** Internal admin dashboard at `/admin`
**Reference:** [features/admin-panel.md](./features/admin-panel.md), [development-plan.md § Phase 19](./development-plan.md)

**Build order:**
1. Admin route protection — `role = 'admin'` check in middleware + all `/api/admin/*` routes
2. Admin layout — sidebar (Dashboard, Audit Log, Users, Jobs, Settings)
3. `/admin` dashboard — 3 stats cards (total users, active bookings, failed jobs)
4. `/admin/users` — paginated user list with search
5. `/admin/users/[id]` — user detail (profile, sessions, email history, ban/unban, impersonate, revoke sessions, send password reset)
6. `/admin/audit-log` — searchable audit log table with row detail
7. `/admin/jobs` — read-only job queue view from `pgboss.job`
8. `/admin/settings` — 4-field platform settings form (signups toggle, email sender name, booking limit, maintenance message)

**Done when:** Admin can search users, ban/unban, impersonate, view audit log, monitor job queue, and change platform settings.

---

### Phase 20 — QA & Launch Prep
**Builds:** Nothing new — tests, fixes, and final checklist
**Reference:** [development-plan.md § Phase 20](./development-plan.md)

**Test sequences (manual):**
1. Full host journey: sign up → onboard → create event type → share link
2. Full invitee journey: open link → pick slot → fill form → book → receive email
3. 24h and 1h reminder emails fire at correct times
4. Cancel via email link → calendar event removed → email sent
5. Reschedule via email link → new booking → old jobs cancelled → new jobs scheduled
6. Double-booking: same slot in two tabs simultaneously → only one succeeds
7. Timezone check: host EST / invitee IST → all emails and screens show both times correctly
8. Token refresh: let OAuth token expire → Schduled refreshes silently

**Pre-launch checklist:**
- [ ] `/privacy`, `/terms`, `/cookies` pages live with real content
- [ ] SMTP configured with SPF, DKIM, DMARC
- [ ] Google OAuth consent screen published (not "Testing" mode)
- [ ] Microsoft Graph API app in production
- [ ] Zoom Marketplace app published (not development mode)
- [ ] All env vars set in production
- [ ] pg-boss workers start on server boot
- [ ] S3 bucket not publicly accessible — all via presigned URLs
- [ ] Rate limiting on `POST /api/bookings`
- [ ] Database indexes on `bookings.hostUserId`, `bookings.startTime`, `bookings.status`
- [ ] Lighthouse score 90+ on booking page
- [ ] Mobile test on iPhone SE and Galaxy S21
- [ ] First platform admin account created

**Done when:** All manual tests pass, all checklist items complete, first real booking can be made end-to-end.

---

## Summary — Complete Build Order

```
Pre-Dev    →  External accounts, Zoom submission (Day 1!), env vars, packages
Phase 0    →  Project setup — Next.js + tools configured
Phase 1    →  Database — all 29 tables created
Phase 2    →  Landing page — 4 sections + legal pages
Phase 3    →  Authentication — sign up / sign in / OAuth / reset password
Phase 4    →  Onboarding — 5-step wizard for new users
Phase 5    →  Profile & Settings — all host settings
Phase 6    →  Event Type Builder — create and manage event types
Phase 7    →  Availability — weekly hours, buffers, date overrides
Phase 8    →  Calendar Integrations — Google (P0), Outlook (P1)
Phase 9    →  Timezone — DST-safe slots, dual-timezone display
Phase 10   →  Public Booking Page — the invitee-facing page
Phase 11   →  Booking Engine — slot locking, jobs, race condition protection
Phase 12   →  Custom Questions — intake form on booking forms
Phase 13   →  Video Conferencing — Zoom + Google Meet
Phase 14   →  Booking Confirmation — screen + emails + ICS
Phase 15   →  Reminders — 24h/1h jobs, all email types
Phase 16   →  Meetings Dashboard — host's booking management
Phase 17   →  Cancel & Reschedule — invitee + host flows
Phase 18   →  Open Source check — confirm no plan gates exist
Phase 19   →  Admin Panel — user management, audit log, jobs, settings
Phase 20   →  QA & Launch — test everything, complete checklist, go live
```

**Total phases: 21 (Phase 0–20)**
**Planning docs: 24 files (8 root + 16 features) — all complete**
