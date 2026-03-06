import { useMemo } from "react";
import type { FunctionReturnType } from "convex/server";
import type { api } from "@/convex/_generated/api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Wrench,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  ChevronRight,
} from "lucide-react";
import { Link } from "react-router-dom";
import { isActiveStatus } from "./dashboardHelpers";

type WorkOrdersWithRisk = FunctionReturnType<typeof api.workOrders.getWorkOrdersWithScheduleRisk>;
type LaborByWO = Record<string, { totalMinutes: number; totalHours: number; openTimerCount: number }>;

// ─── Circular Progress Ring ────────────────────────────────────────────────────

function LaborRing({
  percent,
  overrun,
  size = 32,
  strokeWidth = 3,
}: {
  percent: number;
  overrun: boolean;
  size?: number;
  strokeWidth?: number;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(100, Math.max(0, percent));
  const offset = circumference - (clamped / 100) * circumference;

  const ringColor = overrun
    ? "stroke-red-500"
    : percent >= 80
      ? "stroke-amber-400"
      : percent >= 1
        ? "stroke-teal-400"
        : "stroke-muted-foreground/20";

  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="hsl(var(--muted-foreground) / 0.1)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          className={ringColor}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[8px] font-bold text-foreground leading-none">
        {percent > 0 ? `${Math.round(percent)}` : "—"}
      </span>
    </div>
  );
}

// ─── Inline Labor Bar ──────────────────────────────────────────────────────────

function InlineLaborBar({
  consumed,
  estimated,
}: {
  consumed: number;
  estimated: number;
}) {
  if (estimated <= 0) {
    return (
      <div className="flex items-center gap-1.5 w-full">
        <div className="flex-1 h-1.5 rounded-full bg-muted-foreground/10" />
        <span className="text-[9px] text-muted-foreground/50 w-10 text-right">No est</span>
      </div>
    );
  }

  const consumedPct = Math.min(100, (consumed / estimated) * 100);
  const overrunPct = consumed > estimated ? Math.min(100, ((consumed - estimated) / estimated) * 100) : 0;
  const totalBarPct = Math.min(100, consumedPct);

  return (
    <div className="flex items-center gap-1.5 w-full">
      <div className="flex-1 h-1.5 rounded-full bg-muted-foreground/10 overflow-hidden relative">
        {/* Consumed portion */}
        <div
          className={`absolute inset-y-0 left-0 rounded-full transition-all ${
            overrunPct > 0 ? "bg-red-500" : "bg-teal-500/80"
          }`}
          style={{ width: `${totalBarPct}%` }}
        />
      </div>
      <span className={`text-[9px] font-mono w-14 text-right tabular-nums ${
        overrunPct > 0 ? "text-red-400 font-semibold" : "text-muted-foreground"
      }`}>
        {consumed.toFixed(1)}/{estimated.toFixed(0)}h
      </span>
    </div>
  );
}

// ─── Single Work Order Row ─────────────────────────────────────────────────────

function WORow({
  wo,
  laborHours,
}: {
  wo: WorkOrdersWithRisk[number];
  laborHours: { totalHours: number; openTimerCount: number } | undefined;
}) {
  const consumed = laborHours?.totalHours ?? 0;
  const estimated = wo.effectiveEstimatedHours ?? 0;
  const laborPct = estimated > 0 ? Math.round((consumed / estimated) * 100) : 0;
  const isOverrun = consumed > estimated && estimated > 0;
  const tasksComplete = wo.completedTaskCardCount;
  const tasksTotal = wo.taskCardCount;
  const isOverdue = wo.riskLevel === "overdue";
  const isAtRisk = wo.riskLevel === "at_risk";
  const isAOG = wo.priority === "aog";
  const hasActiveTimer = (laborHours?.openTimerCount ?? 0) > 0;

  const deliveryDate = wo.promisedDeliveryDate
    ? new Date(wo.promisedDeliveryDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })
    : null;

  const riskBorder = isAOG
    ? "border-l-red-500"
    : isOverdue
      ? "border-l-red-400"
      : isAtRisk
        ? "border-l-amber-400"
        : "border-l-transparent";

  return (
    <Link to={`/work-orders/${wo._id}`} className="block">
      <div
        className={`grid grid-cols-[32px_1fr_140px_60px_70px_24px] md:grid-cols-[32px_minmax(140px,1.2fr)_minmax(100px,1fr)_60px_80px_24px] items-center gap-x-3 px-3 py-2 border-l-2 ${riskBorder} hover:bg-muted/40 transition-colors cursor-pointer rounded-r-md`}
      >
        {/* Ring */}
        <LaborRing percent={laborPct} overrun={isOverrun} />

        {/* WO Identity */}
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-xs font-semibold text-foreground truncate">
              {wo.workOrderNumber ?? wo._id.slice(0, 8)}
            </span>
            {isAOG && (
              <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-[8px] h-3.5 px-1 flex-shrink-0">
                AOG
              </Badge>
            )}
            {hasActiveTimer && (
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse flex-shrink-0" />
            )}
          </div>
          {wo.aircraft && (
            <span className="text-[10px] text-muted-foreground truncate block">
              {wo.aircraft.currentRegistration} · {wo.aircraft.make} {wo.aircraft.model}
            </span>
          )}
        </div>

        {/* Labor bar */}
        <InlineLaborBar consumed={consumed} estimated={estimated} />

        {/* Tasks */}
        <div className="text-[10px] text-muted-foreground text-center">
          {tasksTotal > 0 ? (
            <span className={tasksComplete === tasksTotal ? "text-green-400 font-medium" : ""}>
              {tasksComplete}/{tasksTotal}
            </span>
          ) : (
            <span className="text-muted-foreground/40">—</span>
          )}
          {wo.openDiscrepancyCount > 0 && (
            <span className="text-red-400 ml-1 font-medium">
              +{wo.openDiscrepancyCount}!
            </span>
          )}
        </div>

        {/* Due date */}
        <div className="text-right">
          {deliveryDate ? (
            <span className={`text-[10px] ${
              isOverdue ? "text-red-400 font-semibold" : isAtRisk ? "text-amber-400" : "text-muted-foreground"
            }`}>
              {deliveryDate}
            </span>
          ) : (
            <span className="text-[10px] text-muted-foreground/30">No date</span>
          )}
        </div>

        {/* Arrow */}
        <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/30" />
      </div>
    </Link>
  );
}

// ─── Main Board ────────────────────────────────────────────────────────────────

export function ActiveWorkOrderBoard({
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
        if (a.priority === "aog" && b.priority !== "aog") return -1;
        if (b.priority === "aog" && a.priority !== "aog") return 1;
        if (a.riskLevel === "overdue" && b.riskLevel !== "overdue") return -1;
        if (b.riskLevel === "overdue" && a.riskLevel !== "overdue") return 1;
        if (a.riskLevel === "at_risk" && b.riskLevel !== "at_risk") return -1;
        if (b.riskLevel === "at_risk" && a.riskLevel !== "at_risk") return 1;
        return (b.openedAt ?? 0) - (a.openedAt ?? 0);
      });
  }, [workOrders]);

  // Summary stats
  const summary = useMemo(() => {
    if (!activeWOs || !laborByWO) return null;
    let totalEstimated = 0;
    let totalConsumed = 0;
    let overrunCount = 0;
    let activeTimerCount = 0;

    for (const wo of activeWOs) {
      const est = wo.effectiveEstimatedHours ?? 0;
      const labor = laborByWO[String(wo._id)];
      const consumed = labor?.totalHours ?? 0;
      totalEstimated += est;
      totalConsumed += consumed;
      if (consumed > est && est > 0) overrunCount++;
      if (labor?.openTimerCount && labor.openTimerCount > 0) activeTimerCount++;
    }

    return {
      totalEstimated: Math.round(totalEstimated),
      totalConsumed: Math.round(totalConsumed * 10) / 10,
      overrunCount,
      activeTimerCount,
      shopPct: totalEstimated > 0 ? Math.round((totalConsumed / totalEstimated) * 100) : 0,
    };
  }, [activeWOs, laborByWO]);

  if (!activeWOs) {
    return (
      <Card className="border-border/60">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Wrench className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-semibold text-foreground">Work In Progress</span>
          </div>
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-10 w-full rounded-md" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (activeWOs.length === 0) {
    return (
      <Card className="border-border/60">
        <CardContent className="py-8">
          <div className="flex flex-col items-center justify-center text-muted-foreground">
            <CheckCircle2 className="w-6 h-6 mb-2 text-green-400" />
            <p className="text-sm">No active work orders</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/60">
      <CardContent className="p-0">
        {/* Header + Summary strip */}
        <div className="flex items-center justify-between px-4 pt-3 pb-2">
          <div className="flex items-center gap-2">
            <Wrench className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-semibold text-foreground">Work In Progress</span>
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

        {/* Aggregate summary bar */}
        {summary && (
          <div className="mx-4 mb-2 flex items-center gap-4 px-3 py-2 rounded-lg bg-muted/30 border border-border/30">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-muted-foreground">Shop Total:</span>
              <span className="text-xs font-bold text-foreground">{summary.totalConsumed}h</span>
              <span className="text-[10px] text-muted-foreground">/ {summary.totalEstimated}h</span>
              <span className={`text-[10px] font-semibold ml-1 ${
                summary.shopPct >= 85 ? "text-red-400" : summary.shopPct >= 70 ? "text-amber-400" : "text-teal-400"
              }`}>
                ({summary.shopPct}%)
              </span>
            </div>
            <div className="flex-1 h-1.5 rounded-full bg-muted-foreground/10 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  summary.shopPct > 100 ? "bg-red-500" : "bg-teal-500/70"
                }`}
                style={{ width: `${Math.min(100, summary.shopPct)}%` }}
              />
            </div>
            {summary.overrunCount > 0 && (
              <Badge className="bg-red-500/15 text-red-400 border-red-500/30 text-[9px] h-4 px-1.5">
                <AlertTriangle className="w-2.5 h-2.5 mr-0.5" />
                {summary.overrunCount} overrun
              </Badge>
            )}
            {summary.activeTimerCount > 0 && (
              <span className="flex items-center gap-1 text-[10px] text-green-400">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                {summary.activeTimerCount} active
              </span>
            )}
          </div>
        )}

        {/* Column headers */}
        <div className="grid grid-cols-[32px_1fr_140px_60px_70px_24px] md:grid-cols-[32px_minmax(140px,1.2fr)_minmax(100px,1fr)_60px_80px_24px] items-center gap-x-3 px-3 py-1.5 text-[9px] font-medium text-muted-foreground/60 uppercase tracking-wider border-b border-border/30 mx-1">
          <span className="text-center">%</span>
          <span>Work Order</span>
          <span>Labor</span>
          <span className="text-center">Tasks</span>
          <span className="text-right">Due</span>
          <span />
        </div>

        {/* WO Rows */}
        <div className="divide-y divide-border/20 mx-1">
          {activeWOs.map((wo) => (
            <WORow
              key={wo._id}
              wo={wo}
              laborHours={laborByWO?.[String(wo._id)]}
            />
          ))}
        </div>

        {/* Footer legend */}
        <div className="flex items-center gap-4 px-4 py-2 border-t border-border/30 text-[9px] text-muted-foreground/50">
          <span className="flex items-center gap-1">
            <span className="w-2 h-0.5 rounded bg-teal-500/80 inline-block" /> On Track
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-0.5 rounded bg-amber-400 inline-block" /> At Risk
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-0.5 rounded bg-red-500 inline-block" /> Overrun/Overdue
          </span>
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" /> Timer Active
          </span>
          <span className="flex items-center gap-1">
            <Calendar className="w-2.5 h-2.5" /> Due Date
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
