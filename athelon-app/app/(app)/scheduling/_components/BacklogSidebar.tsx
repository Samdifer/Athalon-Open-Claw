"use client";

import { X } from "lucide-react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

// ─────────────────────────────────────────────────────────────────────────────
// LOCAL TYPE: WorkOrderWithRisk
// Mirrors the return shape of convex/workOrders.ts getWorkOrdersWithScheduleRisk
// ─────────────────────────────────────────────────────────────────────────────

type WorkOrderWithRisk = {
  _id: string;
  workOrderNumber: string;
  status: string;
  priority: "routine" | "urgent" | "aog";
  description: string;
  openedAt: number;
  promisedDeliveryDate?: number;
  scheduledStartDate?: number;
  estimatedLaborHoursOverride?: number;
  taskCardEstimateTotal: number;
  effectiveEstimatedHours: number;
  completedHours: number;
  remainingHours: number;
  riskLevel: "overdue" | "at_risk" | "on_track" | "no_date";
  aircraft: { currentRegistration: string | undefined; make: string; model: string } | null;
};

// ─────────────────────────────────────────────────────────────────────────────
// PROPS
// ─────────────────────────────────────────────────────────────────────────────

interface BacklogSidebarProps {
  workOrders: WorkOrderWithRisk[];
  isOpen: boolean;
  onClose: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// PRIORITY CONFIG
// ─────────────────────────────────────────────────────────────────────────────

const PRIORITY_ORDER: Record<WorkOrderWithRisk["priority"], number> = {
  aog: 0,
  urgent: 1,
  routine: 2,
};

function PriorityBadge({ priority }: { priority: WorkOrderWithRisk["priority"] }) {
  if (priority === "aog") {
    return (
      <Badge className="bg-red-600 text-white border-red-500 text-[10px] px-1.5 py-0">
        AOG
      </Badge>
    );
  }
  if (priority === "urgent") {
    return (
      <Badge className="bg-orange-500 text-white border-orange-400 text-[10px] px-1.5 py-0">
        URGENT
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
      ROUTINE
    </Badge>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export function BacklogSidebar({ workOrders, isOpen, onClose }: BacklogSidebarProps) {
  // Filter to unscheduled WOs
  const unscheduled = workOrders.filter(
    (wo) => !wo.promisedDeliveryDate || !wo.scheduledStartDate,
  );

  // Sort: AOG first, then urgent, then routine
  const sorted = [...unscheduled].sort(
    (a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority],
  );

  if (!isOpen) return null;

  return (
    <div
      className="fixed top-12 right-0 bottom-0 w-full sm:w-[280px] z-50 flex flex-col bg-background border-l border-border/50 shadow-2xl"
      role="dialog"
      aria-label="Unscheduled Work Orders"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-foreground">
            Unscheduled Work Orders
          </span>
          {unscheduled.length > 0 && (
            <Badge variant="secondary" className="text-[11px] h-5 min-w-[20px] px-1.5">
              {unscheduled.length}
            </Badge>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onClose}
          aria-label="Close backlog sidebar"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        {sorted.length === 0 ? (
          // Empty state
          <div className="flex flex-col items-center justify-center h-full gap-2 px-4 text-center">
            <div className="text-2xl">&#10003;</div>
            <p className="text-sm font-medium text-foreground">
              All work orders are scheduled
            </p>
            <p className="text-xs text-muted-foreground">
              Every open WO has both a start date and a promised delivery date.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-border/40">
            {sorted.map((wo) => (
              <li key={wo._id} className="px-3 py-3 hover:bg-muted/30 transition-colors">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-col gap-0.5 min-w-0">
                    {/* Aircraft registration */}
                    {wo.aircraft && (
                      <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                        {wo.aircraft.currentRegistration}
                      </span>
                    )}
                    {/* WO number */}
                    <span className="text-xs font-mono font-semibold text-foreground truncate">
                      {wo.workOrderNumber}
                    </span>
                    {/* Description */}
                    <span className="text-[11px] text-muted-foreground truncate leading-snug">
                      {wo.description}
                    </span>
                  </div>
                  <div className="flex-shrink-0">
                    <PriorityBadge priority={wo.priority} />
                  </div>
                </div>
                {/* Set Dates link */}
                <div className="mt-2">
                  <Link
                    to={`/work-orders/${wo._id}`}
                    className="text-[11px] font-medium text-primary hover:underline"
                  >
                    Set Dates &rarr;
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
