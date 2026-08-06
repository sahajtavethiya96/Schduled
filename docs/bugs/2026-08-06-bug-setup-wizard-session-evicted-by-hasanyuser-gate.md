# Bug: `/setup` page gate would evict the admin mid-wizard on any later server re-render

**Found:** 2026-08-06, while adding a "Configure services" step to `app/setup/setup-wizard.tsx` (between the account step and the done step).

**Where:** `app/setup/page.tsx`.

**How it was found:** Cross-checked against Kanbanica (`/home/master/Smit/Kanbanica`, a related project), which hit and fixed the identical bug in its own `/setup/page.tsx` when it added a services step with server-action Save buttons. Schduled's `/setup/page.tsx` had the same vulnerable gate:

```ts
if (await hasAnyUser()) {
  redirect("/login");
}
```

`hasAnyUser()` becomes `true` the moment `createFirstAdmin()` runs partway through the wizard (the "account" step). Next.js re-renders this server component on subsequent navigations/server-action calls during the same visit. Once that happens, the gate re-evaluates, sees a user now exists, and redirects the still-mid-wizard admin to `/login` — even though they're the one who was just created and are already signed in.

**Root cause:** The gate conflated "does an admin exist yet" with "is *this* visitor allowed to see the wizard." Those are different questions once account creation has already happened during the current visit — an authenticated visitor who just created the first admin should still see the rest of the wizard, not get bounced out because the very account they created is now counted by `hasAnyUser()`.

Schduled's current wizard (before this fix) didn't yet trigger a page re-render after `createFirstAdmin()` — it went straight to `router.push("/onboarding")`. But the same file is about to grow a "Configure services" step in between, and any future re-render on `/setup` (a server action, a slow network re-navigation, etc.) would trip this exact trap. Fixing it now removes a latent bug that the new step would otherwise reintroduce.
