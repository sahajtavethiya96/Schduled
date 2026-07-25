# Bug: raw Better Auth error text shown when signup is blocked

**Found:** 2026-07-25, reported by the user via a screenshot of the
password sign-up form after setting `ALLOW_PUBLIC_SIGNUP=false`.

**Where:** `app/(auth)/_components/auth-form.tsx`, `onPasswordSubmit()`.

**What's broken:** When `databaseHooks.user.create.before` (`lib/auth.ts`)
rejects a password sign-up because the account doesn't already exist and
public signup is closed, Better Auth's `/sign-up/email` endpoint returns a
generic `APIError` with `code: "FAILED_TO_CREATE_USER"` and
`message: "Failed to create user"`. The form rendered that raw message
verbatim (`setError(result.error.message ?? ...)`), so the user saw the
internal Better Auth string "Failed to create user" instead of any
explanation that the instance intentionally doesn't allow new accounts. The
Google-OAuth and magic-link paths (added earlier this session) already had a
dedicated denial screen, but password sign-up did not check for this case at
all — it fell through to the generic error branch.

**How it was found:** User tested the password sign-up form directly against
a closed instance and saw "Failed to create user" rendered in the destructive
error box, and asked for it to be replaced with a proper access-denied UX
covering all three sign-up paths (password, Google, magic link) uniformly.

**Root cause:** The `unauthorized` state and its dedicated UI (added for
Google OAuth) were wired only into the redirect-based `?error=` query-param
handler; `onPasswordSubmit`'s synchronous `result.error` branch had no
equivalent check, so it always fell through to the plain error message path.
