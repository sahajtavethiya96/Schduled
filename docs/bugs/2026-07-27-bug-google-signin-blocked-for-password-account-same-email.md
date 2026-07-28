# Bug: "Continue with Google" fails for a user who first signed up with the same email via password

**Found:** 2026-07-27, reported by the user — they created their account the first time (via the `/setup` first-admin wizard, a password sign-up), signed out, then tried "Continue with Google" using the exact same email address. It failed.

**Where:** `lib/auth.ts`'s `databaseHooks.user.create.before` hook, and Better Auth's built-in account-linking gate (`node_modules/better-auth/dist/oauth2/link-account.mjs`, `handleOAuthUserInfo`).

**How it was found:** Traced Better Auth's actual account-linking logic in the installed v1.6.18 package. `link-account.mjs` blocks implicit linking of a new OAuth identity to an existing user unless (among other things) `dbUser.user.emailVerified` is already `true` — `requireLocalEmailVerified` defaults to `true` specifically to stop an attacker from pre-registering an unverified account at someone else's email and hijacking their later OAuth login.

Checked how `emailVerified` gets set in this codebase for each sign-up method:
- **Magic link** (`better-auth/dist/plugins/magic-link/index.mjs`): sets `emailVerified: true` at creation, and re-flips it to `true` on every subsequent verify.
- **Google** (first sign-up): Google's own `email_verified` flows straight through.
- **Password sign-up / `/setup`'s `createFirstAdmin()`** (`auth.api.signUpEmail()`): the schema default is `email_verified: false` (`db/schema/auth.ts`), and **nothing in this codebase ever flips it to `true`** — `lib/auth.ts`'s `emailVerification.sendVerificationEmail` is wired only for the change-email flow (the code comment there says as much: *"this app never triggers plain signup-verification"*).

Confirmed directly against the live DB: the one existing user (`user@example.com`, created via the `/setup` wizard's password sign-up) had `email_verified = false` and only a single `credential` (password) row in `account` — exactly the state that trips Better Auth's `requireLocalEmailVerified` gate on a later Google attempt.

**Root cause:** Password sign-up is the only sign-up path in this app with no built-in proof of email ownership (magic link requires clicking a link sent to the inbox; Google vouches for the address itself). Since this app deliberately has no separate "verify your email" flow for plain signups, any user who signs up via password — including the very first admin, created by the `/setup` wizard — is permanently stuck with `emailVerified = false`, with no way to ever change it themselves. That permanently blocks them from linking Google (or any other OAuth provider) to that same email later, even though the account creation itself was already fully gated/trusted (see `databaseHooks.user.create.before`'s `ALLOW_PUBLIC_SIGNUP` / `INITIAL_ADMIN_EMAIL` / one-time-bootstrap checks).
