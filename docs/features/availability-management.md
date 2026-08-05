# Availability Management

Availability management controls when hosts can be booked. It bridges the gap between a host's actual calendar and the time slots shown to invitees — with fine-grained rules for buffers, notice periods, limits, and exceptions.

---

## Overview

Schduled syncs with connected calendars to determine real-time availability. On top of that, hosts configure scheduling rules that further restrict when they can be booked. This layered approach ensures the booking page always reflects accurate, intentional availability.

---

## User Stories

**Host**
- As a host, I want to set my weekly working hours by day, so that invitees can only book me during times I am available. *(MVP)*
- As a host, I want to add buffer time before and after meetings, so that I have breathing room between back-to-back calls. *(MVP)*
- As a host, I want to set a minimum notice period, so that I am never booked with less time than I need to prepare. *(MVP)*
- As a host, I want to set a maximum booking window, so that I control how far in advance invitees can schedule. *(MVP)*
- As a host, I want to block specific dates as unavailable, so that my holidays and vacations are never bookable. *(MVP)*
- As a host, I want my connected calendar's busy events to automatically block availability, so that I am never double-booked. *(MVP)*
- As a host, I want to set a daily meeting limit, so that I am not overloaded with back-to-back meetings in a single day. *(MVP)*
- As a host, I want to create multiple availability schedules and assign them to different event types, so that my client call hours differ from my internal meeting hours. *(Post-MVP — Phase 2)*

---

## Weekly Availability (Recurring Schedule)

The foundation of availability. Hosts define their standard working hours by day of week.

### Configuration
- Enable/disable specific days (e.g., no Saturday/Sunday bookings)
- Set start and end time per day (e.g., Mon–Fri 9:00am–5:00pm)
- Different hours per day (e.g., Monday 9am–3pm, Friday 9am–12pm)
- Multiple time blocks per day (e.g., 9am–12pm and 2pm–5pm, skipping lunch)

### Multiple Availability Schedules *(Post-MVP — Phase 2)*
- Create named schedules (e.g., "Standard", "Reduced Hours", "Workshop Days")
- Assign different schedules to different event types
- Example: "Client Calls" event uses 9am–5pm schedule; "Deep Work Office Hours" uses 2pm–4pm schedule
- In MVP, every user has one default schedule used by all event types

---

## Real-Time Calendar Sync

Busy/free data pulled from connected calendars overrides weekly availability.

### How It Works
1. Schduled reads events from all connected calendars
2. Any calendar event marked as "Busy" blocks the corresponding time slot
3. Available slots shown only when both schedule AND calendar agree the time is free
4. Sync is real-time — changes reflect within minutes

### Busy/Free Override
- Hosts can mark specific calendar events as "available anyway" (e.g., a blocked "Focus Time" that shouldn't block bookings)
- Hosts can mark events as "busy even though calendar shows free" (custom blocks)
- Useful for personal events that show as available but shouldn't allow scheduling

---

## Buffer Times

Buffer times block time immediately before and/or after meetings to prevent back-to-back scheduling.

### Buffer Before Meeting
- Blocked time before a new meeting starts
- Use case: Preparation, travel time, context-switching
- Example: 15-minute buffer before all client calls

### Buffer After Meeting
- Blocked time after a meeting ends
- Use case: Writing follow-up notes, bio break, decompression
- Example: 10-minute buffer after every sales demo

### Per-Event-Type Buffers
- Buffers are set per event type, not globally
- Example: Client calls get 15-min buffers; quick internal syncs have no buffer

### How Buffers Affect Available Slots
- If host has a 1pm meeting and a 15-min buffer after, 1pm–2:15pm is blocked
- Next available slot after would be 2:15pm or later
- Buffers are "invisible" to invitees — they just won't see the blocked time

---

## Minimum Notice Period

Prevents last-minute bookings that don't give hosts time to prepare.

### Configuration
- Minimum: 1 hour (same-day bookings allowed with >1 hour notice)
- Typical: 24 hours (next day earliest)
- Maximum: Configurable up to weeks in advance

### Behavior
- Time slots within the notice period are hidden from invitees
- Example: If minimum notice is 24 hours and it's 2pm Tuesday, earliest bookable slot shown is 2pm Wednesday

---

## Booking Window (Future Availability Range)

Controls how far into the future invitees can book.

### Configuration Options
- **Rolling window**: Always open X days ahead (e.g., 60 days rolling)
- **Fixed date range**: Open from [date] to [date] (one-time event campaign)
- **Indefinitely**: No end date

### Use Cases
- Limiting booking window to the next 2 weeks prevents scheduling too far ahead
- Fixed date ranges useful for events or launch periods
- Wide windows (90+ days) for recurring clients who book well in advance

---

## Daily and Weekly Meeting Limits

Protects hosts from meeting overload by capping total meetings in a period.

### Daily Limit
- Maximum number of bookings per day (across all event types or per event type)
- Example: No more than 4 client calls per day
- When limit is reached, remaining slots for that day are hidden

### Weekly Limit
- Maximum bookings per rolling 7-day window
- Example: No more than 10 total meetings per week

### Per-Event-Type Limits
- Set a separate daily limit per event type
- Example: Maximum 2 "Free Consultation" calls per day, no limit on "Paid Sessions"

---

## Date Overrides

One-time exceptions to the weekly schedule. Useful for vacations, holidays, and special availability.

### Block a Specific Date
- Mark a date as completely unavailable
- Example: Block December 25th as a holiday
- Invitees see no available slots on that day

### Override Hours for a Date
- Change available hours on a specific date
- Example: Available 9am–12pm only on Christmas Eve
- Can be different from the normal schedule for that day of week

### Block Multiple Days
- Block a range of dates (e.g., vacation from Jan 15–22)
- Bulk selection in the calendar view

---

## Start Time Increments

Controls the granularity of time slot options shown to invitees.

### Options
- Every 15 minutes
- Every 30 minutes
- Every 60 minutes
- Custom increment

### Effect on UX
- Smaller increments give invitees more flexibility
- Larger increments simplify the booking view
- Example: 30-min meeting with 30-min increments shows 9:00, 9:30, 10:00...
- Example: 30-min meeting with 15-min increments shows 9:00, 9:15, 9:30, 9:45...

---

## Time Zone Management

### Host Side
- Host sets their local timezone during onboarding
- All availability rules stored in host's timezone
- Calendar sync accounts for DST changes automatically

### Invitee Side
- Invitee's timezone auto-detected from browser
- Booking page shows slots in invitee's local timezone
- Manual timezone selector shown for override
- Confirmation email and calendar invite include timezone for both parties

### International Teams
- Round-robin pools display unified availability across multiple timezones
- Host timezone shown on booking page for transparency

---

## Availability Troubleshooting *(Post-MVP — Phase 2)*

A diagnostic tool to help hosts understand why certain slots appear unavailable.

### Features
- Select any date/time and see "Why is this unavailable?"
- Shows which calendar event is blocking the slot
- Shows which rule (buffer, notice, limit) is causing the block
- Actionable suggestions to resolve conflicts

---

## Ranked Availability *(Post-MVP — Phase 2, SavvyCal-Inspired)*

Hosts can rank their preferred times without hard-blocking other times.

### How It Works
- Preferred slots (e.g., Tuesday afternoons) are marked "preferred"
- Preferred slots are shown first / highlighted on the booking page
- Non-preferred but available slots are still visible further down
- Invitee can choose any available slot but is nudged toward preferred times

### Use Case
- Host prefers mornings but doesn't want to hard-block afternoons
- "Preferred" signals soft preference; invitees can still pick any slot
- Results in meetings landing at preferred times more often without forcing it

---

## Reference Implementations

| App | Weekly Hours | Buffer Times | Date Overrides | Daily/Weekly Limits | Multiple Named Schedules | Ranked Availability |
|-----|-------------|--------------|----------------|--------------------|--------------------------|--------------------|
| **Calendly** | ✅ Per day; multiple blocks | ✅ Before + after per event type | ✅ Block dates, change hours | ✅ Daily limit per event type | ❌ One schedule only | ❌ No |
| **Cal.com** | ✅ Same as Calendly | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Multiple named schedules per event type | ❌ No |
| **SavvyCal** | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Daily + weekly + monthly caps | ✅ Yes | ✅ **Yes** — preferred slots shown first; others still available |
| **Chili Piper** | ✅ Synced from calendar | ✅ Yes | ✅ Auto PTO sync from HR tools | ✅ Yes | ❌ Org-level only | ❌ No |
| **HubSpot Meetings** | ✅ Basic weekly hours only | ❌ No | ❌ No | ❌ No | ❌ No | ❌ No |
| **Schduled** | ✅ Per day; multiple time blocks per day | ✅ Before + after independently configurable per event type | ✅ Block dates, override hours, bulk vacation range | ✅ Daily limit per event type; weekly limit (Phase 2) | ✅ Phase 2 — multiple named schedules assignable per event type | ✅ Phase 2 (SavvyCal-inspired) |

---

## MVP Scope

**In MVP:**
- Weekly recurring schedule (per day of week)
- Real-time calendar sync (busy/free)
- Buffer time before/after meetings
- Minimum notice period
- Booking window (rolling and fixed date range)
- Date overrides (block dates, change hours)
- Daily meeting limits
- Start time increments
- Timezone auto-detection and manual override

**Post-MVP:**
- Multiple named schedules per user
- Weekly meeting limits
- Ranked availability (preferred slots)
- Availability troubleshooting tool
- PTO/vacation sync from HR tools (Workday, BambooHR)


---

## Background Jobs

No background jobs are directly triggered by availability saves. However, there is a critical runtime dependency to understand:

**Slot calculation reads from `calendar_events_cache`** — when an invitee opens a booking page, the slot generator queries `calendar_events_cache` (not the live calendar API) to determine busy times. This cache is populated by the `CALENDAR_SYNC` cron job which runs every 5 minutes per connected calendar (see `jobs-queues.md` and `calendar-integrations.md`).

**Implication:** A host who just connected their calendar may see all slots appear available for up to 5 minutes — until `CALENDAR_SYNC` first populates the cache. This is expected behavior. There is no job to force-trigger this; the first sync will run within 5 minutes automatically.

After saving availability rules, the Server Action must call `revalidatePath` for both `/[username]/[eventSlug]` and `/[username]` to bust the ISR cache so invitees see the updated schedule immediately. Both must be invalidated — the profile overview page caches the event type cards which include availability context. If only the event slug page is busted, the profile page continues serving stale data until the ISR TTL expires.

---

## Audit Logging

Every availability mutation writes a record to `audit_logs` inside the same DB transaction as the change.

| Action | When | source | Data Logged |
|--------|------|--------|-------------|
| `availability.schedule_updated` | Host saves weekly hours or changes schedule name | `'web'` | scheduleId, changedDays with before/after windows |
| `availability.override_added` | Host blocks a date or overrides hours for a specific date | `'web'` | scheduleId, date, overrideType (blocked \| custom_hours), new hours |
| `availability.override_removed` | Host removes a date override | `'web'` | scheduleId, date |
| `availability.schedule_assigned` | Host assigns a different schedule to an event type | `'web'` | eventTypeId, oldScheduleId, newScheduleId |

All records include `actorUserId`, `actorIp`, `source: 'web'`. See `database-schema.md` for `auditSourceEnum`.

---

## Tech Stack

- **PostgreSQL + Drizzle ORM** — three tables manage availability: `availability_schedules` (named schedules per user), `availability_windows` (recurring weekly hours per day of week), and `availability_overrides` (one-time date blocks or hour changes). All times stored as `"HH:mm"` strings; the schedule's IANA timezone is stored alongside them.
- **`calendar_events_cache` dependency** — slot generation queries this table (not the live calendar API) for busy/free data. The `CALENDAR_SYNC` pg-boss cron job (every 5 min) keeps it current. An empty cache (newly connected calendar) means all slots appear free until the first sync completes.
- **date-fns-tz** — used when computing available slots for a booking page request. Converts the host's weekly hour windows (defined in their local timezone) to UTC for comparison with calendar events, correctly handling DST transitions without any manual offset logic.
- **Next.js Server Actions** — saving weekly schedules, adding date overrides, and assigning a schedule to an event type all run as server actions. No separate API endpoints needed for these CRUD operations.
- **UI Kit** (`components/ui/`) — provides the weekly hours grid (day toggles + time range pickers), the date override calendar picker, and the schedule selector dropdown.
