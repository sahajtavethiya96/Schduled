"use client";

import { useState, useTransition } from "react";
import { GoogleLogo, type Icon, LockKey, MagicWand } from "@phosphor-icons/react";
import { toast } from "sonner";
import { updateSignInMethodsAction } from "@/app/actions/platform-settings";
import { Switch } from "@/components/ui/switch";
import { UnsavedChangesBar } from "@/components/settings-admin/unsaved-changes-bar";
import { cn } from "@/lib/utils";
import type { SignInMethods } from "@/lib/settings/sign-in-methods";

interface Props {
  initial: SignInMethods;
  availability: SignInMethods;
  smtpConfigured: boolean;
}

type MethodKey = keyof SignInMethods;

const METHODS: {
  key: MethodKey;
  icon: Icon;
  label: string;
  description: string;
  unavailableHint: string;
}[] = [
  {
    key: "password",
    icon: LockKey,
    label: "Email & Password",
    description:
      "Sign in with an email and password — works even with no email provider configured.",
    unavailableHint: "Disabled via NEXT_PUBLIC_PASSWORD_AUTH_ENABLED.",
  },
  {
    key: "magicLink",
    icon: MagicWand,
    label: "Magic Link",
    description:
      "Sign in with a one-time link emailed to the user. Requires SMTP to be configured for delivery.",
    unavailableHint: "Configure SMTP (SMTP_HOST, SMTP_PORT, SMTP_USER) to enable.",
  },
  {
    key: "google",
    icon: GoogleLogo,
    label: "Google",
    description: "Sign in with a Google account.",
    unavailableHint: "Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to enable.",
  },
];

export function SignInMethodsGrid({ initial, availability, smtpConfigured }: Props) {
  const [methods, setMethods] = useState<SignInMethods>(initial);
  const [saved, setSaved] = useState<SignInMethods>(initial);
  const [pending, startTransition] = useTransition();

  const enabledCount = (Object.keys(methods) as MethodKey[]).filter(
    (k) => methods[k] && availability[k]
  ).length;

  const dirty = (Object.keys(methods) as MethodKey[]).some(
    (k) => methods[k] !== saved[k]
  );

  function toggle(key: MethodKey, value: boolean) {
    // Never let the admin turn off the last remaining method.
    if (!value && enabledCount <= 1 && methods[key]) {
      toast.error("At least one sign-in method must stay enabled.");
      return;
    }
    setMethods((m) => ({ ...m, [key]: value }));
  }

  function save() {
    startTransition(async () => {
      const result = await updateSignInMethodsAction(methods);
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      setSaved(methods);
      toast.success("Sign-in methods updated.");
    });
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {METHODS.map(({ key, icon: MethodIcon, label, description, unavailableHint }) => {
          const available = availability[key];
          const checked = available && methods[key];
          return (
            <div
              key={key}
              className={cn(
                "flex flex-col gap-4 border p-5 transition-colors",
                checked ? "border-primary/30 bg-primary/[0.03]" : "border-base-300"
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <span
                  className={cn(
                    "flex size-10 shrink-0 items-center justify-center border transition-colors",
                    checked
                      ? "border-primary/30 bg-primary/10 text-primary"
                      : "border-base-300 bg-base-200/40 text-muted-foreground"
                  )}
                >
                  <MethodIcon size={18} weight="bold" />
                </span>
                <Switch
                  aria-label={`Toggle ${label}`}
                  checked={checked}
                  disabled={!available || pending}
                  onCheckedChange={(v) => toggle(key, v)}
                />
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold">{label}</p>
                  {available && (
                    <span
                      className={cn(
                        "text-2xs font-bold uppercase tracking-wider",
                        checked ? "text-primary" : "text-muted-foreground/60"
                      )}
                    >
                      {checked ? "Enabled" : "Disabled"}
                    </span>
                  )}
                </div>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  {description}
                </p>
                {!available && (
                  <p className="mt-2 text-xs font-medium text-amber-600 dark:text-amber-500">
                    {unavailableHint}
                  </p>
                )}
                {available && key === "magicLink" && checked && !smtpConfigured && (
                  <p className="mt-2 text-xs font-medium text-amber-600 dark:text-amber-500">
                    No SMTP configured — magic links are written to the server
                    log, not emailed.
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <UnsavedChangesBar
        visible={dirty}
        label="Unsaved changes in Sign-in Methods"
        pending={pending}
        onCancel={() => setMethods(saved)}
        onSave={save}
      />
    </>
  );
}
