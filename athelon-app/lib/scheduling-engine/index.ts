/**
 * MRO Scheduling Engine — Barrel Export
 *
 * Pure TypeScript scheduling algorithms for aviation MRO:
 * - Cascade scheduling with AOG priority override
 * - Critical path method (CPM)
 * - Resource leveling with certification & shift constraints
 * - Earned value management (EVM)
 * - Work breakdown structure (WBS)
 */

// Types
export type {
  DependencyType,
  HangarBay,
  HangarBayStatus,
  HangarBayType,
  MROConstraint,
  MROConstraintType,
  MRODependency,
  ProjectStatus,
  ScheduledTaskCard,
  ScheduledWorkOrder,
  ShiftDefinition,
  ShiftName,
  TaskCardStatus,
  TaskCardType,
  TechnicianResource,
  TechnicianRole,
  WBSNode,
  WorkOrderPriority,
  WorkOrderStatus,
} from "./types";

export { SHIFTS } from "./types";

// Cascade Scheduler
export {
  computeCascade,
  computeCascadeForItem,
  workOrderToCascadeItem,
  taskCardToCascadeItem,
} from "./cascade-scheduler";
export type { CascadeItem, CascadeResult, DateChange } from "./cascade-scheduler";

// Critical Path
export {
  computeCriticalPath,
  getCriticalItemIds,
  getItemFloat,
  workOrderToCPMItem,
  taskCardToCPMItem,
} from "./critical-path";
export type { CPMItem, CriticalPathResult, ItemSchedule } from "./critical-path";

// Resource Leveling
export { levelResources } from "./resource-leveling";
export type {
  LevelingTask,
  LeveledTask,
  LevelingResult,
  OverallocationWarning,
  CertificationViolation,
} from "./resource-leveling";

// Earned Value Management
export {
  calculateEVM,
  calculateWorkOrderEVM,
  generateSCurveData,
  taskCardToEVMTask,
} from "./earned-value";
export type { EVMTaskCard, EVMResult } from "./earned-value";

// Work Breakdown Structure
export {
  buildWBSTree,
  computeRollup,
  computeTreeRollup,
  flattenWBS,
  getWorkOrderRollup,
} from "./wbs";
export type {
  WBSWorkOrder,
  WBSTaskCard,
  WBSStep,
  WBSRollup,
} from "./wbs";
