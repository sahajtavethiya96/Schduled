# Solution: "Continue with Google" fails for a user who first signed up with the same email via password

**Fixed:** 2026-07-27

**Files changed:** `lib/auth.ts` (code fix) — plus a one-off data fix for the already-affected account (no migration; see below).

**What changed:**

`databaseHooks.user.create.before` now returns `{ data: { emailVerified: true } }` instead of a bare pass-through in the two branches that only ever run once signup is already closed (`ALLOW_PUBLIC_SIGNUP=false`):

```ts
if (isBootstrapAdmin) {
  return { data: { emailVerified: true } };
}
...
if (!(await hasAnyUser())) {
  return { data: { emailVerified: true } };
}
```

The `ALLOW_PUBLIC_SIGNUP === true` branch above these (open self-signup) is **untouched** — it still returns a bare pass-through, so password sign-ups created under open registration keep the default `emailVerified: false` and Better Auth's protection stays in place there.

Then, as a one-time data fix (not a schema migration — a single existing row): updated the one already-affected user (`user@example.com`, created via the `/setup` wizard before this fix existed) directly:
```sql
UPDATE "user" SET email_verified = true, updated_at = now() WHERE email = 'user@example.com';
```
The code fix only governs *future* user creation — it can't retroactively fix a row that already exists with `emailVerified = false`, so without this the same account would have stayed stuck even after deploying the code change.

**Why this fixes the root cause without weakening security:** Better Auth's `requireLocalEmailVerified` gate exists to stop an attacker who registered a password account at a victim's email (with no ownership proof) from then hijacking the victim's later OAuth login. That attack requires *open* self-registration — under `ALLOW_PUBLIC_SIGNUP=false` (this deployment's actual setting, and the value CLAUDE.md recommends for self-hosting), `databaseHooks.user.create.before` is *already* the sole gate on who can create an account at all — bootstrap admin, an exact `INITIAL_ADMIN_EMAIL` match, or the one-time first-run `/setup` user. Every account that reaches those branches is already vetted by that same gate, so marking it `emailVerified: true` at creation doesn't introduce a new way in — it just stops the app's own lack of a signup-verification flow from permanently locking that already-trusted user out of linking Google later. If `ALLOW_PUBLIC_SIGNUP` is ever flipped to `true`, new password sign-ups keep the original, safer behavior (`emailVerified: false`) — closing that gap for the open-registration case would need an actual signup-verification-email flow, which is a separate feature, not this bug fix.

**Verified:**
- `pnpm exec tsc --noEmit` — clean.
- Confirmed via the live dev DB, before the fix: the affected user had exactly one `account` row (`provider_id = 'credential'`) and `email_verified = false` — matching Better Auth's block condition precisely.
- Re-traced Better Auth's `handleOAuthUserInfo` block condition (`link-account.mjs`) against the fixed state: with `dbUser.user.emailVerified = true` and a real Google account's `userInfo.emailVerified = true`, every clause of the OR-condition evaluates `false`, so implicit linking now proceeds instead of returning `"account not linked"`.
- Applied the one-time `UPDATE` to the existing affected row and confirmed `email_verified` is now `true`.
- Could not drive an actual Google OAuth consent screen in this environment (needs a real browser + Google account), so the full "click Continue with Google, land back on the dashboard" click-path is unverified live — but the exact server-side gate that was rejecting it has been confirmed closed.
