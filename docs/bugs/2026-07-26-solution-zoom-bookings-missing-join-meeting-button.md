# Solution: Zoom bookings never show the "Join Meeting" button

**Fixed:** 2026-07-26

**Files changed:**
- `db/schema/bookings.ts` — new nullable `videoLinkError` column on `booking`
- `db/migrations/0018_oval_black_panther.sql` (+ matching `meta/` snapshot) —
  `ALTER TABLE "booking" ADD COLUMN "video_link_error" text;`
- `lib/worker/handlers/video-link-generate.ts` — `generateZoomLink` now
  records *why* it gave up instead of silently returning
- `app/(app)/bookings/[id]/page.tsx` — surfaces that reason to the host when
  there's no join link

**What changed:**

1. Added `booking.videoLinkError` (nullable text) alongside the existing
   `locationValue`/`videoLinkHost`/`videoLinkInvitee` columns — no rename, no
   new provider-specific field, since the data model was already correctly
   unified across providers (see the paired bug doc).

2. `generateZoomLink` now takes the current attempt number and, on every path
   that previously gave up silently, calls a new `giveUpOnZoomLink()` helper
   that (a) writes a short machine-readable code to `booking.videoLinkError`
   (`zoom_not_connected`, `zoom_token_refresh_failed`,
   `zoom_meeting_create_failed`) and (b) writes an audit log entry
   (`video.link_generation_failed`, `entityType: "video_connection"` — the
   same convention `app/api/integrations/zoom/callback/route.ts` already uses
   for `video.connected`) so admins can spot the pattern under
   Settings → Audit without waiting for a host to notice a missing button.
   - No Zoom connection at all is deterministic (retrying can't fix it), so
     it now gives up on the very first attempt instead of returning
     silently.
   - Token-refresh and meeting-create failures still retry through pg-boss's
     existing `retryLimit: 2` as before (in case it's transient), and only
     persist `videoLinkError` on the final attempt — reusing the exact
     "wait for last attempt" pattern the Google Meet branch already used for
     its own give-up case, now shared via a `jobAttempt()` helper instead of
     duplicated inline.
   - The success path now also clears `videoLinkError: null`, so a booking
     that failed once and later succeeds (e.g. host reconnects Zoom and the
     job is retried) doesn't keep showing a stale error.

3. The booking detail page now selects `videoLinkError` and, when there's no
   `joinUrl` but an error code is present, shows an inline warning under the
   Location card ("Zoom isn't connected — reconnect it in Settings…" /
   "The meeting link couldn't be created…") instead of just leaving the
   Location card with nothing after "Zoom". The join-button condition itself
   was untouched — it was already correct and provider-agnostic.

**Why this fixes the root cause:** The bug was never a data-model mismatch —
it was that failure was invisible. `locationValue` staying `null` looked
identical whether the job hadn't run yet, was still retrying, or had
permanently given up. Persisting a `videoLinkError` code on the one path that
actually goes wrong (giving up) removes that ambiguity and gives both the
host (inline message) and admins (audit log) an actual signal, matching the
same disconnect-alert pattern already established for Google Calendar in
`calendar-write.ts`.

**Verified:**
- `pnpm exec tsc --noEmit` — clean.
- `pnpm db:generate` produced a single additive migration
  (`ADD COLUMN "video_link_error" text`) with no destructive changes.
- Could not exercise a live Zoom OAuth flow or pg-boss run in this
  environment (no reachable Postgres/Docker here) — verified by static
  trace of every return/throw path in the rewritten `generateZoomLink` and
  `processVideoLinkGenerate` against the queue's `retryLimit: 2` config in
  `lib/worker/ensure-queues.ts`, confirming every give-up path now writes
  `videoLinkError` before returning and no path silently drops the failure.
