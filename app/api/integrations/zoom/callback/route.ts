import { createId } from "@paralleldrive/cuid2";
import { and, eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { videoConnection } from "@/db/schema";
import { audit } from "@/lib/audit";
import { getCurrentSession } from "@/lib/authz";
import { safeReturnTo } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { encrypt } from "@/lib/encrypt";
import { getAppUrl } from "@/lib/get-app-url";
import {
  exchangeZoomCode,
  getZoomUser,
  zoomConfigured,
} from "@/lib/zoom/client";

export async function GET(req: NextRequest) {
  const url = req.nextUrl;
  const code = url.searchParams.get("code");
  const stateParam = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  // Build redirects from the configured app URL, not req.url — behind a tunnel
  // (ngrok/cloudflared) req.url resolves to the internal localhost host and the
  // protocol can flip to https, producing a broken redirect.
  const base = getAppUrl();
  const failUrl = new URL("/settings/integrations?zoom_error=1", base);

  if (error || !code || !stateParam) {
    return NextResponse.redirect(failUrl);
  }

  let state: { userId: string; returnTo: string };
  try {
    state = JSON.parse(Buffer.from(stateParam, "base64").toString("utf-8"));
  } catch {
    return NextResponse.redirect(failUrl);
  }

  // Verify the current session matches the state userId
  const session = await getCurrentSession();
  if (!session || session.user.id !== state.userId) {
    return NextResponse.redirect(new URL("/login", base));
  }

  if (!(await zoomConfigured())) {
    return NextResponse.redirect(failUrl);
  }

  let tokens: {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  };
  try {
    tokens = await exchangeZoomCode(code);
  } catch {
    return NextResponse.redirect(failUrl);
  }

  let zoomUser: { id: string; email: string };
  try {
    zoomUser = await getZoomUser(tokens.access_token);
  } catch {
    zoomUser = { id: "", email: session.user.email };
  }

  const encryptedAccess = await encrypt(tokens.access_token);
  const encryptedRefresh = await encrypt(tokens.refresh_token);
  const tokenExpiresAt = new Date(Date.now() + tokens.expires_in * 1000);

  // Upsert: replace any existing Zoom connection for this user
  const [existing] = await db
    .select({ id: videoConnection.id })
    .from(videoConnection)
    .where(
      and(
        eq(videoConnection.userId, session.user.id),
        eq(videoConnection.provider, "zoom")
      )
    )
    .limit(1);

  if (existing) {
    await db
      .update(videoConnection)
      .set({
        accountEmail: zoomUser.email,
        accessToken: encryptedAccess,
        refreshToken: encryptedRefresh,
        tokenExpiresAt,
        providerUserId: zoomUser.id || null,
      })
      .where(eq(videoConnection.id, existing.id));
  } else {
    await db.insert(videoConnection).values({
      id: createId(),
      userId: session.user.id,
      provider: "zoom",
      accountEmail: zoomUser.email,
      accessToken: encryptedAccess,
      refreshToken: encryptedRefresh,
      tokenExpiresAt,
      providerUserId: zoomUser.id || null,
    });
  }

  await audit({
    action: "video.connected",
    actorId: session.user.id,
    actorEmail: session.user.email,
    entityType: "video_connection",
    description: "Connected Zoom",
    metadata: { provider: "zoom", accountEmail: zoomUser.email },
  });

  const returnUrl = new URL(safeReturnTo(state.returnTo, "/settings/integrations"), base);
  returnUrl.searchParams.set("zoom_connected", "1");
  return NextResponse.redirect(returnUrl);
}
