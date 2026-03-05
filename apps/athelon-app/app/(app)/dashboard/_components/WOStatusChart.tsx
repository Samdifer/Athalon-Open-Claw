import React, { useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

// BUG-SM-HUNT-014: `cancelled` was missing from both maps. Cancelled WOs
// rendered as raw "cancelled" text with the grey fallback color, making the
// pie chart legend inconsistent with the rest of the app's status vocabulary.
const STATUS_COLORS: Record<string, string> = {
  open: "#3b82f6",
  in_progress: "#f59e0b",
  complete: "#22c55e",
  closed: "#22c55e",
  on_hold: "#6b7280",
  draft: "#a78bfa",
  pending_inspection: "#06b6d4",
  pending_signoff: "#8b5cf6",
  open_discrepancies: "#ef4444",
  cancelled: "#64748b",
  voided: "#991b1b",
};

const STATUS_LABELS: Record<string, string> = {
  open: "Open",
  in_progress: "In Progress",
  complete: "Complete",
  closed: "Closed",
  on_hold: "On Hold",
  draft: "Draft",
  pending_inspection: "Pending Inspection",
  pending_signoff: "Pending Signoff",
  open_discrepancies: "Discrepancies",
  cancelled: "Cancelled",
  voided: "Voided",
};

export const WOStatusChart = React.memo(function WOStatusChart({ workOrders: propWorkOrders }: { workOrders?: Array<{ status: string }> }) {
  const { orgId } = useCurrentOrg();

  const woResult = useQuery(
    api.workOrders.listWorkOrders,
    orgId && propWorkOrders === undefined
      ? { organizationId: orgId, paginationOpts: { numItems: 200, cursor: null } }
      : "skip",
  );

  const chartData = useMemo(() => {
    const source = propWorkOrders ?? woResult?.page ?? [];
    const counts: Record<string, number> = {};
    for (const wo of source) {
      counts[wo.status] = (counts[wo.status] || 0) + 1;
    }
    return Object.entries(counts).map(([status, count]) => ({
      name: STATUS_LABELS[status] || status,
      value: count,
      color: STATUS_COLORS[status] || "#6b7280",
    }));
  }, [propWorkOrders, woResult]);

  if (!orgId) return null;

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">WO Status Distribution</CardTitle>
      </CardHeader>
      <CardContent>
        {!propWorkOrders && !woResult ? (
          <Skeleton className="h-[250px] w-full" />
        ) : chartData.length === 0 ? (
          <div className="h-[250px] flex items-center justify-center text-sm text-muted-foreground">
            No work orders found
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={90}
                paddingAngle={2}
                dataKey="value"
              >
                {chartData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} stroke="transparent" />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  fontSize: "12px",
                  color: "hsl(var(--popover-foreground))",
                }}
              />
              <Legend
                wrapperStyle={{ fontSize: "11px" }}
                formatter={(value: string) => (
                  <span style={{ color: "hsl(var(--muted-foreground))" }}>{value}</span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
});
