import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "convex/react";
import {
  ClipboardList,
  Clock3,
  TrendingUp,
  CalendarDays,
  ArrowRight,
} from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import { formatDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";

const ACTIVE_STATUS = new Set([
  "open",
  "in_progress",
  "pending_inspection",
  "pending_signoff",
  "on_hold",
  "open_discrepancies",
]);

function daysRemaining(targetDateMs?: number): number | null {
  if (!targetDateMs) return null;
  const dayMs = 1000 * 60 * 60 * 24;
  return Math.ceil((targetDateMs - Date.now()) / dayMs);
}

export default function WorkOrderDashboardPage() {
  const { orgId, isLoaded } = useCurrentOrg();

  const workOrders = useQuery(
    api.workOrders.getWorkOrdersWithScheduleRisk,
    orgId ? { organizationId: orgId, shopLocationId: "all" } : "skip",
  );

  // BUG-SM-HUNT-024: `orgId` from useCurrentOrg is `string | undefined` but
  // timeClock.listTimeEntries expects `Id<"organizations">`. The raw string
  // would cause a TypeScript error in strict mode. Cast to the correct type.
  const timeEntries = useQuery(
    api.timeClock.listTimeEntries,
    orgId ? { orgId: orgId as Id<"organizations">, entryType: "work_order" } : "skip",
  );

  const isLoading =
    !isLoaded ||
    (orgId !== undefined && workOrders === undefined) ||
    (orgId !== undefined && timeEntries === undefined);

  const dashboard = useMemo(() => {
    const activeRows = (workOrders ?? []).filter((wo) => ACTIVE_STATUS.has(wo.status));

    const minutesByWorkOrder = new Map<string, number>();
    const now = Date.now();
    for (const entry of timeEntries ?? []) {
      if (!entry.workOrderId) continue;
      const durationMinutes =
        entry.durationMinutes ??
        Math.max(0, Math.round((now - entry.clockInAt) / 60_000));
      const key = String(entry.workOrderId);
      minutesByWorkOrder.set(key, (minutesByWorkOrder.get(key) ?? 0) + durationMinutes);
    }

    const rows = activeRows.map((wo) => {
      const appliedHours = Math.round(((minutesByWorkOrder.get(String(wo._id)) ?? 0) / 60) * 100) / 100;
      const estimatedHours = Math.round((wo.effectiveEstimatedHours ?? 0) * 100) / 100;
      const wipPercent = estimatedHours > 0 ? Math.min(999, (appliedHours / estimatedHours) * 100) : 0;
      return {
        _id: String(wo._id),
        workOrderNumber: wo.workOrderNumber,
        aircraft: wo.aircraft?.currentRegistration ?? "—",
        status: wo.status,
        promisedDeliveryDate: wo.promisedDeliveryDate,
        estimatedHours,
        appliedHours,
        wipPercent,
      };
    });

    const totalEstimatedHours = rows.reduce((sum, row) => sum + row.estimatedHours, 0);
    const totalAppliedHours = rows.reduce((sum, row) => sum + row.appliedHours, 0);
    const portfolioWipPercent =
      totalEstimatedHours > 0 ? Math.min(999, (totalAppliedHours / totalEstimatedHours) * 100) : 0;

    return {
      activeCount: rows.length,
      totalEstimatedHours: Math.round(totalEstimatedHours * 100) / 100,
      totalAppliedHours: Math.round(totalAppliedHours * 100) / 100,
      portfolioWipPercent,
      rows: rows.sort((a, b) => {
        const aDays = daysRemaining(a.promisedDeliveryDate ?? undefined);
        const bDays = daysRemaining(b.promisedDeliveryDate ?? undefined);
        if (aDays === null && bDays === null) return 0;
        if (aDays === null) return 1;
        if (bDays === null) return -1;
        return aDays - bDays;
      }),
    };
  }, [timeEntries, workOrders]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-9 w-56" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, idx) => (
            <Skeleton key={idx} className="h-24 w-full" />
          ))}
        </div>
        <Skeleton className="h-80 w-full" />
      </div>
    );
  }

  if (!orgId) {
    return (
      <Card className="border-border/60">
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          Unable to resolve organization context.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-lg sm:text-xl md:text-2xl font-semibold text-foreground">
            Work Order Dashboard
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Active WIP summary and return-to-service countdown.
          </p>
        </div>
        <Button asChild variant="outline" size="sm" className="h-8 text-xs">
          <Link to="/work-orders">
            Open Work Orders
            <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="border-border/60">
          <CardContent className="p-3">
            <p className="text-[11px] text-muted-foreground mb-1">Active Work Orders</p>
            <div className="flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-muted-foreground" />
              <span className="text-lg font-bold">{dashboard.activeCount}</span>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/60">
          <CardContent className="p-3">
            <p className="text-[11px] text-muted-foreground mb-1">Estimated Hours</p>
            <div className="flex items-center gap-2">
              <Clock3 className="w-4 h-4 text-muted-foreground" />
              <span className="text-lg font-bold">{dashboard.totalEstimatedHours.toFixed(2)}h</span>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/60">
          <CardContent className="p-3">
            <p className="text-[11px] text-muted-foreground mb-1">Applied Hours</p>
            <div className="flex items-center gap-2">
              <Clock3 className="w-4 h-4 text-muted-foreground" />
              <span className="text-lg font-bold">{dashboard.totalAppliedHours.toFixed(2)}h</span>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/60">
          <CardContent className="p-3">
            <p className="text-[11px] text-muted-foreground mb-1">Portfolio WIP</p>
            <div className="flex items-center gap-2 mb-1.5">
              <TrendingUp className="w-4 h-4 text-muted-foreground" />
              <span className="text-lg font-bold">{dashboard.portfolioWipPercent.toFixed(1)}%</span>
            </div>
            <Progress value={Math.min(100, dashboard.portfolioWipPercent)} className="h-1.5" />
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Active Work Orders</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {dashboard.rows.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              No active work orders.
            </div>
          ) : (
            <div className="divide-y divide-border/40">
              {dashboard.rows.map((row) => {
                const days = daysRemaining(row.promisedDeliveryDate ?? undefined);
                const dueTone =
                  days === null
                    ? "text-muted-foreground"
                    : days < 0
                      ? "text-red-500 dark:text-red-400"
                      : days <= 2
                        ? "text-amber-500 dark:text-amber-400"
                        : "text-green-600 dark:text-green-400";

                return (
                  <div key={row._id} className="px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-sm font-semibold">{row.workOrderNumber}</span>
                        <Badge variant="outline" className="text-[10px] border-border/50">
                          {row.aircraft}
                        </Badge>
                        <Badge variant="outline" className="text-[10px] border-border/50">
                          {row.status}
                        </Badge>
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-1">
                        RTS target: {row.promisedDeliveryDate ? formatDate(row.promisedDeliveryDate) : "Not set"}
                      </div>
                    </div>
                    <div className="w-full sm:w-[360px]">
                      <div className="grid grid-cols-3 gap-3 text-[11px] mb-1.5">
                        <div>
                          <span className="text-muted-foreground">Est:</span>{" "}
                          <span className="font-medium">{row.estimatedHours.toFixed(2)}h</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Applied:</span>{" "}
                          <span className="font-medium">{row.appliedHours.toFixed(2)}h</span>
                        </div>
                        <div className={`flex items-center gap-1 ${dueTone}`}>
                          <CalendarDays className="w-3 h-3" />
                          {days === null ? "No date" : days < 0 ? `${Math.abs(days)}d overdue` : `${days}d left`}
                        </div>
                      </div>
                      <Progress value={Math.min(100, row.wipPercent)} className="h-1.5" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
