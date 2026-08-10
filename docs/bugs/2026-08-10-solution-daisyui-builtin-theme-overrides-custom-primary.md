# Solution: daisyUI built-in light/dark themes override custom teal palette on buttons

**What changed:** `app/globals.css` — one line, in the `@plugin "daisyui" { ... }` config
block:

```diff
 @plugin "daisyui" {
-  themes: light --default, dark;
+  themes: false;
 }
```

**Why this fixes the root cause:** per daisyUI's own configuration guidance, `themes:`
selects from the *bundled* theme library (light, dark, cupcake, ...). When a project
fully defines its own custom themes via `@plugin "daisyui/theme" { name: "light"; ... }`
/ `{ name: "dark"; ... }` (as this project already did, with `default: true` / `default:
false` set on the respective blocks), `themes: false` is the documented way to opt out of
the bundled presets so only the custom theme blocks are compiled. No other file needed to
change — the custom theme blocks in `app/globals.css` (lines ~78–156) already had correct
teal values and `default` flags.

**How it was verified:**
1. Diffed the compiled Turbopack CSS chunk before/after: before, `--color-primary:
   #422ad5` / `--color-secondary: #f43098` (daisyUI's built-in violet/pink) appeared
   alongside the project's teal values for the same `[data-theme="light"]` selector;
   after, `grep -c "#422ad5|#f43098"` on the recompiled CSS returns `0`, leaving only
   `--color-primary: #0c9488` (light) / `#1db6a5` (dark) — matching the user-supplied
   target `lab(54.8535% -36.0397 -3.47621)`.
2. `tsc --noEmit` — passes clean.
