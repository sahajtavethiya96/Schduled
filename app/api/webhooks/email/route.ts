import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { emailEvents } from "@/db/schema";
import { db } from "@/lib/db";
import { env } from "@/lib/env";

export async function POST(request: Request) {
  if (!env.EMAIL_WEBHOOK_SECRET) {
    return NextResponse.json(
      { error: "EMAIL_WEBHOOK_SECRET is not configured" },
      { status: 503 }
    );
  }
  if (!isValidWebhookSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = (await request.json()) as Record<string, unknown>;
  const eventId = String(payload.id ?? payload.event_id ?? "");
  const eventType = String(payload.type ?? payload.event ?? "unknown");
  const emailObject = payload.email as Record<string, unknown> | undefined;
  const providerEmailId = emailObject?.id ? String(emailObject.id) : null;
  const recipient = emailObject?.to ?? payload.recipient ?? null;

  if (!eventId) {
    return NextResponse.json({ error: "Missing event id" }, { status: 400 });
  }

  // Rely on the unique constraint on provider_event_id rather than a
  // check-then-insert, so concurrent duplicate deliveries can't both pass a
  // read and then throw on the second insert.
  const inserted = await db
    .insert(emailEvents)
    .values({
      providerEmailId,
      providerEventId: eventId,
      eventType,
      payload,
      recipient: recipient ? String(recipient) : null,
    })
    .onConflictDoNothing({ target: emailEvents.providerEventId })
    .returning({ id: emailEvents.id });

  if (inserted.length === 0) {
    return NextResponse.json({ ok: true, duplicate: true });
  }

  return NextResponse.json({ ok: true });
}

function isValidWebhookSecret(request: Request) {
  const authorization = request.headers.get("authorization");
  const candidates = [
    request.headers.get("x-webhook-secret"),
    authorization?.toLowerCase().startsWith("bearer ")
      ? authorization.slice("bearer ".length)
      : null,
  ].filter(Boolean);

  return candidates.some((candidate) =>
    safeEqual(String(candidate), env.EMAIL_WEBHOOK_SECRET ?? "")
  );
}

function safeEqual(value: string, expected: string) {
  const valueBuffer = Buffer.from(value);
  const expectedBuffer = Buffer.from(expected);

  return (
    valueBuffer.length === expectedBuffer.length &&
    timingSafeEqual(valueBuffer, expectedBuffer)
  );
}
