import { useMemo } from "react";
import type { FunctionReturnType } from "convex/server";
import type { api } from "@/convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, Wrench } from "lucide-react";
import { Link } from "react-router-dom";
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { isActiveStatus } from "./dashboardHelpers";

type WorkOrdersWithRisk = FunctionReturnType<typeof api.workOrders.getWorkOrdersWithScheduleRisk>;
type LaborByWO = Record<string, { totalMinutes: number; totalHours: number; openTimerCount: number }>;

export function WorkInProgressChart({
  workOrders,
  laborByWO,
}: {
  workOrders: WorkOrdersWithRisk | undefined;
  laborByWO: LaborByWO | undefined;
}) {
  const chartData = useMemo(() => {
    if (!workOrders) return null;

    const activeWOs = workOrders.filter((wo) => isActiveStatus(wo.status));

    return activeWOs
      .map((wo) => {
        const estimated = wo.effectiveEstimatedHours ?? 0;
        const consumed = laborByWO?.[String(wo._id)]?.totalHours ?? 0;
        const remaining = Math.max(0, estimated - consumed);
        const overrun = Math.max(0, consumed - estimated);
        const completionPct = estimated > 0 ? Math.round((consumed / estimated) * 100) : 0;
        const tail = wo.aircraft?.currentRegistration ?? "—";
        const label = `${wo.workOrderNumber ?? wo._id.slice(0, 8)} · ${tail}`;

        return {
          woId: wo._id,
          label,
          consumed: Math.min(consumed, estimated),
          remaining,
          overrun,
          completionPct,
          totalEstimated: estimated,
          totalConsumed: consumed,
        };
      })
      .sort((a, b) => a.completionPct - b.completionPct)
      .slice(0, 15);
  }, [workOrders, laborByWO]);

  if (!chartData) {
    return (
      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <BarChart className="w-4 h-4 text-muted-foreground" />
            Work In Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (chartData.length === 0) {
    return (
      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <BarChart className="w-4 h-4 text-muted-foreground" />
            Work In Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Wrench className="w-6 h-6 mb-2 text-muted-foreground/40" />
            <p className="text-sm">No active work orders</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const maxHours = Math.max(...chartData.map((d) => d.totalConsumed + d.remaining));

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <BarChart className="w-4 h-4 text-muted-foreground" />
            Work In Progress
          </CardTitle>
          <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-sm bg-teal-500/80 inline-block" />
              Consumed
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-sm bg-slate-500/30 inline-block" />
              Remaining
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-sm bg-red-500/60 inline-block" />
              Overrun
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <ResponsiveContainer width="100%" height={Math.max(200, chartData.length * 36 + 20)}>
          <RechartsBarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 0, right: 40, left: 0, bottom: 0 }}
            barCategoryGap="20%"
          >
            <XAxis
              type="number"
              domain={[0, Math.ceil(maxHours * 1.1) || 10]}
              tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
              tickLine={false}
              axisLine={false}
              unit="h"
            />
            <YAxis
              type="category"
              dataKey="label"
              width={160}
              tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
                fontSize: "11px",
              }}
              formatter={(value: number | undefined, name: string | undefined) => {
                const label =
                  name === "consumed" ? "Consumed" :
                  name === "remaining" ? "Remaining" :
                  "Overrun";
                return [`${(value ?? 0).toFixed(1)}h`, label];
              }}
              labelFormatter={(label) => String(label ?? "")}
            />
            <Bar dataKey="consumed" stackId="hours" radius={[0, 0, 0, 0]} fill="hsl(166, 72%, 40%)" />
            <Bar dataKey="remaining" stackId="hours" radius={[0, 0, 0, 0]} fill="hsl(var(--muted-foreground) / 0.2)" />
            <Bar dataKey="overrun" stackId="hours" radius={[0, 4, 4, 0]} fill="hsl(0, 72%, 51%)" />
          </RechartsBarChart>
        </ResponsiveContainer>
        <div className="mt-2 flex flex-wrap gap-1">
          {chartData.map((d) => (
            <Link
              key={d.woId}
              to={`/work-orders/${d.woId}`}
              className="text-[9px] text-muted-foreground/60 hover:text-primary transition-colors"
            >
              {d.completionPct}%
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
