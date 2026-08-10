import { and, count, desc, eq, ilike, or } from "drizzle-orm";
import { PageHeader } from "@/components/scaffold/page-header";
import {
  UsersFilter,
  UsersSearch,
} from "@/components/settings-admin/users-search";
import { UsersTable } from "@/components/settings-admin/users-table";
import { Card, CardContent } from "@/components/ui/card";
import { ADMIN_ROLE } from "@/config/platform";
import { user } from "@/db/schema";
import { requireAdmin } from "@/lib/authz";
import { db } from "@/lib/db";

export const metadata = { title: "Members" };

const PAGE_SIZE = 10;

type Filter = "all" | "active" | "admins" | "suspended";

export default async function SettingsUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; filter?: string; page?: string }>;
}) {
  const session = await requireAdmin();
  const { q, filter: rawFilter, page: rawPage } = await searchParams;

  const search = q?.trim() ?? "";
  const filter: Filter =
    rawFilter === "active" ||
    rawFilter === "admins" ||
    rawFilter === "suspended"
      ? rawFilter
      : "all";
  const page = Math.max(1, Number.parseInt(rawPage ?? "1", 10) || 1);

  const searchFilter = search
    ? or(ilike(user.name, `%${search}%`), ilike(user.email, `%${search}%`))
    : undefined;
  const statusFilter =
    filter === "active"
      ? eq(user.banned, false)
      : filter === "admins"
        ? eq(user.role, ADMIN_ROLE)
        : filter === "suspended"
          ? eq(user.banned, true)
          : undefined;
  const whereClause = and(searchFilter, statusFilter);

  const [totalResult, adminResult, suspendedResult, allResult, rows] =
    await Promise.all([
      db.select({ value: count() }).from(user).where(whereClause),
      db.select({ value: count() }).from(user).where(eq(user.role, ADMIN_ROLE)),
      db.select({ value: count() }).from(user).where(eq(user.banned, true)),
      db.select({ value: count() }).from(user),
      db
        .select({
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          banned: user.banned,
          createdAt: user.createdAt,
        })
        .from(user)
        .where(whereClause)
        .orderBy(desc(user.createdAt))
        .limit(PAGE_SIZE)
        .offset((page - 1) * PAGE_SIZE),
    ]);

  const total = totalResult[0]?.value ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <PageHeader
        description="Suspend accounts, manage members, and inspect basic account state."
        title="Members"
      />

      <Card>
        <div className="flex flex-col gap-3 border-b border-base-300 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <p className="text-base font-semibold text-base-content">
              All Members
            </p>
            <p className="text-sm text-muted-foreground">
              All registered accounts ordered by sign-up date.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <UsersSearch />
            <UsersFilter value={filter} />
          </div>
        </div>

        <div className="flex items-center gap-2.5 border-b border-base-300 px-4 py-2 text-xs text-muted-foreground">
          <span>
            <strong className="font-semibold text-base-content">
              {allResult[0]?.value ?? 0}
            </strong>{" "}
            total
          </span>
          <span className="text-base-300">·</span>
          <span>
            <strong className="font-semibold text-base-content">
              {adminResult[0]?.value ?? 0}
            </strong>{" "}
            admin{(adminResult[0]?.value ?? 0) === 1 ? "" : "s"}
          </span>
          <span className="text-base-300">·</span>
          <span>
            <strong className="font-semibold text-base-content">
              {suspendedResult[0]?.value ?? 0}
            </strong>{" "}
            suspended
          </span>
        </div>

        <CardContent className="p-0">
          <UsersTable
            currentUserId={session.user.id}
            filter={filter}
            page={page}
            search={search}
            total={total}
            totalPages={totalPages}
            users={rows.map((u) => ({
              ...u,
              createdAt: u.createdAt.toISOString(),
            }))}
          />
        </CardContent>
      </Card>
    </div>
  );
}
