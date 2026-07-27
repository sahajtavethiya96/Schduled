import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Produces a self-contained .next/standalone build (bundled node_modules,
  // minimal server) — dramatically smaller Docker images than a full
  // `next start` deploy.
  output: "standalone",
  // Declares sharp (native image resize, used by the avatar upload route) as
  // a genuine runtime dependency rather than something to bundle. Turbopack
  // already auto-detects and externalizes sharp on its own (this line alone
  // did NOT change the ERR_DLOPEN_FAILED behavior below — Turbopack's own
  // "external module" loader for native addons is the actual broken piece;
  // see package.json's pinned sharp version for the real fix).
  serverExternalPackages: ["sharp"],
  async redirects() {
    return [
      { source: '/settings', destination: '/settings/my-link', permanent: true },
    ]
  },
  async headers() {
    // Pragmatic CSP (no nonce infrastructure): 'unsafe-inline' is needed for
    // Next.js's inline hydration/bootstrap scripts and Tailwind's inline
    // style attributes. frame-ancestors 'none' blocks embedding entirely —
    // this will need a carve-out for booking-page routes once the embed
    // widget ships (see SELF-HOSTING.md Part 4 §M).
    // 'unsafe-eval' is only added in development — React and Turbopack use
    // eval() for source maps and callstack reconstruction in dev mode only.
    const isDev = process.env.NODE_ENV === 'development'
    const csp = [
      "default-src 'self'",
      `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`,
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https://lh3.googleusercontent.com",
      "font-src 'self' data:",
      "connect-src 'self'",
      "frame-ancestors 'none'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; ')

    // Booking pages (/:username/:eventSlug) must be embeddable via iframe.
    const embedCsp = csp.replace("frame-ancestors 'none'", "frame-ancestors *")

    return [
      // Booking pages — allow embedding in any origin
      {
        source: '/:username/:eventSlug',
        headers: [
          { key: 'Content-Security-Policy', value: embedCsp },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000' },
        ],
      },
      // All other pages — deny embedding
      {
        source: '/(.*)',
        headers: [
          { key: 'Content-Security-Policy', value: csp },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000' },
        ],
      },
    ]
  },
  turbopack: {
    root: resolve(__dirname),
  },
  // Dev-only: allows a tunneling origin (e.g. ngrok) to reach the dev
  // server for testing OAuth callbacks. Set your own in .env — nothing is
  // hardcoded here so this repo doesn't ship a specific developer's tunnel.
  allowedDevOrigins: process.env.DEV_TUNNEL_ORIGIN
    ? [process.env.DEV_TUNNEL_ORIGIN]
    : [],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
    ],
  },
};

export default nextConfig;
