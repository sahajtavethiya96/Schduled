# Bug: shadcn-compat proxy tokens self-reference daisyUI's native color tokens

**Where:** `app/globals.css` — the `@theme inline` block and the `:root`/`.dark` blocks,
for the `primary`, `secondary`, `accent`, `success`, and `warning` tokens.

**Found by:** Post-migration cleanup audit (this session), flagged as one of the
remaining items after the shadcn/Radix → daisyUI migration was otherwise completed.

**Root cause:**

```css
@theme inline {
  --color-primary: var(--primary);   /* proxy #1 */
}
:root {
  --primary: var(--color-primary);   /* proxy #2 — points straight back at #1 */
}
```

The same shape existed for `--color-secondary`/`--secondary`, `--color-accent`/`--accent`,
`--color-success`/`--success`, and `--color-warning`/`--warning`. Unlike the other proxied
tokens (`--background`, `--border`, `--popover`, ...), daisyUI's own `@plugin
"daisyui/theme"` blocks *already* define `--color-primary`, `--color-secondary`,
`--color-accent`, `--color-success`, and `--color-warning` natively with real literal
values (`--color-primary: oklch(0.60 0.104 184.735);` etc.). Re-proxying these five through
a bare `--primary`-style variable that points right back at `--color-*` created a two-hop
`var()` cycle with no literal value anywhere in the chain.

In the current build, this cycle stayed silent only by accident of CSS `@layer` ordering:
daisyUI's theme blocks compile into `@layer base`, which sits after Tailwind's `@layer
theme` (where `@theme inline` compiles to), so `@layer base`'s literal `--color-primary`
value always won the cascade regardless of specificity — meaning the theme-layer's
`var(--primary)` declaration for `--color-primary` was dead on arrival. Confirmed via the
compiled Turbopack CSS: `.bg-primary` resolved to `background-color:var(--primary)`, one
extra indirection hop that added no value and would break (both custom properties resolving
to nothing, i.e. `unset`) if the layer order ever changed — e.g. a Tailwind/daisyUI upgrade
that reorders `@layer` registration, or `:root`'s `data-theme` attribute being absent before
next-themes' inline script runs.
