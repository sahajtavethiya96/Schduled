"use client";

import { ArrowRight, ProhibitInset, Trash } from "@phosphor-icons/react";
import { format } from "date-fns";
import Link from "next/link";
import { useState, useTransition } from "react";
import { bulkBanUsersAction, bulkDeleteUsersAction } from "@/app/actions/users";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ADMIN_ROLE } from "@/config/platform";
import { paginationRange } from "@/lib/utils";
import { UserSuspendForm } from "./user-actions";

type UserRow = {
  id: string;
  name: string | null;
  email: string;
  role: string | null;
  banned: boolean;
  createdAt: string;
};

type Filter = "all" | "active" | "admins" | "suspended";

export function UsersTable({
  users,
  currentUserId,
  total,
  page,
  totalPages,
  search,
  filter,
}: {
  users: UserRow[];
  currentUserId: string;
  total: number;
  page: number;
  totalPages: number;
  search: string;
  filter: Filter;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();

  const pageUsers = users;

  function pageHref(p: number) {
    const params = new URLSearchParams();
    if (search) {
      params.set("q", search);
    }
    if (filter !== "all") {
      params.set("filter", filter);
    }
    if (p > 1) {
      params.set("page", String(p));
    }
    const qs = params.toString();
    return qs ? `/settings/users?${qs}` : "/settings/users";
  }

  const selectableIds = pageUsers
    .filter((u) => u.id !== currentUserId)
    .map((u) => u.id);
  const allSelected =
    selectableIds.length > 0 && selectableIds.every((id) => selected.has(id));

  function toggleAll() {
    if (allSelected) {
      setSelected((s) => {
        const n = new Set(s);
        for (const id of selectableIds) {
          n.delete(id);
        }
        return n;
      });
    } else {
      setSelected((s) => new Set([...s, ...selectableIds]));
    }
  }

  function toggleOne(id: string) {
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) {
        n.delete(id);
      } else {
        n.add(id);
      }
      return n;
    });
  }

  function buildFormData() {
    const fd = new FormData();
    for (const id of selected) {
      fd.append("userId", id);
    }
    return fd;
  }

  function handleBulkSuspend() {
    startTransition(async () => {
      await bulkBanUsersAction(buildFormData());
      setSelected(new Set());
    });
  }

  function handleBulkDelete() {
    startTransition(async () => {
      await bulkDeleteUsersAction(buildFormData());
      setSelected(new Set());
    });
  }

  return (
    <div className="relative">
      {/* ── Table ───────────────────────────────────────────────────── */}
      <div className="overflow-x-auto">
        <Table className="w-full text-sm">
          <TableHeader>
            <TableRow className="border-b border-base-300 bg-base-200/40">
              <TableHead className="w-10 px-4 py-3">
                <Checkbox
                  aria-label="Select all on this page"
                  checked={allSelected}
                  disabled={selectableIds.length === 0}
                  onCheckedChange={() => toggleAll()}
                  title={
                    selectableIds.length === 0
                      ? "No other accounts to select"
                      : "Select all on this page"
                  }
                />
              </TableHead>
              <TableHead className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-ui text-muted-foreground">
                User
              </TableHead>
              <TableHead className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-ui text-muted-foreground">
                Role
              </TableHead>
              <TableHead className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-ui text-muted-foreground">
                Status
              </TableHead>
              <TableHead className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-ui text-muted-foreground">
                Created
              </TableHead>
              <TableHead className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-ui text-muted-foreground">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageUsers.length === 0 ? (
              <TableRow>
                <TableCell
                  className="px-6 py-10 text-center text-sm text-muted-foreground"
                  colSpan={6}
                >
                  No users match your search.
                </TableCell>
              </TableRow>
            ) : (
              pageUsers.map((u) => {
                const isSelf = u.id === currentUserId;
                const isChecked = selected.has(u.id);
                return (
                  <TableRow
                    className={`border-b border-base-300 transition-colors last:border-0 ${isChecked ? "bg-primary/[0.04]" : "hover:bg-base-200/20"}`}
                    key={u.id}
                  >
                    {/* Checkbox */}
                    <TableCell className="w-10 px-4 py-3">
                      {!isSelf && (
                        <Checkbox
                          aria-label={`Select ${u.email}`}
                          checked={isChecked}
                          onCheckedChange={() => toggleOne(u.id)}
                        />
                      )}
                    </TableCell>

                    {/* User */}
                    <TableCell className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="shrink-0">
                          <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                            {(u.name ?? u.email).slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="truncate text-sm font-medium">
                              {u.name ?? "—"}
                            </p>
                            {isSelf && (
                              <span className="shrink-0 rounded-none bg-primary/10 px-1.5 py-0.5 text-2xs font-semibold text-primary uppercase tracking-ui">
                                You
                              </span>
                            )}
                          </div>
                          <p className="truncate text-xs text-muted-foreground">
                            {u.email}
                          </p>
                        </div>
                      </div>
                    </TableCell>

                    {/* Role */}
                    <TableCell className="px-4 py-3">
                      <Badge
                        className="text-xs"
                        variant={
                          u.role === ADMIN_ROLE ? "default" : "secondary"
                        }
                      >
                        {u.role ?? "user"}
                      </Badge>
                    </TableCell>

                    {/* Status */}
                    <TableCell className="px-4 py-3">
                      {u.banned ? (
                        <span className="inline-flex items-center gap-1.5 rounded-none border border-error/20 bg-error/10 px-2 py-0.5 text-xs font-medium text-error">
                          <span className="h-1.5 w-1.5 rounded-full bg-error" />
                          Suspended
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-none border border-success/30 bg-success/10 px-2 py-0.5 text-xs font-medium text-success">
                          <span className="h-1.5 w-1.5 rounded-full bg-success" />
                          Active
                        </span>
                      )}
                    </TableCell>

                    {/* Created */}
                    <TableCell className="px-4 py-3 text-xs text-muted-foreground">
                      {format(new Date(u.createdAt), "MMM d, yyyy")}
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {!isSelf && (
                          <UserSuspendForm banned={u.banned} userId={u.id} />
                        )}
                        <Link
                          className="inline-flex items-center gap-1 rounded-none border border-base-300 px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
                          href={`/settings/users/${u.id}`}
                        >
                          View <ArrowRight size={11} />
                        </Link>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Row count + pagination */}
      {total > 0 && selected.size === 0 && (
        <div className="flex items-center justify-between gap-3 border-t border-base-300 px-6 py-3">
          <p className="text-xs text-muted-foreground">
            Page {page} of {totalPages} · {total} user{total === 1 ? "" : "s"}
          </p>
          {totalPages > 1 && (
            <Pagination className="mx-0 w-auto">
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    aria-disabled={page <= 1}
                    className={
                      page <= 1 ? "pointer-events-none opacity-40" : ""
                    }
                    href={page > 1 ? pageHref(page - 1) : "#"}
                  />
                </PaginationItem>
                {paginationRange(page, totalPages).map((p) =>
                  typeof p === "string" ? (
                    <PaginationItem key={p}>
                      <PaginationEllipsis />
                    </PaginationItem>
                  ) : (
                    <PaginationItem key={p}>
                      <PaginationLink href={pageHref(p)} isActive={p === page}>
                        {p}
                      </PaginationLink>
                    </PaginationItem>
                  )
                )}
                <PaginationItem>
                  <PaginationNext
                    aria-disabled={page >= totalPages}
                    className={
                      page >= totalPages ? "pointer-events-none opacity-40" : ""
                    }
                    href={page < totalPages ? pageHref(page + 1) : "#"}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </div>
      )}

      {/* ── Bulk action toolbar ──────────────────────────────────────── */}
      {selected.size > 0 && (
        <div className="sticky bottom-0 flex items-center justify-between gap-4 border-t border-primary/20 bg-base-100 px-6 py-3">
          <p className="text-sm font-medium">
            <span className="text-primary font-bold">{selected.size}</span> user
            {selected.size === 1 ? "" : "s"} selected
          </p>

          <div className="flex items-center gap-2">
            <Button
              className="text-xs"
              disabled={isPending}
              onClick={() => setSelected(new Set())}
              size="sm"
              variant="ghost"
            >
              Clear
            </Button>

            {/* Suspend — confirmation dialog */}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  className="gap-1.5 text-xs border-error/40 text-error hover:bg-error/10 hover:text-error"
                  disabled={isPending}
                  size="sm"
                  variant="outline"
                >
                  <ProhibitInset size={13} />
                  Suspend {selected.size}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    Suspend {selected.size} account
                    {selected.size > 1 ? "s" : ""}?
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    {selected.size > 1 ? "These users" : "This user"} will be
                    signed out immediately and blocked from logging in until
                    reactivated. This can be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={isPending}>
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-error text-error-content hover:bg-error/90"
                    disabled={isPending}
                    onClick={handleBulkSuspend}
                  >
                    {isPending ? "Suspending…" : "Suspend"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            {/* Delete — confirmation dialog */}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  className="gap-1.5 text-xs border-error/40 text-error hover:bg-error/10 hover:text-error"
                  disabled={isPending}
                  size="sm"
                  variant="outline"
                >
                  <Trash size={13} />
                  Delete {selected.size}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    Delete {selected.size} account{selected.size > 1 ? "s" : ""}{" "}
                    permanently?
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    This permanently removes{" "}
                    {selected.size > 1 ? "these accounts" : "this account"} and
                    all of their bookings, sessions, and data. This action
                    cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={isPending}>
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-error text-error-content hover:bg-error/90"
                    disabled={isPending}
                    onClick={handleBulkDelete}
                  >
                    {isPending ? "Deleting…" : "Delete"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      )}
    </div>
  );
}
