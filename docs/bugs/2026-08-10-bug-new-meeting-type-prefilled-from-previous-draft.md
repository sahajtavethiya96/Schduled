# Bug: "New Meeting Type" form pre-filled with previous meeting type's data

**Where:** `app/(app)/event-types/_components/builder.tsx`, `/event-types/new`

## What's broken

After successfully creating a meeting type, opening "New Meeting Type" again
(same browser tab) shows the previous meeting type's name/description/etc.
pre-filled instead of a blank form.

## How it was found

Reported by user via screenshot: `/event-types/new` showed "Event Name:
justmmm" and a matching live preview, despite this being a fresh "create"
form that should default to empty. Traced by inspecting the sessionStorage
draft-persistence feature in `builder.tsx`.

## Root cause

`builder.tsx` persists an in-progress form draft to `sessionStorage` under a
key shared by every "create" session (`schduled:event-type-draft:new`,
`draftKeyFor()` at line ~213), meant to recover an accidentally-interrupted
edit.

The persist effect was keyed off `form.watch()` called with no arguments
(line 339, old code), which returns a **new object reference on every
re-render**, not just on actual field changes. On successful create, the
submit handler calls `clearDraft()` (removing the sessionStorage entry) and
then `setSuccessInfo(...)` to open the success dialog. That state update
triggers a re-render, `form.watch()` returns a new object reference again,
and the persist effect fires once more — **rewriting sessionStorage with the
just-submitted values**, undoing the `clearDraft()` call that had just run.

The next time the user opens `/event-types/new` in the same tab, the
mount-only restore effect finds this leftover draft under the shared key and
calls `form.reset(parsed.values, { keepDefaultValues: true })`, pre-filling
the "new" form with the previous meeting type's data.
