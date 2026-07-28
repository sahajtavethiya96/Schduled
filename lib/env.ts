import { z } from "zod";

const optionalString = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.string().min(1).optional()
);

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  APP_SECRET: z.string().min(1),

  // The one source of truth for server-generated absolute URLs (OAuth
  // redirect_uris, Better Auth baseURL, email/magic links, booking links).
  // Deliberately NOT prefixed NEXT_PUBLIC_ — Next.js inlines NEXT_PUBLIC_*
  // vars into the compiled bundle at `next build` time (client AND server
  // chunks), so a value baked in at image-build time would stay frozen
  // forever regardless of what the runtime `.env`/env_file sets. APP_URL is
  // read live from process.env at request time instead. Required in
  // production (see superRefine below); falls back to localhost in dev.
  // Use lib/get-app-url.ts's getAppUrl() rather than reading this directly.
  APP_URL: optionalString,

  // Legacy/display-only. Client components must NOT read this directly for
  // origin-dependent logic (use hooks/use-app-origin.ts's useAppOrigin()
  // instead) — see APP_URL above for why. Kept optional for backward
  // compatibility with existing .env files.
  NEXT_PUBLIC_APP_URL: z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.string().url().optional()
  ),
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),

  // SMTP email
  SMTP_HOST: optionalString,
  SMTP_PORT: z.preprocess((v) => (v ? Number(v) : undefined), z.number().optional()),
  SMTP_SECURE: z.preprocess((v) => v === 'true' || v === '1', z.boolean().optional()),
  SMTP_USER: optionalString,
  SMTP_PASS: optionalString,
  EMAIL_FROM: optionalString,
  EMAIL_WEBHOOK_SECRET: optionalString,

  // Encryption — required before calendar/video OAuth token storage
  ENCRYPT_KEY: optionalString,

  // Self-hosted first-run bootstrap: this email is auto-promoted to admin
  // the moment its account is created (checked once, at signup)
  INITIAL_ADMIN_EMAIL: optionalString,

  // Email + password sign-in — ON by default. It's the primary login method
  // (works on a fresh self-hosted box with no SMTP or Google configured).
  // Magic link and Google are the optional secondary methods. Disable with any
  // of: false / 0 / off / no / disabled (case-insensitive) for a
  // magic-link/Google-only deployment.
  NEXT_PUBLIC_PASSWORD_AUTH_ENABLED: z.preprocess(
    (v) => {
      const s = typeof v === "string" ? v.trim().toLowerCase() : v;
      return !(s === "false" || s === "0" || s === "off" || s === "no" || s === "disabled");
    },
    z.boolean()
  ),

  // Gates new-account creation (password sign-up, magic link first-use, or
  // Google first-login) — on by default so nothing changes unless a
  // self-hoster opts in. Set to 'false' to close public sign-up; the
  // INITIAL_ADMIN_EMAIL account can always sign up regardless, so it's safe
  // to set both from day one instead of "open then close later".
  ALLOW_PUBLIC_SIGNUP: z.preprocess(
    (v) => (v === undefined ? true : v === "true" || v === "1"),
    z.boolean()
  ),

  // Marketing landing page at "/" — on by default. Set to 'false' for
  // internal/team deployments that don't want a public marketing page;
  // "/" then redirects to "/login" instead. Booking + legal pages are
  // unaffected either way.
  NEXT_PUBLIC_LANDING_ENABLED: z.preprocess(
    (v) => (v === undefined ? true : v === "true" || v === "1"),
    z.boolean()
  ),

  // Postgres connection pool size (postgres.js `max`). Multiple web replicas
  // each open their own pool — do the math against your database's
  // max_connections before scaling out (replicas × DB_POOL_MAX + pg-boss's
  // own pool).
  DB_POOL_MAX: z.preprocess(
    (v) => (v ? Number(v) : undefined),
    z.number().int().positive().default(20)
  ),

  // White-labeling — product name shown in email subjects, page titles, the
  // login page, and iCal PRODID. Defaults to "Schduled" (the hosted product).
  NEXT_PUBLIC_PRODUCT_NAME: z.string().min(1).default("Schduled"),

  // "Powered by <product>" attribution on public booking pages — on by
  // default (matches the hosted product). Self-hosters can turn it off.
  NEXT_PUBLIC_SHOW_POWERED_BY: z.preprocess(
    (v) => (v === undefined ? true : v === "true" || v === "1"),
    z.boolean()
  ),

  // Contact-form destination (server-only — not exposed to the browser).
  // Falls back to SMTP_USER, then a hardcoded address, if unset.
  CONTACT_EMAIL: optionalString,

  // Public-facing addresses shown on the landing/contact pages. Fall back to
  // the hosted product's addresses if unset — self-hosters should override.
  NEXT_PUBLIC_CONTACT_EMAIL: z.string().min(1).default("support@schduled.com"),
  PRIVACY_EMAIL: z.string().min(1).default("privacy@schduled.com"),

  // Email-specific branding overrides (see lib/email/branding.ts) — all
  // optional. Unset means "use the built-in Schduled default" for the logo
  // and color; the support address has no default at all (omitted from
  // footers entirely unless set).
  NEXT_PUBLIC_LOGO_URL: optionalString,
  NEXT_PUBLIC_EMAIL_BRAND_COLOR: optionalString,
  NEXT_PUBLIC_EMAIL_SUPPORT_ADDRESS: optionalString,

  // Google OAuth + Calendar API
  GOOGLE_CLIENT_ID: optionalString,
  GOOGLE_CLIENT_SECRET: optionalString,

  // Zoom OAuth
  ZOOM_CLIENT_ID: optionalString,
  ZOOM_CLIENT_SECRET: optionalString,

  // Address autocomplete geocoder. Defaults to free, keyless Photon (OSM).
  // Set a Google or Mapbox key for richer village/street/building coverage —
  // the provider is auto-detected, or pin it with GEOCODER_PROVIDER.
  GEOCODER_PROVIDER: z
    .enum(["photon", "google", "mapbox"])
    .optional(),
  GOOGLE_MAPS_API_KEY: optionalString,
  MAPBOX_TOKEN: optionalString,

  // File storage driver — see lib/storage.ts. "local" (default) needs no
  // other vars: files go to ./uploads (a persistent volume in Docker).
  // Files are always served through /api/files/[...key] regardless of
  // driver, never a direct/signed cloud URL — see lib/storage.ts and
  // app/api/files/[...key]/route.ts.
  STORAGE_DRIVER: z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.enum(["local", "s3", "r2"]).default("local")
  ),

  // s3 driver — generic S3-compatible: AWS S3, MinIO, DigitalOcean Spaces,
  // Backblaze B2, etc. S3_ENDPOINT/S3_ACCESS_KEY_ID/S3_SECRET_ACCESS_KEY are
  // only needed for non-AWS endpoints; omit them to use the standard AWS
  // credential chain (env vars, IAM role, shared profile) against real S3.
  S3_ENDPOINT: optionalString,
  S3_REGION: optionalString,
  S3_BUCKET: optionalString,
  S3_ACCESS_KEY_ID: optionalString,
  S3_SECRET_ACCESS_KEY: optionalString,

  // r2 driver — dedicated Cloudflare R2 support. accessKeyId/secretAccessKey
  // are also read directly from R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY by
  // the files-sdk r2 adapter itself (not renamed here) — see lib/storage.ts.
  R2_BUCKET: optionalString,
  R2_ACCOUNT_ID: optionalString,
  R2_ACCESS_KEY_ID: optionalString,
  R2_SECRET_ACCESS_KEY: optionalString,

  // Optional for either cloud driver: a CDN/public domain bound to the
  // bucket. Unset is fine — reads always go through /api/files/[...key]
  // rather than handing out cloud URLs directly, so this only matters if you
  // also want to point external tooling at the bucket yourself.
  STORAGE_PUBLIC_BASE_URL: optionalString,
}).superRefine((val, ctx) => {
  // OAuth integrations store access/refresh tokens encrypted at rest with
  // ENCRYPT_KEY. If an integration is configured but the key is missing, the
  // OAuth callback would throw *after* the code exchange — fail at boot instead.
  const googleEnabled = !!(val.GOOGLE_CLIENT_ID && val.GOOGLE_CLIENT_SECRET);
  const zoomEnabled = !!(val.ZOOM_CLIENT_ID && val.ZOOM_CLIENT_SECRET);
  if ((googleEnabled || zoomEnabled) && !val.ENCRYPT_KEY) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["ENCRYPT_KEY"],
      message:
        "ENCRYPT_KEY is required when Google or Zoom OAuth is configured (it encrypts stored OAuth tokens).",
    });
  }

  if (val.NODE_ENV === "production" && !val.APP_URL) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["APP_URL"],
      message:
        "APP_URL is required in production. It must be the real public https:// domain " +
        "(e.g. https://schduled.2sc.dev) — unlike NEXT_PUBLIC_APP_URL, it is read live at " +
        "runtime and is never frozen into the build, so OAuth redirects, magic links, and " +
        "booking links resolve correctly behind a reverse proxy.",
    });
  }

  if (val.STORAGE_DRIVER === "s3" && !val.S3_BUCKET) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["S3_BUCKET"],
      message: "S3_BUCKET is required when STORAGE_DRIVER=s3.",
    });
  }
  if (val.STORAGE_DRIVER === "r2" && !(val.R2_BUCKET && val.R2_ACCOUNT_ID)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["R2_BUCKET"],
      message: "R2_BUCKET and R2_ACCOUNT_ID are required when STORAGE_DRIVER=r2.",
    });
  }
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const details = parsed.error.issues
    .map((issue) => `  - ${issue.path.join(".") || "(root)"}: ${issue.message}`)
    .join("\n");

  console.error("Invalid environment variables:");
  console.error(details);
  console.error(parsed.error.format());

  throw new Error(`Invalid environment variables:\n${details}`);
}

export const env = parsed.data;
