"use client";

import React, { useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
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

export const TATChart = React.memo(function TATChart() {
  const { orgId } = useCurrentOrg();

  const woResult = useQuery(
    api.workOrders.listWorkOrders,
    orgId
      ? { organizationId: orgId, status: "closed" as const, paginationOpts: { numItems: 50, cursor: null } }
      : "skip",
  );

  const chartData = useMemo(() => {
    if (!woResult?.page) return [];

    return woResult.page
      .filter((wo: any) => wo.completedAt && wo._creationTime)
      .slice(0, 15)
      .map((wo: any) => {
        const days = Math.max(
          1,
          Math.round((wo.completedAt - wo._creationTime) / (1000 * 60 * 60 * 24)),
        );
        return {
          wo: wo.number ?? wo._id.slice(-6),
          days,
        };
      })
      .reverse();
  }, [woResult]);

  if (!orgId) return null;

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Turn-Around Time (Days)</CardTitle>
      </CardHeader>
      <CardContent>
        {!woResult ? (
          <Skeleton className="h-[250px] w-full" />
        ) : chartData.length === 0 ? (
          <div className="h-[250px] flex items-center justify-center text-sm text-muted-foreground">
            No completed work orders yet
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="wo"
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                label={{
                  value: "Days",
                  angle: -90,
                  position: "insideLeft",
                  style: { fontSize: 11, fill: "hsl(var(--muted-foreground))" },
                }}
              />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  fontSize: "12px",
                  color: "hsl(var(--popover-foreground))",
                }}
                formatter={(value: any) => [`${value} days`, "TAT"]}
              />
              <Bar dataKey="days" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
});
