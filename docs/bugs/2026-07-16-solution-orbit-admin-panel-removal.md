# Solution: fold the Orbit admin panel into `/settings`, remove newsletter/subscribers

**Fixed:** 2026-07-16

**Plan:** `docs/ADMIN-PANEL-REMOVAL-PLAN.md` (finalized v3) is the full locked-in scope this change implements — decisions on single-admin model, no invite system, and full (not trimmed) removal of newsletter/subscribers were made there before any code changed.

## What changed

### Removed entirely
- `app/(orbit)/` (layout, overview page, users/users detail, audit, queues, email, settings) and `app/(orbit-public)/orbit/login/` (page + form) — deleted outright, not archived.
- `app/api/orbit/verify/route.ts` — the admin-login-only post-OAuth role check; no longer needed since there's one login for everyone.
- `components/admin/` (`admin-sidebar.tsx`, `admin-mobile-nav.tsx`, `orbit-page-header.tsx`) — the panel's own shell.
- The standalone "Admin Panel" shortcut link in `components/scaffold/sidebar-nav.tsx`.
- `middleware.ts`'s `ADMIN_PREFIXES`/`/orbit` branch and the `/api/orbit/verify` public-prefix entry.
- The duplicated password card and appearance picker on the old `/orbit/settings` page (real versions already existed at `/profile/security` and the header `ThemeToggle`).
- The newsletter/subscribers feature end-to-end: `app/api/newsletter/route.ts`, `app/(orbit)/orbit/subscribers/page.tsx`, `components/orbit/subscribers-table.tsx`, `app/actions/subscribers.ts`, the `NewsletterForm` block + its imports in `components/landing/landing-footer.tsx` (footer grid also collapsed from 4 columns to 3), and the `newsletterSubscriber` table (`db/schema/platform.ts`) dropped via new migration `db/migrations/0016_drop_newsletter_subscriber.sql`.

### Relocated, full functionality preserved (not trimmed)
| From | To |
|---|---|
| `/orbit/users` + `/orbit/users/[id]` | `/settings/users` + `/settings/users/[id]` |
| `/orbit/audit` | `/settings/audit` |
| `/orbit/queues` + `/orbit/email` | `/settings/jobs` — merged into two tabs ("Queues", "Email") via new `components/settings-admin/jobs-tabs.tsx`, backed by a single `app/(app)/settings/jobs/page.tsx` that fetches both tabs' data server-side |
| `/orbit/settings` (minus the two duplicated sections) | `/settings/platform` |

File-level moves: `components/orbit/*` → `components/settings-admin/*`; `app/actions/orbit-users.ts` → `users.ts`, `orbit-audit.ts` → `audit.ts`, `orbit-queues.ts` → `queues.ts`, `orbit-settings.ts` → `platform-settings.ts` (renamed, not `settings.ts`, to avoid colliding with the existing regular-user settings actions file). Every relocated page now calls `requireAdmin()` directly (previously enforced once at the shared `(orbit)` layout level); every relocated action still calls `requireAdmin()` unchanged. All `revalidatePath`/`redirect` targets inside those actions were updated from `/orbit/*` to the new `/settings/*` paths.

### Settings nav + theme
- `app/(app)/settings/_components/settings-nav.tsx` (used by both `/settings` and `/profile`) now accepts an `isAdmin` prop; when true, an "Admin" group (User Management, Audit Logs, Background Jobs, System Settings) renders below the regular personal-settings links, on both the desktop sidebar and the mobile pill nav.
- `app/(app)/settings/layout.tsx` is now an async server component that fetches the caller's role fresh from the DB (mirroring the same pattern `app/(app)/layout.tsx` already used) and passes `isAdmin` down.
- `components/theme-toggle.tsx` rewritten from a single light/dark toggle button to a shadcn `DropdownMenu` with Light/Dark/System options, absorbing the old orbit-only appearance picker's functionality.

### Docs
`CLAUDE.md`, `SELF-HOSTING.md`, `ENVIRONMENT.md`, `README.md`, `cloud.md`, `docs/commands.md`, `docs/project-structure.md`, `docs/self-hosting/installation.md` — every reference to a separate Orbit panel or admin login updated to describe the admin-only tabs living inside `/settings`. A handful of stale in-code comments (`app/post-auth/page.tsx`, `app/actions/auth.ts`, `lib/worker/handlers/email-send.ts`, `scripts/make-admin.ts`) and two user-facing ban-reason strings in `app/actions/users.ts` ("Disabled by Orbit admin" → "Disabled by admin") were also cleaned up. The `orbit.*` audit-log **action name** strings (e.g. `orbit.user_suspended`) were deliberately left unchanged — per the plan, audit logging itself must keep working exactly as it does today; those are internal taxonomy keys, not UI text.

## Why this fixes the root cause

An admin is now indistinguishable from any other authenticated user until they open Settings, where four extra tabs appear based on a DB-fresh role check — no separate login, no separate layout, no separate URL space. This matches the actual trust model (`role` is a column, not a separate identity) instead of a parallel-app structure that only made sense for a multi-tenant product this app isn't.

## Bugs caught and fixed during verification (not in the original plan)

Two independent review passes were run against the diff. The first found nothing. The second, briefed specifically to look at angles like dark mode, mobile nav, and the new Jobs-tab merge, found three real layout/state bugs — all sharing one root cause: components extracted from the old **standalone, single-column** `/orbit` layout carried spatial assumptions that don't hold in the **new nested** `app shell → /settings layout → page` structure:

1. **`app/(app)/settings/platform/_components/sign-in-methods-card.tsx`** — the sticky "Save changes" bar used `fixed ... md:left-60`, sized to clear the old dedicated `AdminSidebar` (`w-60`) exactly. In the new layout there's an *additional* local `w-48` settings nav + `gap-8` between the app sidebar and the content column, so the bar rendered on top of the new Admin nav links. Fixed by switching from `fixed` (viewport-relative, requires guessing every ancestor's width) to `sticky bottom-0` (tracks its own container's natural width/offset — no guessing needed).
2. **`app/(app)/settings/platform/_components/section-nav.tsx`** — the sticky section-pills bar used a `-mx-4 md:-mx-8` / `px-4 md:px-8` "bleed to the edge, then re-pad" trick sized to cancel the old orbit layout's `p-4 md:p-8` main padding. The new app shell uses different padding (`px-4 md:px-6`) and adds the same local nested settings nav, so the negative margin over-bled into the local Admin sidebar on every scroll. Fixed by removing the bleed trick entirely — the component's direct parent (`min-w-0 flex-1` in `settings/layout.tsx`) has no padding of its own to cancel, so it just needed to be a normal `sticky top-0` box.
3. **`components/settings-admin/jobs-tabs.tsx`** — Radix `Tabs` was used uncontrolled (`defaultValue={defaultTab}`, only click-driven `onValueChange` updated state). Browser Back/Forward changes the `?tab=` URL and re-fetches server data, but `defaultValue` only applies on mount, so the *visible* active tab could desync from the address bar after a Back/Forward navigation. Fixed with `key={defaultTab}` on the `Tabs` root, forcing a clean remount (and correct resync) whenever the URL-derived tab changes for any reason, not just a click.

## How it was verified

Live, not just typechecked:
- `tsc --noEmit` clean (after clearing a stale, gitignored `.next/dev/types/routes.d.ts` build artifact that was corrupting an interim check — unrelated to this diff).
- `vitest run` — 23/23 existing tests pass, none of which touch this area.
- `next build` (full production build, twice — once before and once after the three layout fixes) — confirms the exact final route table: `/settings/{users,audit,jobs,platform}` and `/settings/users/[id]` present; no `/orbit*` route, no `/api/newsletter` route, anywhere in the build output.
- A disposable test admin account (never the real `INITIAL_ADMIN_EMAIL` account) was created, promoted to `role: "admin"` in the DB, driven end-to-end with Playwright against a live dev server, then deleted afterward. 44 automated checks passed across two rounds, covering: the landing footer has no newsletter form, every old `/orbit*` path and `/api/newsletter` now falls through to the ordinary "this page doesn't exist" booking-catch-all (not a leaked admin panel), no stray "Admin Panel" sidebar link, all four admin nav links present for an admin and absent for a non-admin, each relocated page renders and lists real data, the Jobs tab merge switches content and keeps `?tab=email` in the URL through filter/pagination changes *and* through browser Back/Forward, the platform page has Sign-in Methods/Health sections but no duplicate Account/Appearance sections, the `ThemeToggle` dropdown offers Light/Dark/System, and a live role-demotion test (flip the test account's DB role mid-session, confirm `requireAdmin()` immediately redirects `/settings/users` → `/dashboard` and hides the admin nav group, then flip it back and confirm both reappear) confirmed the access-control gate is DB-fresh per request, not just session-cached.
- Two independent fresh-eyes reviews of the full diff (separate subagent passes, no shared context) — the first found zero defects; the second (described above) found and led to the fix of the three layout bugs, then a third targeted live-verification pass confirmed all three fixes hold and re-ran the full 36-check suite to confirm no regression.

**Incidental fix, unrelated to this plan:** while setting up a live admin session for verification, the real `INITIAL_ADMIN_EMAIL` account (`admin@example.com`) was found with `role: "owner"` in the DB instead of `"admin"` — a pre-existing data bug (unrelated to this change) that would have silently locked that account out of every `requireAdmin()`-gated page. Fixed via the project's own `pnpm make:admin` script, not a manual DB edit.
