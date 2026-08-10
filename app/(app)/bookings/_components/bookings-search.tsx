"use client";

import { MagnifyingGlass, Spinner } from "@phosphor-icons/react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Input } from "@/components/ui/input";

export function BookingsSearch({ tab }: { tab: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [value, setValue] = useState(searchParams.get("q") ?? "");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync from the URL only when the change is external (e.g. the "Clear search"
  // link). While the input is focused the user is typing, so skip the sync —
  // otherwise re-setting the value reselects/clobbers the text being entered.
  useEffect(() => {
    if (document.activeElement === inputRef.current) {
      return;
    }
    setValue(searchParams.get("q") ?? "");
  }, [searchParams]);

  function pushSearch(next: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    const trimmed = next.trim();
    if (trimmed) {
      params.set("q", trimmed);
    } else {
      params.delete("q");
    }
    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    });
  }

  function onChange(next: string) {
    setValue(next);
    if (timer.current) {
      clearTimeout(timer.current);
    }
    timer.current = setTimeout(() => pushSearch(next), 350);
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (timer.current) {
      clearTimeout(timer.current);
    }
    pushSearch(value);
  }

  useEffect(
    () => () => {
      if (timer.current) {
        clearTimeout(timer.current);
      }
    },
    []
  );

  return (
    <form className="ml-auto relative flex items-center" onSubmit={onSubmit}>
      {isPending ? (
        <Spinner
          className="pointer-events-none absolute left-2.5 animate-spin text-primary"
          size={14}
        />
      ) : (
        <MagnifyingGlass
          className="pointer-events-none absolute left-2.5 text-muted-foreground"
          size={14}
        />
      )}
      <Input
        className="h-9 w-full sm:w-56 pl-8 pr-3 text-sm"
        name="q"
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search name or email..."
        ref={inputRef}
        type="search"
        value={value}
      />
    </form>
  );
}
