/**
 * MRO Scheduling Engine — Core Types
 *
 * All types used across the scheduling engine modules.
 * Uses Convex Id types where appropriate for type safety.
 */

import type { Id } from "@/convex/_generated/dataModel";

// ============================================
// Enums / Unions
// ============================================

export type DependencyType = "FS" | "FF" | "SS" | "SF";

export type WorkOrderPriority = "aog" | "urgent" | "routine" | "deferred";

export type TechnicianRole =
  | "admin"
  | "shop_manager"
  | "qcm_inspector"
  | "billing_manager"
  | "lead_technician"
  | "technician"
  | "parts_clerk"
  | "sales_rep"
  | "sales_manager"
  | "read_only";

export type TaskCardType =
  | "inspection"
  | "repair"
  | "replacement"
  | "ad_compliance"
  | "functional_check"
  | "rigging"
  | "return_to_service"
  | "overhaul"
  | "modification";

export type TaskCardStatus =
  | "not_started"
  | "in_progress"
  | "incomplete_na_steps"
  | "complete"
  | "voided";

export type WorkOrderStatus =
  | "draft"
  | "open"
  | "in_progress"
  | "pending_parts"
  | "pending_inspection"
  | "complete"
  | "closed"
  | "voided";

export type HangarBayType = "hangar" | "ramp" | "paint";

export type HangarBayStatus = "available" | "occupied" | "maintenance";

export type ShiftName = "day" | "swing" | "night";

export type ProjectStatus = "on_track" | "at_risk" | "over_budget" | "behind_schedule";

// ============================================
// Shift Definitions
// ============================================

export interface ShiftDefinition {
  name: ShiftName;
  startHour: number; // 0-23
  endHour: number;   // 0-23 (wraps past midnight for night shift)
  hoursPerShift: number;
}

export const SHIFTS: Record<ShiftName, ShiftDefinition> = {
  day:   { name: "day",   startHour: 6,  endHour: 14.5, hoursPerShift: 8.5 },
  swing: { name: "swing", startHour: 14.5, endHour: 23, hoursPerShift: 8.5 },
  night: { name: "night", startHour: 23, endHour: 6,    hoursPerShift: 7 },
};

// ============================================
// Scheduled Work Order
// ============================================

export interface ScheduledWorkOrder {
  id: string;
  workOrderId: Id<"workOrders">;
  aircraftId: Id<"aircraft">;
  organizationId: Id<"organizations">;
  priority: WorkOrderPriority;
  status: WorkOrderStatus;
  hangarBayId?: Id<"hangarBays">;
  startDate?: number;   // epoch ms
  dueDate?: number;     // epoch ms
  estimatedHours?: number;
  /** Approved quote amount (BAC for EVM) */
  approvedQuoteAmount?: number;
}

// ============================================
// Scheduled Task Card
// ============================================

export interface ScheduledTaskCard {
  id: string;
  taskCardId: Id<"taskCards">;
  workOrderId: Id<"workOrders">;
  taskType: TaskCardType;
  status: TaskCardStatus;
  assignedToTechnicianId?: Id<"technicians">;
  startDate?: number;   // epoch ms
  dueDate?: number;     // epoch ms
  estimatedHours?: number;
  actualHours?: number;
  /** 0-100 completion percentage */
  percentComplete?: number;
  /** Whether this card has a QCM inspection hold point after completion */
  hasInspectionHold?: boolean;
  /** Parts cost incurred */
  partsCost?: number;
  /** Labor cost incurred */
  laborCost?: number;
}

// ============================================
// MRO Dependency
// ============================================

export interface MRODependency {
  predecessorId: string;   // ScheduledTaskCard.id or ScheduledWorkOrder.id
  successorId: string;
  type: DependencyType;
  lagDays?: number;        // positive = lag, negative = lead
  /** Whether this is a QCM inspection hold point */
  isInspectionHold?: boolean;
}

// ============================================
// Hangar Bay
// ============================================

export interface HangarBay {
  id: string;
  hangarBayId: Id<"hangarBays">;
  organizationId: Id<"organizations">;
  name: string;
  type: HangarBayType;
  capacity: number;
  status: HangarBayStatus;
  currentAircraftId?: Id<"aircraft">;
  currentWorkOrderId?: Id<"workOrders">;
}

// ============================================
// Technician Resource
// ============================================

export interface TechnicianResource {
  id: string;
  technicianId: Id<"technicians">;
  organizationId: Id<"organizations">;
  name: string;
  role: TechnicianRole;
  /** Certifications held (e.g., "A&P", "IA") */
  certifications: string[];
  shift: ShiftName;
  hoursPerDay: number;
  /** Day-of-week indices off (0=Sun, 6=Sat) */
  daysOff: number[];
  /** Efficiency multiplier (1.0 = standard) */
  efficiencyMultiplier: number;
}

// ============================================
// MRO Constraint
// ============================================

export type MROConstraintType =
  | "hangar_bay"          // Aircraft must occupy a bay
  | "inspection_hold"     // QCM must sign off before next task
  | "certification"       // Tech must hold required cert
  | "parts_availability"  // Parts must be in stock
  | "shift_coverage"      // Must have coverage on assigned shift
  | "concurrent_limit";   // Max concurrent WOs in a bay

export interface MROConstraint {
  type: MROConstraintType;
  description: string;
  /** ID of the entity this constraint applies to */
  entityId: string;
  /** Whether this constraint is currently satisfied */
  satisfied: boolean;
  /** Blocking entity ID if not satisfied */
  blockedBy?: string;
}

// ============================================
// WBS Node (for work breakdown structure)
// ============================================

export interface WBSNode {
  id: string;
  parentId?: string;
  type: "work_order" | "task_card" | "step";
  title: string;
  wbsNumber: string;
  estimatedHours?: number;
  actualHours?: number;
  percentComplete: number;
  cost?: number;
  children: WBSNode[];
  depth: number;
}
