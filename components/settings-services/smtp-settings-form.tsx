"use client";

import { CircleNotch, Eraser, Plugs } from "@phosphor-icons/react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  testSmtpConnectionAction,
  updateSmtpSettingsAction,
} from "@/app/actions/platform-settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { IntegrationSettingsSummary } from "@/lib/integration-settings";

interface Props {
  initial: IntegrationSettingsSummary["smtp"];
  onSaved?: (configured: boolean) => void;
}

export function SmtpSettingsForm({ initial, onSaved }: Props) {
  const [host, setHost] = useState(initial.host);
  const [port, setPort] = useState(initial.port ? String(initial.port) : "");
  const [secure, setSecure] = useState(initial.secure ?? false);
  const [user, setUser] = useState(initial.user);
  const [from, setFrom] = useState(initial.from);
  const [pass, setPass] = useState("");
  const [clearPass, setClearPass] = useState(false);
  const [webhookSecret, setWebhookSecret] = useState("");
  const [clearWebhookSecret, setClearWebhookSecret] = useState(false);

  const [saving, startSaving] = useTransition();
  const [testing, startTesting] = useTransition();

  const hasPass = initial.hasPass && !clearPass;

  function save() {
    startSaving(async () => {
      const parsedPort = port.trim() ? Number(port) : null;
      if (port.trim() && Number.isNaN(parsedPort)) {
        toast.error("Port must be a number.");
        return;
      }

      const result = await updateSmtpSettingsAction({
        host,
        port: parsedPort,
        secure,
        user,
        from,
        pass: clearPass ? "" : pass || undefined,
        webhookSecret: clearWebhookSecret ? "" : webhookSecret || undefined,
      });
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      setPass("");
      setClearPass(false);
      setWebhookSecret("");
      setClearWebhookSecret(false);
      toast.success("SMTP settings saved.");
      onSaved?.(true);
    });
  }

  function test() {
    startTesting(async () => {
      const parsedPort = port.trim() ? Number(port) : null;
      const result = await testSmtpConnectionAction({
        host,
        port: parsedPort,
        secure,
        user,
        pass: clearPass ? "" : pass || undefined,
      });
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      toast.success("Connection succeeded.");
    });
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="smtp-host">Host</Label>
          <Input
            id="smtp-host"
            onChange={(e) => setHost(e.target.value)}
            placeholder="smtp.example.com (from .env)"
            value={host}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="smtp-port">Port</Label>
          <Input
            id="smtp-port"
            onChange={(e) => setPort(e.target.value)}
            placeholder="587"
            value={port}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="smtp-user">Username</Label>
          <Input
            id="smtp-user"
            onChange={(e) => setUser(e.target.value)}
            value={user}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="smtp-from">From address</Label>
          <Input
            id="smtp-from"
            onChange={(e) => setFrom(e.target.value)}
            placeholder="noreply@example.com"
            type="email"
            value={from}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="smtp-pass">Password</Label>
          <div className="flex items-center gap-2">
            <Input
              id="smtp-pass"
              onChange={(e) => {
                setPass(e.target.value);
                setClearPass(false);
              }}
              placeholder={hasPass ? "•••••••• (already set)" : "Not set"}
              type="password"
              value={pass}
            />
            {hasPass && (
              <Button
                aria-label="Clear saved password"
                onClick={() => {
                  setClearPass(true);
                  setPass("");
                }}
                size="icon-sm"
                type="button"
                variant="outline"
              >
                <Eraser size={14} />
              </Button>
            )}
          </div>
          {clearPass && (
            <p className="text-sm text-amber-600 dark:text-amber-500">
              Will clear the saved password on save.
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="smtp-webhook-secret">Webhook secret</Label>
          <div className="flex items-center gap-2">
            <Input
              id="smtp-webhook-secret"
              onChange={(e) => {
                setWebhookSecret(e.target.value);
                setClearWebhookSecret(false);
              }}
              placeholder={
                initial.hasWebhookSecret && !clearWebhookSecret
                  ? "•••••••• (already set)"
                  : "Optional"
              }
              type="password"
              value={webhookSecret}
            />
            {initial.hasWebhookSecret && !clearWebhookSecret && (
              <Button
                aria-label="Clear saved webhook secret"
                onClick={() => {
                  setClearWebhookSecret(true);
                  setWebhookSecret("");
                }}
                size="icon-sm"
                type="button"
                variant="outline"
              >
                <Eraser size={14} />
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Switch checked={secure} id="smtp-secure" onCheckedChange={setSecure} />
        <Label className="font-normal" htmlFor="smtp-secure">
          Use TLS (secure) — typically on for port 465
        </Label>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-border pt-4">
        <Button
          className="gap-1.5"
          disabled={saving || testing}
          onClick={save}
          type="button"
        >
          {saving && <CircleNotch className="animate-spin" size={14} />}
          Save
        </Button>
        <Button
          className="gap-1.5"
          disabled={saving || testing}
          onClick={test}
          type="button"
          variant="outline"
        >
          {testing ? (
            <CircleNotch className="animate-spin" size={14} />
          ) : (
            <Plugs size={14} />
          )}
          Test connection
        </Button>
      </div>
    </div>
  );
}
