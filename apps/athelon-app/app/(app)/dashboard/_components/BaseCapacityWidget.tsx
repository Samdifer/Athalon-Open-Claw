import type { FunctionReturnType } from "convex/server";
import type { api } from "@/convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Gauge } from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
} from "recharts";

type CapacityUtil = FunctionReturnType<typeof api.capacity.getCapacityUtilization>;
type BayData = FunctionReturnType<typeof api.hangarBays.listBays>;

function getUtilColor(pct: number): string {
  if (pct < 70) return "hsl(142, 71%, 45%)"; // green
  if (pct < 85) return "hsl(38, 92%, 50%)";  // amber
  return "hsl(0, 72%, 51%)";                  // red
}

function getUtilLabel(pct: number): string {
  if (pct < 70) return "Healthy";
  if (pct < 85) return "Nearing Capacity";
  return "Over Capacity";
}

export function BaseCapacityWidget({
  capacityUtil,
  bays,
}: {
  capacityUtil: CapacityUtil | undefined;
  bays: BayData | undefined;
}) {
  if (!capacityUtil) {
    return (
      <Card className="border-border/60">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Gauge className="w-4 h-4 text-muted-foreground" />
            Base Capacity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[180px] w-full" />
        </CardContent>
      </Card>
    );
  }

  const utilPct = Math.min(
    100,
    Math.round(capacityUtil.utilizationPercent ?? 0),
  );
  const committed = Math.round(capacityUtil.committedHours ?? 0);
  const available = Math.round(capacityUtil.totalAvailableHours ?? 0);
  const color = getUtilColor(utilPct);
  const label = getUtilLabel(utilPct);

  // Semicircle gauge data
  const gaugeData = [
    { name: "used", value: utilPct },
    { name: "free", value: 100 - utilPct },
  ];

  // Bay summary
  const bayList = bays ?? [];
  const occupiedBays = bayList.filter((b) => b.status === "occupied").length;
  const maintenanceBays = bayList.filter((b) => b.status === "maintenance").length;
  const availableBays = bayList.filter((b) => b.status === "available").length;
  const totalBays = bayList.length;

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Gauge className="w-4 h-4 text-muted-foreground" />
          Base Capacity
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {/* Semicircle Gauge */}
        <div className="relative mx-auto" style={{ width: 180, height: 100 }}>
          <ResponsiveContainer width="100%" height={100}>
            <PieChart>
              <Pie
                data={gaugeData}
                cx="50%"
                cy="100%"
                startAngle={180}
                endAngle={0}
                innerRadius={55}
                outerRadius={80}
                paddingAngle={0}
                dataKey="value"
                stroke="none"
              >
                <Cell fill={color} />
                <Cell fill="hsl(var(--muted-foreground) / 0.12)" />
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-end pb-1">
            <span className="text-2xl font-bold text-foreground">{utilPct}%</span>
            <span className="text-[10px] text-muted-foreground">{label}</span>
          </div>
        </div>

        {/* Hours breakdown */}
        <div className="text-center mt-2 mb-3">
          <p className="text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">{committed}</span>
            {" / "}
            <span>{available}</span>
            {" hrs committed this week"}
          </p>
          {capacityUtil.bufferPercent != null && (
            <p className="text-[10px] text-muted-foreground/70 mt-0.5">
              {capacityUtil.bufferPercent}% buffer reserved
            </p>
          )}
        </div>

        {/* Bay Occupancy */}
        {totalBays > 0 && (
          <div className="border-t border-border/40 pt-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-medium text-muted-foreground">
                Bay Occupancy
              </span>
              <span className="text-[11px] text-muted-foreground">
                {occupiedBays}/{totalBays} occupied
              </span>
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {bayList.map((bay) => {
                const dotColor =
                  bay.status === "occupied"
                    ? "bg-sky-400"
                    : bay.status === "maintenance"
                      ? "bg-orange-400"
                      : "bg-green-400";
                return (
                  <div
                    key={bay._id}
                    className="flex items-center gap-1"
                    title={`${bay.name}: ${bay.status}`}
                  >
                    <div className={`w-2.5 h-2.5 rounded-full ${dotColor}`} />
                    <span className="text-[9px] text-muted-foreground">{bay.name}</span>
                  </div>
                );
              })}
            </div>
            {(occupiedBays > 0 || maintenanceBays > 0 || availableBays > 0) && (
              <div className="flex gap-3 mt-2 text-[9px] text-muted-foreground/70">
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
                  Available ({availableBays})
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-400 inline-block" />
                  Occupied ({occupiedBays})
                </span>
                {maintenanceBays > 0 && (
                  <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-400 inline-block" />
                    Maintenance ({maintenanceBays})
                  </span>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
