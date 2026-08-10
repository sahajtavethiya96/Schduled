import { addMinutes } from "date-fns";
import { fromZonedTime } from "date-fns-tz";

export interface AvailabilityWindow {
  endTime: string; // "HH:mm" in host TZ
  startTime: string; // "HH:mm" in host TZ
}

export interface ExistingBooking {
  endTime: Date;
  startTime: Date;
}

export interface SlotResult {
  endUtc: string;
  startUtc: string; // ISO 8601
}

export function generateSlots({
  date,
  timezone,
  windows,
  durationMinutes,
  bufferBefore = 0,
  bufferAfter = 0,
  increment = 30,
  existingBookings = [],
  minimumNoticeMinutes = 0,
  nowUtc,
}: {
  date: string;
  timezone: string;
  windows: AvailabilityWindow[];
  durationMinutes: number;
  bufferBefore?: number;
  bufferAfter?: number;
  increment?: number;
  existingBookings?: ExistingBooking[];
  minimumNoticeMinutes?: number;
  nowUtc: Date;
}): SlotResult[] {
  const seen = new Set<string>();
  const slots: SlotResult[] = [];
  const cutoffUtc = addMinutes(nowUtc, minimumNoticeMinutes);

  for (const win of windows) {
    // DST-safe: convert each boundary separately using the host timezone
    const windowStartUtc = fromZonedTime(
      `${date}T${win.startTime}:00`,
      timezone
    );
    const windowEndUtc = fromZonedTime(`${date}T${win.endTime}:00`, timezone);

    let cursor = windowStartUtc;

    while (true) {
      const slotStart = cursor;
      const slotEnd = addMinutes(slotStart, durationMinutes);

      if (slotEnd > windowEndUtc) {
        break;
      }

      if (slotStart < cutoffUtc) {
        cursor = addMinutes(cursor, increment);
        continue;
      }

      const blockedStart =
        bufferBefore > 0 ? addMinutes(slotStart, -bufferBefore) : slotStart;
      const blockedEnd =
        bufferAfter > 0 ? addMinutes(slotEnd, bufferAfter) : slotEnd;

      const hasConflict = existingBookings.some(
        (b) => blockedStart < b.endTime && blockedEnd > b.startTime
      );

      const key = slotStart.toISOString();
      if (!hasConflict && !seen.has(key)) {
        seen.add(key);
        slots.push({ startUtc: key, endUtc: slotEnd.toISOString() });
      }

      cursor = addMinutes(cursor, increment);
    }
  }

  return slots;
}
