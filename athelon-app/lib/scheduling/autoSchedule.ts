// lib/scheduling/autoSchedule.ts
// Auto-Schedule Algorithm — Phase 7
//
// Simple priority-based greedy scheduler:
//   1. Sort WOs by priority (AOG first, then by promised delivery date)
//   2. For each WO, find first available bay slot that fits estimated duration
//   3. Assign bay + start date

export type UnscheduledWO = {
  woId: string;
  priority: "aog" | "urgent" | "routine";
  promisedDeliveryDate?: number;
  estimatedDurationDays: number;
};

export type AvailableBay = {
  bayId: string;
  name: string;
  // Existing bookings (sorted by startDate)
  bookings: { startDate: number; endDate: number }[];
};

export type ScheduleAssignment = {
  woId: string;
  bayId: string;
  startDate: number;
  endDate: number;
};

const DAY_MS = 24 * 60 * 60 * 1000;

const PRIORITY_ORDER: Record<string, number> = {
  aog: 0,
  urgent: 1,
  routine: 2,
};

/**
 * Auto-schedule unscheduled work orders into available bays.
 */
export function autoSchedule(
  unscheduledWOs: UnscheduledWO[],
  bays: AvailableBay[],
): ScheduleAssignment[] {
  if (bays.length === 0) return [];

  // Sort WOs: AOG first, then by promised delivery (earliest first), then by priority
  const sorted = [...unscheduledWOs].sort((a, b) => {
    const pa = PRIORITY_ORDER[a.priority] ?? 2;
    const pb = PRIORITY_ORDER[b.priority] ?? 2;
    if (pa !== pb) return pa - pb;
    const da = a.promisedDeliveryDate ?? Infinity;
    const db = b.promisedDeliveryDate ?? Infinity;
    return da - db;
  });

  const assignments: ScheduleAssignment[] = [];

  // Track bay bookings (mutable copy)
  const bayBookings = new Map<string, { startDate: number; endDate: number }[]>();
  for (const bay of bays) {
    bayBookings.set(bay.bayId, [...bay.bookings].sort((a, b) => a.startDate - b.startDate));
  }

  // Start scheduling from today at midnight
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayMs = today.getTime();

  for (const wo of sorted) {
    const durationMs = wo.estimatedDurationDays * DAY_MS;
    let bestBayId: string | null = null;
    let bestStart = Infinity;

    // For each bay, find the earliest slot that fits
    for (const bay of bays) {
      const bookings = bayBookings.get(bay.bayId) ?? [];
      let candidateStart = todayMs;

      for (const booking of bookings) {
        if (candidateStart + durationMs <= booking.startDate) {
          // Fits before this booking
          break;
        }
        // Push past this booking
        if (candidateStart < booking.endDate) {
          candidateStart = booking.endDate;
        }
      }

      if (candidateStart < bestStart) {
        bestStart = candidateStart;
        bestBayId = bay.bayId;
      }
    }

    if (bestBayId !== null) {
      const endDate = bestStart + durationMs;
      assignments.push({
        woId: wo.woId,
        bayId: bestBayId,
        startDate: bestStart,
        endDate,
      });

      // Update bay bookings
      const bookings = bayBookings.get(bestBayId) ?? [];
      bookings.push({ startDate: bestStart, endDate });
      bookings.sort((a, b) => a.startDate - b.startDate);
      bayBookings.set(bestBayId, bookings);
    }
  }

  return assignments;
}
