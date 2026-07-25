# Solution: account email can be changed with zero verification

**Fixed:** 2026-07-25

**Files changed:**
- `lib/auth.ts` — configured Better Auth's built-in `emailVerification` and
  `user.changeEmail` options (previously entirely absent).
- `lib/email/components/change-email-verification.tsx` (new) — the
  verification email's React-email template, matching the existing
  magic-link/reset-password templates' teal styling.
- `lib/email/templates/change-email-verification.ts` (new) — the
  html+text wrapper, same pattern as `magic-link.ts`/`reset-password.ts`.
- `components/profile/account-forms.tsx` — the Email Address form now calls
  `authClient.changeEmail()` (Better Auth's real client API) instead of
  posting to a raw-DB server action.
- `app/actions/profile.ts` — deleted `changeEmailAction` entirely (fully
  replaced, no longer referenced anywhere).

**What changed:** Enabled Better Auth's guarded `/change-email` endpoint
properly:
```ts
emailVerification: {
  sendVerificationEmail: async ({ user, url }) => {
    // user.email is already the NEW address at this point
    const { html, text } = await changeEmailVerificationTemplate({
      newEmail: user.email,
      verificationUrl: url,
    });
    await enqueueEmail({ to: user.email, subject: `Confirm your new ${PRODUCT_NAME} email`, html, text });
    await audit({ action: "auth.change_email_verification_sent", ... });
  },
  afterEmailVerification: async (user) => {
    // Fires once the link is clicked and the email is actually applied
    await audit({ action: "profile.email_updated", ... });
  },
},
user: {
  changeEmail: { enabled: true },
},
```
`updateEmailWithoutVerification` was deliberately left unset (defaults to
`false`), so every change — regardless of the account's current
`emailVerified` state — goes through the verification-link flow rather than
applying immediately. `sendChangeEmailConfirmation` (a second, optional
"also notify the OLD address" step) was deliberately **not** configured —
see Known limitation below.

The client (`account-forms.tsx`) now calls
`authClient.changeEmail({ newEmail, callbackURL: "/profile/profile" })` and
shows "Check your new email address for a confirmation link — your sign-in
email won't change until you click it." on success, matching how
`password-card.tsx` already calls `authClient.changePassword()` instead of
a custom action.

**Why this fixes the root cause:** Traced the actual Better Auth v1.6.18
route source (`update-user.mjs` for `/change-email`,
`email-verification.mjs` for `/verify-email`) to confirm the exact
behavior before wiring it up: the endpoint sends a link to the NEW address;
only when that link is clicked does `/verify-email`'s
`change-email-verification` branch call
`updateUserByEmail(oldEmail, { email: newEmail, emailVerified: true })` —
the email genuinely does not change in the database until ownership of the
new address is proven. This also incidentally closes the stale-magic-link
duplicate-account issue from the bug report for the common case: an
in-flight magic link now keeps resolving against the still-current email
until the new one is actually confirmed, since the DB row isn't touched
until then.

**Known limitations (not fixed here, scoped out deliberately):**
1. **No "notify the old address" step.** Better Auth supports a second
   optional callback, `user.changeEmail.sendChangeEmailConfirmation`, that
   emails the *current* (old) address first, so the true account owner gets
   a heads-up via a channel that's about to be cut off, mirroring how
   `changePassword` uses `revokeOtherSessions: true`. This wasn't added —
   it changes the verification flow into a two-step chain
   (`change-email-confirmation` → `change-email-verification`) that adds
   real complexity to reason about and verify without live browser testing
   (unavailable in this environment), for a defense-in-depth improvement
   beyond the reported defect ("changes with zero verification"). Worth
   adding as a follow-up.
2. **Other sessions on other devices are not revoked** when an email change
   completes, unlike password change's `revokeOtherSessions: true`. Better
   Auth's `/verify-email` endpoint doesn't expose this as a built-in option;
   adding it safely requires identifying and excluding the *verifying*
   session from revocation (so the person who just proved ownership isn't
   immediately logged out), which needs live testing to confirm correct
   before shipping — not attempted here for the same reason as above.
3. The duplicate-account risk from stale magic-link tokens (bug's item #1)
   is narrowed but not eliminated: if a user requests a magic link, changes
   their email, *and then actually confirms* the change (clicks the new
   verification email) before clicking the stale magic-link, the same
   `findUserByEmail(oldEmail)` miss can still occur. Setting
   `disableSignUp` on the `magicLink()` plugin in `lib/auth.ts` would turn
   that into a clean failure instead of a silent duplicate account, but that
   also affects the plugin's behavior for genuinely new users signing up via
   magic link — a separate, deliberate decision outside this fix's scope.

**How it was verified:** `pnpm tsc --noEmit` and `pnpm biome check` (via
`lint`) — both clean. Not live-tested in a browser (no browser/screenshot
tool available in this environment, and forging a session cookie to test
without going through real Google/password/magic-link auth was blocked by
the environment's permission policy) — verified by reading the actual
installed `better-auth` route source end-to-end for both `/change-email`
and `/verify-email` to confirm the exact behavior being configured, rather
than relying on documentation or memory.
