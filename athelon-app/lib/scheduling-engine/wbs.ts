/**
 * Work Breakdown Structure (WBS) for MRO
 *
 * WO → Task Cards → Steps hierarchy.
 * Computes rollup metrics: % complete, total hours, cost.
 *
 * Pure function: no side effects, no database calls.
 */

import type { WBSNode } from "./types";

// ============================================
// Types
// ============================================

export interface WBSWorkOrder {
  id: string;
  title: string;
  estimatedHours?: number;
  actualHours?: number;
  cost?: number;
}

export interface WBSTaskCard {
  id: string;
  workOrderId: string;
  title: string;
  estimatedHours?: number;
  actualHours?: number;
  percentComplete: number;
  cost?: number;
}

export interface WBSStep {
  id: string;
  taskCardId: string;
  workOrderId: string;
  title: string;
  estimatedHours?: number;
  actualHours?: number;
  isComplete: boolean;
  cost?: number;
}

export interface WBSRollup {
  totalEstimatedHours: number;
  totalActualHours: number;
  percentComplete: number;
  totalCost: number;
  taskCardCount: number;
  stepCount: number;
  completedTaskCards: number;
  completedSteps: number;
}

// ============================================
// Build WBS Tree
// ============================================

/**
 * Build a WBS tree from work orders, task cards, and steps.
 * Structure: WO → Task Cards → Steps
 */
export function buildWBSTree(
  workOrders: WBSWorkOrder[],
  taskCards: WBSTaskCard[],
  steps: WBSStep[],
): WBSNode[] {
  // Group task cards by WO
  const tcByWO = new Map<string, WBSTaskCard[]>();
  for (const tc of taskCards) {
    const list = tcByWO.get(tc.workOrderId) ?? [];
    list.push(tc);
    tcByWO.set(tc.workOrderId, list);
  }

  // Group steps by task card
  const stepsByTC = new Map<string, WBSStep[]>();
  for (const step of steps) {
    const list = stepsByTC.get(step.taskCardId) ?? [];
    list.push(step);
    stepsByTC.set(step.taskCardId, list);
  }

  const tree: WBSNode[] = [];
  let woIndex = 0;

  for (const wo of workOrders) {
    woIndex++;
    const woWbs = `${woIndex}`;
    const woTaskCards = tcByWO.get(wo.id) ?? [];

    const tcNodes: WBSNode[] = [];
    let tcIndex = 0;

    for (const tc of woTaskCards) {
      tcIndex++;
      const tcWbs = `${woWbs}.${tcIndex}`;
      const tcSteps = stepsByTC.get(tc.id) ?? [];

      const stepNodes: WBSNode[] = [];
      let stepIndex = 0;

      for (const step of tcSteps) {
        stepIndex++;
        stepNodes.push({
          id: step.id,
          parentId: tc.id,
          type: "step",
          title: step.title,
          wbsNumber: `${tcWbs}.${stepIndex}`,
          estimatedHours: step.estimatedHours,
          actualHours: step.actualHours,
          percentComplete: step.isComplete ? 100 : 0,
          cost: step.cost,
          children: [],
          depth: 2,
        });
      }

      tcNodes.push({
        id: tc.id,
        parentId: wo.id,
        type: "task_card",
        title: tc.title,
        wbsNumber: tcWbs,
        estimatedHours: tc.estimatedHours,
        actualHours: tc.actualHours,
        percentComplete: tc.percentComplete,
        cost: tc.cost,
        children: stepNodes,
        depth: 1,
      });
    }

    tree.push({
      id: wo.id,
      type: "work_order",
      title: wo.title,
      wbsNumber: woWbs,
      estimatedHours: wo.estimatedHours,
      actualHours: wo.actualHours,
      percentComplete: 0, // computed by rollup
      cost: wo.cost,
      children: tcNodes,
      depth: 0,
    });
  }

  return tree;
}

// ============================================
// Compute Rollup Metrics
// ============================================

/**
 * Compute rollup metrics for a WBS node and all its descendants.
 * Modifies percentComplete, estimatedHours, actualHours, and cost in place
 * based on children's values.
 */
export function computeRollup(node: WBSNode): WBSNode {
  if (node.children.length === 0) {
    return node;
  }

  // Recursively compute children first
  const updatedChildren = node.children.map(computeRollup);

  let totalEstimated = 0;
  let totalActual = 0;
  let totalCost = 0;
  let weightedProgress = 0;
  let totalWeight = 0;

  for (const child of updatedChildren) {
    const est = child.estimatedHours ?? 0;
    const act = child.actualHours ?? 0;
    const cost = child.cost ?? 0;

    totalEstimated += est;
    totalActual += act;
    totalCost += cost;

    // Weight progress by estimated hours (or 1 if no estimate)
    const weight = est > 0 ? est : 1;
    totalWeight += weight;
    weightedProgress += child.percentComplete * weight;
  }

  const percentComplete =
    totalWeight > 0 ? Math.round(weightedProgress / totalWeight) : 0;

  return {
    ...node,
    estimatedHours: totalEstimated,
    actualHours: totalActual,
    cost: totalCost,
    percentComplete,
    children: updatedChildren,
  };
}

/**
 * Compute rollup for an entire WBS tree.
 */
export function computeTreeRollup(tree: WBSNode[]): WBSNode[] {
  return tree.map(computeRollup);
}

// ============================================
// Flatten Tree
// ============================================

/**
 * Flatten WBS tree into display-order array, respecting collapsed state.
 */
export function flattenWBS(
  tree: WBSNode[],
  collapsedIds?: Set<string>,
): WBSNode[] {
  const result: WBSNode[] = [];
  const collapsed = collapsedIds ?? new Set<string>();

  function walk(nodes: WBSNode[]): void {
    for (const node of nodes) {
      result.push(node);
      if (!collapsed.has(node.id) && node.children.length > 0) {
        walk(node.children);
      }
    }
  }

  walk(tree);
  return result;
}

// ============================================
// Summary Statistics
// ============================================

/**
 * Get aggregate rollup statistics for a work order's WBS subtree.
 */
export function getWorkOrderRollup(
  workOrders: WBSWorkOrder[],
  taskCards: WBSTaskCard[],
  steps: WBSStep[],
  workOrderId: string,
): WBSRollup {
  const wo = workOrders.find((w) => w.id === workOrderId);
  if (!wo) {
    return {
      totalEstimatedHours: 0,
      totalActualHours: 0,
      percentComplete: 0,
      totalCost: 0,
      taskCardCount: 0,
      stepCount: 0,
      completedTaskCards: 0,
      completedSteps: 0,
    };
  }

  const woTaskCards = taskCards.filter((tc) => tc.workOrderId === workOrderId);
  const woSteps = steps.filter((s) => s.workOrderId === workOrderId);

  const totalEstimatedHours = woTaskCards.reduce(
    (sum, tc) => sum + (tc.estimatedHours ?? 0),
    0,
  );
  const totalActualHours = woTaskCards.reduce(
    (sum, tc) => sum + (tc.actualHours ?? 0),
    0,
  );
  const totalCost = woTaskCards.reduce((sum, tc) => sum + (tc.cost ?? 0), 0);

  const completedTaskCards = woTaskCards.filter(
    (tc) => tc.percentComplete >= 100,
  ).length;
  const completedSteps = woSteps.filter((s) => s.isComplete).length;

  // Weighted average percent complete
  let weightedProgress = 0;
  let totalWeight = 0;
  for (const tc of woTaskCards) {
    const weight = tc.estimatedHours ?? 1;
    totalWeight += weight;
    weightedProgress += tc.percentComplete * weight;
  }
  const percentComplete =
    totalWeight > 0 ? Math.round(weightedProgress / totalWeight) : 0;

  return {
    totalEstimatedHours,
    totalActualHours,
    percentComplete,
    totalCost,
    taskCardCount: woTaskCards.length,
    stepCount: woSteps.length,
    completedTaskCards,
    completedSteps,
  };
}
