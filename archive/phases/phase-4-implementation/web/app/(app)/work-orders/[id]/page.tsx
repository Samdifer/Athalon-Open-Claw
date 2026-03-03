/**
 * app/(app)/work-orders/[id]/page.tsx
 * Athelon — Work Order Detail Page
 *
 * Chloe Park, 2026-02-22
 *
 * The core operational view for a work order in progress. Shows everything
 * needed to track, complete, and close a work order.
 *
 * Route: /work-orders/[id]
 *
 * Sections:
 *   - Header: WO number, status, aircraft, customer, dates, priority
 *   - Quick stats: task card progress, open discrepancies, parts on order
 *   - Tabs: Task Cards | Discrepancies | Parts | Notes
 *   - Sticky close WO button (supervisor+ only; disabled until getCloseReadiness passes)
 *
 * Data:
 *   useQuery(api.workOrders.get, { id })             → work order detail
 *   useQuery(api.taskCards.listByWorkOrder, ...)     → task card list
 *   useQuery(api.discrepancies.listByWorkOrder, ...) → discrepancy list
 *   useQuery(api.parts.listByWorkOrder, ...)         → parts linked to this WO
 *   useQuery(api.workOrders.getCloseReadiness, ...)  → readiness check (lazy)
 *
 * Role gates:
 *   - Add Task Card: supervisor+ (can("addTaskCard"))
 *   - Close WO: supervisor+ (isAtLeast("supervisor"))
 *   - Approve RTS: inspector+ (can("approveRts"))
 *   - View all tabs: everyone
 */

"use client";

import React, { useState, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { cn } from "@/lib/utils";
import {
  StatusBadge,
  workOrderStatusToVariant,
  taskCardStatusToVariant,
} from "@/components/StatusBadge";
import { useOrgRole } from "@/lib/auth";

// TODO: Replace with real import once Convex is deployed:
// import { api } from "@/convex/_generated/api";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const api = {} as any;

// ---------------------------------------------------------------------------
// Types — mirror Convex schema; swap for Doc<"..."> when deployed
// ---------------------------------------------------------------------------

interface WorkOrderDetail {
  _id: string;
  _creationTime: number;
  workOrderNumber: string;
  organizationId: string;
  aircraftId: string;
  tailNumber: string;           // Denormalized
  aircraftMake: string;         // Denormalized
  aircraftModel: string;        // Denormalized
  aircraftSerialNumber: string; // Denormalized
  customerId?: string;
  customerName?: string;        // Denormalized
  workOrderType: string;
  description: string;
  status: string;
  priority: "routine" | "urgent" | "aog";
  openedAt: number;
  openedByName: string;         // Denormalized
  targetCompletionDate?: number;
  closedAt?: number;
  onHoldReason?: string;
  onHoldSince?: number;
  aircraftTotalTimeAtOpen: number;
  // Denormalized counters (maintained by mutations)
  totalTaskCards: number;
  signedTaskCards: number;
  openDiscrepancies: number;
  openPartsRequests: number;
  partsOnOrder: number;
  returnedToService: boolean;
  returnToServiceId?: string;
  notes?: string;
}

interface TaskCardListItem {
  _id: string;
  taskCardNumber: string;
  title: string;
  taskType: string;
  status: string;
  stepCount: number;
  completedStepCount: number;
  naStepCount: number;
  assignedTechName?: string;
  startedAt?: number;
  completedAt?: number;
  notes?: string;
}

interface DiscrepancyItem {
  _id: string;
  discrepancyNumber: string;
  description: string;
  status: "open" | "under_evaluation" | "dispositioned";
  disposition?: string;
  componentAffected?: string;
  foundByTechName: string;
  foundAt: number;
  melItemNumber?: string;
  melCategory?: string;
  melExpiryDate?: number;
}

interface WorkOrderPartItem {
  _id: string;
  partNumber: string;
  partName: string;
  serialNumber?: string;
  quantity: number;
  action: "installed" | "removed" | "overhauled" | "repaired" | "inspected";
  condition: string;
  eightOneThirtyReference?: string;
  issuedAt?: number;
  issuedByTechName?: string;
  taskCardNumber?: string;
}

interface CloseReadiness {
  ready: boolean;
  blockers: string[];
  warnings: string[];
  unsignedTaskCards: number;
  openDiscrepancies: number;
  pendingPartsRequests: number;
  hasReturnToService: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const WORK_ORDER_TYPE_LABELS: Record<string, string> = {
  routine: "Routine Maintenance",
  unscheduled: "Unscheduled Maintenance",
  annual_inspection: "Annual Inspection",
  "100hr_inspection": "100-Hour Inspection",
  progressive_inspection: "Progressive Inspection",
  ad_compliance: "AD Compliance",
  major_repair: "Major Repair",
  major_alteration: "Major Alteration",
  field_approval: "Field Approval",
  ferry_permit: "Ferry Permit",
};

function formatDate(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

function formatHours(hours: number): string {
  return `${hours.toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} hr`;
}

function formatElapsed(openedAtMs: number): string {
  const diffMs = Date.now() - openedAtMs;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  if (diffDays > 0) return `${diffDays}d`;
  if (diffHours > 0) return `${diffHours}h`;
  return "<1h";
}

const TASK_TYPE_LABELS: Record<string, string> = {
  inspection: "Inspection",
  repair: "Repair",
  replacement: "Replacement",
  ad_compliance: "AD Compliance",
  functional_check: "Functional Check",
  rigging: "Rigging",
  return_to_service: "Return to Service",
  overhaul: "Overhaul",
  modification: "Modification",
};

// ---------------------------------------------------------------------------
// Skeleton components
// ---------------------------------------------------------------------------

function WorkOrderHeaderSkeleton() {
  return (
    <div className="animate-pulse px-4 pt-6 pb-4 sm:px-6">
      {/* Back link placeholder */}
      <div className="h-4 w-32 rounded bg-[#2E3445] mb-4" />
      {/* WO number + badge */}
      <div className="flex items-center gap-3 mb-3">
        <div className="h-6 w-24 rounded bg-[#2E3445]" />
        <div className="h-6 w-20 rounded bg-[#2E3445]" />
      </div>
      {/* Title */}
      <div className="h-7 w-72 rounded bg-[#2E3445] mb-2" />
      {/* Meta row */}
      <div className="flex gap-4 mt-3">
        <div className="h-4 w-28 rounded bg-[#242936]" />
        <div className="h-4 w-32 rounded bg-[#242936]" />
        <div className="h-4 w-24 rounded bg-[#242936]" />
      </div>
    </div>
  );
}

function TaskCardListSkeleton() {
  return (
    <div className="flex flex-col gap-2 animate-pulse" aria-busy="true" aria-label="Loading task cards">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="rounded-[6px] border border-[#363D4E] bg-[#1A1E28] p-3.5"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="h-5 w-16 rounded bg-[#2E3445]" />
            <div className="h-5 w-32 rounded bg-[#2E3445]" />
            <div className="h-5 w-20 rounded bg-[#2E3445] ml-auto" />
          </div>
          <div className="h-4 w-48 rounded bg-[#242936]" />
        </div>
      ))}
    </div>
  );
}

function DiscrepancyListSkeleton() {
  return (
    <div className="flex flex-col gap-2 animate-pulse" aria-busy="true">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="rounded-[6px] border border-[#363D4E] bg-[#1A1E28] p-3.5">
          <div className="h-4 w-48 rounded bg-[#2E3445] mb-2" />
          <div className="h-4 w-64 rounded bg-[#242936]" />
        </div>
      ))}
    </div>
  );
}

function PartsListSkeleton() {
  return (
    <div className="flex flex-col gap-2 animate-pulse" aria-busy="true">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="rounded-[6px] border border-[#363D4E] bg-[#1A1E28] p-3.5">
          <div className="flex gap-3 mb-2">
            <div className="h-4 w-28 rounded bg-[#2E3445]" />
            <div className="h-4 w-40 rounded bg-[#242936]" />
          </div>
          <div className="h-4 w-36 rounded bg-[#242936]" />
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab definition
// ---------------------------------------------------------------------------

type WOTab = "task_cards" | "discrepancies" | "parts" | "notes";

interface TabDef {
  id: WOTab;
  label: string;
  getCount?: (wo: WorkOrderDetail) => number | undefined;
}

const WO_TABS: TabDef[] = [
  {
    id: "task_cards",
    label: "Task Cards",
    getCount: (wo) => wo.totalTaskCards,
  },
  {
    id: "discrepancies",
    label: "Discrepancies",
    getCount: (wo) => (wo.openDiscrepancies > 0 ? wo.openDiscrepancies : undefined),
  },
  { id: "parts", label: "Parts" },
  { id: "notes", label: "Notes" },
];

// ---------------------------------------------------------------------------
// Close WO readiness dialog
// ---------------------------------------------------------------------------

function CloseReadinessModal({
  readiness,
  onConfirmClose,
  onDismiss,
  isClosing,
}: {
  readiness: CloseReadiness;
  onConfirmClose: () => void;
  onDismiss: () => void;
  isClosing: boolean;
}) {
  return (
    <div
      className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="close-readiness-title"
    >
      <div className="w-full max-w-md rounded-[12px] border border-[#363D4E] bg-[#1A1E28] p-5">
        <h2
          id="close-readiness-title"
          className="text-[18px] font-semibold text-gray-100 mb-1"
        >
          Close Work Order?
        </h2>

        {readiness.ready ? (
          <>
            <p className="text-[14px] text-gray-400 mb-4">
              All requirements are met. This work order is ready to close.
            </p>
            <div className="rounded-[6px] border border-green-800/50 bg-green-950/30 px-3 py-3 mb-4">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-green-400" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <polyline points="3,8 7,12 13,4" />
                </svg>
                <span className="text-[13px] text-green-300 font-medium">
                  All task cards signed
                </span>
              </div>
              <div className="flex items-center gap-2 mt-1.5">
                <svg className="w-4 h-4 text-green-400" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <polyline points="3,8 7,12 13,4" />
                </svg>
                <span className="text-[13px] text-green-300">
                  All discrepancies dispositioned
                </span>
              </div>
              {readiness.hasReturnToService && (
                <div className="flex items-center gap-2 mt-1.5">
                  <svg className="w-4 h-4 text-green-400" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <polyline points="3,8 7,12 13,4" />
                  </svg>
                  <span className="text-[13px] text-green-300">
                    Return to Service record exists
                  </span>
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            <p className="text-[14px] text-amber-400 mb-3">
              Cannot close — {readiness.blockers.length} issue
              {readiness.blockers.length !== 1 ? "s" : ""} must be resolved first.
            </p>
            <ul className="space-y-2 mb-4">
              {readiness.blockers.map((blocker, i) => (
                <li key={i} className="flex items-start gap-2 text-[13px] text-red-400">
                  <svg className="w-4 h-4 shrink-0 mt-0.5" viewBox="0 0 8 8" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" aria-hidden>
                    <line x1="1.5" y1="1.5" x2="6.5" y2="6.5" />
                    <line x1="6.5" y1="1.5" x2="1.5" y2="6.5" />
                  </svg>
                  {blocker}
                </li>
              ))}
            </ul>
            {readiness.warnings.length > 0 && (
              <ul className="space-y-1 mb-4">
                {readiness.warnings.map((w, i) => (
                  <li key={i} className="flex items-start gap-2 text-[12px] text-amber-400">
                    <svg className="w-3 h-3 shrink-0 mt-0.5" viewBox="0 0 10 9" fill="currentColor" aria-hidden>
                      <path d="M5 0.5L9.5 8.5H0.5L5 0.5Z" />
                    </svg>
                    {w}
                  </li>
                ))}
              </ul>
            )}
          </>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onDismiss}
            className={cn(
              "flex-1 h-12 rounded-[6px]",
              "border border-[#363D4E] bg-[#1A1E28]",
              "text-[14px] text-gray-400 hover:text-gray-200 transition-colors",
            )}
          >
            {readiness.ready ? "Cancel" : "Back"}
          </button>
          {readiness.ready && (
            <button
              type="button"
              onClick={onConfirmClose}
              disabled={isClosing}
              className={cn(
                "flex-[2] h-12 rounded-[6px]",
                "bg-green-700 hover:bg-green-600 text-white",
                "text-[14px] font-semibold uppercase tracking-[0.04em]",
                "transition-colors duration-100",
                "disabled:opacity-50 disabled:cursor-not-allowed",
              )}
            >
              {isClosing ? "Closing…" : "Close Work Order"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Task Cards tab content
// ---------------------------------------------------------------------------

function TaskCardsTab({
  workOrderId,
  taskCards,
  canAddTaskCard,
  woStatus,
}: {
  workOrderId: string;
  taskCards: TaskCardListItem[] | undefined;
  canAddTaskCard: boolean;
  woStatus: string;
}) {
  const isClosed =
    woStatus === "closed" || woStatus === "cancelled" || woStatus === "voided";

  if (taskCards === undefined) return <TaskCardListSkeleton />;

  return (
    <div>
      {/* Header row */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-[13px] text-gray-500">
          {taskCards.length} task card{taskCards.length !== 1 ? "s" : ""}
          {taskCards.length > 0 && (
            <>
              {" — "}
              <span className="text-gray-400">
                {taskCards.filter((tc) => tc.status === "complete").length}/
                {taskCards.length} complete
              </span>
            </>
          )}
        </p>
        {canAddTaskCard && !isClosed && (
          <Link
            href={`/work-orders/${workOrderId}/task-cards/new`}
            className={cn(
              "inline-flex items-center gap-1.5 px-3 h-9 rounded-[6px]",
              "border border-[#363D4E] bg-[#1A1E28]",
              "text-[13px] font-medium text-gray-300 hover:text-white hover:bg-[#2E3445]",
              "transition-colors duration-100",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400",
            )}
          >
            <svg aria-hidden className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="8" y1="3" x2="8" y2="13" />
              <line x1="3" y1="8" x2="13" y2="8" />
            </svg>
            Add Task Card
          </Link>
        )}
      </div>

      {taskCards.length === 0 ? (
        <div
          className={cn(
            "rounded-[6px] border border-[#363D4E] border-dashed",
            "flex flex-col items-center py-10 px-4 text-center",
          )}
        >
          <svg aria-hidden className="w-10 h-10 text-gray-700 mb-3" viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="8" y="6" width="24" height="28" rx="2" />
            <line x1="14" y1="14" x2="26" y2="14" />
            <line x1="14" y1="20" x2="22" y2="20" />
            <line x1="14" y1="26" x2="20" y2="26" />
          </svg>
          <p className="text-[14px] text-gray-400 font-medium mb-1">No task cards yet</p>
          <p className="text-[13px] text-gray-600">
            Task cards define the individual maintenance tasks to be performed.
          </p>
          {canAddTaskCard && !isClosed && (
            <Link
              href={`/work-orders/${workOrderId}/task-cards/new`}
              className="mt-4 text-[13px] text-blue-400 hover:text-blue-300 transition-colors"
            >
              Add the first task card →
            </Link>
          )}
        </div>
      ) : (
        <ul className="flex flex-col gap-2" aria-label="Task cards">
          {taskCards.map((tc) => {
            const statusVariant = taskCardStatusToVariant(tc.status);
            const allDone =
              tc.completedStepCount + tc.naStepCount >= tc.stepCount &&
              tc.stepCount > 0;

            return (
              <li key={tc._id}>
                <Link
                  href={`/work-orders/${workOrderId}/task-cards/${tc._id}`}
                  className={cn(
                    "block rounded-[6px] border border-[#363D4E] bg-[#1A1E28]",
                    "px-3.5 py-3",
                    "hover:bg-[#2E3445] hover:border-[#4A5264]",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400",
                    "transition-colors duration-100",
                    tc.status === "complete" && "border-l-4 border-l-green-700",
                    tc.status === "not_started" && "border-l-4 border-l-gray-600",
                    tc.status === "in_progress" && "border-l-4 border-l-blue-600",
                  )}
                >
                  {/* Row 1: Card number + status + type */}
                  <div className="flex items-center gap-2.5 mb-1.5">
                    <span className="font-mono text-[12px] text-gray-500 shrink-0">
                      {tc.taskCardNumber}
                    </span>
                    <StatusBadge variant={statusVariant} size="sm" />
                    <span className="ml-auto text-[11px] text-gray-600 shrink-0">
                      {TASK_TYPE_LABELS[tc.taskType] ?? tc.taskType}
                    </span>
                  </div>

                  {/* Row 2: Title */}
                  <p className="text-[14px] font-medium text-gray-200 leading-snug mb-1.5">
                    {tc.title}
                  </p>

                  {/* Row 3: Meta */}
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 items-center">
                    {/* Step progress */}
                    {tc.stepCount > 0 && (
                      <span
                        className={cn(
                          "text-[12px] tabular-nums",
                          allDone ? "text-green-400" : "text-gray-500",
                        )}
                      >
                        {tc.completedStepCount}/{tc.stepCount} steps
                        {tc.naStepCount > 0 && ` (${tc.naStepCount} N/A)`}
                      </span>
                    )}

                    {/* Assigned tech */}
                    {tc.assignedTechName && (
                      <span className="text-[12px] text-gray-500">
                        {tc.assignedTechName}
                      </span>
                    )}

                    {/* Completed at */}
                    {tc.completedAt && (
                      <span className="text-[12px] text-gray-500 tabular-nums">
                        Done {formatDate(tc.completedAt)}
                      </span>
                    )}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Discrepancies tab content
// ---------------------------------------------------------------------------

function DiscrepanciesTab({
  discrepancies,
  workOrderId,
}: {
  discrepancies: DiscrepancyItem[] | undefined;
  workOrderId: string;
}) {
  if (discrepancies === undefined) return <DiscrepancyListSkeleton />;

  const DISPOSITION_LABELS: Record<string, string> = {
    corrected: "Corrected",
    deferred_mel: "Deferred (MEL)",
    deferred_grounded: "Deferred (Grounded)",
    no_fault_found: "No Fault Found",
    no_fault_found_could_not_reproduce: "NFF — Could Not Reproduce",
    pending: "Pending",
  };

  const STATUS_COLORS: Record<string, string> = {
    open: "text-red-400",
    under_evaluation: "text-amber-400",
    dispositioned: "text-green-400",
  };

  return (
    <div>
      <p className="text-[13px] text-gray-500 mb-3">
        {discrepancies.length} discrepanc
        {discrepancies.length !== 1 ? "ies" : "y"}
        {discrepancies.filter((d) => d.status === "open").length > 0 && (
          <span className="ml-2 text-red-400">
            ({discrepancies.filter((d) => d.status === "open").length} open)
          </span>
        )}
      </p>

      {discrepancies.length === 0 ? (
        <div className="rounded-[6px] border border-[#363D4E] border-dashed flex flex-col items-center py-10 px-4 text-center">
          <svg aria-hidden className="w-10 h-10 text-gray-700 mb-3" viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="5,8 20,5 35,8 20,35 5,8" />
          </svg>
          <p className="text-[14px] text-gray-400 font-medium">No discrepancies found</p>
          <p className="text-[13px] text-gray-600 mt-1">
            Any findings or squawks will appear here.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {discrepancies.map((d) => (
            <li key={d._id}>
              <div
                className={cn(
                  "rounded-[6px] border border-[#363D4E] bg-[#1A1E28] px-4 py-3",
                  d.status === "open" && "border-l-4 border-l-red-600",
                  d.status === "under_evaluation" && "border-l-4 border-l-amber-600",
                  d.status === "dispositioned" && "border-l-4 border-l-green-700",
                )}
              >
                {/* Header */}
                <div className="flex items-center gap-2.5 mb-1.5">
                  <span className="font-mono text-[12px] text-gray-500">
                    {d.discrepancyNumber}
                  </span>
                  <span
                    className={cn(
                      "text-[11px] font-medium uppercase tracking-[0.04em]",
                      STATUS_COLORS[d.status] ?? "text-gray-500",
                    )}
                  >
                    {d.status.replace("_", " ")}
                  </span>
                  {d.disposition && d.status === "dispositioned" && (
                    <span className="text-[11px] text-gray-500">
                      · {DISPOSITION_LABELS[d.disposition] ?? d.disposition}
                    </span>
                  )}
                </div>

                {/* Description */}
                <p className="text-[14px] text-gray-200 mb-1.5 leading-snug">
                  {d.description}
                </p>

                {/* Component */}
                {d.componentAffected && (
                  <p className="text-[12px] text-gray-500 mb-1">
                    Component: {d.componentAffected}
                  </p>
                )}

                {/* MEL deferral info */}
                {d.melItemNumber && (
                  <div className="mt-2 rounded-[4px] bg-amber-950/30 border border-amber-800/40 px-2.5 py-1.5">
                    <p className="text-[12px] text-amber-400">
                      MEL Item {d.melItemNumber}
                      {d.melCategory && ` — Category ${d.melCategory}`}
                      {d.melExpiryDate && (
                        <span className="ml-2">
                          · Expires {formatDate(d.melExpiryDate)}
                        </span>
                      )}
                    </p>
                  </div>
                )}

                {/* Footer */}
                <p className="text-[11px] text-gray-600 mt-1.5">
                  Found by {d.foundByTechName} · {formatDate(d.foundAt)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Parts tab content
// ---------------------------------------------------------------------------

function PartsTab({
  parts,
}: {
  parts: WorkOrderPartItem[] | undefined;
}) {
  if (parts === undefined) return <PartsListSkeleton />;

  const ACTION_LABELS: Record<string, string> = {
    installed: "Installed",
    removed: "Removed",
    overhauled: "Overhauled",
    repaired: "Repaired",
    inspected: "Inspected",
  };

  const ACTION_COLORS: Record<string, string> = {
    installed: "text-green-400",
    removed: "text-amber-400",
    overhauled: "text-blue-400",
    repaired: "text-blue-400",
    inspected: "text-gray-400",
  };

  return (
    <div>
      <p className="text-[13px] text-gray-500 mb-3">
        {parts.length} part record{parts.length !== 1 ? "s" : ""}
      </p>

      {parts.length === 0 ? (
        <div className="rounded-[6px] border border-[#363D4E] border-dashed flex flex-col items-center py-10 px-4 text-center">
          <svg aria-hidden className="w-10 h-10 text-gray-700 mb-3" viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="20" cy="20" r="14" />
            <circle cx="20" cy="20" r="6" />
            <line x1="20" y1="6" x2="20" y2="14" />
            <line x1="20" y1="26" x2="20" y2="34" />
            <line x1="6" y1="20" x2="14" y2="20" />
            <line x1="26" y1="20" x2="34" y2="20" />
          </svg>
          <p className="text-[14px] text-gray-400 font-medium">No parts recorded</p>
          <p className="text-[13px] text-gray-600 mt-1">
            Parts used or removed will appear here.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {parts.map((p) => (
            <li key={p._id}>
              <div className="rounded-[6px] border border-[#363D4E] bg-[#1A1E28] px-4 py-3">
                {/* Part number + action */}
                <div className="flex items-center gap-2.5 mb-1">
                  <span className="font-mono text-[13px] text-gray-300 font-medium">
                    P/N: {p.partNumber}
                  </span>
                  <span
                    className={cn(
                      "text-[11px] font-medium uppercase tracking-[0.04em]",
                      ACTION_COLORS[p.action] ?? "text-gray-500",
                    )}
                  >
                    {ACTION_LABELS[p.action] ?? p.action}
                  </span>
                  <span className="ml-auto text-[12px] text-gray-600">
                    QTY: {p.quantity}
                  </span>
                </div>

                {/* Part name */}
                <p className="text-[14px] text-gray-300 mb-1.5">{p.partName}</p>

                {/* Serial number */}
                {p.serialNumber && (
                  <p className="text-[12px] text-gray-500">
                    <span className="font-mono">S/N: {p.serialNumber}</span>
                  </p>
                )}

                {/* 8130-3 reference */}
                {p.eightOneThirtyReference && (
                  <p className="text-[12px] text-gray-500">
                    8130-3: {p.eightOneThirtyReference}
                  </p>
                )}

                {/* Footer */}
                <div className="flex items-center gap-3 mt-1.5">
                  {p.issuedByTechName && (
                    <span className="text-[11px] text-gray-600">
                      By {p.issuedByTechName}
                    </span>
                  )}
                  {p.issuedAt && (
                    <span className="text-[11px] text-gray-600 tabular-nums">
                      {formatDate(p.issuedAt)}
                    </span>
                  )}
                  {p.taskCardNumber && (
                    <span className="text-[11px] text-gray-600 font-mono">
                      {p.taskCardNumber}
                    </span>
                  )}
                  <span
                    className={cn(
                      "text-[11px] capitalize",
                      p.condition === "new" || p.condition === "serviceable" || p.condition === "overhauled"
                        ? "text-green-500"
                        : p.condition === "unserviceable" || p.condition === "scrapped"
                          ? "text-red-500"
                          : "text-gray-500",
                    )}
                  >
                    {p.condition}
                  </span>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Notes tab content
// ---------------------------------------------------------------------------

function NotesTab({ notes }: { notes: string | undefined }) {
  if (notes === undefined) {
    return (
      <div className="animate-pulse">
        <div className="h-4 w-3/4 rounded bg-[#2E3445] mb-2" />
        <div className="h-4 w-1/2 rounded bg-[#242936]" />
      </div>
    );
  }

  if (!notes || notes.trim() === "") {
    return (
      <p className="text-[14px] text-gray-600 italic">
        No notes recorded for this work order.
      </p>
    );
  }

  return (
    <div className="rounded-[6px] border border-[#363D4E] bg-[#0F1117] px-4 py-4">
      <p className="text-[14px] text-gray-300 leading-relaxed whitespace-pre-wrap">
        {notes}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default function WorkOrderDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;

  const { can, isAtLeast, isLoaded } = useOrgRole();

  const [activeTab, setActiveTab] = useState<WOTab>("task_cards");
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [isClosingWO, setIsClosingWO] = useState(false);

  // ── Data queries ──
  const workOrder = useQuery(
    api.workOrders?.get ?? null,
    id ? { id } : "skip",
  ) as WorkOrderDetail | undefined;

  const taskCards = useQuery(
    api.taskCards?.listByWorkOrder ?? null,
    id ? { workOrderId: id } : "skip",
  ) as TaskCardListItem[] | undefined;

  const discrepancies = useQuery(
    api.discrepancies?.listByWorkOrder ?? null,
    id ? { workOrderId: id } : "skip",
  ) as DiscrepancyItem[] | undefined;

  const parts = useQuery(
    api.parts?.listByWorkOrder ?? null,
    id ? { workOrderId: id } : "skip",
  ) as WorkOrderPartItem[] | undefined;

  // Close readiness check — only loaded when modal is opened
  const closeReadiness = useQuery(
    api.workOrders?.getCloseReadiness ?? null,
    showCloseModal && id ? { workOrderId: id } : "skip",
  ) as CloseReadiness | undefined;

  // Close WO mutation
  const closeWorkOrder = useMutation(
    api.workOrders?.close ?? null,
  );

  // ── Derived state ──
  const isLoading = workOrder === undefined;
  const isAog = workOrder?.priority === "aog";
  const isOverdue =
    workOrder?.targetCompletionDate !== undefined &&
    workOrder.targetCompletionDate < Date.now() &&
    workOrder.status !== "closed" &&
    workOrder.status !== "cancelled";
  const isClosed =
    workOrder?.status === "closed" ||
    workOrder?.status === "cancelled" ||
    workOrder?.status === "voided";

  const canClose = isLoaded && isAtLeast("supervisor") && !isClosed;
  const canAddTaskCard = isLoaded && can("addTaskCard") && !isClosed;

  const handleCloseWO = useCallback(() => {
    setShowCloseModal(true);
  }, []);

  const handleConfirmClose = useCallback(async () => {
    if (!closeReadiness?.ready || !id) return;
    setIsClosingWO(true);
    try {
      // TODO: Replace with real mutation call when Convex is deployed
      // await closeWorkOrder({ workOrderId: id });
      router.push("/work-orders");
    } catch (err) {
      console.error("Failed to close work order:", err);
    } finally {
      setIsClosingWO(false);
      setShowCloseModal(false);
    }
  }, [closeReadiness, id, router]);

  // ── Render ──

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* ── Header ── */}
      {isLoading ? (
        <WorkOrderHeaderSkeleton />
      ) : workOrder ? (
        <div
          className={cn(
            "px-4 pt-5 pb-4 sm:px-6 border-b border-[#363D4E]",
            isAog && "border-t-4 border-t-red-600",
          )}
        >
          {/* Back link */}
          <Link
            href="/work-orders"
            className="inline-flex items-center gap-1.5 text-[12px] text-gray-500 hover:text-gray-300 transition-colors mb-3"
          >
            <svg aria-hidden className="w-3.5 h-3.5" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="8,2 4,6 8,10" />
            </svg>
            Work Orders
          </Link>

          {/* WO number + status + priority */}
          <div className="flex flex-wrap items-center gap-2.5 mb-2">
            <span className="font-mono text-[14px] text-gray-400 tracking-wide">
              {workOrder.workOrderNumber}
            </span>
            <StatusBadge
              variant={workOrderStatusToVariant(workOrder.status)}
              size="default"
            />
            {isAog && (
              <span className="inline-flex items-center gap-1 px-2 h-6 rounded-[4px] bg-red-900/50 border border-red-700/50 text-[12px] font-semibold uppercase text-red-300 tracking-[0.06em]">
                <svg aria-hidden className="w-3 h-3" viewBox="0 0 10 9" fill="currentColor">
                  <path d="M5 0.5L9.5 8.5H0.5L5 0.5Z" />
                  <rect x="4.25" y="3.5" width="1.5" height="2.5" fill="#7f1d1d" rx="0.25" />
                  <rect x="4.25" y="6.5" width="1.5" height="1.5" fill="#7f1d1d" rx="0.25" />
                </svg>
                AOG
              </span>
            )}
            {isOverdue && !isAog && (
              <span className="text-[12px] text-amber-400 font-medium">
                ⚠ Overdue
              </span>
            )}
          </div>

          {/* Aircraft + type */}
          <h1 className="text-[20px] font-semibold text-gray-100 leading-snug mb-0.5">
            {workOrder.tailNumber}{" "}
            <span className="font-normal text-gray-400">
              {workOrder.aircraftMake} {workOrder.aircraftModel}
            </span>
          </h1>
          <p className="text-[14px] text-gray-400 mb-3">
            {WORK_ORDER_TYPE_LABELS[workOrder.workOrderType] ?? workOrder.workOrderType}
            {workOrder.customerName && (
              <> &bull; <span className="text-gray-500">{workOrder.customerName}</span></>
            )}
          </p>

          {/* Meta row */}
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-gray-500">
            <span>Opened {formatDate(workOrder.openedAt)}</span>
            {workOrder.openedByName && (
              <span>by {workOrder.openedByName}</span>
            )}
            {workOrder.targetCompletionDate && (
              <span className={isOverdue ? "text-amber-400" : ""}>
                Due {formatDate(workOrder.targetCompletionDate)}
              </span>
            )}
            {workOrder.closedAt && (
              <span className="text-green-400">
                Closed {formatDate(workOrder.closedAt)}
              </span>
            )}
            <span>
              TT at open: {formatHours(workOrder.aircraftTotalTimeAtOpen)}
            </span>
          </div>

          {/* On-hold reason */}
          {workOrder.status === "on_hold" && workOrder.onHoldReason && (
            <div className="mt-3 flex items-start gap-2 text-[13px] text-amber-400 rounded-[6px] border border-amber-800/40 bg-amber-950/30 px-3 py-2.5">
              <svg aria-hidden className="w-4 h-4 shrink-0 mt-0.5" viewBox="0 0 10 9" fill="currentColor">
                <path d="M5 0.5L9.5 8.5H0.5L5 0.5Z" />
                <rect x="4.25" y="3.5" width="1.5" height="2.5" fill="#451a03" rx="0.25" />
                <rect x="4.25" y="6.5" width="1.5" height="1.5" fill="#451a03" rx="0.25" />
              </svg>
              <span>On hold: {workOrder.onHoldReason}</span>
            </div>
          )}

          {/* Quick stats */}
          <div className="mt-4 flex flex-wrap gap-3">
            {/* Task cards */}
            <div className="rounded-[6px] border border-[#363D4E] bg-[#0F1117] px-3 py-2 min-w-[80px]">
              <p className="text-[11px] text-gray-600 uppercase tracking-[0.04em]">Task Cards</p>
              <p
                className={cn(
                  "text-[18px] font-semibold tabular-nums mt-0.5",
                  workOrder.signedTaskCards === workOrder.totalTaskCards && workOrder.totalTaskCards > 0
                    ? "text-green-400"
                    : "text-gray-200",
                )}
              >
                {workOrder.signedTaskCards}/{workOrder.totalTaskCards}
              </p>
              <p className="text-[11px] text-gray-600">signed</p>
            </div>

            {/* Discrepancies */}
            <div className={cn(
              "rounded-[6px] border px-3 py-2 min-w-[80px]",
              workOrder.openDiscrepancies > 0
                ? "border-red-800/50 bg-red-950/20"
                : "border-[#363D4E] bg-[#0F1117]",
            )}>
              <p className="text-[11px] text-gray-600 uppercase tracking-[0.04em]">Discrepancies</p>
              <p
                className={cn(
                  "text-[18px] font-semibold tabular-nums mt-0.5",
                  workOrder.openDiscrepancies > 0 ? "text-red-400" : "text-gray-200",
                )}
              >
                {workOrder.openDiscrepancies}
              </p>
              <p className="text-[11px] text-gray-600">open</p>
            </div>

            {/* Parts */}
            {(workOrder.openPartsRequests > 0 || workOrder.partsOnOrder > 0) && (
              <div className="rounded-[6px] border border-amber-800/50 bg-amber-950/20 px-3 py-2 min-w-[80px]">
                <p className="text-[11px] text-gray-600 uppercase tracking-[0.04em]">Parts</p>
                <p className="text-[18px] font-semibold tabular-nums text-amber-400 mt-0.5">
                  {workOrder.partsOnOrder}
                </p>
                <p className="text-[11px] text-gray-600">on order</p>
              </div>
            )}

            {/* RTS status */}
            {workOrder.returnedToService && (
              <div className="rounded-[6px] border border-green-800/50 bg-green-950/20 px-3 py-2">
                <p className="text-[11px] text-gray-600 uppercase tracking-[0.04em]">RTS</p>
                <p className="text-[13px] text-green-400 font-medium mt-0.5">Signed</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        // Work order not found
        <div className="flex flex-col items-center justify-center flex-1 px-4 py-16">
          <p className="text-[16px] text-gray-400 mb-2">Work order not found</p>
          <Link href="/work-orders" className="text-[14px] text-blue-400 hover:text-blue-300">
            ← Back to Work Orders
          </Link>
        </div>
      )}

      {/* ── Tabs ── */}
      {!isLoading && workOrder && (
        <>
          <div
            role="tablist"
            aria-label="Work order sections"
            className="flex items-center border-b border-[#363D4E] px-4 sm:px-6 overflow-x-auto scrollbar-none -mb-px"
          >
            {WO_TABS.map((tab) => {
              const count = tab.getCount?.(workOrder);
              return (
                <button
                  key={tab.id}
                  role="tab"
                  aria-selected={activeTab === tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "shrink-0 px-4 h-11 text-[14px] font-medium whitespace-nowrap",
                    "border-b-2 -mb-px transition-colors duration-100",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400",
                    activeTab === tab.id
                      ? "border-blue-500 text-blue-400"
                      : "border-transparent text-gray-500 hover:text-gray-300",
                  )}
                >
                  {tab.label}
                  {count !== undefined && count > 0 && (
                    <span
                      className={cn(
                        "ml-1.5 inline-flex items-center justify-center",
                        "h-4 min-w-[16px] px-1 rounded-full text-[11px] font-semibold",
                        tab.id === "discrepancies"
                          ? "bg-red-900/60 text-red-400"
                          : "bg-[#2E3445] text-gray-400",
                      )}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* ── Tab content ── */}
          <div
            className="flex-1 overflow-y-auto px-4 pt-4 pb-28 sm:px-6"
            role="tabpanel"
            aria-label={WO_TABS.find((t) => t.id === activeTab)?.label}
          >
            {activeTab === "task_cards" && (
              <TaskCardsTab
                workOrderId={id}
                taskCards={taskCards}
                canAddTaskCard={canAddTaskCard}
                woStatus={workOrder.status}
              />
            )}
            {activeTab === "discrepancies" && (
              <DiscrepanciesTab
                discrepancies={discrepancies}
                workOrderId={id}
              />
            )}
            {activeTab === "parts" && <PartsTab parts={parts} />}
            {activeTab === "notes" && <NotesTab notes={workOrder.notes} />}
          </div>

          {/* ── Bottom action bar — Close WO button ── */}
          {canClose && (
            <div className="fixed bottom-0 left-0 right-0 z-[50] border-t border-[#363D4E] bg-[#0F1117]/95 backdrop-blur-sm px-4 py-3 sm:px-6">
              <div className="max-w-3xl mx-auto flex items-center justify-between gap-3">
                <div>
                  <p className="text-[12px] text-gray-500">
                    {workOrder.signedTaskCards}/{workOrder.totalTaskCards} task cards signed
                    {workOrder.openDiscrepancies > 0 && (
                      <span className="text-red-400 ml-2">
                        · {workOrder.openDiscrepancies} open discrepanc
                        {workOrder.openDiscrepancies !== 1 ? "ies" : "y"}
                      </span>
                    )}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleCloseWO}
                  className={cn(
                    "inline-flex items-center gap-2 px-5 h-11 rounded-[6px]",
                    "bg-green-700 hover:bg-green-600 active:bg-green-800",
                    "text-[14px] font-semibold text-white uppercase tracking-[0.04em]",
                    "transition-colors duration-100 shrink-0",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-400",
                  )}
                >
                  <svg aria-hidden className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3,8 7,12 13,4" />
                  </svg>
                  Close Work Order
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Close WO readiness modal ── */}
      {showCloseModal && (
        <>
          {closeReadiness === undefined ? (
            // Loading readiness check
            <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60">
              <div className="flex items-center gap-3 text-gray-300">
                <svg
                  aria-hidden
                  className="w-5 h-5 animate-spin text-blue-500"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.3" />
                  <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                </svg>
                <span>Checking close readiness…</span>
              </div>
            </div>
          ) : (
            <CloseReadinessModal
              readiness={closeReadiness}
              onConfirmClose={handleConfirmClose}
              onDismiss={() => setShowCloseModal(false)}
              isClosing={isClosingWO}
            />
          )}
        </>
      )}
    </div>
  );
}
