"use client";

import { useEffect } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * @deprecated Wave 8: this legacy component has been superseded by `GanttBoard`.
 * Keep this shim only to avoid hard failures from stale imports.
 */
export type WorkOrderWithRisk = {
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

interface GanttChartProps {
  workOrders: WorkOrderWithRisk[];
  onOpenBacklog: () => void;
  unscheduledCount: number;
}

export function GanttChart({ workOrders, unscheduledCount }: GanttChartProps) {
  useEffect(() => {
    console.warn(
      "[Deprecated] `GanttChart` is no longer maintained. Use `GanttBoard` from scheduling/page.tsx.",
    );
  }, []);

  return (
    <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium text-amber-300">
        <AlertTriangle className="h-4 w-4" />
        Legacy scheduler view is deprecated.
      </div>
      <p className="text-xs text-amber-100/90">
        This route now uses the maintained Wave 8 board. Loaded WOs: {workOrders.length}. Unscheduled:
        {" "}
        {unscheduledCount}.
      </p>
      <Button asChild size="sm" variant="secondary">
        <Link to="/scheduling">Open maintained scheduler board</Link>
      </Button>
    </div>
  );
}
