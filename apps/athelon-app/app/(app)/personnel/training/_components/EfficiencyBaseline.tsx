import { useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Scatter,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Props = {
  orgId: Id<"organizations">;
};

type Row = {
  technicianId: Id<"technicians">;
  technician: string;
  experienceMonths: number;
  estimatedHours: number;
  actualHours: number;
  avgTaskCompletionHours: number;
  efficiencyScore: number;
};

function efficiencyTone(score: number) {
  if (score > 100) return "text-green-600";
  if (score >= 80) return "text-amber-600";
  return "text-red-600";
}

export function EfficiencyBaseline({ orgId }: Props) {
  const technicians = useQuery(api.technicians.list, { organizationId: orgId });
  const training = useQuery(api.training.listOrgTraining, { orgId });
  const timeEntries = useQuery(api.timeClock.listTimeEntries, {
    orgId,
    entryType: "work_order",
  });
  const workOrders = useQuery(api.workOrders.getWorkOrdersWithScheduleRisk, {
    organizationId: orgId,
    shopLocationId: "all",
  });

  const rows: Row[] = useMemo(() => {
    if (!technicians || !training || !timeEntries || !workOrders) return [];

    const now = Date.now();
    const woEstimateById = new Map<string, number>();
    for (const wo of workOrders) {
      woEstimateById.set(String(wo._id), Math.max(0, wo.effectiveEstimatedHours ?? 0));
    }

    const woActualHoursById = new Map<string, number>();
    const actualHoursByTech = new Map<string, number>();
    const estimatedHoursByTech = new Map<string, number>();
    const entryCountByTech = new Map<string, number>();
    const firstClockInByTech = new Map<string, number>();

    for (const entry of timeEntries) {
      if (!entry.workOrderId) continue;
      const durationMinutes =
        entry.durationMinutes ?? Math.max(0, Math.round((now - entry.clockInAt) / 60_000));
      const durationHours = durationMinutes / 60;
      if (durationHours <= 0) continue;

      const woId = String(entry.workOrderId);
      woActualHoursById.set(woId, (woActualHoursById.get(woId) ?? 0) + durationHours);

      const techId = String(entry.technicianId);
      actualHoursByTech.set(techId, (actualHoursByTech.get(techId) ?? 0) + durationHours);
      entryCountByTech.set(techId, (entryCountByTech.get(techId) ?? 0) + 1);
      const earliest = firstClockInByTech.get(techId);
      if (!earliest || entry.clockInAt < earliest) firstClockInByTech.set(techId, entry.clockInAt);
    }

    for (const entry of timeEntries) {
      if (!entry.workOrderId) continue;
      const woId = String(entry.workOrderId);
      const woEstimated = woEstimateById.get(woId) ?? 0;
      const woActual = woActualHoursById.get(woId) ?? 0;
      if (woEstimated <= 0 || woActual <= 0) continue;

      const durationMinutes =
        entry.durationMinutes ?? Math.max(0, Math.round((now - entry.clockInAt) / 60_000));
      const durationHours = durationMinutes / 60;
      if (durationHours <= 0) continue;

      const apportionedEstimate = (durationHours / woActual) * woEstimated;
      const techId = String(entry.technicianId);
      estimatedHoursByTech.set(techId, (estimatedHoursByTech.get(techId) ?? 0) + apportionedEstimate);
    }

    const firstTrainingByTech = new Map<string, number>();
    for (const rec of training) {
      const existing = firstTrainingByTech.get(rec.technicianId);
      if (!existing || rec.completedAt < existing) firstTrainingByTech.set(rec.technicianId, rec.completedAt);
    }

    return technicians
      .map((tech) => {
        const techId = String(tech._id);
        const actualHours = actualHoursByTech.get(techId) ?? 0;
        const estimatedHours = estimatedHoursByTech.get(techId) ?? 0;
        const entries = entryCountByTech.get(techId) ?? 0;

        const earliestSignal = Math.min(
          firstClockInByTech.get(techId) ?? Number.POSITIVE_INFINITY,
          firstTrainingByTech.get(techId) ?? Number.POSITIVE_INFINITY,
          tech._creationTime,
        );
        const baseTs = Number.isFinite(earliestSignal) ? earliestSignal : now;
        const experienceMonths = Math.max(0, (now - baseTs) / (1000 * 60 * 60 * 24 * 30.4375));

        const efficiencyScore = actualHours > 0 ? (estimatedHours / actualHours) * 100 : 0;

        return {
          technicianId: tech._id,
          technician: tech.legalName,
          experienceMonths,
          estimatedHours,
          actualHours,
          avgTaskCompletionHours: entries > 0 ? actualHours / entries : 0,
          efficiencyScore,
        };
      })
      .filter((r) => r.actualHours > 0)
      .sort((a, b) => b.efficiencyScore - a.efficiencyScore);
  }, [technicians, training, timeEntries, workOrders]);

  const chartData = useMemo(
    () =>
      rows.map((r) => ({
        x: Number(r.experienceMonths.toFixed(1)),
        y: Number(r.efficiencyScore.toFixed(1)),
        technician: r.technician,
      })),
    [rows],
  );

  const trendlineData = useMemo(() => {
    if (chartData.length < 2) return [];

    const n = chartData.length;
    const sumX = chartData.reduce((acc, p) => acc + p.x, 0);
    const sumY = chartData.reduce((acc, p) => acc + p.y, 0);
    const sumXY = chartData.reduce((acc, p) => acc + p.x * p.y, 0);
    const sumXX = chartData.reduce((acc, p) => acc + p.x * p.x, 0);

    const denominator = n * sumXX - sumX * sumX;
    const slope = denominator === 0 ? 0 : (n * sumXY - sumX * sumY) / denominator;
    const intercept = (sumY - slope * sumX) / n;

    const minX = Math.min(...chartData.map((p) => p.x));
    const maxX = Math.max(...chartData.map((p) => p.x));

    return [
      { x: minX, y: Number((slope * minX + intercept).toFixed(1)) },
      { x: maxX, y: Number((slope * maxX + intercept).toFixed(1)) },
    ];
  }, [chartData]);

  const loading =
    technicians === undefined ||
    training === undefined ||
    timeEntries === undefined ||
    workOrders === undefined;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Efficiency Baseline by Experience</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading efficiency baseline…</p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No completed labor entries available yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-2 pr-3">Technician</th>
                    <th className="py-2 pr-3">Experience (mo)</th>
                    <th className="py-2 pr-3">Avg Task Completion</th>
                    <th className="py-2 pr-3">Est. Hours</th>
                    <th className="py-2 pr-3">Actual Hours</th>
                    <th className="py-2">Efficiency</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.technicianId} className="border-b last:border-0">
                      <td className="py-2 pr-3 font-medium">{row.technician}</td>
                      <td className="py-2 pr-3">{row.experienceMonths.toFixed(1)}</td>
                      <td className="py-2 pr-3">{row.avgTaskCompletionHours.toFixed(2)}h</td>
                      <td className="py-2 pr-3">{row.estimatedHours.toFixed(2)}h</td>
                      <td className="py-2 pr-3">{row.actualHours.toFixed(2)}h</td>
                      <td className="py-2">
                        <Badge variant="outline" className={efficiencyTone(row.efficiencyScore)}>
                          {row.efficiencyScore.toFixed(1)}%
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Experience vs Efficiency Trend</CardTitle>
        </CardHeader>
        <CardContent className="h-80">
          {chartData.length === 0 ? (
            <p className="text-sm text-muted-foreground">No chart data yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 12, right: 16, left: 0, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" dataKey="x" name="Experience" unit=" mo" tick={{ fontSize: 12 }} />
                <YAxis type="number" dataKey="y" name="Efficiency" unit="%" tick={{ fontSize: 12 }} domain={[0, (max: number) => Math.min(Math.ceil(max / 20) * 20, 250)]} />
                <Tooltip
                  cursor={{ strokeDasharray: "3 3" }}
                  formatter={(value: number | string | undefined) => `${Number(value ?? 0).toFixed(1)}%`}
                />
                <Scatter name="Technicians" dataKey="y" fill="#3b82f6" />
                {trendlineData.length === 2 && (
                  <Line
                    type="linear"
                    data={trendlineData}
                    dataKey="y"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
