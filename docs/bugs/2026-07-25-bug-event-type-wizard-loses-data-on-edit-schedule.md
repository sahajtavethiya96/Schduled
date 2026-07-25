# Bug: new-meeting-type wizard loses all data after "Edit Schedule" → back button

**Found:** 2026-07-25, reported by the user via screenshot while creating a
new meeting type at `/event-types/new`.

**Where:** `app/(app)/event-types/_components/tab-availability.tsx` (the
Scheduling tab of the event-type creation/edit wizard), three `<Link
href="/availability">` instances: "Edit Schedule" (schedule-preview panel),
"Set your availability" (empty-schedules state), and "Manage in
Availability" (Global Meeting Limits blurb).

**What's broken:** While filling out the "New Meeting Type" wizard
(`/event-types/new`), clicking "Edit Schedule" on the Scheduling tab
navigates the browser away to `/availability` in the **same tab** — a plain
`next/link` with no `target="_blank"`, despite already using an
`ArrowSquareOut` ("opens elsewhere") icon that visually implies otherwise.
Clicking the browser Back button afterward returns to `/event-types/new`,
but the entire form is blank again: name, duration, everything the user had
typed is gone.

**How it was found:** User reproduced it directly: started a new meeting
type, went to the Scheduling tab, clicked "Edit Schedule," then clicked
Back — landed back on a fully blank wizard.

**Root cause:** `app/(app)/event-types/new/page.tsx` is a server component
that computes fresh `DEFAULT_VALUES` on every request and passes them into
`EventTypeBuilder` (`app/(app)/event-types/_components/builder.tsx`), whose
`useForm<BuilderFormValues>` seeds purely from that `defaultValues` prop —
there is no sessionStorage/localStorage/URL-state persistence of in-progress
wizard data anywhere in this codebase (confirmed: no draft-persistence
mechanism exists for any multi-step form here — the onboarding wizard avoids
this class of bug entirely by keeping all its steps inside one mounted
route instead of navigating away mid-flow). A `beforeunload` guard exists in
`builder.tsx` for the isDirty case, but it only fires on a real page
unload/refresh — Next.js client-side navigation via `<Link>` never triggers
it, so it does nothing to protect against this exact flow. When the browser
Back button remounts `/event-types/new`, the server component reruns, hands
`EventTypeBuilder` brand-new defaults, and everything the user typed is
gone.
