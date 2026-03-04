/**
 * Earned Value Management (EVM) for MRO
 *
 * BAC from approved quotes, AC from time entries + parts cost,
 * EV from task card completion percentage.
 * Project status derivation for MRO context.
 *
 * Pure function: no side effects, no database calls.
 */

import type { ProjectStatus, ScheduledTaskCard, ScheduledWorkOrder } from "./types";

// ============================================
// Types
// ============================================

export interface EVMTaskCard {
  id: string;
  startDate: number;
  dueDate: number;
  /** Budgeted cost for this task card (portion of WO quote) */
  budgetedCost: number;
  /** Estimated hours */
  estimatedHours: number;
  /** Actual hours logged */
  actualHours: number;
  /** Completion percentage 0-100 */
  percentComplete: number;
  /** Actual parts cost */
  partsCost: number;
  /** Labor rate per hour */
  laborRate: number;
}

export interface EVMResult {
  /** Budget at Completion — total approved quote */
  bac: number;
  /** Planned Value */
  pv: number;
  /** Earned Value */
  ev: number;
  /** Actual Cost (labor + parts) */
  ac: number;
  /** Schedule Variance */
  sv: number;
  /** Cost Variance */
  cv: number;
  /** Schedule Performance Index */
  spi: number;
  /** Cost Performance Index */
  cpi: number;
  /** Estimate at Completion */
  eac: number;
  /** Estimate to Complete */
  etc: number;
  /** Variance at Completion */
  vac: number;
  /** To-Complete Performance Index */
  tcpi: number;
  /** Project status */
  status: ProjectStatus;
}

// ============================================
// Helpers
// ============================================

function round(value: number, decimals: number = 2): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

function plannedProgress(task: EVMTaskCard, asOfDate: number): number {
  const start = task.startDate;
  const end = task.dueDate;

  if (asOfDate <= start) return 0;
  if (asOfDate >= end) return 1;
  if (end === start) return 1;

  return (asOfDate - start) / (end - start);
}

function deriveStatus(spi: number, cpi: number): ProjectStatus {
  const behindSchedule = spi < 0.9;
  const overBudget = cpi < 0.9;

  if (overBudget) return "over_budget";
  if (behindSchedule) return "behind_schedule";
  if (spi < 1.0 || cpi < 1.0) return "at_risk";
  return "on_track";
}

// ============================================
// Converters
// ============================================

/**
 * Convert a ScheduledTaskCard to an EVMTaskCard.
 * Requires laborRate and budgetedCost to be provided externally.
 */
export function taskCardToEVMTask(
  tc: ScheduledTaskCard,
  budgetedCost: number,
  laborRate: number,
): EVMTaskCard {
  return {
    id: tc.id,
    startDate: tc.startDate ?? 0,
    dueDate: tc.dueDate ?? 0,
    budgetedCost,
    estimatedHours: tc.estimatedHours ?? 0,
    actualHours: tc.actualHours ?? 0,
    percentComplete: tc.percentComplete ?? 0,
    partsCost: tc.partsCost ?? 0,
    laborRate,
  };
}

// ============================================
// Main EVM Calculation
// ============================================

/**
 * Calculate EVM metrics for MRO task cards as of a given date.
 *
 * Key MRO adaptations:
 * - BAC comes from approved WO quotes
 * - AC = (actual hours × labor rate) + parts cost
 * - EV = (percent complete / 100) × budgeted cost
 */
export function calculateEVM(
  tasks: EVMTaskCard[],
  asOfDate: number,
): EVMResult {
  // BAC: total budgeted cost
  const bac = tasks.reduce((sum, t) => sum + t.budgetedCost, 0);

  // PV: planned progress × budgeted cost
  const pv = tasks.reduce(
    (sum, t) => sum + plannedProgress(t, asOfDate) * t.budgetedCost,
    0,
  );

  // EV: actual progress × budgeted cost
  const ev = tasks.reduce(
    (sum, t) => sum + (t.percentComplete / 100) * t.budgetedCost,
    0,
  );

  // AC: actual labor cost + parts cost
  const ac = tasks.reduce(
    (sum, t) => sum + t.actualHours * t.laborRate + t.partsCost,
    0,
  );

  const sv = ev - pv;
  const cv = ev - ac;
  const spi = pv !== 0 ? ev / pv : 1;
  const cpi = ac !== 0 ? ev / ac : 1;
  const eac = cpi !== 0 ? bac / cpi : bac;
  const etc = Math.max(0, eac - ac);
  const vac = bac - eac;

  const remainingWork = bac - ev;
  const remainingBudget = bac - ac;
  const tcpi = remainingBudget > 0 ? remainingWork / remainingBudget : Infinity;

  const status = deriveStatus(spi, cpi);

  return {
    bac: round(bac),
    pv: round(pv),
    ev: round(ev),
    ac: round(ac),
    sv: round(sv),
    cv: round(cv),
    spi: round(spi, 3),
    cpi: round(cpi, 3),
    eac: round(eac),
    etc: round(etc),
    vac: round(vac),
    tcpi: tcpi === Infinity ? Infinity : round(tcpi, 3),
    status,
  };
}

/**
 * Calculate EVM for an entire work order from its task cards.
 */
export function calculateWorkOrderEVM(
  wo: ScheduledWorkOrder,
  taskCards: EVMTaskCard[],
  asOfDate: number,
): EVMResult {
  return calculateEVM(taskCards, asOfDate);
}

/**
 * Generate S-curve data points for charting PV, EV, and AC over time.
 */
export function generateSCurveData(
  tasks: EVMTaskCard[],
  projectStart: number,
  projectEnd: number,
  intervalDays: number = 7,
): Array<{ date: string; pv: number; ev: number; ac: number }> {
  const data: Array<{ date: string; pv: number; ev: number; ac: number }> = [];
  const MS_PER_DAY = 86_400_000;
  const interval = intervalDays * MS_PER_DAY;

  for (let t = projectStart; t <= projectEnd; t += interval) {
    const result = calculateEVM(tasks, t);
    data.push({
      date: new Date(t).toISOString().slice(0, 10),
      pv: result.pv,
      ev: result.ev,
      ac: result.ac,
    });
  }

  const lastDate = data[data.length - 1]?.date;
  const endStr = new Date(projectEnd).toISOString().slice(0, 10);
  if (lastDate !== endStr) {
    const result = calculateEVM(tasks, projectEnd);
    data.push({
      date: endStr,
      pv: result.pv,
      ev: result.ev,
      ac: result.ac,
    });
  }

  return data;
}
