"use client";

import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ArrowsDownUp,
  CaretDown,
  Check,
  FunnelSimple,
  Globe,
  GoogleLogo,
  List as ListIcon,
  MagnifyingGlass,
  MapPin,
  Phone,
  SquaresFour,
  ToggleLeft,
  ToggleRight,
  Trash,
  VideoCamera,
  X,
} from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  bulkDeleteEventTypes,
  bulkToggleEventTypes,
  reorderEventTypes,
} from "@/app/actions/event-types";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { EventTypeCard, type EventTypeStats } from "./event-type-card";

// ── Types ──────────────────────────────────────────────────────────────────────

interface EventType {
  color?: string | null;
  durations: { duration: number; isDefault: boolean }[];
  id: string;
  isActive: boolean;
  isHidden: boolean;
  locationType: string;
  meetingType?: string | null;
  name: string;
  slug: string;
  updatedAt?: Date | string | null;
}

interface EventTypeListProps {
  eventTypes: EventType[];
  googleMeetConnected: boolean;
  statsMap: Map<string, EventTypeStats>;
  username: string | null;
  zoomConnected: boolean;
}

interface SortableItemProps {
  et: EventType;
  googleMeetConnected: boolean;
  isSelected: boolean;
  onSelect: (id: string, selected: boolean) => void;
  stats?: EventTypeStats;
  username: string | null;
  zoomConnected: boolean;
}

// ── Filter / Sort constants ────────────────────────────────────────────────────

const STATUS_FILTERS = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
] as const;

type StatusFilter = (typeof STATUS_FILTERS)[number]["value"];
type LocationFilter =
  | "all"
  | "google_meet"
  | "zoom"
  | "in_person"
  | "phone"
  | "custom";
type SortOption = "custom" | "az" | "za" | "most_booked";

type PhosphorIcon = typeof GoogleLogo;

const LOCATION_FILTERS: {
  value: LocationFilter;
  label: string;
  icon: PhosphorIcon | null;
}[] = [
  { value: "all", label: "All", icon: null },
  { value: "google_meet", label: "Google Meet", icon: GoogleLogo },
  { value: "zoom", label: "Zoom", icon: VideoCamera },
  { value: "in_person", label: "In-person", icon: MapPin },
  { value: "phone", label: "Phone", icon: Phone },
  { value: "custom", label: "Custom", icon: Globe },
];

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "custom", label: "Custom order" },
  { value: "az", label: "Name A → Z" },
  { value: "za", label: "Name Z → A" },
  { value: "most_booked", label: "Most booked" },
];

function relativeDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const days = Math.floor((Date.now() - d.getTime()) / 86_400_000);
  if (days === 0) {
    return "today";
  }
  if (days === 1) {
    return "yesterday";
  }
  if (days < 7) {
    return `${days} days ago`;
  }
  if (days < 30) {
    return `${Math.floor(days / 7)}w ago`;
  }
  return `${Math.floor(days / 30)}mo ago`;
}

// ── Sortable drag item ─────────────────────────────────────────────────────────

function SortableItem({
  et,
  username,
  stats,
  isSelected,
  onSelect,
  googleMeetConnected,
  zoomConnected,
}: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: et.id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
    position: "relative",
    zIndex: isDragging ? 10 : undefined,
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="cursor-grab active:cursor-grabbing"
    >
      <EventTypeCard
        color={et.color}
        durations={et.durations}
        googleMeetConnected={googleMeetConnected}
        id={et.id}
        isActive={et.isActive}
        isHidden={et.isHidden}
        isSelected={isSelected}
        locationType={et.locationType}
        meetingType={et.meetingType ?? undefined}
        name={et.name}
        onSelect={onSelect}
        slug={et.slug}
        stats={stats}
        username={username}
        viewMode="list"
        zoomConnected={zoomConnected}
      />
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export function EventTypeList({
  eventTypes: initialEventTypes,
  username,
  statsMap,
  googleMeetConnected,
  zoomConnected,
}: EventTypeListProps) {
  const router = useRouter();
  const searchRef = useRef<HTMLInputElement>(null);

  // ── Core state ──────────────────────────────────────────────────────────────
  const [orderedTypes, setOrderedTypes] = useState(initialEventTypes);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // ── Filter state ────────────────────────────────────────────────────────────
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [locationFilter, setLocationFilter] = useState<LocationFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // ── Sort / View state ───────────────────────────────────────────────────────
  const [sortBy, setSortBy] = useState<SortOption>("custom");
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");

  useEffect(() => {
    setOrderedTypes(initialEventTypes);
  }, [initialEventTypes]);

  // Restore saved view preference
  useEffect(() => {
    const saved = localStorage.getItem("schduled:event-types:view");
    if (saved === "grid" || saved === "list") {
      setViewMode(saved);
    }
  }, []);

  // ⌘K / Ctrl+K — focus search
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  function setView(mode: "list" | "grid") {
    setViewMode(mode);
    localStorage.setItem("schduled:event-types:view", mode);
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 6 },
    })
  );

  // ── Derived data ────────────────────────────────────────────────────────────

  const isFiltered =
    statusFilter !== "all" ||
    locationFilter !== "all" ||
    searchQuery.trim() !== "";

  const filteredTypes = orderedTypes.filter((et) => {
    if (
      searchQuery.trim() &&
      !et.name.toLowerCase().includes(searchQuery.trim().toLowerCase())
    ) {
      return false;
    }
    if (statusFilter === "active" && !et.isActive) {
      return false;
    }
    if (statusFilter === "inactive" && et.isActive) {
      return false;
    }
    if (locationFilter === "phone") {
      return (
        et.locationType === "phone_host_calls" ||
        et.locationType === "phone_invitee_calls"
      );
    }
    if (locationFilter !== "all" && et.locationType !== locationFilter) {
      return false;
    }
    return true;
  });

  const displayList = [...filteredTypes].sort((a, b) => {
    if (sortBy === "az") {
      return a.name.localeCompare(b.name);
    }
    if (sortBy === "za") {
      return b.name.localeCompare(a.name);
    }
    if (sortBy === "most_booked") {
      return (
        (statsMap.get(b.id)?.countThisMonth ?? 0) -
        (statsMap.get(a.id)?.countThisMonth ?? 0)
      );
    }
    return 0;
  });

  // DnD only when: list view, custom sort, no active filters
  const useDnD = !isFiltered && sortBy === "custom" && viewMode === "list";

  const statusCounts: Record<StatusFilter, number> = {
    all: orderedTypes.length,
    active: orderedTypes.filter((et) => et.isActive).length,
    inactive: orderedTypes.filter((et) => !et.isActive).length,
  };
  const locationCount = (val: LocationFilter): number => {
    if (val === "all") {
      return orderedTypes.length;
    }
    if (val === "phone") {
      return orderedTypes.filter(
        (et) =>
          et.locationType === "phone_host_calls" ||
          et.locationType === "phone_invitee_calls"
      ).length;
    }
    return orderedTypes.filter((et) => et.locationType === val).length;
  };

  const lastUpdated =
    orderedTypes.length > 0
      ? new Date(
          Math.max(
            ...orderedTypes.map((et) =>
              et.updatedAt ? new Date(et.updatedAt).getTime() : 0
            )
          )
        )
      : null;
  const activeCount = statusCounts.active;

  // ── Handlers ────────────────────────────────────────────────────────────────

  function applyStatusFilter(f: StatusFilter) {
    setStatusFilter(f);
    setSelectedIds(new Set());
  }
  function applyLocationFilter(f: LocationFilter) {
    setLocationFilter(f);
    setSelectedIds(new Set());
  }
  function clearFilters() {
    setStatusFilter("all");
    setLocationFilter("all");
    setSearchQuery("");
    setSelectedIds(new Set());
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string);
  }
  function handleDragCancel() {
    setActiveId(null);
  }
  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) {
      return;
    }
    const oldIndex = orderedTypes.findIndex((et) => et.id === active.id);
    const newIndex = orderedTypes.findIndex((et) => et.id === over.id);
    const next = arrayMove(orderedTypes, oldIndex, newIndex);
    setOrderedTypes(next);
    startTransition(async () => {
      const res = await reorderEventTypes(next.map((et) => et.id));
      if ("error" in res) {
        toast.error(res.error);
        setOrderedTypes(orderedTypes);
      }
    });
  }

  function handleSelect(id: string, selected: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (selected) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  }
  function clearSelection() {
    setSelectedIds(new Set());
  }

  function handleBulkDelete() {
    startTransition(async () => {
      const res = await bulkDeleteEventTypes(Array.from(selectedIds));
      if ("error" in res) {
        toast.error(res.error);
      } else {
        toast.success(
          `${selectedIds.size} meeting type${selectedIds.size > 1 ? "s" : ""} deleted`
        );
        setSelectedIds(new Set());
        router.refresh();
      }
    });
  }
  function handleBulkToggle(isActive: boolean) {
    startTransition(async () => {
      const res = await bulkToggleEventTypes(Array.from(selectedIds), isActive);
      if ("error" in res) {
        toast.error(res.error);
      } else {
        toast.success(
          `${selectedIds.size} meeting type${selectedIds.size > 1 ? "s" : ""} turned ${isActive ? "on" : "off"}`
        );
        setSelectedIds(new Set());
        router.refresh();
      }
    });
  }

  const selCount = selectedIds.size;
  const activeType = orderedTypes.find((et) => et.id === activeId);
  const selectedTypes = orderedTypes.filter((et) => selectedIds.has(et.id));
  const allOn =
    selectedTypes.length > 0 && selectedTypes.every((et) => et.isActive);
  const allOff =
    selectedTypes.length > 0 && selectedTypes.every((et) => !et.isActive);

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <>
      {/* ── Stats summary ─────────────────────────────────────────────────── */}
      <div className="mb-5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
        <span className="text-muted-foreground">
          <span className="font-semibold text-base-content">
            {orderedTypes.length}
          </span>{" "}
          meeting {orderedTypes.length === 1 ? "type" : "types"}
        </span>
        <span className="h-3.5 w-px bg-base-300" />
        <span className="text-muted-foreground">
          <span className="font-semibold text-primary">{activeCount}</span>{" "}
          active
        </span>
        {lastUpdated && lastUpdated.getTime() > 0 && (
          <>
            <span className="h-3.5 w-px bg-base-300" />
            <span className="text-muted-foreground">
              Updated {relativeDate(lastUpdated)}
            </span>
          </>
        )}
      </div>

      {/* ── Search bar ────────────────────────────────────────────────────── */}
      <div className="mb-3 flex items-center gap-3 border border-base-300 bg-base-100 px-4 py-3 transition-all duration-150 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary">
        <MagnifyingGlass
          className="shrink-0 text-muted-foreground"
          size={17}
          weight="regular"
        />
        <input
          className="flex-1 bg-transparent text-sm text-base-content placeholder:text-muted-foreground/50 outline-none"
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search meeting types..."
          ref={searchRef}
          type="text"
          value={searchQuery}
        />
        {searchQuery ? (
          <button
            aria-label="Clear search"
            className="shrink-0 text-muted-foreground transition-colors hover:text-base-content"
            onClick={() => setSearchQuery("")}
            type="button"
          >
            <X size={15} weight="bold" />
          </button>
        ) : (
          <kbd className="hidden select-none items-center gap-0.5 border border-base-300 bg-base-200 px-1.5 py-0.5 font-mono text-xs text-muted-foreground sm:inline-flex">
            ⌘K
          </kbd>
        )}
      </div>

      {/* ── Filter chips + controls ────────────────────────────────────────── */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {/* Status chips */}
        {STATUS_FILTERS.map((f) => {
          const active = statusFilter === f.value;
          return (
            <button
              className={cn(
                "inline-flex items-center gap-2 border px-3 py-1.5 text-xs font-semibold transition-colors duration-150",
                active
                  ? "border-primary bg-primary text-primary-content"
                  : "border-base-300 text-muted-foreground hover:border-primary/50 hover:text-base-content"
              )}
              key={f.value}
              onClick={() => applyStatusFilter(f.value)}
              type="button"
            >
              {f.label}
              <span
                className={cn(
                  "font-mono tabular-nums",
                  active ? "opacity-60" : "opacity-40"
                )}
              >
                {statusCounts[f.value]}
              </span>
            </button>
          );
        })}

        <div className="mx-0.5 h-4 w-px bg-base-300" />

        {/* Location chips */}
        {LOCATION_FILTERS.map((f) => {
          const Icon = f.icon;
          const active = locationFilter === f.value;
          const ct = locationCount(f.value);
          return (
            <button
              className={cn(
                "inline-flex items-center gap-1.5 border px-3 py-1.5 text-xs font-semibold transition-colors duration-150",
                active
                  ? "border-primary bg-primary text-primary-content"
                  : "border-base-300 text-muted-foreground hover:border-primary/50 hover:text-base-content"
              )}
              key={f.value}
              onClick={() => applyLocationFilter(f.value)}
              type="button"
            >
              {Icon && <Icon size={11} weight={active ? "fill" : "regular"} />}
              {f.label}
              <span
                className={cn(
                  "font-mono tabular-nums",
                  active ? "opacity-60" : "opacity-40"
                )}
              >
                {ct}
              </span>
            </button>
          );
        })}

        {/* Right-aligned controls */}
        <div className="flex-1" />

        {/* Sort dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="inline-flex items-center gap-1.5 border border-base-300 px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-colors duration-150 hover:border-primary/50 hover:text-base-content"
              type="button"
            >
              <ArrowsDownUp size={13} />
              {SORT_OPTIONS.find((s) => s.value === sortBy)?.label}
              <CaretDown size={11} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            {SORT_OPTIONS.map((opt) => (
              <DropdownMenuItem
                className={cn(
                  "flex items-center justify-between",
                  sortBy === opt.value && "text-primary"
                )}
                key={opt.value}
                onClick={() => setSortBy(opt.value)}
              >
                {opt.label}
                {sortBy === opt.value && (
                  <Check className="text-primary" size={13} weight="bold" />
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* View toggle */}
        <div className="flex">
          <button
            className={cn(
              "flex h-8 w-8 items-center justify-center border transition-colors duration-150",
              viewMode === "list"
                ? "border-primary bg-primary text-primary-content"
                : "border-base-300 text-muted-foreground hover:text-base-content"
            )}
            onClick={() => setView("list")}
            title="List view"
            type="button"
          >
            <ListIcon size={14} />
          </button>
          <button
            className={cn(
              "flex h-8 w-8 items-center justify-center border border-l-0 transition-colors duration-150",
              viewMode === "grid"
                ? "border-primary bg-primary text-primary-content"
                : "border-base-300 text-muted-foreground hover:text-base-content"
            )}
            onClick={() => setView("grid")}
            title="Grid view"
            type="button"
          >
            <SquaresFour size={14} />
          </button>
        </div>

        {/* Clear filters */}
        {isFiltered && (
          <button
            className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-base-content"
            onClick={clearFilters}
            type="button"
          >
            <X size={12} weight="bold" /> Clear
          </button>
        )}
      </div>

      {/* Results count */}
      {isFiltered && (
        <p className="mb-3 text-xs text-muted-foreground">
          Showing{" "}
          <span className="font-semibold text-base-content">
            {filteredTypes.length}
          </span>{" "}
          of {orderedTypes.length} meeting types
        </p>
      )}

      {/* ── Card list / grid ───────────────────────────────────────────────── */}
      {useDnD ? (
        <DndContext
          collisionDetection={closestCenter}
          id="event-type-list"
          modifiers={[restrictToVerticalAxis]}
          onDragCancel={handleDragCancel}
          onDragEnd={handleDragEnd}
          onDragStart={handleDragStart}
          sensors={sensors}
        >
          <SortableContext
            items={orderedTypes.map((et) => et.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2">
              {orderedTypes.map((et) => (
                <SortableItem
                  et={et}
                  googleMeetConnected={googleMeetConnected}
                  isSelected={selectedIds.has(et.id)}
                  key={et.id}
                  onSelect={handleSelect}
                  stats={statsMap.get(et.id)}
                  username={username}
                  zoomConnected={zoomConnected}
                />
              ))}
            </div>
          </SortableContext>

          <DragOverlay dropAnimation={null}>
            {activeType && (
              <div
                className="ring-1 ring-foreground/10"
                style={{ opacity: 0.95 }}
              >
                <EventTypeCard
                  color={activeType.color}
                  durations={activeType.durations}
                  googleMeetConnected={googleMeetConnected}
                  id={activeType.id}
                  isActive={activeType.isActive}
                  isHidden={activeType.isHidden}
                  isSelected={false}
                  locationType={activeType.locationType}
                  meetingType={activeType.meetingType ?? undefined}
                  name={activeType.name}
                  onSelect={() => {}}
                  slug={activeType.slug}
                  stats={statsMap.get(activeType.id)}
                  username={username}
                  viewMode="list"
                  zoomConnected={zoomConnected}
                />
              </div>
            )}
          </DragOverlay>
        </DndContext>
      ) : displayList.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <FunnelSimple
            className="mb-3 text-muted-foreground/40"
            size={32}
            weight="light"
          />
          <p className="text-sm text-muted-foreground">
            No meeting types match the current filters.
          </p>
          <button
            className="mt-3 text-sm font-medium text-primary underline-offset-2 hover:underline"
            onClick={clearFilters}
            type="button"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div
          className={cn(
            viewMode === "grid"
              ? "grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3"
              : "space-y-2"
          )}
        >
          {displayList.map((et) => (
            <EventTypeCard
              color={et.color}
              durations={et.durations}
              googleMeetConnected={googleMeetConnected}
              id={et.id}
              isActive={et.isActive}
              isHidden={et.isHidden}
              isSelected={selectedIds.has(et.id)}
              key={et.id}
              locationType={et.locationType}
              meetingType={et.meetingType ?? undefined}
              name={et.name}
              onSelect={handleSelect}
              slug={et.slug}
              stats={statsMap.get(et.id)}
              username={username}
              viewMode={viewMode}
              zoomConnected={zoomConnected}
            />
          ))}
        </div>
      )}

      {/* ── Bottom bulk action bar ─────────────────────────────────────────── */}
      {selCount > 0 && (
        <div className="fixed bottom-4 left-4 right-4 z-50 flex items-center gap-3 border border-base-300 bg-base-100 px-5 py-3 ring-1 ring-foreground/10 md:left-[256px]">
          <button
            aria-label="Clear selection"
            className="flex h-8 w-8 items-center justify-center text-muted-foreground transition-colors hover:text-base-content"
            onClick={clearSelection}
            type="button"
          >
            <X size={16} weight="bold" />
          </button>
          <span className="text-sm font-semibold text-base-content">
            {selCount} selected
          </span>
          <div className="flex-1" />
          {!allOn && (
            <Button
              className="gap-1.5"
              disabled={isPending}
              onClick={() => handleBulkToggle(true)}
              size="sm"
              variant="outline"
            >
              <ToggleRight size={15} weight="bold" />
              <span className="hidden sm:inline">Turn On</span>
            </Button>
          )}
          {!allOff && (
            <Button
              className="gap-1.5"
              disabled={isPending}
              onClick={() => handleBulkToggle(false)}
              size="sm"
              variant="outline"
            >
              <ToggleLeft size={15} weight="bold" />
              <span className="hidden sm:inline">Turn Off</span>
            </Button>
          )}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                className="gap-1.5"
                disabled={isPending}
                size="sm"
                variant="destructive"
              >
                <Trash size={15} weight="bold" />
                <span className="hidden sm:inline">Delete</span>
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  Delete {selCount} meeting type{selCount > 1 ? "s" : ""}?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete the selected meeting types and
                  all their associated questions. Existing bookings will not be
                  affected.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-error text-error-content hover:bg-error/90"
                  onClick={handleBulkDelete}
                >
                  Delete {selCount}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}
    </>
  );
}
