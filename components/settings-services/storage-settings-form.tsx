"use client";

import { CircleNotch, Eraser, Plugs } from "@phosphor-icons/react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  testStorageConnectionAction,
  updateStorageSettingsAction,
} from "@/app/actions/platform-settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { IntegrationSettingsSummary } from "@/lib/integration-settings";

interface Props {
  initial: IntegrationSettingsSummary["storage"];
  onSaved?: (configured: boolean) => void;
}

type Driver = "local" | "s3" | "r2";

export function StorageSettingsForm({ initial, onSaved }: Props) {
  const [driver, setDriver] = useState<Driver>(
    (initial.driver || "local") as Driver
  );
  const [endpoint, setEndpoint] = useState(initial.s3Endpoint);
  const [region, setRegion] = useState(initial.s3Region);
  const [s3Bucket, setS3Bucket] = useState(initial.s3Bucket);
  const [s3AccessKeyId, setS3AccessKeyId] = useState(initial.s3AccessKeyId);
  const [s3Secret, setS3Secret] = useState("");
  const [clearS3Secret, setClearS3Secret] = useState(false);
  const [r2Bucket, setR2Bucket] = useState(initial.r2Bucket);
  const [r2AccountId, setR2AccountId] = useState(initial.r2AccountId);
  const [r2AccessKeyId, setR2AccessKeyId] = useState(initial.r2AccessKeyId);
  const [r2Secret, setR2Secret] = useState("");
  const [clearR2Secret, setClearR2Secret] = useState(false);
  const [publicBaseUrl, setPublicBaseUrl] = useState(initial.publicBaseUrl);

  const [saving, startSaving] = useTransition();
  const [testing, startTesting] = useTransition();

  const bucket = driver === "r2" ? r2Bucket : s3Bucket;
  const accessKeyId = driver === "r2" ? r2AccessKeyId : s3AccessKeyId;
  const secret = driver === "r2" ? r2Secret : s3Secret;
  const clearSecret = driver === "r2" ? clearR2Secret : clearS3Secret;
  const hasSecret =
    (driver === "r2"
      ? initial.hasR2SecretAccessKey
      : initial.hasS3SecretAccessKey) && !clearSecret;

  function setSecret(v: string) {
    if (driver === "r2") {
      setR2Secret(v);
      setClearR2Secret(false);
    } else {
      setS3Secret(v);
      setClearS3Secret(false);
    }
  }
  function clearSavedSecret() {
    if (driver === "r2") {
      setClearR2Secret(true);
      setR2Secret("");
    } else {
      setClearS3Secret(true);
      setS3Secret("");
    }
  }

  function save() {
    startSaving(async () => {
      if (driver === "s3" && !s3Bucket.trim()) {
        toast.error("S3 bucket is required.");
        return;
      }
      if (driver === "r2" && !(r2Bucket.trim() && r2AccountId.trim())) {
        toast.error("R2 bucket and account ID are required.");
        return;
      }

      const result = await updateStorageSettingsAction({
        driver,
        endpoint,
        region,
        bucket: driver === "r2" ? r2Bucket : s3Bucket,
        accountId: r2AccountId,
        accessKeyId: driver === "r2" ? r2AccessKeyId : s3AccessKeyId,
        publicBaseUrl,
        secretAccessKey:
          driver === "local"
            ? undefined
            : clearSecret
              ? ""
              : secret || undefined,
      });
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      setS3Secret("");
      setClearS3Secret(false);
      setR2Secret("");
      setClearR2Secret(false);
      toast.success("Storage settings saved.");
      onSaved?.(driver !== "local");
    });
  }

  function test() {
    if (driver === "local") {
      return;
    }
    startTesting(async () => {
      const result = await testStorageConnectionAction({
        driver,
        bucket,
        accountId: r2AccountId,
        accessKeyId,
        endpoint,
        region,
        secretAccessKey: clearSecret ? "" : secret || undefined,
      });
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      toast.success("Connection succeeded — uploaded and removed a test file.");
    });
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="storage-driver">Driver</Label>
        <Select onValueChange={(v) => setDriver(v as Driver)} value={driver}>
          <SelectTrigger className="max-w-xs" id="storage-driver">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="local">Local disk (default)</SelectItem>
            <SelectItem value="s3">S3-compatible</SelectItem>
            <SelectItem value="r2">Cloudflare R2</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {driver === "s3" && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="s3-bucket">Bucket</Label>
            <Input
              id="s3-bucket"
              onChange={(e) => setS3Bucket(e.target.value)}
              value={s3Bucket}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="s3-region">Region</Label>
            <Input
              id="s3-region"
              onChange={(e) => setRegion(e.target.value)}
              placeholder="Optional"
              value={region}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="s3-endpoint">Endpoint</Label>
            <Input
              id="s3-endpoint"
              onChange={(e) => setEndpoint(e.target.value)}
              placeholder="Only for non-AWS S3-compatible storage"
              value={endpoint}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="s3-access-key-id">Access key ID</Label>
            <Input
              id="s3-access-key-id"
              onChange={(e) => setS3AccessKeyId(e.target.value)}
              placeholder="Omit to use the AWS credential chain"
              value={s3AccessKeyId}
            />
          </div>
        </div>
      )}

      {driver === "r2" && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="r2-bucket">Bucket</Label>
            <Input
              id="r2-bucket"
              onChange={(e) => setR2Bucket(e.target.value)}
              value={r2Bucket}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="r2-account-id">Account ID</Label>
            <Input
              id="r2-account-id"
              onChange={(e) => setR2AccountId(e.target.value)}
              value={r2AccountId}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="r2-access-key-id">Access key ID</Label>
            <Input
              id="r2-access-key-id"
              onChange={(e) => setR2AccessKeyId(e.target.value)}
              value={r2AccessKeyId}
            />
          </div>
        </div>
      )}

      {driver !== "local" && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="storage-secret-key">Secret access key</Label>
            <div className="flex items-center gap-2">
              <Input
                id="storage-secret-key"
                onChange={(e) => setSecret(e.target.value)}
                placeholder={hasSecret ? "•••••••• (already set)" : "Not set"}
                type="password"
                value={secret}
              />
              {hasSecret && (
                <Button
                  aria-label="Clear saved secret access key"
                  onClick={clearSavedSecret}
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
                Will clear the saved secret access key on save.
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="storage-public-base-url">Public base URL</Label>
            <Input
              id="storage-public-base-url"
              onChange={(e) => setPublicBaseUrl(e.target.value)}
              placeholder="Optional — files are always served via /api/files"
              value={publicBaseUrl}
            />
          </div>
        </div>
      )}

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
        {driver !== "local" && (
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
        )}
      </div>
    </div>
  );
}
