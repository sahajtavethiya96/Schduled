"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import type { TocEntry } from "./legal-shell";

export function TocNav({ toc }: { toc: TocEntry[] }) {
  const [activeId, setActiveId] = useState<string>("");

  useEffect(() => {
    const observers: IntersectionObserver[] = [];

    toc.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (!el) return;

      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) setActiveId(id);
        },
        { rootMargin: "-80px 0px -60% 0px", threshold: 0 }
      );

      observer.observe(el);
      observers.push(observer);
    });

    return () => observers.forEach((o) => o.disconnect());
  }, [toc]);

  return (
    <nav className="space-y-0.5">
      {toc.map((entry) => {
        const active = activeId === entry.id;
        return (
          <a
            key={entry.id}
            href={`#${entry.id}`}
            className={cn(
              "group flex items-center gap-2.5 border-l-2 py-1.5 pl-4 text-sm transition-all duration-200",
              active
                ? "border-primary text-primary font-semibold"
                : "border-base-300 text-muted-foreground hover:border-primary/50 hover:text-base-content"
            )}
          >
            <span
              className={cn(
                "h-1.5 w-1.5 rounded-full shrink-0 transition-all duration-200",
                active ? "bg-primary scale-125" : "bg-base-300 group-hover:bg-primary/50"
              )}
            />
            <span className="transition-transform duration-200 group-hover:translate-x-0.5">
              {entry.label}
            </span>
          </a>
        );
      })}
    </nav>
  );
}
