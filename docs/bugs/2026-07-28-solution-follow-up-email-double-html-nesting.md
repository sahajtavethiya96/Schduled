# Solution: follow-up email renders an invalid nested `<html>`/`<body>` document

**Fixed:** 2026-07-28

**Files changed:** `lib/email/components/follow-up.tsx`.

**What changed:** Removed the outer `<Html><Head><Preview><Body>` wrapper entirely — `<EmailLayout>` is now the single top-level element, exactly matching every other `EmailLayout`-based email component (`magic-link.tsx`, `reset-password.tsx`, `approval-outcome.tsx`, etc.). The `preview` text and body background now come from `EmailLayout` alone instead of two competing copies.

**Why this fixes the root cause:** `EmailLayout` already owns the entire document shell (`<Html>`, `<Head>`, `<Preview>`, `<Body>`, `<Container>`) — a consumer only needs to supply its `children` and a `preview` string. Removing the duplicate outer shell eliminates the invalid nested-document structure at the source rather than relying on email clients to silently discard the redundant wrapper.

**Verified:** `pnpm exec tsc --noEmit` clean; rendered `FollowUpEmail` via `renderEmailTemplate` and confirmed the output HTML has exactly one `<html>` and one `<body>` element (previously two of each).
