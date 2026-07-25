# Changelog

All notable changes to this project are documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
This project doesn't yet follow semantic versioning with tagged releases —
that starts once the OSS release process (`SELF-HOSTING.md` Phase 3) is
complete. Until then, everything lives under **[Unreleased]**.

## [Unreleased]

### Added
- Self-hosted deployment support: `Dockerfile`, `docker-compose.yml`,
  migrate-on-boot entrypoint, `/api/health` (DB-backed) and a worker
  liveness heartbeat, `/api/version`.
- `docker-compose.external-db.yml` — an alternative to `docker-compose.yml`
  for self-hosters who already have a Postgres database (managed service or
  self-run) and don't want Compose to also run one.
- `ALLOW_PUBLIC_SIGNUP` — closes public account creation across all auth
  methods (password, magic link, Google) while exempting
  `INITIAL_ADMIN_EMAIL`, so self-hosted instances can be closed from the
  very first deploy.
- Dedicated "you don't have permission" denial screen on `/login` for
  Google sign-in attempts rejected because `ALLOW_PUBLIC_SIGNUP=false` and
  the account doesn't already exist.
- `NEXT_PUBLIC_PASSWORD_AUTH_ENABLED` and `INITIAL_ADMIN_EMAIL` — email +
  password login and first-run admin bootstrap for deployments without SMTP
  or Google configured yet.
- `NEXT_PUBLIC_LANDING_ENABLED` — optional marketing landing page; `false`
  redirects `/` to `/login` for internal/team deployments.
- S3/R2-compatible file storage driver (previously present but inert).
- `DB_POOL_MAX` and a startup connection retry for Postgres.
- White-labeling: `NEXT_PUBLIC_PRODUCT_NAME`, `NEXT_PUBLIC_SHOW_POWERED_BY`,
  `CONTACT_EMAIL`, `NEXT_PUBLIC_CONTACT_EMAIL`, `PRIVACY_EMAIL`.
- Security headers (CSP, HSTS, X-Frame-Options, Referrer-Policy,
  Permissions-Policy) via `next.config.mjs`.
- CI (GitHub Actions): typecheck + build on every PR; lint and dependency
  audit run informationally.
- `SELF-HOSTING.md` and `ENVIRONMENT.md` — the self-hosting roadmap and
  full environment-variable reference.

### Changed
- Internal naming cleanup ahead of an eventual public release: the Docker
  container user, a hardcoded personal dev-tunnel origin, and an internal
  job name were renamed/genericized.

## Earlier history

Development before this changelog started is available in the git log —
see `git log --oneline` for the full commit history.
