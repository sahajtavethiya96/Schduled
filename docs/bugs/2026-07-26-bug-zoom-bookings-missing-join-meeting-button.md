# Bug: Zoom bookings never show the "Join Meeting" button (Google Meet works fine)

**Found:** 2026-07-26, reported by the user with a screenshot of a confirmed
Zoom booking's detail page — the "Quick actions" sidebar has Reschedule and
Cancel Booking but no Join Meeting button, and the Location card shows "Zoom"
with no join link. Google Meet bookings show the button correctly.

**Where:** `app/(app)/bookings/[id]/page.tsx` (renders the button) and
`lib/worker/handlers/video-link-generate.ts` (generates the Zoom link).

**Requested investigation vs. actual finding:** The initial theory was a
field-naming mismatch — that Zoom writes its link to a different property
(`join_url`/`start_url`/`zoomJoinUrl`) than a canonical `booking.meetingUrl`
Google Meet supposedly uses. That premise didn't hold up:

- `db/schema/bookings.ts` has no `meetingUrl` column, and no provider-specific
  column either. Both providers already write into the same three columns:
  `locationValue`, `videoLinkHost`, `videoLinkInvitee`.
- `lib/worker/handlers/calendar-write.ts` (Google Meet, extracts the URL from
  `conferenceData.entryPoints[].uri`) and the old
  `lib/worker/handlers/video-link-generate.ts` (Zoom, from `createZoomMeeting`'s
  `join_url`/`start_url`) both persisted to the exact same columns.
- `app/(app)/bookings/[id]/page.tsx`'s join-button condition already reads
  only `locationValue` and treats `'zoom'`/`'google_meet'` identically — no
  provider branching in the UI at all.

**What's actually broken:** `generateZoomLink` (in the old
`video-link-generate.ts`) silently no-ops whenever it can't produce a link:

```ts
if (!conn) {
  console.log(`... host ${b.hostUserId} has no Zoom connection — skipping`);
  return;
}
```

and any error from `getValidZoomAccessToken`/`createZoomMeeting` was simply
rethrown for pg-boss to retry (`VIDEO_LINK_GENERATE` has `retryLimit: 2`) —
once retries were exhausted, pg-boss just marked the job failed and nothing
in the codebase ever touched the booking row again. `locationValue` stays
`null` forever with zero trace of why, so the UI's (correct, provider-
agnostic) join-button check has nothing to render — indistinguishable from
"link generation hasn't run yet."

**How it was found:** Audited both provider write paths and the render
condition side by side (confirmed the schema/UI are already unified, ruling
out the reported premise), then traced every early `return`/`throw` in
`generateZoomLink` for cases where the booking row is never updated. The
calendar equivalent of this exact pattern (a revoked Google Calendar grant)
already has handling — `calendar-write.ts` flips the calendar to
`disconnected` and enqueues `CALENDAR_DISCONNECT_ALERT` on `invalid_grant`/401
— but no equivalent existed for Zoom's connection/token failures.

**Root cause:** `generateZoomLink` had no way to record a *permanent* failure
distinctly from "still in progress" or "transient, will retry" — every
give-up path silently returned without persisting anything, so a missing
Zoom OAuth connection, a revoked/expired refresh token, or a Zoom API error
that survives all retries all produce the exact same symptom: an
indefinitely `null` `locationValue` and a Join Meeting button that never
appears, with no signal to the host or an admin that anything went wrong.
