# User Profile & Settings

The User Profile & Settings page is where hosts manage their personal identity, preferences, and account configuration. It is the control center for everything that defines who the user is within Schduled — their name, photo, timezone, connected calendars, and security settings.

---

## Overview

After onboarding, users need a persistent place to manage all aspects of their account. The settings area is accessed from the top-right user menu.

### User Menu (top-right dropdown)

| Item | Action |
|------|--------|
| **[User name + email]** | Display only — not clickable |
| Profile | Opens Profile settings tab |
| Branding | Opens [booking-page-customization.md](booking-page-customization.md) settings |
| My Link | Opens My Link settings — booking URL, QR code, change username |
| All settings | Opens full settings page |
| Sign out | Ends session |

### Settings Sidebar Navigation

The settings page (`/dashboard/settings`) has a persistent left sidebar with these sections:

| Section | Route | What it covers |
|---------|-------|----------------|
| **Profile** | `/dashboard/settings/profile` | Name, photo, job title, company, bio |
| **Branding** | `/dashboard/settings/branding` | Logo, brand color, confirmation message |
| **My Link** | `/dashboard/settings/my-link` | Booking URL slug |
| **Communication** | `/dashboard/settings/communication` | Email notification preferences |
| **Login preferences** | `/dashboard/settings/login` | Connected auth methods, OAuth providers |
| **Contacts settings** | `/dashboard/settings/contacts` | Auto-save invitees as contacts; domain exclusions |
| **Security** | `/dashboard/settings/security` | Password change, 2FA, active sessions |
| **Cookie settings** | `/dashboard/settings/cookies` | Cookie consent preferences |
| **Danger Zone** | Bottom of Security page | Account deletion, data export |

---

## User Stories

**Host**
- As a host, I want to update my profile photo and display name, so that my booking page always shows accurate and professional information. *(MVP)*
- As a host, I want to change my timezone from settings, so that if I move or travel long-term my availability reflects the correct local time. *(MVP)*
- As a host, I want to manage connected calendars from settings, so that I can add or remove calendars without going through onboarding again. *(MVP)*
- As a host, I want to control which email notifications I receive, so that I am not overwhelmed by emails I do not need. *(MVP)*
- As a host, I want to enable two-factor authentication, so that my account is protected against unauthorized access. *(Post-MVP — Phase 2)*
- As a host, I want to change my password from the settings page, so that I can keep my account secure. *(MVP)*
- As a host, I want to see which login methods (Google, email/password, magic link) are connected to my account, so that I know how I can sign in. *(MVP)*
- As a host, I want invitees who book with me to be automatically saved as contacts, so that I can see a record of everyone who has scheduled with me. *(MVP)*
- As a host, I want to exclude certain email domains from auto-contact creation, so that internal test bookings and competitor accounts are not added to my contacts. *(MVP)*
- As a host, I want to manage my cookie preferences, so that I am in control of what data is stored in my browser. *(MVP)*
- As a host, I want to delete my account and all associated data, so that I can leave Schduled and ensure my information is fully removed. *(MVP)*

---

## Profile Section

The personal identity that represents the host on all booking pages and emails.

### Fields

| Field | Required | Description |
|-------|----------|-------------|
| Full Name | Yes | Displayed on booking page and in confirmation emails |
| Display Name | No | Shorter name shown instead of full name (e.g., "Jake" instead of "Jakesh Dholakia") |
| Profile Photo | No | Circular avatar on booking page and emails |
| Job Title / Role | No | Shown under name on booking page (e.g., "Senior Account Executive") |
| Company / Organization | No | Company name shown on booking page |
| Bio | No | Short description (up to 200 characters) shown on booking page *(Post-MVP — Phase 2)* |
| Website URL | No | Linked from booking page *(Post-MVP — Phase 2)* |

### Profile Photo Upload
- Accepted formats: JPG, PNG, WebP
- Maximum file size: 5MB
- Recommended size: 400×400px (square)
- Auto-cropped to circle for display
- Cropping tool available in upload flow (drag to position)
- Remove photo option (reverts to initials avatar)

### Booking Page Preview
- Live preview of booking page shown on right side as user edits profile
- Changes reflect in preview instantly before saving
- "View your booking page" link to open public page in new tab

---

## Timezone Settings

Controls the timezone used for all of the user's availability and scheduling.

### Timezone Field
- Searchable dropdown: type city name or UTC offset
- Shows current time in selected timezone as preview: "Currently 3:45 PM in your timezone"
- Full IANA timezone database (600+ timezones)
- Common timezones grouped at top for quick access

### Change Timezone Warning
When user changes their timezone after having existing availability configured:

> ⚠️ "Changing your timezone will affect how your availability is shown to invitees. Your schedule (e.g., Mon–Fri 9am–5pm) will now be interpreted in the new timezone. Existing confirmed bookings will not change."

User must confirm before saving.

### Auto-Detect Option
- "Use my browser's timezone" button
- Re-detects and pre-fills the field
- Useful if user moved and needs to update

---

## Connected Calendars

Manage which calendars are connected for availability syncing and booking writes.

### Connected Calendar List
Shows all currently connected calendars with:
- Calendar provider icon (Google, Outlook, Apple)
- Account email address
- Calendars being checked for conflicts (toggles per calendar)
- Calendar where new bookings are added (radio selection)
- Last synced timestamp
- Reconnect button (if disconnected)
- Disconnect button

### Add New Calendar
- "+ Connect Calendar" button
- Opens provider selection: Google Calendar | Outlook | Apple Calendar *(Post-MVP — Phase 2)* | CalDAV *(Post-MVP — Phase 2)*
- OAuth flow for Google/Outlook; app password for Apple
- After connecting: select which calendars to check + which to write bookings to

### Calendar Sync Status
Each connected calendar shows a sync status indicator:

| Status | Meaning |
|--------|---------|
| 🟢 Synced | Connected and syncing normally |
| 🟡 Syncing | Currently updating |
| 🔴 Disconnected | Token expired or revoked — action required |
| ⚠️ Partial | Connected but some calendars inaccessible |

### Conflict Detection Settings
Per connected calendar:
- **Check for conflicts**: Toggle on/off per calendar
  - On: Busy events on this calendar block Schduled availability
  - Off: Calendar is ignored for availability (still connected)
- Use case: Connect personal calendar to prevent booking conflicts without showing personal event names

### Add Bookings To
- Single radio selection across all connected calendars
- "Add new bookings to: [selected calendar]"
- Example: Connect work Google Calendar + personal iCloud; add bookings to work Google only

---

## Communication Settings

Control which email notifications the host receives.

### Notification Toggles

| Notification | Default | Description |
|-------------|---------|-------------|
| New booking confirmation | On | Email when someone books a meeting |
| Cancellation notification | On | Email when invitee cancels |
| Reschedule notification | On | Email when invitee reschedules |
| Daily digest | Off | Morning email with today's meeting summary |
| Weekly summary | Off | Monday email with past week's meeting stats |
| Product updates | Off | Schduled feature announcements |

### Notification Delivery Channel
- Email (always available)
- Browser push notifications (opt-in via browser permission)
- Mobile push notifications (after mobile app install)

### Email Notification Format
- Choose between: Detailed (full invitee info) or Summary (compact)
- Language: follows account language setting (future feature)

---

## Account Settings

General account configuration.

### Email Address
- Shows current login email
- "Change email" button → requires current password + email verification on new address
- New email must be verified before it becomes active

### Password
- "Change password" button
- Requires: current password, new password, confirm new password
- Password requirements: 8+ chars, 1 uppercase, 1 number

### Two-Factor Authentication (2FA) *(Post-MVP — Phase 2)*
- Enable / disable 2FA
- Methods: Authenticator app (TOTP — Google Authenticator, Authy) or SMS
- Setup flow: scan QR code with authenticator app → enter 6-digit code to verify
- Backup codes: download 8 one-time backup codes on setup

### Login Sessions *(Post-MVP — Phase 2)*
- List of active sessions: device type, browser, IP address, last active
- "Sign out" individual sessions
- "Sign out all other devices" button

---

## Login Preferences

Shows the host which authentication methods are connected to their account, and lets them manage those connections.

### Connected Login Methods

A list of all authentication methods currently active on the account:

| Method | Status | Action |
|--------|--------|--------|
| **Email + Password** | Connected / Not set | Change password / Add password |
| **Google OAuth** | Connected / Not connected | Disconnect / Connect |
| **Magic Link** | Always available if email is verified | — |

**Rules:**
- At least one login method must remain active at all times — a user cannot disconnect Google if they have no password set
- If the user signed up with Google and has no password: a "Set a password" prompt appears before they can disconnect Google
- "Disconnect Google" removes the OAuth token from the `accounts` table (Better Auth) — the user can still sign in via email/password or magic link if those exist

### Auth Method Details

**Email + Password:**
- Shows the connected email address
- "Change email" link → email change flow (verify new address before switching)
- "Change password" link → password change form (requires current password)
- If no password is set (OAuth-only signup): shows "Add a password to your account" button

**Google:**
- Shows the connected Google account email
- "Connected as [google_email]" status
- "Disconnect Google" button — only shown if a password or other method exists
- "Connect Google" button — shown if not yet connected

**Magic Link:**
- Always available to any user with a verified email address
- Requires no setup — users can always request a magic link from the sign-in page
- Note shown: "Magic link sign-in is always available — no setup required"

---

## Contacts Settings

When an invitee books a meeting with the host, Schduled can automatically save their information as a contact. This gives the host a running list of everyone who has ever scheduled with them.

### Auto-Save Invitees as Contacts

**Toggle: "Automatically save new contacts when someone books with me"**
- **Default: On**
- When enabled: each booking creates or updates a contact record with the invitee's name, email, and phone (if collected via booking form)
- When disabled: bookings are still recorded but no contact entry is created

**What counts as a contact:**
- Unique by email address — if the same invitee books multiple times, their contact record is updated (not duplicated)
- Name and phone updated on each new booking if different from last booking
- Contact creation is instant — happens inside the same DB transaction as the booking

### Contact Record Fields

| Field | Source |
|-------|--------|
| Name | Invitee name from booking form |
| Email | Invitee email from booking form |
| Phone | Phone number (if collected via custom question or phone location type) |
| First booked | Timestamp of first booking |
| Last booked | Timestamp of most recent booking |
| Total bookings | Count of all bookings with this host |

### Exclude Domains and Email Addresses

Hosts can block specific email addresses or entire domains from being auto-saved as contacts.

**Input field:** "Add domains or email addresses to exclude, separated by commas or spaces"

**Examples:**
- `test@example.com` — exclude one specific address
- `competitor.com` — exclude all emails from this domain
- `internal.company.com` — exclude internal team test bookings

**Behavior when excluded:**
- The booking still proceeds normally — the invitee is not blocked from booking
- No contact record is created for excluded addresses
- Existing contacts from an excluded domain are not deleted — only new bookings from that point onward are skipped

**Common use cases:**
- Exclude your own domain so internal test bookings don't pollute the contacts list
- Exclude competitor domains
- Exclude personal/test email addresses used during development

### Contacts List *(Post-MVP — Phase 2)*

A dedicated contacts view at `/dashboard/contacts` showing all saved invitees:
- Name, email, phone, first booked date, last booked date, total booking count
- Search by name or email
- Click a contact → view all bookings with that invitee
- Export contacts as CSV *(Post-MVP — Phase 2)*

> **Why contacts view is Phase 2:** At MVP, booking history per invitee is accessible via the bookings dashboard by filtering by invitee email. A dedicated contacts list requires a separate page, search/filter UI, and pagination — meaningful extra work for a feature most solo hosts don't need at launch. The contact records are created at MVP; the management UI ships in Phase 2.

---

## Cookie Settings

Hosts can manage their cookie preferences from their account settings. This fulfills the GDPR/ePrivacy requirement to give users granular control over non-essential cookies.

### Cookie Categories

| Category | Default | Description |
|----------|---------|-------------|
| **Necessary** | Always on (cannot disable) | Session cookies, CSRF tokens, authentication — required for the app to work |
| **Analytics** | Off | Usage tracking (if analytics configured by the self-hosted operator) |
| **Marketing** | Off | Any ad-pixel or retargeting cookies |

### Settings Behavior

- Preferences stored in `localStorage` under a `cookie-consent` key (same as the cookie banner consent)
- Changing a preference here has the same effect as interacting with the cookie banner
- "Necessary" cookies cannot be turned off — the toggle is shown as disabled with an explanation
- Changes take effect immediately — no page reload required
- A "Reset to defaults" button restores Analytics and Marketing to Off

### Relationship to Cookie Banner

The cookie banner (shown on first visit) and this settings page both read/write the same `cookie-consent` key. If a user accepted all cookies via the banner, this page reflects that. If they update their preferences here, the banner does not re-appear.

---

## My Link

The My Link page (`/dashboard/settings/my-link`) is the central place where a host views, copies, shares, and customises their personal booking URL. It is the single most-shared page in the product — hosts copy this link into email signatures, social profiles, and websites.

---

### Your Booking URL

The full booking URL is displayed prominently at the top of the page:

`schduled.com/[username]`

**Actions available on the URL display:**

| Action | Behaviour |
|--------|-----------|
| **Copy link** | Copies the full URL to clipboard; button label changes to "Copied!" for 2 seconds |
| **Open** | Opens the booking page in a new tab so the host can preview exactly what invitees see |
| **Share via email** | Opens the device's default email client with the URL pre-filled in the body |

---

### QR Code

A QR code is generated for the booking URL and displayed below the link display.

- QR code renders on the client using the booking URL as input
- **Download QR code** button — saves as a PNG file named `schduled-[username]-qr.png`
- Useful for business cards, printed materials, and in-person events
- QR code updates automatically if the username is changed

**Post-MVP — Phase 2:** Custom QR code colours (use host's brand colour from booking page customisation).

---

### Change Username

The username is the slug at the end of the booking URL. It is set once during onboarding and can be changed here at any time.

**Field behaviour:**
- Current username shown as read-only display above the input
- Input field with real-time availability check as the user types (debounced 400ms)
- Availability states: "Checking…" → "✓ Available" (teal) or "✗ Already taken" (red)
- Validation rules: 3–30 characters, letters, numbers, and hyphens only; no spaces; no leading or trailing hyphens
- Save button disabled until a valid, available username is entered that differs from the current one

**On save:**
- Username updated in the `users` table
- Old username written to `username_redirects` table with a 30-day expiry
- Audit log entry written: `user.username_changed` with `{ oldUsername, newUsername, redirectCreated: true }`

**Redirect behaviour:**
- Requests to `schduled.com/[oldUsername]/*` are redirected (HTTP 301) to `schduled.com/[newUsername]/*` for 30 days
- Warning shown before save: "Changing your username will break any links you have already shared. A redirect from your old URL will stay active for 30 days."
- After the 30-day window the old slug is freed and can be claimed by another user

---

## Appearance / Display Preferences

Personal preferences for the Schduled dashboard interface.

### Theme
- Light mode (default)
- Dark mode
- System (follows OS setting)

### Date Format
- MM/DD/YYYY (US format)
- DD/MM/YYYY (UK/EU/IN format)
- YYYY-MM-DD (ISO format)

### Time Format
- 12-hour (3:30 PM)
- 24-hour (15:30)
- Auto (based on browser locale)

## Appearance / Display Preferences

Personal preferences for the Schduled dashboard interface.

### Theme
- Light mode (default)
- Dark mode
- System (follows OS setting)

### Date Format
- MM/DD/YYYY (US format)
- DD/MM/YYYY (UK/EU/IN format)
- YYYY-MM-DD (ISO format)

### Time Format
- 12-hour (3:30 PM)
- 24-hour (15:30)
- Auto (based on browser locale)

### Language
- English (default for MVP)
- Other languages: post-MVP
- Affects dashboard UI text, not booking page (booking page language is separate)

---

## Danger Zone

Irreversible account actions, separated and clearly marked.

### Delete Account
- "Delete my account" button in red-bordered section
- Confirmation: type "DELETE" to confirm
- What happens:
  - All event types deactivated immediately
  - Existing confirmed bookings: invitees receive cancellation emails
  - Account data deleted within 30 days
  - Users who want a copy of their data before deletion can email support — manual export at MVP scale

### Data Export (GDPR) *(Post-MVP — Phase 2)*

> **MVP decision:** At launch scale (hundreds of users), manual data exports on support request are fully acceptable and legally compliant. The self-serve ZIP export feature (pg-boss job, S3 upload, secure expiring download link, export logic) is meaningful engineering work with near-zero user demand at MVP scale. Calendly itself offers no self-serve export. Build this in Phase 2 when user base justifies it.

**What will be exported (Phase 2):**

| Category | Data Included |
|----------|--------------|
| Profile | Name, email, username, bio, job title, timezone, profile photo |
| Event Types | All event type configurations (name, duration, location, questions, availability rules) |
| Bookings | Full booking history — invitee name, email, time, status, answers, cancellation reason |
| Notifications | Notification preference settings |
| Connected Calendars | Calendar provider names and account emails (tokens are NOT exported) |

**Format (Phase 2):** ZIP file containing JSON files per category (machine-readable) plus a `README.txt` explaining the structure.

**Delivery (Phase 2):** Triggered asynchronously via pg-boss job. Email sent to the account's email address with a secure download link within **24 hours**. Download link expires after 7 days.

**Constraints (Phase 2):**
- Only the account owner can request their own export
- Maximum one export request per 24-hour period
- Invitee data included only where that invitee booked with this host — no cross-host data leakage
- Tokens, passwords, and session data are never included in exports

---

## Reference Implementations

| App | Profile Photo & Branding | 2FA | Active Sessions Management | Username / Booking URL | Data Export (GDPR) | Dark Mode |
|-----|--------------------------|-----|---------------------------|----------------------|--------------------|-----------| 
| **Calendly** | ✅ Photo, name, job title | ❌ No 2FA | ❌ No session management | ✅ Can change username (redirect active) | ❌ No self-serve export | ❌ No |
| **Cal.com** | ✅ Photo, name, bio | ✅ TOTP 2FA | ✅ Via open-source admin | ✅ Yes | ✅ Yes | ✅ Yes |
| **SavvyCal** | ✅ Photo, name, company | ❌ No | ❌ No | ✅ Yes | ❌ No | ❌ No |
| **HubSpot Meetings** | Via HubSpot profile — not standalone | ✅ Via HubSpot SSO | ✅ Via HubSpot security | ✅ Via HubSpot | ✅ Via HubSpot GDPR tools | ✅ Via HubSpot |
| **Chili Piper** | At org level; individual profile limited | ✅ Via SSO | ✅ Via admin | ❌ No personal URL | ❌ No | ❌ No |
| **Schduled** | ✅ Photo, display name, job title, company (MVP); bio + website Phase 2 | ✅ TOTP (Phase 2) + SMS (Phase 3) | ✅ Phase 2 — list all sessions, revoke any | ✅ Change username with 30-day redirect | ✅ Phase 2 — manual on request at launch | ✅ Light / Dark / System |

---

## MVP Scope

**In MVP:**
- Full name and display name
- Profile photo upload with cropping
- Job title, company
- Timezone setting with auto-detect
- Connected calendars management (add, remove, toggle conflict check, select write-to calendar)
- Communication settings — notification preferences (new booking, cancellation, reschedule toggles)
- Email address display and change (with verification flow)
- Password change
- Login preferences — view connected auth methods (Google, email/password, magic link); connect/disconnect Google; add password if OAuth-only signup
- Contacts settings — auto-save invitees toggle (default on); domain/email exclusion list
- Cookie settings — manage analytics/marketing cookie preferences
- My Link — booking URL display, copy, QR code download, share via email, change username with 30-day redirect
- Theme: light/dark/system
- Date and time format preferences
- Account deletion (users who need their data before deletion can email support — manual export at this scale)

**Post-MVP:**
- 2FA (TOTP and SMS) *(Post-MVP — Phase 2)*
- Login sessions management — list all active sessions, revoke individual sessions *(Post-MVP — Phase 2)*
- Self-serve GDPR data export (pg-boss job → ZIP → presigned S3 download link) *(Post-MVP — Phase 2)*
- Contacts list view (`/dashboard/contacts`) — search, filter, per-invitee booking history, CSV export *(Post-MVP — Phase 2)*
- Bio and website URL on profile *(Post-MVP — Phase 2)*
- Language selection *(Post-MVP — Phase 2)*
- Social links on profile *(Post-MVP — Phase 2)*


---

## Background Jobs

| Job Name | Trigger | What It Does | Phase |
|----------|---------|-------------|-------|
| `DATA_EXPORT` | Host requests GDPR export | Compiles user data into ZIP, uploads to S3, sends download link email | Phase 2 |
| `EMAIL_SEND` | Profile photo uploaded, password changed, email changed | Sends confirmation email via email_outbox pattern | MVP |

---

## Audit Logging

Every significant profile mutation writes an immutable audit record inside the same DB transaction as the change.

| Action | When | source | Data Logged |
|--------|------|--------|-------------|
| `user.profile_updated` | Name, display name, job title, company, bio, or website changed | `'web'` | fieldName, oldValue, newValue |
| `user.timezone_changed` | Timezone updated | `'web'` | oldTimezone, newTimezone |
| `user.username_changed` | Booking URL slug changed | `'web'` | oldUsername, newUsername, redirectCreated: true |
| `user.photo_updated` | Profile photo uploaded or removed | `'web'` | S3 key |
| `user.password_changed` | Password change submitted | `'web'` | (no sensitive data — just the event) |
| `user.password_added` | Password added to an OAuth-only account | `'web'` | (no sensitive data) |
| `user.email_change_requested` | New email submitted; verification pending | `'web'` | newEmail (masked) |
| `user.oauth_connected` | Google OAuth connected to existing account | `'web'` | provider, providerAccountEmail |
| `user.oauth_disconnected` | Google OAuth disconnected from account | `'web'` | provider, providerAccountEmail |
| `user.contacts_settings_updated` | Auto-save toggle or exclusion list changed | `'web'` | autoSaveEnabled, excludedDomainsAdded, excludedDomainsRemoved |
| `user.cookie_preferences_updated` | Cookie consent preferences changed from settings page | `'web'` | analytics, marketing (new values) |
| `user.account_deleted` | Account deletion confirmed | `'web'` | userId, email, deletedAt |
| `calendar.connected` | Calendar OAuth completed | `'web'` | provider, accountEmail |
| `calendar.disconnected` | Calendar disconnect clicked | `'web'` | provider, accountEmail |

All audit records include: `actorId` (the host's own user ID), `actorIp` (request IP), `source: 'web'` (all profile mutations come from Server Actions — none are unauthenticated API calls or background jobs), `createdAt`. See `database-schema.md` for `auditSourceEnum`.

---

## Tech Stack

- **Better Auth** — manages password changes, 2FA setup (TOTP via authenticator app — Phase 2), active session listing and revocation (Phase 2). The admin plugin lets custom Next.js admin pages view, ban, or impersonate any user account.
- **Next.js App Router** — all settings pages are protected server components. They read the current session via Better Auth and load the user's profile data before rendering — no loading spinner on page open.
- **PostgreSQL + Drizzle ORM** — stores extended profile fields in a `user_profiles` table (display name, job title, company, bio, website, theme preference, date/time format), notification preferences in a `notification_preferences` table, contacts settings (auto-save toggle, excluded domains JSON array) in a `contacts_settings` table (one row per user), and invitee contact records in a `contacts` table (unique per host + email). The `username_redirects` table records old usernames for 30-day redirect support.
- **audit_logs** — every profile mutation (name, timezone, username, photo, password) writes an audit record inside the same DB transaction as the change. Visible to admins in the audit log viewer.
- **S3-compatible storage (@aws-sdk/client-s3 + @aws-sdk/s3-request-presigner)** — hosts uploaded profile photos. Works with any S3-compatible provider (AWS S3, Cloudflare R2, MinIO, Backblaze B2). The browser uploads directly to the bucket using a presigned URL (generated server-side), so the image never passes through the Next.js server. The stored S3 key is saved in the `user_profiles` table; a public URL is derived from the key.
- **UI Kit** (`components/ui/`) — provides the settings form components: inputs, toggles, dropdowns, avatar upload cropper, and confirmation dialogs (for dangerous actions like account deletion).
- **pg-boss** — used for the GDPR data export job *(Phase 2)*: on request, a job is enqueued that compiles the user's data into a ZIP file, uploads it to S3, and sends a download link via Nodemailer within 24 hours. At MVP, pg-boss is already used for notifications and reminders — the export job is added in Phase 2 without new infrastructure. All job handlers registered with `workMonitored()` — see `jobs-queues.md`.
- **`src/lib/validators.ts`** — profile update Server Actions must run inputs through the centralized validators before Zod: `validateName(fullName)` (returns null if empty/too long/contains control chars), `validateUrl(websiteUrl)` (returns null if not a valid http/https URL). Return `{ error: 'Invalid name' }` immediately if either returns null — do not pass bad input to Zod.
- **Custom Admin Panel** — built with Next.js App Router and the project's UI Kit, powered by the Better Auth Admin Plugin. Platform administrators can view any user's profile, sessions, and account status through a custom-built admin interface.
