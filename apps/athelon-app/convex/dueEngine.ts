import { query } from "./_generated/server";
import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";

const DAY_MS = 86_400_000;

/**
 * C1 baseline contract for deterministic due recompute.
 *
 * Invariant:
 * - days/hours/cycles recurrence values are additive offsets from the
 *   latest compliance baseline.
 * - this helper is pure and has no side-effects, so replayed history always
 *   yields the same snapshot.
 */
export type DueRecurrencePolicy = {
  adType: "one_time" | "recurring" | "terminating_action";
  recurringIntervalDays?: number;
  recurringIntervalHours?: number;
  recurringIntervalCycles?: number;
};

export type DueBaseline = {
  complianceDate: number;
  aircraftHoursAtCompliance: number;
  aircraftCyclesAtCompliance?: number;
};

export type DueSnapshot = {
  nextDueDate?: number;
  nextDueHours?: number;
  nextDueCycles?: number;
};

export function computeDueSnapshot(
  policy: DueRecurrencePolicy,
  baseline: DueBaseline,
): DueSnapshot {
  if (policy.adType === "one_time" || policy.adType === "terminating_action") {
    return {};
  }

  const next: DueSnapshot = {};

  if (policy.recurringIntervalDays != null) {
    next.nextDueDate = baseline.complianceDate + policy.recurringIntervalDays * DAY_MS;
  }
  if (policy.recurringIntervalHours != null) {
    next.nextDueHours = baseline.aircraftHoursAtCompliance + policy.recurringIntervalHours;
  }
  if (
    policy.recurringIntervalCycles != null &&
    baseline.aircraftCyclesAtCompliance != null
  ) {
    next.nextDueCycles =
      baseline.aircraftCyclesAtCompliance + policy.recurringIntervalCycles;
  }

  return next;
}

export function recomputeAdDueFromHistory(
  ad: Pick<
    Doc<"airworthinessDirectives">,
    "adType" | "recurringIntervalDays" | "recurringIntervalHours" | "recurringIntervalCycles"
  >,
  complianceHistory: Array<
    Pick<
      Doc<"adCompliance">["complianceHistory"][number],
      "complianceDate" | "aircraftHoursAtCompliance" | "aircraftCyclesAtCompliance"
    >
  >,
): DueSnapshot {
  if (complianceHistory.length === 0) {
    return {};
  }

  const latest = complianceHistory[complianceHistory.length - 1];
  return computeDueSnapshot(
    {
      adType: ad.adType,
      recurringIntervalDays: ad.recurringIntervalDays,
      recurringIntervalHours: ad.recurringIntervalHours,
      recurringIntervalCycles: ad.recurringIntervalCycles,
    },
    {
      complianceDate: latest.complianceDate,
      aircraftHoursAtCompliance: latest.aircraftHoursAtCompliance,
      aircraftCyclesAtCompliance: latest.aircraftCyclesAtCompliance,
    },
  );
}

/**
 * Deterministic replay helper for validation/debugging.
 * Recomputes due fields from immutable complianceHistory and returns a diff
 * against cached adCompliance nextDue* values.
 */
export const recomputeAdComplianceDueSnapshot = query({
  args: {
    adComplianceId: v.id("adCompliance"),
  },
  handler: async (ctx, args) => {
    const adCompliance = await ctx.db.get(args.adComplianceId);
    if (!adCompliance) {
      throw new Error(`adCompliance ${args.adComplianceId} not found.`);
    }

    const ad = await ctx.db.get(adCompliance.adId);
    if (!ad) {
      throw new Error(`airworthinessDirective ${adCompliance.adId} not found.`);
    }

    const recomputed = recomputeAdDueFromHistory(ad, adCompliance.complianceHistory);

    return {
      adComplianceId: adCompliance._id,
      cached: {
        nextDueDate: adCompliance.nextDueDate,
        nextDueHours: adCompliance.nextDueHours,
        nextDueCycles: adCompliance.nextDueCycles,
      },
      recomputed,
      matches:
        adCompliance.nextDueDate === recomputed.nextDueDate &&
        adCompliance.nextDueHours === recomputed.nextDueHours &&
        adCompliance.nextDueCycles === recomputed.nextDueCycles,
    };
  },
});

export type AdLifecycleStatus =
  | "pending_determination"
  | "not_complied"
  | "complied_one_time"
  | "complied_recurring"
  | "not_applicable"
  | "superseded";

const AD_LIFECYCLE_TRANSITIONS: Record<AdLifecycleStatus, ReadonlySet<AdLifecycleStatus>> = {
  pending_determination: new Set<AdLifecycleStatus>([
    "not_complied",
    "not_applicable",
    "complied_one_time",
    "complied_recurring",
    "superseded",
  ]),
  not_complied: new Set<AdLifecycleStatus>([
    "complied_one_time",
    "complied_recurring",
    "not_applicable",
    "superseded",
  ]),
  complied_one_time: new Set<AdLifecycleStatus>(["superseded"]),
  complied_recurring: new Set<AdLifecycleStatus>(["complied_recurring", "superseded"]),
  not_applicable: new Set<AdLifecycleStatus>(["superseded"]),
  superseded: new Set<AdLifecycleStatus>([]),
};

/**
 * Explicit AD lifecycle transition guard (C1.3).
 */
export function assertValidAdLifecycleTransition(
  from: AdLifecycleStatus,
  to: AdLifecycleStatus,
): void {
  if (from === to) {
    return;
  }
  if (!AD_LIFECYCLE_TRANSITIONS[from].has(to)) {
    throw new Error(
      `INVALID_AD_LIFECYCLE_TRANSITION: ${from} -> ${to} is not allowed by policy.`,
    );
  }
}

export type DirectiveLifecycleState =
  | "identified"
  | "assessed"
  | "applicable"
  | "scheduled"
  | "complied"
  | "recurring_next";

const DIRECTIVE_TRANSITIONS: Record<DirectiveLifecycleState, ReadonlySet<DirectiveLifecycleState>> = {
  identified: new Set<DirectiveLifecycleState>(["assessed"]),
  assessed: new Set<DirectiveLifecycleState>(["applicable"]),
  applicable: new Set<DirectiveLifecycleState>(["scheduled"]),
  scheduled: new Set<DirectiveLifecycleState>(["complied"]),
  complied: new Set<DirectiveLifecycleState>(["recurring_next"]),
  recurring_next: new Set<DirectiveLifecycleState>(["scheduled", "complied"]),
};

export function assertValidDirectiveLifecycleTransition(
  from: DirectiveLifecycleState,
  to: DirectiveLifecycleState,
): void {
  if (from === to) {
    return;
  }
  if (!DIRECTIVE_TRANSITIONS[from].has(to)) {
    throw new Error(
      `INVALID_DIRECTIVE_LIFECYCLE_TRANSITION: ${from} -> ${to} is not allowed by policy.`,
    );
  }
}
