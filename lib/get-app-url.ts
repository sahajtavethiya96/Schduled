import { env } from "@/lib/env";

/**
 * The single source of truth for every server-generated absolute URL
 * (OAuth redirect_uris, Better Auth baseURL, email/magic links, booking
 * links). Always prefer this over reading env.APP_URL/env.NEXT_PUBLIC_APP_URL
 * directly, and never build absolute redirect targets from a request's own
 * url/host — behind a reverse proxy those reflect the internal bind address,
 * not the public domain.
 */
export function getAppUrl(): string {
  const url =
    env.APP_URL ??
    env.NEXT_PUBLIC_APP_URL ??
    (env.NODE_ENV === "production" ? undefined : "http://localhost:3000");

  if (!url) {
    throw new Error("APP_URL is not configured");
  }

  return url.replace(/\/+$/, "");
}
