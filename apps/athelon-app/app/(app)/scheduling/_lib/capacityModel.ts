const DAY_MS = 24 * 60 * 60 * 1000;

// ── Skill dimension types (Optimization Phase 1 — B4) ──────────────────

/** Standard MRO skill categories for vector capacity breakdown */
export type SkillCategory = "ap" | "ia" | "ndt" | "avionics" | "general";

export const SKILL_LABELS: Record<SkillCategory, string> = {
  ap: "A&P",
  ia: "IA",
  ndt: "NDT",
  avionics: "Avionics",
  general: "General",
};

/** Per-skill capacity and load for a single day */
export type SkillDimension = {
  skill: SkillCategory;
  capacity: number;
  load: number;
  utilization: number;
};

export type CapacityPoint = {
  day: number;
  capacity: number;
  load: number;
  utilization: number;
  /** Skill-dimension breakdown (Optimization Phase 1 — B4) */
  bySkill?: SkillDimension[];
};

export type TechnicianWorkloadRow = {
  daysOfWeek?: number[];
  startHour?: number;
  endHour?: number;
  efficiencyMultiplier?: number;
  /** Skill categories this technician contributes to (B4) */
  skills?: SkillCategory[];
};

export type ScheduledPlannerProjectRow = {
  workOrderId: string;
  workOrderStatus: string;
  scheduledStartDate: number;
  promisedDeliveryDate: number;
  dailyEffort?: { dayOffset: number; effortHours: number }[];
  nonWorkDays?: number[];
  /** Skill requirements for this WO (B4) — determines which skill dimensions consume load */
  requiredSkills?: SkillCategory[];
};

export type WorkOrderCapacityRow = {
  _id: string;
  remainingHours?: number;
  effectiveEstimatedHours?: number;
};

function resolveDailyCapacityProfile(
  technicianWorkload: TechnicianWorkloadRow[],
  dailyCapacityProfile?: Float32Array,
): Float32Array {
  if (dailyCapacityProfile) return dailyCapacityProfile;

  const profile = new Float32Array(7);
  for (const tech of technicianWorkload) {
    const shiftDays = tech.daysOfWeek ?? [];
    const shiftHours = Math.max(0, (tech.endHour ?? 0) - (tech.startHour ?? 0));
    const efficiency = tech.efficiencyMultiplier ?? 1;
    const productiveHours = shiftHours * efficiency;

    for (const dayIndex of shiftDays) {
      if (dayIndex < 0 || dayIndex > 6) continue;
      profile[dayIndex] += productiveHours;
    }
  }

  return profile;
}

/**
 * Build per-skill daily capacity profiles from technician data.
 * Returns a Map of skill -> Float32Array[7] (one per day of week).
 */
function resolveSkillCapacityProfiles(
  technicianWorkload: TechnicianWorkloadRow[],
): Map<SkillCategory, Float32Array> {
  const profiles = new Map<SkillCategory, Float32Array>();

  for (const tech of technicianWorkload) {
    const shiftDays = tech.daysOfWeek ?? [];
    const shiftHours = Math.max(0, (tech.endHour ?? 0) - (tech.startHour ?? 0));
    const efficiency = tech.efficiencyMultiplier ?? 1;
    const productiveHours = shiftHours * efficiency;

    // Determine which skills this tech contributes to
    const skills = tech.skills ?? ["general" as SkillCategory];

    for (const skill of skills) {
      if (!profiles.has(skill)) {
        profiles.set(skill, new Float32Array(7));
      }
      const profile = profiles.get(skill)!;
      for (const dayIndex of shiftDays) {
        if (dayIndex < 0 || dayIndex > 6) continue;
        profile[dayIndex] += productiveHours;
      }
    }
  }

  return profiles;
}

export function buildDailyCapacityPoints(args: {
  timelineTotalDays: number;
  timelineStartMs: number;
  scheduledProjects: ScheduledPlannerProjectRow[];
  workOrders: WorkOrderCapacityRow[];
  technicianWorkload: TechnicianWorkloadRow[];
  dailyCapacityProfile?: Float32Array;
  /** Enable skill-dimension breakdown (B4). Default: false for backward compat. */
  includeSkillBreakdown?: boolean;
}): CapacityPoint[] {
  const timelineTotalDays = Math.max(1, args.timelineTotalDays);
  const capacityHours = new Float32Array(timelineTotalDays);
  const loadHours = new Float32Array(timelineTotalDays);
  const capacityProfile = resolveDailyCapacityProfile(
    args.technicianWorkload,
    args.dailyCapacityProfile,
  );
  const workOrderMap = new Map(args.workOrders.map((wo) => [String(wo._id), wo]));

  // ── Skill-dimension arrays (B4) ──────────────────────────────────────
  const doSkills = args.includeSkillBreakdown === true;
  const skillProfiles = doSkills ? resolveSkillCapacityProfiles(args.technicianWorkload) : new Map<SkillCategory, Float32Array>();
  const allSkills = doSkills ? Array.from(skillProfiles.keys()).sort() : [];
  // Per-skill capacity and load arrays
  const skillCapacity = new Map<SkillCategory, Float32Array>();
  const skillLoad = new Map<SkillCategory, Float32Array>();
  if (doSkills) {
    for (const skill of allSkills) {
      skillCapacity.set(skill, new Float32Array(timelineTotalDays));
      skillLoad.set(skill, new Float32Array(timelineTotalDays));
    }
  }

  for (let i = 0; i < timelineTotalDays; i++) {
    const date = new Date(args.timelineStartMs + i * DAY_MS);
    const dayOfWeek = date.getDay();
    capacityHours[i] = capacityProfile[dayOfWeek] ?? 0;

    if (doSkills) {
      for (const skill of allSkills) {
        const profile = skillProfiles.get(skill);
        if (profile) {
          skillCapacity.get(skill)![i] = profile[dayOfWeek] ?? 0;
        }
      }
    }
  }

  for (const project of args.scheduledProjects) {
    if (["cancelled", "voided"].includes(project.workOrderStatus)) continue;

    const wo = workOrderMap.get(String(project.workOrderId));
    const totalHours = Math.max(
      0,
      wo?.remainingHours ?? wo?.effectiveEstimatedHours ?? 0,
    );

    const start = Math.floor((project.scheduledStartDate - args.timelineStartMs) / DAY_MS);
    const durationDays = Math.max(
      1,
      Math.ceil((project.promisedDeliveryDate - project.scheduledStartDate) / DAY_MS),
    );
    const end = start + durationDays;

    const effortByOffset = new Map<number, number>();
    for (const point of project.dailyEffort ?? []) {
      effortByOffset.set(point.dayOffset, Math.max(0, point.effortHours));
    }

    const nonWorkDays = new Set(project.nonWorkDays ?? []);
    const weights = new Array(durationDays).fill(1);
    let totalWeight = 0;
    for (let i = 0; i < durationDays; i++) {
      if (nonWorkDays.has(i)) {
        weights[i] = 0;
      } else if (effortByOffset.has(i)) {
        weights[i] = effortByOffset.get(i)!;
      }
      totalWeight += weights[i];
    }

    if (totalWeight <= 0) continue;

    const loopStart = Math.max(0, start);
    const loopEnd = Math.min(timelineTotalDays, end);

    // Determine which skills this WO consumes (default: distribute evenly across all)
    const woSkills = project.requiredSkills ?? (doSkills ? allSkills : []);
    const skillCount = Math.max(1, woSkills.length);

    for (let dayIndex = loopStart; dayIndex < loopEnd; dayIndex++) {
      const offset = dayIndex - start;
      const ratio = weights[offset] / totalWeight;
      const dayLoad = ratio * totalHours;
      loadHours[dayIndex] += dayLoad;

      // Distribute load across required skills
      if (doSkills && woSkills.length > 0) {
        const perSkillLoad = dayLoad / skillCount;
        for (const skill of woSkills) {
          const arr = skillLoad.get(skill as SkillCategory);
          if (arr) arr[dayIndex] += perSkillLoad;
        }
      }
    }
  }

  const points: CapacityPoint[] = new Array(timelineTotalDays);
  for (let i = 0; i < timelineTotalDays; i++) {
    const cap = capacityHours[i];
    const load = loadHours[i];
    const point: CapacityPoint = {
      day: i,
      capacity: cap,
      load,
      utilization: cap > 0 ? (load / cap) * 100 : load > 0 ? 100 : 0,
    };

    if (doSkills && allSkills.length > 0) {
      point.bySkill = allSkills.map((skill) => {
        const sCap = skillCapacity.get(skill)?.[i] ?? 0;
        const sLoad = skillLoad.get(skill)?.[i] ?? 0;
        return {
          skill,
          capacity: sCap,
          load: sLoad,
          utilization: sCap > 0 ? (sLoad / sCap) * 100 : sLoad > 0 ? 100 : 0,
        };
      });
    }

    points[i] = point;
  }

  return points;
}

export function summarizeCapacityPoints(
  points: CapacityPoint[],
  currentDayIndex: number,
  bufferPercent: number,
) {
  if (points.length === 0) {
    return {
      totalAvailableHours: 0,
      totalLoadHours: 0,
      utilizationPercent: 0,
      peakUtilization: 0,
      overloadedDayCount: 0,
      nearBufferDayCount: 0,
      current: {
        capacity: 0,
        load: 0,
        utilization: 0,
        isOverCapacity: false,
        isNearBuffer: false,
      },
      /** Per-skill utilization summary (B4) */
      skillSummary: [] as Array<{
        skill: SkillCategory;
        label: string;
        totalCapacity: number;
        totalLoad: number;
        utilizationPercent: number;
        isBottleneck: boolean;
      }>,
    };
  }

  let totalAvailableHours = 0;
  let totalLoadHours = 0;
  let peakUtilization = 0;
  let overloadedDayCount = 0;
  let nearBufferDayCount = 0;

  // Aggregate per-skill stats
  const skillTotals = new Map<SkillCategory, { capacity: number; load: number }>();

  for (const point of points) {
    totalAvailableHours += point.capacity;
    totalLoadHours += point.load;
    peakUtilization = Math.max(peakUtilization, point.utilization);
    if (point.load > point.capacity + 0.1) overloadedDayCount++;
    if (point.capacity > 0 && point.utilization > 100 - bufferPercent) {
      nearBufferDayCount++;
    }

    // Accumulate skill dimensions
    if (point.bySkill) {
      for (const sd of point.bySkill) {
        const existing = skillTotals.get(sd.skill) ?? { capacity: 0, load: 0 };
        existing.capacity += sd.capacity;
        existing.load += sd.load;
        skillTotals.set(sd.skill, existing);
      }
    }
  }

  const utilizationPercent =
    totalAvailableHours > 0 ? Math.round((totalLoadHours / totalAvailableHours) * 100) : 0;
  const clampedDay = Math.max(0, Math.min(currentDayIndex, points.length - 1));
  const currentPoint = points[clampedDay];

  // Build skill summary
  const skillSummary = Array.from(skillTotals.entries()).map(([skill, totals]) => {
    const util = totals.capacity > 0
      ? Math.round((totals.load / totals.capacity) * 100)
      : totals.load > 0 ? 100 : 0;
    return {
      skill,
      label: SKILL_LABELS[skill] ?? skill,
      totalCapacity: Math.round(totals.capacity * 10) / 10,
      totalLoad: Math.round(totals.load * 10) / 10,
      utilizationPercent: util,
      isBottleneck: util > 85,
    };
  });

  // Sort: bottlenecks first, then by utilization descending
  skillSummary.sort((a, b) => {
    if (a.isBottleneck !== b.isBottleneck) return a.isBottleneck ? -1 : 1;
    return b.utilizationPercent - a.utilizationPercent;
  });

  return {
    totalAvailableHours,
    totalLoadHours,
    utilizationPercent,
    peakUtilization,
    overloadedDayCount,
    nearBufferDayCount,
    current: {
      capacity: currentPoint.capacity,
      load: currentPoint.load,
      utilization: currentPoint.utilization,
      isOverCapacity: currentPoint.load > currentPoint.capacity + 0.1,
      isNearBuffer:
        currentPoint.capacity > 0 && currentPoint.utilization > 100 - bufferPercent,
    },
    skillSummary,
  };
}
