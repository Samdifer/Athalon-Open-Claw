import { useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Props = {
  organizationId: string;
  aircraftType: string;
  currentTotalTime?: number;
  currentCycles?: number;
  averageMonthlyHours?: number;
  averageMonthlyCycles?: number;
};

export function LevelLoadingChart({
  organizationId,
  aircraftType,
  currentTotalTime = 0,
  currentCycles = 0,
  averageMonthlyHours = 35,
  averageMonthlyCycles = 25,
}: Props) {
  const projections = useQuery(api.maintenancePrograms.computeDueDates, {
    organizationId,
    aircraftType,
    currentTotalTime,
    currentCycles,
    averageMonthlyHours,
    averageMonthlyCycles,
  });

  const chartData = useMemo(() => {
    const rows = projections ?? [];
    if (rows.length === 0) return [] as Array<{ month: string; overdue: number; dueSoon: number; upcoming: number }>;

    const now = Date.now();
    const byMonth = new Map<string, { overdue: number; dueSoon: number; upcoming: number }>();

    for (const row of rows) {
      if (!row.effectiveDueDate) continue;
      const dt = new Date(row.effectiveDueDate);
      const month = dt.toLocaleDateString("en-US", { month: "short", year: "2-digit", timeZone: "UTC" });
      const deltaDays = Math.floor((row.effectiveDueDate - now) / 86400000);
      const severity = deltaDays < 0 ? "overdue" : deltaDays <= 45 ? "dueSoon" : "upcoming";
      const bucket = byMonth.get(month) ?? { overdue: 0, dueSoon: 0, upcoming: 0 };
      bucket[severity] += 1;
      byMonth.set(month, bucket);
    }

    return Array.from(byMonth.entries())
      .map(([month, counts]) => ({ month, ...counts }))
      .sort((a, b) => {
        const [am, ay] = a.month.split(" ");
        const [bm, by] = b.month.split(" ");
        return new Date(`${am} 1, 20${ay}`).getTime() - new Date(`${bm} 1, 20${by}`).getTime();
      });
  }, [projections]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Level Loading (Projected Events)</CardTitle>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <div className="h-[260px] flex items-center justify-center text-sm text-muted-foreground">
            No projected events for this aircraft type.
          </div>
        ) : (
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.25} />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="overdue" stackId="a" fill="#ef4444" name="Overdue" />
                <Bar dataKey="dueSoon" stackId="a" fill="#f59e0b" name="Due Soon" />
                <Bar dataKey="upcoming" stackId="a" fill="#22c55e" name="Upcoming" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
