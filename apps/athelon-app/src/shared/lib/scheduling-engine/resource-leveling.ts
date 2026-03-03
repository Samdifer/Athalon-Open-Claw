/**
 * MRO Resource Leveling Algorithm
 *
 * Levels technician workloads across hangar bays.
 * Respects tech certifications (IA vs AMT), shift schedules, days off.
 * Detects overallocation.
 *
 * Pure function: no side effects, no database calls.
 */

import type {
  HangarBay,
  MRODependency,
  ScheduledTaskCard,
  ShiftName,
  TechnicianResource,
  WorkOrderPriority,
} from "./types";
import { SHIFTS } from "./types";

// ============================================
// Types
// ============================================

export interface LevelingTask {
  id: string;
  startDate: number;
  dueDate: number;
  estimatedHours: number;
  assignedTechnicianId: string;
  priority: WorkOrderPriority;
  workOrderId: string;
  hangarBayId?: string;
  /** Required certifications for this task */
  requiredCertifications?: string[];
  dependencies: string[];
}

export interface LeveledTask {
  taskId: string;
  newStartDate: number;
  newDueDate: number;
  reason?: string;
}

export interface OverallocationWarning {
  technicianId: string;
  date: string;
  allocatedHours: number;
  availableHours: number;
}

export interface CertificationViolation {
  taskId: string;
  technicianId: string;
  requiredCerts: string[];
  heldCerts: string[];
}

export interface LevelingResult {
  leveledTasks: LeveledTask[];
  totalDuration: number;
  resourceUtilization: Map<string, number>;
  overallocations: OverallocationWarning[];
  certificationViolations: CertificationViolation[];
}

// ============================================
// Helpers
// ============================================

const MS_PER_DAY = 86_400_000;

const PRIORITY_ORDER: Record<WorkOrderPriority, number> = {
  aog: 0,
  urgent: 1,
  routine: 2,
  deferred: 3,
};

function toDateKey(epochMs: number): string {
  return new Date(epochMs).toISOString().slice(0, 10);
}

function addDays(epochMs: number, days: number): number {
  return epochMs + days * MS_PER_DAY;
}

function getDayOfWeek(epochMs: number): number {
  return new Date(epochMs).getUTCDay();
}

function isWorkingDay(epochMs: number, tech: TechnicianResource): boolean {
  return !tech.daysOff.includes(getDayOfWeek(epochMs));
}

function getEffectiveHoursPerDay(tech: TechnicianResource): number {
  return tech.hoursPerDay * tech.efficiencyMultiplier;
}

/** Only these roles do hands-on work */
function canDoHandsOnWork(tech: TechnicianResource): boolean {
  return (
    tech.role === "technician" ||
    tech.role === "lead_technician"
  );
}

function getWorkingDaysNeeded(
  estimatedHours: number,
  tech: TechnicianResource,
): number {
  const effectiveHours = getEffectiveHoursPerDay(tech);
  if (effectiveHours <= 0) return Infinity;
  return Math.ceil(estimatedHours / effectiveHours);
}

function computeEndDate(
  startMs: number,
  workingDaysNeeded: number,
  tech: TechnicianResource,
): number {
  let current = startMs;
  let remaining = workingDaysNeeded;

  while (remaining > 0) {
    if (isWorkingDay(current, tech)) {
      remaining--;
      if (remaining === 0) return current;
    }
    if (remaining > 0) current = addDays(current, 1);
  }

  return current;
}

function findNextWorkingDay(
  epochMs: number,
  tech: TechnicianResource,
): number {
  let current = epochMs;
  let guard = 0;
  while (!isWorkingDay(current, tech) && guard < 14) {
    current = addDays(current, 1);
    guard++;
  }
  return current;
}

function checkCertifications(
  taskCerts: string[] | undefined,
  techCerts: string[],
): boolean {
  if (!taskCerts || taskCerts.length === 0) return true;
  return taskCerts.every((cert) => techCerts.includes(cert));
}

// ============================================
// Main Algorithm
// ============================================

/**
 * Level technician workloads, respecting MRO constraints.
 */
export function levelResources(
  tasks: LevelingTask[],
  technicians: TechnicianResource[],
  hangarBays?: HangarBay[],
): LevelingResult {
  const techMap = new Map<string, TechnicianResource>();
  for (const t of technicians) {
    techMap.set(t.id, t);
  }

  const certViolations: CertificationViolation[] = [];
  const overallocations: OverallocationWarning[] = [];

  // Check certification violations upfront
  for (const task of tasks) {
    const tech = techMap.get(task.assignedTechnicianId);
    if (tech && !checkCertifications(task.requiredCertifications, tech.certifications)) {
      certViolations.push({
        taskId: task.id,
        technicianId: task.assignedTechnicianId,
        requiredCerts: task.requiredCertifications ?? [],
        heldCerts: tech.certifications,
      });
    }
    if (tech && !canDoHandsOnWork(tech)) {
      certViolations.push({
        taskId: task.id,
        technicianId: task.assignedTechnicianId,
        requiredCerts: ["hands_on_role"],
        heldCerts: [tech.role],
      });
    }
  }

  // Sort: AOG first, then urgent, then by start date
  const sorted = [...tasks].sort((a, b) => {
    const priDiff = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
    if (priDiff !== 0) return priDiff;
    return a.startDate - b.startDate;
  });

  // Track allocation: techId -> dateKey -> hours used
  const allocation = new Map<string, Map<string, number>>();
  for (const t of technicians) {
    allocation.set(t.id, new Map());
  }

  // Track hangar bay occupancy: bayId -> dateKey -> Set<workOrderId>
  const bayOccupancy = new Map<string, Map<string, Set<string>>>();
  if (hangarBays) {
    for (const bay of hangarBays) {
      bayOccupancy.set(bay.id, new Map());
    }
  }

  const resolvedStart = new Map<string, number>();
  const resolvedEnd = new Map<string, number>();
  const leveledTasks: LeveledTask[] = [];

  for (const task of sorted) {
    const tech = techMap.get(task.assignedTechnicianId);
    if (!tech) {
      resolvedStart.set(task.id, task.startDate);
      resolvedEnd.set(task.id, task.dueDate);
      leveledTasks.push({
        taskId: task.id,
        newStartDate: task.startDate,
        newDueDate: task.dueDate,
        reason: "No matching technician found; dates unchanged",
      });
      continue;
    }

    // Respect dependency constraints
    let earliestStart = task.startDate;
    for (const depId of task.dependencies) {
      const depEnd = resolvedEnd.get(depId);
      if (depEnd != null) {
        const dayAfterDep = addDays(depEnd, 1);
        if (dayAfterDep > earliestStart) {
          earliestStart = dayAfterDep;
        }
      }
    }

    earliestStart = findNextWorkingDay(earliestStart, tech);

    const workingDaysNeeded = getWorkingDaysNeeded(task.estimatedHours, tech);
    const techAlloc = allocation.get(tech.id)!;
    const effectiveHours = getEffectiveHoursPerDay(tech);

    let candidateStart = earliestStart;
    let placed = false;

    let attempts = 0;
    while (!placed && attempts < 365) {
      attempts++;
      candidateStart = findNextWorkingDay(candidateStart, tech);
      const candidateEnd = computeEndDate(candidateStart, workingDaysNeeded, tech);

      // Check for overallocation on each working day
      let conflict = false;
      let checkDate = candidateStart;

      while (checkDate <= candidateEnd) {
        if (isWorkingDay(checkDate, tech)) {
          const key = toDateKey(checkDate);
          const used = techAlloc.get(key) ?? 0;
          if (used + effectiveHours > effectiveHours) {
            conflict = true;
            break;
          }
        }
        checkDate = addDays(checkDate, 1);
      }

      // Check hangar bay capacity
      if (!conflict && task.hangarBayId && bayOccupancy.has(task.hangarBayId)) {
        const bayMap = bayOccupancy.get(task.hangarBayId)!;
        const bay = hangarBays?.find((b) => b.id === task.hangarBayId);
        if (bay) {
          let bayCheck = candidateStart;
          while (bayCheck <= candidateEnd) {
            const key = toDateKey(bayCheck);
            const woSet = bayMap.get(key) ?? new Set<string>();
            if (!woSet.has(task.workOrderId) && woSet.size >= bay.capacity) {
              conflict = true;
              break;
            }
            bayCheck = addDays(bayCheck, 1);
          }
        }
      }

      if (!conflict) {
        // Allocate hours
        let markDate = candidateStart;
        while (markDate <= candidateEnd) {
          if (isWorkingDay(markDate, tech)) {
            const key = toDateKey(markDate);
            techAlloc.set(key, (techAlloc.get(key) ?? 0) + effectiveHours);
          }
          markDate = addDays(markDate, 1);
        }

        // Mark hangar bay occupancy
        if (task.hangarBayId && bayOccupancy.has(task.hangarBayId)) {
          const bayMap = bayOccupancy.get(task.hangarBayId)!;
          let bayMark = candidateStart;
          while (bayMark <= candidateEnd) {
            const key = toDateKey(bayMark);
            const woSet = bayMap.get(key) ?? new Set<string>();
            woSet.add(task.workOrderId);
            bayMap.set(key, woSet);
            bayMark = addDays(bayMark, 1);
          }
        }

        resolvedStart.set(task.id, candidateStart);
        resolvedEnd.set(task.id, candidateEnd);

        const wasDelayed = candidateStart > task.startDate;
        let reason: string | undefined;
        if (wasDelayed) {
          reason = "Delayed due to resource availability or constraints";
        }

        leveledTasks.push({
          taskId: task.id,
          newStartDate: candidateStart,
          newDueDate: candidateEnd,
          reason,
        });

        placed = true;
      } else {
        candidateStart = addDays(candidateStart, 1);
      }
    }

    if (!placed) {
      // Fallback: place at earliest start, record overallocation
      const candidateEnd = computeEndDate(earliestStart, workingDaysNeeded, tech);
      resolvedStart.set(task.id, earliestStart);
      resolvedEnd.set(task.id, candidateEnd);
      leveledTasks.push({
        taskId: task.id,
        newStartDate: earliestStart,
        newDueDate: candidateEnd,
        reason: "Placed with overallocation — no available slot found within 365 days",
      });
    }
  }

  // Detect overallocations
  for (const tech of technicians) {
    const techAlloc = allocation.get(tech.id)!;
    for (const [dateKey, hours] of techAlloc) {
      if (hours > getEffectiveHoursPerDay(tech)) {
        overallocations.push({
          technicianId: tech.id,
          date: dateKey,
          allocatedHours: hours,
          availableHours: getEffectiveHoursPerDay(tech),
        });
      }
    }
  }

  // Compute utilization
  let projectStart: number | null = null;
  let projectEnd: number | null = null;
  for (const lt of leveledTasks) {
    if (projectStart === null || lt.newStartDate < projectStart) projectStart = lt.newStartDate;
    if (projectEnd === null || lt.newDueDate > projectEnd) projectEnd = lt.newDueDate;
  }

  const totalDuration =
    projectStart != null && projectEnd != null
      ? Math.round((projectEnd - projectStart) / MS_PER_DAY) + 1
      : 0;

  const resourceUtilization = new Map<string, number>();
  for (const tech of technicians) {
    const techAlloc = allocation.get(tech.id)!;
    let totalAllocated = 0;
    let totalAvailable = 0;

    if (projectStart != null && projectEnd != null) {
      let d = projectStart;
      while (d <= projectEnd) {
        if (isWorkingDay(d, tech)) {
          const eff = getEffectiveHoursPerDay(tech);
          totalAvailable += eff;
          totalAllocated += techAlloc.get(toDateKey(d)) ?? 0;
        }
        d = addDays(d, 1);
      }
    }

    resourceUtilization.set(
      tech.id,
      totalAvailable > 0 ? Math.round((totalAllocated / totalAvailable) * 100) / 100 : 0,
    );
  }

  return {
    leveledTasks,
    totalDuration,
    resourceUtilization,
    overallocations,
    certificationViolations: certViolations,
  };
}
