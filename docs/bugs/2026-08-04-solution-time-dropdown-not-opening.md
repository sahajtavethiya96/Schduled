# Solution: Availability page time dropdown doesn't open on click

**What changed:** `components/ui/time-combobox.tsx` — changed the `container` state's type and both places it can settle on `null` to use `undefined` instead:
- `useState<Element | null>(null)` → `useState<Element | undefined>(undefined)`
- `setContainer(triggerRef.current?.closest('[role="dialog"]') ?? null)` → `... ?? undefined`

**Why this fixes the root cause:** `FloatingPortal`'s `root` prop (from `@floating-ui/react`) only treats an explicit `null` as "not resolved yet, wait indefinitely." Passing `undefined` (the value's absence) makes it fall through to the default portal target (document body, or the nearest `PortalContext`), exactly like `booking-calendar.tsx`'s and `country-combobox.tsx`'s `Popover` usages, which never pass a `container` prop at all and were never affected. The dialog-scoping behavior (portal into an ancestor `<Dialog>` when one exists, for scroll-lock reasons) is unchanged — it still resolves to the real dialog `Element` when found.

**How it was verified:**
1. `npx tsc --noEmit` — clean, no new type errors.
2. Reproduced the bug live on a throwaway unauthenticated test route rendering 7 rows of `TimeCombobox` (mirroring the Availability page's weekly-hours grid) via a headless Playwright script: before the fix, clicking a trigger flipped `data-state` to `open` but `[data-slot="popover-content"]` never appeared in the DOM (0 console errors). After the fix, the same click produces `[data-slot="popover-content"]` in the DOM, and a screenshot confirms the time list renders and is interactive (type-to-filter input, scrollable options, checkmark on the selected time). The throwaway test route was removed after verification.
