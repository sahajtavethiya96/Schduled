"use client";

import { MagnifyingGlass, Spinner } from "@phosphor-icons/react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function UsersSearch() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [value, setValue] = useState(searchParams.get("q") ?? "");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (document.activeElement === inputRef.current) {
      return;
    }
    setValue(searchParams.get("q") ?? "");
  }, [searchParams]);

  function pushSearch(next: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("page");
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
    <form className="relative flex items-center" onSubmit={onSubmit}>
      {isPending ? (
        <Spinner
          className="pointer-events-none absolute left-3 animate-spin text-primary"
          size={15}
        />
      ) : (
        <MagnifyingGlass
          className="pointer-events-none absolute left-3 text-muted-foreground"
          size={15}
        />
      )}
      <Input
        className="h-9 w-full pl-8 pr-3 text-sm sm:w-64"
        name="q"
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search by name or email..."
        ref={inputRef}
        type="search"
        value={value}
      />
    </form>
  );
}

export function UsersFilter({ value }: { value: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  function onValueChange(next: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("page");
    if (next === "all") {
      params.delete("filter");
    } else {
      params.set("filter", next);
    }
    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    });
  }

  return (
    <Select onValueChange={onValueChange} value={value}>
      <SelectTrigger className="h-9 w-40 text-sm">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All Users</SelectItem>
        <SelectItem value="active">Active</SelectItem>
        <SelectItem value="admins">Admins</SelectItem>
        <SelectItem value="suspended">Suspended</SelectItem>
      </SelectContent>
    </Select>
  );
}
