/**
 * components/WorkOrderCard.tsx
 * Athelon — Work Order Card (List Item)
 *
 * Chloe Park, 2026-02-22
 *
 * Displays a single work order in the list view. Matches the spec layout from
 * ux-information-architecture.md §5.1:
 *   - Status badge (with variant)
 *   - WO number + aircraft tail
 *   - Work order type / description
 *   - Customer name
 *   - Opened date + assigned techs
 *   - Task card progress (X/N signed) + parts status
 *
 * Uses Convex Doc<"workOrders"> shape. Full tap target = entire card row.
 * Skeleton state for loading (undefined from useQuery).
 */

"use client";

import React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  StatusBadge,
  workOrderStatusToVariant,
  type StatusVariant,
} from "./StatusBadge";

// ---------------------------------------------------------------------------
// Type definitions — mirrors Convex Doc<"workOrders"> from the schema
// We import from the generated API in the real project; using a local type
// here so the component compiles without a Convex deployment.
// ---------------------------------------------------------------------------

// TODO: Replace with `import { Doc } from "@/convex/_generated/dataModel"` once
// Convex schema is deployed. This local shape matches the intended schema.
export interface WorkOrderDoc {
  _id: string;
  _creationTime: number;
  orgId: string;
  workOrderNumber: string;       // "WO-2026-0041"
  aircraftId: string;
  tailNumber: string;            // Denormalized for list performance
  aircraftMake: string;          // e.g. "Cessna"
  aircraftModel: string;         // e.g. "172S"
  customerId: string;
  customerName: string;          // Denormalized for list performance
  workOrderType:
    | "routine"
    | "unscheduled"
    | "annual_inspection"
    | "100hr_inspection"
    | "progressive_inspection"
    | "ad_compliance"
    | "major_repair"
    | "major_alteration"
    | "field_approval"
    | "ferry_permit";
  description: string;
  status:
    | "draft"
    | "open"
    | "in_progress"
    | "on_hold"
    | "pending_inspection"
    | "pending_signoff"
    | "open_discrepancies"
    | "closed"
    | "cancelled"
    | "voided";
  priority: "routine" | "urgent" | "aog";
  assignedTechIds: string[];
  assignedTechNames: string[];   // Denormalized
  totalTaskCards: number;
  signedTaskCards: number;
  openPartsRequests: number;     // Parts requested but not yet ordered
  partsOnOrder: number;          // Parts with open POs
  openedAt: number;              // Unix ms
  targetCompletionDate?: number; // Unix ms, optional
  closedAt?: number;
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface WorkOrderCardProps {
  /** Full work order document from Convex useQuery. Undefined = loading state. */
  workOrder: WorkOrderDoc | undefined;
  /** If true, renders a full-width skeleton. Same height as a real card. */
  className?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const WORK_ORDER_TYPE_LABELS: Record<WorkOrderDoc["workOrderType"], string> = {
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
} as const;

/** Format an elapsed time as "X days" or "Xh" for short durations. */
function formatElapsed(openedAtMs: number): string {
  const diffMs = Date.now() - openedAtMs;
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) return `${diffDays}d`;
  if (diffHours > 0) return `${diffHours}h`;
  return "<1h";
}

/** Format Unix ms to ISO date: "2026-02-21" */
function formatDate(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

/** Format an assignee list for display — "Mia Chen, Ray Kowalski" or "Mia Chen +2" */
function formatAssignees(names: string[]): string {
  if (names.length === 0) return "Unassigned";
  if (names.length <= 2) return names.join(", ");
  return `${names[0]} +${names.length - 1}`;
}

/** Parts status summary — returns the most critical status string. */
function partsStatusLabel(
  openRequests: number,
  onOrder: number,
): { label: string; variant: StatusVariant } | null {
  if (openRequests > 0) {
    return {
      label: `${openRequests} part${openRequests > 1 ? "s" : ""} requested`,
      variant: "pending",
    };
  }
  if (onOrder > 0) {
    return {
      label: `${onOrder} part${onOrder > 1 ? "s" : ""} on order`,
      variant: "on_order",
    };
  }
  return null;
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function WorkOrderCardSkeleton({ className }: { className?: string }) {
  return (
    <div
      aria-busy="true"
      aria-label="Loading work order"
      className={cn(
        "flex flex-col gap-2 rounded-[8px] bg-[#1A1E28] border border-[#363D4E]",
        "p-4 animate-pulse",
        className,
      )}
    >
      {/* Status badge + WO number row */}
      <div className="flex items-center gap-3">
        <div className="h-6 w-20 rounded-[4px] bg-[#2E3445]" />
        <div className="h-5 w-28 rounded bg-[#2E3445]" />
      </div>
      {/* Aircraft + type row */}
      <div className="h-5 w-48 rounded bg-[#242936]" />
      {/* Customer row */}
      <div className="h-4 w-36 rounded bg-[#242936]" />
      {/* Meta row */}
      <div className="flex gap-4 mt-1">
        <div className="h-4 w-24 rounded bg-[#242936]" />
        <div className="h-4 w-32 rounded bg-[#242936]" />
        <div className="h-4 w-20 rounded bg-[#242936]" />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// WorkOrderCard — real content
// ---------------------------------------------------------------------------

function WorkOrderCardContent({
  workOrder,
  className,
}: {
  workOrder: WorkOrderDoc;
  className?: string;
}) {
  const statusVariant = workOrderStatusToVariant(workOrder.status);
  const typeLabel = WORK_ORDER_TYPE_LABELS[workOrder.workOrderType];
  const elapsed = formatElapsed(workOrder.openedAt);
  const openedDate = formatDate(workOrder.openedAt);
  const assignees = formatAssignees(workOrder.assignedTechNames);
  const parts = partsStatusLabel(
    workOrder.openPartsRequests,
    workOrder.partsOnOrder,
  );

  const isAog = workOrder.priority === "aog";
  const isOverdue =
    workOrder.targetCompletionDate !== undefined &&
    workOrder.targetCompletionDate < Date.now() &&
    workOrder.status !== "closed" &&
    workOrder.status !== "cancelled" &&
    workOrder.status !== "voided";

  return (
    <Link
      href={`/work-orders/${workOrder._id}`}
      className={cn(
        // Layout
        "block rounded-[8px] bg-[#1A1E28] border border-[#363D4E]",
        // Full-width tap target — extends into gutters (Tanya's requirement)
        "px-4 py-3.5",
        // Hover state — Surface 3
        "hover:bg-[#2E3445] hover:border-[#4A5264]",
        // Focus ring for keyboard nav
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0F1117]",
        // Transition
        "transition-colors duration-100",
        // AOG: red left border
        isAog && "border-l-4 border-l-red-600",
        // Overdue: amber left border (superceded by AOG if both)
        !isAog && isOverdue && "border-l-4 border-l-amber-600",
        className,
      )}
      aria-label={`Work order ${workOrder.workOrderNumber} — ${workOrder.tailNumber} ${typeLabel}, status ${workOrder.status}`}
    >
      {/* ── Row 1: Status badge + WO number ── */}
      <div className="flex items-center gap-2.5 mb-2">
        <StatusBadge variant={statusVariant} size="default" />

        {/* WO number in monospace — part of the compliance identity */}
        <span className="font-mono text-[13px] text-gray-400 tracking-wide">
          {workOrder.workOrderNumber}
        </span>

        {/* AOG priority label — always visible, never just a color */}
        {isAog && (
          <span className="ml-auto inline-flex items-center gap-1 text-[11px] font-medium uppercase tracking-[0.06em] text-red-400">
            <svg aria-hidden className="w-3 h-3" viewBox="0 0 10 9" fill="currentColor">
              <path d="M5 0.5L9.5 8.5H0.5L5 0.5Z" />
              <rect x="4.25" y="3.5" width="1.5" height="2.5" fill="white" rx="0.25" />
              <rect x="4.25" y="6.5" width="1.5" height="1.5" fill="white" rx="0.25" />
            </svg>
            AOG
          </span>
        )}

        {/* Elapsed time — always visible */}
        <span
          className={cn(
            "ml-auto text-[12px] text-gray-500 tabular-nums",
            isAog && "ml-2", // AOG label took the ml-auto
          )}
          title={`Opened ${openedDate}`}
        >
          {elapsed}
        </span>
      </div>

      {/* ── Row 2: Aircraft + work order type ── */}
      <div className="mb-0.5">
        <span className="font-sans text-[16px] font-semibold text-gray-100 leading-tight">
          {workOrder.tailNumber}
        </span>
        <span className="font-sans text-[14px] text-gray-400 ml-2">
          {workOrder.aircraftMake} {workOrder.aircraftModel}
        </span>
        <span className="font-sans text-[14px] text-gray-500 ml-2">
          &bull; {typeLabel}
        </span>
      </div>

      {/* ── Row 3: Customer ── */}
      <div className="mb-2">
        <span className="font-sans text-[13px] text-gray-500">
          {workOrder.customerName}
        </span>
      </div>

      {/* ── Row 4: Meta — opened date, assignees, task progress, parts ── */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        {/* Opened date */}
        <span className="text-[12px] text-gray-500 tabular-nums">
          Opened {openedDate}
        </span>

        {/* Assigned techs */}
        <span className="text-[12px] text-gray-400">{assignees}</span>

        {/* Task card progress — X/N signed (not a %; spec is explicit about this) */}
        <span
          className={cn(
            "text-[12px] tabular-nums font-medium",
            workOrder.signedTaskCards === workOrder.totalTaskCards
              ? "text-green-400"
              : "text-gray-400",
          )}
          aria-label={`${workOrder.signedTaskCards} of ${workOrder.totalTaskCards} task cards signed`}
        >
          {workOrder.signedTaskCards}/{workOrder.totalTaskCards} signed
        </span>

        {/* Parts status — only if there's something to show */}
        {parts !== null && (
          <StatusBadge variant={parts.variant} label={parts.label} size="sm" />
        )}
      </div>

      {/* ── Overdue warning — inline, not a tooltip (Finn's spec §4.1 notes) ── */}
      {isOverdue && !isAog && (
        <p className="mt-2 text-[12px] text-amber-400 flex items-center gap-1">
          <svg aria-hidden className="w-3 h-3 shrink-0" viewBox="0 0 10 9" fill="currentColor">
            <path d="M5 0.5L9.5 8.5H0.5L5 0.5Z" />
            <rect x="4.25" y="3.5" width="1.5" height="2.5" fill="white" rx="0.25" />
            <rect x="4.25" y="6.5" width="1.5" height="1.5" fill="white" rx="0.25" />
          </svg>
          Overdue — was due {formatDate(workOrder.targetCompletionDate!)}
        </p>
      )}
    </Link>
  );
}

// ---------------------------------------------------------------------------
// Public export — handles loading vs. content branching
// ---------------------------------------------------------------------------

/**
 * WorkOrderCard
 *
 * Renders a clickable work order list item. When `workOrder` is `undefined`
 * (Convex still loading), renders a skeleton of the same height.
 *
 * Usage:
 *   const workOrders = useQuery(api.workOrders.list, {});
 *   // Loading:   workOrders === undefined
 *   // No data:   workOrders === null (shouldn't happen on list queries)
 *   // Loaded:    workOrders = WorkOrderDoc[]
 *
 *   {workOrders === undefined
 *     ? Array.from({ length: 5 }).map((_, i) => <WorkOrderCard key={i} workOrder={undefined} />)
 *     : workOrders.map(wo => <WorkOrderCard key={wo._id} workOrder={wo} />)
 *   }
 */
export function WorkOrderCard({ workOrder, className }: WorkOrderCardProps) {
  if (workOrder === undefined) {
    return <WorkOrderCardSkeleton className={className} />;
  }

  return <WorkOrderCardContent workOrder={workOrder} className={className} />;
}

export default WorkOrderCard;
