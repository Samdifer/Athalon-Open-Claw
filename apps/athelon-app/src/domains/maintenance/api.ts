/**
 * domains/maintenance/api.ts — Typed API layer for unaccounted maintenance tasks.
 *
 * This module wraps Convex queries/mutations for the unaccounted-tasks workflow.
 * Where Team A backend endpoints are not yet deployed, it provides typed stubs
 * with realistic demo data so the UI can be validated end-to-end.
 *
 * When the real backend is ready, replace the stub implementations with actual
 * Convex useQuery / useMutation calls.
 */

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import type {
  UnaccountedFinding,
  WorkOrderSummary,
  LinkedFindingSummary,
  FindingSource,
  FindingSeverity,
  FindingStatus,
} from "./types";

// ─── STUB GUARD ──────────────────────────────────────────────────────────────
// Set to true when Team A's unaccountedFindings Convex module is deployed.

const BACKEND_READY = false;

// ─── Stub data ───────────────────────────────────────────────────────────────

function makeStubFindings(orgId: string): UnaccountedFinding[] {
  const now = Date.now();
  const day = 86_400_000;
  return [
    {
      _id: "stub-ad-001",
      organizationId: orgId as Id<"organizations">,
      aircraftId: "aircraft-001" as Id<"aircraft">,
      aircraftRegistration: "N123AB",
      aircraftType: "Cessna Citation XLS+",
      source: "ad",
      referenceNumber: "AD 2025-18-03",
      title: "Wing Spar Inspection",
      description: "Repetitive inspection of wing spar lower cap per AD 2025-18-03. Initial compliance within 500 flight hours.",
      severity: "high",
      status: "open",
      adComplianceId: "adcomp-001" as Id<"adCompliance">,
      dueDate: now + 14 * day,
      dueHours: 4850,
      createdAt: now - 30 * day,
    },
    {
      _id: "stub-ad-002",
      organizationId: orgId as Id<"organizations">,
      aircraftId: "aircraft-002" as Id<"aircraft">,
      aircraftRegistration: "N456CD",
      aircraftType: "Beechcraft King Air 350",
      source: "ad",
      referenceNumber: "AD 2024-15-07",
      title: "Fuel Quantity Indicator Replacement",
      description: "Replace fuel quantity indicating system circuit boards. One-time compliance.",
      severity: "medium",
      status: "triaged",
      adComplianceId: "adcomp-002" as Id<"adCompliance">,
      dueDate: now + 45 * day,
      triagedBy: "Devraj Anand",
      triagedAt: now - 5 * day,
      triageNotes: "Parts on order from Honeywell.",
      createdAt: now - 60 * day,
    },
    {
      _id: "stub-sb-001",
      organizationId: orgId as Id<"organizations">,
      aircraftId: "aircraft-001" as Id<"aircraft">,
      aircraftRegistration: "N123AB",
      aircraftType: "Cessna Citation XLS+",
      source: "sb",
      referenceNumber: "SB CAE-72-001",
      title: "Engine Trend Monitoring Update",
      description: "Install updated engine trend monitoring software per manufacturer SB.",
      severity: "low",
      status: "open",
      dueDate: now + 90 * day,
      createdAt: now - 15 * day,
    },
    {
      _id: "stub-sb-002",
      organizationId: orgId as Id<"organizations">,
      aircraftId: "aircraft-003" as Id<"aircraft">,
      aircraftRegistration: "N789EF",
      aircraftType: "Bombardier Challenger 604",
      source: "sb",
      referenceNumber: "SB 601-25-048",
      title: "Oxygen System Regulator Upgrade",
      description: "Replace crew oxygen regulators with upgraded model per manufacturer recommendation.",
      severity: "medium",
      status: "open",
      dueDate: now + 30 * day,
      createdAt: now - 20 * day,
    },
    {
      _id: "stub-pred-001",
      organizationId: orgId as Id<"organizations">,
      aircraftId: "aircraft-002" as Id<"aircraft">,
      aircraftRegistration: "N456CD",
      aircraftType: "Beechcraft King Air 350",
      source: "predicted",
      referenceNumber: "PRED-2026-0042",
      title: "Generator Brush Wear Trending High",
      description: "Trend analysis indicates left generator brushes approaching minimum limits within 200 flight hours. Confidence: 87%.",
      severity: "medium",
      status: "open",
      predictionId: "pred-001" as Id<"maintenancePredictions">,
      dueHours: 4200,
      createdAt: now - 3 * day,
    },
    {
      _id: "stub-pred-002",
      organizationId: orgId as Id<"organizations">,
      aircraftId: "aircraft-001" as Id<"aircraft">,
      aircraftRegistration: "N123AB",
      aircraftType: "Cessna Citation XLS+",
      source: "predicted",
      referenceNumber: "PRED-2026-0038",
      title: "Landing Gear Actuator Seal Degradation",
      description: "Condition monitoring detected elevated hydraulic fluid loss rate consistent with actuator seal degradation. Recommend inspection within next C-check.",
      severity: "high",
      status: "open",
      predictionId: "pred-002" as Id<"maintenancePredictions">,
      dueDate: now - 2 * day, // overdue
      createdAt: now - 10 * day,
    },
    {
      _id: "stub-ad-003",
      organizationId: orgId as Id<"organizations">,
      aircraftId: "aircraft-003" as Id<"aircraft">,
      aircraftRegistration: "N789EF",
      aircraftType: "Bombardier Challenger 604",
      source: "ad",
      referenceNumber: "AD 2023-22-11",
      title: "Horizontal Stabilizer Trim Actuator",
      description: "Inspect and replace horizontal stabilizer trim actuator per recurring AD.",
      severity: "critical",
      status: "linked",
      adComplianceId: "adcomp-003" as Id<"adCompliance">,
      linkedWorkOrderId: "wo-001" as Id<"workOrders">,
      linkedWorkOrderNumber: "WO-2026-0198",
      dueDate: now + 7 * day,
      createdAt: now - 45 * day,
    },
    {
      _id: "stub-pred-003",
      organizationId: orgId as Id<"organizations">,
      aircraftId: "aircraft-003" as Id<"aircraft">,
      aircraftRegistration: "N789EF",
      aircraftType: "Bombardier Challenger 604",
      source: "predicted",
      referenceNumber: "PRED-2026-0045",
      title: "APU Start Valve Degradation",
      description: "Start time trending +12% over last 50 cycles. Replacement recommended before exceeding limits.",
      severity: "low",
      status: "dismissed",
      dismissedReason: "APU scheduled for overhaul at next heavy check — valve will be replaced.",
      dismissedBy: "Marcus Webb",
      dismissedAt: now - 2 * day,
      predictionId: "pred-003" as Id<"maintenancePredictions">,
      createdAt: now - 8 * day,
    },
  ];
}

function makeStubWorkOrders(orgId: string): WorkOrderSummary[] {
  return [
    {
      _id: "wo-001" as Id<"workOrders">,
      workOrderNumber: "WO-2026-0198",
      description: "C-Check — N789EF",
      status: "in_progress",
      aircraftRegistration: "N789EF",
    },
    {
      _id: "wo-002" as Id<"workOrders">,
      workOrderNumber: "WO-2026-0201",
      description: "Phase Inspection — N123AB",
      status: "open",
      aircraftRegistration: "N123AB",
    },
    {
      _id: "wo-003" as Id<"workOrders">,
      workOrderNumber: "WO-2026-0205",
      description: "Hot Section Inspection — N456CD",
      status: "open",
      aircraftRegistration: "N456CD",
    },
  ];
}

// ─── Hooks ───────────────────────────────────────────────────────────────────

/**
 * Fetch all unaccounted findings for the current org.
 * Returns undefined while loading (matches Convex useQuery convention).
 */
export function useUnaccountedFindings(
  orgId: Id<"organizations"> | undefined,
): UnaccountedFinding[] | undefined {
  // When backend is ready, this becomes:
  // return useQuery(api.unaccountedFindings.list, orgId ? { organizationId: orgId } : "skip");

  if (!orgId) return undefined;
  if (BACKEND_READY) {
    // Placeholder for real query — leave as stub until Team A deploys
    return undefined;
  }
  return makeStubFindings(orgId);
}

/**
 * Fetch work orders available for association (open/in-progress).
 */
export function useAvailableWorkOrders(
  orgId: Id<"organizations"> | undefined,
): WorkOrderSummary[] | undefined {
  if (!orgId) return undefined;
  if (BACKEND_READY) {
    return undefined;
  }
  return makeStubWorkOrders(orgId);
}

/**
 * Fetch linked findings for a specific work order.
 */
export function useLinkedFindings(
  workOrderId: Id<"workOrders"> | undefined,
): LinkedFindingSummary[] | undefined {
  if (!workOrderId) return undefined;
  if (BACKEND_READY) {
    return undefined;
  }
  // Stub: return findings linked to the given WO
  const allFindings = makeStubFindings("stub-org");
  return allFindings
    .filter((f) => f.linkedWorkOrderId === workOrderId)
    .map((f) => ({
      _id: f._id,
      source: f.source,
      referenceNumber: f.referenceNumber,
      title: f.title,
      severity: f.severity,
      status: f.status,
      linkedAt: f.updatedAt ?? f.createdAt,
    }));
}

// ─── Action stubs ────────────────────────────────────────────────────────────
// These return async functions that simulate backend mutations.
// Replace with useMutation(api.unaccountedFindings.xxx) when ready.

export function useTriageFinding() {
  return async (findingId: string, notes: string, severity?: FindingSeverity) => {
    if (BACKEND_READY) {
      throw new Error("Wire to real mutation");
    }
    console.log("[stub] triage finding", findingId, notes, severity);
    return { success: true };
  };
}

export function useLinkToWorkOrder() {
  return async (findingId: string, workOrderId: Id<"workOrders">) => {
    if (BACKEND_READY) {
      throw new Error("Wire to real mutation");
    }
    console.log("[stub] link finding to WO", findingId, workOrderId);
    return { success: true };
  };
}

export function useCreateWorkOrderFromFinding() {
  return async (
    findingId: string,
    description: string,
    priority: string,
    aircraftId: Id<"aircraft">,
  ) => {
    if (BACKEND_READY) {
      throw new Error("Wire to real mutation");
    }
    console.log("[stub] create WO from finding", findingId, description, priority, aircraftId);
    return { success: true, workOrderId: "wo-new-001" };
  };
}

export function useDeferFinding() {
  return async (findingId: string, reason: string, deferUntil?: number) => {
    if (BACKEND_READY) {
      throw new Error("Wire to real mutation");
    }
    console.log("[stub] defer finding", findingId, reason, deferUntil);
    return { success: true };
  };
}

export function useDismissFinding() {
  return async (findingId: string, reason: string) => {
    if (BACKEND_READY) {
      throw new Error("Wire to real mutation");
    }
    console.log("[stub] dismiss finding", findingId, reason);
    return { success: true };
  };
}

export function useUnlinkFinding() {
  return async (findingId: string, workOrderId: Id<"workOrders">) => {
    if (BACKEND_READY) {
      throw new Error("Wire to real mutation");
    }
    console.log("[stub] unlink finding", findingId, workOrderId);
    return { success: true };
  };
}
