import { useMemo } from "react";
import type { FunctionReturnType } from "convex/server";
import type { api } from "@/convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { ClipboardList, Timer, CheckCircle2, AlertTriangle } from "lucide-react";
import { Link } from "react-router-dom";
import { getStatusBadge, STATUS_LABELS, isActiveStatus } from "./dashboardHelpers";

type WorkOrdersWithRisk = FunctionReturnType<typeof api.workOrders.getWorkOrdersWithScheduleRisk>;
type LaborByWO = Record<string, { totalMinutes: number; totalHours: number; openTimerCount: number }>;

function ActiveWOTile({
  wo,
  laborHours,
}: {
  wo: WorkOrdersWithRisk[number];
  laborHours: { totalHours: number; openTimerCount: number } | undefined;
}) {
  const consumed = laborHours?.totalHours ?? 0;
  const estimated = wo.effectiveEstimatedHours ?? 0;
  const laborPct = estimated > 0 ? Math.min(100, Math.round((consumed / estimated) * 100)) : 0;
  const isOverrun = consumed > estimated && estimated > 0;
  const tasksComplete = wo.completedTaskCardCount;
  const tasksTotal = wo.taskCardCount;
  const daysOpen = wo.openedAt
    ? Math.floor((Date.now() - wo.openedAt) / (1000 * 60 * 60 * 24))
    : 0;
  const deliveryDate = wo.promisedDeliveryDate
    ? new Date(wo.promisedDeliveryDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })
    : null;
  const isOverdue = wo.riskLevel === "overdue";
  const isAtRisk = wo.riskLevel === "at_risk";

  const borderClass = isOverdue
    ? "border-l-red-500 border-l-2"
    : isAtRisk
      ? "border-l-amber-500 border-l-2"
      : "";

  return (
    <Link to={`/work-orders/${wo._id}`}>
      <Card
        className={`hover:bg-card/80 transition-colors cursor-pointer border-border/60 h-full ${borderClass}`}
      >
        <CardContent className="p-4 space-y-2.5">
          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <span className="font-mono text-xs font-semibold text-foreground block">
                {wo.workOrderNumber ?? wo._id.slice(0, 8)}
              </span>
              {wo.aircraft && (
                <span className="text-[11px] text-muted-foreground">
                  {wo.aircraft.currentRegistration} · {wo.aircraft.make} {wo.aircraft.model}
                </span>
              )}
            </div>
            <div className="flex flex-col items-end gap-1 flex-shrink-0">
              {getStatusBadge(wo.status, STATUS_LABELS[wo.status] ?? wo.status, wo.priority ?? undefined)}
            </div>
          </div>

          {/* Labor completion */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-muted-foreground font-medium">Labor</span>
              <span className={`text-[10px] font-semibold ${isOverrun ? "text-red-400" : "text-foreground"}`}>
                {consumed.toFixed(1)} / {estimated > 0 ? `${estimated.toFixed(1)}h` : "— h"}
                {estimated > 0 && ` (${laborPct}%)`}
              </span>
            </div>
            <Progress
              value={laborPct}
              className={`h-1.5 ${isOverrun ? "[&>div]:bg-red-500" : ""}`}
            />
          </div>

          {/* Task count + meta */}
          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
            <div className="flex items-center gap-1">
              {tasksTotal > 0 ? (
                <>
                  {tasksComplete === tasksTotal ? (
                    <CheckCircle2 className="w-3 h-3 text-green-400" />
                  ) : null}
                  <span>
                    {tasksComplete}/{tasksTotal} tasks
                  </span>
                </>
              ) : (
                <span>No tasks</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {wo.openDiscrepancyCount > 0 && (
                <Badge className="bg-red-500/15 text-red-400 border-red-500/30 text-[8px] h-3.5 px-1">
                  {wo.openDiscrepancyCount} squawk{wo.openDiscrepancyCount === 1 ? "" : "s"}
                </Badge>
              )}
            </div>
          </div>

          {/* Footer meta */}
          <div className="flex items-center justify-between text-[10px] text-muted-foreground/70 pt-1 border-t border-border/30">
            <div className="flex items-center gap-1">
              <Timer className="w-3 h-3" />
              <span>{daysOpen}d open</span>
            </div>
            {deliveryDate && (
              <span className={isOverdue ? "text-red-400 font-medium" : ""}>
                Due {deliveryDate}
              </span>
            )}
            {laborHours?.openTimerCount && laborHours.openTimerCount > 0 ? (
              <span className="text-green-400 flex items-center gap-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                Active
              </span>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export function ActiveWOTileGrid({
  workOrders,
  laborByWO,
}: {
  workOrders: WorkOrdersWithRisk | undefined;
  laborByWO: LaborByWO | undefined;
}) {
  const activeWOs = useMemo(() => {
    if (!workOrders) return null;
    return workOrders
      .filter((wo) => isActiveStatus(wo.status))
      .sort((a, b) => {
        // AOG first, then by priority, then by openedAt desc
        if (a.priority === "aog" && b.priority !== "aog") return -1;
        if (b.priority === "aog" && a.priority !== "aog") return 1;
        if (a.riskLevel === "overdue" && b.riskLevel !== "overdue") return -1;
        if (b.riskLevel === "overdue" && a.riskLevel !== "overdue") return 1;
        return (b.openedAt ?? 0) - (a.openedAt ?? 0);
      });
  }, [workOrders]);

  if (!activeWOs) {
    return (
      <div>
        <div className="flex items-center gap-2 mb-3">
          <ClipboardList className="w-4 h-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold text-foreground">Active Work Orders</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-[180px] w-full rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <ClipboardList className="w-4 h-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold text-foreground">Active Work Orders</h2>
          <Badge variant="secondary" className="text-[10px] h-5 px-2 bg-muted">
            {activeWOs.length}
          </Badge>
        </div>
        <Link
          to="/work-orders"
          className="text-xs text-muted-foreground hover:text-primary transition-colors"
        >
          View All
        </Link>
      </div>

      {activeWOs.length === 0 ? (
        <Card className="border-border/60">
          <CardContent className="py-8">
            <div className="flex flex-col items-center justify-center text-muted-foreground">
              <CheckCircle2 className="w-6 h-6 mb-2 text-green-400" />
              <p className="text-sm">No active work orders</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {activeWOs.map((wo) => (
            <ActiveWOTile
              key={wo._id}
              wo={wo}
              laborHours={laborByWO?.[String(wo._id)]}
            />
          ))}
        </div>
      )}
    </div>
  );
}
