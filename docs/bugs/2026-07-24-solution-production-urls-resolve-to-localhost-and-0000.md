## What changed

**New server-only source of truth.** Added `APP_URL` to `lib/env.ts` —
deliberately **not** prefixed `NEXT_PUBLIC_`, so Next.js never inlines it;
it's read live from `process.env` at request time in every runtime
(route handlers, server components, server actions, the worker). Required
in production via a `superRefine` check with a message explaining why;
falls back to `http://localhost:3000` in development if unset.
`NEXT_PUBLIC_APP_URL` stays in the schema (now optional) for backward
compatibility but is no longer read anywhere in app code.

**One central helper**, `lib/get-app-url.ts` — `getAppUrl()` — used by
every server-side absolute-URL call site instead of each file reading
`env.NEXT_PUBLIC_APP_URL` independently:
- `lib/auth.ts` — Better Auth's `baseURL` and `trustedOrigins` (magic
  links, password resets, session cookie `secure` flag).
- `lib/google/client.ts` (new) — a shared `createGoogleOAuthClient()` /
  `googleRedirectUri()`, replacing four independent inline
  `new google.auth.OAuth2(...)` constructions in
  `app/api/integrations/google/route.ts`,
  `app/api/integrations/google/callback/route.ts`,
  `lib/worker/google-calendar-client.ts`, and
  `lib/worker/handlers/calendar-token-refresh.ts`.
- `lib/zoom/client.ts` — `zoomRedirectUri()`.
- All 8 email templates (`lib/email/templates/*.ts`) and all 11 email
  components' logo-URL construction (`lib/email/components/*.tsx`).
- Every SSR page/action building a booking or "connect calendar" link:
  `dashboard/page.tsx`, `profile/profile/page.tsx`,
  `settings/my-link/page.tsx`, `settings/platform/page.tsx`,
  `settings/integrations/page.tsx`, `settings/calendars/page.tsx`,
  `app/actions/settings.ts`, `(landing)/page.tsx`.

**Fixed the `req.url`-based redirects.** `app/api/integrations/google/route.ts`
and `app/api/integrations/google/callback/route.ts` now build every
redirect (`/login`, error fallback, and the final
`calendar_connected=1` success redirect) from `getAppUrl()`, matching the
pattern Zoom's callback route already used. Also applied the same fix to
`app/api/integrations/zoom/route.ts`, which had the identical `req.url`
anti-pattern on its own `/login` and error-fallback redirects.

**Client components no longer read any env var for display URLs.** Added
`hooks/use-app-origin.ts` — `useAppOrigin()` — returning
`window.location.origin`, which is always correct regardless of what was
baked into the bundle at build time. Switched the four client components
that previously read `process.env.NEXT_PUBLIC_APP_URL` directly:
`event-type-card.tsx` (copy-link, "open booking page" arrow),
`live-preview.tsx`, `components/onboarding/step-1-profile.tsx`, and
`components/onboarding/step-5-share-link.tsx` (booking link + QR code).

**Docs.** Updated `.env`, `.env.example`, `Dockerfile`'s build-stage
comment (corrected the now-inaccurate "not used at runtime" claim for
`NEXT_PUBLIC_APP_URL`), `ENVIRONMENT.md`, and the active self-hosting
guides (`SELF-HOSTING.md`, `docs/self-hosting/{configuration,installation,
integrations}.md`) to document `APP_URL` as the required production
variable in place of `NEXT_PUBLIC_APP_URL`.

## Why this fixes the root cause

`APP_URL` is never touched by Next.js's `NEXT_PUBLIC_*` build-time
inlining, so the value from `env_file`/`.env` at container start is always
what the running server actually uses — the same Docker image can be
redeployed to a different domain and immediately pick up the right value,
restoring the "one built image works for any domain" property the
Dockerfile's original comment claimed but that `NEXT_PUBLIC_APP_URL`
couldn't actually deliver. Adding it as a **required-in-production** field
(rather than a silent fallback) means a misconfigured deploy fails loudly
at boot with an actionable message, instead of silently serving wrong URLs
in production. Routing every OAuth redirect through `getAppUrl()` instead
of `req.url` removes the reverse-proxy/internal-bind-address dependency
that produced the `0.0.0.0:3000` redirect. Client components using
`window.location.origin` are correct by construction — there's no env
value to freeze in the first place.

## How it was verified

- `tsc --noEmit` passes clean.
- Scripted `getAppUrl()` against four env configurations via `tsx`:
  dev with nothing set → falls back to `http://localhost:3000`;
  production with `APP_URL` set → returns it; production with only the
  legacy `NEXT_PUBLIC_APP_URL` set → **throws** at boot with the new
  validation message (proving the guard that prevents this bug from
  silently recurring); production with both set → `APP_URL` wins.
- `grep -rn "NEXT_PUBLIC_APP_URL"` across `app/`, `lib/`, `components/`,
  `hooks/` confirms zero remaining reads outside the schema declaration
  and the documented legacy fallback in `get-app-url.ts`.
- `pnpm vitest run`: 19/23 tests pass; the 4 failures are a pre-existing,
  unrelated `rate-limit.test.ts` suite failing on `ECONNREFUSED` because
  no local Postgres is running in this environment — confirmed
  pre-existing by stashing all changes and re-running the same lint/test
  commands against the original code.
- `biome check` on every new/edited core file (`get-app-url.ts`,
  `use-app-origin.ts`, `google/client.ts`, `auth.ts`, `zoom/client.ts`,
  `env.ts`) — fixed the two real issues it found (an if/else inversion and
  a formatting nit); the remaining errors it flagged in
  `calendar-token-refresh.ts` were confirmed pre-existing (present before
  this change, in code this fix didn't touch) via `git stash`.

## Remaining places that need attention (not code — deployment)

The production `.env`/`env_file` must add `APP_URL=https://schduled.2sc.dev`
before the next deploy — the app will refuse to boot in production without
it (by design). `NEXT_PUBLIC_APP_URL` can be left as-is or removed; it's no
longer read anywhere.
