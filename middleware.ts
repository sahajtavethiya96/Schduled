import { type NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";

const PUBLIC_PREFIXES = [
  "/api/auth", // Better Auth handler
  "/_next", // Next.js internals
  "/favicon",
  "/cancel/", // public booking cancel
  "/reschedule/", // public booking reschedule
];

const AUTH_PATHS: string[] = []; // handled client-side in auth-form via useSession()

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/event-types",
  "/availability",
  "/bookings",
  "/settings",
  "/post-auth",
  "/onboarding",
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Always public
  if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Static assets
  if (/\.(svg|png|jpg|jpeg|gif|webp|ico|woff2?)$/.test(pathname)) {
    return NextResponse.next();
  }

  // Marketing landing page — optional. Internal/team deployments that don't
  // want a public marketing page can set NEXT_PUBLIC_LANDING_ENABLED=false;
  // "/" then redirects to "/login" (which itself forwards a signed-in user
  // onward). Legal pages stay public either way.
  if (pathname === "/" && !env.NEXT_PUBLIC_LANDING_ENABLED) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Landing + legal pages
  if (["/", "/privacy", "/terms", "/cookies"].includes(pathname)) {
    return NextResponse.next();
  }

  // Public booking pages: /{username}, /{username}/{slug}
  // These are NOT protected — anyone can view a booking page
  // (They look like /<word> or /<word>/<word>, not matching any protected prefix)

  const session =
    request.cookies.get("better-auth.session_token") ||
    request.cookies.get("__Secure-better-auth.session_token");
  const hasSession = Boolean(session?.value);

  // Protected app routes
  if (PROTECTED_PREFIXES.some((p) => pathname.startsWith(p))) {
    if (!hasSession) {
      const url = new URL("/login", request.url);
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  // Default: public (booking pages, etc.)
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$).*)",
  ],
};
