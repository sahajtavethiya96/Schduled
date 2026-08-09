# Bug: `text-destructive-foreground` resolves to nothing

**Found while**: converting `components/ui/*` from custom Tailwind/shadcn compositions to
native daisyUI theme tokens (see paired solution doc), which required auditing every
color token referenced by the UI Kit against what's actually defined in `app/globals.css`.

## What's broken

`app/globals.css` defines `--destructive` (light: `oklch(0.577 0.245 27.325)`, dark:
`oklch(0.65 0.22 25)`) but never defines `--destructive-foreground`, and the `@theme inline`
block only maps `--color-destructive: var(--destructive)` — there is no
`--color-destructive-foreground` entry. Tailwind v4 only generates a utility class for a
color token that exists in `@theme`, so `text-destructive-foreground` has never compiled to
any real CSS in this project.

## Where

- `components/ui/button.tsx:20` — the `destructive` button variant: `bg-destructive
  text-destructive-foreground hover:bg-destructive/90 ...`
- 8 additional call sites that inline the same pair directly (`className="bg-destructive
  text-destructive-foreground hover:bg-destructive/90"`), e.g.
  `app/(app)/availability/_components/availability-form.tsx:1608`,
  `app/(app)/event-types/_components/event-type-card.tsx:215`,
  `components/settings-admin/users-table.tsx:336,372`, and others found via
  `grep -rn "destructive-foreground"`.

## How it was found

Grepping `app/globals.css` for `destructive` while mapping every shadcn-named CSS variable
to its daisyUI semantic equivalent (`--destructive` → daisyUI's `error`) surfaced that only
one half of the color pair (`--destructive`) had a defined value; `--destructive-foreground`
was absent from both `:root`/`.dark` and `@theme inline`.

## Root cause

The variable was never added when the destructive/error color was introduced — every other
semantic color pair (`--primary`/`--primary-foreground`, `--success`/`--success-foreground`,
etc.) has a `-foreground` counterpart; `destructive` was the one omission. Text on
destructive buttons has been falling back to inherited/ambient text color instead of an
explicit on-error foreground, which happens to still be legible against the current red but
was never actually guaranteed.
