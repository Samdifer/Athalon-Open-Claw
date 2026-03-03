"use client";

import React, { useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export const RevenueTrendChart = React.memo(function RevenueTrendChart() {
  const { orgId } = useCurrentOrg();

  const invoices = useQuery(
    api.billing.listInvoices,
    orgId ? { orgId, status: "PAID" as const } : "skip",
  );

  const chartData = useMemo(() => {
    if (!invoices) return [];

    const now = new Date();
    const monthlyTotals: Record<string, number> = {};

    // Initialize last 12 months
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      monthlyTotals[key] = 0;
    }

    for (const inv of invoices) {
      if (!inv.paidAt && !inv.createdAt) continue;
      // Use paidAt for cash-basis attribution; fall back to createdAt (consistent
      // with the Financial Dashboard). updatedAt is the last-edit timestamp and
      // changes whenever a line item is corrected — it is NOT a payment date.
      const d = new Date(inv.paidAt ?? inv.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (key in monthlyTotals) {
        monthlyTotals[key] += inv.total ?? 0;
      }
    }

    return Object.entries(monthlyTotals).map(([key, total]) => {
      const [, m] = key.split("-");
      return { month: MONTH_NAMES[parseInt(m!, 10) - 1], revenue: Math.round(total * 100) / 100 };
    });
  }, [invoices]);

  if (!orgId) return null;

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Revenue Trend (12 Months)</CardTitle>
      </CardHeader>
      <CardContent>
        {!invoices ? (
          <Skeleton className="h-[250px] w-full" />
        ) : chartData.every((d) => d.revenue === 0) ? (
          <div className="h-[250px] flex items-center justify-center text-sm text-muted-foreground">
            No paid invoices found
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  fontSize: "12px",
                  color: "hsl(var(--popover-foreground))",
                }}
                formatter={((value: any) => [`$${value?.toLocaleString?.() ?? value}`, "Revenue"]) as any}
              />
              <Line
                type="monotone"
                dataKey="revenue"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={{ r: 3, fill: "#3b82f6" }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
});
