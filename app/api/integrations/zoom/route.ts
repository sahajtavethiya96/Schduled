import { type NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/authz";
import { safeReturnTo } from "@/lib/api/helpers";
import { getAppUrl } from "@/lib/get-app-url";
import { getZoomAuthUrl, zoomConfigured } from "@/lib/zoom/client";

export async function GET(req: NextRequest) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.redirect(new URL("/login", getAppUrl()));
  }

  const returnTo = safeReturnTo(
    req.nextUrl.searchParams.get("returnTo"),
    "/settings/integrations"
  );

  if (!zoomConfigured()) {
    const fallback = new URL(returnTo, getAppUrl());
    fallback.searchParams.set("zoom_error", "not_configured");
    return NextResponse.redirect(fallback);
  }

  const state = Buffer.from(
    JSON.stringify({ userId: session.user.id, returnTo })
  ).toString("base64");

  return NextResponse.redirect(getZoomAuthUrl(state));
}
