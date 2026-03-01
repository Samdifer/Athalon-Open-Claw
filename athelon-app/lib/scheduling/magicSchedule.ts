// lib/scheduling/magicSchedule.ts
// Magic Scheduler helper.
//
// Schedules selected work orders in an explicit user-defined priority order.

export type MagicJobInput = {
  woId: string;
  estimatedDurationDays: number;
};

export type MagicBayInput = {
  bayId: string;
  bookings: { startDate: number; endDate: number }[];
};

export type MagicAssignment = {
  woId: string;
  bayId: string;
  startDate: number;
  endDate: number;
};

const DAY_MS = 24 * 60 * 60 * 1000;

export function magicSchedule(
  orderedJobs: MagicJobInput[],
  bays: MagicBayInput[],
): MagicAssignment[] {
  if (orderedJobs.length === 0 || bays.length === 0) return [];

  const bayBookings = new Map<string, { startDate: number; endDate: number }[]>();
  for (const bay of bays) {
    bayBookings.set(
      bay.bayId,
      [...bay.bookings].sort((a, b) => a.startDate - b.startDate),
    );
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayMs = today.getTime();

  const out: MagicAssignment[] = [];

  for (const job of orderedJobs) {
    const durationMs = Math.max(1, job.estimatedDurationDays) * DAY_MS;
    let selectedBayId: string | null = null;
    let selectedStart = Infinity;

    for (const bay of bays) {
      const bookings = bayBookings.get(bay.bayId) ?? [];
      let candidateStart = todayMs;

      for (const booking of bookings) {
        if (candidateStart + durationMs <= booking.startDate) break;
        if (candidateStart < booking.endDate) candidateStart = booking.endDate;
      }

      if (candidateStart < selectedStart) {
        selectedStart = candidateStart;
        selectedBayId = bay.bayId;
      }
    }

    if (!selectedBayId || selectedStart === Infinity) continue;

    const endDate = selectedStart + durationMs;
    out.push({
      woId: job.woId,
      bayId: selectedBayId,
      startDate: selectedStart,
      endDate,
    });

    const nextBookings = bayBookings.get(selectedBayId) ?? [];
    nextBookings.push({ startDate: selectedStart, endDate });
    nextBookings.sort((a, b) => a.startDate - b.startDate);
    bayBookings.set(selectedBayId, nextBookings);
  }

  return out;
}

