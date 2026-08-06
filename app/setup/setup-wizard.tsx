"use client";

import {
  ArrowLeft,
  ArrowRight,
  Check,
  Desktop,
  Envelope,
  Eye,
  EyeSlash,
  GoogleLogo,
  Moon,
  Rocket,
  Spinner,
  Stack,
  Sun,
  VideoCamera,
} from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import * as React from "react";
import { createFirstAdmin } from "@/app/actions/setup";
import { GoogleOAuthSettingsForm } from "@/components/settings-services/google-oauth-settings-form";
import { IntegrationConfigCard } from "@/components/settings-services/integration-config-card";
import { SmtpSettingsForm } from "@/components/settings-services/smtp-settings-form";
import { StorageSettingsForm } from "@/components/settings-services/storage-settings-form";
import { ZoomOAuthSettingsForm } from "@/components/settings-services/zoom-oauth-settings-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MIN_PASSWORD_LENGTH, PRODUCT_NAME } from "@/config/platform";
import { authClient } from "@/lib/auth-client";
import type { IntegrationSettingsSummary } from "@/lib/integration-settings";
import type { EnvIntegrationStatus } from "@/lib/integrations/status";
import { passwordComplexityError } from "@/lib/password";
import { cn } from "@/lib/utils";

// Nothing in integration_setting has ever been saved yet at this point in a
// first-run wizard — no need to fetch current values like /settings/services
// does, every field starts blank.
const EMPTY_SERVICE_SETTINGS: IntegrationSettingsSummary = {
  smtp: {
    host: "",
    port: null,
    secure: null,
    user: "",
    from: "",
    hasPass: false,
    hasWebhookSecret: false,
  },
  google: { clientId: "", hasClientSecret: false },
  zoom: { clientId: "", hasClientSecret: false },
  storage: {
    driver: "",
    s3Endpoint: "",
    s3Region: "",
    s3Bucket: "",
    s3AccessKeyId: "",
    hasS3SecretAccessKey: false,
    r2Bucket: "",
    r2AccountId: "",
    r2AccessKeyId: "",
    hasR2SecretAccessKey: false,
    publicBaseUrl: "",
  },
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Appearance = "light" | "dark" | "system";

const APPEARANCE_OPTIONS: {
  value: Appearance;
  label: string;
  Icon: typeof Desktop;
}[] = [
  { value: "light", label: "Light", Icon: Sun },
  { value: "dark", label: "Dark", Icon: Moon },
  { value: "system", label: "System", Icon: Desktop },
];

function Stepper({ step }: { step: 1 | 2 | 3 | 4 }) {
  return (
    <div className="mb-8 flex items-center justify-center gap-2">
      {[1, 2, 3, 4].map((n, i) => (
        <React.Fragment key={n}>
          <div
            className={cn(
              "flex size-7 items-center justify-center text-xs font-semibold transition-colors",
              n < step && "bg-primary text-primary-foreground",
              n === step && "bg-primary text-primary-foreground",
              n > step && "bg-muted text-muted-foreground"
            )}
          >
            {n < step ? <Check size={14} weight="bold" /> : n}
          </div>
          {i < 3 && (
            <div
              className={cn("h-px w-10", n < step ? "bg-primary" : "bg-border")}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

export function SetupWizard({
  serviceStatus,
}: {
  serviceStatus: EnvIntegrationStatus;
}) {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  // next-themes can't know the stored theme until it mounts client-side — gate
  // the selected-option highlight on mount so it never flashes the wrong one.
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  const [step, setStep] = React.useState<
    "theme" | "account" | "services" | "done"
  >("theme");
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [error, setError] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  const [openIntegration, setOpenIntegration] = React.useState<
    "smtp" | "google" | "zoom" | "storage" | null
  >(null);
  const [smtpConfigured, setSmtpConfigured] = React.useState(
    serviceStatus.smtpConfigured
  );
  const [googleConfigured, setGoogleConfigured] = React.useState(
    serviceStatus.googleConfigured
  );
  const [zoomConfigured, setZoomConfigured] = React.useState(
    serviceStatus.zoomConfigured
  );
  const [storageConfigured, setStorageConfigured] = React.useState(
    serviceStatus.storageConfigured
  );

  function handleSaved(setConfigured: (configured: boolean) => void) {
    return (configured: boolean) => {
      setConfigured(configured);
      setOpenIntegration(null);
    };
  }

  const appearance: Appearance = mounted
    ? ((theme as Appearance) ?? "system")
    : "system";

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      return setError("Full name is required");
    }
    if (!EMAIL_RE.test(email.trim())) {
      return setError("Enter a valid email address");
    }
    const complexityError = passwordComplexityError(password);
    if (complexityError) {
      return setError(complexityError);
    }
    if (password !== confirm) {
      return setError("Passwords do not match");
    }

    setError("");
    setSubmitting(true);

    const res = await createFirstAdmin({ name, email, password });
    if ("error" in res) {
      setError(res.error);
      setSubmitting(false);
      return;
    }

    const signIn = await authClient.signIn.email({
      email: email.trim().toLowerCase(),
      password,
    });
    if (signIn.error) {
      router.push("/login");
      return;
    }
    setSubmitting(false);
    setStep("services");
  }

  function finishSetup() {
    setStep("done");
    router.push("/onboarding");
  }

  const stepNumber: 1 | 2 | 3 | 4 =
    step === "theme" ? 1 : step === "account" ? 2 : step === "services" ? 3 : 4;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-page p-4">
      <div className="w-full max-w-md">
        <Stepper step={stepNumber} />

        <div className="border border-border bg-background p-8">
          {step === "theme" && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="mx-auto flex size-12 items-center justify-center bg-primary text-primary-foreground">
                  <Rocket size={24} weight="fill" />
                </div>
                <h1 className="mt-4 text-xl font-bold">
                  Welcome to {PRODUCT_NAME}
                </h1>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  Let's get your instance set up. Pick your preferred appearance
                  — you can change it later in settings.
                </p>
              </div>

              <div>
                <h2 className="mb-3 text-sm font-semibold">Appearance</h2>
                <div className="grid grid-cols-3 gap-2">
                  {APPEARANCE_OPTIONS.map(({ value, label, Icon }) => {
                    const selected = appearance === value;
                    return (
                      <button
                        className={cn(
                          "flex flex-col items-center gap-1.5 border p-3 transition-colors hover:bg-muted/50",
                          selected
                            ? "border-primary ring-2 ring-primary/20"
                            : "border-border"
                        )}
                        key={value}
                        onClick={() => setTheme(value)}
                        type="button"
                      >
                        <Icon className="text-muted-foreground" size={18} />
                        <span className="text-xs font-medium">{label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end">
                <Button className="gap-1.5" onClick={() => setStep("account")}>
                  Next <ArrowRight size={14} />
                </Button>
              </div>
            </div>
          )}

          {step === "account" && (
            <form className="space-y-5" onSubmit={handleCreate}>
              <div className="text-center">
                <h1 className="text-xl font-bold">Set up your account</h1>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  This is the administrator account for {PRODUCT_NAME}.
                </p>
              </div>

              {error && (
                <div className="rounded-none border border-destructive/30 bg-destructive/10 p-3">
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="setup-name">Full name</Label>
                <Input
                  autoComplete="name"
                  disabled={submitting}
                  id="setup-name"
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Jane Smith"
                  value={name}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="setup-email">Email address</Label>
                <Input
                  autoComplete="username"
                  disabled={submitting}
                  id="setup-email"
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  type="email"
                  value={email}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="setup-password">Password</Label>
                <div className="relative">
                  <Input
                    autoComplete="new-password"
                    disabled={submitting}
                    id="setup-password"
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
                    type={showPassword ? "text" : "password"}
                    value={password}
                  />
                  <button
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                    onClick={() => setShowPassword((s) => !s)}
                    tabIndex={-1}
                    type="button"
                  >
                    {showPassword ? <EyeSlash size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="setup-confirm">Confirm password</Label>
                <Input
                  autoComplete="new-password"
                  disabled={submitting}
                  id="setup-confirm"
                  onChange={(e) => setConfirm(e.target.value)}
                  onPaste={(e) => e.preventDefault()}
                  placeholder="Re-enter your password"
                  type={showPassword ? "text" : "password"}
                  value={confirm}
                />
              </div>

              <div className="flex items-center justify-between gap-3">
                <Button
                  className="gap-1.5"
                  disabled={submitting}
                  onClick={() => setStep("theme")}
                  type="button"
                  variant="outline"
                >
                  <ArrowLeft size={14} /> Previous
                </Button>
                <Button className="gap-1.5" disabled={submitting} type="submit">
                  {submitting && <Spinner className="animate-spin" size={14} />}
                  Create account <ArrowRight size={14} />
                </Button>
              </div>
            </form>
          )}

          {step === "services" && (
            <div className="space-y-6">
              <div className="text-center">
                <h1 className="text-xl font-bold">Configure services</h1>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  These are optional. You can also configure them later from
                  Settings → Services — a value set here always wins over the
                  matching .env var.
                </p>
              </div>

              <div className="space-y-2">
                <IntegrationConfigCard
                  description="Outbound transactional email via nodemailer"
                  icon={<Envelope size={16} weight="bold" />}
                  onOpenChange={(open) =>
                    setOpenIntegration(open ? "smtp" : null)
                  }
                  open={openIntegration === "smtp"}
                  status={smtpConfigured ? "configured" : "not-configured"}
                  title="Email / SMTP"
                >
                  <SmtpSettingsForm
                    initial={EMPTY_SERVICE_SETTINGS.smtp}
                    onSaved={handleSaved(setSmtpConfigured)}
                  />
                </IntegrationConfigCard>

                <IntegrationConfigCard
                  description="Social sign-in and Google Calendar integration"
                  icon={<GoogleLogo size={16} weight="bold" />}
                  onOpenChange={(open) =>
                    setOpenIntegration(open ? "google" : null)
                  }
                  open={openIntegration === "google"}
                  status={
                    googleConfigured ? "restart-required" : "not-configured"
                  }
                  title="Google OAuth"
                >
                  <GoogleOAuthSettingsForm
                    initial={EMPTY_SERVICE_SETTINGS.google}
                    onSaved={handleSaved(setGoogleConfigured)}
                  />
                </IntegrationConfigCard>

                <IntegrationConfigCard
                  description="Zoom OAuth for automatic meeting creation"
                  icon={<VideoCamera size={16} weight="bold" />}
                  onOpenChange={(open) =>
                    setOpenIntegration(open ? "zoom" : null)
                  }
                  open={openIntegration === "zoom"}
                  status={zoomConfigured ? "configured" : "not-configured"}
                  title="Zoom"
                >
                  <ZoomOAuthSettingsForm
                    initial={EMPTY_SERVICE_SETTINGS.zoom}
                    onSaved={handleSaved(setZoomConfigured)}
                  />
                </IntegrationConfigCard>

                <IntegrationConfigCard
                  description="Local disk by default, or S3/R2-compatible storage"
                  icon={<Stack size={16} weight="bold" />}
                  onOpenChange={(open) =>
                    setOpenIntegration(open ? "storage" : null)
                  }
                  open={openIntegration === "storage"}
                  status={storageConfigured ? "configured" : "not-configured"}
                  title="File Storage"
                >
                  <StorageSettingsForm
                    initial={EMPTY_SERVICE_SETTINGS.storage}
                    onSaved={handleSaved(setStorageConfigured)}
                  />
                </IntegrationConfigCard>
              </div>

              <div className="flex items-center justify-between gap-3">
                <Button
                  className="gap-1.5"
                  onClick={finishSetup}
                  type="button"
                  variant="outline"
                >
                  Skip for now
                </Button>
                <Button className="gap-1.5" onClick={finishSetup} type="button">
                  Continue <ArrowRight size={14} />
                </Button>
              </div>
            </div>
          )}

          {step === "done" && (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <Spinner
                className="animate-spin text-muted-foreground"
                size={32}
              />
              <h1 className="text-lg font-semibold">
                Setting up your workspace…
              </h1>
              <p className="text-sm text-muted-foreground">
                Redirecting to your dashboard…
              </p>
            </div>
          )}
        </div>

        <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
          <Check className="text-primary" size={14} weight="bold" />
          Runs once — this page disappears after your first admin is created.
        </p>
      </div>
    </div>
  );
}
