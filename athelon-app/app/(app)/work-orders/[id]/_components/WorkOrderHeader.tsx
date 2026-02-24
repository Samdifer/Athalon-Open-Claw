"use client";

/**
 * WorkOrderHeader.tsx
 * Extracted from work-orders/[id]/page.tsx (TD-009).
 * Renders: back link, WO number, status badge, aircraft info, action buttons.
 */

import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

// ─── Local helpers (mirrors what was in the parent page) ─────────────────────

const STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  open: "Open",
  in_progress: "In Progress",
  on_hold: "On Hold",
  pending_inspection: "Pending Inspection",
  pending_signoff: "Pending Sign-Off",
  open_discrepancies: "Open Discrepancies",
  closed: "Closed",
  cancelled: "Cancelled",
  voided: "Voided",
};

const WO_TYPE_LABEL: Record<string, string> = {
  routine: "Routine",
  unscheduled: "Unscheduled",
  annual_inspection: "Annual Inspection",
  "100hr_inspection": "100-Hour Inspection",
  progressive_inspection: "Progressive Inspection",
  ad_compliance: "AD Compliance",
  major_repair: "Major Repair",
  major_alteration: "Major Alteration",
  field_approval: "Field Approval",
  ferry_permit: "Ferry Permit",
};

function getStatusStyles(status: string): string {
  const map: Record<string, string> = {
    in_progress: "bg-sky-500/15 text-sky-400 border-sky-500/30",
    open: "bg-blue-500/15 text-blue-400 border-blue-500/30",
    pending_signoff: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    pending_inspection: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    on_hold: "bg-orange-500/15 text-orange-400 border-orange-500/30",
    draft: "bg-slate-500/15 text-slate-400 border-slate-500/30",
    closed: "bg-green-500/15 text-green-400 border-green-500/30",
    cancelled: "bg-slate-500/15 text-slate-400 border-slate-500/30",
    open_discrepancies: "bg-red-500/15 text-red-400 border-red-500/30",
  };
  return map[status] ?? "bg-muted text-muted-foreground";
}

// ─── Prop types ───────────────────────────────────────────────────────────────

interface WorkOrder {
  workOrderNumber: string;
  status: string;
  workOrderType: string;
  priority: string;
  description?: string;
}

interface Aircraft {
  currentRegistration: string;
  make: string;
  model: string;
  serialNumber?: string;
}

export interface WorkOrderHeaderProps {
  wo: WorkOrder;
  aircraft: Aircraft | null | undefined;
  id: string;
  canClose: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function WorkOrderHeader({ wo, aircraft, id, canClose }: WorkOrderHeaderProps) {
  return (
    <div>
      <Button
        asChild
        variant="ghost"
        size="sm"
        className="h-7 -ml-2 mb-3 text-xs text-muted-foreground"
      >
        <Link href="/work-orders">
          <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
          Work Orders
        </Link>
      </Button>
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1 flex-wrap">
            <h1 className="text-xl font-semibold font-mono text-foreground">
              {wo.workOrderNumber}
            </h1>
            <Badge
              variant="outline"
              className={`text-[11px] font-medium border ${getStatusStyles(wo.status)}`}
            >
              {STATUS_LABEL[wo.status] ?? wo.status}
            </Badge>
            <Badge
              variant="outline"
              className="text-[10px] text-muted-foreground border-border/40"
            >
              {WO_TYPE_LABEL[wo.workOrderType] ?? wo.workOrderType}
            </Badge>
            {wo.priority === "aog" && (
              <Badge className="bg-red-500/15 text-red-400 border border-red-500/30 text-[11px] font-semibold">
                AOG
              </Badge>
            )}
            {wo.priority === "urgent" && (
              <Badge className="bg-orange-500/15 text-orange-400 border border-orange-500/30 text-[11px]">
                Urgent
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono font-bold text-2xl text-foreground">
              {aircraft?.currentRegistration ?? "—"}
            </span>
            {aircraft && (
              <span className="text-base text-muted-foreground">
                {aircraft.make} {aircraft.model}
              </span>
            )}
            {aircraft?.serialNumber && (
              <>
                <span className="text-muted-foreground/40">·</span>
                <span className="text-sm text-muted-foreground">
                  S/N {aircraft.serialNumber}
                </span>
              </>
            )}
          </div>
          {wo.description && (
            <p className="text-sm text-muted-foreground mt-1">
              {wo.description}
            </p>
          )}
        </div>

        {/* Sign-Off Button */}
        <div className="flex-shrink-0 flex gap-2">
          {canClose ? (
            <Button asChild className="gap-2">
              <Link href={`/work-orders/${id}/signature`}>
                <ShieldCheck className="w-4 h-4" />
                Sign Off & Close
              </Link>
            </Button>
          ) : (
            <Button
              variant="outline"
              disabled
              className="gap-2 opacity-50 cursor-not-allowed"
            >
              <ShieldCheck className="w-4 h-4" />
              Sign Off & Close
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
