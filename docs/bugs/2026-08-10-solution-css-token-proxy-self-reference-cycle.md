# Solution: shadcn-compat proxy tokens self-reference daisyUI's native color tokens

**What changed:** `app/globals.css` only.

- Removed `--color-primary: var(--primary);`, `--color-secondary: var(--secondary);`,
  `--color-accent: var(--accent);`, `--color-success: var(--success);`, and
  `--color-warning: var(--warning);` from the `@theme inline` block. daisyUI's own
  `@plugin "daisyui/theme"` blocks already define these five natively — Tailwind's utility
  generator (`bg-primary`, `text-warning`, etc.) picks them up directly without needing a
  re-proxy.
- Left the bare `--primary: var(--color-primary);` (and `--secondary`, `--accent`,
  `--success`, `--warning`) declarations in `:root`/`.dark` untouched — `--primary` is
  still consumed directly (`var(--primary)`) by several TSX call sites (event colors,
  the FAQ accent border, the nprogress bar) and by `.dark`'s own indirection, and now
  resolves through a single non-circular hop straight to daisyUI's literal value instead
  of bouncing back through `@theme inline`.
- Updated the stale comment above the daisyUI theme blocks (previously described *all*
  shadcn-named variables as retiring "incrementally as call sites migrate" — no longer
  accurate now that the five natively-provided ones are consumed directly instead).

**Why this fixes the root cause:** the cycle existed because two separate declarations
mutually pointed at each other with no literal value in either. Removing the
`@theme inline` side leaves exactly one non-circular source of truth per token
(daisyUI's own theme-block literal), so the cycle can never manifest even if `@layer`
registration order changes in a future Tailwind/daisyUI upgrade — the fix no longer
depends on incidental layer-priority behavior.

**How it was verified:**
1. `pnpm typecheck` — passes clean.
2. `APP_URL=http://localhost:3000 pnpm build` — succeeds, all 61 routes generated.
3. Diffed the compiled production CSS chunk before/after: `.bg-primary` changed from
   `background-color:var(--primary)` (the extra, previously-circular hop) to
   `background-color:var(--color-primary)` (daisyUI's native token, one hop). Same check
   repeated for `.text-primary`, `.bg-accent`, `.bg-success`, `.text-warning`,
   `aria-expanded:bg-secondary`, and `.bg-warning\/15` — all resolve to `var(--color-*)`
   directly, and the underlying literal `oklch()`/hex values in the daisyUI theme blocks
   were not touched, so rendered colors are unchanged.
4. Grepped the removed dead tokens (`--card`, `--destructive`, `--ring`, `--chart-1..5`,
   `--sidebar-ring`, `--sidebar-accent-foreground`, etc., removed in the same pass) across
   `app/`, `components/`, `lib/` — zero remaining references.
