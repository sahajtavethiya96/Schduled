# Integrations Guide

All three integrations below are optional — the app works without any of
them (emails log to the console, Google/Zoom buttons stay hidden until
configured). Full variable reference: [`ENVIRONMENT.md`](../../ENVIRONMENT.md).

**Today's working integrations are Google (Calendar + Meet) and Zoom only.**
Outlook/Office 365 and Microsoft Teams are not implemented yet (tracked as
Phase 4 / P2 in `SELF-HOSTING.md`) — don't set variables for them, they do
nothing.

## Integration settings (DB configuration)

SMTP, Google OAuth, Zoom OAuth, and file storage can each be configured
either way — through the `.env` vars documented in the sections below, **or**
from inside the app instead, without touching `.env` at all: the first-run
setup wizard's "Configure services" step, or **Settings → Services** any time
after. Both paths write to the same place and can be mixed freely.

**Resolution order, per field:** a value saved in Settings → Services always
wins over the matching `.env` var; an unset field falls back to `.env`; if
neither is set, that integration is treated as unconfigured. This is
per-field, not per-integration — e.g. SMTP host/port can come from `.env`
while the password is only set in Settings → Services, and the merged result
is used together.

**Encryption:** secrets (SMTP password, OAuth client secrets, S3/R2 access
keys) are encrypted at rest with AES-GCM, keyed off `ENCRYPT_KEY` — the same
key this app already uses to encrypt stored OAuth tokens, not a separate key
to manage. `ENCRYPT_KEY` itself must stay in `.env` (it's what unlocks
everything else) — set it before saving any secret through Settings →
Services, or the save fails with a clear error instead of silently storing
plaintext.

**Restart requirement — Google Sign-In only:** the "Continue with Google"
button (via Better Auth) is wired up once when the server process starts, so
a Google config that exists only in the database (no `.env` vars at all)
takes effect for Sign-In after the next restart, and any later change to it
needs another restart. Every other resolved value — Google **Calendar**
connections, Zoom, SMTP, and file storage — is re-read fresh on every use and
applies immediately, no restart, ever.

**Clearing a saved value:** use the "clear" (eraser) button next to a secret
field in Settings → Services to remove it from the database and fall back to
`.env` again; leaving a secret field blank on save just means "don't touch
what's already saved there."

## Email (SMTP)

Any SMTP-compatible provider works — self-hosted ([Postfix](https://www.postfix.org/documentation.html))
or cloud ([Amazon SES](https://docs.aws.amazon.com/ses/latest/dg/send-email-smtp.html),
[Resend](https://resend.com/docs/send-with-smtp), [Postmark](https://postmarkapp.com/support/article/1002-what-are-the-postmark-smtp-and-api-details),
[Mailgun](https://documentation.mailgun.com/docs/mailgun/user-manual/sending-messages/#sending-via-smtp),
[SendGrid](https://docs.sendgrid.com/for-developers/sending-email/getting-started-smtp),
[Brevo](https://developers.brevo.com/docs/send-a-transactional-email#smtp)). Avoid
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

**Troubleshooting:** wrong `SMTP_SECURE`/port pairing is the most common
connection failure (`465` needs `SMTP_SECURE=true`, `587` needs `false`).
Mail landing in spam or rejected outright almost always means SPF/DKIM
aren't set up for the sending domain — see your provider's docs (linked
above) for their exact domain-verification steps.

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
   without it if Google credentials are set via `.env` (`lib/env.ts`
   validates this). Configuring Google entirely through Settings → Services
   instead skips this boot-time check — but `ENCRYPT_KEY` is still required
   to actually save the client secret there (see
   [Integration settings (DB configuration)](#integration-settings-db-configuration) above).

Google Meet links require no separate credential — connecting Google
Calendar is sufficient; Meet links are created through the Calendar API.

**Official docs:** [Google Calendar API overview](https://developers.google.com/calendar/api/guides/overview) ·
[OAuth 2.0 for Web Server Apps](https://developers.google.com/identity/protocols/oauth2/web-server)

**Common errors:** a redirect URI that doesn't match exactly (protocol,
host, trailing slash) is the #1 cause of a failed connection. If only your
own Google account can connect while others can't, the OAuth consent screen
is still in "Testing" mode — publish it (or add testers) in the Cloud Console.

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
   Or set the client ID/secret from Settings → Services instead — see
   [Integration settings (DB configuration)](#integration-settings-db-configuration) above.

**Publishing note:** a publicly-listed Zoom app requires Zoom's review
process, which can take weeks. For a single self-hosted instance connecting
your own Zoom account, an **unpublished/internal** app works fine and
requires no review.

**Official docs:** [Zoom OAuth apps](https://developers.zoom.us/docs/integrations/oauth/)

**Common errors:** same redirect-URI-mismatch failure mode as Google. An
"invalid scope" error means `meeting:write:meeting` wasn't added (or wasn't
saved) on the app's Scopes tab.

## Verifying it worked

After setting either integration, go to **Settings → Integrations** in the
app and connect the account. A successful connection creates a
`connectedCalendar` (Google) or `videoConnection` (Zoom) record with an
encrypted token. If the connect flow fails, double-check the redirect URI
matches `APP_URL` exactly (protocol, host, no trailing slash
mismatch) and that `ENCRYPT_KEY` is set.

## Address autocomplete (bonus, not really an "integration")

The in-person location field's autocomplete defaults to free, keyless
**[Photon](https://github.com/komoot/photon)** (OpenStreetMap-based) — no
setup required. For richer address/building-level coverage, set a
[Google Places](https://developers.google.com/maps/documentation/places/web-service/overview)
or [Mapbox](https://docs.mapbox.com/api/search/geocoding/) key — see
`ENVIRONMENT.md` §6. This is entirely optional; Photon is fine for most
deployments.
