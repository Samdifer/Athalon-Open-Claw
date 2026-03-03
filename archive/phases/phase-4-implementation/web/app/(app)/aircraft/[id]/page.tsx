/**
 * app/(app)/aircraft/[id]/page.tsx
 * Athelon — Aircraft Detail Page
 *
 * Chloe Park, 2026-02-22
 *
 * The aircraft record. Hub for everything associated with a tail number.
 * The page a DOM checks before releasing an aircraft.
 *
 * Route: /aircraft/[id]
 *
 * Tabs:
 *   WORK ORDERS — Full history, open WOs first, closed below
 *   SQUAWKS    — Open squawks, historical squawks
 *   AD STATUS  — AD compliance summary table (DOM pre-release check)
 *   EQUIPMENT  — Installed parts / components with overhaul tracking
 *
 * Key "DOM pre-release checks" visible from this page:
 *   - Open ADs not complied with
 *   - Unsigned task cards on open WOs
 *   - Open squawks requiring authorization
 *   - Parts approaching shelf-life limits
 *   - IA certificate expiry
 *
 * Data:
 *   useQuery(api.aircraft.get, { id })
 *   useQuery(api.workOrders.listByAircraft, { aircraftId: id })
 *   useQuery(api.adCompliance.listByAircraft, { aircraftId: id })
 *   useQuery(api.parts.listInstalledOnAircraft, { aircraftId: id })
 *   useQuery(api.squawks.listByAircraft, { aircraftId: id })
 *
 * Role gates:
 *   - New work order button: can("createWorkOrder")
 *   - Authorize squawk: can("authorizeSquawk") — DOM only
 *   - View AD compliance: can("viewCompliance")
 *   - Start RTS: can("approveRts")
 */

"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "convex/react";
import { cn } from "@/lib/utils";
import {
  StatusBadge,
  workOrderStatusToVariant,
} from "@/components/StatusBadge";
import { useOrgRole } from "@/lib/auth";
import type { StatusVariant } from "@/components/StatusBadge";

// TODO: Replace with real import once Convex is deployed.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const api = {} as any;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AircraftDetail {
  _id: string;
  tailNumber: string;
  make: string;
  model: string;
  series?: string;
  yearOfManufacture?: number;
  serialNumber: string;
  typeCertificateNumber?: string;
  engineCount: number;
  aircraftCategory: string;
  totalTimeAirframeHours: number;
  totalTimeAirframeAsOfDate: number;
  status: string;
  ownerName?: string;
  customerId?: string;
  customerName?: string;
  baseLocation?: string;
  operatingRegulation?: string;
  // Computed summary for release checks:
  openWorkOrderCount: number;
  unsignedTaskCardCount: number;
  openSquawkCount: number;
  openAdCount: number;
  openAdNonCompliantCount: number;
  partsApproachingShelfLife: number;
}

interface WorkOrderHistoryItem {
  _id: string;
  workOrderNumber: string;
  workOrderType: string;
  description: string;
  status: string;
  priority: string;
  openedAt: number;
  closedAt?: number;
  targetCompletionDate?: number;
  assignedTechNames: string[];
  signedTaskCards: number;
  totalTaskCards: number;
  returnedToService: boolean;
}

interface AdComplianceItem {
  _id: string;
  adNumber: string;
  adTitle: string;
  adType: string;
  complianceStatus: string;
  applicable: boolean;
  lastComplianceDate?: number;
  lastComplianceHours?: number;
  nextDueDate?: number;
  nextDueHours?: number;
  nextDueCycles?: number;
  emergencyAd: boolean;
}

interface InstalledPartItem {
  _id: string;
  partNumber: string;
  partName: string;
  serialNumber?: string;
  condition: string;
  installPosition?: string;
  installedAt?: number;
  hoursAtInstallation?: number;
  isLifeLimited: boolean;
  lifeLimitHours?: number;
  hasShelfLifeLimit: boolean;
  shelfLifeLimitDate?: number;
  eightOneThirtyId?: string;
  currentTaskCardNumber?: string;
}

interface SquawkItem {
  _id: string;
  discrepancyNumber: string;
  description: string;
  status: "open" | "under_evaluation" | "dispositioned";
  disposition?: string;
  foundByTechName: string;
  foundAt: number;
  componentAffected?: string;
  workOrderId?: string;
  workOrderNumber?: string;
  melItemNumber?: string;
  melCategory?: string;
  melExpiryDate?: number;
  requiresAuthorization: boolean;
}

// ---------------------------------------------------------------------------
// Tab definition
// ---------------------------------------------------------------------------

type AircraftTab = "work_orders" | "squawks" | "ad_status" | "equipment";

interface TabConfig {
  id: AircraftTab;
  label: string;
  getAlertCount?: (aircraft: AircraftDetail) => number;
}

const AIRCRAFT_TABS: TabConfig[] = [
  { id: "work_orders", label: "Work Orders" },
  {
    id: "squawks",
    label: "Squawks",
    getAlertCount: (a) => a.openSquawkCount,
  },
  {
    id: "ad_status",
    label: "AD Status",
    getAlertCount: (a) => a.openAdNonCompliantCount,
  },
  { id: "equipment", label: "Equipment" },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

function formatHours(hours: number): string {
  return `${hours.toLocaleString("en-US", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })} hr`;
}

const AD_COMPLIANCE_STATUS_LABELS: Record<string, string> = {
  not_complied: "NOT COMPLIED",
  complied_one_time: "COMPLIED",
  complied_recurring: "CURRENT",
  not_applicable: "N/A",
  superseded: "SUPERSEDED",
  pending_determination: "PENDING",
};

function adComplianceToVariant(status: string): StatusVariant {
  switch (status) {
    case "not_complied":      return "overdue";
    case "complied_one_time": return "complete";
    case "complied_recurring":return "active";
    case "not_applicable":    return "cancelled";
    case "superseded":        return "deferred";
    case "pending_determination": return "pending";
    default:                  return "pending";
  }
}

const PART_CONDITION_LABELS: Record<string, { label: string; color: string }> = {
  new:           { label: "New",         color: "text-green-400" },
  serviceable:   { label: "Serviceable", color: "text-green-400" },
  overhauled:    { label: "Overhauled",  color: "text-blue-400" },
  repaired:      { label: "Repaired",    color: "text-blue-400" },
  unserviceable: { label: "Unsvcbl.",    color: "text-red-400" },
  quarantine:    { label: "Quarantine",  color: "text-amber-400" },
  scrapped:      { label: "Scrapped",    color: "text-gray-500" },
};

const WO_TYPE_SHORT: Record<string, string> = {
  routine: "Routine",
  unscheduled: "Unscheduled",
  annual_inspection: "Annual",
  "100hr_inspection": "100-hr",
  progressive_inspection: "Progressive",
  ad_compliance: "AD Compliance",
  major_repair: "Major Repair",
  major_alteration: "Major Alteration",
  field_approval: "Field Approval",
  ferry_permit: "Ferry Permit",
};

// ---------------------------------------------------------------------------
// Skeletons
// ---------------------------------------------------------------------------

function AircraftDetailHeaderSkeleton() {
  return (
    <div className="animate-pulse px-4 pt-5 pb-4 sm:px-6 border-b border-[#363D4E]">
      <div className="h-4 w-24 rounded bg-[#2E3445] mb-4" />
      <div className="h-8 w-32 rounded bg-[#2E3445] mb-2" />
      <div className="h-5 w-56 rounded bg-[#2E3445] mb-1" />
      <div className="h-4 w-40 rounded bg-[#242936] mb-3" />
      <div className="flex gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-16 w-20 rounded-[6px] bg-[#242936]" />
        ))}
      </div>
    </div>
  );
}

function GenericListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-2 animate-pulse" aria-busy="true">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="rounded-[6px] border border-[#363D4E] bg-[#1A1E28] px-4 py-3.5">
          <div className="h-4 w-3/4 rounded bg-[#2E3445] mb-2" />
          <div className="h-4 w-1/2 rounded bg-[#242936]" />
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Release readiness summary (DOM's pre-release check block)
// ---------------------------------------------------------------------------

function ReleaseReadinessSummary({
  aircraft,
  canViewCompliance,
}: {
  aircraft: AircraftDetail;
  canViewCompliance: boolean;
}) {
  const issues = [
    aircraft.unsignedTaskCardCount > 0 && {
      key: "unsigned",
      severity: "blocker" as const,
      message: `${aircraft.unsignedTaskCardCount} unsigned task card${aircraft.unsignedTaskCardCount !== 1 ? "s" : ""} on open work orders`,
    },
    aircraft.openAdNonCompliantCount > 0 && {
      key: "ads",
      severity: "blocker" as const,
      message: `${aircraft.openAdNonCompliantCount} non-compliant AD${aircraft.openAdNonCompliantCount !== 1 ? "s" : ""}`,
    },
    aircraft.openSquawkCount > 0 && {
      key: "squawks",
      severity: "warning" as const,
      message: `${aircraft.openSquawkCount} open squawk${aircraft.openSquawkCount !== 1 ? "s" : ""}`,
    },
    aircraft.partsApproachingShelfLife > 0 && {
      key: "shelf",
      severity: "warning" as const,
      message: `${aircraft.partsApproachingShelfLife} part${aircraft.partsApproachingShelfLife !== 1 ? "s" : ""} with shelf-life concern`,
    },
  ].filter(Boolean) as Array<{ key: string; severity: "blocker" | "warning"; message: string }>;

  const hasBlockers = issues.some((i) => i.severity === "blocker");
  const isClean = issues.length === 0;

  if (!canViewCompliance) return null;

  return (
    <div
      className={cn(
        "rounded-[6px] border px-4 py-3",
        isClean
          ? "border-green-800/50 bg-green-950/20"
          : hasBlockers
            ? "border-red-800/50 bg-red-950/20"
            : "border-amber-800/50 bg-amber-950/20",
      )}
      role="status"
      aria-label="Release readiness summary"
    >
      <div className="flex items-center gap-2 mb-2">
        {isClean ? (
          <>
            <svg aria-hidden className="w-4 h-4 text-green-400" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3,8 7,12 13,4" />
            </svg>
            <span className="text-[13px] font-semibold text-green-300 uppercase tracking-[0.04em]">
              Ready for Release
            </span>
          </>
        ) : hasBlockers ? (
          <>
            <svg aria-hidden className="w-4 h-4 text-red-400 shrink-0" viewBox="0 0 8 8" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
              <line x1="1.5" y1="1.5" x2="6.5" y2="6.5" />
              <line x1="6.5" y1="1.5" x2="1.5" y2="6.5" />
            </svg>
            <span className="text-[13px] font-semibold text-red-300 uppercase tracking-[0.04em]">
              Not Ready — {issues.filter((i) => i.severity === "blocker").length} blocker
              {issues.filter((i) => i.severity === "blocker").length !== 1 ? "s" : ""}
            </span>
          </>
        ) : (
          <>
            <svg aria-hidden className="w-4 h-4 text-amber-400" viewBox="0 0 10 9" fill="currentColor">
              <path d="M5 0.5L9.5 8.5H0.5L5 0.5Z" />
            </svg>
            <span className="text-[13px] font-semibold text-amber-300 uppercase tracking-[0.04em]">
              Review Before Release
            </span>
          </>
        )}
      </div>

      {issues.length > 0 && (
        <ul className="space-y-1.5">
          {issues.map((issue) => (
            <li key={issue.key} className="flex items-start gap-2 text-[12px]">
              {issue.severity === "blocker" ? (
                <svg aria-hidden className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" viewBox="0 0 8 8" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
                  <line x1="1.5" y1="1.5" x2="6.5" y2="6.5" />
                  <line x1="6.5" y1="1.5" x2="1.5" y2="6.5" />
                </svg>
              ) : (
                <svg aria-hidden className="w-3 h-3 text-amber-400 shrink-0 mt-0.5" viewBox="0 0 10 9" fill="currentColor">
                  <path d="M5 0.5L9.5 8.5H0.5L5 0.5Z" />
                </svg>
              )}
              <span className={issue.severity === "blocker" ? "text-red-400" : "text-amber-400"}>
                {issue.message}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Work Orders tab
// ---------------------------------------------------------------------------

function WorkOrdersTab({
  workOrders,
  canCreateWO,
  aircraftId,
}: {
  workOrders: WorkOrderHistoryItem[] | undefined;
  canCreateWO: boolean;
  aircraftId: string;
}) {
  if (workOrders === undefined) return <GenericListSkeleton rows={5} />;

  const openWOs = workOrders.filter(
    (wo) => wo.status !== "closed" && wo.status !== "cancelled" && wo.status !== "voided",
  );
  const closedWOs = workOrders.filter(
    (wo) => wo.status === "closed" || wo.status === "cancelled" || wo.status === "voided",
  );

  const WORow = ({ wo }: { wo: WorkOrderHistoryItem }) => {
    const isOverdue =
      wo.targetCompletionDate !== undefined &&
      wo.targetCompletionDate < Date.now() &&
      wo.status !== "closed";

    return (
      <Link
        href={`/work-orders/${wo._id}`}
        className={cn(
          "block rounded-[6px] border border-[#363D4E] bg-[#1A1E28] px-4 py-3",
          "hover:bg-[#2E3445] hover:border-[#4A5264]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400",
          "transition-colors duration-100",
          wo.status !== "closed" && wo.status !== "cancelled" && "border-l-4",
          wo.priority === "aog" && "border-l-red-600",
          wo.priority === "urgent" && wo.priority !== "aog" && "border-l-amber-500",
          wo.priority === "routine" &&
            wo.status !== "closed" &&
            wo.status !== "cancelled" &&
            "border-l-blue-700",
        )}
      >
        {/* Row 1 */}
        <div className="flex items-center gap-2.5 mb-1">
          <span className="font-mono text-[12px] text-gray-500">{wo.workOrderNumber}</span>
          <StatusBadge variant={workOrderStatusToVariant(wo.status)} size="sm" />
          {wo.returnedToService && (
            <span className="text-[11px] text-green-500 font-medium ml-1">RTS</span>
          )}
          {isOverdue && (
            <span className="text-[11px] text-amber-400 ml-auto">Overdue</span>
          )}
        </div>
        {/* Title */}
        <p className="text-[14px] font-medium text-gray-200 mb-1">
          {WO_TYPE_SHORT[wo.workOrderType] ?? wo.workOrderType}
          {wo.description && (
            <span className="font-normal text-gray-400"> — {wo.description}</span>
          )}
        </p>
        {/* Meta */}
        <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[12px] text-gray-500">
          <span className="tabular-nums">Opened {formatDate(wo.openedAt)}</span>
          {wo.closedAt && (
            <span className="tabular-nums text-green-600">Closed {formatDate(wo.closedAt)}</span>
          )}
          <span
            className={cn(
              "tabular-nums",
              wo.signedTaskCards === wo.totalTaskCards && wo.totalTaskCards > 0
                ? "text-green-400"
                : "",
            )}
          >
            {wo.signedTaskCards}/{wo.totalTaskCards} signed
          </span>
          {wo.assignedTechNames.length > 0 && (
            <span>
              {wo.assignedTechNames.slice(0, 2).join(", ")}
              {wo.assignedTechNames.length > 2 && ` +${wo.assignedTechNames.length - 2}`}
            </span>
          )}
        </div>
      </Link>
    );
  };

  return (
    <div>
      {/* Header + new WO button */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-[13px] text-gray-500">
          {workOrders.length} work order{workOrders.length !== 1 ? "s" : ""}
          {openWOs.length > 0 && (
            <span className="ml-2 text-blue-400">({openWOs.length} open)</span>
          )}
        </p>
        {canCreateWO && (
          <Link
            href={`/work-orders/new?aircraftId=${aircraftId}`}
            className={cn(
              "inline-flex items-center gap-1.5 px-3 h-9 rounded-[6px]",
              "bg-blue-600 hover:bg-blue-700 text-white",
              "text-[13px] font-semibold uppercase tracking-[0.04em]",
              "transition-colors duration-100",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400",
            )}
          >
            <svg aria-hidden className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="8" y1="3" x2="8" y2="13" />
              <line x1="3" y1="8" x2="13" y2="8" />
            </svg>
            New WO
          </Link>
        )}
      </div>

      {workOrders.length === 0 ? (
        <div className="rounded-[6px] border border-[#363D4E] border-dashed flex flex-col items-center py-10 px-4 text-center">
          <p className="text-[14px] text-gray-400">No work orders found</p>
          <p className="text-[13px] text-gray-600 mt-1">
            This aircraft has no maintenance history recorded yet.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Open WOs */}
          {openWOs.length > 0 && (
            <div>
              <h3 className="text-[11px] font-semibold text-gray-600 uppercase tracking-[0.05em] mb-2">
                Open
              </h3>
              <ul className="flex flex-col gap-2">
                {openWOs.map((wo) => (
                  <li key={wo._id}>
                    <WORow wo={wo} />
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* History */}
          {closedWOs.length > 0 && (
            <div>
              <h3 className="text-[11px] font-semibold text-gray-600 uppercase tracking-[0.05em] mb-2 mt-4">
                History
              </h3>
              <ul className="flex flex-col gap-2">
                {closedWOs.map((wo) => (
                  <li key={wo._id}>
                    <WORow wo={wo} />
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Squawks tab
// ---------------------------------------------------------------------------

function SquawksTab({
  squawks,
  canAuthorize,
}: {
  squawks: SquawkItem[] | undefined;
  canAuthorize: boolean;
}) {
  if (squawks === undefined) return <GenericListSkeleton rows={3} />;

  const openSquawks = squawks.filter((s) => s.status !== "dispositioned");
  const closedSquawks = squawks.filter((s) => s.status === "dispositioned");

  const SquawkRow = ({ squawk }: { squawk: SquawkItem }) => {
    const needsAuth = squawk.requiresAuthorization && squawk.status === "open";
    return (
      <div
        className={cn(
          "rounded-[6px] border border-[#363D4E] bg-[#1A1E28] px-4 py-3",
          squawk.status === "open" && needsAuth && "border-l-4 border-l-amber-600",
          squawk.status === "open" && !needsAuth && "border-l-4 border-l-red-600",
          squawk.status === "under_evaluation" && "border-l-4 border-l-blue-600",
          squawk.status === "dispositioned" && "opacity-70",
        )}
      >
        <div className="flex items-center gap-2.5 mb-1">
          <span className="font-mono text-[12px] text-gray-500">
            {squawk.discrepancyNumber}
          </span>
          <span
            className={cn(
              "text-[11px] font-medium uppercase tracking-[0.04em]",
              squawk.status === "open" ? (needsAuth ? "text-amber-400" : "text-red-400") :
              squawk.status === "under_evaluation" ? "text-blue-400" :
              "text-green-400",
            )}
          >
            {squawk.status === "open" && needsAuth ? "AUTH REQUIRED" : squawk.status.replace("_", " ")}
          </span>
          {squawk.workOrderNumber && (
            <Link
              href={`/work-orders/${squawk.workOrderId}`}
              className="ml-auto text-[11px] font-mono text-blue-400 hover:text-blue-300"
              onClick={(e) => e.stopPropagation()}
            >
              {squawk.workOrderNumber}
            </Link>
          )}
        </div>

        <p className="text-[14px] text-gray-200 mb-1.5">{squawk.description}</p>

        {squawk.componentAffected && (
          <p className="text-[12px] text-gray-500 mb-1">
            Component: {squawk.componentAffected}
          </p>
        )}

        {squawk.melItemNumber && (
          <p className="text-[12px] text-amber-400">
            MEL {squawk.melItemNumber}
            {squawk.melCategory && ` — Cat. ${squawk.melCategory}`}
            {squawk.melExpiryDate && (
              <span className="ml-2 tabular-nums">Expires {formatDate(squawk.melExpiryDate)}</span>
            )}
          </p>
        )}

        <div className="flex items-center gap-3 mt-1.5">
          <span className="text-[11px] text-gray-600">
            {squawk.foundByTechName} · {formatDate(squawk.foundAt)}
          </span>
          {needsAuth && canAuthorize && (
            <button
              type="button"
              onClick={() => {
                // TODO: Wire to api.squawks.authorize mutation
                console.log("Authorize squawk:", squawk._id);
              }}
              className={cn(
                "ml-auto px-3 h-8 rounded-[4px]",
                "bg-amber-700/40 border border-amber-600/50",
                "text-[12px] font-semibold text-amber-300 uppercase tracking-[0.04em]",
                "hover:bg-amber-700/60 transition-colors",
              )}
            >
              Authorize
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div>
      <p className="text-[13px] text-gray-500 mb-3">
        {squawks.length} squawk{squawks.length !== 1 ? "s" : ""}
        {openSquawks.length > 0 && (
          <span className="ml-2 text-red-400">({openSquawks.length} open)</span>
        )}
      </p>

      {squawks.length === 0 ? (
        <div className="rounded-[6px] border border-[#363D4E] border-dashed flex flex-col items-center py-10 px-4 text-center">
          <p className="text-[14px] text-gray-400">No squawks on record</p>
        </div>
      ) : (
        <div className="space-y-3">
          {openSquawks.length > 0 && (
            <div>
              <h3 className="text-[11px] font-semibold text-gray-600 uppercase tracking-[0.05em] mb-2">
                Open
              </h3>
              <ul className="flex flex-col gap-2">
                {openSquawks.map((s) => <li key={s._id}><SquawkRow squawk={s} /></li>)}
              </ul>
            </div>
          )}
          {closedSquawks.length > 0 && (
            <div>
              <h3 className="text-[11px] font-semibold text-gray-600 uppercase tracking-[0.05em] mb-2 mt-4">
                Resolved
              </h3>
              <ul className="flex flex-col gap-2">
                {closedSquawks.map((s) => <li key={s._id}><SquawkRow squawk={s} /></li>)}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// AD Status tab
// ---------------------------------------------------------------------------

function AdStatusTab({
  adCompliance,
  canViewCompliance,
}: {
  adCompliance: AdComplianceItem[] | undefined;
  canViewCompliance: boolean;
}) {
  if (!canViewCompliance) {
    return (
      <div className="rounded-[6px] border border-[#363D4E] bg-[#1A1E28] px-4 py-8 text-center">
        <p className="text-[14px] text-gray-500">
          AD compliance data requires Inspector or higher access.
        </p>
      </div>
    );
  }

  if (adCompliance === undefined) return <GenericListSkeleton rows={6} />;

  const nonCompliant = adCompliance.filter(
    (a) => a.applicable && a.complianceStatus === "not_complied",
  );
  const compliant = adCompliance.filter(
    (a) => a.applicable && a.complianceStatus !== "not_complied" && a.complianceStatus !== "not_applicable",
  );
  const notApplicable = adCompliance.filter(
    (a) => !a.applicable || a.complianceStatus === "not_applicable",
  );

  const AdRow = ({ ad }: { ad: AdComplianceItem }) => {
    const dueDate = ad.nextDueDate;
    const dueHours = ad.nextDueHours;
    const isOverdue =
      dueDate !== undefined && dueDate < Date.now() && ad.complianceStatus === "complied_recurring";

    return (
      <div
        className={cn(
          "rounded-[6px] border border-[#363D4E] bg-[#1A1E28] px-4 py-3",
          ad.complianceStatus === "not_complied" && "border-l-4 border-l-red-600",
          ad.emergencyAd && ad.complianceStatus === "not_complied" && "border-l-red-500",
          isOverdue && "border-l-4 border-l-amber-600",
        )}
      >
        <div className="flex items-start gap-2.5 mb-1">
          <span className="font-mono text-[13px] text-gray-300 font-medium shrink-0">
            AD {ad.adNumber}
          </span>
          {ad.emergencyAd && (
            <span className="text-[11px] font-bold text-red-400 uppercase tracking-[0.04em]">
              Emergency
            </span>
          )}
          <StatusBadge
            variant={adComplianceToVariant(ad.complianceStatus)}
            label={AD_COMPLIANCE_STATUS_LABELS[ad.complianceStatus] ?? ad.complianceStatus}
            size="sm"
            className="ml-auto shrink-0"
          />
        </div>

        <p className="text-[13px] text-gray-400 mb-2 leading-snug">{ad.adTitle}</p>

        <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-[12px]">
          {ad.lastComplianceDate && (
            <span className="text-gray-500 tabular-nums">
              Last: {formatDate(ad.lastComplianceDate)}
              {ad.lastComplianceHours && (
                <span className="text-gray-600"> ({formatHours(ad.lastComplianceHours)})</span>
              )}
            </span>
          )}
          {(dueDate || dueHours) && (
            <span className={cn("tabular-nums", isOverdue ? "text-amber-400" : "text-gray-400")}>
              Next due:{" "}
              {dueDate && formatDate(dueDate)}
              {dueDate && dueHours && " / "}
              {dueHours && formatHours(dueHours)}
              {ad.nextDueCycles && ` / ${ad.nextDueCycles} cycles`}
            </span>
          )}
          <span className="text-[11px] text-gray-600 capitalize">
            {ad.adType.replace("_", " ")}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div>
      <p className="text-[13px] text-gray-500 mb-3">
        {adCompliance.filter((a) => a.applicable).length} applicable AD
        {adCompliance.filter((a) => a.applicable).length !== 1 ? "s" : ""}
        {nonCompliant.length > 0 && (
          <span className="ml-2 text-red-400">({nonCompliant.length} not complied)</span>
        )}
      </p>

      {adCompliance.length === 0 ? (
        <div className="rounded-[6px] border border-[#363D4E] border-dashed flex flex-col items-center py-10 px-4 text-center">
          <p className="text-[14px] text-gray-400">No AD compliance records</p>
          <p className="text-[13px] text-gray-600 mt-1">
            AD applicability determinations have not been recorded for this aircraft.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {nonCompliant.length > 0 && (
            <div>
              <h3 className="text-[11px] font-semibold text-red-700 uppercase tracking-[0.05em] mb-2">
                Not Complied — {nonCompliant.length}
              </h3>
              <ul className="flex flex-col gap-2">
                {nonCompliant.map((ad) => <li key={ad._id}><AdRow ad={ad} /></li>)}
              </ul>
            </div>
          )}

          {compliant.length > 0 && (
            <div>
              <h3 className="text-[11px] font-semibold text-gray-600 uppercase tracking-[0.05em] mb-2 mt-4">
                Complied / Current — {compliant.length}
              </h3>
              <ul className="flex flex-col gap-2">
                {compliant.map((ad) => <li key={ad._id}><AdRow ad={ad} /></li>)}
              </ul>
            </div>
          )}

          {notApplicable.length > 0 && (
            <div>
              <h3 className="text-[11px] font-semibold text-gray-600 uppercase tracking-[0.05em] mb-2 mt-4">
                Not Applicable — {notApplicable.length}
              </h3>
              <ul className="flex flex-col gap-2">
                {notApplicable.slice(0, 5).map((ad) => (
                  <li key={ad._id}>
                    <div className="rounded-[6px] border border-[#363D4E] bg-[#1A1E28] opacity-60 px-4 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <span className="font-mono text-[12px] text-gray-500">AD {ad.adNumber}</span>
                        <span className="text-[12px] text-gray-600 flex-1 truncate">{ad.adTitle}</span>
                        <StatusBadge variant="cancelled" label="N/A" size="sm" />
                      </div>
                    </div>
                  </li>
                ))}
                {notApplicable.length > 5 && (
                  <li className="text-[12px] text-gray-600 pl-4">
                    + {notApplicable.length - 5} more not-applicable ADs
                  </li>
                )}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Equipment tab
// ---------------------------------------------------------------------------

function EquipmentTab({ parts }: { parts: InstalledPartItem[] | undefined }) {
  if (parts === undefined) return <GenericListSkeleton rows={4} />;

  const lifeLimited = parts.filter((p) => p.isLifeLimited);
  const shelfLifeConcern = parts.filter(
    (p) =>
      p.hasShelfLifeLimit &&
      p.shelfLifeLimitDate !== undefined &&
      p.shelfLifeLimitDate < Date.now() + 90 * 24 * 60 * 60 * 1000, // 90 days
  );
  const standard = parts.filter((p) => !p.isLifeLimited);

  const PartRow = ({ part }: { part: InstalledPartItem }) => {
    const condInfo = PART_CONDITION_LABELS[part.condition] ?? {
      label: part.condition,
      color: "text-gray-500",
    };
    const shelfExpired =
      part.shelfLifeLimitDate !== undefined && part.shelfLifeLimitDate < Date.now();
    const shelfCritical =
      !shelfExpired &&
      part.hasShelfLifeLimit &&
      part.shelfLifeLimitDate !== undefined &&
      part.shelfLifeLimitDate < Date.now() + 90 * 24 * 60 * 60 * 1000;

    return (
      <div
        className={cn(
          "rounded-[6px] border border-[#363D4E] bg-[#1A1E28] px-4 py-3",
          shelfExpired && "border-l-4 border-l-red-600",
          shelfCritical && !shelfExpired && "border-l-4 border-l-amber-600",
        )}
      >
        {/* Part number + name */}
        <div className="flex items-start gap-2.5 mb-1">
          <div className="flex-1 min-w-0">
            <span className="font-mono text-[13px] text-gray-300 font-medium">
              P/N: {part.partNumber}
            </span>
          </div>
          <span className={cn("text-[12px] font-medium shrink-0", condInfo.color)}>
            {condInfo.label}
          </span>
        </div>

        <p className="text-[14px] text-gray-300 mb-1.5">{part.partName}</p>

        {/* Serial + position */}
        <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[12px] text-gray-500 mb-1">
          {part.serialNumber && (
            <span className="font-mono">S/N: {part.serialNumber}</span>
          )}
          {part.installPosition && (
            <span>Position: {part.installPosition}</span>
          )}
          {part.installedAt && (
            <span className="tabular-nums">Installed {formatDate(part.installedAt)}</span>
          )}
          {part.hoursAtInstallation && (
            <span className="tabular-nums">at {formatHours(part.hoursAtInstallation)}</span>
          )}
        </div>

        {/* Life limit */}
        {part.isLifeLimited && part.lifeLimitHours && (
          <p className="text-[12px] text-amber-400">
            Life limit: {formatHours(part.lifeLimitHours)}
          </p>
        )}

        {/* Shelf life */}
        {part.hasShelfLifeLimit && part.shelfLifeLimitDate && (
          <p
            className={cn(
              "text-[12px] tabular-nums",
              shelfExpired ? "text-red-400" : shelfCritical ? "text-amber-400" : "text-gray-500",
            )}
          >
            {shelfExpired ? "⚠ Shelf life expired" : "Shelf life expires"}{" "}
            {formatDate(part.shelfLifeLimitDate)}
          </p>
        )}

        {/* 8130-3 */}
        {part.eightOneThirtyId && (
          <p className="text-[11px] text-gray-600 mt-1">8130-3 on file</p>
        )}
      </div>
    );
  };

  return (
    <div>
      <p className="text-[13px] text-gray-500 mb-3">
        {parts.length} installed part{parts.length !== 1 ? "s" : ""}
        {shelfLifeConcern.length > 0 && (
          <span className="ml-2 text-amber-400">
            ({shelfLifeConcern.length} shelf-life concern{shelfLifeConcern.length !== 1 ? "s" : ""})
          </span>
        )}
      </p>

      {parts.length === 0 ? (
        <div className="rounded-[6px] border border-[#363D4E] border-dashed flex flex-col items-center py-10 px-4 text-center">
          <p className="text-[14px] text-gray-400">No installed parts recorded</p>
        </div>
      ) : (
        <div className="space-y-3">
          {lifeLimited.length > 0 && (
            <div>
              <h3 className="text-[11px] font-semibold text-amber-700 uppercase tracking-[0.05em] mb-2">
                Life-Limited Parts — {lifeLimited.length}
              </h3>
              <ul className="flex flex-col gap-2">
                {lifeLimited.map((p) => <li key={p._id}><PartRow part={p} /></li>)}
              </ul>
            </div>
          )}
          {standard.length > 0 && (
            <div>
              <h3 className="text-[11px] font-semibold text-gray-600 uppercase tracking-[0.05em] mb-2 mt-4">
                Components — {standard.length}
              </h3>
              <ul className="flex flex-col gap-2">
                {standard.map((p) => <li key={p._id}><PartRow part={p} /></li>)}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default function AircraftDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const { can, isAtLeast, isLoaded } = useOrgRole();

  const [activeTab, setActiveTab] = useState<AircraftTab>("work_orders");

  // ── Data queries ──
  const aircraft = useQuery(
    api.aircraft?.get ?? null,
    id ? { id } : "skip",
  ) as AircraftDetail | undefined;

  const workOrders = useQuery(
    api.workOrders?.listByAircraft ?? null,
    id ? { aircraftId: id } : "skip",
  ) as WorkOrderHistoryItem[] | undefined;

  const adCompliance = useQuery(
    api.adCompliance?.listByAircraft ?? null,
    id ? { aircraftId: id } : "skip",
  ) as AdComplianceItem[] | undefined;

  const installedParts = useQuery(
    api.parts?.listInstalledOnAircraft ?? null,
    id ? { aircraftId: id } : "skip",
  ) as InstalledPartItem[] | undefined;

  const squawks = useQuery(
    api.squawks?.listByAircraft ?? null,
    id ? { aircraftId: id } : "skip",
  ) as SquawkItem[] | undefined;

  // ── Derived state ──
  const isLoading = aircraft === undefined;
  const canCreateWO = isLoaded && can("createWorkOrder");
  const canAuthorize = isLoaded && can("authorizeSquawk");
  const canViewCompliance = isLoaded && can("viewCompliance");
  const canApproveRts = isLoaded && can("approveRts");

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* ── Header ── */}
      {isLoading ? (
        <AircraftDetailHeaderSkeleton />
      ) : aircraft ? (
        <div className="px-4 pt-5 pb-4 sm:px-6 border-b border-[#363D4E]">
          {/* Back link */}
          <Link
            href="/aircraft"
            className="inline-flex items-center gap-1.5 text-[12px] text-gray-500 hover:text-gray-300 transition-colors mb-3"
          >
            <svg aria-hidden className="w-3.5 h-3.5" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="8,2 4,6 8,10" />
            </svg>
            Fleet
          </Link>

          {/* Tail number + status */}
          <div className="flex items-center gap-3 mb-1">
            <h1 className="font-mono text-[28px] font-bold text-gray-100 tracking-wide leading-tight">
              {aircraft.tailNumber}
            </h1>
            <StatusBadge
              variant={
                aircraft.status === "airworthy" ? "active" :
                aircraft.status === "in_maintenance" ? "on_hold" :
                aircraft.status === "out_of_service" ? "overdue" :
                "pending"
              }
              label={
                aircraft.status === "airworthy" ? "AIRWORTHY" :
                aircraft.status === "in_maintenance" ? "IN MAINT." :
                aircraft.status === "out_of_service" ? "OOS" :
                aircraft.status.toUpperCase()
              }
            />
          </div>

          {/* Make/model/year */}
          <p className="text-[16px] text-gray-300 mb-0.5">
            {aircraft.make} {aircraft.model}
            {aircraft.series && ` ${aircraft.series}`}
            {aircraft.yearOfManufacture && (
              <span className="text-gray-500"> · {aircraft.yearOfManufacture}</span>
            )}
          </p>
          <p className="text-[13px] text-gray-500 mb-1">
            {aircraft.customerName ?? aircraft.ownerName ?? "No owner on record"}
            <span className="font-mono ml-3 text-gray-600">S/N {aircraft.serialNumber}</span>
          </p>
          {aircraft.baseLocation && (
            <p className="text-[12px] text-gray-600 mb-2">
              Based at {aircraft.baseLocation}
              {aircraft.operatingRegulation && ` · ${aircraft.operatingRegulation.replace("_", " ").toUpperCase()}`}
            </p>
          )}

          {/* Airframe time */}
          <div className="flex flex-wrap gap-4 mb-4">
            <div>
              <p className="text-[11px] text-gray-600 uppercase tracking-[0.04em]">Airframe TT</p>
              <p className="text-[20px] font-semibold tabular-nums text-gray-200">
                {formatHours(aircraft.totalTimeAirframeHours)}
              </p>
              <p className="text-[11px] text-gray-600">
                as of {formatDate(aircraft.totalTimeAirframeAsOfDate)}
              </p>
            </div>
            {aircraft.engineCount > 0 && (
              <div>
                <p className="text-[11px] text-gray-600 uppercase tracking-[0.04em]">Engines</p>
                <p className="text-[20px] font-semibold tabular-nums text-gray-200">
                  {aircraft.engineCount}
                </p>
              </div>
            )}
          </div>

          {/* Release readiness summary — shown for inspectors and up */}
          <ReleaseReadinessSummary
            aircraft={aircraft}
            canViewCompliance={canViewCompliance}
          />

          {/* RTS button — inspector+ */}
          {canApproveRts && aircraft.unsignedTaskCardCount === 0 && aircraft.openWorkOrderCount > 0 && (
            <Link
              href={`/work-orders?aircraftId=${id}&status=pending_signoff`}
              className={cn(
                "mt-3 inline-flex items-center gap-2 px-4 h-10 rounded-[6px]",
                "bg-green-700/40 border border-green-600/50",
                "text-[13px] font-semibold text-green-300 uppercase tracking-[0.04em]",
                "hover:bg-green-700/60 transition-colors",
              )}
            >
              View RTS Sign-Off →
            </Link>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center flex-1 px-4 py-16">
          <p className="text-[16px] text-gray-400 mb-2">Aircraft not found</p>
          <Link href="/aircraft" className="text-[14px] text-blue-400 hover:text-blue-300">
            ← Back to Fleet
          </Link>
        </div>
      )}

      {/* ── Tabs ── */}
      {!isLoading && aircraft && (
        <>
          <div
            role="tablist"
            aria-label="Aircraft record sections"
            className="flex items-center border-b border-[#363D4E] px-4 sm:px-6 overflow-x-auto scrollbar-none -mb-px"
          >
            {AIRCRAFT_TABS.map((tab) => {
              const alertCount = tab.getAlertCount?.(aircraft);
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
                  {alertCount !== undefined && alertCount > 0 && (
                    <span
                      className={cn(
                        "ml-1.5 inline-flex items-center justify-center",
                        "h-4 min-w-[16px] px-1 rounded-full text-[11px] font-semibold",
                        tab.id === "ad_status"
                          ? "bg-red-900/60 text-red-400"
                          : "bg-amber-900/60 text-amber-400",
                      )}
                    >
                      {alertCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div
            className="flex-1 overflow-y-auto px-4 pt-4 pb-8 sm:px-6"
            role="tabpanel"
            aria-label={AIRCRAFT_TABS.find((t) => t.id === activeTab)?.label}
          >
            {activeTab === "work_orders" && (
              <WorkOrdersTab
                workOrders={workOrders}
                canCreateWO={canCreateWO}
                aircraftId={id}
              />
            )}
            {activeTab === "squawks" && (
              <SquawksTab
                squawks={squawks}
                canAuthorize={canAuthorize}
              />
            )}
            {activeTab === "ad_status" && (
              <AdStatusTab
                adCompliance={adCompliance}
                canViewCompliance={canViewCompliance}
              />
            )}
            {activeTab === "equipment" && (
              <EquipmentTab parts={installedParts} />
            )}
          </div>
        </>
      )}
    </div>
  );
}
