import { useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Props = {
  organizationId: string;
  aircraftType: string;
  currentTotalTime: number;
  currentCycles: number;
  averageMonthlyHours: number;
  averageMonthlyCycles: number;
  focusProgramId?: Id<"maintenancePrograms">;
};

function fmtDate(ts: number | null) {
  if (!ts) return "—";
  return new Date(ts).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function DueDateProjection(props: Props) {
  const data = useQuery(api.maintenancePrograms.computeDueDates, {
    organizationId: props.organizationId,
    aircraftType: props.aircraftType,
    currentTotalTime: props.currentTotalTime,
    currentCycles: props.currentCycles,
    averageMonthlyHours: props.averageMonthlyHours,
    averageMonthlyCycles: props.averageMonthlyCycles,
  });

  const projection = useMemo(() => {
    if (!data) return null;
    if (props.focusProgramId) {
      return data.find((row) => row.programId === props.focusProgramId) ?? null;
    }
    return data[0] ?? null;
  }, [data, props.focusProgramId]);

  const timeline = useMemo(() => {
    if (!projection || projection.projections.length === 0) return [] as typeof projection.projections;
    const sorted = [...projection.projections].sort((a, b) => a.dueDate - b.dueDate);
    const min = sorted[0]?.dueDate ?? 0;
    const max = sorted[sorted.length - 1]?.dueDate ?? min;
    const span = Math.max(1, max - min);
    return sorted.map((p) => ({
      ...p,
      leftPct: ((p.dueDate - min) / span) * 100,
    }));
  }, [projection]);

  if (!projection) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Due Date Projection</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">No projections available.</CardContent>
      </Card>
    );
  }

  const sorted = [...projection.projections].sort((a, b) => a.dueDate - b.dueDate);
  const triggerDate = projection.triggerLogic === "first" ? sorted[0]?.dueDate : sorted[sorted.length - 1]?.dueDate;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Due Date Projection</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {projection.projections.map((p) => {
            const isTrigger = p.dueDate === triggerDate;
            return (
              <div
                key={p.type}
                className={cn(
                  "rounded-md border p-3",
                  isTrigger ? "border-primary bg-primary/5" : "border-border/70",
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium capitalize">{p.type}</span>
                  {isTrigger && (
                    <Badge variant="default">
                      {projection.triggerLogic === "first" ? "Triggers First" : "Triggers Last"}
                    </Badge>
                  )}
                </div>
                <p className="text-lg font-semibold mt-1">{fmtDate(p.dueDate)}</p>
                <p className="text-xs text-muted-foreground">Remaining: {p.remaining}</p>
              </div>
            );
          })}
        </div>

        <div className="space-y-2">
          <div className="text-xs text-muted-foreground">Timeline convergence</div>
          <div className="relative h-12 rounded-md border border-border/70 bg-muted/30">
            <div className="absolute left-2 right-2 top-1/2 h-px -translate-y-1/2 bg-border" />
            {timeline.map((p) => (
              <div
                key={p.type}
                className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 text-[10px]"
                style={{ left: `calc(${p.leftPct}% + 8px)` }}
              >
                <div className={cn("w-2 h-2 rounded-full mx-auto", p.dueDate === triggerDate ? "bg-primary" : "bg-muted-foreground")} />
                <div className="mt-1 text-center capitalize">{p.type}</div>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Effective due date: <span className="font-medium text-foreground">{fmtDate(projection.effectiveDueDate)}</span>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
