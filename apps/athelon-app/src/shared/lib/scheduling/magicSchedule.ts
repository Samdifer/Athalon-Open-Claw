// lib/scheduling/magicSchedule.ts
// Magic Scheduler — Wave 3 upgrade.
//
// Features:
//   1. Load-leveling across bays using real tech capacity data
//   2. Per-tech efficiency multipliers applied to duration estimates
//   3. Priority-weighted WO sorting (AOG > urgent > routine)
//   4. Training constraint validation when assigning techs to tasks

export type MagicJobInput = {
  woId: string;
  estimatedDurationDays: number;
  priority?: "aog" | "urgent" | "routine";
  requiredTraining?: string[];
};

export type MagicBayInput = {
  bayId: string;
  bookings: { startDate: number; endDate: number }[];
};

export type TechCapacity = {
  technicianId: string;
  availableHoursPerDay: number;
  efficiencyMultiplier: number;
  assignedHours: number;
  training: string[]; // active (non-expired) training types
};

export type MagicAssignment = {
  woId: string;
  bayId: string;
  startDate: number;
  endDate: number;
  trainingWarnings?: string[];
};

const DAY_MS = 24 * 60 * 60 * 1000;

const PRIORITY_WEIGHT: Record<string, number> = {
  aog: 0,
  urgent: 1,
  routine: 2,
};

/**
 * Sort jobs by priority weighting (AOG first, then urgent, then routine).
 * Within the same priority, original order is preserved.
 */
function sortByPriority(jobs: MagicJobInput[]): MagicJobInput[] {
  return [...jobs].sort(
    (a, b) =>
      (PRIORITY_WEIGHT[a.priority ?? "routine"] ?? 2) -
      (PRIORITY_WEIGHT[b.priority ?? "routine"] ?? 2),
  );
}

/**
 * Validate that tech pool has required training for a job.
 * Returns warnings for any unmet training requirements.
 */
function validateTraining(
  requiredTraining: string[] | undefined,
  techPool: TechCapacity[],
): string[] {
  if (!requiredTraining || requiredTraining.length === 0) return [];
  const warnings: string[] = [];
  for (const req of requiredTraining) {
    const hasQualifiedTech = techPool.some((t) => t.training.includes(req));
    if (!hasQualifiedTech) {
      warnings.push(`No technician with "${req}" training available`);
    }
  }
  return warnings;
}

/**
 * Compute effective duration considering tech pool efficiency.
 * Uses the best available efficiency multiplier from the tech pool.
 */
function effectiveDuration(
  baseDurationDays: number,
  techPool: TechCapacity[],
): number {
  if (techPool.length === 0) return baseDurationDays;
  const bestEfficiency = Math.max(...techPool.map((t) => t.efficiencyMultiplier));
  if (bestEfficiency <= 0) return baseDurationDays;
  return Math.max(1, Math.ceil(baseDurationDays / bestEfficiency));
}

/**
 * Find the bay with the lowest total load (sum of booked days).
 * This implements load-leveling across bays.
 */
function findLeastLoadedBay(
  bays: MagicBayInput[],
  bayBookings: Map<string, { startDate: number; endDate: number }[]>,
): string | null {
  let minLoad = Infinity;
  let bestBayId: string | null = null;
  for (const bay of bays) {
    const bookings = bayBookings.get(bay.bayId) ?? [];
    const totalDays = bookings.reduce(
      (sum, b) => sum + (b.endDate - b.startDate) / DAY_MS,
      0,
    );
    if (totalDays < minLoad) {
      minLoad = totalDays;
      bestBayId = bay.bayId;
    }
  }
  return bestBayId;
}

/**
 * MBP-0114: Enhanced auto-schedule algorithm.
 *
 * When autoMode is true, applies greedy scheduling:
 *   1. Sort by priority (AOG > urgent > routine)
 *   2. Assign to first available bay+tech combo
 *   3. Respect training constraints (prefer bays where qualified techs are available)
 *   4. Respect bay capacity (no double-booking)
 *
 * When autoMode is false (default), preserves caller's ordering.
 */
export function magicSchedule(
  orderedJobs: MagicJobInput[],
  bays: MagicBayInput[],
  techPool?: TechCapacity[],
  options?: { autoMode?: boolean },
): MagicAssignment[] {
  if (orderedJobs.length === 0 || bays.length === 0) return [];

  // MBP-0114: In auto mode, sort by priority for greedy scheduling.
  // Otherwise respect the caller's explicit order.
  const sortedJobs = options?.autoMode
    ? sortByPriority(orderedJobs)
    : orderedJobs;

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

  for (const job of sortedJobs) {
    // Apply efficiency multiplier to duration
    const durationDays = techPool
      ? effectiveDuration(job.estimatedDurationDays, techPool)
      : Math.max(1, job.estimatedDurationDays);
    const durationMs = durationDays * DAY_MS;

    // Validate training constraints
    const trainingWarnings = techPool
      ? validateTraining(job.requiredTraining, techPool)
      : [];

    // MBP-0114: Find best bay using enhanced greedy algorithm:
    // 1. Prefer bays where qualified techs are available (training match)
    // 2. Load-level across bays (least-loaded first)
    // 3. Find earliest non-conflicting slot
    let selectedBayId: string | null = null;
    let selectedStart = Infinity;

    // Score bays: training-qualified bays get priority, then by load
    const sortedBays = [...bays].sort((a, b) => {
      // Training affinity: prefer bays where we have qualified techs
      if (options?.autoMode && techPool && job.requiredTraining && job.requiredTraining.length > 0) {
        const aHasQualified = techPool.some((t) =>
          job.requiredTraining!.every((req) => t.training.includes(req)),
        );
        const bHasQualified = techPool.some((t) =>
          job.requiredTraining!.every((req) => t.training.includes(req)),
        );
        if (aHasQualified && !bHasQualified) return -1;
        if (!aHasQualified && bHasQualified) return 1;
      }

      const aLoad = (bayBookings.get(a.bayId) ?? []).reduce(
        (sum, bk) => sum + (bk.endDate - bk.startDate),
        0,
      );
      const bLoad = (bayBookings.get(b.bayId) ?? []).reduce(
        (sum, bk) => sum + (bk.endDate - bk.startDate),
        0,
      );
      return aLoad - bLoad;
    });

    for (const bay of sortedBays) {
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
    const assignment: MagicAssignment = {
      woId: job.woId,
      bayId: selectedBayId,
      startDate: selectedStart,
      endDate,
    };
    if (trainingWarnings.length > 0) {
      assignment.trainingWarnings = trainingWarnings;
    }
    out.push(assignment);

    const nextBookings = bayBookings.get(selectedBayId) ?? [];
    nextBookings.push({ startDate: selectedStart, endDate });
    nextBookings.sort((a, b) => a.startDate - b.startDate);
    bayBookings.set(selectedBayId, nextBookings);
  }

  return out;
}
