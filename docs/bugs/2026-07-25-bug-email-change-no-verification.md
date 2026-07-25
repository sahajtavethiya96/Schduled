# Bug: account email can be changed with zero verification

**Found:** 2026-07-25, reported by the user via screenshot of the Profile
page — updating Email Address showed "Email updated. Use the new email for
future sign-ins." immediately, with no confirmation step of any kind.

**Where:** `app/actions/profile.ts`'s `changeEmailAction` (server action),
wired to the Email Address card in
`components/profile/account-forms.tsx`'s `AccountIdentityForms`.

**What's broken:** `changeEmailAction` did a raw Drizzle
`UPDATE "user" SET email = ...` directly against the database, entirely
bypassing Better Auth. It required no password, no OTP, no confirmation
email to either the old or new address — only a uniqueness check
(`SELECT ... WHERE email = newEmail`). Since this app's magic-link
authentication uses `user.email` as the literal sign-in credential (per the
card's own description text: "Magic-link authentication uses this email as
the account identity"), this is equivalent to letting a session change its
own login credential with no proof of ownership of the new address at all.

**How it was found:** User tested the Profile page directly and saw the
email update take effect with no verification step.

**Root cause, and why it's worse than it looks:** Better Auth ships a
guarded `/change-email` endpoint specifically for this
(`node_modules/better-auth/dist/api/routes/update-user.mjs`) that is
**disabled by default** and refuses to run at all unless
`user.changeEmail.enabled` and an email-verification callback are
explicitly configured — Better Auth's own secure-by-default design would
have blocked exactly this scenario. `lib/auth.ts` never configured any of
`user.changeEmail`, `emailVerification`, or `sendChangeEmailConfirmation` —
the app sidestepped Better Auth's safety net entirely by hand-rolling a raw
`UPDATE` instead.

Two concrete additional defects this caused, found while investigating:
1. **Stale magic-link tokens create duplicate accounts.** Magic-link
   verification tokens store the requested email as a plain string
   (`node_modules/better-auth/dist/plugins/magic-link/index.mjs`). If a user
   requests a magic link, then changes their email via Profile before
   clicking it, the stale link's `findUserByEmail(oldEmail)` finds nothing
   (the row now has the new email) — and since `disableSignUp` was never set
   on the magic-link plugin, Better Auth **silently creates a brand-new user
   account** bound to the old address instead of failing. Two accounts now
   exist for what the user thought was one identity.
2. **Inconsistent with the rest of the codebase's own security bar.**
   Changing an *existing* password already correctly requires the current
   password via `authClient.changePassword({ currentPassword, ... })`
   (`components/profile/password-card.tsx`), and account deletion requires
   an emailed OTP (`sendDeleteCodeAction`/`deleteAccountAction`). Email
   change was the one sensitive identity action with zero proof-of-ownership
   requirement, despite email being the actual sign-in credential.
