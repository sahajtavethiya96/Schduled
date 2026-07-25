# Solution: raw Better Auth error text shown when signup is blocked

**Fixed:** 2026-07-25

**Files changed:** `app/(auth)/_components/auth-form.tsx` only — no backend
gating logic changed.

**What changed:**
- `onPasswordSubmit()` now checks `result.error.code === "FAILED_TO_CREATE_USER"`
  before falling back to the generic message, and sets `unauthorized` instead
  of `error` when it matches. Traced through the installed `better-auth` +
  `better-call` + `@better-auth/core` source to confirm this exact code is
  only ever produced when `databaseHooks.user.create.before` returns `false`
  (`createWithHooks` returns `null` only on an explicit `false`; a genuine
  creation failure — e.g. a DB error — would throw and never reach this
  specific `APIError`), so no `allowPublicSignup` check is needed for this
  path — the code alone is an exclusive signal.
- Both `signIn.magicLink()` call sites now pass `errorCallbackURL: "/login"`,
  matching the Google OAuth call sites. When the magic-link `/verify` GET
  handler's own `createUser()` call is blocked by the same hook, it already
  redirected gracefully with `?error=failed_to_create_user` — it just wasn't
  pointed at `/login` before, so it fell back to Better Auth's default target.
- Added `BLOCKED_SIGNUP_REDIRECT_ERRORS` (`unable_to_create_user` for Google,
  `failed_to_create_user` for magic link — the two redirect-error strings
  Better Auth's source actually emits for a blocked `user.create`), and the
  effect that reads `?error=` now only shows the denial screen when the
  value is in that set **and** `allowPublicSignup` is `false`. Any other
  error value, or either of those two values while signup is actually open
  (which would only ever mean a genuine unrelated failure, since the hook
  never blocks in that state), falls through to a generic retry message
  instead.
- Unified the denial screen's copy (previously Google-specific wording) to
  the exact required text: title "Access denied", body "Your account isn't
  authorized to access this Schduled instance. Only existing accounts can
  sign in. Please contact the administrator if you believe this is an
  error." — shown identically for password sign-up, first Google login, and
  first magic-link login.

**Why this fixes the root cause:** Every account-creation entry point now
converts its respective Better Auth rejection signal (an API error `code` for
the synchronous password flow, a redirect `error` query value for the two
out-of-band flows) into the same `unauthorized` UI state, instead of only the
Google path having that handling. Existing users are unaffected in all three
flows — none of these checks fire for a sign-in that doesn't hit
`user.create` at all.

**Known residual limitation:** `unable_to_create_user`/`failed_to_create_user`
are Better Auth's internal, unversioned error strings and could in principle
also represent a genuine unrelated failure during account creation (e.g. a
DB outage mid-insert) rather than our intentional gate. This is inherent to
how Better Auth's OAuth/magic-link catch-all error handling works and isn't
fixable from the client alone without changing backend error surfacing
(explicitly out of scope per the request). The `allowPublicSignup` gate
minimizes the blast radius: on an *open* instance these strings can only ever
mean a real failure, so the generic message is always shown there.

**How it was verified:** `pnpm tsc --noEmit` — clean. Verified `result.error.code`
is a real top-level runtime field (not just a TS type artifact) by reading
`@better-fetch/fetch`'s compiled output, which spreads the parsed JSON error
body — `{message, code}` from `@better-auth/core`'s `APIError.from()` — directly
onto the returned `error` object. Not live-tested against a running instance
(would require the user to click through all three sign-up flows against a
closed instance) — verified by full source-level tracing of each error path
instead.
