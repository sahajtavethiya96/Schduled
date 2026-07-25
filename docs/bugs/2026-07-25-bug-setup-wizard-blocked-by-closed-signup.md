# Bug: /setup wizard blocked when ALLOW_PUBLIC_SIGNUP=false with no INITIAL_ADMIN_EMAIL

**Found:** 2026-07-25, while implementing existing-users-only Google sign-in
(the `SIGNUP_ENABLED` → `ALLOW_PUBLIC_SIGNUP` rename) and tracing every path
that creates a `user` row to confirm none were missed.

**Where:** `lib/auth.ts`, `databaseHooks.user.create.before`. Surfaces in
`app/actions/setup.ts`'s `createFirstAdmin()`.

**What's broken:** The account-creation gate only exempts an email that
exactly matches `INITIAL_ADMIN_EMAIL`:
```ts
before: async (user) => {
  if (env.ALLOW_PUBLIC_SIGNUP) return;
  const isBootstrapAdmin = env.INITIAL_ADMIN_EMAIL && user.email... === ...;
  if (isBootstrapAdmin) return;
  return false;
},
```
`.env.example` explicitly documents `INITIAL_ADMIN_EMAIL` as optional —
"leave blank to skip and use `pnpm make:admin <email>` manually after signup
instead." But the only way to get that first signup, on an instance with
`ALLOW_PUBLIC_SIGNUP=false`, is the `/setup` wizard (`app/setup/setup-wizard.tsx`
→ `createFirstAdmin()` → `auth.api.signUpEmail()`), which lets the operator
type in *any* email at first run. That call still funnels through this same
hook. With `INITIAL_ADMIN_EMAIL` unset (the documented "skip it" case) and
`ALLOW_PUBLIC_SIGNUP=false`, the hook returns `false` for the wizard's own
account-creation attempt — `createFirstAdmin()`'s `auth.api.signUpEmail()`
call fails, `result?.user?.id` is falsy, and setup errors out with "Failed to
create user account," permanently (there's no other way to create the first
user in that configuration).

**How it was found:** While reviewing every entry point that creates a
`user` row for the sign-in-gating change, traced `redirectToSetupIfNeeded()`
(`lib/setup.ts`) — called from `/login`, `/post-auth`, and the landing page —
which redirects to `/setup` whenever `hasAnyUser()` is `false`, and confirmed
`/setup` is the *only* reachable path to create the first account in that
state (Google/magic-link sign-in aren't reachable pre-bootstrap since those
pages all redirect away). Read `lib/auth.ts`'s hook against that and found no
exemption for "zero users exist yet."

**Root cause:** The gate was written assuming the only two ways to allow a
new account through when signup is closed are "open" (`ALLOW_PUBLIC_SIGNUP`)
or "exact email match" (`INITIAL_ADMIN_EMAIL`) — it didn't account for the
`/setup` wizard as a third, already-existing bootstrap path with its own
independent safety net (`hasAnyUser()` gating on reachability, plus an atomic
re-check-and-delete in `createFirstAdmin()` for concurrent double-submits).
