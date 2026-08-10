/**
 * Human-readable copy for Better Auth error codes.
 *
 * Client-safe (no env, no db) so it can be shared by the login form, the signup
 * form and any server-rendered `?error=` banner.
 */

import { MAX_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH } from "@/config/platform";

const MESSAGES: Record<string, string> = {
  account_not_linked:
    "An account already exists with this email but isn't linked to Google. Sign in with your password or a magic link first, then verify your email to enable Google sign-in.",
  ACCOUNT_NOT_LINKED:
    "An account already exists with this email but isn't linked to Google. Sign in with your password or a magic link first, then verify your email to enable Google sign-in.",
  EMAIL_NOT_VERIFIED:
    "Please verify your email address before signing in. Check your inbox for the verification link.",
  INVALID_EMAIL_OR_PASSWORD: "Incorrect email or password.",
  INVALID_PASSWORD: "Incorrect current password.",
  INVALID_TOKEN: "This link is invalid or has expired. Request a new one.",
  TOKEN_EXPIRED: "This link has expired. Request a new one.",
  PASSWORD_TOO_SHORT: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
  PASSWORD_TOO_LONG: `Password must be at most ${MAX_PASSWORD_LENGTH} characters.`,
  signup_disabled: "Registration is disabled on this instance.",
};

export function authErrorMessage(
  code: string | null | undefined,
  fallback = "Something went wrong. Please try again."
): string {
  if (!code) {
    return fallback;
  }
  return MESSAGES[code] ?? fallback;
}
