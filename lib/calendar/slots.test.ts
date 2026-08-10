import { describe, expect, it } from "vitest";
import { generateSlots } from "./slots";

// This is the core slot-computation logic every booking creation, approval,
// and reschedule re-runs under a Postgres advisory lock (see app/api/bookings/
// route.ts) — a silent regression here means double-bookings or invitees
// never seeing slots that should be open.

describe("generateSlots", () => {
  const baseArgs = {
    date: "2026-06-15", // a Monday
    timezone: "UTC",
    durationMinutes: 30,
    nowUtc: new Date("2020-01-01T00:00:00Z"), // far in the past — never trips minimumNotice
  };

  it("generates evenly-spaced slots across a single window", () => {
    const slots = generateSlots({
      ...baseArgs,
      windows: [{ startTime: "09:00", endTime: "11:00" }],
      increment: 30,
    });

    expect(slots).toHaveLength(4);
    expect(slots[0]).toEqual({
      startUtc: "2026-06-15T09:00:00.000Z",
      endUtc: "2026-06-15T09:30:00.000Z",
    });
    expect(slots.at(-1)).toEqual({
      startUtc: "2026-06-15T10:30:00.000Z",
      endUtc: "2026-06-15T11:00:00.000Z",
    });
  });

  it("allows a slot ending exactly at the window boundary, but not past it", () => {
    // 60-minute meetings, 30-minute increment, in a 90-minute window:
    // 09:00-10:00 and 09:30-10:30 both fit (10:30 == window end is allowed);
    // 10:00-11:00 does not (11:00 > window end).
    const slots = generateSlots({
      ...baseArgs,
      durationMinutes: 60,
      windows: [{ startTime: "09:00", endTime: "10:30" }],
      increment: 30,
    });

    const starts = slots.map((s) => s.startUtc);
    expect(starts).toEqual([
      "2026-06-15T09:00:00.000Z",
      "2026-06-15T09:30:00.000Z",
    ]);
  });

  it("excludes a slot that overlaps an existing booking", () => {
    const slots = generateSlots({
      ...baseArgs,
      windows: [{ startTime: "09:00", endTime: "11:00" }],
      increment: 30,
      existingBookings: [
        {
          startTime: new Date("2026-06-15T09:30:00Z"),
          endTime: new Date("2026-06-15T10:00:00Z"),
        },
      ],
    });

    const starts = slots.map((s) => s.startUtc);
    expect(starts).not.toContain("2026-06-15T09:30:00.000Z");
    expect(starts).toContain("2026-06-15T09:00:00.000Z");
    expect(starts).toContain("2026-06-15T10:00:00.000Z");
  });

  it("excludes slots inside the buffer around an existing booking", () => {
    // 15-min buffer on both sides of a 09:30-10:00 booking should also block
    // the 09:00 slot (its end + buffer touches the booking) and 10:00 slot.
    const slots = generateSlots({
      ...baseArgs,
      windows: [{ startTime: "09:00", endTime: "11:00" }],
      increment: 30,
      bufferBefore: 15,
      bufferAfter: 15,
      existingBookings: [
        {
          startTime: new Date("2026-06-15T09:30:00Z"),
          endTime: new Date("2026-06-15T10:00:00Z"),
        },
      ],
    });

    const starts = slots.map((s) => s.startUtc);
    expect(starts).not.toContain("2026-06-15T09:00:00.000Z");
    expect(starts).not.toContain("2026-06-15T09:30:00.000Z");
    expect(starts).not.toContain("2026-06-15T10:00:00.000Z");
    expect(starts).toContain("2026-06-15T10:30:00.000Z");
  });

  it("excludes slots before the minimum-notice cutoff", () => {
    const slots = generateSlots({
      ...baseArgs,
      windows: [{ startTime: "09:00", endTime: "11:00" }],
      increment: 30,
      nowUtc: new Date("2026-06-15T09:00:00Z"),
      minimumNoticeMinutes: 90, // nothing bookable before 10:30
    });

    const starts = slots.map((s) => s.startUtc);
    expect(starts).not.toContain("2026-06-15T09:00:00.000Z");
    expect(starts).not.toContain("2026-06-15T09:30:00.000Z");
    expect(starts).not.toContain("2026-06-15T10:00:00.000Z");
    expect(starts).toContain("2026-06-15T10:30:00.000Z");
  });

  it("merges duplicate slot start times across overlapping windows", () => {
    // Two windows that both cover 09:00-09:30 must not produce two identical slots.
    const slots = generateSlots({
      ...baseArgs,
      windows: [
        { startTime: "09:00", endTime: "09:30" },
        { startTime: "09:00", endTime: "09:30" },
      ],
      increment: 30,
    });

    expect(slots).toHaveLength(1);
  });

  it("returns no slots when the window is shorter than the meeting duration", () => {
    const slots = generateSlots({
      ...baseArgs,
      durationMinutes: 60,
      windows: [{ startTime: "09:00", endTime: "09:30" }],
      increment: 30,
    });

    expect(slots).toHaveLength(0);
  });

  it("respects a non-UTC host timezone when converting window boundaries", () => {
    // 09:00 in America/New_York (UTC-4 in June, DST) is 13:00 UTC.
    const slots = generateSlots({
      ...baseArgs,
      timezone: "America/New_York",
      windows: [{ startTime: "09:00", endTime: "10:00" }],
      increment: 30,
    });

    expect(slots[0].startUtc).toBe("2026-06-15T13:00:00.000Z");
  });
});
