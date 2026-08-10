# daisyUI Migration Status

_Audited: 2026-08-10_

## Target end-state

```
Current project                          Complete daisyUI migration
├── Custom/shadcn-style tokens                 ├── daisyUI theme tokens
├── Custom Tailwind component styles    ──▶    ├── daisyUI component classes
├── components/ui/*                            ├── Headless UI ONLY where behavior is needed
├── Headless UI behavior                       └── Tailwind utilities ONLY for layout/custom details
└── Tailwind utilities
```

## Summary

**Partial — foundation is solid, component/call-site adoption is roughly half done.**

## Done

- `app/globals.css` has daisyUI properly installed and configured: `@plugin "daisyui" { themes: false }` with full custom `light`/`dark` theme blocks (`@plugin "daisyui/theme"`) defining every semantic color token, plus `--radius-*: 0`, `--depth: 0`, `--noise: 0` to match the no-radius/no-shadow design rules.
- A meaningful set of components already use real daisyUI component classes: `button.tsx` (`btn`, `btn-primary/outline/secondary/ghost/error/link`), `alert.tsx` (`alert`), `select.tsx` (`select`), `tabs.tsx` (`tabs`/`tabs-list`), `table.tsx` (`table`), `progress.tsx` (`progress progress-primary`), `dropdown-menu.tsx` (`dropdown-menu-*`), `sonner.tsx` (toast).

## Not done

### 1. The shadcn compat shim is still fully wired up

`globals.css` keeps a parallel set of legacy CSS vars (`--background`, `--primary`, `--muted-foreground`, `--sidebar-*`, `--chart-*`, etc.) that just proxy to the daisyUI tokens — the file's own comment calls these out as retiring "incrementally as call sites migrate," and that hasn't happened yet.

### 2. Legacy utility classes still in components/ui/

29 of ~39 files in `components/ui/` still reference legacy shadcn utility names (`bg-background`, `text-muted-foreground`, `border-input`, etc.) instead of daisyUI's own (`bg-base-100`, `text-base-content`, `border-base-300`).

Heaviest offenders (occurrence count):

| File | Legacy token occurrences |
|---|---|
| `dropdown-menu.tsx` | 7 |
| `calendar.tsx` | 7 |
| `time-combobox.tsx` | 5 |
| `select.tsx` | 5 |
| `country-combobox.tsx` | 5 |
| `stat.tsx` | 4 |
| `tabs.tsx` | 3 |
| `data-table.tsx` | 3 |
| `address-autocomplete.tsx` | 3 |

### 3. Core primitives with zero native daisyUI base class

These are entirely hand-built Tailwind + Headless UI/Radix, not daisyUI components at all — the inverse of the target state (custom classes + headless behavior for everything, instead of daisyUI classes + headless behavior only where needed):

- `Dialog` / `AlertDialog` — no `modal`
- `Card` — no `card`
- `Checkbox` — no `checkbox`
- `RadioGroup` — no `radio`
- `Switch` — no `toggle`
- `Popover` — no `dropdown`
- `Tooltip`, `Sheet`, `Slider`, `Badge` — no matching daisyUI class

This is the biggest remaining gap.

### 4. App-wide legacy token usage

~121 of 243 `.ts`/`.tsx` files under `app/` + `components/` (roughly half) still call the legacy shadcn utility names directly at usage sites, not just inside `components/ui/`. Even once the UI Kit primitives are migrated, these call sites need updating too.

## Side note (not migration-related)

A daisyUI Quality Inspector audit run against `components/ui/` during this check also flagged some pre-existing accessibility gaps, unrelated to the migration itself:

- Missing accessible names on `Input`, `Textarea`, `Select`, and the native `<input>`s inside `country-combobox.tsx`, `time-combobox.tsx`, `address-autocomplete.tsx`
- No `alt` attribute on `Avatar`'s `<img>`
- `DataTable` missing a horizontal-overflow wrapper

Worth a separate pass.

## Suggested next steps

1. Rebuild `Checkbox` / `Switch` / `RadioGroup` / `Card` / `Dialog` on native daisyUI classes first — biggest structural gap.
2. Sweep remaining legacy token call sites in `components/ui/`, then app-wide.
3. Once all call sites are migrated, remove the shadcn-compat CSS variable layer from `globals.css`.
