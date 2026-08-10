"use client";

import { MaskHappy, SignOut } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";

export function ImpersonationBanner({ userName }: { userName: string }) {
  const router = useRouter();
  const [stopping, setStopping] = useState(false);

  async function handleStop() {
    setStopping(true);
    try {
      await authClient.admin.stopImpersonating();
      router.push("/settings/users");
      router.refresh();
    } catch {
      setStopping(false);
    }
  }

  return (
    <div className="flex shrink-0 items-center justify-between gap-4 border-b border-amber-300 bg-amber-50 px-4 py-2 dark:border-amber-700 dark:bg-amber-950/40">
      <div className="flex items-center gap-2 text-sm font-medium text-amber-800 dark:text-amber-300">
        <MaskHappy
          className="shrink-0 text-amber-600 dark:text-amber-400"
          size={16}
          weight="fill"
        />
        <span>
          You are currently acting as{" "}
          <span className="font-bold">{userName}</span>. Any actions you take
          will affect this account.
        </span>
      </div>
      <button
        className="flex shrink-0 items-center gap-1.5 border border-amber-400 bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800 transition-colors hover:bg-amber-200 disabled:opacity-60 dark:border-amber-600 dark:bg-amber-900/40 dark:text-amber-300 dark:hover:bg-amber-900/60"
        disabled={stopping}
        onClick={handleStop}
      >
        <SignOut size={13} weight="bold" />
        {stopping ? "Stopping…" : "Stop impersonating"}
      </button>
    </div>
  );
}
