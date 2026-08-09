# Bug: `Switch` track/thumb render a visible 2px radius, violating the zero-radius design rule

**Where:** `components/ui/switch.tsx:61` (track) and `:68` (thumb)

**What's broken:** CLAUDE.md's Design Rules state "Zero border radius everywhere... Never use `rounded-*` classes" (exception: `rounded-full` for circular avatar/icon elements only). `Switch`'s track (`className` at line 61) and thumb (`span` at line 68) both use `rounded-sm`, which is **not** zeroed by the project's token architecture the way `rounded-none`/`rounded-md`/`rounded-lg`/etc. are.

**Root cause:** `app/globals.css`'s `@theme inline` block maps Tailwind's own radius scale to the project's zero-radius brand:

```css
--radius-sm:  2px;   /* NOT zeroed */
--radius-md:  0;
--radius-lg:  0;
--radius-xl:  0;
--radius-2xl: 0;
--radius-3xl: 0;
--radius-4xl: 0;
```

Every other `rounded-*` step in the project is zeroed except `rounded-sm`, which is deliberately kept at `2px` for the few places that legitimately want a barely-perceptible corner softening (this is a shared global token, not specific to `Switch` — other consumers of `rounded-sm` may exist elsewhere and are out of scope for this fix). `switch.tsx` is the only `components/ui/*` file using `rounded-sm`, and it wasn't an intentional design choice for the toggle — it was carried over from the original shadcn/Radix-based `Switch` implementation's default corner treatment and never revisited against CLAUDE.md's rule.

**How it was found:** Surfaced during the DaisyUI migration audit (project-wide `rounded-*` census) as the only live, non-`rounded-none`/`rounded-full` radius usage in `app/` or `components/`.

**Confirmed via:** `grep -rnoE '\brounded-(sm|md|lg|xl|2xl|3xl|4xl)\b' app components --include="*.tsx"` → only hits are `switch.tsx:61` and `switch.tsx:68`.
