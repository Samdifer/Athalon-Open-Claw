"use client";

// MBP-0112: Hangar Bay Allocation View
// Visual grid: bays as columns, time as rows. Color by WO priority/status.

import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Warehouse, PlaneTakeoff, Wrench, AlertTriangle } from "lucide-react";

type Bay = {
  _id: string;
  name: string;
  type: string;
  status: string;
};

type ScheduledProject = {
  workOrderId: string;
  workOrderNumber: string;
  workOrderStatus: string;
  priority: "routine" | "urgent" | "aog";
  hangarBayId: string;
  scheduledStartDate: number;
  promisedDeliveryDate: number;
  aircraft: { currentRegistration: string | undefined; make: string; model: string } | null;
};

type ConflictInfo = {
  woIds: string[];
  message: string;
  severity: string;
};

interface BayAllocationGridProps {
  bays: Bay[];
  projects: ScheduledProject[];
  conflicts?: ConflictInfo[];
  daysToShow?: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const ROW_HEIGHT = 28;

function getPriorityColor(priority: string, status: string): string {
  if (status === "closed") return "bg-slate-500/30 border-slate-500/50";
  if (priority === "aog") return "bg-red-600/60 border-red-500/80";
  if (priority === "urgent") return "bg-amber-500/50 border-amber-400/70";
  return "bg-sky-500/40 border-sky-400/60";
}

function getPriorityBadge(priority: string): string {
  if (priority === "aog") return "bg-red-600 text-white";
  if (priority === "urgent") return "bg-amber-500 text-white";
  return "bg-sky-500 text-white";
}

function typeIcon(type: string) {
  switch (type) {
    case "hangar":
      return <Warehouse className="w-3.5 h-3.5" />;
    case "ramp":
      return <PlaneTakeoff className="w-3.5 h-3.5" />;
    case "paint":
      return <Wrench className="w-3.5 h-3.5" />;
    default:
      return <Warehouse className="w-3.5 h-3.5" />;
  }
}

export function BayAllocationGrid({
  bays,
  projects,
  conflicts = [],
  daysToShow = 30,
}: BayAllocationGridProps) {
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const days = useMemo(() => {
    const result: Date[] = [];
    const start = new Date(today.getTime() - 7 * DAY_MS);
    for (let i = 0; i < daysToShow + 7; i++) {
      result.push(new Date(start.getTime() + i * DAY_MS));
    }
    return result;
  }, [today, daysToShow]);

  const conflictWoIds = useMemo(() => {
    const set = new Set<string>();
    for (const c of conflicts) {
      for (const id of c.woIds) set.add(id);
    }
    return set;
  }, [conflicts]);

  const projectsByBay = useMemo(() => {
    const map = new Map<string, ScheduledProject[]>();
    for (const bay of bays) {
      map.set(bay._id, []);
    }
    for (const p of projects) {
      const list = map.get(p.hangarBayId);
      if (list) list.push(p);
    }
    return map;
  }, [bays, projects]);

  if (bays.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <Warehouse className="w-10 h-10 mb-3 opacity-40" />
        <p className="text-sm">No bays configured. Add bays to see the allocation grid.</p>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="border rounded-lg overflow-hidden bg-card">
        {/* Header: Bay names */}
        <div className="flex border-b border-border/60 bg-muted/30">
          <div
            className="flex-shrink-0 border-r border-border/40 px-3 flex items-center"
            style={{ width: 80, height: ROW_HEIGHT + 4 }}
          >
            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
              Date
            </span>
          </div>
          {bays.map((bay) => (
            <div
              key={bay._id}
              className="flex-1 min-w-[120px] border-r border-border/30 px-2 flex items-center gap-1.5"
              style={{ height: ROW_HEIGHT + 4 }}
            >
              <span className="text-muted-foreground">{typeIcon(bay.type)}</span>
              <span className="text-[11px] font-semibold truncate">{bay.name}</span>
              <Badge
                variant="outline"
                className={`text-[9px] px-1 py-0 ${
                  bay.status === "available"
                    ? "text-emerald-600 border-emerald-400"
                    : bay.status === "occupied"
                      ? "text-sky-600 border-sky-400"
                      : "text-amber-600 border-amber-400"
                }`}
              >
                {bay.status}
              </Badge>
            </div>
          ))}
        </div>

        {/* Grid rows: one per day */}
        <div className="overflow-y-auto max-h-[500px]">
          {days.map((day, dayIdx) => {
            const isToday = day.toDateString() === today.toDateString();
            const isWeekend = day.getDay() === 0 || day.getDay() === 6;
            const dayMs = day.getTime();

            return (
              <div
                key={dayIdx}
                className={`flex border-b border-border/20 ${
                  isToday
                    ? "bg-primary/5 ring-1 ring-inset ring-primary/20"
                    : isWeekend
                      ? "bg-muted/10"
                      : ""
                }`}
                style={{ minHeight: ROW_HEIGHT }}
              >
                {/* Date label */}
                <div
                  className={`flex-shrink-0 border-r border-border/40 px-2 flex items-center ${
                    isToday ? "font-bold text-primary" : "text-muted-foreground"
                  }`}
                  style={{ width: 80 }}
                >
                  <span className="text-[10px]">
                    {day.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </span>
                </div>

                {/* Bay cells */}
                {bays.map((bay) => {
                  const bayProjects = projectsByBay.get(bay._id) ?? [];
                  const activeProjects = bayProjects.filter(
                    (p) => p.scheduledStartDate <= dayMs + DAY_MS && p.promisedDeliveryDate > dayMs,
                  );

                  return (
                    <div
                      key={bay._id}
                      className="flex-1 min-w-[120px] border-r border-border/15 px-1 py-0.5 flex flex-wrap gap-0.5"
                    >
                      {activeProjects.map((p) => {
                        const isConflict = conflictWoIds.has(p.workOrderId);
                        return (
                          <Tooltip key={p.workOrderId}>
                            <TooltipTrigger asChild>
                              <div
                                className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border ${getPriorityColor(p.priority, p.workOrderStatus)} ${
                                  isConflict ? "ring-2 ring-red-500/60" : ""
                                }`}
                              >
                                {isConflict && <AlertTriangle className="w-2.5 h-2.5 text-red-500" />}
                                <span className="font-mono">{p.workOrderNumber}</span>
                                {p.aircraft?.currentRegistration && (
                                  <span className="opacity-70">{p.aircraft.currentRegistration}</span>
                                )}
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="text-xs max-w-xs">
                              <div className="space-y-1">
                                <div className="font-semibold">{p.workOrderNumber}</div>
                                {p.aircraft && (
                                  <div>
                                    {p.aircraft.currentRegistration} — {p.aircraft.make}{" "}
                                    {p.aircraft.model}
                                  </div>
                                )}
                                <div className="flex items-center gap-2">
                                  <Badge className={`text-[9px] ${getPriorityBadge(p.priority)}`}>
                                    {p.priority.toUpperCase()}
                                  </Badge>
                                  <span>{p.workOrderStatus}</span>
                                </div>
                                <div className="text-muted-foreground">
                                  {new Date(p.scheduledStartDate).toLocaleDateString()} →{" "}
                                  {new Date(p.promisedDeliveryDate).toLocaleDateString()}
                                </div>
                                {isConflict && (
                                  <div className="text-red-500 font-medium flex items-center gap-1">
                                    <AlertTriangle className="w-3 h-3" />
                                    Bay scheduling conflict
                                  </div>
                                )}
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </TooltipProvider>
  );
}
