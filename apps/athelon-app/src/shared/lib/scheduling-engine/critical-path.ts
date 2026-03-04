/**
 * Critical Path Method (CPM) for MRO
 *
 * Forward/backward pass, total float, critical path identification.
 * Identifies which task cards are blocking work order completion.
 *
 * Pure function: no side effects, no database calls.
 */

import type {
  DependencyType,
  MRODependency,
  ScheduledTaskCard,
  ScheduledWorkOrder,
  WorkOrderPriority,
} from "./types";

// ============================================
// Types
// ============================================

export interface CPMItem {
  id: string;
  startDate?: number;
  dueDate?: number;
  duration?: number;
  priority: WorkOrderPriority;
  workOrderId?: string;
}

export interface ItemSchedule {
  itemId: string;
  es: number;
  ef: number;
  ls: number;
  lf: number;
  totalFloat: number;
  isCritical: boolean;
  duration: number;
}

export interface CriticalPathResult {
  schedules: Map<string, ItemSchedule>;
  criticalItemIds: Set<string>;
  projectDuration: number;
  projectStart: number;
  projectFinish: number;
  /** Task cards on the critical path that are blocking WO completion */
  blockingTaskCards: string[];
}

// ============================================
// Helpers
// ============================================

const MS_PER_DAY = 86_400_000;

function getItemDuration(item: CPMItem): number {
  if (item.duration != null && item.duration > 0) return item.duration;
  if (item.startDate != null && item.dueDate != null) {
    return Math.max(0, item.dueDate - item.startDate);
  }
  return MS_PER_DAY;
}

function getItemStart(item: CPMItem): number {
  return item.startDate ?? item.dueDate ?? 0;
}

function topologicalSort(
  itemIds: string[],
  dependencies: MRODependency[],
): string[] {
  const inDegree = new Map<string, number>();
  const adjList = new Map<string, string[]>();

  for (const id of itemIds) {
    inDegree.set(id, 0);
    adjList.set(id, []);
  }

  for (const dep of dependencies) {
    if (!inDegree.has(dep.predecessorId) || !inDegree.has(dep.successorId)) continue;
    adjList.get(dep.predecessorId)!.push(dep.successorId);
    inDegree.set(dep.successorId, (inDegree.get(dep.successorId) ?? 0) + 1);
  }

  const queue: string[] = [];
  for (const [id, deg] of inDegree) {
    if (deg === 0) queue.push(id);
  }

  const sorted: string[] = [];
  while (queue.length > 0) {
    const current = queue.shift()!;
    sorted.push(current);
    for (const next of adjList.get(current) ?? []) {
      const newDeg = (inDegree.get(next) ?? 1) - 1;
      inDegree.set(next, newDeg);
      if (newDeg === 0) queue.push(next);
    }
  }

  if (sorted.length !== itemIds.length) {
    throw new Error("Cycle detected in dependencies; cannot compute critical path.");
  }

  return sorted;
}

// ============================================
// Forward & Backward Pass Helpers
// ============================================

function forwardConstraint(
  predES: number,
  predEF: number,
  succDuration: number,
  depType: DependencyType,
  lagMs: number,
): number {
  switch (depType) {
    case "FS": return predEF + lagMs;
    case "SS": return predES + lagMs;
    case "FF": return predEF + lagMs - succDuration;
    case "SF": return predES + lagMs - succDuration;
  }
}

function backwardConstraint(
  succLS: number,
  succLF: number,
  predDuration: number,
  depType: DependencyType,
  lagMs: number,
): number {
  switch (depType) {
    case "FS": return succLS - lagMs;
    case "SS": return succLS - lagMs + predDuration;
    case "FF": return succLF - lagMs;
    case "SF": return succLF - lagMs + predDuration;
  }
}

// ============================================
// Converters
// ============================================

export function workOrderToCPMItem(wo: ScheduledWorkOrder): CPMItem {
  return {
    id: wo.id,
    startDate: wo.startDate,
    dueDate: wo.dueDate,
    priority: wo.priority,
  };
}

export function taskCardToCPMItem(
  tc: ScheduledTaskCard,
  woPriority: WorkOrderPriority,
): CPMItem {
  return {
    id: tc.id,
    startDate: tc.startDate,
    dueDate: tc.dueDate,
    duration: tc.estimatedHours != null ? tc.estimatedHours * 3_600_000 : undefined,
    priority: woPriority,
    workOrderId: tc.workOrderId as string,
  };
}

// ============================================
// Main CPM Algorithm
// ============================================

export function computeCriticalPath(
  items: CPMItem[],
  dependencies: MRODependency[],
): CriticalPathResult {
  if (items.length === 0) {
    return {
      schedules: new Map(),
      criticalItemIds: new Set(),
      projectDuration: 0,
      projectStart: 0,
      projectFinish: 0,
      blockingTaskCards: [],
    };
  }

  const itemMap = new Map<string, CPMItem>();
  const durations = new Map<string, number>();
  const itemIds: string[] = [];

  for (const item of items) {
    itemMap.set(item.id, item);
    durations.set(item.id, getItemDuration(item));
    itemIds.push(item.id);
  }

  const validDeps = dependencies.filter(
    (d) => itemMap.has(d.predecessorId) && itemMap.has(d.successorId),
  );

  const predDepsMap = new Map<string, MRODependency[]>();
  const succDepsMap = new Map<string, MRODependency[]>();

  for (const dep of validDeps) {
    const preds = predDepsMap.get(dep.successorId) ?? [];
    preds.push(dep);
    predDepsMap.set(dep.successorId, preds);

    const succs = succDepsMap.get(dep.predecessorId) ?? [];
    succs.push(dep);
    succDepsMap.set(dep.predecessorId, succs);
  }

  const topoOrder = topologicalSort(itemIds, validDeps);

  // Forward pass
  const es = new Map<string, number>();
  const ef = new Map<string, number>();

  for (const id of topoOrder) {
    const dur = durations.get(id)!;
    const item = itemMap.get(id)!;
    let earliestStart = getItemStart(item);

    for (const dep of predDepsMap.get(id) ?? []) {
      const predES = es.get(dep.predecessorId)!;
      const predEF = ef.get(dep.predecessorId)!;
      const lagMs = (dep.lagDays ?? 0) * MS_PER_DAY;
      const constraint = forwardConstraint(predES, predEF, dur, dep.type, lagMs);
      earliestStart = Math.max(earliestStart, constraint);
    }

    es.set(id, earliestStart);
    ef.set(id, earliestStart + dur);
  }

  let projectFinish = 0;
  let projectStart = Infinity;
  for (const id of itemIds) {
    projectFinish = Math.max(projectFinish, ef.get(id)!);
    projectStart = Math.min(projectStart, es.get(id)!);
  }
  if (!isFinite(projectStart)) projectStart = 0;

  // Backward pass
  const ls = new Map<string, number>();
  const lf = new Map<string, number>();

  for (let i = topoOrder.length - 1; i >= 0; i--) {
    const id = topoOrder[i];
    const dur = durations.get(id)!;
    let latestFinish = projectFinish;

    for (const dep of succDepsMap.get(id) ?? []) {
      const succLS = ls.get(dep.successorId)!;
      const succLF = lf.get(dep.successorId)!;
      const lagMs = (dep.lagDays ?? 0) * MS_PER_DAY;
      const constraint = backwardConstraint(succLS, succLF, dur, dep.type, lagMs);
      latestFinish = Math.min(latestFinish, constraint);
    }

    lf.set(id, latestFinish);
    ls.set(id, latestFinish - dur);
  }

  // Compute float & critical path
  const schedules = new Map<string, ItemSchedule>();
  const criticalItemIds = new Set<string>();
  const FLOAT_EPSILON = MS_PER_DAY * 0.001;

  for (const id of itemIds) {
    const totalFloat = ls.get(id)! - es.get(id)!;
    const isCritical = Math.abs(totalFloat) < FLOAT_EPSILON;

    schedules.set(id, {
      itemId: id,
      es: es.get(id)!,
      ef: ef.get(id)!,
      ls: ls.get(id)!,
      lf: lf.get(id)!,
      totalFloat,
      isCritical,
      duration: durations.get(id)!,
    });

    if (isCritical) criticalItemIds.add(id);
  }

  // Identify blocking task cards (critical items that have a workOrderId)
  const blockingTaskCards: string[] = [];
  for (const id of criticalItemIds) {
    const item = itemMap.get(id)!;
    if (item.workOrderId != null) {
      blockingTaskCards.push(id);
    }
  }

  return {
    schedules,
    criticalItemIds,
    projectDuration: projectFinish - projectStart,
    projectStart,
    projectFinish,
    blockingTaskCards,
  };
}

/**
 * Get critical task IDs as an array.
 */
export function getCriticalItemIds(
  items: CPMItem[],
  dependencies: MRODependency[],
): string[] {
  return Array.from(computeCriticalPath(items, dependencies).criticalItemIds);
}

/**
 * Get total float for a specific item.
 */
export function getItemFloat(
  items: CPMItem[],
  dependencies: MRODependency[],
  itemId: string,
): number | undefined {
  return computeCriticalPath(items, dependencies).schedules.get(itemId)?.totalFloat;
}
