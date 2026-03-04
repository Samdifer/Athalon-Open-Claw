"use client";

import { useState, useRef, useMemo, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { CalendarDays, Plus } from "lucide-react";
import { GanttProgressBar } from "./GanttProgressBar";
import { GanttDependencyArrows, type TaskPosition, type WODependency } from "./GanttDependencyArrows";
import { GanttSidebar, type WorkOrderRow } from "./GanttSidebar";
import { GanttFilterBar, type GanttFilters, type ViewMode, DEFAULT_FILTERS } from "./GanttFilterBar";
import { Link } from "react-router-dom";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export type WorkOrderWithRisk = {
  _id: string;
  workOrderNumber: string;
  status: string;
  priority: "routine" | "urgent" | "aog";
  description: string;
  openedAt: number;
  promisedDeliveryDate?: number;
  scheduledStartDate?: number;
  estimatedLaborHoursOverride?: number;
  taskCardEstimateTotal: number;
  effectiveEstimatedHours: number;
  completedHours: number;
  remainingHours: number;
  riskLevel: "overdue" | "at_risk" | "on_track" | "no_date";
  aircraft: { currentRegistration: string | undefined; make: string; model: string } | null;
};

interface GanttChartProps {
  workOrders: WorkOrderWithRisk[];
  dependencies?: WODependency[];
  criticalPathIds?: Set<string>;
  onOpenBacklog: () => void;
  unscheduledCount: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

const ROW_HEIGHT = 48;
const BAR_HEIGHT = 30;
const DAY_MS = 86_400_000;
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

const VIEW_CELL_WIDTHS: Record<ViewMode, number> = {
  day: 40,
  week: 10,
  month: 4,
};

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function msToDay(ms: number): number {
  return Math.floor(ms / DAY_MS);
}

function getBarColorClasses(wo: WorkOrderWithRisk): string {
  if (wo.status === "closed") return "bg-slate-500/40 border-slate-500 text-slate-300";
  if (wo.priority === "aog") return "bg-red-600/80 border-red-500 text-white aog-pulse";
  if (wo.priority === "urgent") return "bg-amber-500/70 border-amber-400 text-white";
  if (wo.riskLevel === "overdue") return "bg-red-400/60 border-red-500 text-white";
  if (wo.riskLevel === "at_risk") return "bg-amber-500/50 border-amber-400 text-foreground";
  return "bg-sky-500/60 border-sky-400 text-white";
}

function daysRemaining(wo: WorkOrderWithRisk): number {
  if (!wo.promisedDeliveryDate) return 0;
  return Math.ceil((wo.promisedDeliveryDate - Date.now()) / DAY_MS);
}

// ─────────────────────────────────────────────────────────────────────────────
// TOOLTIP
// ─────────────────────────────────────────────────────────────────────────────

function WOTooltip({ wo }: { wo: WorkOrderWithRisk }) {
  const pct =
    wo.effectiveEstimatedHours > 0
      ? Math.round((wo.completedHours / wo.effectiveEstimatedHours) * 100)
      : 0;
  const days = daysRemaining(wo);

  return (
    <div className="absolute bottom-full left-0 mb-2 z-50 pointer-events-none">
      <div className="bg-popover border border-border rounded-md shadow-lg px-3 py-2 text-xs space-y-1 w-56">
        <div className="font-semibold font-mono text-foreground">{wo.workOrderNumber}</div>
        {wo.aircraft && (
          <div className="text-muted-foreground">
            {wo.aircraft.currentRegistration} — {wo.aircraft.make} {wo.aircraft.model}
          </div>
        )}
        <div className="flex justify-between text-muted-foreground">
          <span>{pct}% complete</span>
          <span>{days > 0 ? `${days}d remaining` : days === 0 ? "Due today" : `${Math.abs(days)}d overdue`}</span>
        </div>
        <div className="w-full bg-muted rounded-full h-1.5">
          <div
            className="bg-primary h-1.5 rounded-full transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export function GanttChart({
  workOrders,
  dependencies = [],
  criticalPathIds,
  onOpenBacklog,
  unscheduledCount,
}: GanttChartProps) {
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);
  const sidebarScrollRef = useRef<HTMLDivElement>(null);
  const updateSchedule = useMutation(api.scheduling.updateWOSchedule);

  const [filters, setFilters] = useState<GanttFilters>(DEFAULT_FILTERS);
  const [hoveredWO, setHoveredWO] = useState<string | null>(null);

  const cellWidth = VIEW_CELL_WIDTHS[filters.zoom];

  // ── Drag state ─────────────────────────────────────────────────────────
  const [dragState, setDragState] = useState<{
    woId: string;
    type: "move" | "resize";
    startX: number;
    origStartDate: number;
    origEndDate: number;
  } | null>(null);
  const [dragDelta, setDragDelta] = useState(0);

  // ── Today ──────────────────────────────────────────────────────────────
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  // ── Filter WOs ─────────────────────────────────────────────────────────
  const filteredWOs = useMemo(() => {
    return workOrders.filter((wo) => {
      if (filters.priorities.length > 0 && !filters.priorities.includes(wo.priority)) return false;
      if (filters.statuses.length > 0 && !filters.statuses.includes(wo.status)) return false;
      if (filters.aircraftTypes.length > 0 && wo.aircraft && !filters.aircraftTypes.includes(`${wo.aircraft.make} ${wo.aircraft.model}`)) return false;
      return true;
    });
  }, [workOrders, filters]);

  // ── Only scheduled WOs ─────────────────────────────────────────────────
  const scheduledWOs = useMemo(
    () => filteredWOs.filter((wo) => wo.scheduledStartDate && wo.promisedDeliveryDate),
    [filteredWOs],
  );

  // ── Date range ─────────────────────────────────────────────────────────
  const days = useMemo(() => {
    let rangeStartMs = today.getTime() - 14 * DAY_MS;
    let rangeEndMs = today.getTime() + 60 * DAY_MS;

    for (const wo of scheduledWOs) {
      if (wo.scheduledStartDate! < rangeStartMs) rangeStartMs = wo.scheduledStartDate!;
      if (wo.promisedDeliveryDate! > rangeEndMs) rangeEndMs = wo.promisedDeliveryDate!;
    }

    const startDay = new Date(rangeStartMs);
    startDay.setHours(0, 0, 0, 0);
    const endDay = new Date(rangeEndMs);
    endDay.setHours(0, 0, 0, 0);

    const result: Date[] = [];
    const cursor = new Date(startDay);
    while (cursor <= endDay) {
      result.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
    return result;
  }, [today, scheduledWOs]);

  const rangeStartDay = useMemo(() => msToDay(days[0]?.getTime() ?? 0), [days]);

  // ── Sorted rows (AOG first, then by start date) ───────────────────────
  const sortedWOs = useMemo(() => {
    const priorityOrder: Record<string, number> = { aog: 0, urgent: 1, routine: 2 };
    return [...scheduledWOs].sort((a, b) => {
      const pa = priorityOrder[a.priority] ?? 99;
      const pb = priorityOrder[b.priority] ?? 99;
      if (pa !== pb) return pa - pb;
      return (a.scheduledStartDate ?? 0) - (b.scheduledStartDate ?? 0);
    });
  }, [scheduledWOs]);

  // ── Bar positions ──────────────────────────────────────────────────────
  const woPositions = useMemo(() => {
    return sortedWOs.map((wo, rowIndex) => {
      let startMs = wo.scheduledStartDate!;
      let endMs = wo.promisedDeliveryDate!;

      if (dragState && dragState.woId === wo._id) {
        const daysDelta = Math.round(dragDelta / cellWidth);
        if (dragState.type === "move") {
          startMs = dragState.origStartDate + daysDelta * DAY_MS;
          endMs = dragState.origEndDate + daysDelta * DAY_MS;
        } else {
          endMs = Math.max(dragState.origStartDate + DAY_MS, dragState.origEndDate + daysDelta * DAY_MS);
        }
      }

      const startDayIdx = msToDay(startMs) - rangeStartDay;
      const endDayIdx = msToDay(endMs) - rangeStartDay;
      const maxIdx = days.length - 1;

      return {
        wo,
        rowIndex,
        startDayIdx: Math.max(0, Math.min(startDayIdx, maxIdx)),
        endDayIdx: Math.max(0, Math.min(endDayIdx, maxIdx)),
      };
    });
  }, [sortedWOs, rangeStartDay, days.length, dragState, dragDelta, cellWidth]);

  // ── Task positions map for dependency arrows ───────────────────────────
  const taskPositionsMap = useMemo(() => {
    const map = new Map<string, TaskPosition>();
    for (const pos of woPositions) {
      const left = pos.startDayIdx * cellWidth;
      const width = Math.max(cellWidth, (pos.endDayIdx - pos.startDayIdx) * cellWidth);
      const top = ROW_HEIGHT + pos.rowIndex * ROW_HEIGHT + (ROW_HEIGHT - BAR_HEIGHT) / 2;
      map.set(pos.wo._id, { left, width, top, height: BAR_HEIGHT });
    }
    return map;
  }, [woPositions, cellWidth]);

  // ── Today column index ─────────────────────────────────────────────────
  const todayIndex = useMemo(
    () => days.findIndex((d) => d.toDateString() === today.toDateString()),
    [days, today],
  );

  // ── Auto-scroll to today ──────────────────────────────────────────────
  useEffect(() => {
    if (scrollRef.current && todayIndex >= 0) {
      scrollRef.current.scrollLeft = Math.max(0, todayIndex * cellWidth - 200);
    }
  }, [todayIndex, cellWidth]);

  // ── Sync sidebar scroll ───────────────────────────────────────────────
  const handleTimelineScroll = useCallback(() => {
    if (scrollRef.current && sidebarScrollRef.current) {
      sidebarScrollRef.current.scrollTop = scrollRef.current.scrollTop;
    }
  }, []);

  // ── Drag handlers ─────────────────────────────────────────────────────
  const handleMouseDown = useCallback(
    (e: React.MouseEvent, wo: WorkOrderWithRisk, type: "move" | "resize") => {
      e.preventDefault();
      e.stopPropagation();
      setDragState({
        woId: wo._id,
        type,
        startX: e.clientX,
        origStartDate: wo.scheduledStartDate!,
        origEndDate: wo.promisedDeliveryDate!,
      });
      setDragDelta(0);
    },
    [],
  );

  useEffect(() => {
    if (!dragState) return;

    function handleMouseMove(e: MouseEvent) {
      setDragDelta(e.clientX - dragState!.startX);
    }

    async function handleMouseUp(e: MouseEvent) {
      const delta = e.clientX - dragState!.startX;
      const daysDelta = Math.round(delta / cellWidth);

      if (daysDelta !== 0) {
        let newStart: number;
        let newEnd: number;

        if (dragState!.type === "move") {
          newStart = dragState!.origStartDate + daysDelta * DAY_MS;
          newEnd = dragState!.origEndDate + daysDelta * DAY_MS;
        } else {
          newStart = dragState!.origStartDate;
          newEnd = Math.max(dragState!.origStartDate + DAY_MS, dragState!.origEndDate + daysDelta * DAY_MS);
        }

        try {
          await updateSchedule({
            woId: dragState!.woId as Id<"workOrders">,
            startDate: newStart,
            endDate: newEnd,
          });
          toast.success("Schedule updated");
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Failed to update schedule");
        }
      }

      setDragState(null);
      setDragDelta(0);
    }

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [dragState, cellWidth, updateSchedule]);

  // ── Month headers ─────────────────────────────────────────────────────
  const monthHeaders = useMemo(() => {
    if (filters.zoom === "day") return null;
    const headers: { label: string; startIdx: number; span: number }[] = [];
    let currentMonth = -1;
    let currentStart = 0;

    days.forEach((day, i) => {
      const month = day.getMonth();
      if (month !== currentMonth) {
        if (currentMonth !== -1) {
          headers.push({
            label: days[currentStart].toLocaleDateString("en-US", { month: "short", year: "numeric" }),
            startIdx: currentStart,
            span: i - currentStart,
          });
        }
        currentMonth = month;
        currentStart = i;
      }
    });
    if (days.length > 0) {
      headers.push({
        label: days[currentStart].toLocaleDateString("en-US", { month: "short", year: "numeric" }),
        startIdx: currentStart,
        span: days.length - currentStart,
      });
    }
    return headers;
  }, [days, filters.zoom]);

  // ── Derived ────────────────────────────────────────────────────────────
  const timelineWidth = days.length * cellWidth;
  const timelineHeight = ROW_HEIGHT + sortedWOs.length * ROW_HEIGHT;

  // ── Aircraft types for filter ──────────────────────────────────────────
  const aircraftTypes = useMemo(() => {
    const set = new Set<string>();
    workOrders.forEach((wo) => {
      if (wo.aircraft) set.add(`${wo.aircraft.make} ${wo.aircraft.model}`);
    });
    return Array.from(set).sort();
  }, [workOrders]);

  function scrollToToday() {
    if (scrollRef.current && todayIndex >= 0) {
      scrollRef.current.scrollLeft = Math.max(0, todayIndex * cellWidth - 200);
    }
  }

  // ── Empty state ────────────────────────────────────────────────────────
  if (workOrders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 py-20">
        <CalendarDays className="w-12 h-12 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">No work orders to display.</p>
        <Button asChild size="sm">
          <Link to="/work-orders/new">
            <Plus className="w-4 h-4" />
            New Work Order
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full select-none">
      {/* Filter bar */}
      <GanttFilterBar
        filters={filters}
        onFiltersChange={setFilters}
        aircraftTypes={aircraftTypes}
      />

      {/* Toolbar */}
      <div className="flex items-center gap-2 px-2 sm:px-4 py-1.5 border-b border-border/50 bg-background/80 backdrop-blur-sm flex-shrink-0">
        <span className="text-xs text-muted-foreground">
          {scheduledWOs.length} scheduled
        </span>

        <div className="flex-1" />

        {unscheduledCount > 0 && (
          <button
            className="flex items-center gap-1.5 text-xs font-medium text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-800 rounded-md px-2.5 py-1 hover:bg-amber-200 dark:hover:bg-amber-900/50 transition-colors"
            onClick={onOpenBacklog}
          >
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-white text-[10px] font-bold">
              {unscheduledCount}
            </span>
            unscheduled
          </button>
        )}

        <Button variant="outline" size="sm" onClick={scrollToToday} className="text-xs h-7">
          <CalendarDays className="w-3.5 h-3.5" />
          Today
        </Button>
      </div>

      {/* Gantt area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className="flex-shrink-0 overflow-hidden" style={{ width: 200 }}>
          <GanttSidebar
            workOrders={sortedWOs as WorkOrderRow[]}
            rowHeight={ROW_HEIGHT}
            onWOClick={(id) => navigate(`/work-orders/${id}`)}
          />
        </div>

        {/* Timeline */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-auto"
          onScroll={handleTimelineScroll}
        >
          <div className="relative" style={{ width: timelineWidth, minHeight: timelineHeight }}>
            {/* Today marker */}
            {todayIndex >= 0 && (
              <div
                className="absolute top-0 bottom-0 z-30 pointer-events-none"
                style={{
                  left: todayIndex * cellWidth + cellWidth / 2,
                  width: 2,
                  background: "repeating-linear-gradient(to bottom, #ef4444 0px, #ef4444 4px, transparent 4px, transparent 8px)",
                }}
              />
            )}

            {/* Header row */}
            <div className="flex border-b border-border/40 bg-muted/30 sticky top-0 z-10" style={{ height: ROW_HEIGHT }}>
              {filters.zoom === "day"
                ? days.map((day, i) => {
                    const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                    const isToday = day.toDateString() === today.toDateString();
                    return (
                      <div
                        key={i}
                        className={`flex flex-col items-center justify-center flex-shrink-0 border-r border-border/20 ${
                          isToday
                            ? "bg-primary/10 font-bold text-primary"
                            : isWeekend
                              ? "bg-muted/20 text-muted-foreground/50"
                              : "text-muted-foreground"
                        }`}
                        style={{ width: cellWidth }}
                      >
                        <span className="text-[10px] leading-none">{day.getDate()}</span>
                        {cellWidth >= 30 && (
                          <span className="text-[9px] leading-none mt-0.5">{DAY_NAMES[day.getDay()]}</span>
                        )}
                      </div>
                    );
                  })
                : monthHeaders?.map((mh) => (
                    <div
                      key={mh.startIdx}
                      className="flex items-center justify-center flex-shrink-0 border-r border-border/30 text-[10px] text-muted-foreground font-medium"
                      style={{ width: mh.span * cellWidth }}
                    >
                      {mh.label}
                    </div>
                  ))}
            </div>

            {/* Dependency arrows */}
            <GanttDependencyArrows
              dependencies={dependencies}
              taskPositions={taskPositionsMap}
              containerWidth={timelineWidth}
              containerHeight={timelineHeight}
              criticalTaskIds={criticalPathIds}
            />

            {/* WO rows */}
            {woPositions.map(({ wo, startDayIdx, endDayIdx }) => {
              const barLeft = startDayIdx * cellWidth;
              const barWidth = Math.max(cellWidth, (endDayIdx - startDayIdx) * cellWidth);
              const barTop = (ROW_HEIGHT - BAR_HEIGHT) / 2;
              const colorClass = getBarColorClasses(wo);
              const isDragging = dragState?.woId === wo._id;
              const isHovered = hoveredWO === wo._id;

              const pct =
                wo.effectiveEstimatedHours > 0
                  ? Math.round((wo.completedHours / wo.effectiveEstimatedHours) * 100)
                  : 0;

              return (
                <div
                  key={wo._id}
                  className="relative border-b border-border/30"
                  style={{ height: ROW_HEIGHT, width: timelineWidth }}
                >
                  {/* Weekend shading (day view) */}
                  {filters.zoom === "day" &&
                    days.map((day, i) => {
                      if (day.getDay() !== 0 && day.getDay() !== 6) return null;
                      return (
                        <div
                          key={i}
                          className="absolute top-0 bottom-0 bg-muted/10 pointer-events-none"
                          style={{ left: i * cellWidth, width: cellWidth }}
                        />
                      );
                    })}

                  {/* WO bar */}
                  <div
                    className={`absolute rounded-md border flex items-center overflow-hidden text-[11px] font-medium transition-shadow ${colorClass} ${
                      isDragging ? "opacity-80 shadow-lg z-30" : "hover:shadow-md cursor-grab"
                    }`}
                    style={{
                      left: barLeft + (isDragging && dragState?.type === "move" ? dragDelta : 0),
                      width: barWidth + (isDragging && dragState?.type === "resize" ? dragDelta : 0),
                      top: barTop,
                      height: BAR_HEIGHT,
                    }}
                    onMouseDown={(e) => handleMouseDown(e, wo, "move")}
                    onDoubleClick={() => navigate(`/work-orders/${wo._id}`)}
                    onMouseEnter={() => setHoveredWO(wo._id)}
                    onMouseLeave={() => setHoveredWO(null)}
                  >
                    {/* Progress fill */}
                    <GanttProgressBar progress={pct} barWidth={barWidth} />

                    {/* Label */}
                    <div className="relative z-10 flex items-center gap-1.5 px-2 min-w-0 flex-1">
                      <span className="font-semibold truncate font-mono">{wo.workOrderNumber}</span>
                      {wo.aircraft?.currentRegistration && barWidth > 140 && (
                        <span className="text-[10px] opacity-80 truncate">{wo.aircraft.currentRegistration}</span>
                      )}
                    </div>

                    {/* Resize handle */}
                    <div
                      className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-white/20"
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        handleMouseDown(e, wo, "resize");
                      }}
                    />

                    {/* Tooltip */}
                    {isHovered && !isDragging && <WOTooltip wo={wo} />}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
