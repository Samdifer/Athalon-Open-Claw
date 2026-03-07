"use client";

/**
 * FindingList.tsx
 * Extracted from work-orders/[id]/page.tsx (TD-009).
 * Renders the Findings section within the Tasks tab.
 *
 * Phase D: OP-1003 alignment — displays finding type, system type,
 * RII flag, customer approval status, labor estimates, and discovered-when.
 *
 * AI-006: Wired "Log Finding" button — opens LogFindingDialog when
 * orgId, techId, and workOrderId props are provided. Without them the
 * button is hidden (read-only portal mode).
 */

import { useState } from "react";
import { AlertTriangle, CheckCircle2, ShieldAlert, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate } from "@/lib/format";
import type { Id } from "@/convex/_generated/dataModel";
import { LogFindingDialog } from "./LogFindingDialog";

// ─── Prop types ───────────────────────────────────────────────────────────────

interface Discrepancy {
  _id: string;
  _creationTime: number;
  discrepancyNumber?: string;
  status: string;
  description: string;
  disposition?: string;
  squawkOrigin?: string;
  isCustomerReported?: boolean;
  foundDuringRts?: boolean;
  // OP-1003 fields
  discrepancyType?: "mandatory" | "recommended" | "customer_information" | "ops_check";
  systemType?: "airframe" | "engine" | "propeller" | "appliance";
  discoveredWhen?: "customer_report" | "planning" | "inspection" | "post_quote";
  customerApprovalStatus?: "pending" | "approved_by_customer" | "approved_by_station" | "denied";
  riiRequired?: boolean;
  mhEstimate?: number;
  mhActual?: number;
}

export interface FindingListProps {
  discrepancies: Discrepancy[];
  /** Required to enable the Log Finding button. Without these, button is hidden. */
  orgId?: Id<"organizations">;
  techId?: Id<"technicians">;
  workOrderId?: Id<"workOrders">;
  aircraftCurrentHours?: number | null;
}

// ─── Badge helpers ───────────────────────────────────────────────────────────

const DISCREPANCY_TYPE_BADGE: Record<string, { label: string; className: string }> = {
  mandatory: { label: "Mandatory", className: "bg-red-500/15 text-red-400 border-red-500/30" },
  recommended: { label: "Recommended", className: "bg-amber-500/15 text-amber-400 border-amber-500/30" },
  customer_information: { label: "Info Only", className: "bg-sky-500/15 text-sky-400 border-sky-500/30" },
  ops_check: { label: "Ops Check", className: "bg-violet-500/15 text-violet-400 border-violet-500/30" },
};

const SYSTEM_TYPE_LABEL: Record<string, string> = {
  airframe: "Airframe",
  engine: "Engine",
  propeller: "Propeller",
  appliance: "Appliance",
};

// BUG-LT-26-001: Raw database status values ("under_evaluation", "dispositioned")
// were displayed directly in the status badge. A tech reviewing findings on a WO
// would see "under_evaluation" or "dispositioned" as badge text — not readable.
const DISCREPANCY_STATUS_LABEL: Record<string, string> = {
  open: "Open",
  under_evaluation: "Under Evaluation",
  dispositioned: "Dispositioned",
};

const DISCREPANCY_STATUS_STYLE: Record<string, string> = {
  open: "bg-red-500/15 text-red-400 border-red-500/30",
  under_evaluation: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  dispositioned: "bg-green-500/15 text-green-400 border-green-500/30",
};

// BUG-LT-26-001: Raw disposition values ("deferred_mel", "no_defect") were shown
// directly in the disposition badge. A tech can't parse "deferred_mel" or
// "repaired_and_approved" while reviewing findings.
const DISPOSITION_LABEL: Record<string, string> = {
  deferred_mel: "MEL Deferred",
  deferred_grounded: "Grounded/Deferred",
  repaired: "Repaired",
  replaced: "Replaced",
  adjusted: "Adjusted",
  inspected: "Inspected",
  no_defect: "No Defect Found",
  placard_applied: "Placard Applied",
  returned_to_service: "Returned to Service",
};

const DISCOVERED_WHEN_LABEL: Record<string, string> = {
  customer_report: "Customer Report",
  planning: "Planning",
  inspection: "Inspection",
  post_quote: "After Quote",
};

const APPROVAL_STATUS_BADGE: Record<string, { label: string; className: string }> = {
  pending: { label: "Awaiting Approval", className: "bg-muted text-muted-foreground border-border/60" },
  approved_by_customer: { label: "Customer Approved", className: "bg-green-500/15 text-green-400 border-green-500/30" },
  approved_by_station: { label: "Station Approved", className: "bg-sky-500/15 text-sky-400 border-sky-500/30" },
  denied: { label: "Denied", className: "bg-red-500/15 text-red-400 border-red-500/30" },
};

function toStableFindingId(rawNumber?: string, fallbackOrdinal = 1): string {
  if (rawNumber) {
    const matched = rawNumber.match(/(\d+)$/);
    if (matched) return `SQ-${matched[1].padStart(3, "0")}`;
  }
  return `SQ-${String(fallbackOrdinal).padStart(3, "0")}`;
}

function getFindingOriginTag(discrepancy: Discrepancy): string {
  if (discrepancy.foundDuringRts) return "rts-found";
  if (discrepancy.isCustomerReported) return "customer-reported";
  const map: Record<string, string> = {
    inspection_finding: "inspection-found",
    customer_reported: "customer-reported",
    rts_finding: "rts-found",
    routine_check: "planned",
    ad_compliance_check: "planned",
    planning: "planned",
    inspection: "inspection-found",
    customer_report: "customer-reported",
    post_quote: "post-release-found",
  };
  return map[discrepancy.squawkOrigin ?? ""] ?? "planned";
}

// ─── Component ────────────────────────────────────────────────────────────────

export function FindingList({
  discrepancies,
  orgId,
  techId,
  workOrderId,
  aircraftCurrentHours,
}: FindingListProps) {
  const [logFindingOpen, setLogFindingOpen] = useState(false);

  // Sum of mhEstimate across actionable discrepancies only.
  // BUG-LT-HUNT-090: Previous filter only excluded "dispositioned" status —
  // customer-denied findings (customerApprovalStatus === "denied") were still
  // included in the labor estimate. A denied finding is one the customer
  // explicitly declined to have repaired; including its MH estimate in the
  // "Open findings est" total inflated the labor forecast with hours that
  // will never be performed. A shop manager scheduling techs would see, say,
  // "4.0h" when the actual authorized work is only "2.5h" — causing over-
  // scheduling against a non-existent work scope. Fix: also exclude denied
  // findings from the labor estimate total.
  const totalMhEstimate = discrepancies
    .filter(
      (d) =>
        d.status !== "dispositioned" &&
        d.customerApprovalStatus !== "denied",
    )
    .reduce((sum, d) => sum + (d.mhEstimate ?? 0), 0);

  const canLogFinding = Boolean(orgId && techId && workOrderId);

  return (
    <div className="space-y-2">
      {/* Total labor estimate header */}
      {totalMhEstimate > 0 && (
        <div className="flex items-center gap-2 px-1 pb-1">
          <Clock className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">
            Open findings est: <span className="font-medium text-foreground">{totalMhEstimate.toFixed(1)}h</span>
          </span>
        </div>
      )}

      {discrepancies.length === 0 ? (
        <Card className="border-border/60">
          <CardContent className="py-10 text-center">
            <CheckCircle2 className="w-6 h-6 text-green-400/60 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              No findings on this work order
            </p>
          </CardContent>
        </Card>
      ) : (
        discrepancies.map((sq, idx) => {
          const isDenied = sq.customerApprovalStatus === "denied";
          const typeBadge = sq.discrepancyType ? DISCREPANCY_TYPE_BADGE[sq.discrepancyType] : null;
          const approvalBadge = sq.customerApprovalStatus ? APPROVAL_STATUS_BADGE[sq.customerApprovalStatus] : null;
          const stableFindingId = toStableFindingId(sq.discrepancyNumber, idx + 1);
          const originTag = getFindingOriginTag(sq);

          // BUG-QCM-C10: Previously all non-denied findings used border-l-red-500
          // regardless of status. A QCM reviewing a WO with 5 dispositioned
          // findings saw all 5 with red left borders — same visual weight as
          // open findings that still need action. The inspector couldn't glance at
          // the list and know the WO is clean. Now: open=red, under_evaluation=amber,
          // dispositioned=green (subtle), denied=muted/dimmed.
          const borderColor =
            isDenied
              ? "border-l-muted-foreground opacity-70"
              : sq.status === "dispositioned"
                ? "border-l-green-500/50"
                : sq.status === "under_evaluation"
                  ? "border-l-amber-500"
                  : "border-l-red-500"; // open or unknown

          // Match the icon color to the status as well.
          const alertIconColor =
            sq.status === "dispositioned"
              ? "text-green-400/60"
              : sq.status === "under_evaluation"
                ? "text-amber-400"
                : "text-red-400";

          return (
            <Card
              key={sq._id}
              id={`finding-${sq._id}`}
              className={`border-l-4 border-border/60 ${borderColor}`}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className={`w-4 h-4 flex-shrink-0 mt-0.5 ${alertIconColor}`} />
                  <div className="flex-1 min-w-0">
                    {/* Row 1: Number + badges */}
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-mono text-xs text-muted-foreground">
                        {stableFindingId}
                      </span>
                      {/* Status badge */}
                      <Badge
                        className={`border text-[10px] ${DISCREPANCY_STATUS_STYLE[sq.status] ?? "bg-muted text-muted-foreground border-border/60"}`}
                      >
                        {DISCREPANCY_STATUS_LABEL[sq.status] ?? sq.status}
                      </Badge>
                      <Badge variant="outline" className="text-[10px] border-border/60 lowercase">
                        {originTag}
                      </Badge>
                      {/* Disposition badge */}
                      {sq.disposition && (
                        <Badge
                          variant="outline"
                          className="text-[10px] text-amber-400 border-amber-500/30"
                        >
                          {DISPOSITION_LABEL[sq.disposition] ?? sq.disposition.replace(/_/g, " ")}
                        </Badge>
                      )}
                      {/* Discrepancy type badge */}
                      {typeBadge && (
                        <Badge className={`border text-[10px] ${typeBadge.className}`}>
                          {typeBadge.label}
                        </Badge>
                      )}
                      {/* System type tag */}
                      {sq.systemType && (
                        <Badge variant="outline" className="text-[10px] border-border/60 text-muted-foreground">
                          {SYSTEM_TYPE_LABEL[sq.systemType] ?? sq.systemType}
                        </Badge>
                      )}
                      {/* RII Required badge */}
                      {sq.riiRequired && (
                        <Badge className="border text-[10px] bg-amber-500/15 text-amber-400 border-amber-500/30 gap-1">
                          <ShieldAlert className="w-3 h-3" />
                          RII Required
                        </Badge>
                      )}
                      {/* Customer approval status */}
                      {approvalBadge && (
                        <Badge className={`border text-[10px] ${approvalBadge.className}`}>
                          {approvalBadge.label}
                        </Badge>
                      )}
                    </div>

                    {/* Description */}
                    <p className={`text-sm text-foreground ${isDenied ? "line-through" : ""}`}>
                      {sq.description}
                    </p>

                    {/* Metadata row */}
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      <p className="text-[11px] text-muted-foreground">
                        Found {formatDate(sq._creationTime)}
                      </p>
                      {sq.discoveredWhen && (
                        <p className="text-[11px] text-muted-foreground">
                          Found during: {DISCOVERED_WHEN_LABEL[sq.discoveredWhen] ?? sq.discoveredWhen}
                        </p>
                      )}
                    </div>

                    {/* Labor estimate / actual */}
                    {(sq.mhEstimate != null || sq.mhActual != null) && (
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Est: {sq.mhEstimate != null ? `${sq.mhEstimate.toFixed(1)}h` : "\u2014"}
                        {" | "}
                        Actual: {sq.mhActual != null ? `${sq.mhActual.toFixed(1)}h` : "\u2014"}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })
      )}

      {/* Log Finding button — hidden in read-only (portal) mode */}
      {canLogFinding && (
        <Button
          variant="outline"
          size="sm"
          className="w-full h-9 text-xs border-border/60 border-dashed gap-1.5 mt-2"
          onClick={() => setLogFindingOpen(true)}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          Log Finding
        </Button>
      )}

      {/* Log Finding Dialog */}
      {canLogFinding && orgId && techId && workOrderId && (
        <LogFindingDialog
          open={logFindingOpen}
          onClose={() => setLogFindingOpen(false)}
          workOrderId={workOrderId}
          orgId={orgId}
          techId={techId}
          aircraftCurrentHours={aircraftCurrentHours}
        />
      )}
    </div>
  );
}
