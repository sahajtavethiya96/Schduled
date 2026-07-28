# Contributing to Schduled

Thanks for your interest in contributing. This is an early-stage project —
expect some rough edges in the process itself, not just the code.

## License status

Schduled is licensed under the MIT License — see [`LICENSE`](./LICENSE) for
the full text. By contributing, you agree your contributions are licensed
under the same terms.

## Development setup

See the [README](./README.md) for the local dev quick start, and
[`ENVIRONMENT.md`](./ENVIRONMENT.md) for every environment variable and
where to get it.

```bash
corepack enable
pnpm install
cp .env.example .env
# fill in DATABASE_URL, APP_SECRET, APP_URL at minimum
pnpm db:local      # or point DATABASE_URL at your own Postgres
pnpm db:migrate
pnpm dev            # runs the web app + background worker together
```

## Before opening a PR

- `pnpm typecheck` must pass clean.
- `pnpm build` must succeed.
- Run the app and actually exercise the behavior you changed — running the
  app beats reading the diff.
- `pnpm lint` — the codebase has some pre-existing formatting inconsistencies
  (see CI's lint step, which is informational, not blocking) — please don't
  introduce *new* violations, but you're not on the hook for fixing unrelated
  existing ones in the same PR.

## Code conventions

This project's coding rules live in [`CLAUDE.md`](./CLAUDE.md) — read it
before making changes. Highlights:

- No shadows, no border-radius (except `rounded-full` for avatars/icons).
- Phosphor Icons only, never Lucide.
- Prefer server components; add `'use client'` only when you need state,
  events, or browser APIs.
- Use `cn()` from `lib/utils` for conditional class merging.
- No comments unless the *why* is non-obvious — well-named code explains the
  *what* on its own.
- Don't add abstractions, error handling, or validation for scenarios that
  can't happen. Match the scope of the change to what's actually needed.

## Commit style

Recent history uses Conventional Commits-ish prefixes (`feat:`, `fix:`,
`feat(self-host):`, etc.) with a short body explaining *why*, not just
*what*. Follow that pattern.

## Reporting bugs / requesting features

Use the issue templates. For security vulnerabilities, see
[`SECURITY.md`](./SECURITY.md) instead — don't open a public issue.

## Questions

Open a GitHub issue with the `question` label, or start a discussion if
Discussions are enabled on this repo.
