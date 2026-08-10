"use client";

import {
  Archive,
  ArrowCounterClockwise,
  MagnifyingGlass,
  Note,
  Spinner,
  Trash,
  Users,
} from "@phosphor-icons/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  archiveContact,
  deleteContact,
  unarchiveContact,
  upsertContactNote,
} from "@/app/actions/settings";
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
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn, paginationRange } from "@/lib/utils";

interface Contact {
  booking_count: number;
  contact_id: string | null;
  email: string;
  is_archived: boolean | null;
  last_booked_at: string | null;
  last_meeting_at: string | null;
  name: string;
  next_meeting_at: string | null;
  notes: string | null;
}

type ContactFilter = "all" | "new" | "upcoming";

interface ContactsTableProps {
  archived: boolean;
  contacts: Contact[];
  filter: ContactFilter;
  page: number;
  pageSize: number;
  search: string;
  total: number;
}

const fmtDate = (v: string | null) =>
  v
    ? new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(
        new Date(v)
      )
    : "—";

export function ContactsTable({
  contacts,
  total,
  page,
  pageSize,
  search,
  archived,
  filter,
}: ContactsTableProps) {
  const router = useRouter();
  const sp = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [noteTarget, setNoteTarget] = useState<Contact | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [noteSaving, setNoteSaving] = useState(false);
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const paginationItems = paginationRange(page, totalPages).map((p, i) => ({
    key: p === "ellipsis" ? `ellipsis-${i}` : String(p),
    page: p,
  }));

  function push(updates: Record<string, string | null>) {
    const params = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(updates)) {
      if (v === null || v === "") {
        params.delete(k);
      } else {
        params.set(k, v);
      }
    }
    params.set("page", "1");
    // replace (not push) so each keystroke-search doesn't pollute history
    startTransition(() => {
      router.replace(`/contacts?${params.toString()}`, { scroll: false });
    });
  }

  function changePage(p: number) {
    const params = new URLSearchParams(sp.toString());
    params.set("page", String(p));
    router.push(`/contacts?${params.toString()}`);
  }

  function handleArchive(email: string, name: string) {
    startTransition(async () => {
      const result = await archiveContact(email, name);
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      toast.success(`${name} archived.`);
      router.refresh();
    });
  }

  function handleUnarchive(email: string, name: string) {
    startTransition(async () => {
      const result = await unarchiveContact(email);
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      toast.success(`${name} restored to contacts.`);
      // Navigate back to All contacts tab
      router.push("/contacts");
    });
  }

  function handleDelete(email: string, name: string) {
    startTransition(async () => {
      const result = await deleteContact(email);
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      toast.success(`${name} removed from contacts.`);
      router.refresh();
    });
  }

  function openNote(contact: Contact) {
    setNoteTarget(contact);
    setNoteDraft(contact.notes ?? "");
  }

  async function saveNote() {
    if (!noteTarget) {
      return;
    }
    setNoteSaving(true);
    await upsertContactNote(noteTarget.email, noteTarget.name, noteDraft);
    setNoteSaving(false);
    setNoteTarget(null);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {/* Toolbar: search */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex items-center max-w-xs w-full">
          {isPending ? (
            <Spinner
              className="pointer-events-none absolute left-2.5 animate-spin text-primary"
              size={14}
            />
          ) : (
            <MagnifyingGlass
              className="pointer-events-none absolute left-2.5 text-muted-foreground"
              size={14}
            />
          )}
          <Input
            className="pl-8"
            defaultValue={search}
            onChange={(e) => {
              const val = e.target.value;
              if (searchDebounce.current) {
                clearTimeout(searchDebounce.current);
              }
              searchDebounce.current = setTimeout(
                () => push({ q: val || null }),
                350
              );
            }}
            placeholder="Search by name or email…"
          />
        </div>
      </div>
      {/* Filter chips */}
      <div className="flex flex-wrap items-center gap-1.5">
        {(
          [
            {
              key: "all",
              label: "All contacts",
              active: !archived && filter === "all",
            },
            {
              key: "upcoming",
              label: "Upcoming meetings",
              active: !archived && filter === "upcoming",
            },
            {
              key: "new",
              label: "New contacts",
              active: !archived && filter === "new",
            },
            { key: "archived", label: "Archived", active: archived },
          ] as const
        ).map(({ key, label, active }) => (
          <button
            className={cn(
              "inline-flex items-center gap-1.5 border px-3 py-1.5 text-sm font-medium transition-colors",
              active
                ? "border-primary bg-primary text-primary-content"
                : "border-base-300 bg-base-100 text-muted-foreground hover:border-primary/40 hover:text-base-content"
            )}
            key={key}
            onClick={() =>
              key === "archived"
                ? push({ archived: "1", filter: null })
                : push({ archived: null, filter: key === "all" ? null : key })
            }
            type="button"
          >
            {label}
          </button>
        ))}
      </div>
      {/* True empty state — no contacts at all, no active filters */}
      {total === 0 && !search && !archived && filter === "all" ? (
        <div className="flex flex-col items-center justify-center border border-base-300 bg-base-100 py-20 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center bg-primary/10 text-primary">
            <Users size={28} weight="duotone" />
          </div>
          <p className="text-base font-semibold text-base-content">
            No contacts yet
          </p>
          <p className="mt-1.5 max-w-xs text-sm text-muted-foreground">
            Contacts appear here automatically when someone books a meeting with
            you.
          </p>
        </div>
      ) : (
        /* Table */
        <div className="overflow-x-auto border border-base-300">
          <Table className="w-full min-w-[640px] table-fixed">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[16%]">Name</TableHead>
                <TableHead className="w-[20%]">Email</TableHead>
                <TableHead className="hidden sm:table-cell w-[8%]">
                  Bookings
                </TableHead>
                <TableHead className="hidden md:table-cell w-[14%]">
                  Last meeting
                </TableHead>
                <TableHead className="hidden md:table-cell w-[14%]">
                  Next meeting
                </TableHead>
                <TableHead className="hidden xl:table-cell w-[16%]">
                  Notes
                </TableHead>
                <TableHead className="w-[12%] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contacts.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell
                    className="py-12 text-center text-sm text-muted-foreground"
                    colSpan={7}
                  >
                    {search
                      ? "No contacts match your search."
                      : archived
                        ? "No archived contacts."
                        : filter === "upcoming"
                          ? "No contacts with upcoming meetings."
                          : filter === "new"
                            ? "No new contacts in the last 30 days."
                            : "No contacts yet."}
                  </TableCell>
                </TableRow>
              ) : (
                contacts.map((c) => (
                  <TableRow
                    className="transition-colors duration-150 hover:bg-primary/[0.02]"
                    key={c.email}
                  >
                    <TableCell className="font-medium truncate">
                      {c.name}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm truncate">
                      <TooltipProvider delayDuration={300}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="block truncate cursor-default">
                              {c.email}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent className="text-xs" side="top">
                            {c.email}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      {c.booking_count}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">
                      {fmtDate(c.last_meeting_at)}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">
                      {fmtDate(c.next_meeting_at)}
                    </TableCell>
                    <TableCell className="hidden xl:table-cell max-w-[200px]">
                      {c.notes ? (
                        <TooltipProvider delayDuration={300}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="block truncate text-sm text-muted-foreground cursor-default">
                                {c.notes}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent
                              className="max-w-xs whitespace-pre-wrap break-words text-xs"
                              side="top"
                            >
                              {c.notes}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ) : (
                        <span className="text-xs text-muted-foreground/40">
                          —
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          aria-label="Edit note"
                          disabled={isPending}
                          onClick={() => openNote(c)}
                          size="icon-sm"
                          title="Edit note"
                          variant="ghost"
                        >
                          <Note size={15} />
                        </Button>
                        {c.is_archived ? (
                          <Button
                            aria-label="Restore"
                            disabled={isPending}
                            onClick={() => handleUnarchive(c.email, c.name)}
                            size="icon-sm"
                            title="Restore"
                            variant="ghost"
                          >
                            <ArrowCounterClockwise size={15} />
                          </Button>
                        ) : (
                          <Button
                            aria-label="Archive"
                            disabled={isPending}
                            onClick={() => handleArchive(c.email, c.name)}
                            size="icon-sm"
                            title="Archive"
                            variant="ghost"
                          >
                            <Archive size={15} />
                          </Button>
                        )}
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              aria-label="Delete"
                              className="text-error hover:text-error"
                              disabled={isPending}
                              size="icon-sm"
                              title="Delete"
                              variant="ghost"
                            >
                              <Trash size={15} />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                Remove {c.name}?
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                {c.email} will be removed from your contacts.
                                They&apos;ll reappear if they book again.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(c.email, c.name)}
                                variant="destructive"
                              >
                                Remove
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}{" "}
      {/* end table vs empty-state */}
      {/* Pagination — always show count; page numbers when more than one page */}
      {total > 0 && (
        <div className="flex items-center justify-between gap-3 border-t border-base-300 px-6 py-3">
          <p className="text-xs text-muted-foreground">
            {totalPages > 1 ? (
              <>
                Showing{" "}
                <strong className="font-semibold text-base-content">
                  {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)}
                </strong>{" "}
                of{" "}
                <strong className="font-semibold text-base-content">
                  {total}
                </strong>
              </>
            ) : (
              <>
                <strong className="font-semibold text-base-content">
                  {total}
                </strong>{" "}
                contact{total === 1 ? "" : "s"}
              </>
            )}
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
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      if (page > 1) {
                        changePage(page - 1);
                      }
                    }}
                  />
                </PaginationItem>
                {paginationItems.map(({ key, page: p }) =>
                  p === "ellipsis" ? (
                    <PaginationItem key={key}>
                      <PaginationEllipsis />
                    </PaginationItem>
                  ) : (
                    <PaginationItem key={key}>
                      <PaginationLink
                        href="#"
                        isActive={p === page}
                        onClick={(e) => {
                          e.preventDefault();
                          changePage(p);
                        }}
                      >
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
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      if (page < totalPages) {
                        changePage(page + 1);
                      }
                    }}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </div>
      )}
      {/* Notes dialog */}
      <Dialog
        onOpenChange={(open) => {
          if (!open) {
            setNoteTarget(null);
          }
        }}
        open={!!noteTarget}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogTitle>Note for {noteTarget?.name}</DialogTitle>
          <DialogDescription className="sr-only">
            Add or edit a private note for this contact.
          </DialogDescription>
          <Textarea
            className="resize-none"
            onChange={(e) => setNoteDraft(e.target.value)}
            placeholder="Add a private note…"
            rows={4}
            value={noteDraft}
          />
          <div className="flex justify-end gap-2">
            <Button
              onClick={() => setNoteTarget(null)}
              size="sm"
              variant="outline"
            >
              Cancel
            </Button>
            <Button disabled={noteSaving} onClick={saveNote} size="sm">
              {noteSaving ? "Saving…" : "Save note"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
