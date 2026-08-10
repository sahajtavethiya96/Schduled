"use client";

import { Check, Copy, Link, Warning } from "@phosphor-icons/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { changeUsername } from "@/app/actions/settings";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface MyLinkFormProps {
  appUrl: string;
  currentUsername: string;
}

type Availability = "idle" | "checking" | "available" | "taken" | "invalid";

export function MyLinkForm({ currentUsername, appUrl }: MyLinkFormProps) {
  const [username, setUsername] = useState(currentUsername);
  const [avail, setAvail] = useState<Availability>("idle");
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [message, setMessage] = useState<{
    type: "ok" | "error";
    text: string;
  } | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const bookingUrl = `${appUrl}/${username || "…"}`;

  const checkUsername = useCallback(
    async (val: string) => {
      if (val === currentUsername) {
        setAvail("idle");
        return;
      }
      if (val.length < 3) {
        setAvail("invalid");
        return;
      }
      setAvail("checking");
      try {
        const res = await fetch(
          `/api/username-check?username=${encodeURIComponent(val)}`
        );
        const data = (await res.json()) as {
          available: boolean;
          reason?: string;
        };
        setAvail(data.available ? "available" : "taken");
      } catch {
        setAvail("idle");
      }
    },
    [currentUsername]
  );

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => checkUsername(username), 400);
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [username, checkUsername]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (avail === "taken" || avail === "invalid") {
      return;
    }
    setSaving(true);
    setMessage(null);
    const result = await changeUsername({ username });
    setSaving(false);
    if ("error" in result) {
      setMessage({ type: "error", text: result.error });
    } else {
      setMessage({ type: "ok", text: "Booking link updated." });
      setAvail("idle");
      setTimeout(() => setMessage(null), 3000);
    }
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(bookingUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const borderColor =
    avail === "available"
      ? "border-primary"
      : avail === "taken" || avail === "invalid"
        ? "border-error"
        : "";

  const availText =
    avail === "checking"
      ? "Checking…"
      : avail === "available"
        ? "Available"
        : avail === "taken"
          ? "Already taken"
          : avail === "invalid"
            ? "Must be at least 3 characters"
            : null;

  const availColor = avail === "available" ? "text-primary" : "text-error";

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      {/* Current link preview */}
      <Card>
        <CardHeader>
          <CardTitle>Your Booking Link</CardTitle>
          <CardDescription>
            Anyone with this link can view your scheduling page.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 border border-base-300 bg-base-200/40 px-4 py-3">
            <Link className="shrink-0 text-muted-foreground" size={16} />
            <span className="flex-1 truncate text-sm font-mono">
              {bookingUrl}
            </span>
            <Button
              onClick={handleCopy}
              size="icon-sm"
              type="button"
              variant="ghost"
            >
              {copied ? (
                <Check className="text-primary" size={15} />
              ) : (
                <Copy size={15} />
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Username change */}
      <Card>
        <CardHeader>
          <CardTitle>Change Username</CardTitle>
          <CardDescription>
            Your old URL will redirect to the new one for 30 days.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="username">Username</Label>
            <div className="flex items-center">
              <span className="flex h-10 items-center border border-r-0 border-base-300 bg-base-200 px-3 text-sm text-muted-foreground">
                {appUrl.replace(/^https?:\/\//, "")}/
              </span>
              <Input
                className={`flex-1 ${borderColor}`}
                id="username"
                maxLength={30}
                onChange={(e) =>
                  setUsername(
                    e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "")
                  )
                }
                placeholder="your-name"
                value={username}
              />
            </div>
            <div className="flex items-center justify-between">
              {availText ? (
                <p className={`text-xs ${availColor}`}>{availText}</p>
              ) : (
                <span />
              )}
              <p className="text-xs text-muted-foreground">
                {username.length}/30
              </p>
            </div>
            <p className="text-xs text-muted-foreground">
              Lowercase letters, numbers, hyphens. 3–30 characters.
            </p>
          </div>

          {message && (
            <div
              className={`flex items-center gap-2 text-sm ${message.type === "ok" ? "text-primary" : "text-error"}`}
            >
              {message.type === "error" && <Warning size={15} />}
              {message.text}
            </div>
          )}

          <div className="flex justify-end">
            <Button
              disabled={
                saving ||
                avail === "taken" ||
                avail === "invalid" ||
                avail === "checking" ||
                username === currentUsername
              }
              type="submit"
            >
              {saving ? "Saving…" : "Save link"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
