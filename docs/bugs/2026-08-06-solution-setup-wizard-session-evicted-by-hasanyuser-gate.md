# Solution: `/setup` page gate would evict the admin mid-wizard on any later server re-render

**Fixed:** 2026-08-06

**Files changed:** `app/setup/page.tsx`

**What changed:**

```ts
if (!(await getCurrentSession()) && (await hasAnyUser())) {
  redirect("/login");
}
```

replaces the bare `if (await hasAnyUser()) redirect("/login")`. Same fix Kanbanica applied to its own `/setup/page.tsx` for the identical gate.

**Why this fixes the root cause without weakening the gate:** The gate's job is to keep `/setup` reachable only while there's no admin yet, for visitors who aren't already in the middle of creating one. Checking the visitor's own session first means:
- A signed-in visitor (the admin who just ran `createFirstAdmin()` and signed in during this wizard visit) always sees the wizard through to the end, no matter how many times the page re-renders.
- An unauthenticated visitor arriving at `/setup` after setup is already done still gets redirected to `/login`, exactly as before — `hasAnyUser()` is still checked, just gated behind "and you have no session."

There's no new way to reach `/setup` improperly: the only way to have a session at this point is to have gone through `createFirstAdmin()` (which enforces `hasAnyUser()` was false at the time it ran) and signed in.

**Verified:**
- `tsc --noEmit` — clean.
- Reasoned through the two relevant paths: (1) fresh instance, no session, no users → wizard renders, unaffected by this change; (2) admin created mid-visit, session now exists, `hasAnyUser()` now true → gate's `!session` short-circuits to `false`, wizard keeps rendering instead of redirecting. Not yet exercised against a live re-render trigger in this codebase since the new "Configure services" step (added in the same change) uses only client-side `setStep()` transitions, no server actions after account creation — so this fix is prophylactic for now, but removes the trap before anything triggers it.
