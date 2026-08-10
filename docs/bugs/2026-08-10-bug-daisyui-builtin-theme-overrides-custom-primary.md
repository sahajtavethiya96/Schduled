# Bug: daisyUI built-in light/dark themes override custom teal palette on buttons

**Where:** `app/globals.css` — affects every `btn-primary` / `btn-secondary` (and any
`bg-primary`, `text-primary`, etc.) across the app, most visibly the dashboard header
action buttons (Create Meeting Type / Set Availability / My Booking Page).

**Found by:** User report — after the daisyUI migration (`d731cde`, `4ee57c0`), primary
buttons render violet/indigo and secondary buttons render pink/magenta instead of the
project's teal palette. User supplied the expected computed value
(`--primary: lab(54.8535% -36.0397 -3.47621)`, i.e. teal) and a before/after screenshot
comparison (local dev vs. the pre-migration deployed build).

**Root cause:**

```css
@plugin "daisyui" {
  themes: light --default, dark;
}
```

`light` and `dark` are reserved names for daisyUI's *bundled* preset themes (primary
`#422ad5`, secondary `#f43098`). The project also defines fully custom themes named
`"light"`/`"dark"` via separate `@plugin "daisyui/theme" { ... }` blocks (teal palette).
Because the `themes:` config line references the built-in names directly, daisyUI
compiled **both** the bundled preset and the custom override under the same theme names
and selectors (`[data-theme="light"]`, `:where(:root)`), and the built-in one was winning
on rendered buttons.

Confirmed by inspecting the compiled Turbopack CSS output: it contained two conflicting
sets of `--color-primary`/`--color-secondary` declarations for the identical selector —
one set with the built-in violet/pink hex values, one with the project's teal hex values.
