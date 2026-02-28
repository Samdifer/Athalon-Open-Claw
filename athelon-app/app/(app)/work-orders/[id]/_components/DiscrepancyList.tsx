"use client";

/**
 * DiscrepancyList.tsx
 * Extracted from work-orders/[id]/page.tsx (TD-009).
 * Renders the "Squawks / Discrepancies" tab content.
 *
 * Phase D: OP-1003 alignment — displays discrepancy type, system type,
 * RII flag, customer approval status, labor estimates, and discovered-when.
 *
 * AI-006: Wired "Log Squawk" button — opens LogSquawkDialog when
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
import { LogSquawkDialog } from "./LogSquawkDialog";

// ─── Prop types ───────────────────────────────────────────────────────────────

interface Discrepancy {
  _id: string;
  _creationTime: number;
  discrepancyNumber?: string;
  status: string;
  description: string;
  disposition?: string;
  // OP-1003 fields
  discrepancyType?: "mandatory" | "recommended" | "customer_information" | "ops_check";
  systemType?: "airframe" | "engine" | "propeller" | "appliance";
  discoveredWhen?: "customer_report" | "planning" | "inspection" | "post_quote";
  customerApprovalStatus?: "pending" | "approved_by_customer" | "approved_by_station" | "denied";
  riiRequired?: boolean;
  mhEstimate?: number;
  mhActual?: number;
}

export interface DiscrepancyListProps {
  discrepancies: Discrepancy[];
  /** Required to enable the Log Squawk button. Without these, button is hidden. */
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

// ─── Component ────────────────────────────────────────────────────────────────

export function DiscrepancyList({
  discrepancies,
  orgId,
  techId,
  workOrderId,
  aircraftCurrentHours,
}: DiscrepancyListProps) {
  const [logSquawkOpen, setLogSquawkOpen] = useState(false);

  // Sum of mhEstimate across non-dispositioned discrepancies
  const totalMhEstimate = discrepancies
    .filter((d) => d.status !== "dispositioned")
    .reduce((sum, d) => sum + (d.mhEstimate ?? 0), 0);

  const canLogSquawk = Boolean(orgId && techId && workOrderId);

  return (
    <div className="space-y-2">
      {/* Total labor estimate header */}
      {totalMhEstimate > 0 && (
        <div className="flex items-center gap-2 px-1 pb-1">
          <Clock className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">
            Open discrepancies est: <span className="font-medium text-foreground">{totalMhEstimate.toFixed(1)}h</span>
          </span>
        </div>
      )}

      {discrepancies.length === 0 ? (
        <Card className="border-border/60">
          <CardContent className="py-10 text-center">
            <CheckCircle2 className="w-6 h-6 text-green-400/60 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              No squawks on this work order
            </p>
          </CardContent>
        </Card>
      ) : (
        discrepancies.map((sq) => {
          const isDenied = sq.customerApprovalStatus === "denied";
          const typeBadge = sq.discrepancyType ? DISCREPANCY_TYPE_BADGE[sq.discrepancyType] : null;
          const approvalBadge = sq.customerApprovalStatus ? APPROVAL_STATUS_BADGE[sq.customerApprovalStatus] : null;

          return (
            <Card
              key={sq._id}
              className={`border-l-4 border-border/60 ${
                isDenied ? "border-l-muted-foreground opacity-70" : "border-l-red-500"
              }`}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    {/* Row 1: Number + badges */}
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-mono text-xs text-muted-foreground">
                        {sq.discrepancyNumber ?? sq._id}
                      </span>
                      {/* Status badge */}
                      <Badge
                        className={`border text-[10px] ${
                          sq.status === "open"
                            ? "bg-red-500/15 text-red-400 border-red-500/30"
                            : "bg-amber-500/15 text-amber-400 border-amber-500/30"
                        }`}
                      >
                        {sq.status === "open" ? "Open" : sq.status}
                      </Badge>
                      {/* Disposition badge */}
                      {sq.disposition && (
                        <Badge
                          variant="outline"
                          className="text-[10px] text-amber-400 border-amber-500/30"
                        >
                          {sq.disposition}
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

      {/* Log Squawk button — hidden in read-only (portal) mode */}
      {canLogSquawk && (
        <Button
          variant="outline"
          size="sm"
          className="w-full h-9 text-xs border-border/60 border-dashed gap-1.5 mt-2"
          onClick={() => setLogSquawkOpen(true)}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          Log Squawk
        </Button>
      )}

      {/* Log Squawk Dialog */}
      {canLogSquawk && orgId && techId && workOrderId && (
        <LogSquawkDialog
          open={logSquawkOpen}
          onClose={() => setLogSquawkOpen(false)}
          workOrderId={workOrderId}
          orgId={orgId}
          techId={techId}
          aircraftCurrentHours={aircraftCurrentHours}
        />
      )}
    </div>
  );
}
