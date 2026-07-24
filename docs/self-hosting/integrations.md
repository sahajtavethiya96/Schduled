# Integrations Guide

All three integrations below are optional — the app works without any of
them (emails log to the console, Google/Zoom buttons stay hidden until
configured). Full variable reference: [`ENVIRONMENT.md`](../../ENVIRONMENT.md).

**Today's working integrations are Google (Calendar + Meet) and Zoom only.**
Outlook/Office 365 and Microsoft Teams are not implemented yet (tracked as
Phase 4 / P2 in `SELF-HOSTING.md`) — don't set variables for them, they do
nothing.

## Email (SMTP)

Any SMTP-compatible provider works — self-hosted (Postfix, Maddy, Mailcow)
or cloud (Amazon SES, Resend, Postmark, Mailgun, SendGrid, Brevo). Avoid
Mailtrap in production — it's a testing sandbox that never actually
delivers mail.

```env
SMTP_HOST=email-smtp.us-east-1.amazonaws.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=<your-smtp-username>
SMTP_PASS=<your-smtp-password>
EMAIL_FROM="Schduled <no-reply@yourdomain.com>"
```

Use a domain you've set up SPF/DKIM for — undeliverable mail (booking
confirmations, reminders, magic links) is the single most common
self-hosting complaint for products like this. If `SMTP_HOST` is unset,
Schduled logs the email content to the console instead of sending it — fine
for testing, not for production.

## Google Calendar + Google Meet

Enables "Continue with Google" sign-in, two-way Google Calendar sync
(conflict checking + writing events), and automatic Google Meet links.

**Setup:**
1. Go to the [Google Cloud Console](https://console.cloud.google.com/) →
   create or select a project.
2. **APIs & Services → Library** → enable the **Google Calendar API**.
3. **APIs & Services → OAuth consent screen** — configure it (scopes needed:
   `calendar`, `calendar.events`).
4. **APIs & Services → Credentials** → **Create Credentials → OAuth client
   ID** → type **Web application**.
5. Add an **Authorized redirect URI**:
   ```
   https://your-domain.example/api/integrations/google/callback
   ```
   (replace with your real `APP_URL`, exactly — trailing
   slashes and protocol mismatches will cause the OAuth flow to fail).
6. Set the resulting values:
   ```env
   GOOGLE_CLIENT_ID=xxxxxxxx.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=xxxxxxxx
   ENCRYPT_KEY=<openssl rand -hex 32>
   ```
   `ENCRYPT_KEY` is **required** the moment Google is configured — it
   encrypts stored OAuth tokens at rest. The app will refuse to boot
   without it if Google credentials are set (`lib/env.ts` validates this).

Google Meet links require no separate credential — connecting Google
Calendar is sufficient; Meet links are created through the Calendar API.

## Zoom

Auto-generates a Zoom meeting link for bookings that use the Zoom location
type.

**Setup:**
1. Go to [marketplace.zoom.us](https://marketplace.zoom.us/) → **Develop →
   Build App** → choose **OAuth**.
2. Scope required: `meeting:write:meeting`.
3. Add the **Redirect URL for OAuth**:
   ```
   https://your-domain.example/api/integrations/zoom/callback
   ```
4. Set:
   ```env
   ZOOM_CLIENT_ID=xxxxxxxx
   ZOOM_CLIENT_SECRET=xxxxxxxx
   ENCRYPT_KEY=<openssl rand -hex 32>   # same key as Google, if both are used
   ```

**Publishing note:** a publicly-listed Zoom app requires Zoom's review
process, which can take weeks. For a single self-hosted instance connecting
your own Zoom account, an **unpublished/internal** app works fine and
requires no review.

## Verifying it worked

After setting either integration, go to **Settings → Integrations** in the
app and connect the account. A successful connection creates a
`connectedCalendar` (Google) or `videoConnection` (Zoom) record with an
encrypted token. If the connect flow fails, double-check the redirect URI
matches `APP_URL` exactly (protocol, host, no trailing slash
mismatch) and that `ENCRYPT_KEY` is set.

## Address autocomplete (bonus, not really an "integration")

The in-person location field's autocomplete defaults to free, keyless
**Photon** (OpenStreetMap-based) — no setup required. For richer
address/building-level coverage, set a Google Places or Mapbox key — see
`ENVIRONMENT.md` §6. This is entirely optional; Photon is fine for most
deployments.
