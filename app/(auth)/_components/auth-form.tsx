"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { type FormEvent, Suspense, useEffect, useState } from "react";
import {
  CircleNotch,
  Envelope,
  Eye,
  EyeSlash,
  GoogleLogo,
  LockKey,
  LockSimple,
  PaperPlaneTilt,
  Prohibit,
  ShieldCheck,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Logo } from "@/components/logo";
import { canSignInByEmail } from "@/app/actions/auth";
import { MIN_PASSWORD_LENGTH } from "@/config/platform";
import { authClient, signIn, signUp, useSession } from "@/lib/auth-client";
import { passwordComplexityError } from "@/lib/password";

// Better Auth's redirect-based flows (Google OAuth callback, magic-link
// verify) surface a rejected databaseHooks.user.create.before hook as one of
// these exact ?error= values — confirmed by reading the installed
// better-auth source (oauth2/link-account.mjs's catch-all around
// createOAuthUser turns a null/blocked user into "unable to create user",
// spaces replaced with underscores in the redirect; the magic-link plugin's
// verify handler does the equivalent "failed_to_create_user" directly). Both
// strings can, in principle, also come from a genuine unrelated failure
// during account creation — gated below on allowPublicSignup being false, so
// an open instance never mislabels a real error as "access denied".
const BLOCKED_SIGNUP_REDIRECT_ERRORS = new Set([
  "unable_to_create_user",
  "failed_to_create_user",
]);
const GENERIC_AUTH_ERROR = "Something went wrong signing in. Please try again.";

interface AuthFormProps {
  allowPublicSignup: boolean;
  googleEnabled: boolean;
  passwordEnabled: boolean;
  magicLinkEnabled: boolean;
}

export function AuthForm(props: AuthFormProps) {
  return (
    <Suspense fallback={null}>
      <AuthFormInner {...props} />
    </Suspense>
  );
}

type Mode = "magic-link" | "password-signin" | "password-signup" | "forgot-password";

function AuthFormInner({ allowPublicSignup, googleEnabled, passwordEnabled, magicLinkEnabled }: AuthFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, isPending } = useSession();
  // At least one method is always enabled (enforced admin-side). Password is
  // the primary method; fall back to magic link, else an email form isn't shown
  // at all (Google-only deployment).
  const hasFormMethod = passwordEnabled || magicLinkEnabled;
  const [mode, setMode] = useState<Mode>(passwordEnabled ? "password-signin" : "magic-link");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [unauthorized, setUnauthorized] = useState(false);
  const [sent, setSent] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const rawNext = searchParams.get("next");
  // Only same-origin paths: a single leading slash NOT followed by another
  // slash or backslash. Rejects protocol-relative ("//evil.com") and
  // backslash ("/\evil.com") targets that would otherwise be an open redirect.
  const safeNext =
    rawNext && /^\/(?![/\\])/.test(rawNext) ? rawNext : "/post-auth";

  useEffect(() => {
    if (session) {
      router.replace("/post-auth");
    }
  }, [router, session]);

  useEffect(() => {
    const redirectError = searchParams.get("error");
    if (!redirectError) return;

    if (!allowPublicSignup && BLOCKED_SIGNUP_REDIRECT_ERRORS.has(redirectError)) {
      setUnauthorized(true);
    } else {
      setError(GENERIC_AUTH_ERROR);
    }
    router.replace("/login", { scroll: false });
    // Only re-run when the error param itself changes; router/allowPublicSignup are stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  if (isPending || session) {
    return (
      <div className="grid min-h-[40vh] place-items-center">
        <CircleNotch size={28} className="animate-spin text-primary" />
      </div>
    );
  }

  function resetFeedback() {
    setError(null);
  }

  function switchMode(next: Mode) {
    resetFeedback();
    setResetSent(false);
    setMode(next);
  }

  async function onForgotSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    const { error: err } = await authClient.requestPasswordReset({
      email,
      redirectTo: "/reset-password",
    });

    setSubmitting(false);
    if (err) {
      setError(err.message ?? "Couldn't send a reset link. Please try again.");
      return;
    }
    setResetSent(true);
  }

  async function onMagicLinkSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    if (!allowPublicSignup && !(await canSignInByEmail(email))) {
      setSubmitting(false);
      setUnauthorized(true);
      return;
    }

    const result = await signIn.magicLink({ callbackURL: safeNext, email, errorCallbackURL: "/login" });

    setSubmitting(false);
    if (result.error) {
      setError(result.error.message ?? "Failed to send magic link.");
      return;
    }
    setSent(true);
  }

  async function resend() {
    setResending(true);
    setError(null);

    if (!allowPublicSignup && !(await canSignInByEmail(email))) {
      setResending(false);
      setSent(false);
      setUnauthorized(true);
      return;
    }

    const result = await signIn.magicLink({ callbackURL: safeNext, email, errorCallbackURL: "/login" });
    setResending(false);
    if (result.error) {
      setError(result.error.message ?? "Failed to resend.");
      return;
    }
    setResent(true);
    setTimeout(() => setResent(false), 3000);
  }

  async function onPasswordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (mode === "password-signup") {
      const complexityError = passwordComplexityError(password);
      if (complexityError) {
        setError(complexityError);
        return;
      }
    }

    setSubmitting(true);

    const result =
      mode === "password-signup"
        ? await signUp.email({ email, password, name, callbackURL: safeNext })
        : await signIn.email({ email, password, callbackURL: safeNext });

    setSubmitting(false);
    if (result.error) {
      // Better Auth returns this exact code only when databaseHooks.user.create.before
      // rejected the account (see BLOCKED_SIGNUP_REDIRECT_ERRORS above for the
      // equivalent OAuth/magic-link signal) — never for a genuine creation failure,
      // which would surface as an uncaught error instead of this specific APIError.
      if (result.error.code === "FAILED_TO_CREATE_USER") {
        setUnauthorized(true);
      } else {
        setError(result.error.message ?? "Something went wrong. Please try again.");
      }
    }
    // On success, useSession() updates reactively and the effect above redirects.
  }

  const showPasswordSwitch = mode === "magic-link" && passwordEnabled;
  const showMagicSwitch = mode !== "magic-link" && magicLinkEnabled;
  const hasSecondary = googleEnabled || showPasswordSwitch || showMagicSwitch;

  return (
      <div className="w-full max-w-md">
        {/* Logo shown here on mobile; the desktop brand panel carries it on lg+ */}
        <div className="mb-6 flex justify-center lg:hidden">
          <Logo variant="full" size="lg" href="/" />
        </div>

        <Card className="animate-in fade-in slide-in-from-bottom-2 duration-500">
          <CardHeader>
            <CardTitle className="text-2xl">
              {unauthorized
                ? "Access denied"
                : sent
                  ? "Check your email"
                  : mode === "password-signup"
                    ? "Create your account"
                    : mode === "forgot-password"
                      ? "Reset your password"
                      : "Sign in"}
            </CardTitle>
            <CardDescription>
              {unauthorized
                ? "This account can't sign in to this instance."
                : sent
                  ? "Your one-time sign-in link is on its way."
                  : mode === "magic-link"
                    ? "Enter your email and we'll send you a secure magic link."
                    : mode === "password-signup"
                      ? "Set a password to create your account."
                      : mode === "forgot-password"
                        ? "Enter your email and we'll send you a reset link."
                        : "Enter your email and password to sign in."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {unauthorized ? (
              <div className="space-y-5">
                <div className="flex flex-col items-center gap-3 py-2 text-center">
                  <span className="flex size-12 items-center justify-center bg-destructive/10 text-destructive">
                    <Prohibit size={24} weight="fill" />
                  </span>
                  <p className="text-sm text-muted-foreground">
                    Your account isn't authorized to access this Schduled instance.
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Only existing accounts can sign in.
                    <br />
                    Please contact the administrator if you believe this is an error.
                  </p>
                </div>
                <Button
                  className="w-full"
                  onClick={() => setUnauthorized(false)}
                  type="button"
                  variant="outline"
                >
                  Back to sign in
                </Button>
              </div>
            ) : sent ? (
              <div className="space-y-5">
                <div className="flex flex-col items-center gap-3 py-2 text-center">
                  <span className="flex size-12 items-center justify-center bg-primary/10 text-primary">
                    <PaperPlaneTilt size={24} weight="fill" />
                  </span>
                  <p className="text-sm text-muted-foreground">
                    We sent a sign-in link to
                    <br />
                    <strong className="text-foreground">{email}</strong>
                  </p>
                  {resent && (
                    <p className="bg-success-subtle px-3 py-1.5 text-success-foreground text-xs">
                      Link resent.
                    </p>
                  )}
                </div>
                {error && (
                  <p className="bg-destructive/10 p-3 text-destructive text-sm">{error}</p>
                )}
                <div className="flex flex-col gap-2">
                  <Button className="w-full gap-2" onClick={resend} disabled={resending} type="button" variant="outline">
                    {resending ? <><CircleNotch size={15} className="animate-spin" /> Resending…</> : "Resend link"}
                  </Button>
                  <Button className="w-full" onClick={() => { setSent(false); setError(null); }} type="button" variant="ghost">
                    Use a different email
                  </Button>
                </div>
              </div>
            ) : mode === "forgot-password" ? (
              /* ── Forgot password ── */
              <div className="space-y-5">
                {resetSent ? (
                  <div className="space-y-5">
                    <div className="flex flex-col items-center gap-3 py-2 text-center">
                      <span className="flex size-12 items-center justify-center bg-primary/10 text-primary">
                        <PaperPlaneTilt size={24} weight="fill" />
                      </span>
                      <p className="text-sm text-muted-foreground">
                        If an account exists for
                        <br />
                        <strong className="text-foreground">{email}</strong>,
                        <br />
                        a password reset link is on its way.
                      </p>
                    </div>
                    <Button className="w-full" onClick={() => switchMode("password-signin")} type="button" variant="outline">
                      Back to sign in
                    </Button>
                  </div>
                ) : (
                  <form className="space-y-4" onSubmit={onForgotSubmit}>
                    <label className="block" htmlFor="forgot-email">
                      <span className="mb-2 block font-semibold text-foreground text-sm">
                        Email
                      </span>
                      <div className="relative">
                        <Envelope size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          autoComplete="email"
                          id="forgot-email"
                          onChange={(event) => setEmail(event.target.value)}
                          placeholder="you@example.com"
                          required
                          type="email"
                          value={email}
                          className="pl-9"
                        />
                      </div>
                    </label>
                    {error && (
                      <p className="rounded-none bg-destructive/10 p-3 text-destructive text-sm">
                        {error}
                      </p>
                    )}
                    <Button className="w-full gap-2" disabled={submitting} type="submit">
                      {submitting ? <><CircleNotch size={15} className="animate-spin" /> Sending…</> : "Send reset link"}
                    </Button>
                    <button
                      className="w-full text-center text-xs font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                      onClick={() => switchMode("password-signin")}
                      type="button"
                    >
                      Back to sign in
                    </button>
                  </form>
                )}
              </div>
            ) : (
              <div className="space-y-5">
                {/* ── PRIMARY: email + password ── */}
                {!hasFormMethod ? (
                  /* No email form available — Google-only, or nothing configured */
                  <div className="flex flex-col gap-2">
                    {googleEnabled ? (
                      <Button
                        className="w-full"
                        onClick={() => signIn.social({ provider: "google", callbackURL: safeNext, errorCallbackURL: "/login" })}
                        type="button"
                        variant="outline"
                      >
                        <GoogleLogo size={16} weight="bold" className="mr-2" />
                        Continue with Google
                      </Button>
                    ) : (
                      <p className="rounded-none bg-destructive/10 p-3 text-destructive text-sm">
                        No sign-in methods are currently available. Please contact
                        the administrator.
                      </p>
                    )}
                  </div>
                ) : mode !== "magic-link" ? (
                  <form className="space-y-4" onSubmit={onPasswordSubmit}>
                    {mode === "password-signup" && (
                      <label className="block" htmlFor="name">
                        <span className="mb-2 block font-semibold text-foreground text-sm">
                          Name
                        </span>
                        <Input
                          autoComplete="name"
                          id="name"
                          onChange={(event) => setName(event.target.value)}
                          placeholder="Your name"
                          required
                          type="text"
                          value={name}
                        />
                      </label>
                    )}
                    <label className="block" htmlFor="password-email">
                      <span className="mb-2 block font-semibold text-foreground text-sm">
                        Email
                      </span>
                      <div className="relative">
                        <Envelope size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          autoComplete="email"
                          id="password-email"
                          onChange={(event) => setEmail(event.target.value)}
                          placeholder="you@example.com"
                          required
                          type="email"
                          value={email}
                          className="pl-9"
                        />
                      </div>
                    </label>
                    <label className="block" htmlFor="password">
                      <span className="mb-2 block font-semibold text-foreground text-sm">
                        Password
                      </span>
                      <div className="relative">
                        <LockSimple size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          autoComplete={mode === "password-signup" ? "new-password" : "current-password"}
                          id="password"
                          minLength={MIN_PASSWORD_LENGTH}
                          onChange={(event) => setPassword(event.target.value)}
                          placeholder="••••••••"
                          required
                          type={showPassword ? "text" : "password"}
                          value={password}
                          className="pl-9 pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((s) => !s)}
                          aria-label={showPassword ? "Hide password" : "Show password"}
                          tabIndex={-1}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                        >
                          {showPassword ? <Eye size={16} /> : <EyeSlash size={16} />}
                        </button>
                      </div>
                    </label>
                    {error && (
                      <div className="rounded-none bg-destructive/10 p-3 text-sm">
                        <p className="text-destructive">{error}</p>
                        {mode === "password-signin" && allowPublicSignup && (
                          <button
                            type="button"
                            onClick={() => switchMode("password-signup")}
                            className="mt-1.5 font-semibold text-destructive underline underline-offset-2 hover:opacity-80"
                          >
                            New here? Create an account →
                          </button>
                        )}
                      </div>
                    )}
                    <Button className="w-full gap-2" disabled={submitting} type="submit">
                      {submitting
                        ? <><CircleNotch size={15} className="animate-spin" /> {mode === "password-signup" ? "Creating account…" : "Signing in…"}</>
                        : mode === "password-signup" ? "Create account" : "Sign in"}
                    </Button>
                    <div className="flex flex-col items-center gap-1.5 text-center text-xs">
                      {(allowPublicSignup || mode === "password-signup") && (
                        <button
                          className="font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                          onClick={() => switchMode(mode === "password-signup" ? "password-signin" : "password-signup")}
                          type="button"
                        >
                          {mode === "password-signup"
                            ? "Already have an account? Sign in"
                            : "New here? Create an account"}
                        </button>
                      )}
                      {mode === "password-signin" && (
                        <button
                          className="font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                          onClick={() => switchMode("forgot-password")}
                          type="button"
                        >
                          Forgot your password?
                        </button>
                      )}
                    </div>
                  </form>
                ) : (
                  /* ── Magic-link mode ── */
                  <form className="space-y-4" onSubmit={onMagicLinkSubmit}>
                    <label className="block" htmlFor="email">
                      <span className="mb-2 block font-semibold text-foreground text-sm">
                        Email
                      </span>
                      <div className="relative">
                        <Envelope size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          autoComplete="email"
                          id="email"
                          onChange={(event) => setEmail(event.target.value)}
                          placeholder="you@example.com"
                          required
                          type="email"
                          value={email}
                          className="pl-9"
                        />
                      </div>
                    </label>
                    {error && (
                      <p className="rounded-none bg-destructive/10 p-3 text-destructive text-sm">
                        {error}
                      </p>
                    )}
                    <Button className="w-full gap-2" disabled={submitting} type="submit">
                      {submitting ? <><CircleNotch size={15} className="animate-spin" /> Sending…</> : "Send magic link"}
                    </Button>
                    <p className="text-center text-xs text-muted-foreground">
                      We'll email you a secure sign-in link — no password needed.
                    </p>
                  </form>
                )}

                {/* ── SECONDARY options: Google + switch method ── */}
                {hasFormMethod && hasSecondary && (
                  <>
                    <div className="relative flex items-center gap-3">
                      <div className="h-px flex-1 bg-border" />
                      <span className="shrink-0 text-2xs font-medium uppercase tracking-wider text-muted-foreground">
                        or
                      </span>
                      <div className="h-px flex-1 bg-border" />
                    </div>

                    <div className="flex flex-col gap-2">
                      {googleEnabled && (
                        <Button
                          className="w-full"
                          onClick={() => signIn.social({ provider: "google", callbackURL: safeNext, errorCallbackURL: "/login" })}
                          type="button"
                          variant="outline"
                        >
                          <GoogleLogo size={16} weight="bold" className="mr-2" />
                          Continue with Google
                        </Button>
                      )}
                      {showPasswordSwitch && (
                        <Button
                          className="w-full gap-2"
                          onClick={() => switchMode("password-signin")}
                          type="button"
                          variant="outline"
                        >
                          <LockSimple size={16} weight="bold" />
                          Sign in with a password
                        </Button>
                      )}
                      {showMagicSwitch && (
                        <Button
                          className="w-full gap-2"
                          onClick={() => switchMode("magic-link")}
                          type="button"
                          variant="outline"
                        >
                          <PaperPlaneTilt size={16} weight="bold" />
                          Send a magic link
                        </Button>
                      )}
                    </div>
                  </>
                )}

                {/* Security indicators */}
                <div className="flex items-center justify-center gap-4 border-t border-border pt-4 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5"><LockKey size={13} /> {mode === "magic-link" ? "Passwordless" : "Secure login"}</span>
                  <span className="inline-flex items-center gap-1.5"><ShieldCheck size={13} /> Encrypted</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
  );
}
