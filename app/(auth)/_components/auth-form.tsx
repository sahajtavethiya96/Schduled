"use client";

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
import { useRouter, useSearchParams } from "next/navigation";
import { type FormEvent, Suspense, useEffect, useState } from "react";
import { canSignInByEmail } from "@/app/actions/auth";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { MIN_PASSWORD_LENGTH } from "@/config/platform";
import { authClient, signIn, signUp, useSession } from "@/lib/auth-client";
import { passwordComplexityError } from "@/lib/password";

// Better Auth's redirect-based flows (Google OAuth callback, magic-link
// verify) surface a rejected databaseHooks.user.create.before hook as one of
// these exact ?error= values (confirmed from the better-auth source). They
// could in principle also mean an unrelated failure, so this is only trusted
// when allowPublicSignup is false — an open instance never mislabels a real
// error as "access denied".
const BLOCKED_SIGNUP_REDIRECT_ERRORS = new Set([
  "unable_to_create_user",
  "failed_to_create_user",
]);
const GENERIC_AUTH_ERROR = "Something went wrong signing in. Please try again.";

interface AuthFormProps {
  allowPublicSignup: boolean;
  googleEnabled: boolean;
  magicLinkEnabled: boolean;
  passwordEnabled: boolean;
}

export function AuthForm(props: AuthFormProps) {
  return (
    <Suspense fallback={null}>
      <AuthFormInner {...props} />
    </Suspense>
  );
}

type Mode =
  | "magic-link"
  | "password-signin"
  | "password-signup"
  | "forgot-password";

function AuthFormInner({
  allowPublicSignup,
  googleEnabled,
  passwordEnabled,
  magicLinkEnabled,
}: AuthFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, isPending } = useSession();
  // Password is the primary method, falling back to magic link; if neither is
  // enabled, no email form is shown at all (Google-only deployment).
  const hasFormMethod = passwordEnabled || magicLinkEnabled;
  const [mode, setMode] = useState<Mode>(
    passwordEnabled ? "password-signin" : "magic-link"
  );
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
  // Requires a single leading slash not followed by another slash or
  // backslash, rejecting protocol-relative/backslash open-redirect targets.
  const safeNext =
    rawNext && /^\/(?![/\\])/.test(rawNext) ? rawNext : "/post-auth";

  useEffect(() => {
    if (session) {
      router.replace("/post-auth");
    }
  }, [router, session]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: only re-run on searchParams change; router.replace and allowPublicSignup are stable
  useEffect(() => {
    const redirectError = searchParams.get("error");
    if (!redirectError) {
      return;
    }

    if (
      !allowPublicSignup &&
      BLOCKED_SIGNUP_REDIRECT_ERRORS.has(redirectError)
    ) {
      setUnauthorized(true);
    } else {
      setError(GENERIC_AUTH_ERROR);
    }
    router.replace("/login", { scroll: false });
  }, [searchParams]);

  if (isPending || session) {
    return (
      <div className="grid min-h-[40vh] place-items-center">
        <CircleNotch className="animate-spin text-primary" size={28} />
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

    const result = await signIn.magicLink({
      callbackURL: safeNext,
      email,
      errorCallbackURL: "/login",
    });

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

    const result = await signIn.magicLink({
      callbackURL: safeNext,
      email,
      errorCallbackURL: "/login",
    });
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
      // Same signal as BLOCKED_SIGNUP_REDIRECT_ERRORS above, for the
      // password flow: this code only fires when the create.before hook
      // rejected the account.
      if (result.error.code === "FAILED_TO_CREATE_USER") {
        setUnauthorized(true);
      } else {
        setError(
          result.error.message ?? "Something went wrong. Please try again."
        );
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
        <Logo href="/" size="lg" variant="full" />
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
                <span className="flex size-12 items-center justify-center bg-error/10 text-error">
                  <Prohibit size={24} weight="fill" />
                </span>
                <p className="text-sm text-muted-foreground">
                  Your account isn't authorized to access this Schduled
                  instance.
                </p>
                <p className="text-sm text-muted-foreground">
                  Only existing accounts can sign in.
                  <br />
                  Please contact the administrator if you believe this is an
                  error.
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
                  <strong className="text-base-content">{email}</strong>
                </p>
                {resent && (
                  <p className="bg-success-subtle px-3 py-1.5 text-success-content text-xs">
                    Link resent.
                  </p>
                )}
              </div>
              {error && (
                <p className="bg-error/10 p-3 text-error text-sm">{error}</p>
              )}
              <div className="flex flex-col gap-2">
                <Button
                  className="w-full gap-2"
                  disabled={resending}
                  onClick={resend}
                  type="button"
                  variant="outline"
                >
                  {resending ? (
                    <>
                      <CircleNotch className="animate-spin" size={15} />{" "}
                      Resending…
                    </>
                  ) : (
                    "Resend link"
                  )}
                </Button>
                <Button
                  className="w-full"
                  onClick={() => {
                    setSent(false);
                    setError(null);
                  }}
                  type="button"
                  variant="ghost"
                >
                  Use a different email
                </Button>
              </div>
            </div>
          ) : mode === "forgot-password" ? (
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
                      <strong className="text-base-content">{email}</strong>,
                      <br />a password reset link is on its way.
                    </p>
                  </div>
                  <Button
                    className="w-full"
                    onClick={() => switchMode("password-signin")}
                    type="button"
                    variant="outline"
                  >
                    Back to sign in
                  </Button>
                </div>
              ) : (
                <form className="space-y-4" onSubmit={onForgotSubmit}>
                  <label className="block" htmlFor="forgot-email">
                    <span className="mb-2 block font-semibold text-base-content text-sm">
                      Email
                    </span>
                    <div className="relative">
                      <Envelope
                        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                        size={16}
                      />
                      <Input
                        autoComplete="email"
                        className="pl-9"
                        id="forgot-email"
                        onChange={(event) => setEmail(event.target.value)}
                        placeholder="you@example.com"
                        required
                        type="email"
                        value={email}
                      />
                    </div>
                  </label>
                  {error && (
                    <p className="rounded-none bg-error/10 p-3 text-error text-sm">
                      {error}
                    </p>
                  )}
                  <Button
                    className="w-full gap-2"
                    disabled={submitting}
                    type="submit"
                  >
                    {submitting ? (
                      <>
                        <CircleNotch className="animate-spin" size={15} />{" "}
                        Sending…
                      </>
                    ) : (
                      "Send reset link"
                    )}
                  </Button>
                  <button
                    className="w-full text-center text-xs font-medium text-muted-foreground underline-offset-2 hover:text-base-content hover:underline"
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
              {hasFormMethod ? (
                mode === "magic-link" ? (
                  <form className="space-y-4" onSubmit={onMagicLinkSubmit}>
                    <label className="block" htmlFor="email">
                      <span className="mb-2 block font-semibold text-base-content text-sm">
                        Email
                      </span>
                      <div className="relative">
                        <Envelope
                          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                          size={16}
                        />
                        <Input
                          autoComplete="email"
                          className="pl-9"
                          id="email"
                          onChange={(event) => setEmail(event.target.value)}
                          placeholder="you@example.com"
                          required
                          type="email"
                          value={email}
                        />
                      </div>
                    </label>
                    {error && (
                      <p className="rounded-none bg-error/10 p-3 text-error text-sm">
                        {error}
                      </p>
                    )}
                    <Button
                      className="w-full gap-2"
                      disabled={submitting}
                      type="submit"
                    >
                      {submitting ? (
                        <>
                          <CircleNotch className="animate-spin" size={15} />{" "}
                          Sending…
                        </>
                      ) : (
                        "Send magic link"
                      )}
                    </Button>
                    <p className="text-center text-xs text-muted-foreground">
                      We'll email you a secure sign-in link — no password
                      needed.
                    </p>
                  </form>
                ) : (
                  <form className="space-y-4" onSubmit={onPasswordSubmit}>
                    {mode === "password-signup" && (
                      <label className="block" htmlFor="name">
                        <span className="mb-2 block font-semibold text-base-content text-sm">
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
                      <span className="mb-2 block font-semibold text-base-content text-sm">
                        Email
                      </span>
                      <div className="relative">
                        <Envelope
                          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                          size={16}
                        />
                        <Input
                          autoComplete="email"
                          className="pl-9"
                          id="password-email"
                          onChange={(event) => setEmail(event.target.value)}
                          placeholder="you@example.com"
                          required
                          type="email"
                          value={email}
                        />
                      </div>
                    </label>
                    <label className="block" htmlFor="password">
                      <span className="mb-2 block font-semibold text-base-content text-sm">
                        Password
                      </span>
                      <div className="relative">
                        <LockSimple
                          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                          size={16}
                        />
                        <Input
                          autoComplete={
                            mode === "password-signup"
                              ? "new-password"
                              : "current-password"
                          }
                          className="pl-9 pr-10"
                          id="password"
                          minLength={MIN_PASSWORD_LENGTH}
                          onChange={(event) => setPassword(event.target.value)}
                          placeholder="••••••••"
                          required
                          type={showPassword ? "text" : "password"}
                          value={password}
                        />
                        <button
                          aria-label={
                            showPassword ? "Hide password" : "Show password"
                          }
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-base-content"
                          onClick={() => setShowPassword((s) => !s)}
                          tabIndex={-1}
                          type="button"
                        >
                          {showPassword ? (
                            <Eye size={16} />
                          ) : (
                            <EyeSlash size={16} />
                          )}
                        </button>
                      </div>
                    </label>
                    {error && (
                      <div className="rounded-none bg-error/10 p-3 text-sm">
                        <p className="text-error">{error}</p>
                        {mode === "password-signin" && allowPublicSignup && (
                          <button
                            className="mt-1.5 font-semibold text-error underline underline-offset-2 hover:opacity-80"
                            onClick={() => switchMode("password-signup")}
                            type="button"
                          >
                            New here? Create an account →
                          </button>
                        )}
                      </div>
                    )}
                    <Button
                      className="w-full gap-2"
                      disabled={submitting}
                      type="submit"
                    >
                      {submitting ? (
                        <>
                          <CircleNotch className="animate-spin" size={15} />{" "}
                          {mode === "password-signup"
                            ? "Creating account…"
                            : "Signing in…"}
                        </>
                      ) : mode === "password-signup" ? (
                        "Create account"
                      ) : (
                        "Sign in"
                      )}
                    </Button>
                    <div className="flex flex-col items-center gap-1.5 text-center text-xs">
                      {(allowPublicSignup || mode === "password-signup") && (
                        <button
                          className="font-medium text-muted-foreground underline-offset-2 hover:text-base-content hover:underline"
                          onClick={() =>
                            switchMode(
                              mode === "password-signup"
                                ? "password-signin"
                                : "password-signup"
                            )
                          }
                          type="button"
                        >
                          {mode === "password-signup"
                            ? "Already have an account? Sign in"
                            : "New here? Create an account"}
                        </button>
                      )}
                      {mode === "password-signin" && (
                        <button
                          className="font-medium text-muted-foreground underline-offset-2 hover:text-base-content hover:underline"
                          onClick={() => switchMode("forgot-password")}
                          type="button"
                        >
                          Forgot your password?
                        </button>
                      )}
                    </div>
                  </form>
                )
              ) : (
                /* No email form available — Google-only, or nothing configured */
                <div className="flex flex-col gap-2">
                  {googleEnabled ? (
                    <Button
                      className="w-full"
                      onClick={() =>
                        signIn.social({
                          provider: "google",
                          callbackURL: safeNext,
                          errorCallbackURL: "/login",
                        })
                      }
                      type="button"
                      variant="outline"
                    >
                      <GoogleLogo className="mr-2" size={16} weight="bold" />
                      Continue with Google
                    </Button>
                  ) : (
                    <p className="rounded-none bg-error/10 p-3 text-error text-sm">
                      No sign-in methods are currently available. Please contact
                      the administrator.
                    </p>
                  )}
                </div>
              )}

              {hasFormMethod && hasSecondary && (
                <>
                  <div className="relative flex items-center gap-3">
                    <div className="h-px flex-1 bg-base-300" />
                    <span className="shrink-0 text-2xs font-medium uppercase tracking-wider text-muted-foreground">
                      or
                    </span>
                    <div className="h-px flex-1 bg-base-300" />
                  </div>

                  <div className="flex flex-col gap-2">
                    {googleEnabled && (
                      <Button
                        className="w-full"
                        onClick={() =>
                          signIn.social({
                            provider: "google",
                            callbackURL: safeNext,
                            errorCallbackURL: "/login",
                          })
                        }
                        type="button"
                        variant="outline"
                      >
                        <GoogleLogo className="mr-2" size={16} weight="bold" />
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

              <div className="flex items-center justify-center gap-4 border-t border-base-300 pt-4 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <LockKey size={13} />{" "}
                  {mode === "magic-link" ? "Passwordless" : "Secure login"}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <ShieldCheck size={13} /> Encrypted
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
