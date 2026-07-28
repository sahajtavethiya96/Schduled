"use client";

import { Image as ImageIcon, Trash, UploadSimple } from "@phosphor-icons/react";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { updateBrandingAction } from "@/app/actions/platform-settings";
import { UnsavedChangesBar } from "@/components/settings-admin/unsaved-changes-bar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { StoredBranding } from "@/lib/settings/branding";

interface Props {
  defaultAppName: string;
  defaultBrandColor: string;
  initial: StoredBranding;
}

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

export function BrandingEditor({
  initial,
  defaultAppName,
  defaultBrandColor,
}: Props) {
  const [form, setForm] = useState<StoredBranding>(initial);
  const [saved, setSaved] = useState<StoredBranding>(initial);
  const [uploading, setUploading] = useState(false);
  const [pending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const dirty =
    form.appName !== saved.appName ||
    form.logoUrl !== saved.logoUrl ||
    form.brandColor !== saved.brandColor ||
    form.supportEmail !== saved.supportEmail;

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) {
      return;
    }

    setUploading(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/upload/branding-logo", {
        method: "POST",
        body,
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Upload failed. Please try again.");
        return;
      }
      setForm((f) => ({ ...f, logoUrl: data.url }));
      toast.success("Logo uploaded — remember to save.");
    } catch {
      toast.error("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  function save() {
    if (form.brandColor && !HEX_COLOR.test(form.brandColor)) {
      toast.error("Brand color must be a hex value like #0D9488.");
      return;
    }
    startTransition(async () => {
      const result = await updateBrandingAction(form);
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      setSaved(form);
      toast.success("Branding updated.");
    });
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="branding-app-name">Application name</Label>
            <Input
              id="branding-app-name"
              onChange={(e) =>
                setForm((f) => ({ ...f, appName: e.target.value }))
              }
              placeholder={defaultAppName}
              value={form.appName ?? ""}
            />
            <p className="text-sm text-muted-foreground">
              Shown in every email header and footer. Leave blank to use{" "}
              {defaultAppName}.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="branding-color">Brand color</Label>
            <div className="flex items-center gap-3">
              <input
                aria-label="Brand color picker"
                className="size-9 shrink-0 cursor-pointer border border-input bg-background p-0.5"
                onChange={(e) =>
                  setForm((f) => ({ ...f, brandColor: e.target.value }))
                }
                type="color"
                value={
                  HEX_COLOR.test(form.brandColor ?? "")
                    ? (form.brandColor as string)
                    : defaultBrandColor
                }
              />
              <Input
                className="max-w-40 font-mono"
                id="branding-color"
                onChange={(e) =>
                  setForm((f) => ({ ...f, brandColor: e.target.value }))
                }
                placeholder={defaultBrandColor}
                value={form.brandColor ?? ""}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              Used for buttons and links in emails. Leave blank for{" "}
              {defaultBrandColor}.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="branding-support-email">Support email</Label>
            <Input
              id="branding-support-email"
              onChange={(e) =>
                setForm((f) => ({ ...f, supportEmail: e.target.value }))
              }
              placeholder="support@example.com"
              type="email"
              value={form.supportEmail ?? ""}
            />
            <p className="text-sm text-muted-foreground">
              Shown in email footers when set. Left off entirely if blank.
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Logo</Label>
          <div className="flex flex-col gap-3 border border-border p-5">
            <div className="flex h-20 items-center justify-center border border-dashed border-border bg-muted/20">
              {form.logoUrl ? (
                // Arbitrary admin-supplied/self-hosted URL — next/image would
                // need it added to next.config's remotePatterns allowlist.
                // biome-ignore lint/performance/noImgElement: preview thumbnail, not a public page
                <img
                  alt="Current logo"
                  className="max-h-16 max-w-[80%] object-contain"
                  src={form.logoUrl}
                />
              ) : (
                <div className="flex flex-col items-center gap-1 text-muted-foreground">
                  <ImageIcon size={20} />
                  <span className="text-sm">
                    No custom logo — name-only header
                  </span>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <input
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={handleFileChange}
                ref={fileInputRef}
                type="file"
              />
              <Button
                className="gap-1.5"
                disabled={uploading}
                onClick={() => fileInputRef.current?.click()}
                size="sm"
                type="button"
                variant="outline"
              >
                <UploadSimple size={14} />
                {uploading ? "Uploading…" : "Upload logo"}
              </Button>
              {form.logoUrl && (
                <Button
                  className="gap-1.5 text-destructive hover:border-destructive hover:text-destructive"
                  onClick={() => setForm((f) => ({ ...f, logoUrl: "" }))}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  <Trash size={14} />
                  Remove
                </Button>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              PNG, JPEG, or WebP, under 2 MB. Resized to fit 600×160.
            </p>
          </div>
        </div>
      </div>

      <UnsavedChangesBar
        label="Unsaved changes in Branding"
        onCancel={() => setForm(saved)}
        onSave={save}
        pending={pending}
        visible={dirty}
      />
    </>
  );
}
