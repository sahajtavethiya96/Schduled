# Plan: Fold the Orbit Admin Panel into the Regular Dashboard

**Status:** Draft v3 — planning only, no code changed yet. Finalized scope.
**Branch:** `remove-admin-panel-plan`

**Decisions locked in:**
1. **Single-admin model.** No owner/admin/multi-tier hierarchy. Stays exactly as today: `role: "user" | "admin"` on the same `user` table, one admin, no promote/demote UI.
2. **No invite system.** Dropped entirely from this plan. The deployment model is one admin = the only user — nothing to invite. Account creation keeps working exactly as it does today: the `/setup` wizard for the first-run admin, `INITIAL_ADMIN_EMAIL` auto-promotion, and ordinary signup (governed by the existing `ALLOW_PUBLIC_SIGNUP` toggle, unchanged). Nothing new to build here.
3. **Newsletter/Subscribers removed entirely** — not just the admin viewer. The public footer signup form, the API route, the DB table, and the admin list all get deleted. Not relocated anywhere.

---

## 1. Why

Schduled currently ships with two separate experiences on one account: `/dashboard` (the regular app) and `/orbit` (a fully separate admin panel — own layout, own sidebar, own login page). For a self-hosted, single-admin deployment, that separation is unnecessary overhead. **Goal: one unified app.** Admin-only screens become an admin-gated section of the same Settings area, instead of a separate panel with its own login, layout, and URL space.

---

## 2. What already makes this feasible

- **An admin account is already a full regular user** — `role: "admin"` is just a column on the same `user` row. Admins already use `/dashboard` like anyone else; the sidebar already has a conditional "Admin Panel" link, and Orbit already has a "Back to Dashboard" link. This is a relocation, not a new access model.
- **The admin login page is cosmetic** — `/orbit/login` authenticates through the same Better Auth client as `/login`; only the post-login redirect differs.
- **The audit log is written by ordinary user actions constantly** (login, profile edits, availability changes, event-type CRUD), not just admin actions — Orbit is only the viewer, and per your direction this viewer needs full parity, not a trim-down.
- **The job queue viewer isn't just observability** — its retry buttons are the only manual way to un-stick a failed background job. Also full parity, not trimmed.

---

## 3. Full list of changes

### Removed entirely (not relocated anywhere)
- `app/(orbit-public)/orbit/login/` — the separate admin login page and its form component
- `app/api/orbit/verify/route.ts` — the admin-login post-auth role check (no longer needed, one login for everyone)
- `app/(orbit)/orbit/page.tsx` — the Orbit "platform overview" home page (its useful bits — queue/email health — already live in the relocated Background Jobs tab)
- `app/(orbit)/layout.tsx` — the separate admin shell/layout
- `components/admin/admin-sidebar.tsx`, `admin-mobile-nav.tsx`, `orbit-page-header.tsx` — Orbit-only shell components
- `app/(orbit)/orbit/subscribers/page.tsx`, `components/orbit/subscribers-table.tsx`, `app/actions/subscribers.ts` — admin subscriber viewer
- `app/api/newsletter/route.ts` — the public signup endpoint
- The `NewsletterForm` block inside `components/landing/landing-footer.tsx` — the footer signup form itself
- `newsletterSubscriber` table (`db/schema/platform.ts`) — dropped via a new migration
- `middleware.ts`'s `ADMIN_PREFIXES`/`/orbit` handling
- The duplicated admin-only password card at `/orbit/settings#account` (already exists properly at `/profile/security` — this was always a duplicate, see §2 of the previous draft)
- The duplicated admin-only appearance picker at `/orbit/settings#appearance` (folding into the existing header `ThemeToggle`, which gains a "System" option it doesn't currently offer)

### Relocated (full functionality kept, only the UI moves)

| From | To | Notes |
|---|---|---|
| `/orbit/users` + `/orbit/users/[id]` | `/settings/users` (admin-only) | User list, suspend/ban/delete, bulk actions, impersonate, per-user detail — unchanged |
| `/orbit/audit` | `/settings/audit` (admin-only) | Full filterable/exportable audit log viewer — unchanged |
| `/orbit/queues` + `/orbit/email` | `/settings/jobs` (admin-only) | Merged into one "Background Jobs" tab — queue monitor + manual retry + email outbox/delivery events, all unchanged |
| `/orbit/settings` (Sign-in Methods, Platform Health, General, Integrations, Security) | `/settings/platform` (admin-only) | "System Settings" — unchanged, minus the two duplicated items removed above |

### New Settings structure

```
/settings
  Regular users:
    /profile, /security                    (existing, unchanged)
    /my-link, /calendars, /integrations,
    /communication, /contacts, /cookies      (existing — "Personal Settings" group)
  Admin-only (new location, same functionality):
    /users      — User Management
    /audit      — Audit Logs
    /jobs       — Background Jobs / Queue Management
    /platform   — System Settings
```

### File-level moves
- `components/orbit/*` → new home (e.g. `components/settings-admin/*`), content unchanged
- `app/actions/orbit-users.ts` → `app/actions/users.ts` (drop prefix, logic unchanged)
- `app/actions/orbit-queues.ts`, `orbit-settings.ts`, `orbit-audit.ts` → same, prefix dropped
- Sidebar: `components/scaffold/sidebar-nav.tsx`'s existing `isAdmin` conditional expands from one link to 4 entries under a Settings "Admin" heading

### Docs/config updates needed afterward
- `CLAUDE.md` — "Auth" and "Project Structure" sections currently describe `app/(orbit)/` as the admin panel
- `SELF-HOSTING.md`, `ENVIRONMENT.md`, `docs/self-hosting/*` — references to `/orbit/login`

---

## 4. What must NOT break

- Audit logging itself (`lib/audit.ts`, ~15 call sites across ordinary user actions) — untouched
- Sign-in method enforcement (`getEffectiveSignInMethods()`, read by the public `/login` page) — must not change behavior when its toggle UI moves
- Queue retry actions (`retryJobAction`, `retryFailedJobsAction`) — preserved exactly
- Impersonation's audit trail (`recordImpersonationAction`) — preserved exactly
- The existing `/setup` wizard and `INITIAL_ADMIN_EMAIL` bootstrap — untouched, unrelated to this change

---

## 5. Scope explicitly cut from earlier drafts

- ~~Invite-only user creation~~ — not needed, dropped entirely
- ~~`ALLOW_PUBLIC_SIGNUP` default flip~~ — not needed, no change to signup behavior
- ~~Owner/Admin multi-tier role model~~ — staying single-admin, no change to `config/platform.ts` roles
- ~~Newsletter/Subscribers as a relocated admin tab~~ — removed entirely instead, not relocated
