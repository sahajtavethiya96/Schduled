# Bug: follow-up email renders an invalid nested `<html>`/`<body>` document

**Found:** 2026-07-28, while wiring `lib/email/components/follow-up.tsx` into the new centralized email branding system.

**Where:** `lib/email/components/follow-up.tsx` (`FollowUpEmail`).

**What's broken:** Unlike every other `EmailLayout`-based email component, `FollowUpEmail` wrapped its own `<Html><Head><Preview><Body>` **around** `<EmailLayout>`, which itself renders a complete `<Html><Head><Preview><Body><Container>` structure. The result is a doubly-nested `<html>` inside `<body>` inside another `<html>`/`<body>` — invalid HTML that most email clients tolerate by silently discarding the outer wrapper (so the visible bug was subtle: the outer `<Body>`'s background color and the outer `<Preview>` text were simply dead code, never actually rendered), but is fragile and could render inconsistently across stricter email clients.

**How it was found:** While auditing every email component for hardcoded "Schduled" branding to centralize (per the email-branding feature), `follow-up.tsx` was the one component using `EmailLayout` "partially" — passing no `logoUrl` at all and duplicating the outer document shell instead of relying on `EmailLayout` as the single top-level element, the pattern every other `EmailLayout` consumer follows correctly.

**Root cause:** The component appears to have been written by copy-pasting a standalone (non-`EmailLayout`) email's structure and then adding `EmailLayout` inside it, rather than converting it to use `EmailLayout` as the outermost element like its siblings.
