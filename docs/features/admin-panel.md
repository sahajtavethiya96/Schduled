# Admin Panel

The Admin Panel is a password-protected internal dashboard for platform administrators (not regular hosts). It provides visibility and control over users, background jobs, audit history, and platform configuration without touching the database directly.

---

## Overview

The admin panel sits at `/admin` and is completely separate from the host dashboard (`/dashboard`). Only users with `role = 'admin'` can access it.

**What MVP must do:**
1. Let admins look up any user by email and ban/unban their account
2. Impersonate a user to debug their reported issue
3. Show a health check — total users, active bookings, failed job count
4. Show a platform-wide audit log of all mutations
5. Show a read-only job queue view (state, counts, failed job details)
6. Provide minimal platform settings (toggle signups, set email sender name, booking limit, maintenance message)

**Post-MVP:**
- Booking oversight screen (platform-wide booking list)
- Email template preview + test send
- Sign-up trend charts
- Job retry/cancel from UI
- Admin alerts when job queue depth spikes

---

## User Stories

**Platform Admin**
- As an admin, I want to search and view any user's account, so that I can assist with support requests. *(MVP)*
- As an admin, I want to ban and unban a user account, so that I can handle abuse. *(MVP)*
- As an admin, I want to impersonate a user, so that I can reproduce and debug their reported issue. *(MVP)*
- As an admin, I want to see a dashboard with key platform metrics at a glance. *(MVP — 3 stats only; charts Phase 2)*
- As an admin, I want to view a platform-wide audit log of all mutations. *(MVP)*
- As an admin, I want to see all background jobs (pending, running, failed) via the UI. *(MVP — read-only; retry/cancel Post-MVP — Phase 2)*
- As an admin, I want to configure platform-level settings from the admin panel without re-deploying. *(MVP — minimal settings only)*

---

## Access Control

Only users with `role = 'admin'` (set via Better Auth Admin Plugin or directly in the database) can access the admin panel. The first admin is set manually in the database.

`src/middleware.ts` checks every `/admin/*` request: no session → redirect to sign-in; session with non-admin role → redirect to dashboard; admin role → allow. Every `/api/admin/*` route also verifies the role server-side and returns 403 for non-admins — the middleware check is defense-in-depth.

The Better Auth Admin Plugin provides the server-side functions used by all admin actions: `listUsers`, `getUser`, `banUser`, `unbanUser`, `impersonateUser`, `listUserSessions`, `revokeUserSessions`. Admin actions use this API — no raw SQL needed.

All `/api/admin/*` mutation routes apply in-process rate limiting of 10 requests per 60-second window per IP to prevent abuse.

---

## Screens & Features

### 1. Admin Dashboard — `/admin`

Three stat cards showing platform health:

| Stat | Source |
|------|--------|
| Total users | COUNT from users table |
| Active bookings | Confirmed bookings with future start time |
| Failed jobs (last 24h) | Failed rows from pgboss.job table |

Three numbers is all that's needed at launch to confirm the platform is alive and the job queue is clean. Charts and recent activity lists ship in Phase 2.

**Post-MVP — Phase 2:** Sign-up chart (last 30 days, bar chart); recent activity feed (last 10 bookings, last 5 failed jobs).

---

### 2. Audit Log — `/admin/audit-log`

A searchable, filterable table of every significant mutation on the platform. Every write operation in the app records a row in the `audit_logs` table automatically.

**Table columns:** Actor (admin or user), Action, Target, Details (JSON summary), IP Address, Timestamp

**Filters:** action type, actor type (admin/user), date range

**Search:** by actor email or target entity ID

**Pagination:** 50 rows per page, newest first

**Detail view:** click any row to see full JSON payload with before/after values for updates.

**Logged Actions (MVP):**

| Action | Trigger |
|--------|---------|
| `user.signup` | New account created |
| `user.signin` | Successful sign-in |
| `user.signout` | Session terminated |
| `user.ban` | Admin banned a user |
| `user.unban` | Admin unbanned a user |
| `user.impersonate_start` | Admin started impersonating |
| `user.impersonate_stop` | Admin stopped impersonating |
| `user.password_reset` | Password reset completed |
| `user.revoke_sessions` | All sessions revoked |
| `user.profile_updated` | Host changed name, job title, or company |
| `user.timezone_changed` | Host updated timezone |
| `user.username_changed` | Host changed booking URL slug |
| `user.photo_updated` | Host uploaded or removed profile photo |
| `user.password_changed` | Password changed from settings |
| `user.password_added` | Password added to an OAuth-only account |
| `user.oauth_connected` | Google OAuth connected to existing account |
| `user.oauth_disconnected` | Google OAuth disconnected from account |
| `user.email_change_requested` | New email submitted; verification pending |
| `user.contacts_settings_updated` | Auto-save toggle or domain exclusion list changed |
| `user.cookie_preferences_updated` | Cookie consent preferences changed from settings |
| `user.account_deleted` | Account deletion confirmed |
| `user.branding_updated` | Host changed logo, color, or confirmation message |
| `booking.created` | New booking confirmed |
| `booking.cancelled_by_invitee` | Invitee cancelled via email link |
| `booking.cancelled_by_host` | Host cancelled from dashboard |
| `booking.rescheduled` | Booking rescheduled |
| `event_type.created` | Host created event type |
| `event_type.updated` | Host saved changes to event type |
| `event_type.deleted` | Host deleted event type |
| `event_type.activated` | Host toggled event type to Active |
| `event_type.deactivated` | Host toggled event type to Inactive |
| `availability.schedule_updated` | Host saved weekly hours or schedule name |
| `availability.override_added` | Host blocked a date or overrode hours |
| `availability.override_removed` | Host removed a date override |
| `availability.schedule_assigned` | Different schedule assigned to event type |
| `calendar.connected` | Calendar OAuth connected |
| `calendar.disconnected` | Calendar disconnected (manual or token failure) |
| `platform_settings.updated` | Admin changed platform settings |

---

### 3. User Management — `/admin/users`

**User list:**
- Paginated table (25 per page)
- Columns: Name, Email, Created At, Status (Active / Banned), Bookings Count
- Search by name or email; filter by All / Active / Banned

**User detail — `/admin/users/[id]`:**

| Section | Content | Scope |
|---------|---------|-------|
| Profile | Name, email, username, timezone, created date | *(MVP)* |
| Account | Status (active/banned), email verified | *(MVP)* |
| Sessions | Active sessions (device, IP, last active) — Revoke button per session | *(MVP)* |
| Bookings | Total bookings as host, last booking date | *(MVP — count only; full list Phase 2)* |
| Calendars | Connected calendars (provider, account email) | *(MVP)* |
| Email History | Last 10 emails sent to this user (type, status, sent at) from `email_outbox` | *(MVP)* |
| Actions | Ban / Unban, Revoke all sessions, Send password reset, Impersonate | *(MVP)* |

**Actions:**

| Action | Behavior |
|--------|----------|
| **Ban user** | Calls `auth.api.banUser()` — blocks sign-in; kills all existing sessions; writes audit log |
| **Unban user** | Calls `auth.api.unbanUser()` — restores access; writes audit log |
| **Impersonate** | Calls `auth.api.impersonateUser()` — opens app as that user; red "Impersonating [name]" banner shown; "Stop impersonating" returns to admin; start/stop both audit-logged; 1-hour session limit; admin-to-admin impersonation blocked |
| **Revoke all sessions** | Calls `auth.api.revokeUserSessions()` — logs user out everywhere; audit-logged |
| **Send password reset** | Enqueues `EMAIL_SEND` pg-boss job to deliver password reset email |

---

### 4. Job Queue Monitor — `/admin/jobs` *(MVP — read-only)*

Surfaces the pg-boss queue state in a minimal read-only table.

**Stats cards (top row):** Pending jobs, Active jobs, Failed jobs (last 24h) — all queried from `pgboss.job`.

**Job list table:**
- Columns: Job Name, State, Created At, Started At, Completed/Failed At, Retry Count
- Filters: State (All / Pending / Running / Failed), Date range
- Paginated: 25 per page

**Failed job detail (click any failed row):** Error message, original job payload (JSON), retry count and last attempted at.

At MVP scale, re-enqueueing a failed job via a one-off Node.js script is sufficient. Retry and cancel buttons ship in Phase 2.

**All Schduled job types visible in this screen:**

| Job Name | Trigger |
|----------|---------|
| `EMAIL_SEND` | Any transactional email |
| `EMAIL_OUTBOX_REAP` | Cron — daily |
| `BOOKING_REMINDER_24H` | On booking confirmed |
| `BOOKING_REMINDER_1H` | On booking confirmed |
| `BOOKING_CANCEL_REMINDERS` | On booking cancelled |
| `BOOKING_RESCHEDULE_REMINDERS` | On booking rescheduled |
| `VIDEO_LINK_GENERATE` | On booking confirmed |
| `CALENDAR_SYNC` | Cron — every 5 min per connected calendar |
| `CALENDAR_TOKEN_REFRESH` | Before any calendar API call when token is expired |
| `CALENDAR_DISCONNECT_ALERT` | When token refresh exhausts all retries |
| `CALENDAR_WRITE` | After booking confirmed |
| `CALENDAR_UPDATE` | After booking rescheduled |
| `CALENDAR_CANCEL` | After booking cancelled |
| `DISPOSABLE_EMAILS_REFRESH` | Cron — daily |

---

### 5. Platform Settings — `/admin/settings` *(MVP — minimal)*

Runtime-configurable settings stored in the `platform_settings` singleton table. Anything requiring a re-deploy stays in `.env`.

| Setting | Type | Default | Notes |
|---------|------|---------|-------|
| Allow new user signups | Toggle | On | When off, `/sign-up` shows "Signups are currently disabled" |
| Email sender name | Text | "Schduled" | Used as `from` name on all transactional emails |
| Max bookings per invitee per day | Number | 10 | Guards against booking spam |
| Platform maintenance message | Text | — | If set, shown as a banner on all pages |

Every settings change writes to `audit_logs` with the admin's user ID, old value, and new value.

`platform_settings` is read on every page load (booking pages, middleware, booking engine). To avoid a DB query on every request, the singleton row is cached in memory for 60 seconds via `DbSettings.get()`. After any admin save, the cache is invalidated immediately so the next request gets the fresh values.

**Post-MVP — Phase 2:** Email template preview (render React Email template with dummy data; send test to admin email).

---

### 6. Booking Oversight — `/admin/bookings` *(Post-MVP — Phase 2)*

Platform-wide booking list with invitee name, host, event type, status, date filters, and full booking detail view. Not needed before there are enough users to make oversight meaningful.

---

## UI Screens

| Screen | Route | Key Components | Scope |
|--------|-------|----------------|-------|
| Admin Dashboard | `/admin` | 3 stat cards | *(MVP)* |
| Audit Log | `/admin/audit-log` | Searchable + filterable table; row detail JSON view | *(MVP)* |
| User List | `/admin/users` | Searchable data table with status filter | *(MVP)* |
| User Detail | `/admin/users/[id]` | Profile, sessions, email history, ban/unban, impersonate | *(MVP)* |
| Job Queue | `/admin/jobs` | Read-only job table with state filter; failed job detail | *(MVP)* |
| Platform Settings | `/admin/settings` | 4-field config form | *(MVP)* |
| Booking List | `/admin/bookings` | Data table with status + date filters | *(Post-MVP — Phase 2)* |
| Booking Detail | `/admin/bookings/[id]` | Full booking record view | *(Post-MVP — Phase 2)* |

**Admin layout (MVP):** Sidebar with 5 entries — Dashboard, Audit Log, Users, Jobs, Settings. Top bar shows "Logged in as [admin name]" with a sign-out button.

---

## Data Model

The admin panel reads from existing tables and three tables added for admin visibility:

| Data | Source Table |
|------|-------------|
| Users | `users` (Better Auth) |
| Sessions | `sessions` (Better Auth) |
| Bookings | `bookings` (MVP: count only; full list Phase 2) |
| Background jobs | `pgboss.job` (read-only) |
| Audit events | `audit_logs` |
| Email history | `email_outbox` |
| Platform settings | `platform_settings` |

Full table schemas for `audit_logs` and `platform_settings` are defined in `database-schema.md`.

---

## MVP Scope

**In MVP:**
- Admin dashboard — 3 stats: total users, active bookings, failed job count
- Audit log viewer — searchable table of all platform mutations; click row for before/after JSON
- User list with search by name/email, ban/unban, impersonate
- User detail: profile, active sessions, email history, revoke sessions, send password reset
- Job queue — read-only table view with failed job detail *(retry/cancel Post-MVP — Phase 2)*
- Platform settings — 4 toggles/fields; in-memory cache with 60-second TTL

**Post-MVP:**
- Job retry/cancel from UI *(Phase 2)*
- Booking oversight screen — platform-wide booking list *(Phase 2)*
- Email template preview + test send *(Phase 2)*
- Sign-up trend charts *(Phase 2)*
- Admin email alerts when job queue depth spikes *(Phase 2)*

---

## Background Jobs

The admin panel does not enqueue jobs except for one: the "Send password reset" action in the user detail screen enqueues an `EMAIL_SEND` pg-boss job so delivery is async and retried on failure.

| Job Name | Trigger | Payload |
|----------|---------|---------|
| `EMAIL_SEND` | Admin clicks "Send password reset" | `{ emailOutboxId }` — insert row into `email_outbox` first, then enqueue |

---

## Tech Stack

- **Next.js App Router (Server Components)** — all admin pages are Server Components; data fetched via Drizzle ORM and Better Auth Admin Plugin on the server; no client-side data fetching for lists.
- **Better Auth Admin Plugin** — provides `listUsers`, `banUser`, `unbanUser`, `listUserSessions`, `revokeUserSessions`, `impersonateUser`; all admin user actions use this API.
- **Drizzle ORM** — queries `audit_logs`, `email_outbox`, `platform_settings`, and booking counts; `pgboss.job` queried via raw SQL since it lives in the `pgboss` schema; `platform_settings` always accessed via `DbSettings.get()` for the 60-second cache.
- **UI Kit** (`components/ui/`) — data tables, cards, badges, dialogs, and sidebar navigation.
- **PostgreSQL (pg-boss schema)** — `pgboss.job` table queried read-only for the job queue monitor.
- **`src/middleware.ts`** — admin route protection; redirects non-admins before any admin page renders.
