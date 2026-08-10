export const EVENT_COLORS = [
  "#0d9488", // teal
  "#6366f1", // indigo
  "#8b5cf6", // purple
  "#ec4899", // pink
  "#ef4444", // red
  "#f97316", // orange
  "#22c55e", // green
  "#06b6d4", // cyan
  "#3b82f6", // blue
  "#64748b", // slate
];

// Picks an unused palette color; falls back to round-robin once all are in use.
export function pickDistinctEventColor(
  usedColors: Iterable<string>,
  count: number
): string {
  const used = new Set(usedColors);
  return (
    EVENT_COLORS.find((c) => !used.has(c)) ??
    EVENT_COLORS[count % EVENT_COLORS.length]
  );
}
