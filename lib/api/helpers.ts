import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// ── Redirect-target sanitization ──────────────────────────────────────────────

/**
 * Returns `value` only if it is a safe, same-origin relative path. Rejects
 * absolute URLs, protocol-relative URLs (`//evil.com`), backslash tricks, and
 * anything that doesn't start with a single "/", falling back to `fallback`.
 * Use before building a redirect from any user-supplied `returnTo`.
 */
export function safeReturnTo(
  value: string | null | undefined,
  fallback = "/dashboard"
): string {
  if (!value) {
    return fallback;
  }
  if (!value.startsWith("/")) {
    return fallback;
  }
  if (value.startsWith("//") || value.startsWith("/\\")) {
    return fallback;
  }
  if (value.includes("://")) {
    return fallback;
  }
  return value;
}

// ── Typed response helpers ───────────────────────────────────────────────────

export function jsonOk<T>(data: T, status = 200): NextResponse<T> {
  return NextResponse.json(data, { status }) as NextResponse<T>;
}

export function jsonError(
  message: string,
  status: number
): NextResponse<{ error: string }> {
  return NextResponse.json({ error: message }, { status });
}

// ── Postgres-backed rate limiter ────────────────────────────────────────────
// Shared across every web replica (unlike an in-process Map). One atomic
// upsert per check — Postgres serializes concurrent upserts on the same key,
// so this stays race-free across replicas.

/**
 * Returns true if the request should be allowed, false if rate-limited.
 *
 * @param key      Unique bucket key — include route + IP so limits are per-endpoint
 * @param limit    Max hits allowed within the window
 * @param windowMs Window length in milliseconds
 */
export async function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): Promise<boolean> {
  const windowSeconds = windowMs / 1000;
  const rows = await db.execute<{ count: number }>(sql`
    INSERT INTO rate_limit_bucket (key, count, reset_at)
    VALUES (${key}, 1, now() + (${windowSeconds} || ' seconds')::interval)
    ON CONFLICT (key) DO UPDATE SET
      count = CASE
        WHEN rate_limit_bucket.reset_at < now() THEN 1
        ELSE rate_limit_bucket.count + 1
      END,
      reset_at = CASE
        WHEN rate_limit_bucket.reset_at < now() THEN now() + (${windowSeconds} || ' seconds')::interval
        ELSE rate_limit_bucket.reset_at
      END
    RETURNING count
  `);

  const count = Number(rows[0]?.count ?? 1);

  // Opportunistic cleanup — harmless if it runs on every replica concurrently
  // (DELETE is idempotent). No dedicated cron needed.
  if (Math.random() < 0.01) {
    void db.execute(
      sql`DELETE FROM rate_limit_bucket WHERE reset_at < now() - interval '1 day'`
    );
  }

  return count <= limit;
}

/**
 * Extract the best available client IP from request headers.
 * Supports Vercel, Cloudflare, nginx reverse proxies.
 */
export function getClientIp(request: Request): string {
  // Prefer headers set exclusively by trusted infrastructure (cannot be spoofed by clients).
  const cfIp = request.headers.get("cf-connecting-ip");
  if (cfIp) {
    return cfIp.trim();
  }

  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp.trim();
  }

  // X-Forwarded-For: leftmost value is client-controlled/spoofable; the
  // rightmost is appended by the direct upstream proxy and is trustworthy.
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const parts = forwarded.split(",");
    return parts[parts.length - 1].trim();
  }

  return "unknown";
}

/**
 * Build a scoped rate-limit key: `"<route>:<ip>"`.
 */
export function rateLimitKey(route: string, request: Request): string {
  return `${route}:${getClientIp(request)}`;
}
