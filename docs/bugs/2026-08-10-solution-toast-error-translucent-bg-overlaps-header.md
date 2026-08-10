# Solution: Error/warning/info toasts render with a see-through background, looking like a broken/overlapping popup over the header

**What changed:**
- `app/globals.css` — added `--error-subtle`, `--warning-subtle`, `--info-subtle` tokens (light + dark, following the existing `--success-subtle` pattern: same hue as the base status color, high-lightness/low-chroma for light mode, low-lightness for dark mode) and proxied them in `@theme inline` as `--color-error-subtle`, `--color-warning-subtle`, `--color-info-subtle`.
- `components/ui/sonner.tsx` — swapped the toast `classNames` for `error`, `warning`, `info` from translucent opacity backgrounds (`!bg-error/10`, `!bg-warning/15`, `!bg-primary/10`) to the new solid `!bg-error-subtle`, `!bg-warning-subtle`, `!bg-info-subtle` tokens, matching how `success` already worked.

**Why this fixes the root cause:** The toast was always stacked above the header (`z-index: 999999999` from sonner's own stylesheet vs. the header's `z-40`) — it just wasn't opaque, so the header/search bar visibly showed through it. Giving each status variant a solid background removes the see-through effect without touching positioning or z-index, and keeps all four toast variants (`success`/`error`/`warning`/`info`) consistent.

**Verified:** `tsc --noEmit` passes clean after the change.
