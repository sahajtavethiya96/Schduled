"use client";

import { CircleNotch, Eraser } from "@phosphor-icons/react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { updateGoogleOAuthSettingsAction } from "@/app/actions/platform-settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { IntegrationSettingsSummary } from "@/lib/integration-settings";

interface Props {
  initial: IntegrationSettingsSummary["google"];
  onSaved?: (configured: boolean) => void;
}

export function GoogleOAuthSettingsForm({ initial, onSaved }: Props) {
  const [clientId, setClientId] = useState(initial.clientId);
  const [clientSecret, setClientSecret] = useState("");
  const [clearSecret, setClearSecret] = useState(false);
  const [saving, startSaving] = useTransition();

  const hasSecret = initial.hasClientSecret && !clearSecret;

  function save() {
    startSaving(async () => {
      const result = await updateGoogleOAuthSettingsAction({
        clientId,
        clientSecret: clearSecret ? "" : clientSecret || undefined,
      });
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      setClientSecret("");
      setClearSecret(false);
      toast.success(
        "Google OAuth settings saved. Calendar connections pick this up immediately — Google sign-in needs a server restart."
      );
      onSaved?.(true);
    });
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="google-client-id">Client ID</Label>
          <Input
            id="google-client-id"
            onChange={(e) => setClientId(e.target.value)}
            placeholder="From .env if unset"
            value={clientId}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="google-client-secret">Client secret</Label>
          <div className="flex items-center gap-2">
            <Input
              id="google-client-secret"
              onChange={(e) => {
                setClientSecret(e.target.value);
                setClearSecret(false);
              }}
              placeholder={hasSecret ? "•••••••• (already set)" : "Not set"}
              type="password"
              value={clientSecret}
            />
            {hasSecret && (
              <Button
                aria-label="Clear saved client secret"
                onClick={() => {
                  setClearSecret(true);
                  setClientSecret("");
                }}
                size="icon-sm"
                type="button"
                variant="outline"
              >
                <Eraser size={14} />
              </Button>
            )}
          </div>
          {clearSecret && (
            <p className="text-sm text-amber-600 dark:text-amber-500">
              Will clear the saved client secret on save.
            </p>
          )}
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        Changes to the Sign-In button need a server restart to take effect —
        Calendar connections apply immediately.
      </p>

      <div className="border-t border-border pt-4">
        <Button
          className="gap-1.5"
          disabled={saving}
          onClick={save}
          type="button"
        >
          {saving && <CircleNotch className="animate-spin" size={14} />}
          Save
        </Button>
      </div>
    </div>
  );
}
