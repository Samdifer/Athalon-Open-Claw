import { useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Props = {
  orgId: Id<"organizations">;
};

type Point = {
  date: string;
  [key: string]: string | number | null;
};

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

function shortName(full: string): string {
  const parts = full.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "Tech";
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1][0]}.`;
}

function dayKey(timestamp: number): string {
  return new Date(timestamp).toISOString().slice(0, 10);
}

function formatDay(day: string): string {
  const d = new Date(`${day}T00:00:00.000Z`);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

export function GrowthCurveDashboard({ orgId }: Props) {
  const technicians = useQuery(api.technicians.list, { organizationId: orgId });
  const training = useQuery(api.training.listOrgTraining, { orgId });

  const { chartData, series } = useMemo(() => {
    if (!technicians || !training) return { chartData: [] as Point[], series: [] as Array<{ key: string; label: string }> };

    const trainingByTech = new Map<string, typeof training>();
    for (const rec of training) {
      const list = trainingByTech.get(rec.technicianId) ?? [];
      list.push(rec);
      trainingByTech.set(rec.technicianId, list);
    }

    const allDays = new Set<string>();
    const techCurves = new Map<string, Map<string, number>>();

    for (const tech of technicians) {
      const records = (trainingByTech.get(tech._id) ?? []).slice().sort((a, b) => a.completedAt - b.completedAt);
      let compliantRunning = 0;
      let totalRunning = 0;
      const curve = new Map<string, number>();

      for (const rec of records) {
        totalRunning += 1;
        if (rec.status !== "expired") compliantRunning += 1;
        const score = Number(((compliantRunning / totalRunning) * 100).toFixed(1));
        const day = dayKey(rec.completedAt);
        curve.set(day, score);
        allDays.add(day);
      }

      techCurves.set(tech._id, curve);
    }

    const sortedDays = Array.from(allDays).sort();
    const rows: Point[] = sortedDays.map((day) => {
      const row: Point = { date: day };
      for (const tech of technicians) {
        row[tech._id] = techCurves.get(tech._id)?.get(day) ?? null;
      }
      return row;
    });

    const activeSeries = technicians
      .filter((t) => (trainingByTech.get(t._id) ?? []).length > 0)
      .map((t) => ({ key: t._id as string, label: shortName(t.legalName) }));

    return { chartData: rows, series: activeSeries };
  }, [technicians, training]);

  const loading = technicians === undefined || training === undefined;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Growth Curve Dashboard</CardTitle>
      </CardHeader>
      <CardContent className="h-80">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading growth curves…</p>
        ) : chartData.length === 0 || series.length === 0 ? (
          <p className="text-sm text-muted-foreground">No training history yet. Add training records to visualize growth.</p>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 12, right: 16, left: 4, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12 }}
                tickFormatter={formatDay}
                minTickGap={20}
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fontSize: 12 }}
                tickFormatter={(v) => `${v}%`}
              />
              <Tooltip
                formatter={(value: number | string) => `${Number(value).toFixed(1)}%`}
                labelFormatter={(label: string) => formatDay(label)}
              />
              <Legend />
              {series.map((s, idx) => (
                <Line
                  key={s.key}
                  type="monotone"
                  dataKey={s.key}
                  name={s.label}
                  stroke={COLORS[idx % COLORS.length]}
                  strokeWidth={2}
                  dot={{ r: 2 }}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
