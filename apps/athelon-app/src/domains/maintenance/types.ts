/**
 * domains/maintenance/types.ts — Typed interfaces for unaccounted maintenance tasks.
 *
 * "Unaccounted" means an AD compliance item, SB (manufacturer recommendation),
 * or predictive-maintenance finding that has no linked work order yet.
 *
 * These types provide the contract between the UI and backend APIs (Team A).
 * Where the backend is not yet deployed, the API layer returns typed stubs.
 */

import type { Id } from "@/convex/_generated/dataModel";

// ─── Finding source categories ───────────────────────────────────────────────

export type FindingSource = "ad" | "sb" | "predicted";

export type FindingSeverity = "low" | "medium" | "high" | "critical";

export type FindingStatus =
  | "open"
  | "triaged"
  | "linked"
  | "deferred"
  | "dismissed";

export type LinkageStatus = "linked" | "unlinked";

export type DueWindow = "overdue" | "due_soon" | "upcoming" | "no_date";

// ─── Core finding shape ──────────────────────────────────────────────────────

export interface UnaccountedFinding {
  _id: string;
  organizationId: Id<"organizations">;
  aircraftId: Id<"aircraft">;
  aircraftRegistration: string;
  aircraftType: string; // e.g. "Cessna Citation XLS"

  source: FindingSource;
  /** AD number, SB number, or prediction ID reference */
  referenceNumber: string;
  title: string;
  description: string;
  severity: FindingSeverity;
  status: FindingStatus;

  /** Source record IDs */
  adComplianceId?: Id<"adCompliance">;
  predictionId?: Id<"maintenancePredictions">;

  /** Linkage to work order */
  linkedWorkOrderId?: Id<"workOrders">;
  linkedWorkOrderNumber?: string;

  /** Due tracking */
  dueDate?: number;
  dueHours?: number;

  /** Triage metadata */
  triagedBy?: string;
  triagedAt?: number;
  triageNotes?: string;

  /** Defer/dismiss metadata */
  deferredReason?: string;
  deferredUntil?: number;
  dismissedReason?: string;
  dismissedBy?: string;
  dismissedAt?: number;

  createdAt: number;
  updatedAt?: number;
}

// ─── Filter state ────────────────────────────────────────────────────────────

export interface UnaccountedFilters {
  tab: FindingSource | "all";
  search: string;
  aircraftId: string; // "all" or Id<"aircraft">
  status: FindingStatus | "";
  severity: FindingSeverity | "";
  linkage: LinkageStatus | "";
  dueWindow: DueWindow | "";
}

// ─── Action payloads ─────────────────────────────────────────────────────────

export interface TriageFindingPayload {
  findingId: string;
  notes: string;
  severity?: FindingSeverity;
}

export interface LinkToWorkOrderPayload {
  findingId: string;
  workOrderId: Id<"workOrders">;
}

export interface CreateWorkOrderFromFindingPayload {
  findingId: string;
  description: string;
  priority: "routine" | "urgent" | "aog";
  aircraftId: Id<"aircraft">;
}

export interface DeferFindingPayload {
  findingId: string;
  reason: string;
  deferUntil?: number;
}

export interface DismissFindingPayload {
  findingId: string;
  reason: string;
}

export interface UnlinkFindingPayload {
  findingId: string;
  workOrderId: Id<"workOrders">;
}

// ─── Work order summary for association ──────────────────────────────────────

export interface WorkOrderSummary {
  _id: Id<"workOrders">;
  workOrderNumber: string;
  description: string;
  status: string;
  aircraftRegistration: string;
}

// ─── Linked finding for WO detail panel ──────────────────────────────────────

export interface LinkedFindingSummary {
  _id: string;
  source: FindingSource;
  referenceNumber: string;
  title: string;
  severity: FindingSeverity;
  status: FindingStatus;
  linkedAt?: number;
}
