"use client";

import {
  ArrowsClockwise,
  Bell,
  CalendarCheck,
  CalendarX,
  CheckCircle,
  Clock,
  Hourglass,
  X,
} from "@phosphor-icons/react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface NotificationItem {
  body: string | null;
  bookingId: string | null;
  createdAt: string;
  id: string;
  read: boolean;
  title: string;
  type: string;
}

const ICONS: Record<string, React.ReactNode> = {
  booking_created:           <CalendarCheck className="text-primary" size={16} />,
  booking_cancelled:         <CalendarX className="text-red-500" size={16} />,
  booking_rejected:          <CalendarX className="text-red-500" size={16} />,
  booking_rescheduled:       <ArrowsClockwise className="text-amber-500" size={16} />,
  booking_reschedule_requested: <ArrowsClockwise className="text-amber-500" size={16} />,
  booking_reminder:          <Clock className="text-amber-500" size={16} />,
  booking_pending_approval:  <Hourglass className="text-amber-500" size={16} />,
};

function notificationCountMessage(count: number, verb: "marked as read" | "cleared"): string {
  const has = count === 1 ? "has" : "have";
  return `${count} notification${count === 1 ? "" : "s"} ${has} been ${verb}.`;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) {
    return "just now";
  }
  if (mins < 60) {
    return `${mins}m ago`;
  }
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) {
    return `${hrs}h ago`;
  }
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export function NotificationBell() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/notifications");
      if (!res.ok) {
        return;
      }
      const data = await res.json();
      setItems(data.notifications ?? []);
      setUnread(data.unreadCount ?? 0);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load + poll every 10s
  useEffect(() => {
    load();
    const id = setInterval(load, 10_000);
    return () => clearInterval(id);
  }, [load]);

  // Re-fetch immediately when the user switches back to this tab
  useEffect(() => {
    function onVisible() {
      if (document.visibilityState === 'visible') load();
    }
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [load]);

  async function markAllRead() {
    if (unread === 0) return;
    const count = unread;
    setUnread(0);
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    try {
      await fetch("/api/notifications/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      toast.success(notificationCountMessage(count, "marked as read"));
    } catch {
      /* ignore */
    }
  }

  async function markRead(id: string) {
    let wasUnread = false;
    setItems((prev) =>
      prev.map((n) => {
        if (n.id === id && !n.read) {
          wasUnread = true;
          return { ...n, read: true };
        }
        return n;
      })
    );
    // setItems' updater runs synchronously, so wasUnread is set before this.
    if (wasUnread) {
      setUnread((prev) => Math.max(0, prev - 1));
      try {
        await fetch("/api/notifications/read", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids: [id] }),
        });
      } catch {
        /* ignore */
      }
    }
  }

  async function dismissOne(id: string) {
    const dismissed = items.find((n) => n.id === id);
    const wasUnread = !!dismissed && !dismissed.read;
    setItems((prev) => prev.filter((n) => n.id !== id));
    if (wasUnread) setUnread((prev) => Math.max(0, prev - 1));
    try {
      await fetch(`/api/notifications/${id}`, { method: "DELETE" });
    } catch {
      /* ignore */
    }
  }

  async function clearAll() {
    const count = items.length;
    if (count === 0) return;
    setItems([]);
    setUnread(0);
    try {
      await fetch("/api/notifications", { method: "DELETE" });
      toast.success(notificationCountMessage(count, "cleared"));
    } catch {
      /* ignore */
    }
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) load();
  }

  return (
    <Popover onOpenChange={handleOpenChange} open={open}>
      <PopoverTrigger asChild>
        <Button
          aria-label="Notifications"
          className="relative"
          size="icon"
          variant="ghost"
        >
          <Bell className="size-[18px]" weight="regular" />
          {unread > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center bg-red-500 px-1 text-[10px] font-bold leading-none text-white ring-2 ring-base-100">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b border-base-300 px-4 py-3">
          <span className="text-sm font-semibold">Notifications</span>
          <div className="flex items-center gap-2">
            {unread > 0 && (
              <button
                className="flex items-center gap-1 text-xs text-primary hover:underline"
                onClick={markAllRead}
                type="button"
              >
                <CheckCircle size={12} />
                Mark all read
              </button>
            )}
            {items.length > 0 && (
              <button
                className="text-xs text-muted-foreground hover:text-error hover:underline transition-colors"
                onClick={clearAll}
                type="button"
              >
                Clear all
              </button>
            )}
          </div>
        </div>

        <div className="max-h-[304px] overflow-y-auto scrollbar-thin scrollbar-thumb-base-300 scrollbar-track-transparent">
          {loading && items.length === 0 && (
            <p className="px-4 py-8 text-center text-xs text-muted-foreground">
              Loading…
            </p>
          )}
          {!loading && items.length === 0 && (
            <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
              <Bell className="text-muted-foreground/40" size={26} />
              <p className="text-xs text-muted-foreground">
                You&apos;re all caught up
              </p>
            </div>
          )}
          {items.map((n) => {
            const content = (
              <div
                className={cn(
                  "flex gap-3 px-4 py-3 transition-colors hover:bg-base-200/50",
                  !n.read && "bg-primary/[0.04]"
                )}
              >
                <span className="mt-0.5 shrink-0">
                  {ICONS[n.type] ?? <Bell size={16} />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-base-content" title={n.title}>
                    {n.title}
                  </p>
                  {n.body && (
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {n.body}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-muted-foreground/60">
                    {timeAgo(n.createdAt)}
                  </p>
                </div>
                {!n.read && (
                  <span className="mt-1.5 h-2 w-2 shrink-0 self-start bg-primary" />
                )}
              </div>
            );
            return (
              <div
                className="group/item relative border-b border-base-300/60 last:border-0"
                key={n.id}
              >
                {n.bookingId ? (
                  <Link
                    href={`/bookings?highlight=${n.bookingId}`}
                    onClick={() => {
                      void markRead(n.id);
                      setOpen(false);
                    }}
                  >
                    {content}
                  </Link>
                ) : (
                  content
                )}
                {/* Per-notification dismiss button */}
                <button
                  aria-label="Dismiss notification"
                  className="absolute right-2 top-2 hidden items-center justify-center h-5 w-5 bg-base-100 text-muted-foreground hover:bg-base-200 hover:text-base-content group-hover/item:flex [@media(hover:none)]:flex transition-colors border border-base-300/60"
                  onClick={() => dismissOne(n.id)}
                  type="button"
                >
                  <X size={11} />
                </button>
              </div>
            );
          })}
        </div>

        <div className="border-t border-base-300 px-4 py-2">
          <Link
            className="block text-center text-xs font-medium text-primary hover:underline"
            href="/bookings"
            onClick={() => setOpen(false)}
          >
            View all bookings
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
