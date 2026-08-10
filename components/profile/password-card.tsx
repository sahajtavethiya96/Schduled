"use client";

import { LockKey } from "@phosphor-icons/react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { setPasswordAction } from "@/app/actions/auth";
import { PasswordInput } from "@/components/common/password-input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { MIN_PASSWORD_LENGTH } from "@/config/platform";
import { authClient } from "@/lib/auth-client";
import { authErrorMessage } from "@/lib/auth-errors";
import { passwordComplexityError } from "@/lib/password";

interface Props {
  hasPassword: boolean;
  /** Whether the `emailAndPassword` plugin is enabled on this instance (NEXT_PUBLIC_PASSWORD_AUTH_ENABLED). */
  passwordAuthEnabled: boolean;
}

export function PasswordCard({
  hasPassword: initialHasPassword,
  passwordAuthEnabled,
}: Props) {
  // Tracked locally (not just the server-supplied prop) so a successful "Set a
  // Password" flips the form into "Change password" mode immediately, instead
  // of re-submitting against the server guard that rejects a second set.
  const [hasPassword, setHasPassword] = useState(initialHasPassword);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [submitting, setSubmitting] = useState(false);

  const busy = pending || submitting;

  function reset() {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  }

  function validate(): string | null {
    const complexityError = passwordComplexityError(newPassword);
    if (complexityError) {
      return complexityError;
    }
    if (newPassword !== confirmPassword) {
      return "Passwords do not match.";
    }
    if (hasPassword && !currentPassword) {
      return "Enter your current password.";
    }
    if (hasPassword && currentPassword && newPassword === currentPassword) {
      return "New password must be different from your current password.";
    }
    return null;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const invalid = validate();
    setError(invalid);
    if (invalid) {
      return;
    }

    if (!hasPassword) {
      startTransition(async () => {
        const result = await setPasswordAction(newPassword);
        if ("error" in result) {
          setError(result.error);
          return;
        }
        reset();
        setHasPassword(true);
        toast.success("Password set", {
          description: "You can now sign in with your email and password.",
        });
      });
      return;
    }

    setSubmitting(true);
    // Keeps THIS session alive and signs out every other device.
    const { error: err } = await authClient.changePassword({
      currentPassword,
      newPassword,
      revokeOtherSessions: true,
    });
    setSubmitting(false);

    if (err) {
      setError(
        authErrorMessage(
          err.code,
          err.message ?? "Could not change your password."
        )
      );
      return;
    }
    reset();
    toast.success("Password changed", {
      description: "Your other devices have been signed out.",
    });
  }

  if (!passwordAuthEnabled) {
    return (
      <Card>
        <CardHeader className="gap-2.5 border-b border-base-300">
          <div className="flex items-center gap-2.5">
            <span className="flex size-7 shrink-0 items-center justify-center border border-base-300 bg-base-200/40 text-muted-foreground">
              <LockKey size={15} weight="bold" />
            </span>
            <CardTitle className="text-base font-semibold">Password</CardTitle>
          </div>
          <CardDescription>
            {hasPassword
              ? "Password sign-in is disabled on this instance. Contact your administrator to re-enable it before changing your password."
              : "Password sign-in is disabled on this instance. Use a magic link or Google to sign in."}
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="gap-2.5 border-b border-base-300">
        <div className="flex items-center gap-2.5">
          <span className="flex size-7 shrink-0 items-center justify-center border border-base-300 bg-base-200/40 text-muted-foreground">
            <LockKey size={15} weight="bold" />
          </span>
          <CardTitle className="text-base font-semibold">
            {hasPassword ? "Change Password" : "Set a Password"}
          </CardTitle>
        </div>
        <CardDescription>
          {hasPassword
            ? "Choose a new password. Your other devices will be signed out."
            : "You currently sign in with a magic link or Google. Add a password to sign in with your email as well."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="flex w-full max-w-md flex-col gap-4"
          onSubmit={onSubmit}
        >
          {hasPassword && (
            <div className="space-y-2">
              <Label htmlFor="current-password">Current password</Label>
              <PasswordInput
                autoComplete="current-password"
                disabled={busy}
                id="current-password"
                onChange={(e) => setCurrentPassword(e.target.value)}
                value={currentPassword}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="new-password">New password</Label>
            <PasswordInput
              autoComplete="new-password"
              disabled={busy}
              id="new-password"
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
              value={newPassword}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirm new password</Label>
            <PasswordInput
              autoComplete="new-password"
              disabled={busy}
              id="confirm-password"
              onChange={(e) => setConfirmPassword(e.target.value)}
              onPaste={(e) => e.preventDefault()}
              value={confirmPassword}
            />
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button
            className="w-fit gap-2"
            disabled={busy}
            size="sm"
            type="submit"
          >
            {busy && <Spinner size="sm" />}
            {hasPassword ? "Change password" : "Set password"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
