# Schduled

> A modern, intelligent scheduling platform — built for teams, freelancers, and revenue teams who need more than a simple booking link.

> **This is a pre-development planning document,** written before the MVP was
> built, and describes the original plan (including a `src/` layout,
> `BETTER_AUTH_*` env vars, and Microsoft/Outlook integrations that were never
> built). It does not reflect the current, shipped implementation. For
> accurate, current documentation, see the root
> [README.md](../README.md), [SETUP.md](../SETUP.md),
> [ENVIRONMENT.md](../ENVIRONMENT.md), and [SELF-HOSTING.md](../SELF-HOSTING.md).

---

## Project Overview

**Schduled** is a web-based appointment scheduling and meeting automation platform. It eliminates the back-and-forth of finding meeting times by letting users share a booking link where others can self-schedule based on real-time calendar availability.

Schduled is inspired by the best of the scheduling market — the simplicity of **Calendly**, the openness of **Cal.com**, the conversion focus of **Chili Piper**, the CRM depth of **HubSpot Meetings**, and the UX innovation of **SavvyCal** — combined into a single, cohesive product.

### Target Users

| Segment | Use Case |
|---------|----------|
| Freelancers / Solopreneurs | Simple booking links, self-scheduling |
| Sales Teams | Lead routing, round-robin assignment |
| Customer Success | Client onboarding, support call scheduling |
| Recruiters | Interview scheduling, multi-interviewer collective events |
| Consultants / Coaches | Session scheduling, package bookings |
| Enterprises | Team workspaces, SSO, compliance, advanced routing |

---

## Getting Started

1. Follow [pre-development-setup.md](./pre-development-setup.md) to configure credentials, environment variables, and database setup before writing any code.
2. Install dependencies: `pnpm install`
3. Start both processes in development: `pnpm dev` — runs the Next.js server and the pg-boss worker concurrently via `concurrently`.

For production, run the Next.js server and `pnpm worker` as separate pm2/systemd/Docker processes sharing the same PostgreSQL database.

---

## Tech Stack

### Frontend & Framework

| Technology | Purpose |
|-----------|---------|
| **Next.js 15** (App Router) | React framework — server components, server actions, API routes, SSR/SSG |
| **TypeScript** | Type safety across the entire codebase — frontend, backend, and DB schema |

### Database

| Technology | Purpose |
|-----------|---------|
| **PostgreSQL 16+** | Primary relational database — stores users, event types, bookings, availability, jobs |
| **Drizzle ORM** | TypeScript-first ORM — schema-as-code, type-safe queries, built-in migration runner |

### Background Jobs & Queues

| Technology | Purpose |
|-----------|---------|
| **pg-boss** | PostgreSQL-backed job queue — schedules and processes async tasks: send reminder emails, sync calendar events, generate video links, and run cron jobs. Uses the same PostgreSQL database — no Redis required. |

> **Two-process architecture:** Schduled runs as two separate processes sharing one PostgreSQL database. The **Next.js server** handles web traffic; the **pg-boss worker** (`pnpm worker`) processes background jobs. In development, `concurrently` starts both. In production, run both as separate pm2/systemd/Docker processes.

> **Why pg-boss over Redis/BullMQ:** pg-boss stores jobs inside PostgreSQL, keeping the infrastructure simple — one fewer service to provision, monitor, and scale. It supports scheduled jobs (cron), retries with exponential backoff, job priorities, and exactly-once delivery. See [jobs-queues.md](./jobs-queues.md) for all 16 job types and the complete feature-to-job mapping.

### Authentication

| Technology | Purpose |
|-----------|---------|
| **Better Auth** | Full-stack authentication library — email/password, Google OAuth, magic links, sessions, 2FA (TOTP), refresh token rotation |
| **Better Auth — Admin Plugin** | Adds an admin API layer: list/ban/impersonate users, manage sessions, view audit logs, revoke tokens — consumed by the custom admin panel |

### Admin Panel

| Technology | Purpose |
|-----------|---------|
| **Custom Next.js Admin** | Hand-built admin pages at `/admin` using Next.js App Router + the project's own UI Kit — user management, booking oversight, job queue monitor, platform settings. Protected by Better Auth admin role check. No third-party admin dependency. |

### UI & Styling

| Technology | Purpose |
|-----------|---------|
| **Tailwind CSS** | Utility-first CSS — all booking page, dashboard, and admin UI styles |
| **UI Kit** (`components/ui/`) | Hand-rolled accessible component kit (buttons, modals, calendars, dropdowns) built on Headless UI / @floating-ui/react primitives — used across dashboard and booking pages |

### External APIs & Calendar Integrations

| Service | Purpose |
|---------|---------|
| **Google Calendar API** | Read free/busy events from Google Calendar; write new bookings; auto-generate Google Meet links via `conferenceData` on event creation |
| **Microsoft Graph API** | Read/write Outlook & Office 365 calendars; create Teams meetings via `/onlineMeetings` endpoint |
| **Apple CalDAV / iCloud** *(Post-MVP — Phase 2)* | Read/write iCloud calendars using the CalDAV protocol with an app-specific password — no OAuth required; deferred post-MVP due to protocol complexity |
| **Zoom API (OAuth 2.0)** | Create a unique Zoom meeting room per booking via the Zoom Meetings API |

### Email

| Library | Purpose |
|---------|---------|
| **Nodemailer** | SMTP email delivery — connects to any SMTP server (self-hosted or provider); sends booking confirmations, reminders, password resets, cancellation notices |
| **React Email** | Component-based email template rendering — type-safe, styled React components compiled to HTML and passed to Nodemailer for delivery |
| **ical-generator** | Generates RFC 5545-compliant `.ics` calendar invite files — attached to confirmation emails via Nodemailer |

### File Storage

| Library | Purpose |
|---------|---------|
| **@aws-sdk/client-s3** | S3-compatible storage SDK — stores user-uploaded files (profile photos, logos, banners). Works with any S3-compatible provider: AWS S3, Cloudflare R2, MinIO, Backblaze B2, DigitalOcean Spaces. |
| **@aws-sdk/s3-request-presigner** | Generates presigned S3 URLs — allows browsers to upload files directly to the storage bucket without routing through the Next.js server |

### Key Libraries

| Library | Purpose |
|---------|---------|
| **Zod** | Runtime validation for all API request bodies, form inputs, and environment variables |
| **react-hook-form + @hookform/resolvers** | Performant forms; resolvers integrate Zod validation directly |
| **date-fns** | Date arithmetic — adding/subtracting durations, formatting dates |
| **date-fns-tz** | Timezone-aware date arithmetic using IANA timezone names — DST-safe slot calculation and display |
| **@paralleldrive/cuid2** | Collision-resistant, URL-safe, timestamp-sortable IDs used as primary keys for all app tables |
| **Biome** | Linter + formatter — replaces ESLint + Prettier; 10-50× faster with zero config conflicts |
| **concurrently + tsx** | Dev tooling — `concurrently` runs Next.js server and the pg-boss worker in parallel; `tsx` executes the TypeScript worker directly |

---

## Feature → Tools Reference

Which library or service each feature depends on. Use this as a quick lookup during implementation — each feature's `features/*.md` file has a full Tech Stack section with implementation details.

| # | Feature | Tools / Libraries Needed |
|---|---------|--------------------------|
| 1 | **Landing Page** | Next.js 15 (Server Components), Tailwind CSS, UI Kit, Next.js Metadata API, `next/image`, `next/font` |
| 2 | **User Onboarding & Auth** | Better Auth (email/password, Google OAuth, magic link), Nodemailer (SMTP), React Email, Next.js App Router |
| 3 | **User Profile & Settings** | Better Auth, S3-compatible storage + `@aws-sdk/client-s3` + `s3-request-presigner` (photo upload), pg-boss (GDPR export), Nodemailer, Drizzle ORM, UI Kit |
| 4 | **Event Type Builder** | Drizzle ORM, Next.js Server Actions, Next.js ISR (`revalidatePath`), UI Kit |
| 5 | **Availability Management** | Drizzle ORM, `date-fns-tz`, Next.js Server Actions, UI Kit |
| 6 | **Timezone Management** | `date-fns-tz`, Drizzle ORM, `ical-generator`, Browser `Intl.DateTimeFormat` API |
| 7 | **Calendar Integrations** | `googleapis` (Google Calendar API), `@microsoft/microsoft-graph-client` (Outlook + Teams), `tsdav` *(Phase 2 — Apple CalDAV)*, Drizzle ORM, pg-boss (sync job) |
| 8 | **Public Booking Page** | Next.js App Router (dynamic routes), Next.js ISR, Next.js Metadata API, Tailwind CSS, UI Kit, Drizzle ORM, `date-fns-tz` |
| 9 | **Booking Engine** | PostgreSQL advisory locks (`pg_advisory_xact_lock`), Drizzle ORM, Zod, pg-boss (post-booking jobs), Next.js API Route |
| 10 | **Custom Questions** | Drizzle ORM, Zod (answer validation + HTML strip), UI Kit, Next.js App Router |
| 11 | **Video Conferencing** | Zoom API (OAuth 2.0), `googleapis` (Google Meet via Calendar API), `@microsoft/microsoft-graph-client` (Teams), Drizzle ORM, pg-boss |
| 12 | **Booking Confirmation** | pg-boss (async after DB commit), Nodemailer (SMTP), React Email, `ical-generator` (ICS), `googleapis` (host calendar event), `@microsoft/microsoft-graph-client` (Outlook event) |
| 13 | **Notifications & Reminders** | pg-boss (schedule 24h + 1h jobs), Nodemailer (SMTP), React Email (reminder templates), Drizzle ORM |
| 14 | **Meetings Dashboard** | Drizzle ORM (bookings + joins), Better Auth (session check), pg-boss (cancel reminders on host cancel), UI Kit, Next.js Server Components |
| 15 | **Cancellation & Reschedule** | Drizzle ORM (token lookup + atomic status update), pg-boss (cancel/reschedule reminder jobs), Nodemailer + React Email (notification emails), Next.js App Router |
| 16 | **Admin Panel** | Better Auth Admin Plugin (`listUsers`, `banUser`, `impersonateUser`, `revokeUserSessions`), Drizzle ORM (bookings + pgboss.job queries), UI Kit, Nodemailer, pg-boss Node.js API (retry/cancel jobs) |

> **Cross-feature tools used everywhere:** PostgreSQL 16+ (primary DB) · Drizzle ORM (all DB access) · Next.js 15 App Router (all pages/routes) · TypeScript (whole stack) · Tailwind CSS + the project's UI Kit (all UI) · Zod (all API validation) · Better Auth (all protected routes) · pg-boss (all async jobs)

---

## Core Functionality

Schduled is organized around five core pillars:

### 1. Smart Scheduling
- Create 1-on-1 event types *(MVP)*
- Group, round-robin, and collective event types *(Post-MVP — Phase 2 — 1-on-1 only in MVP)*
- Connect calendars and sync availability in real-time *(MVP)*
- Share booking links that auto-update as availability changes *(MVP)*

### 2. Team Coordination *(Post-MVP — Phase 2)*
- Distribute meetings across team members (round-robin, priority, weighted)
- Require multiple hosts available simultaneously (collective)
- Manage team workspaces with admin controls

### 3. Booking Experience
- Customizable booking pages with branding *(MVP)*
- Custom intake questions before booking *(MVP)*
- Calendar overlay so invitees see mutual availability *(Post-MVP — Wave 2)*

### 4. Automation & Workflows
- Automated email reminders (24hr and 1hr pre-meeting) *(MVP)*
- Pre-meeting confirmation emails *(MVP)*
- Post-meeting follow-up emails *(Post-MVP — Phase 2)*
- Webhook triggers for any event *(Post-MVP — Phase 2)*

### 5. Insights & Growth
- Lead qualification routing forms *(Post-MVP — Phase 2)*
- Analytics dashboard to track meeting performance *(Post-MVP — Phase 2)*

---

## MVP Feature List

The MVP focuses on delivering a complete solo + small team scheduling experience.

### Core MVP (Solo Users)

| # | Feature | Description |
|---|---------|-------------|
| 1 | Landing Page | Public marketing page — hero, features, how it works, comparison table, FAQ, footer; `/privacy`, `/terms`, `/cookies` legal pages |
| 2 | User Onboarding | Sign up, sign in, email verification, password reset (Google OAuth + magic link); guided first-run wizard to connect calendar, set timezone, create first event type, and get booking link |
| 3 | User Profile & Settings | Name, photo, timezone, connected calendars, notification preferences, 2FA, account security |
| 4 | Event Type Builder | Create unlimited event types; multiple duration options per link; invitees can add up to 10 additional guests per booking |
| 5 | Availability Settings | Set weekly hours, buffer times, minimum notice, daily limits, date-specific overrides |
| 6 | Timezone Management | Auto-detect invitee timezone, manual override, both timezones shown in every email and confirmation |
| 7 | Calendar Sync | Real-time free/busy sync with Google Calendar and Outlook — prevents double-booking. Apple iCloud CalDAV — Phase 2. |
| 8 | Booking Page | Public-facing scheduling page with available time slots, host branding, and profile overview |
| 9 | Booking Engine | Core booking processor — slot locking, conflict check, calendar write, async post-booking jobs |
| 10 | Custom Questions | Add intake questions to booking form (text, dropdown, checkbox, phone, multi-select) |
| 11 | Video Conferencing | Auto-generate unique Zoom / Google Meet / Teams links per booking |
| 12 | Booking Confirmation | Confirmation screen + email with both timezones, calendar invite (.ics), and add-to-calendar buttons |
| 13 | Notifications & Reminders | Automated 24-hour and 1-hour email reminders; instant host notification on new booking |
| 14 | Meetings Dashboard | View all upcoming and past meetings; search, filter, private notes, and manage bookings |
| 15 | Cancellation & Reschedule | Invitee-initiated cancellation and reschedule via secure email link; host can cancel from dashboard |
| 16 | Admin Panel | Platform admin dashboard — user management (ban, impersonate), booking oversight, job queue monitor, platform settings |

### Future Roadmap (Post-MVP)

> **Note on wave numbers below:** These are post-launch feature waves, not build phases. The build phases (Phase 0–20) are in [development-plan.md](./development-plan.md) and refer to the MVP build sequence.

| Wave | Feature | Description |
|------|---------|-------------|
| Wave 1 | Team Workspaces | Invite team members, shared event types, admin controls |
| Wave 1 | Round-Robin Scheduling | Auto-distribute meetings among team members |
| Wave 1 | Collective Events | Require multiple hosts available simultaneously |
| Wave 1 | Routing Forms | Qualify and route leads to the right team member |
| Wave 1 | Scheduling Outreach | Send specific available times; single-use booking links |
| Wave 1 | Meeting Polls | Propose times; participants vote; host confirms winner |
| Wave 1 | Website Embeds | Inline, pop-up, and widget embeds for any website |
| Wave 1 | Analytics Dashboard | Meeting stats, cancellation rates, no-show tracking |
| Wave 1 | Webhooks | Send booking data to external apps in real-time |
| Wave 1 | AI Notetaker | Auto-join, record, transcribe, summarize with action items |
| Wave 2 | Browser Extension | Chrome/Outlook extension; share times directly in Gmail |
| Wave 2 | Calendar Overlay | Invitees see mutual availability (SavvyCal-style) |
| Wave 2 | Mobile App | iOS & Android native apps |
| Wave 3 | SSO / SAML | Enterprise single sign-on (Okta, Azure AD, Google Workspace) |
| Wave 3 | Custom Domain | Host booking pages on your own domain |
| Wave 3 | Audit Logs | Activity log for all scheduling events — compliance-ready |
| Wave 3 | HIPAA Compliance | BAA agreements and healthcare-grade privacy |
| Wave 3 | Advanced Routing | Territory, account ownership, CRM lookup-based routing |
| Wave 3 | SCIM Provisioning | Automatic user provisioning via identity provider |

---

## Post-MVP Technical Planning

Implementation patterns for Wave 1 features — outbound webhooks (with SSRF validation and HMAC-SHA256 signing), real-time dashboard updates via SSE, and public API key management (hashed storage, prefix identification) — are fully designed and documented in [architecture.md](./architecture.md). Refer to that document when starting Wave 1 development.

---

## Competitive Landscape

| Product | Strength | Gap Schduled Fills |
|---------|----------|-------------------|
| **Calendly** | Market leader, ease of use | Expensive for teams; dropped Apple Calendar support; shows only one timezone |
| **Cal.com** | Open source, generous free tier | Less polished UX — Schduled offers the same self-hosting freedom with a more refined experience |
| **Acuity Scheduling** | Deep appointment customization, built-in payments | Outdated UI; no real-time calendar overlay; weak team routing |
| **Microsoft Bookings** | Native Microsoft 365 integration | No invitee timezone auto-detect; limited customization; tied to Microsoft ecosystem |
| **Chili Piper** | Best-in-class B2B lead routing | Extremely expensive; Salesforce-only; steep learning curve |
| **HubSpot Meetings** | Native CRM integration | Tied to HubSpot; basic features on free tier |
| **SavvyCal** | Best booking UX (calendar overlay) | No free tier; small ecosystem |

**Schduled's positioning:** A polished, open source scheduling platform with SavvyCal-quality UX, Calendly-level features, and Chili Piper-inspired lead routing — free for everyone to use and self-host.

## Documentation

| Document | What it covers |
|----------|---------------|
| [architecture.md](./architecture.md) | System architecture — two-process design, request flows, auth, email, calendar sync, security decisions |
| [design-system.md](./design-system.md) | Complete UI design system — colors (OKLCH), fonts, components, layouts, screens, dark mode, icons, email templates |
| [project-structure.md](./project-structure.md) | Complete folder structure with explanations — where each file lives and why |
| [database-schema.md](./database-schema.md) | All 30 database tables, Drizzle schema definitions, enums, query helpers |
| [jobs-queues.md](./jobs-queues.md) | All 16 background jobs — feature-to-job mapping, payloads, cron schedules, worker architecture |
| [tools-packages.md](./tools-packages.md) | Every npm package — purpose, which feature uses it, env vars, setup notes |
| [development-plan.md](./development-plan.md) | 21-phase (Phase 0–20) build plan from project setup to launch |
| [pre-development-setup.md](./pre-development-setup.md) | Credentials, packages, env vars, DB setup — complete before writing any code |
| [features/](./features/) | 16 detailed feature specification files |

---

## Project Structure

The app is a single Next.js monorepo — all frontend, API routes, and server actions live together with no separate API server. The complete folder layout with explanations for every file and directory is in [project-structure.md](./project-structure.md).

---

## Key Differentiators

1. **Apple Calendar Support** *(Post-MVP)* — Native iCloud/Apple Calendar sync; Calendly dropped this in August 2024
2. **Both Timezones in Every Email** — Confirmation and reminder emails show the invitee's time AND the host's time; Calendly only shows one timezone
3. **Cancellation Policy Enforcement** — Calendly only displays policy text; Schduled actually blocks cancellations within the configured window
4. **Unlimited Custom Questions** — No limits on intake questions; Calendly restricts questions behind paid plans
5. **Multi-Duration Event Types** — One booking link can offer 15, 30, and 60-min options; invitee picks at booking time
6. **Meeting Overload Protection** — Daily meeting limits, buffer times, and minimum notice periods prevent back-to-back burnout
7. **Fully Open Source** — All features free, self-hostable, no paywalls or plan tiers

---

## Contributing

Contributions are welcome. Open an issue to report bugs or propose features, or submit a pull request against `main`. See the [development plan](./development-plan.md) for the build sequence if you want to pick up a phase.

---

## License

MIT — see [LICENSE](../LICENSE) for details.

---

## References

- [Calendly](https://calendly.com) — Market leader, benchmark for core scheduling UX
- [Cal.com](https://cal.com) — Open source reference implementation
- [Chili Piper](https://chilipiper.com) — B2B lead routing and sales scheduling
- [HubSpot Meetings](https://hubspot.com/products/sales/schedule-meeting) — CRM-native scheduling
- [SavvyCal](https://savvycal.com) — Calendar overlay UX inspiration
