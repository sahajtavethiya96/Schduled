# Solution: new-meeting-type wizard loses all data after "Edit Schedule" → back button

**Fixed:** 2026-07-25

**Files changed:** `app/(app)/event-types/_components/builder.tsx` only.

**What changed (superseded an earlier attempt):** The first fix opened the
three `/availability` links in a new tab (`target="_blank"`), which avoided
the data loss but forced the user to manually switch back to the original
tab — reported as its own bad UX, so that approach was reverted (confirmed
`tab-availability.tsx` now has no diff against its original state).

The actual fix adds sessionStorage-backed draft persistence to
`EventTypeBuilder`, the shared wizard used by both `/event-types/new`
(create) and `/event-types/[id]` (edit):
- A draft key scoped per mode — `schduled:event-type-draft:new` for create,
  `schduled:event-type-draft:edit:${eventTypeId}` for edit.
- On every form/tab/pending-question change, the current in-progress state
  (`form.watch()` values, `activeTab`, `pendingQuestions`) is written to
  `sessionStorage` under that key.
- On mount, if a draft exists under that key, it's restored via
  `form.reset(parsed.values, { keepDefaultValues: true })` plus restoring
  `activeTab`/`pendingQuestions` — deliberately **not** validated against the
  full Zod schema first, since a draft is often legitimately incomplete
  (e.g. the user jumped straight to the Scheduling tab before finishing
  Details); requiring full validity would silently drop perfectly good
  partial drafts. `keepDefaultValues: true` keeps `formState.isDirty`
  comparing against the true original server values, not the restored
  draft, so the edit-mode Save/Discard buttons still behave correctly.
- The draft is cleared (`sessionStorage.removeItem`) on successful create,
  successful edit-save, and on clicking "Discard" in edit mode — the three
  points where the in-progress draft is no longer the source of truth.

**Why this fixes the root cause:** Same-tab navigation to `/availability`
and back via the Back button now just works normally — the wizard remounts
with fresh defaults as before, but the mount-time effect immediately
restores the draft from sessionStorage, including which tab the user was
on. No new tab, no manual switching back — the Back button behaves exactly
as a user would expect.

**Known limitation:** Same cross-tab-schedule-list-staleness note as before
doesn't apply here since there's no separate tab anymore. A different
edge case: if the user abandons the wizard entirely (e.g. clicks "Meeting
Types" in the breadcrumb without saving), the draft is intentionally left
in sessionStorage rather than explicitly cleared — it'll simply be
overwritten or ignored (once schema-invalid-looking, e.g. wrong shape) the
next time they start a new wizard in that same tab, and sessionStorage
itself clears when the tab closes. This wasn't treated as worth adding an
explicit cancel-interception for, since sessionStorage's natural per-tab
lifetime already bounds it.

**How it was verified:** `pnpm tsc --noEmit` — clean after both the
new-tab attempt and the final draft-persistence version. Not live-tested in
a browser (no browser/screenshot tool available in this environment) —
verified by tracing the restore/persist/clear effects against every exit
point in `onSubmit` and the Discard button.
