import { useMemo } from "react";
import type { FunctionReturnType } from "convex/server";
import type { api } from "@/convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { getStatusBadge, STATUS_LABELS } from "./dashboardHelpers";

type WorkOrdersWithRisk = FunctionReturnType<typeof api.workOrders.getWorkOrdersWithScheduleRisk>;

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export function UpcomingWorkOrders({
  workOrders,
}: {
  workOrders: WorkOrdersWithRisk | undefined;
}) {
  const upcoming = useMemo(() => {
    if (!workOrders) return null;

    const now = Date.now();
    const cutoff = now + SEVEN_DAYS_MS;

    return workOrders
      .filter((wo) => {
        // Show draft/open WOs with a scheduled start or delivery date within 7 days
        if (!["draft", "open"].includes(wo.status)) return false;
        const date = wo.scheduledStartDate ?? wo.promisedDeliveryDate;
        if (!date) return false;
        return date >= now && date <= cutoff;
      })
      .sort((a, b) => {
        const aDate = a.scheduledStartDate ?? a.promisedDeliveryDate ?? 0;
        const bDate = b.scheduledStartDate ?? b.promisedDeliveryDate ?? 0;
        return aDate - bDate;
      });
  }, [workOrders]);

  if (!upcoming) {
    return (
      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            Upcoming Work Orders — Next 7 Days
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[100px] w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            Upcoming Work Orders — Next 7 Days
            {upcoming.length > 0 && (
              <Badge variant="secondary" className="text-[10px] h-5 px-2 bg-muted">
                {upcoming.length}
              </Badge>
            )}
          </CardTitle>
          <Button asChild variant="ghost" size="sm" className="h-7 text-xs">
            <Link to="/scheduling" className="flex items-center gap-1">
              Schedule
              <ChevronRight className="w-3 h-3" />
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {upcoming.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-muted-foreground">
            <Calendar className="w-5 h-5 mb-2 text-muted-foreground/40" />
            <p className="text-sm">No work orders scheduled for the next 7 days</p>
          </div>
        ) : (
          <div className="space-y-0">
            {/* Table header */}
            <div className="grid grid-cols-12 gap-2 pb-2 border-b border-border/40 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
              <div className="col-span-2">WO #</div>
              <div className="col-span-3">Aircraft</div>
              <div className="col-span-2">Type</div>
              <div className="col-span-2">Date</div>
              <div className="col-span-1 text-right">Est Hrs</div>
              <div className="col-span-2 text-right">Status</div>
            </div>

            {upcoming.map((wo) => {
              const date = wo.scheduledStartDate ?? wo.promisedDeliveryDate;
              const dateLabel = date
                ? new Date(date).toLocaleDateString("en-US", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  })
                : "—";
              const isDeliveryDate = !wo.scheduledStartDate && wo.promisedDeliveryDate;
              const estimated = wo.effectiveEstimatedHours ?? 0;

              return (
                <Link key={wo._id} to={`/work-orders/${wo._id}`}>
                  <div className="grid grid-cols-12 gap-2 py-2 border-b border-border/20 hover:bg-muted/30 transition-colors cursor-pointer items-center">
                    <div className="col-span-2">
                      <span className="font-mono text-xs font-medium text-foreground">
                        {wo.workOrderNumber ?? wo._id.slice(0, 8)}
                      </span>
                    </div>
                    <div className="col-span-3 min-w-0">
                      {wo.aircraft ? (
                        <div>
                          <span className="font-mono text-xs font-semibold text-foreground">
                            {wo.aircraft.currentRegistration}
                          </span>
                          <span className="text-[10px] text-muted-foreground ml-1">
                            {wo.aircraft.make} {wo.aircraft.model}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </div>
                    <div className="col-span-2">
                      <span className="text-[10px] text-muted-foreground capitalize">
                        {(wo.workOrderType ?? "—").replace(/_/g, " ")}
                      </span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-[10px] text-foreground">{dateLabel}</span>
                      {isDeliveryDate && (
                        <span className="text-[8px] text-muted-foreground/60 ml-0.5">(del)</span>
                      )}
                    </div>
                    <div className="col-span-1 text-right">
                      <span className="text-[10px] text-muted-foreground">
                        {estimated > 0 ? `${estimated}h` : "—"}
                      </span>
                    </div>
                    <div className="col-span-2 text-right">
                      {getStatusBadge(wo.status, STATUS_LABELS[wo.status] ?? wo.status, wo.priority ?? undefined)}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
