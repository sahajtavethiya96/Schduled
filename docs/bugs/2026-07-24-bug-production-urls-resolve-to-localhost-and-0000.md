## What's broken

In production, several absolute URLs the app generates resolve to
`http://localhost:3000/...` or `http://0.0.0.0:3000/...` instead of the
configured production domain (`https://schduled.2sc.dev`), even though
`NEXT_PUBLIC_APP_URL=https://schduled.2sc.dev` is set correctly in the
production environment.

Observed symptoms:
- The public booking link shown on the Event Types page (copy-link button,
  "open booking page" arrow icon) and the Live Preview panel
  (`app/(app)/event-types/_components/event-type-card.tsx`,
  `app/(app)/event-types/_components/live-preview.tsx`) render
  `http://localhost:3000/smit/30-min` instead of
  `https://schduled.2sc.dev/smit/30-min`.
- After a successful Google Calendar OAuth connection, the app redirects to
  `http://0.0.0.0:3000/settings/calendars?calendar_connected=1` instead of
  `https://schduled.2sc.dev/settings/calendars?calendar_connected=1`
  (`app/api/integrations/google/callback/route.ts`).
- The same class of bug was present, un-reported, in every other
  server-generated absolute URL: Better Auth's `baseURL` (magic links,
  password resets), the Google/Zoom OAuth redirect_uri construction, all
  transactional email links (`lib/email/templates/*.ts`,
  `lib/email/components/*.tsx`), and every SSR page that builds a booking
  or "connect calendar" link.

## Root cause

Two independent bugs, not one:

**1. `NEXT_PUBLIC_APP_URL` is frozen at Docker build time.** Next.js inlines
`NEXT_PUBLIC_*` env vars into the compiled bundle — both client *and*
server chunks — at `next build` time; it does not read them live from
`process.env` at container runtime like ordinary vars. `Dockerfile`'s
builder stage sets `NEXT_PUBLIC_APP_URL="http://localhost:3000"` as a
placeholder to satisfy `lib/env.ts`'s eager Zod validation during the
build, with a comment claiming "NOT used at runtime... one built image
works for any domain" — true for `DATABASE_URL`/`APP_SECRET` (plain vars,
read live via `process.env`), but **false** for this one. Every reference
to `env.NEXT_PUBLIC_APP_URL` / `process.env.NEXT_PUBLIC_APP_URL` anywhere
in the codebase — client components, server route handlers, the worker's
email templates — was permanently baked to `localhost:3000` in the
production image, regardless of what the real `.env`/`env_file` sets at
container start.

**2. Some OAuth redirects were built from the request, not the config.**
`app/api/integrations/google/route.ts` and
`app/api/integrations/google/callback/route.ts` built their `/login`,
error-fallback, and final success redirects with
`new URL(path, req.url)` — deriving the origin from the incoming request's
Host rather than the configured app URL. Behind the reverse proxy and the
container's `HOSTNAME=0.0.0.0` bind address, this resolves to the internal
address instead of the public domain. Zoom's callback route
(`app/api/integrations/zoom/callback/route.ts`) had already been patched
for this exact failure mode (with an explicit code comment explaining why
`req.url` is unsafe behind a proxy/tunnel), but the fix was never applied
to Google's routes, nor to Zoom's own OAuth-initiating route.

## How it was found

User-reported: booking links opening `localhost:3000` in production, and
the Google Calendar "connected" redirect landing on `0.0.0.0:3000`. A full
repository audit (grep for `localhost`, `0.0.0.0`, `NEXT_PUBLIC_APP_URL`,
`req.url`/`request.url`-based redirects, and every absolute-URL call site)
confirmed there was no single shared `getAppUrl()`/`getBaseUrl()` helper —
~30 call sites each independently read `env.NEXT_PUBLIC_APP_URL` or
`process.env.NEXT_PUBLIC_APP_URL` — and traced both symptoms to the two
root causes above.
