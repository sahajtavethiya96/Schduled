"use client";

import { useState, useTransition } from "react";
import {
  revokeSessionAction,
  signOutOtherSessionsAction,
} from "@/app/actions/profile";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatDateTime } from "@/lib/utils";

export interface SessionRow {
  createdAt: string;
  expiresAt: string;
  id: string;
  ipAddress: string | null;
  isCurrent: boolean;
  userAgent: string | null;
}

export function SessionsCard({ sessions }: { sessions: SessionRow[] }) {
  const [revokeId, setRevokeId] = useState<string | null>(null);
  const [signOutAll, setSignOutAll] = useState(false);
  const [, startTransition] = useTransition();
  const otherSessionCount = sessions.filter((s) => !s.isCurrent).length;

  function handleRevoke() {
    if (!revokeId) return;
    const fd = new FormData();
    fd.append("sessionId", revokeId);
    startTransition(() => revokeSessionAction(fd));
    setRevokeId(null);
  }

  function handleSignOutOthers() {
    startTransition(() => signOutOtherSessionsAction());
    setSignOutAll(false);
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle>Active Sessions</CardTitle>
            <CardDescription>
              Review signed-in devices and revoke anything you do not recognize.
            </CardDescription>
          </div>
          {otherSessionCount > 0 && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setSignOutAll(true)}
            >
              Sign out other sessions
            </Button>
          )}
        </CardHeader>
        <CardContent className="p-0">
          {sessions.map((session, i) => (
            <div
              key={session.id}
              className={`flex items-start justify-between gap-4 px-6 py-4 transition-colors duration-150 hover:bg-base-200/40 ${i !== 0 ? "border-t border-base-300" : ""}`}
            >
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <span
                    className="truncate text-sm font-semibold"
                    title={session.userAgent ?? undefined}
                  >
                    {session.userAgent
                      ? describeUserAgent(session.userAgent)
                      : "Unknown device"}
                  </span>
                  {session.isCurrent && (
                    <span className="shrink-0 rounded-none bg-success/10 px-1.5 py-0.5 text-xs font-semibold uppercase tracking-wide text-success">
                      Current
                    </span>
                  )}
                </div>

                <div className="flex min-w-0 flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
                  {session.ipAddress && (
                    <span
                      className="max-w-[160px] truncate font-mono"
                      title={session.ipAddress}
                    >
                      {shortenIp(session.ipAddress)}
                    </span>
                  )}
                  <span
                    className="truncate"
                    title={`Created: ${formatDateTime(session.createdAt)}`}
                  >
                    Created {formatDateTime(session.createdAt)}
                  </span>
                  <span
                    className="truncate"
                    title={`Expires: ${formatDateTime(session.expiresAt)}`}
                  >
                    Expires {formatDateTime(session.expiresAt)}
                  </span>
                </div>
              </div>

              <div className="shrink-0">
                {session.isCurrent ? (
                  <span className="text-xs text-muted-foreground">Protected</span>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-xs border-error/40 text-error hover:bg-error/10 hover:text-error"
                    onClick={() => setRevokeId(session.id)}
                  >
                    Revoke
                  </Button>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Revoke single session */}
      <AlertDialog open={revokeId !== null} onOpenChange={(open) => { if (!open) setRevokeId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke this session?</AlertDialogTitle>
            <AlertDialogDescription>
              This device will be signed out immediately and will need to sign in again to access the account.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleRevoke}>
              Revoke session
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Sign out all other sessions */}
      <AlertDialog open={signOutAll} onOpenChange={setSignOutAll}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sign out other sessions?</AlertDialogTitle>
            <AlertDialogDescription>
              All sessions except your current one will be signed out immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleSignOutOthers}>
              Sign out all others
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function describeUserAgent(userAgent: string) {
  const browser = /Firefox/i.test(userAgent)
    ? "Firefox"
    : /Edg/i.test(userAgent)
      ? "Edge"
      : /Chrome/i.test(userAgent)
        ? "Chrome"
        : /Safari/i.test(userAgent)
          ? "Safari"
          : "Browser";
  const os = /Windows/i.test(userAgent)
    ? "Windows"
    : /Macintosh|Mac OS X/i.test(userAgent)
      ? "macOS"
      : /iPhone|iPad/i.test(userAgent)
        ? "iOS"
        : /Android/i.test(userAgent)
          ? "Android"
          : /Linux/i.test(userAgent)
            ? "Linux"
            : "";

  return os ? `${browser} on ${os}` : browser;
}

function shortenIp(ip: string): string {
  if (ip === "0000:0000:0000:0000:0000:0000:0000:0000" || ip === "::") return "::1 (localhost)";
  if (ip === "::1") return "::1 (localhost)";
  if (ip.includes(":") && !ip.includes("::")) {
    try {
      return ip
        .split(":")
        .map((g) => g.replace(/^0+/, "") || "0")
        .join(":")
        .replace(/(^|:)(0:)+0($|:)/, "::") || ip;
    } catch { return ip; }
  }
  return ip;
}
