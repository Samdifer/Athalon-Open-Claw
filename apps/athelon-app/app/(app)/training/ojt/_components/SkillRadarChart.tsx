"use client";

import { useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";

type ComparisonTech = {
  technicianId: Id<"technicians">;
  technicianName: string;
  jacketId: Id<"ojtJackets">;
};

type SkillRadarChartProps = {
  jacketId?: Id<"ojtJackets">;
  title?: string;
  className?: string;
  comparisonTechs?: ComparisonTech[];
};

const TECH_COLORS = ["#2563eb", "#16a34a", "#f59e0b", "#7c3aed"];

export function SkillRadarChart({ jacketId, title = "Section Skill Radar", className, comparisonTechs }: SkillRadarChartProps) {
  const isComparison = (comparisonTechs?.length ?? 0) > 0;
  const clipped = (comparisonTechs ?? []).slice(0, 4);

  const jacket = useQuery(api.ojt.getJacket, jacketId ? { id: jacketId } : "skip");
  const singleRadar = useQuery(api.ojt.getRadarData, jacketId ? { jacketId } : "skip");
  const goals = useQuery(
    api.ojt.listGoals,
    !isComparison && jacket?.technicianId ? { technicianId: jacket.technicianId } : "skip",
  );

  const c0 = useQuery(api.ojt.getRadarData, clipped[0] ? { jacketId: clipped[0].jacketId } : "skip");
  const c1 = useQuery(api.ojt.getRadarData, clipped[1] ? { jacketId: clipped[1].jacketId } : "skip");
  const c2 = useQuery(api.ojt.getRadarData, clipped[2] ? { jacketId: clipped[2].jacketId } : "skip");
  const c3 = useQuery(api.ojt.getRadarData, clipped[3] ? { jacketId: clipped[3].jacketId } : "skip");

  const comparisonData = [c0, c1, c2, c3];

  const chartData = useMemo(() => {
    if (!isComparison) {
      if (!singleRadar) return null;

      const totalScore = singleRadar.reduce((sum, s) => sum + s.score, 0);
      const totalMax = singleRadar.reduce((sum, s) => sum + s.maxScore, 0);
      const totalTasks = singleRadar.reduce((sum, s) => sum + s.taskCount, 0);

      const activeGoal = (goals ?? [])
        .filter((g) => g.status === "active")
        .sort((a, b) => b.periodEnd - a.periodEnd)[0];

      let targetPercent: number | null = null;
      if (activeGoal) {
        if (activeGoal.targetType === "stages_completed" && totalMax > 0) {
          targetPercent = Math.max(0, Math.min(100, Math.round((activeGoal.targetValue / totalMax) * 100)));
        } else if (activeGoal.targetType === "tasks_completed" && totalTasks > 0) {
          targetPercent = Math.max(0, Math.min(100, Math.round((activeGoal.targetValue / totalTasks) * 100)));
        }
      }

      return singleRadar.map((s) => ({
        section: s.section,
        current: s.percentage,
        target: targetPercent,
      }));
    }

    const ready = comparisonData.filter((d): d is NonNullable<typeof d> => Array.isArray(d));
    if (ready.length === 0) return null;

    const allSections = Array.from(
      new Set(ready.flatMap((dataset) => dataset.map((item) => item.section))),
    );

    return allSections.map((section) => {
      const row: Record<string, string | number> = { section };
      clipped.forEach((tech, idx) => {
        const val = comparisonData[idx]?.find((s) => s.section === section)?.percentage ?? 0;
        row[`tech${idx}`] = val;
        row[`techLabel${idx}`] = tech.technicianName;
      });
      return row;
    });
  }, [isComparison, singleRadar, goals, clipped, comparisonData]);

  const loadingSingle = !isComparison && jacketId && (singleRadar === undefined || jacket === undefined);
  const loadingComparison = isComparison && clipped.some((_, idx) => comparisonData[idx] === undefined);

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {loadingSingle || loadingComparison ? (
          <Skeleton className="h-[340px] w-full" />
        ) : !chartData || chartData.length === 0 ? (
          <div className="h-[340px] flex items-center justify-center text-sm text-muted-foreground">
            No radar data available
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={340}>
            <RadarChart data={chartData as Array<Record<string, string | number>>} outerRadius="68%">
              <PolarGrid stroke="hsl(var(--border))" />
              <PolarAngleAxis dataKey="section" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
              <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10 }} />
              <Tooltip
                formatter={(value: number | undefined) => [`${value ?? 0}%`, "Completion"]}
                contentStyle={{
                  background: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 8,
                }}
              />
              <Legend />

              {!isComparison ? (
                <>
                  <Radar name="Current" dataKey="current" stroke="#2563eb" fill="#2563eb" fillOpacity={0.35} />
                  {(chartData as Array<{ target: number | null }>).some((d) => d.target !== null) && (
                    <Radar
                      name="Target"
                      dataKey="target"
                      stroke="#9ca3af"
                      fillOpacity={0}
                      strokeDasharray="4 4"
                    />
                  )}
                </>
              ) : (
                clipped.map((tech, idx) => (
                  <Radar
                    key={tech.technicianId}
                    name={tech.technicianName}
                    dataKey={`tech${idx}`}
                    stroke={TECH_COLORS[idx]}
                    fill={TECH_COLORS[idx]}
                    fillOpacity={0.16}
                  />
                ))
              )}
            </RadarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
