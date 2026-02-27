"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

// Placeholder data — will be replaced with real time-entry queries when available
const PLACEHOLDER_DATA = [
  { name: "J. Martinez", hours: 38.5 },
  { name: "S. Mercado", hours: 34.0 },
  { name: "T. Brooks", hours: 41.2 },
  { name: "R. Chen", hours: 29.0 },
  { name: "K. Williams", hours: 36.5 },
];

export function TechUtilizationChart() {
  return (
    <Card className="border-border/60">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">
          Technician Hours (This Week)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={PLACEHOLDER_DATA} layout="vertical" margin={{ left: 20 }}>
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
              formatter={(value: number) => [`${value}h`, "Hours"]}
            />
            <Bar dataKey="hours" fill="#06b6d4" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
        <p className="text-[10px] text-muted-foreground mt-1 text-center italic">
          Sample data — connect time entries for live tracking
        </p>
      </CardContent>
    </Card>
  );
}
