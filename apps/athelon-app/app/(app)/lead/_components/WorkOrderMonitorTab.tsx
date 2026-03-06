"use client";

import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  WO_STATUS_LABEL,
  WO_STATUS_STYLES,
  type WoStatus,
} from "@/lib/mro-constants";
import { formatDate } from "@/lib/format";

import type { WoSummaryItem } from "./types";

// ---------------------------------------------------------------------------
// WorkOrderMonitorTab — Tab 3 of Lead Center
//
// Expanded monitoring view of all active work orders with progress bars,
// status badges, and RTS dates.
// ---------------------------------------------------------------------------

interface WorkOrderMonitorTabProps {
  woSummary: WoSummaryItem[];
}

export function WorkOrderMonitorTab({ woSummary }: WorkOrderMonitorTabProps) {
  const activeWorkOrders = useMemo(() => {
    if (!woSummary) return [];
    return woSummary
      .filter((wo) =>
        [
          "open",
          "in_progress",
          "pending_inspection",
          "pending_signoff",
          "on_hold",
          "open_discrepancies",
        ].includes(wo.status),
      )
      .map((wo) => {
        const total = wo.taskCardCount ?? 0;
        const complete = wo.completedTaskCardCount ?? 0;
        const progress = total > 0 ? Math.round((complete / total) * 100) : 0;
        return {
          id: String(wo._id),
          number: wo.workOrderNumber,
          status: wo.status,
          aircraft: wo.aircraft?.currentRegistration ?? "—",
          progress,
          total,
          complete,
          remaining: Math.max(0, total - complete),
        };
      });
  }, [woSummary]);

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">
          Active Work Orders ({activeWorkOrders.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {activeWorkOrders.length === 0 ? (
          <p className="text-sm text-muted-foreground">No active work orders.</p>
        ) : (
          <div className="space-y-2">
            {activeWorkOrders.map((wo) => (
              <Link
                key={wo.id}
                to={`/work-orders/${wo.id}`}
                className="block border border-border/50 rounded-md p-3 hover:bg-muted/30 transition-colors"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-semibold">{wo.number}</span>
                    <Badge
                      variant="outline"
                      className={`text-[10px] border ${WO_STATUS_STYLES[wo.status as WoStatus] ?? "border-border/50 text-muted-foreground"}`}
                    >
                      {WO_STATUS_LABEL[wo.status as WoStatus] ?? wo.status}
                    </Badge>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    Aircraft: {wo.aircraft}
                  </span>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span>
                      {wo.complete}/{wo.total} tasks complete
                    </span>
                    <span className="font-medium">{wo.progress}%</span>
                  </div>
                  <Progress value={wo.progress} className="h-1.5" />
                </div>
                {wo.remaining > 0 && (
                  <p className="text-[11px] text-muted-foreground mt-1">
                    {wo.remaining} tasks remaining
                  </p>
                )}
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
