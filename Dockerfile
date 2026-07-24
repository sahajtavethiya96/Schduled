FROM node:22-bookworm-slim AS deps

WORKDIR /app

ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
# Full install (not --prod) — the build needs devDependencies (typescript,
# tailwind, biome types, etc.)
RUN pnpm install --frozen-lockfile

FROM node:22-bookworm-slim AS builder

WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_OPTIONS="--max-old-space-size=6144"

# Placeholders so build-time env validation (lib/env.ts) passes. middleware.ts
# imports `env` eagerly, and Next.js bundles middleware during `next build` —
# without these, the build throws "Invalid environment variables" before it
# ever produces an image. DATABASE_URL and APP_SECRET are NOT used at
# runtime: env_file/.env supplies the real values when the container starts,
# so one built image works for any domain/database (see docker-compose.yml).
#
# NEXT_PUBLIC_APP_URL is different — Next.js inlines NEXT_PUBLIC_* vars into
# the compiled bundle (client AND server chunks) at `next build` time, so
# whatever is set here would stay frozen in the image forever, regardless of
# what env_file/.env sets at runtime. It's set to this harmless placeholder
# only to satisfy validation; nothing in the app actually reads it anymore.
# The real, live-at-runtime app URL is APP_URL (server-only, deliberately NOT
# NEXT_PUBLIC_-prefixed so it is never inlined) — see get-app-url.ts. It must
# NOT be given a placeholder here; it's supplied by env_file/.env at
# container start, same as DATABASE_URL/APP_SECRET.
ENV DATABASE_URL="postgresql://build:build@localhost:5432/build"
ENV APP_SECRET="build-time-placeholder-value-000000000000"
ENV NEXT_PUBLIC_APP_URL="http://localhost:3000"

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN corepack enable && pnpm build

FROM node:22-bookworm-slim AS runner

WORKDIR /app

# Optional: docker build --build-arg GIT_SHA=$(git rev-parse --short HEAD)
# Surfaced at /api/version. Falls back to "unknown" if not passed.
ARG GIT_SHA=unknown
ENV GIT_SHA=$GIT_SHA

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
# Caps V8's heap so an OOM shows up as a clean, restartable crash instead of
# the container being silently killed by the host's OOM killer. Raise this if
# your container's memory limit is higher than the default assumption below.
ENV NODE_OPTIONS=--max-old-space-size=768

RUN groupadd --system --gid 1001 app \
  && useradd --system --uid 1001 --gid app app

# Next.js standalone output: a minimal, self-traced server with its own
# node_modules (only what's actually used at runtime) — no separate install
# needed. Migrations run in a dedicated `migrate` service before this
# container starts (see docker-compose.yml, Dockerfile.worker), so this image
# no longer needs drizzle-kit, drizzle.config.ts, or db/migrations.
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

RUN chown -R app:app /app

USER app

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

CMD ["node", "server.js"]
