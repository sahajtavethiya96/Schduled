FROM node:22-bookworm-slim AS deps

WORKDIR /app

ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
# Full install (not --prod) — the build needs devDependencies (typescript,
# tailwind, biome types, etc.)
RUN pnpm install --frozen-lockfile

# Next's standalone output-file-tracing only reliably captures files reached
# via a static require()/import — sharp's native binding dlopen's its
# libvips .so at runtime instead, which the tracer can't see, so it's
# silently missing from `.next/standalone`'s pruned node_modules (observed in
# production: "ERR_DLOPEN_FAILED: libvips-cpp.so... cannot open shared
# object file"). This stage dereferences sharp's real files out of pnpm's
# symlinked virtual store (`node_modules/sharp` -> `.pnpm/sharp@x.y.z/...`)
# so they can be copied into the runner as plain files below.
FROM node:22-bookworm-slim AS sharp-deps

WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
RUN real_dir="$(dirname "$(readlink -f node_modules/sharp)")" \
  && mkdir -p /sharp-runtime \
  && cp -rL "$real_dir/." /sharp-runtime/

FROM node:22-bookworm-slim AS builder

WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_OPTIONS="--max-old-space-size=6144"

# Placeholders so build-time env validation (lib/env.ts) passes. middleware.ts
# imports `env` eagerly, and Next.js bundles middleware during `next build` —
# without these, the build throws "Invalid environment variables" before it
# ever produces an image. `next build` also forces NODE_ENV=production
# internally (regardless of what's set here), which is why APP_URL needs a
# placeholder too: lib/env.ts requires it whenever NODE_ENV is "production".
#
# DATABASE_URL, APP_SECRET, and APP_URL are all safe to placeholder here
# because none of them are read at build time in any way that matters — they
# are NOT NEXT_PUBLIC_-prefixed, so Next.js never inlines them into the
# compiled bundle. They're read live from process.env at container runtime
# instead, so env_file/.env supplies the real values when the container
# starts and one built image works for any domain/database (see
# docker-compose.yml). Do NOT put the real production domain here.
#
# NEXT_PUBLIC_APP_URL is different and must stay a harmless placeholder only
# — Next.js inlines NEXT_PUBLIC_* vars into the compiled bundle (client AND
# server chunks) at `next build` time, so whatever is set here would stay
# frozen in the image forever. Nothing in the app actually reads it anymore;
# it's kept only because lib/env.ts still accepts it for backward
# compatibility with older .env files.
ENV DATABASE_URL="postgresql://build:build@localhost:5432/build"
ENV APP_SECRET="build-time-placeholder-value-000000000000"
ENV APP_URL="http://localhost:3000"
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

# Overwrite whatever (incomplete) sharp the standalone trace captured with
# the fully-dereferenced real files from the sharp-deps stage above — see
# the comment there for why the trace alone isn't reliable for sharp.
COPY --from=sharp-deps /sharp-runtime/. ./node_modules/

# Pre-create the uploads mount point (STORAGE_DRIVER=local, see
# docker-compose.yml's `uploads` volume) owned by `app` before it exists.
# Without this, /app/uploads doesn't exist in the image, so on first mount
# Docker creates it as root:root — the non-root `app` user below then gets
# EACCES on every upload, since chown -R below only ever touches what's
# already in this layer, not a volume created fresh at container start.
RUN mkdir -p uploads && chown -R app:app /app

USER app

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

CMD ["node", "server.js"]
