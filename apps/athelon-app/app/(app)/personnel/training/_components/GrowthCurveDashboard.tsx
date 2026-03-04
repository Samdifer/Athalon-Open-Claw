import { useEffect, useMemo, useState } from "react";
import { useConvex, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  month: string;
  target: number | null;
  [key: string]: string | number | null;
};

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

function shortName(full: string): string {
  const parts = full.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "Tech";
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1][0]}.`;
}

function monthKey(timestamp: number): string {
  const d = new Date(timestamp);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function formatMonth(month: string): string {
  const [year, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(year, (m ?? 1) - 1, 1));
  return d.toLocaleDateString("en-US", { month: "short", year: "2-digit", timeZone: "UTC" });
}

export function GrowthCurveDashboard({ orgId }: Props) {
  const convex = useConvex();
  const technicians = useQuery(api.technicians.list, { organizationId: orgId });
  const timeEntries = useQuery(api.timeClock.listTimeEntries, {
    orgId,
    entryType: "work_order",
  });
  const workOrders = useQuery(api.workOrders.getWorkOrdersWithScheduleRisk, {
    organizationId: orgId,
    shopLocationId: "all",
  });

  const [selectedTechIds, setSelectedTechIds] = useState<string[]>([]);
  const [targetByTech, setTargetByTech] = useState<Map<string, number>>(new Map());

  useEffect(() => {
    if (!technicians) return;
    setSelectedTechIds((prev) => {
      if (prev.length > 0) return prev.filter((id) => technicians.some((t) => t._id === id));
      return technicians.slice(0, 3).map((t) => t._id as string);
    });
  }, [technicians]);

  useEffect(() => {
    let cancelled = false;

    async function loadTargets() {
      if (!technicians || technicians.length === 0) {
        setTargetByTech(new Map());
        return;
      }

      const goalRows = await Promise.all(
        technicians.map((tech) => convex.query(api.ojt.listGoals, { technicianId: tech._id })),
      );

      const next = new Map<string, number>();
      technicians.forEach((tech, idx) => {
        const active = goalRows[idx]
          .filter((g) => g.status === "active")
          .sort((a, b) => b.periodEnd - a.periodEnd)[0];
        if (!active) return;

        if (active.targetType === "hours_trained") {
          next.set(tech._id, Math.max(0, Math.min(100, active.targetValue)));
          return;
        }

        next.set(tech._id, Math.max(0, Math.min(100, active.targetValue * 10)));
      });

      if (!cancelled) setTargetByTech(next);
    }

    void loadTargets();
    return () => {
      cancelled = true;
    };
  }, [convex, technicians]);

  const { chartData, series } = useMemo(() => {
    if (!technicians || !timeEntries || !workOrders) {
      return { chartData: [] as Point[], series: [] as Array<{ key: string; label: string }> };
    }

    const selected =
      selectedTechIds.length === 0
        ? technicians.slice(0, 1)
        : technicians.filter((t) => selectedTechIds.includes(t._id as string));

    const selectedSet = new Set(selected.map((s) => s._id as string));

    const woEstimateById = new Map<string, number>();
    for (const wo of workOrders) {
      woEstimateById.set(String(wo._id), Math.max(0, wo.effectiveEstimatedHours ?? 0));
    }

    const now = Date.now();
    const woActualByMonth = new Map<string, Map<string, number>>();
    const techActualByMonth = new Map<string, Map<string, number>>();

    for (const entry of timeEntries) {
      if (!entry.workOrderId || !selectedSet.has(entry.technicianId as string)) continue;
      const month = monthKey(entry.clockInAt);
      const woId = String(entry.workOrderId);
      const minutes = entry.durationMinutes ?? Math.max(0, Math.round((now - entry.clockInAt) / 60_000));
      const hours = minutes / 60;
      if (hours <= 0) continue;

      const woMonthMap = woActualByMonth.get(month) ?? new Map<string, number>();
      woMonthMap.set(woId, (woMonthMap.get(woId) ?? 0) + hours);
      woActualByMonth.set(month, woMonthMap);

      const techMonthMap = techActualByMonth.get(month) ?? new Map<string, number>();
      techMonthMap.set(entry.technicianId as string, (techMonthMap.get(entry.technicianId as string) ?? 0) + hours);
      techActualByMonth.set(month, techMonthMap);
    }

    const techEstimateByMonth = new Map<string, Map<string, number>>();

    for (const entry of timeEntries) {
      const techId = entry.technicianId as string;
      if (!entry.workOrderId || !selectedSet.has(techId)) continue;

      const month = monthKey(entry.clockInAt);
      const woId = String(entry.workOrderId);
      const woEstimated = woEstimateById.get(woId) ?? 0;
      const woActual = woActualByMonth.get(month)?.get(woId) ?? 0;
      if (woEstimated <= 0 || woActual <= 0) continue;

      const minutes = entry.durationMinutes ?? Math.max(0, Math.round((now - entry.clockInAt) / 60_000));
      const hours = minutes / 60;
      if (hours <= 0) continue;

      const apportionedEstimate = (hours / woActual) * woEstimated;
      const techMonthMap = techEstimateByMonth.get(month) ?? new Map<string, number>();
      techMonthMap.set(techId, (techMonthMap.get(techId) ?? 0) + apportionedEstimate);
      techEstimateByMonth.set(month, techMonthMap);
    }

    const allMonths = new Set<string>([
      ...Array.from(techActualByMonth.keys()),
      ...Array.from(techEstimateByMonth.keys()),
    ]);

    const sortedMonths = Array.from(allMonths).sort();

    const avgTarget =
      selected.length > 0
        ? selected.reduce((sum, t) => sum + (targetByTech.get(t._id as string) ?? 0), 0) / selected.length
        : null;

    const rows: Point[] = sortedMonths.map((month) => {
      const row: Point = {
        month,
        target: avgTarget !== null ? Number(avgTarget.toFixed(1)) : null,
      };

      for (const tech of selected) {
        const key = tech._id as string;
        const actual = techActualByMonth.get(month)?.get(key) ?? 0;
        const estimated = techEstimateByMonth.get(month)?.get(key) ?? 0;
        row[key] = actual > 0 ? Number(((estimated / actual) * 100).toFixed(1)) : null;
      }
      return row;
    });

    return {
      chartData: rows,
      series: selected.map((t) => ({ key: t._id as string, label: shortName(t.legalName) })),
    };
  }, [technicians, timeEntries, workOrders, selectedTechIds, targetByTech]);

  const loading = technicians === undefined || timeEntries === undefined || workOrders === undefined;

  function toggleTech(id: string) {
    setSelectedTechIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id].slice(-4),
    );
  }

  return (
    <Card>
      <CardHeader className="space-y-3">
        <CardTitle className="text-base">Growth Curve Dashboard</CardTitle>
        <div className="flex flex-wrap gap-2">
          {(technicians ?? []).map((tech) => {
            const selected = selectedTechIds.includes(tech._id as string);
            return (
              <Button
                key={tech._id}
                type="button"
                variant={selected ? "default" : "outline"}
                size="sm"
                className="h-7 text-xs"
                onClick={() => toggleTech(tech._id as string)}
              >
                {shortName(tech.legalName)}
              </Button>
            );
          })}
        </div>
      </CardHeader>
      <CardContent className="h-80">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading growth curves…</p>
        ) : chartData.length === 0 || series.length === 0 ? (
          <p className="text-sm text-muted-foreground">No completed labor history yet.</p>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 12, right: 16, left: 4, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} tickFormatter={formatMonth} minTickGap={20} />
              <YAxis domain={[0, 200]} tick={{ fontSize: 12 }} tickFormatter={(v) => `${v}%`} />
              <Tooltip
                formatter={(value: number | string) => `${Number(value).toFixed(1)}%`}
                labelFormatter={(label: string) => formatMonth(label)}
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
              <Line
                type="linear"
                dataKey="target"
                name="OJT Target"
                stroke="#9ca3af"
                strokeDasharray="5 5"
                strokeWidth={2}
                dot={false}
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
