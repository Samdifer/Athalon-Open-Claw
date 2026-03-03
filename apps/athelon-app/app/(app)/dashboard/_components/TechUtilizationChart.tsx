"use client";

import React, { useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

function getWeekStart(): number {
  const now = new Date();
  const day = now.getUTCDay();
  const daysFromMon = day === 0 ? 6 : day - 1;
  const weekStart = new Date(now);
  weekStart.setUTCDate(now.getUTCDate() - daysFromMon);
  weekStart.setUTCHours(0, 0, 0, 0);
  return weekStart.getTime();
}

export const TechUtilizationChart = React.memo(function TechUtilizationChart() {
  const { orgId } = useCurrentOrg();
  const typedOrgId = orgId as Id<"organizations"> | null;

  const timeEntries = useQuery(
    api.timeClock.listTimeEntries,
    typedOrgId ? { orgId: typedOrgId } : "skip",
  );

  const technicians = useQuery(
    api.technicians.list,
    typedOrgId ? { organizationId: typedOrgId } : "skip",
  );

  const chartData = useMemo(() => {
    if (!timeEntries || !technicians) return null;

    const weekStart = getWeekStart();
    const now = Date.now();

    // Build a name map
    const nameMap = new Map<string, string>();
    for (const tech of technicians) {
      const name = tech.legalName ?? tech.userId ?? "Unknown";
      // Shorten to first name + last initial for chart readability
      const parts = name.trim().split(" ");
      const short = parts.length >= 2
        ? `${parts[0]} ${parts[parts.length - 1][0]}.`
        : parts[0] ?? "Unknown";
      nameMap.set(tech._id, short);
    }

    // Aggregate hours per tech for this week
    const hours = new Map<string, number>();
    for (const entry of timeEntries) {
      if (entry.clockInAt < weekStart) continue;
      const mins = entry.durationMinutes != null
        ? entry.durationMinutes
        : Math.round((now - entry.clockInAt) / 60_000);
      const current = hours.get(entry.technicianId) ?? 0;
      hours.set(entry.technicianId, current + mins);
    }

    return Array.from(hours.entries())
      .map(([techId, totalMins]) => ({
        name: nameMap.get(techId) ?? techId.slice(-6),
        hours: Math.round((totalMins / 60) * 10) / 10,
      }))
      .sort((a, b) => b.hours - a.hours)
      .slice(0, 8);
  }, [timeEntries, technicians]);

  if (!typedOrgId) return null;

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">
          Technician Hours (This Week)
        </CardTitle>
      </CardHeader>
      <CardContent>
        {chartData === null ? (
          <Skeleton className="h-[250px] w-full" />
        ) : chartData.length === 0 ? (
          <div className="h-[250px] flex items-center justify-center text-sm text-muted-foreground">
            No time entries this week
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={chartData} layout="vertical" margin={{ left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                type="number"
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                label={{
                  value: "Hours",
                  position: "insideBottom",
                  offset: -5,
                  style: { fontSize: 11, fill: "hsl(var(--muted-foreground))" },
                }}
              />
              <YAxis
                dataKey="name"
                type="category"
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                width={80}
              />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  fontSize: "12px",
                  color: "hsl(var(--popover-foreground))",
                }}
                formatter={(value: number | undefined) => [`${value ?? 0}h`, "Hours"]}
              />
              <Bar dataKey="hours" fill="#06b6d4" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
});
