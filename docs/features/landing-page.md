# Landing Page

The landing page is the first thing visitors, potential users, and search engines see. It communicates what Schduled is, why someone should use it, and how to get started — in under 10 seconds. It is the primary acquisition surface for new user sign-ups.

---

## Overview

The landing page is a public marketing page at `/`. It is entirely separate from the app (no sidebar, no dashboard layout). It is server-rendered with Next.js for fast initial load and SEO.

**Three jobs it must do:**
1. Explain the product clearly in one glance (headline + subheadline)
2. Build trust (features, differentiators, comparison)
3. Convert the visitor to a sign-up (multiple CTAs throughout)

> **MVP Design Principle:** Launch with the minimum number of sections needed to convert a first-time visitor. A 10-section marketing page built before you have real users, real testimonials, and real social proof signals misplaced effort. Ship 4 sections on Day 1. Add more post-launch based on what resonates with real users.
>
> **MVP sections (build now):** Navigation + Hero + Key Differentiators + How It Works + Final CTA + Footer
>
> **Post-MVP sections (add after first 100 users):** Social Proof Bar, Features Cards, Comparison Table, Testimonials, FAQ

---

## User Stories

**Visitor**
- As a visitor, I want to understand what Schduled does in the first 5 seconds, so that I know if it's relevant to me. *(MVP)*
- As a visitor, I want to see what makes Schduled different from Calendly, so that I have a reason to switch. *(MVP)*
- As a visitor, I want to sign up with a single click from the landing page, so that I can get started without hunting for the sign-up button. *(MVP)*
- As a visitor, I want the page to load fast on mobile, so that I don't wait or bounce. *(MVP)*

---

## Page Sections (in order)

> Sections marked **[MVP]** ship at launch. Sections marked **[Post-MVP]** are added after first users.

### 1. Navigation Bar (Sticky) — [MVP]

| Element | Detail |
|---------|--------|
| Logo | Schduled wordmark — links to `/` |
| Nav links | Features, How It Works, About |
| Sign In | Links to `/sign-in` |
| Get Started | Primary CTA button — links to `/sign-up` |

- Sticky on scroll — stays visible as user scrolls down
- Hamburger menu on mobile (drawer)
- Background becomes solid white on scroll (transparent at top)

---

### 2. Hero Section — [MVP]

The most important section — must immediately communicate the product value.

```
┌────────────────────────────────────────────────────────────────────┐
│                                                                    │
│      Stop the back-and-forth.                                      │
│      Let people book time with you — automatically.                │
│                                                                    │
│      Schduled gives you a smart scheduling link. Share it.         │
│      Your invitees pick a time that works. Done.                   │
│                                                                    │
│      [ Get Started Free ]    [ See How It Works ↓ ]               │
│                                                                    │
│      ┌──────────────────────────────────────────────────────┐     │
│      │  [Product screenshot / animated demo of booking page] │     │
│      └──────────────────────────────────────────────────────┘     │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

**Headline:** Short, benefit-focused, no jargon
**Subheadline:** One sentence explaining the mechanism
**Primary CTA:** "Get Started Free" → `/sign-up`
**Secondary CTA:** "See How It Works" → scrolls to How It Works section
**Hero visual:** Screenshot or short looping animation of the booking flow

---

### 3. Social Proof Bar — [Post-MVP]

> **Do not ship at launch.** A generic "used by freelancers worldwide" line with no real logos adds nothing. Ship this only after you have real company names or user counts to show.

A thin bar below the hero with trust signal text + company logos.

```
Trusted by 500+ freelancers, coaches, and consultants worldwide.
[Logo] [Logo] [Logo] [Logo] [Logo]
```

Add when: 100+ real users, or at least 3 company logos you have permission to use.

---

### 4. Features Section — [Post-MVP]

> **Do not ship at launch.** Six feature cards repeat what the Key Differentiators section already says, and add frontend build time without adding conversion value for a pre-traction product.

Six cards highlighting the core capabilities. Build after launch when you understand which features visitors respond to most.

| Feature Card | Icon | Headline | One-line description |
|-------------|------|----------|---------------------|
| Smart Booking Links | 🔗 | Share one link | Invitees self-schedule based on your real-time availability |
| Calendar Sync | 📅 | Never double-book | Syncs with Google and Outlook calendars automatically |
| Both Timezones | 🌍 | No timezone confusion | Every email shows both your time and the invitee's time |
| Custom Questions | 📝 | Know who you're meeting | Collect info before the call — no intake form separate from booking |
| Automated Reminders | 🔔 | Fewer no-shows | 24hr and 1hr email reminders sent automatically |
| Cancellation Enforcement | 🛡️ | Protect your time | Actually block last-minute cancellations — not just display a policy |

Layout: 3-column grid on desktop, 1-column on mobile.

---

### 5. How It Works — [MVP]

Three simple steps — visual, numbered. Reduced from 4 to 3: "Create Event" and "Share Link" are merged into one step since they happen together in onboarding.

```
Step 1                    Step 2                       Step 3
[ Sign Up ]        →    [ Connect Calendar ]    →    [ Share Your Link ]
Create your free         Sync Google Calendar          Copy your booking URL
account in 30            and set your available        and send it to anyone
seconds                  hours                         — they self-schedule
```

Each step has an icon, number badge, title, and one-line description. Keep copy short — this is a scan, not a read.

---

### 6. Key Differentiators Section — [MVP]

The three strongest reasons to choose Schduled over Calendly — specific, verifiable, and demonstrable in 30 seconds. Show only the top 3 at launch; a long list dilutes the message.

```
┌─────────────────────────────────────────────────────────────────┐
│  What makes Schduled different                                  │
│                                                                 │
│  🌍 Both timezones in every email                               │
│     Every confirmation and reminder shows your invitee's time   │
│     AND your time — Calendly only shows one timezone.           │
│                                                                 │
│  🛡️  Cancellation policy that actually works                    │
│     Block cancellations within X hours of the meeting.          │
│     Calendly only shows policy text — it never enforces it.     │
│                                                                 │
│  🆓 Fully free and open source                                  │
│     Unlimited event types, unlimited reminders, no paywalls.   │
│     Calendly charges $10/mo for reminders and limits free       │
│     users to 1 event type.                                      │
└─────────────────────────────────────────────────────────────────┘
```

**Why only 3 differentiators at launch:**
A visitor processes 3 bullet points. A visitor skims 6 and remembers none. Once you have user feedback on which differentiator drives the most signups, emphasize that one above the others.

**Additional differentiators (add to section post-MVP):**
- Apple Calendar support — Calendly dropped this Aug 2024 *(Phase 2)*
- Multiple durations per booking link — one link, invitee picks 15/30/60 min
- Unlimited event types on free tier — Calendly free = 1 event type only

---

### 7. Comparison Table — [Post-MVP]

> **Do not ship at launch.** Comparison tables require you to accurately represent competitors. Competitor features change and tables go stale. Ship after launch when you have users who ask "how is this different from Calendly?"

Side-by-side comparison with Calendly and Cal.com.

| Feature | Schduled | Calendly | Cal.com |
|---------|----------|----------|---------|
| Apple Calendar | ✅ Phase 2 | ❌ (dropped Aug 2024) | ✅ |
| Both timezones in emails | ✅ | ❌ | ❌ |
| Cancellation enforcement | ✅ | ❌ | ❌ |
| Multi-duration event types | ✅ | ❌ | ✅ |
| Open source | ✅ | ❌ | ✅ |
| Custom intake questions | ✅ Unlimited | ❌ Paid only | ✅ |
| Automated reminders | ✅ | ❌ Paid only | ✅ |
| Self-hosting | ✅ | ❌ | ✅ |

---

### 8. Testimonials — [Post-MVP]

> **Do not ship placeholder testimonials at launch.** Fake quotes from "Jane, Coach" and "Mark, Consultant" are immediately recognizable as fabricated and actively reduce trust. An empty section is better than a fictional one.
>
> **Add this section only after collecting real user quotes.** Ask first users directly via email: "Would you share a sentence about what you like about Schduled?" One real testimonial beats six fictional ones.

Three testimonial cards with real name, role, company, and photo. Collect post-launch.

Format:
```
┌──────────────────────────────────────────────────────┐
│  [Photo] Name, Role at Company                       │
│  "Real quote from a real user who gave permission"   │
└──────────────────────────────────────────────────────┘
```

---

### 9. General FAQ — [Post-MVP]

> **Do not build at launch.** FAQs answer questions that visitors are confused about. You don't know what visitors are confused about until you have visitors. Collect questions from the first 50 users (support emails, in-app feedback) and write answers based on real confusion.

Accordion — 6 to 8 questions based on real user questions.

Likely candidates based on competitive research:

| Question |
|---------|
| Is Schduled really free? |
| Can I connect my Apple / iCloud calendar? *(answer: coming soon — Phase 2)* |
| What happens if someone books a time I've already blocked? |
| Does Schduled work for teams? |
| How is Schduled different from Calendly? |
| Can I self-host Schduled? |
| Do I need a credit card to sign up? |
| Which video conferencing tools does Schduled support? |

---

### 10. Final CTA Banner — [MVP]

Full-width section at the bottom before the footer. Repeat the primary CTA for visitors who scrolled the whole page.

```
┌────────────────────────────────────────────────────────────┐
│                                                            │
│     Start scheduling in minutes.                           │
│     Free, open source, and no credit card required.        │
│                                                            │
│              [ Get Started Free → ]                        │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

---

### 11. Footer — [MVP]

```
┌────────────────────────────────────────────────────────────┐
│  Schduled                                                  │
│                                                            │
│  Product          Open Source      Legal                   │
│  Features         GitHub           Privacy Policy          │
│  How It Works     Self-Hosting     Terms of Service        │
│  Sign Up          Contributing     Cookie Policy           │
│  Sign In                                                   │
└────────────────────────────────────────────────────────────┘
```

---

## Additional Public Pages

These pages must be live before launch:

| Page | Route | Content |
|------|-------|---------|
| Privacy Policy | `/privacy` | GDPR-compliant — data collected, retention, rights |
| Terms of Service | `/terms` | Usage terms, liability, acceptable use |
| Cookie Policy | `/cookies` | What cookies are set and why |

Static content — written once, no CMS needed for MVP.

---

## SEO Requirements

| Element | Detail |
|---------|--------|
| `<title>` | "Schduled — Smart Scheduling, Free & Open Source" |
| `<meta description>` | "Share a booking link. Let anyone schedule time with you automatically. Syncs with Google and Outlook. Open source." |
| Open Graph `og:title` | Same as title |
| Open Graph `og:description` | Same as meta description |
| Open Graph `og:image` | 1200×630px product screenshot |
| `sitemap.xml` | Auto-generated, includes all public routes |
| `robots.txt` | Allow all crawlers |
| Canonical URL | `https://schduled.com/` |

All page metadata managed via Next.js `generateMetadata()` API.

---

## Performance Requirements

| Metric | Target |
|--------|--------|
| Lighthouse Performance | 90+ |
| Lighthouse SEO | 100 |
| Largest Contentful Paint (LCP) | < 2.5s |
| Cumulative Layout Shift (CLS) | < 0.1 |
| Mobile-responsive | ✅ Required |

- Hero image served via Next.js `<Image>` (auto WebP, lazy load)
- No client-side JS on initial render (Server Components)
- Fonts loaded via `next/font` (no layout shift)

---

## MVP Scope

**In MVP — Ship at Launch (6 sections, target: 1 day to build):**
- Sticky navigation bar (logo, Sign In, Get Started CTA)
- Hero section (headline, subheadline, primary CTA, product screenshot/animation)
- Key Differentiators — **top 3 only**: both timezones in emails, cancellation enforcement, fully free + open source
- How It Works — **3 steps** (not 4): Sign Up → Connect Calendar → Share Link
- Final CTA banner ("Start scheduling in minutes. Free. No credit card.")
- Footer (Product, Open Source, Legal links)
- `/privacy`, `/terms`, `/cookies` pages (required before launch — static content)
- `sitemap.xml` and `robots.txt`
- `<title>`, `<meta description>`, and Open Graph tags

**Do NOT ship at launch:**
- Social Proof Bar — no real data yet; generic text adds nothing
- Features Section (6 cards) — covered by differentiators; extra build time
- Comparison Table — goes stale; add post-launch
- Testimonials — **never ship placeholder/fake quotes**; collect real ones from first 50 users
- FAQ — write based on real user questions, not guesses

**Post-MVP — Add after first 100 users:**
- Social Proof Bar with real user count or company logos *(Phase 2)*
- Features Section (6 cards) *(Phase 2)*
- Comparison Table (Schduled vs Calendly vs Cal.com) *(Phase 2)*
- Real user testimonials (3 cards with photo, name, company) *(Phase 2)*
- FAQ accordion (based on real support questions) *(Phase 2)*
- Additional differentiators in the Key Differentiators section *(Phase 2)*
- Blog / content pages *(Phase 3)*
- Localisation / multi-language landing page *(Phase 4)*

---

## Tech Stack

- **Next.js 15 App Router (Server Components)** — landing page is fully server-rendered; no client-side JS on first load; fast initial paint and full SEO crawlability.
- **Next.js Metadata API** — `generateMetadata()` on every public page for type-safe `<title>`, `<meta>`, and Open Graph tags.
- **Tailwind CSS** — all landing page styles; responsive utility classes for mobile/tablet/desktop breakpoints.
- **UI Kit** (`components/ui/`) — button components for CTAs. The FAQ uses its own hand-rolled `components/landing/faq-accordion.tsx`, not the shared UI Kit.
- **Next.js `<Image>`** — hero screenshot and section images automatically converted to WebP, sized for viewport, lazy-loaded below the fold.
- **`next/font`** — self-hosted fonts (Geist Sans Variable + JetBrains Mono Variable) loaded without external request; eliminates font-related layout shift. See [design-system.md](../design-system.md) — Typography for full font spec.
