// lib/scheduling/magicSchedule.ts
// Magic Scheduler — Optimization Phase 1 upgrade (FFD).
//
// Upgrade from greedy first-fit to priority-tiered First Fit Decreasing:
//   1. Group WOs by priority tier (AOG → urgent → routine → deferred)
//   2. Within each tier, sort by duration descending (largest first = tighter packing)
//   3. Score ALL compatible bays per WO: earliest_start + late_penalty + load_balance_factor
//   4. Pick best-scoring bay (not just first available)
//
// Backward compatible — same interface as Wave 3 version.

export type MagicJobInput = {
  woId: string;
  estimatedDurationDays: number;
  priority?: "aog" | "urgent" | "routine" | "deferred";
  requiredTraining?: string[];
  /** Optional due date (epoch ms) — used for late-penalty scoring */
  dueDate?: number;
  /** Optional TAT estimate in days — used as duration fallback when estimatedDurationDays is 0 */
  tatEstimateDays?: number;
};

export type MagicBayInput = {
  bayId: string;
  bookings: { startDate: number; endDate: number }[];
  /** Optional bay capabilities for matching (e.g. ["ndt", "paint", "turbine"]) */
  capabilities?: string[];
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
  /** Composite score used for bay selection (lower = better) — exposed for transparency */
  bayScore?: number;
};

const DAY_MS = 24 * 60 * 60 * 1000;

const PRIORITY_TIER: Record<string, number> = {
  aog: 0,
  urgent: 1,
  routine: 2,
  deferred: 3,
};

/**
 * FFD sort: group by priority tier, then within each tier sort by duration
 * descending (largest jobs first for tighter bin packing).
 */
function sortFFD(jobs: MagicJobInput[]): MagicJobInput[] {
  return [...jobs].sort((a, b) => {
    const tierA = PRIORITY_TIER[a.priority ?? "routine"] ?? 2;
    const tierB = PRIORITY_TIER[b.priority ?? "routine"] ?? 2;
    if (tierA !== tierB) return tierA - tierB;
    // Within same tier: largest duration first (FFD)
    return resolveJobDuration(b) - resolveJobDuration(a);
  });
}

/** Resolve effective duration for a job, using TAT estimate as fallback */
function resolveJobDuration(job: MagicJobInput): number {
  if (job.estimatedDurationDays > 0) return job.estimatedDurationDays;
  if (job.tatEstimateDays && job.tatEstimateDays > 0) return job.tatEstimateDays;
  return 1; // minimum 1 day
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
 * Find the earliest non-conflicting start date for a given duration in a bay.
 */
function findEarliestSlot(
  bookings: { startDate: number; endDate: number }[],
  todayMs: number,
  durationMs: number,
): number {
  let candidateStart = todayMs;
  for (const booking of bookings) {
    if (candidateStart + durationMs <= booking.startDate) break;
    if (candidateStart < booking.endDate) candidateStart = booking.endDate;
  }
  return candidateStart;
}

/**
 * Compute total booked days for a bay (used in load-balance scoring).
 */
function bayTotalLoad(bookings: { startDate: number; endDate: number }[]): number {
  return bookings.reduce((sum, b) => sum + (b.endDate - b.startDate) / DAY_MS, 0);
}

/**
 * Composite bay scoring function. Lower score = better bay choice.
 *
 * Score = (earliest_start_penalty * 0.40)     — prefer bays where WO can start sooner
 *       + (late_penalty * 0.35)               — penalize bays where WO would finish after due date
 *       + (load_balance_factor * 0.25)         — prefer less-loaded bays
 */
function scoreBay(
  earliestStartMs: number,
  durationMs: number,
  todayMs: number,
  totalLoadDays: number,
  maxLoadDays: number,
  dueDate?: number,
): number {
  // Normalize start delay to 0-1 range (0 = starts today, 1 = starts 90+ days out)
  const startDelayDays = Math.max(0, (earliestStartMs - todayMs) / DAY_MS);
  const startPenalty = Math.min(1, startDelayDays / 90);

  // Late penalty: 0 if finishes before due date, scales up to 1 based on how late
  let latePenalty = 0;
  if (dueDate) {
    const finishMs = earliestStartMs + durationMs;
    const daysLate = (finishMs - dueDate) / DAY_MS;
    latePenalty = daysLate > 0 ? Math.min(1, daysLate / 30) : 0;
  }

  // Load balance: ratio of this bay's load to max bay load (0 = empty, 1 = most loaded)
  const loadRatio = maxLoadDays > 0 ? totalLoadDays / maxLoadDays : 0;

  return startPenalty * 0.40 + latePenalty * 0.35 + loadRatio * 0.25;
}

/**
 * Priority-tiered First Fit Decreasing auto-scheduler.
 *
 * When autoMode is true, applies FFD scheduling:
 *   1. Group by priority tier (AOG → urgent → routine → deferred)
 *   2. Within each tier, sort by duration descending (FFD for tighter packing)
 *   3. Score ALL bays per WO using composite function
 *   4. Pick best-scoring bay
 *   5. Respect training constraints
 *   6. Respect bay capacity (no double-booking)
 *
 * When autoMode is false (default), preserves caller's ordering but still
 * uses composite bay scoring instead of simple first-fit.
 */
export function magicSchedule(
  orderedJobs: MagicJobInput[],
  bays: MagicBayInput[],
  techPool?: TechCapacity[],
  options?: { autoMode?: boolean },
): MagicAssignment[] {
  if (orderedJobs.length === 0 || bays.length === 0) return [];

  // In auto mode, apply FFD sort. Otherwise respect caller's ordering.
  const sortedJobs = options?.autoMode ? sortFFD(orderedJobs) : orderedJobs;

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
    // Resolve base duration with TAT fallback
    const baseDays = resolveJobDuration(job);

    // Apply efficiency multiplier to duration
    const durationDays = techPool
      ? effectiveDuration(baseDays, techPool)
      : baseDays;
    const durationMs = durationDays * DAY_MS;

    // Validate training constraints
    const trainingWarnings = techPool
      ? validateTraining(job.requiredTraining, techPool)
      : [];

    // Compute max load across all bays (for load-balance normalization)
    let maxLoadDays = 0;
    for (const bay of bays) {
      const load = bayTotalLoad(bayBookings.get(bay.bayId) ?? []);
      if (load > maxLoadDays) maxLoadDays = load;
    }

    // Score ALL bays and pick the best one
    let selectedBayId: string | null = null;
    let selectedStart = Infinity;
    let bestScore = Infinity;

    for (const bay of bays) {
      const bookings = bayBookings.get(bay.bayId) ?? [];
      const earliestStart = findEarliestSlot(bookings, todayMs, durationMs);
      const loadDays = bayTotalLoad(bookings);

      // Training affinity bonus: if bay scheduling requires qualified techs,
      // add a penalty if no qualified techs exist
      let trainingPenalty = 0;
      if (options?.autoMode && techPool && job.requiredTraining && job.requiredTraining.length > 0) {
        const hasQualified = techPool.some((t) =>
          job.requiredTraining!.every((req) => t.training.includes(req)),
        );
        if (!hasQualified) trainingPenalty = 0.5;
      }

      const score =
        scoreBay(earliestStart, durationMs, todayMs, loadDays, maxLoadDays, job.dueDate) +
        trainingPenalty;

      if (score < bestScore) {
        bestScore = score;
        selectedBayId = bay.bayId;
        selectedStart = earliestStart;
      }
    }

    if (!selectedBayId || selectedStart === Infinity) continue;

    const endDate = selectedStart + durationMs;
    const assignment: MagicAssignment = {
      woId: job.woId,
      bayId: selectedBayId,
      startDate: selectedStart,
      endDate,
      bayScore: Math.round(bestScore * 1000) / 1000,
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
