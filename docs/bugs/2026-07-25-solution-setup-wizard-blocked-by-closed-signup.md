# Solution: /setup wizard blocked when ALLOW_PUBLIC_SIGNUP=false with no INITIAL_ADMIN_EMAIL

**Fixed:** 2026-07-25

**Files changed:** `lib/auth.ts`

**What changed:** Added a third exemption to `databaseHooks.user.create.before`,
after the `ALLOW_PUBLIC_SIGNUP` and `INITIAL_ADMIN_EMAIL` checks: if
`hasAnyUser()` (imported from `lib/setup.ts`, already used to gate
`/setup`'s reachability) returns `false`, the creation is allowed through
unconditionally.
```ts
if (!(await hasAnyUser())) {
  return;
}
return false;
```

**Why this fixes the root cause:** `/setup` is unreachable once any user
exists (`redirectToSetupIfNeeded()` is called from every unauthenticated
entry point), and `createFirstAdmin()` already re-checks and atomically
deletes the loser on a concurrent double-submit (see the
`2026-07-14-*-first-admin-race-condition` bug/solution pair). So gating this
exemption on "zero users exist" rather than on a specific pre-configured
email is safe — it can only ever apply to that one first-run creation, not to
an attacker walking in later, since by definition a user exists after that
point and the check flips to `false` for everyone else. This closes the gap
without weakening `ALLOW_PUBLIC_SIGNUP=false`'s guarantee for every
subsequent sign-in attempt (Google, magic link, or password).

**Verified:** `pnpm tsc --noEmit` — clean. Not live-tested against a wiped
database (would require resetting the local `user` table); verified by
tracing the exact call path (`app/(auth)/login/page.tsx` /
`app/(landing)/page.tsx` / `app/post-auth/page.tsx` → `redirectToSetupIfNeeded()`
→ `/setup` → `setup-wizard.tsx` → `createFirstAdmin()` →
`auth.api.signUpEmail()` → `databaseHooks.user.create.before`) and confirming
`hasAnyUser()` (`SELECT id FROM user LIMIT 1`) is the same check already
gating `/setup`'s own reachability, so the two are guaranteed consistent.
