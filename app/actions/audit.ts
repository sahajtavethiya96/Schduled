"use server";

import { desc } from "drizzle-orm";
import { auditLogs } from "@/db/schema";
import { type AuditFilters, buildAuditWhereClause } from "@/lib/audit-query";
import { requireAdmin } from "@/lib/authz";
import { db } from "@/lib/db";

// Capped to avoid an unbounded in-memory result set; narrow filters for a bigger slice.
const EXPORT_LIMIT = 5000;

export interface ExportAuditRow {
  action: string;
  actorEmail: string | null;
  actorId: string | null;
  createdAt: string;
  description: string;
  entityId: string | null;
  entityType: string;
  id: string;
  metadata: Record<string, unknown> | null;
}

export async function exportAuditLogsAction(
  filters: AuditFilters
): Promise<{ rows: ExportAuditRow[]; truncated: boolean }> {
  await requireAdmin();

  const whereClause = buildAuditWhereClause(filters);

  const rows = await db
    .select({
      id: auditLogs.id,
      action: auditLogs.action,
      actorId: auditLogs.actorId,
      actorEmail: auditLogs.actorEmail,
      entityType: auditLogs.entityType,
      entityId: auditLogs.entityId,
      description: auditLogs.description,
      metadata: auditLogs.metadata,
      createdAt: auditLogs.createdAt,
    })
    .from(auditLogs)
    .where(whereClause)
    .orderBy(desc(auditLogs.createdAt))
    .limit(EXPORT_LIMIT + 1);

  const truncated = rows.length > EXPORT_LIMIT;
  return {
    rows: rows
      .slice(0, EXPORT_LIMIT)
      .map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })),
    truncated,
  };
}
