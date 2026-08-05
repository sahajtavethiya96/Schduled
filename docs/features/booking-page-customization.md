# Booking Page Customization

The booking page is the invitee's first impression of Schduled. Customization allows hosts and organizations to make booking pages feel like a natural extension of their brand — not a third-party tool.

---

## Overview

Every event type has a publicly accessible booking page. Above that, every host also has a **Profile Overview Page** listing all their event types. MVP customization covers brand color, logo, profile photo, and custom confirmation messages. Custom domain and full white-labeling are Phase 4 features. The booking page must communicate trust and professionalism while remaining simple and fast to use.

---

## User Stories

**Host**
- As a host, I want to add my profile photo and name to my booking page, so that invitees feel confident they are booking the right person. *(MVP)*
- As a host, I want to set my brand color on my booking page, so that it feels consistent with my personal or company brand. *(MVP)*
- As a host, I want to write a custom welcome message, so that invitees feel welcomed before they pick a time. *(MVP)*
- As a host, I want to hide specific event types from my profile page, so that I can offer private links without showing them publicly. *(MVP)*
- As a host, I want to redirect invitees to a custom URL after booking, so that I can send them to a thank-you page or onboarding form. *(Post-MVP — Phase 2)*
- As a host, I want to remove "Powered by Schduled" branding from my booking page, so that it feels fully like my own product. *(MVP)*
- As a host, I want to host my booking page on my own domain, so that the URL matches my website instead of showing schduled.com. *(Phase 4)*

**Invitee**
- As an invitee, I want the booking page to load quickly and look professional, so that I trust the host before booking. *(MVP)*
- As an invitee, I want to see the host's photo, name, and bio on the booking page, so that I know who I am meeting. *(MVP)*

---

## Profile Overview Page

The profile overview page is the host's "home" page — it shows all active event types in one place. Every host gets a URL like `schduled.com/yourname` that lists all their available event types.

### What Is On the Profile Page
- Host's name and profile photo
- Job title and company (optional)
- Short bio or welcome message
- All **active** (non-hidden) event types displayed as cards
- Each card shows: event type name, duration, brief description, color
- Hidden/secret event types are never shown here

### Profile Page Customization
- **Introductory text / headline:** Short welcome message shown above event types (e.g., "Thanks for visiting — pick a meeting type below")
- **Event type order:** Drag-and-drop reorder; appears in the same order for invitees
- **Color coding:** Each event type shows its assigned color as a visual accent
- **Branding:** Logo and brand color applied across the profile page
- **Remove Schduled branding:** "Powered by Schduled" badge not shown (open source)

### Event Type Card Contents (Profile Page)
Each card on the profile page shows:
- Color indicator (left border or card accent)
- Event type name
- Duration (e.g., "30 min")
- Location type icon (camera icon for video, phone icon for call, pin for in-person)
- Short description (first 80 characters of the event description)
- "Book" or "Select" CTA button

### Profile Page Behavior
- Clicking an event type card opens that event type's booking calendar
- Back button returns to the profile overview
- Profile page is publicly accessible — no login required for invitees
- If the host has only one active event type: profile page can redirect directly to that event type (optional setting)

---

## Profile and Branding

### Profile Photo
- Upload a personal profile photo shown on the booking page
- Recommended: 400×400px minimum, square crop
- Displayed in:
  - Booking page header
  - Confirmation emails sent to invitees
  - Reminder and follow-up emails

### Organization Logo
- Upload company or team logo
- Displayed in:
  - Booking page header (alongside or instead of profile photo)
  - Email notifications
  - Calendar invite descriptions
- Recommended: 440×240px minimum, transparent PNG preferred

### Banner / Cover Image *(Post-MVP — Phase 2)*
- Optional banner image across the top of the booking page
- Creates a more polished, brand-consistent experience
- Recommended: 1200×300px, landscape

### Brand Colors
- Primary color: Used for CTA buttons, selected date highlights, active states
- Text color: Customizable for contrast
- Background color: White, light gray, or custom
- Accent color: Secondary elements (hover states, borders)

### Color Presets
- Pre-built color schemes (Professional Blue, Warm Gray, Forest Green, etc.)
- Custom hex color input
- Preview updates in real-time as host changes colors

---

## Booking Page Layout

### Profile Section
- Host name (required)
- Job title / company name (optional)
- Short bio or description (up to 200 characters)
- Social links (LinkedIn, Twitter/X, website)

### Event Type Display
- Event type name prominently displayed
- Duration shown (e.g., "30 minutes")
- Location type shown (Zoom, Phone Call, In-Person, etc.)
- Description text (supports markdown: bold, links, lists)
- Meeting agenda or preparation instructions

### Calendar Display Options
- **Month view** (default — MVP): Monthly calendar with available days highlighted; the standard invitee UX used by Calendly, Cal.com, and every major scheduling tool — ship this at launch
- **Week view** *(Post-MVP — Phase 2)*: 7-day view showing all available slots
- **Compact list view** *(Post-MVP — Phase 2)*: Text-based list of available times (accessibility alternative); add after month view is stable and tested

> **Why only month view at launch:** Both alternatives require separate slot-display logic, separate mobile layouts, and a view-toggle UI. At MVP the invitee's job is simply to pick a time — month view handles that correctly. Add list view in Phase 2 once you have real invitee feedback on accessibility needs.

---

## Custom Intake Questions

Hosts add questions to the booking form to collect information before the meeting. Full question type documentation, configuration options, pre-fill behavior, and routing integration are covered in [custom-questions.md](custom-questions.md).

**Summary of supported types:** Short Text, Long Text, Phone Number, Single Select, Multiple Select, Dropdown, Number, Date Picker, URL.

**Limits:** Up to 20 questions per event type; Name and Email are always required system fields.

---

## Confirmation Page

Shown to invitees immediately after successfully booking a meeting.

### Default Confirmation Page
- "You're scheduled!" confirmation message
- Meeting summary: date, time, duration, location
- Host name and profile photo
- Add to Google Calendar / Outlook / Apple Calendar buttons
- Link to reschedule or cancel
- Option to schedule another meeting

### Custom Confirmation Message
- Replace default text with custom message
- Supports Markdown: `**bold**`, `[link text](url)`, line breaks
- Example: "Thanks for booking! Please review our intake form before the call: [link]"

### Redirect to External URL *(Post-MVP — Phase 2)*
- Instead of showing Schduled's confirmation page, redirect invitees to a custom URL
- Use cases:
  - Redirect to onboarding page
  - Redirect to a "next steps" landing page
  - Trigger marketing pixel events

---

## Email Notifications Branding

Confirmation, reminder, and follow-up emails can be customized.

### Email Customization
- From name: Show as "Jane Smith" instead of "Schduled Notifications"
- Reply-to address: Direct replies go to host's email
- Logo in email header
- Brand color in email header and CTA buttons
- Footer text (custom disclaimer or contact info)

### Default Email Templates
- Booking confirmation (to invitee)
- Booking notification (to host)
- Cancellation confirmation (to invitee)
- Reschedule confirmation (to invitee)
- Reminder email (to invitee)
- Follow-up email (to invitee)

### Custom Subject Lines
- Customize email subject lines per event type
- Use dynamic variables: `{invitee_name}`, `{event_type}`, `{date}`, `{time}`
- Example: "Your call with Jane on {date} at {time} is confirmed"

---

## White-Labeling (Advanced)

For agencies, enterprises, and tools built on Schduled.

### Remove Schduled Branding
- "Powered by Schduled" badge not shown on booking pages or emails (open source — no attribution required)

### Custom Domain *(Post-MVP — Phase 4 — Enterprise)*
- Host booking pages on your own domain
- Example: `meetings.yourcompany.com/team` instead of `schduled.com/yourname`
- DNS CNAME record setup required
- SSL/TLS certificate provisioned automatically

### Subdomain Routing *(Post-MVP — Phase 3)*
- Organization gets a branded subdomain: `yourcompany.schduled.com`
- All team members' pages live under this subdomain
- Available without full custom domain setup

### Embed Without Attribution *(Post-MVP — Phase 3)*
- Embedded booking widgets show no Schduled branding
- Fully branded experience within your website

---

## Booking Page URL Structure

| URL Type | Example |
|----------|---------|
| Personal | `schduled.com/username` |
| Specific Event | `schduled.com/username/event-slug` |
| Team Page | `schduled.com/org/team-name` |
| Custom Domain | `meetings.company.com/john` |
| Custom Domain + Event | `meetings.company.com/john/30-min-call` |

### URL Customization
- Choose username slug during onboarding
- Customize event-type slug per event type
- Both username and event slug can be changed (with redirect from old URL)

---

## Booking Page Preview

Before publishing, hosts can preview their booking page:
- See exactly what invitees will see
- Preview across device sizes (desktop, tablet, mobile)
- Test the form without creating a real booking
- Check email templates with "Send Preview Email" option

---

## Responsive Design

All booking pages are fully responsive:
- Optimized for mobile (iPhone, Android)
- Tablet-friendly layout
- Fast load times (< 1 second target)
- Accessible: WCAG 2.1 AA compliant
- Works with screen readers

---

## Booking Page Language *(Post-MVP — Phase 2)*

The booking page UI (button labels, date/time formatting, system text) can be displayed in different languages for international invitees.

### Supported Languages
- English (default)
- Spanish (Español)
- French (Français)
- German (Deutsch)
- Portuguese (Português)
- Italian (Italiano)
- Dutch (Nederlands)
- Japanese (日本語)
- Chinese Simplified (中文)
- Hindi (हिन्दी)
- Arabic (عربي) — RTL layout supported

### What Gets Translated
- All system-generated UI text: button labels, date picker, timezone selector, confirmation message
- Default email confirmation text
- Error messages

### What Does NOT Get Translated
- Event type name (set by host — must be translated manually)
- Event type description (set by host)
- Custom intake questions (set by host)
- Any custom text entered by the host

### Language Configuration
- Set per event type (not globally, to allow different event types in different languages)
- Example: One event type in English for US clients, clone in Spanish for LATAM clients
- No automatic language detection — language is fixed per event type
- Invitee cannot manually switch language on the booking page

### Multi-Language Strategy
To support multiple languages:
1. Create the event type in primary language
2. Clone the event type
3. Change language setting on the clone
4. Translate all custom text (name, description, questions) manually
5. Share the appropriate language link with the relevant audience

---

## Reference Implementations

| App | Logo & Colors | Remove Branding | Custom Domain | Language |
|-----|--------------|----------------|--------------|---------|
| **Calendly** | ✅ Logo, colors, profile photo | Paid (Standard+ plan, ~$10/mo) | Enterprise only (~$16/mo+) | ✅ Per event type |
| **Cal.com** | ✅ Full white-labeling | ✅ Open source — free | ✅ Self-hosted | ✅ Yes |
| **SavvyCal** | ✅ Colors, banners, avatars | ✅ On paid plan | ❌ No | ❌ No |
| **Chili Piper** | Minimal — routing-focused | N/A | ❌ No | ❌ No |
| **HubSpot Meetings** | Inherits HubSpot portal branding | ❌ No standalone control | ❌ No | ❌ No |
| **Schduled** | ✅ Logo, colors, banner, profile photo | ✅ Open source — free for all | Phase 4 | Phase 2 (per event type) |

---

## MVP Scope

**In MVP:**
- Profile photo upload
- Organization logo upload
- Brand primary colour
- Event type name and description with markdown
- Default confirmation page with reschedule/cancel links
- Custom confirmation message per event type
- Email from-name and reply-to customisation
- No "Powered by Schduled" branding (open source — available to all)

**Post-MVP:**
- Banner / cover image (Phase 2)
- Redirect to external URL after booking confirmation (Phase 2)
- Full email template customisation — custom HTML/CSS (Phase 2)
- Booking page language — per event type (Phase 2)
- Organisation subdomain — `yourcompany.schduled.com` (Phase 3)
- White-label embeds — no Schduled branding in widgets (Phase 3)
- Custom domain — `meetings.yourcompany.com` (Phase 4 — Enterprise)
- Profile page single-event-type auto-redirect (Phase 2)


---

## Background Jobs

No background jobs are triggered by branding changes. When the host saves branding updates, the Server Action must call `revalidatePath` for `/[username]` (profile overview page) and for each active event type slug at `/[username]/[eventSlug]`. For hosts with many event types, query all active slugs first and revalidate each one. If only the profile page is invalidated, individual booking pages will still show the old logo/color until the ISR TTL expires.

---

## Audit Logging

Branding changes write an audit record so admins can trace customization mutations.

| Action | When | source | Data Logged |
|--------|------|--------|-------------|
| `user.branding_updated` | Host saves logo, color, confirmation message, or any branding field | `'web'` | changedFields with before/after values (e.g., `{ primaryColor: { before: '#000', after: '#4F46E5' } }`) |

All records include `actorUserId`, `actorIp`, `source: 'web'`. See `database-schema.md` for `auditSourceEnum`.

---

## Tech Stack

- **Next.js App Router dynamic routes** — public booking pages use `[username]` and `[username]/[eventSlug]` dynamic segments. These are React Server Components, so the full page (host info, branding, event type details) is rendered on the server — fast initial load, no layout shift.
- **Next.js ISR (on-demand revalidation)** — booking pages are cached at the CDN edge. When the host updates branding, `revalidatePath('/[username]')` and `revalidatePath('/[username]/[slug]')` are called for every active event type to immediately push fresh versions — no stale logos or colors visible to invitees.
- **Next.js Metadata API** — each booking page auto-generates SEO-optimised `<title>`, `<description>`, and Open Graph tags using the host's name and event type details.
- **S3-compatible storage (@aws-sdk/client-s3 + @aws-sdk/s3-request-presigner)** — stores all host-uploaded assets: profile photo, organisation logo, and banner image. Works with any S3-compatible provider (AWS S3, Cloudflare R2, MinIO, Backblaze B2). Browsers upload directly to the bucket via a server-generated presigned URL; the S3 key is saved in `user_branding`. On booking page render, the server derives a public CDN URL from the key.
- **PostgreSQL + Drizzle ORM** — branding settings (logo URL, banner URL, primary colour, confirmation message, remove-branding flag) are stored in a `user_branding` table. Loaded as part of the booking page server query.
- **`src/lib/validators.ts`** — branding Server Actions run host-controlled text inputs through the centralized validators before Zod: `stripHtml(confirmationMessage)` (strips `<script>`, `<img onerror>`, and all HTML from the custom confirmation message — it appears in invitee-facing confirmation emails), `validateName(fromName)` (the email "from" name shown to invitees — must not contain control characters or be empty). Return `{ error }` immediately if either returns null. Do not pass unsanitized text to Drizzle.
- **Tailwind CSS + UI Kit** — booking page layout, colour theming (primary colour applied via CSS variable from the host's brand colour), and all interactive elements (date picker, slot grid, form inputs, confirmation screen).
