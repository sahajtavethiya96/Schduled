"use client";

import { CaretDown } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface FaqItem {
  a: string;
  defaultOpen?: boolean;
  q: string;
}

// ── Responsive hook — disables translateX on mobile to prevent overflow ───────

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    setIsDesktop(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return isDesktop;
}

// ── Shared premium accordion item ─────────────────────────────────────────────

interface PremiumFaqProps {
  items: FaqItem[];
  theme: "light" | "dark";
}

function PremiumFaqAccordion({ items, theme }: PremiumFaqProps) {
  const defaultIndex = items.findIndex((i) => i.defaultOpen);
  const [open, setOpen] = useState<number | null>(
    defaultIndex >= 0 ? defaultIndex : null
  );
  const isDesktop = useIsDesktop();

  const isDark = theme === "dark";

  return (
    <div className="flex flex-col gap-2.5">
      {items.map((item, i) => {
        const isOpen = open === i;
        return (
          <div className="relative" key={item.q}>
            {/* Glow behind active card — blurred div, not box-shadow */}
            <div
              aria-hidden
              className={cn(
                "pointer-events-none absolute inset-0 -z-10 transition-opacity duration-300",
                isDark ? "bg-primary/[0.13]" : "bg-primary/[0.07]",
                isOpen ? "opacity-100" : "opacity-0"
              )}
              style={{ filter: "blur(24px)", transform: "scale(1.22)" }}
            />

            <div
              className={cn(
                "relative cursor-pointer border transition-colors duration-300",
                isDark
                  ? isOpen
                    ? "border-primary/45 bg-white/[0.09]"
                    : "border-white/[0.09] bg-white/[0.05] hover:border-white/[0.15] hover:bg-white/[0.08]"
                  : isOpen
                    ? "border-primary/40 bg-primary/[0.04]"
                    : "border-base-300 bg-base-100 hover:border-primary/25 hover:bg-primary/[0.02]"
              )}
              onClick={() => setOpen(isOpen ? null : i)}
              style={{
                zIndex: isOpen ? 10 : 1,
                transform: isOpen
                  ? `${isDesktop ? "translateX(16px) " : ""}scale(1.02)`
                  : "translateX(0) scale(1)",
                transition:
                  "transform 0.3s ease, border-color 0.3s ease, background-color 0.3s ease",
              }}
            >
              {/* Question row — always visible */}
              <div
                className={cn(
                  "flex items-center justify-between gap-4",
                  isOpen ? "px-6 py-5" : "px-5 py-4"
                )}
              >
                <span
                  className={cn(
                    "text-sm transition-colors duration-300",
                    isDark
                      ? isOpen
                        ? "font-bold text-white"
                        : "font-semibold text-white/70"
                      : isOpen
                        ? "font-bold text-base-content"
                        : "font-semibold text-base-content/70"
                  )}
                >
                  {item.q}
                </span>
                <CaretDown
                  className={cn(
                    "shrink-0 transition-colors duration-300",
                    isDark
                      ? isOpen
                        ? "text-primary"
                        : "text-white/40"
                      : isOpen
                        ? "text-primary"
                        : "text-muted-foreground/45"
                  )}
                  size={16}
                  style={{
                    transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                    transition: "transform 0.3s ease",
                  }}
                  weight="bold"
                />
              </div>

              {/* Answer — smooth CSS-grid height reveal */}
              <div
                style={{
                  display: "grid",
                  gridTemplateRows: isOpen ? "1fr" : "0fr",
                  transition: "grid-template-rows 0.3s ease",
                }}
              >
                <div style={{ overflow: "hidden" }}>
                  <div
                    className="px-6 pb-7 pt-0"
                    style={{
                      opacity: isOpen ? 1 : 0,
                      transform: isOpen ? "translateY(0)" : "translateY(-6px)",
                      transition:
                        "opacity 0.28s ease 0.07s, transform 0.28s ease 0.07s",
                    }}
                  >
                    <p
                      className={cn(
                        "text-sm leading-relaxed",
                        isDark ? "text-white/60" : "text-muted-foreground"
                      )}
                    >
                      {item.a}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Export ────────────────────────────────────────────────────────────────────

export function FaqAccordion({
  items,
  variant = "light",
}: {
  items: FaqItem[];
  variant?: "light" | "dark";
}) {
  return <PremiumFaqAccordion items={items} theme={variant} />;
}
