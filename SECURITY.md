# Security Policy

## Reporting a vulnerability

**Please do not open a public GitHub issue for security vulnerabilities.**

Use GitHub's private vulnerability reporting instead: go to the **Security**
tab of this repository → **Report a vulnerability**. This creates a private
advisory visible only to maintainers until a fix is ready.

If private reporting isn't available on this repo yet, open a regular issue
titled "Security contact needed" with no vulnerability details, and a
maintainer will follow up with a private channel.

Include, where possible:
- The affected version/commit (`/api/version`, or your git SHA)
- Steps to reproduce
- Impact — what an attacker could actually do
- Whether it's self-hosted-specific or affects any deployment

## Supported versions

This project doesn't yet have tagged releases (see `CHANGELOG.md`). Until
semantic versioning starts, only the `main` branch is supported — please
reproduce against the latest commit before reporting.

## Scope

In scope:
- The application code in this repository (`app/`, `lib/`, `components/`,
  `db/`, worker handlers, Docker packaging).
- Authentication, session handling, and the self-hosting signup gate
  (`ALLOW_PUBLIC_SIGNUP`, `INITIAL_ADMIN_EMAIL`).
- Data exposure across users (one user seeing another's bookings/data).

Out of scope (report upstream instead):
- Vulnerabilities in dependencies with no Schduled-specific exploit path —
  report to the dependency's own security process. Dependabot already tracks
  these (`.github/dependabot.yml`).
- Issues that require an attacker to already have admin/database access.
- Missing security headers or hardening steps already documented as **known
  limitations** in `ENVIRONMENT.md` (e.g. the pragmatic CSP, the
  single-instance rate limiter) — those are tracked, not secret.

## Known, already-tracked gaps

To avoid duplicate reports, these are already known and tracked (see
`ENVIRONMENT.md` → "Known limitations for self-hosters"):
- Rate limiting is in-process/single-instance only.
- CSP allows `'unsafe-inline'` for scripts/styles (no nonce infrastructure yet).
- No `ENCRYPT_KEY` rotation tooling.
- No CORS policy on API routes (no cross-origin API surface exists yet).
