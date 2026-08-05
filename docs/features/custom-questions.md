# Custom Questions

Custom Questions allow hosts to collect information from invitees at the time of booking — before the meeting happens. This gives hosts the context they need to make every meeting more productive, and ensures no time is wasted on introductions that could have been answered in advance.

---

## Overview

Every booking form has two default system fields: **Name** and **Email**. Custom Questions let hosts add their own fields on top of these — up to 20 questions per event type — to gather anything from company name and role to specific agenda topics and technical requirements.

Answers are stored with the booking record, included in the host's notification email, visible in the Meetings Dashboard, and can be passed into reminder email templates.

---

## User Stories

**Host**
- As a host, I want to add custom questions to my booking form, so that I receive the context I need before the meeting starts. *(MVP)*
- As a host, I want to mark questions as required or optional, so that I control which information is mandatory before a booking is confirmed. *(MVP)*
- As a host, I want to choose from multiple question types — text, dropdown, checkbox, phone — so that I can collect structured answers rather than just free text. *(MVP)*
- As a host, I want to see the invitee's answers in my notification email and on the dashboard, so that I can prepare without switching between screens. *(MVP)*
- As a host, I want to pre-fill booking form fields via URL parameters, so that returning visitors do not have to re-enter information I already have. *(MVP)*
- As a host, I want to route invitees to different team members based on their answers, so that the right person handles each type of inquiry. *(Phase 2)*

**Invitee**
- As an invitee, I want the booking form to be short and clearly labeled, so that I can complete it quickly without feeling overwhelmed. *(MVP)*
- As an invitee, I want to see which questions are optional, so that I know what I must fill in versus what I can skip. *(MVP)*

---

## Default System Fields

These fields are always present on every booking form and cannot be removed:

| Field | Required | Notes |
|-------|----------|-------|
| Full Name | Yes | Invitee's full name |
| Email Address | Yes | Used for confirmation and reminder emails |

### Optional System Fields (Toggle On/Off)
| Field | Default | Notes |
|-------|---------|-------|
| Phone Number | Off | Required if SMS reminders are enabled; triggers phone call location fields |

---

## Question Types

### Short Text
- Single-line free-text input
- Best for: Name, company, job title, topic
- Character limit: 255 characters
- Example: "What company are you from?"

### Long Text (Paragraph)
- Multi-line textarea input
- Best for: Detailed descriptions, agenda items, background context
- Character limit: 2000 characters
- Example: "Please describe the main challenge you'd like to discuss on this call"

### Phone Number
- Phone number input with country code selector
- Auto-formats to international format (e.g., +91 98765 43210)
- Validates format before submission
- Example: "Your phone number (in case we need to reach you)"

### Single Select (Radio Buttons)
- Invitee picks exactly one option from a list
- Best for: Category selection, routing-compatible field
- Example: "What is the purpose of this call?" → Sales / Support / Partnership / Other
- Can be used in routing logic (Phase 2 routing forms feature)

### Multiple Select (Checkboxes) *(Post-MVP — Phase 2)*
- Invitee picks one or more options
- Best for: Topics of interest, features to discuss
- Example: "Which features would you like to discuss?" → Pricing / Integrations / Security / Compliance

### Dropdown
- Single selection from a dropdown list
- Best for: Longer option lists (5+ items); saves visual space
- Example: "How did you hear about us?" → Google / LinkedIn / Referral / Webinar / Other
- Can be used in routing form logic

### Number *(Post-MVP — Phase 2)*
- Numeric input only
- Best for: Team size, budget, number of users
- Min/max validation optional
- Example: "How many people are on your team?"

### Date Picker *(Post-MVP — Phase 2)*
- Calendar date selector
- Best for: Project start dates, deadlines, preferred start dates
- Example: "When are you hoping to launch?"

### URL / Website *(Post-MVP — Phase 2)*
- URL input with format validation (must start with http/https)
- Best for: LinkedIn profile, company website, project URL
- Example: "Please share your company website"

---

## Question Configuration

For each question, the host can configure:

| Setting | Description |
|---------|-------------|
| Question text | The label shown to the invitee |
| Help text | Smaller description shown below the question (optional context) |
| Required / Optional | Whether invitee must answer before booking |
| Placeholder text | Greyed-out hint inside the input field |
| Default value | Pre-filled answer (invitee can change it) |
| Options list | For single/multiple select and dropdown — list of answer choices |
| Min/Max | For number fields — acceptable range |
| Character limit | For text fields — max length |

---

## Question Limits

Up to 20 custom questions per event type. The default system fields (Name, Email) do not count toward this limit. All users have the same limit — there are no plan tiers.

---

## Question Order and Layout

- Questions are displayed in the order set by the host
- Drag-and-drop reordering in the event type editor
- Host can preview the booking form at any time to see exactly what invitees see
- Questions appear on a separate form step after the invitee selects a time slot

---

## Pre-Filling Questions

Hosts can pre-fill question answers for specific invitees — useful for embed forms where the host already knows the invitee's data.

### Via URL Parameters
Append question values to the booking URL:
```
https://schduled.com/yourname/30-min-call?a1=Acme+Corp&a2=CEO
```
- `a1` through `a20` correspond to custom question answer fields
- Pre-filled values are editable by the invitee

> **Security — XSS risk surface:** URL parameter values are user-controlled input arriving from outside the application. Every pre-filled value must be sanitized server-side before rendering (strip HTML tags and script content) and escaped on output. The existing text field validation (line in Validation table: "Stripped of HTML/script tags before saving") must apply to URL-parameter pre-fills as well — not just manually typed answers. Never render pre-filled URL values as raw HTML.

### Via JavaScript (Embed) *(Post-MVP — Phase 2)*

When the booking widget is embedded on an external website, hosts can pass pre-fill values via a JavaScript configuration object on the page before the embed script loads. The embed script reads the object and injects the values into the form fields before the invitee sees the page. This requires the embed widget feature (Phase 2) to be built first.

### Auto-Remember for Repeat Invitees

**Mechanism — email-match lookup (server-side):**
1. When an invitee types their email address into the booking form, Schduled queries the database for previous bookings by the same host with the same invitee email
2. If a previous booking exists: question answers from the most recent booking are pre-filled in the form
3. The invitee can edit any pre-filled answer before submitting — pre-fill is a convenience, not a lock
4. No account or cookie required — the email address is the identifier

**What is pre-filled:**
- Custom question answers from the most recent booking with this host (same `hostUserId` + same `inviteeEmail`)
- Name and phone number fields (if previously provided)
- Email address itself is always pre-filled if the invitee arrives via a pre-fill URL parameter

**What is NOT pre-filled:**
- Answers from a different host's booking form (data is scoped per host)
- Payment details (never pre-filled)

**Privacy note shown to invitee:**
> "We've pre-filled your answers from a previous booking. Update anything that has changed."

This is displayed only when pre-fill has occurred — not shown on first-time bookings.

---

## Where Answers Appear

### Host Notification Email
All question answers are included in the booking notification email sent to the host:

```
New booking: 30-Min Call
Invitee: Jane Smith (jane@acme.com)

Company: Acme Corp
Job Title: CEO
Purpose of call: Product demo
Team size: 45
```

### Meetings Dashboard
- Full question/answer pairs visible in the meeting detail view
- Answers displayed with the original question label for context

### Confirmation Email to Invitee
- Invitee's own answers are included in their confirmation email
- Confirms what they submitted and gives a record for their reference

### Reminder Emails
- Custom question answers can be inserted into reminder email templates via variables:
  - `{answer_1}` through `{answer_20}`
  - Example: "Looking forward to discussing {answer_3} with you tomorrow at {time}!"

### Calendar Invite Description
- Host's calendar invite includes a summary of all question answers in the description field
- Gives host full context when viewing the meeting in Google Calendar / Outlook

---

## Routing-Compatible Questions

Single Select (radio buttons) and Dropdown questions can be used in routing logic (Phase 2 post-MVP feature):
- Answer maps to a routing destination (specific event type, team member, or rejection)
- Example: "Company size: 1–10" → routes to SMB team; "Company size: 500+" → routes to Enterprise team
- Routing Forms are a dedicated Phase 2 feature (not covered in the MVP feature set)

---

## Question Answer Validation

Client-side and server-side validation:

| Question Type | Validation |
|--------------|-----------|
| Email | Valid email format (RFC 5322) |
| Phone Number | Valid international format |
| URL | Must begin with http:// or https:// *(Phase 2 type)* |
| Number | Within configured min/max range; numeric only *(Phase 2 type)* |
| Required fields | Cannot submit form with blank required field |
| Text fields | Passed through `stripHtml()` from `src/lib/validators.ts` before saving (removes all HTML tags — prevents stored XSS) |

---

## Editing Questions After Bookings Exist

- Host can add, edit, or remove questions at any time
- Removing a question: answers from past bookings are preserved in the booking record; question just no longer shown on form
- Changing a question label: old answers remain but are now associated with the new label
- Adding a required question: only applies to new bookings; past bookings unaffected

---

## Reference Implementations

| App | Questions on Base Plan | Max Questions | Question Types | Pre-fill via URL | Routing from Answers | CRM Field Mapping |
|-----|--------------------|--------------------|----------------|-----------------|---------------------|-------------------|
| **Calendly** | ❌ None allowed | 10 | Text, phone, radio, checkbox, dropdown | ✅ Yes | ✅ On radio/dropdown (paid) | ❌ No native mapping |
| **Cal.com** | ✅ Unlimited | Unlimited | Same + date, number, URL | ✅ Yes | ✅ Yes | ❌ No |
| **SavvyCal** | ✅ Basic | Limited | Text, checkbox, dropdown | ❌ No | ❌ No | ❌ No |
| **Chili Piper** | N/A (paid only) | Unlimited | Text, radio, dropdown | ✅ Yes | ✅ Core feature — routing is the main purpose | ✅ Salesforce native |
| **HubSpot Meetings** | ✅ Yes | Limited | Maps to HubSpot contact properties | ✅ Via URL params | ❌ No | ✅ Auto-syncs to HubSpot contact |
| **Schduled** | ✅ Unlimited (open source — no plan tiers) | 20 (all users) | Text, long text, phone, single select, dropdown (MVP — 5 types); multiple select, number, date, URL (Phase 2) | ✅ Via URL params (MVP); JS embed (Phase 2) | ✅ Phase 2 — routing forms | ❌ No |

---

## MVP Scope

**In MVP — 5 question types:**
- Short Text, Long Text, Phone Number, Single Select, Dropdown
- Up to 20 questions per event type (all users — no plan restrictions)
- Required / optional toggle per question
- Help text and placeholder text per question
- Drag-and-drop reordering
- Pre-fill via URL parameters
- Answers in host notification email, meeting detail view, and calendar invite
- Answer variables in reminder email templates (`{answer_1}` through `{answer_20}`)
- Auto-remember answers for repeat invitees (server-side email-match lookup — no account or cookie required)

**Post-MVP:**
- Multiple Select (checkboxes) *(Phase 2)*
- Number input (with min/max validation) *(Phase 2)*
- Date Picker *(Phase 2)*
- URL / website question type *(Phase 2)*
- Pre-fill via JavaScript embed *(Phase 2)*
- Routing-compatible questions — routing forms *(Phase 2)*


---

## Background Jobs

No background jobs are directly triggered by question create, edit, or delete operations. No `revalidatePath` is needed separately — calling `revalidatePath` when saving the parent event type (which always happens via the event type editor) covers booking page cache invalidation.

---

## Audit Logging

Question schema changes are logged as part of the parent event type audit entry.

| Action | When | source | Data Logged |
|--------|------|--------|-------------|
| `event_type.updated` | Host adds, edits, removes, or reorders questions | `'web'` | eventTypeId, `questions` field with full before/after question array snapshot |

There is no separate `event_type.questions_updated` action — question mutations are part of the event type update and share the same audit row. This keeps the audit log concise and queryable by event type ID. See `database-schema.md` for `auditSourceEnum`.

---

## Tech Stack

- **PostgreSQL + Drizzle ORM** — two tables handle questions: `event_type_questions` stores the question definition (type, label, options list, required flag, sort order) per event type; `booking_answers` stores each invitee's answers linked to their booking record. All answers stored as text; multi-select answers stored as a JSON array string.
- **Zod** — validates the entire booking form payload on the server before any database operation: required fields present, email format correct, phone number valid, number within configured min/max range.
- **`src/lib/validators.ts` — `stripHtml()`** — every text answer (short text and long text question types) is passed through `stripHtml(answer)` before saving to `booking_answers`. This strips `<script>`, `<img onerror>`, and all other HTML tags to prevent stored XSS. This applies to **both** manually typed answers and pre-filled URL parameter values (`?a1=...`) — URL parameters are user-controlled input and must be sanitized before rendering or storing.
- **Next.js App Router** — questions are loaded as part of the event type server query when the booking page renders. Pre-fill via URL parameters (`?a1=value`) is parsed server-side during page render and passed to the form as default values. Values are sanitized with `stripHtml()` before being injected into form state.
- **UI Kit** (`components/ui/`) — provides the drag-and-drop question reorder list in the event type editor, and the form input components (text inputs, radio groups, checkboxes, dropdown selects) on the booking page.
