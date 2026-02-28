"use client";

/**
 * WorkOrderHeader.tsx
 * Extracted from work-orders/[id]/page.tsx (TD-009).
 * Renders: back link, WO number, status badge, aircraft info, action buttons.
 */

import { Link } from "react-router-dom";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  type WoStatus,
  type WoType,
  WO_STATUS_LABEL,
  WO_STATUS_STYLES,
  WO_TYPE_LABEL,
} from "@/lib/mro-constants";

// ─── Prop types ───────────────────────────────────────────────────────────────

interface WorkOrder {
  workOrderNumber: string;
  status: string;
  workOrderType: string;
  priority: string;
  description?: string;
}

interface Aircraft {
  currentRegistration?: string;
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
        <Link to="/work-orders">
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
              className={`text-[11px] font-medium border ${WO_STATUS_STYLES[wo.status as WoStatus] ?? "bg-muted text-muted-foreground"}`}
            >
              {WO_STATUS_LABEL[wo.status as WoStatus] ?? wo.status}
            </Badge>
            <Badge
              variant="outline"
              className="text-[10px] text-muted-foreground border-border/40"
            >
              {WO_TYPE_LABEL[wo.workOrderType as WoType] ?? wo.workOrderType}
            </Badge>
            {wo.priority === "aog" && (
              <Badge className="bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/30 text-[11px] font-semibold">
                AOG
              </Badge>
            )}
            {wo.priority === "urgent" && (
              <Badge className="bg-orange-500/15 text-orange-600 dark:text-orange-400 border border-orange-500/30 text-[11px]">
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
              <Link to={`/work-orders/${id}/rts`}>
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
