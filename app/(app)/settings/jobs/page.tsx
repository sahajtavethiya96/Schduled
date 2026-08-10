import { and, count, desc, eq, gte, ilike, lte, or, sql } from "drizzle-orm";
import { PageHeader } from "@/components/scaffold/page-header";
import { EmailClient } from "@/components/settings-admin/email-client";
import { JobsTabs } from "@/components/settings-admin/jobs-tabs";
import { QueuesClient } from "@/components/settings-admin/queues-client";
import { emailEvents, emailOutbox } from "@/db/schema";
import { requireAdmin } from "@/lib/authz";
import { db } from "@/lib/db";
import { getQueueSummary } from "@/lib/worker/queue-inspection";

export const metadata = { title: "Background Jobs" };

const OUTBOX_PAGE_SIZE = 10;
const OUTBOX_STATUSES = ["queued", "sending", "sent", "failed"] as const;
type OutboxStatus = (typeof OUTBOX_STATUSES)[number];

export default async function SettingsJobsPage({
  searchParams,
}: {
  searchParams: Promise<{
    tab?: string;
    outboxPage?: string;
    outboxStatus?: string;
    outboxQ?: string;
    outboxFrom?: string;
    outboxTo?: string;
  }>;
}) {
  await requireAdmin();
  const sp = await searchParams;
  const defaultTab = sp.tab === "email" ? "email" : "queues";

  const outboxPage = Math.max(
    1,
    Number.parseInt(sp.outboxPage ?? "1", 10) || 1
  );
  const status: OutboxStatus | "all" = OUTBOX_STATUSES.includes(
    sp.outboxStatus as OutboxStatus
  )
    ? (sp.outboxStatus as OutboxStatus)
    : "all";
  const q = (sp.outboxQ ?? "").trim();
  const from = sp.outboxFrom ?? "";
  const to = sp.outboxTo ?? "";

  const conds = [];
  if (status !== "all") {
    conds.push(eq(emailOutbox.status, status));
  }
  if (q) {
    const like = `%${q}%`;
    conds.push(
      or(
        ilike(sql`${emailOutbox.payload} ->> 'to'`, like),
        ilike(sql`${emailOutbox.payload} ->> 'subject'`, like)
      )
    );
  }
  if (from) {
    const d = new Date(from);
    if (!Number.isNaN(d.getTime())) {
      conds.push(gte(emailOutbox.createdAt, d));
    }
  }
  if (to) {
    const d = new Date(`${to}T23:59:59.999`);
    if (!Number.isNaN(d.getTime())) {
      conds.push(lte(emailOutbox.createdAt, d));
    }
  }
  const whereCond = conds.length ? and(...conds) : undefined;

  const [
    queues,
    outboxRows,
    eventRows,
    [totalRow],
    [sentRow],
    [failedRow],
    [pendingRow],
    [filteredRow],
  ] = await Promise.all([
    getQueueSummary(),
    db
      .select({
        id: emailOutbox.id,
        status: emailOutbox.status,
        payload: emailOutbox.payload,
        attemptCount: emailOutbox.attemptCount,
        sentAt: emailOutbox.sentAt,
        createdAt: emailOutbox.createdAt,
      })
      .from(emailOutbox)
      .where(whereCond)
      .orderBy(desc(emailOutbox.createdAt))
      .limit(OUTBOX_PAGE_SIZE)
      .offset((outboxPage - 1) * OUTBOX_PAGE_SIZE),
    db
      .select({
        id: emailEvents.id,
        eventType: emailEvents.eventType,
        recipient: emailEvents.recipient,
        receivedAt: emailEvents.receivedAt,
      })
      .from(emailEvents)
      .orderBy(desc(emailEvents.receivedAt))
      .limit(50),
    db.select({ value: count() }).from(emailOutbox),
    db
      .select({ value: count() })
      .from(emailOutbox)
      .where(eq(emailOutbox.status, "sent")),
    db
      .select({ value: count() })
      .from(emailOutbox)
      .where(eq(emailOutbox.status, "failed")),
    db
      .select({ value: count() })
      .from(emailOutbox)
      .where(
        or(eq(emailOutbox.status, "queued"), eq(emailOutbox.status, "sending"))
      ),
    db.select({ value: count() }).from(emailOutbox).where(whereCond),
  ]);

  const outbox = outboxRows.map((r) => ({
    ...r,
    sentAt: r.sentAt ? r.sentAt.toISOString() : null,
    createdAt: r.createdAt.toISOString(),
  }));
  const events = eventRows.map((r) => ({
    ...r,
    receivedAt: r.receivedAt.toISOString(),
  }));
  const filteredTotal = filteredRow?.value ?? 0;
  const outboxTotalPages = Math.max(
    1,
    Math.ceil(filteredTotal / OUTBOX_PAGE_SIZE)
  );
  const fetchedAt = new Date().toISOString();

  return (
    <div className="space-y-6">
      <PageHeader
        description="pg-boss queue monitor and the transactional email outbox."
        title="Background Jobs"
      />

      <JobsTabs
        defaultTab={defaultTab}
        emailSlot={
          <EmailClient
            events={events}
            fetchedAt={fetchedAt}
            filter={{ status, q, from, to }}
            filteredTotal={filteredTotal}
            outbox={outbox}
            outboxPage={outboxPage}
            outboxTotalPages={outboxTotalPages}
            stats={{
              total: totalRow?.value ?? 0,
              sent: sentRow?.value ?? 0,
              failed: failedRow?.value ?? 0,
              pending: pendingRow?.value ?? 0,
            }}
          />
        }
        queuesSlot={<QueuesClient fetchedAt={fetchedAt} queues={queues} />}
      />
    </div>
  );
}
