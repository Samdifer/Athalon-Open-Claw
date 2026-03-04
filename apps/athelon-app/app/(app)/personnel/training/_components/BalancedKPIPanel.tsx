import { useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type Props = {
  orgId: Id<"organizations">;
};

function percent(numerator: number, denominator: number) {
  if (denominator <= 0) return 0;
  return (numerator / denominator) * 100;
}

export function BalancedKPIPanel({ orgId }: Props) {
  const workOrders = useQuery(api.workOrders.getWorkOrdersWithScheduleRisk, {
    organizationId: orgId,
    shopLocationId: "all",
  });
  const timeEntries = useQuery(api.timeClock.listTimeEntries, {
    orgId,
    entryType: "work_order",
  });

  const kpis = useMemo(() => {
    if (!workOrders || !timeEntries) return null;

    const completed = workOrders.filter((wo) =>
      ["completed", "closed", "return_to_service"].includes(String(wo.status)),
    );

    const onTimeDelivered = completed.filter((wo) => String(wo.riskLevel) !== "overdue").length;
    const onTimeRate = percent(onTimeDelivered, completed.length);

    const firstTimeFixNumerator = completed.filter((wo) =>
      !["open_discrepancies", "rework", "on_hold"].includes(String(wo.status)),
    ).length;
    const firstTimeFixRate = percent(firstTimeFixNumerator, completed.length);

    const now = Date.now();
    const totalActualHours = timeEntries.reduce((sum, e) => {
      const minutes = e.durationMinutes ?? Math.max(0, Math.round((now - e.clockInAt) / 60_000));
      return sum + minutes / 60;
    }, 0);
    const totalEstimatedHours = completed.reduce((sum, wo) => sum + Math.max(0, wo.effectiveEstimatedHours ?? 0), 0);
    const efficiency = totalActualHours > 0 ? (totalEstimatedHours / totalActualHours) * 100 : 0;

    return {
      onTimeRate,
      firstTimeFixRate,
      efficiency,
      sampleSize: completed.length,
    };
  }, [workOrders, timeEntries]);

  if (kpis === null) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Balanced KPI Panel</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Loading KPI panel…</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Balanced KPI Panel</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="rounded-lg border border-border/60 p-4 bg-card">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Primary KPI</p>
            <p className="text-sm mt-1 text-muted-foreground">On-time delivery rate</p>
            <p className="text-3xl font-bold mt-1">{kpis.onTimeRate.toFixed(1)}%</p>
          </div>
          <div className="rounded-lg border border-border/60 p-4 bg-card">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Primary KPI</p>
            <p className="text-sm mt-1 text-muted-foreground">First-time fix rate</p>
            <p className="text-3xl font-bold mt-1">{kpis.firstTimeFixRate.toFixed(1)}%</p>
          </div>
        </div>

        <div className="rounded-lg border border-dashed border-border/70 p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium">Efficiency</p>
            <Badge variant="outline">Planning Only</Badge>
          </div>
          <p className="text-xl font-semibold mt-1">{kpis.efficiency.toFixed(1)}%</p>
          <p className="text-xs text-muted-foreground mt-2">
            Efficiency is outside technician control and should not be used as individual performance metric
          </p>
        </div>

        <p className="text-xs text-muted-foreground">Based on {kpis.sampleSize} completed work orders.</p>
      </CardContent>
    </Card>
  );
}
