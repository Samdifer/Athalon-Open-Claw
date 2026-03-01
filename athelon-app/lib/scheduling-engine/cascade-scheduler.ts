/**
 * MRO Auto-Cascade Scheduling Algorithm
 *
 * When a work order's or task card's dates move, cascades to dependent
 * WOs/task cards. Supports FS/FF/SS/SF + lag/lead.
 * AOG priority override: AOG work orders always schedule first.
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

export interface CascadeItem {
  id: string;
  startDate?: number;
  dueDate?: number;
  priority: WorkOrderPriority;
  /** Parent WO ID for task cards, undefined for WOs */
  workOrderId?: string;
}

export interface DateChange {
  itemId: string;
  oldStartDate?: number;
  oldDueDate?: number;
  newStartDate?: number;
  newDueDate?: number;
}

export interface CascadeResult {
  changes: DateChange[];
  processingOrder: string[];
}

// ============================================
// Helpers
// ============================================

const MS_PER_DAY = 86_400_000;

export function addDaysMs(date: number, days: number): number {
  return date + days * MS_PER_DAY;
}

function itemDuration(item: CascadeItem): number {
  if (item.startDate != null && item.dueDate != null) {
    return Math.max(0, item.dueDate - item.startDate);
  }
  return MS_PER_DAY;
}

const PRIORITY_ORDER: Record<WorkOrderPriority, number> = {
  aog: 0,
  urgent: 1,
  routine: 2,
  deferred: 3,
};

function computeConstraint(
  predItem: CascadeItem,
  depType: DependencyType,
  lagDays: number,
): { constraintStart?: number; constraintEnd?: number } {
  const lag = lagDays * MS_PER_DAY;

  switch (depType) {
    case "FS": {
      const predEnd = predItem.dueDate ?? predItem.startDate;
      if (predEnd == null) return {};
      return { constraintStart: predEnd + lag };
    }
    case "SS": {
      const predStart = predItem.startDate ?? predItem.dueDate;
      if (predStart == null) return {};
      return { constraintStart: predStart + lag };
    }
    case "FF": {
      const predEnd = predItem.dueDate ?? predItem.startDate;
      if (predEnd == null) return {};
      return { constraintEnd: predEnd + lag };
    }
    case "SF": {
      const predStart = predItem.startDate ?? predItem.dueDate;
      if (predStart == null) return {};
      return { constraintEnd: predStart + lag };
    }
  }
}

// ============================================
// Convert domain objects to CascadeItems
// ============================================

export function workOrderToCascadeItem(wo: ScheduledWorkOrder): CascadeItem {
  return {
    id: wo.id,
    startDate: wo.startDate,
    dueDate: wo.dueDate,
    priority: wo.priority,
  };
}

export function taskCardToCascadeItem(
  tc: ScheduledTaskCard,
  woPriority: WorkOrderPriority,
): CascadeItem {
  return {
    id: tc.id,
    startDate: tc.startDate,
    dueDate: tc.dueDate,
    priority: woPriority,
    workOrderId: tc.workOrderId as string,
  };
}

// ============================================
// Main Algorithm
// ============================================

/**
 * Compute cascaded date changes with AOG priority override.
 *
 * AOG items are scheduled first and cannot be delayed by non-AOG items.
 * When an AOG item conflicts with a non-AOG item, the non-AOG item is pushed.
 *
 * @param items         All schedulable items (WOs + task cards)
 * @param dependencies  All dependencies
 * @param changedItemIds IDs of items whose dates were just modified
 */
export function computeCascade(
  items: CascadeItem[],
  dependencies: MRODependency[],
  changedItemIds: string[],
): CascadeResult {
  const itemMap = new Map<string, CascadeItem>();
  for (const item of items) {
    itemMap.set(item.id, { ...item });
  }

  // Build adjacency maps
  const successorDeps = new Map<string, MRODependency[]>();
  const predecessorDeps = new Map<string, MRODependency[]>();

  for (const dep of dependencies) {
    const fwd = successorDeps.get(dep.predecessorId) ?? [];
    fwd.push(dep);
    successorDeps.set(dep.predecessorId, fwd);

    const rev = predecessorDeps.get(dep.successorId) ?? [];
    rev.push(dep);
    predecessorDeps.set(dep.successorId, rev);
  }

  const changes: DateChange[] = [];
  const processingOrder: string[] = [];
  const visited = new Set<string>();

  // Priority queue: process AOG items first
  const queue: string[] = [...changedItemIds];
  for (const id of changedItemIds) {
    visited.add(id);
  }

  // Sort queue by priority (AOG first)
  queue.sort((a, b) => {
    const itemA = itemMap.get(a);
    const itemB = itemMap.get(b);
    return (
      PRIORITY_ORDER[itemA?.priority ?? "routine"] -
      PRIORITY_ORDER[itemB?.priority ?? "routine"]
    );
  });

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    const outgoing = successorDeps.get(currentId) ?? [];

    for (const dep of outgoing) {
      const succId = dep.successorId;
      const succItem = itemMap.get(succId);
      if (!succItem) continue;

      // Compute constraints from ALL predecessors
      const allPredDeps = predecessorDeps.get(succId) ?? [];
      let maxConstraintStart: number | undefined;
      let maxConstraintEnd: number | undefined;

      for (const predDep of allPredDeps) {
        const predItem = itemMap.get(predDep.predecessorId);
        if (!predItem) continue;

        // AOG override: if successor is AOG and predecessor is not,
        // skip the constraint (AOG cannot be delayed by non-AOG)
        if (
          succItem.priority === "aog" &&
          predItem.priority !== "aog" &&
          !predDep.isInspectionHold
        ) {
          continue;
        }

        const constraint = computeConstraint(
          predItem,
          predDep.type,
          predDep.lagDays ?? 0,
        );

        if (constraint.constraintStart != null) {
          maxConstraintStart =
            maxConstraintStart != null
              ? Math.max(maxConstraintStart, constraint.constraintStart)
              : constraint.constraintStart;
        }
        if (constraint.constraintEnd != null) {
          maxConstraintEnd =
            maxConstraintEnd != null
              ? Math.max(maxConstraintEnd, constraint.constraintEnd)
              : constraint.constraintEnd;
        }
      }

      const duration = itemDuration(succItem);
      let newStart = succItem.startDate;
      let newEnd = succItem.dueDate;

      if (maxConstraintStart != null) {
        const currentStart = succItem.startDate ?? 0;
        if (maxConstraintStart > currentStart) {
          newStart = maxConstraintStart;
          newEnd = newStart + duration;
        }
      }

      if (maxConstraintEnd != null) {
        const currentEnd = newEnd ?? succItem.dueDate ?? 0;
        if (maxConstraintEnd > currentEnd) {
          newEnd = maxConstraintEnd;
          newStart = newEnd - duration;
        }
      }

      const startChanged = newStart !== succItem.startDate;
      const endChanged = newEnd !== succItem.dueDate;

      if (startChanged || endChanged) {
        changes.push({
          itemId: succId,
          oldStartDate: succItem.startDate,
          oldDueDate: succItem.dueDate,
          newStartDate: newStart,
          newDueDate: newEnd,
        });

        const updatedItem: CascadeItem = {
          ...succItem,
          startDate: newStart,
          dueDate: newEnd,
        };
        itemMap.set(succId, updatedItem);
        processingOrder.push(succId);

        if (!visited.has(succId)) {
          visited.add(succId);
          // Insert maintaining priority order
          const succPriority = PRIORITY_ORDER[updatedItem.priority];
          let insertIdx = queue.length;
          for (let i = 0; i < queue.length; i++) {
            const qItem = itemMap.get(queue[i]);
            if (
              PRIORITY_ORDER[qItem?.priority ?? "routine"] > succPriority
            ) {
              insertIdx = i;
              break;
            }
          }
          queue.splice(insertIdx, 0, succId);
        }
      }
    }
  }

  return { changes, processingOrder };
}

/**
 * Convenience: compute cascade for a single changed item.
 */
export function computeCascadeForItem(
  items: CascadeItem[],
  dependencies: MRODependency[],
  changedItemId: string,
): CascadeResult {
  return computeCascade(items, dependencies, [changedItemId]);
}
