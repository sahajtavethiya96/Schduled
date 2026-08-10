import { and, gte, ilike, like, lte, or, type SQL } from "drizzle-orm";
import { auditLogs } from "@/db/schema";

export type ActionCategory =
  | "all"
  | "auth"
  | "bookings"
  | "events"
  | "emails"
  | "profile";
export type DateRange = "all" | "today" | "week" | "month" | "custom";

export interface AuditFilters {
  category: ActionCategory;
  customFrom: string;
  customTo: string;
  dateRange: DateRange;
  entityType: string;
  search: string;
}

const CATEGORY_PREFIX: Record<Exclude<ActionCategory, "all">, string> = {
  auth: "auth.",
  bookings: "booking.",
  events: "event_type.",
  emails: "email.",
  profile: "profile.",
};

/** Builds the shared Drizzle WHERE clause so the page query and the export
 * action stay in sync — filters must never drift between what's shown and
 * what gets exported. */
export function buildAuditWhereClause(filters: AuditFilters): SQL | undefined {
  const conditions: (SQL | undefined)[] = [];

  if (filters.search.trim()) {
    const q = `%${filters.search.trim()}%`;
    conditions.push(
      or(
        ilike(auditLogs.action, q),
        ilike(auditLogs.actorEmail, q),
        ilike(auditLogs.entityType, q),
        ilike(auditLogs.description, q)
      )
    );
  }

  if (filters.category !== "all") {
    if (filters.category === "profile") {
      conditions.push(
        or(
          like(auditLogs.action, "profile.%"),
          like(auditLogs.action, "orbit.%")
        )
      );
    } else {
      conditions.push(
        like(auditLogs.action, `${CATEGORY_PREFIX[filters.category]}%`)
      );
    }
  }

  if (filters.entityType !== "all") {
    conditions.push(ilike(auditLogs.entityType, filters.entityType));
  }

  const now = new Date();
  if (filters.dateRange === "today") {
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    conditions.push(gte(auditLogs.createdAt, startOfDay));
  } else if (filters.dateRange === "week") {
    conditions.push(
      gte(auditLogs.createdAt, new Date(now.getTime() - 7 * 86_400_000))
    );
  } else if (filters.dateRange === "month") {
    conditions.push(
      gte(auditLogs.createdAt, new Date(now.getTime() - 30 * 86_400_000))
    );
  } else if (filters.dateRange === "custom") {
    if (filters.customFrom) {
      conditions.push(gte(auditLogs.createdAt, new Date(filters.customFrom)));
    }
    if (filters.customTo) {
      conditions.push(
        lte(auditLogs.createdAt, new Date(`${filters.customTo}T23:59:59`))
      );
    }
  }

  return conditions.length ? and(...conditions) : undefined;
}

export function parseAuditFilters(params: {
  q?: string;
  category?: string;
  entity?: string;
  dateRange?: string;
  from?: string;
  to?: string;
}): AuditFilters {
  const category: ActionCategory =
    params.category === "auth" ||
    params.category === "bookings" ||
    params.category === "events" ||
    params.category === "emails" ||
    params.category === "profile"
      ? params.category
      : "all";
  const dateRange: DateRange =
    params.dateRange === "today" ||
    params.dateRange === "week" ||
    params.dateRange === "month" ||
    params.dateRange === "custom"
      ? params.dateRange
      : "all";

  return {
    search: params.q?.trim() ?? "",
    category,
    entityType: params.entity?.trim() || "all",
    dateRange,
    customFrom: params.from?.match(/^\d{4}-\d{2}-\d{2}$/) ? params.from : "",
    customTo: params.to?.match(/^\d{4}-\d{2}-\d{2}$/) ? params.to : "",
  };
}
