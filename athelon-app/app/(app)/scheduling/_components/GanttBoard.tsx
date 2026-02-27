"use client";

import { useState, useRef, useMemo, useEffect, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  CalendarDays,
  Plus,
  AlertTriangle,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

type WorkOrderWithRisk = {
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

type Bay = {
  _id: string;
  name: string;
  type: string;
  status: string;
};

interface GanttBoardProps {
  workOrders: WorkOrderWithRisk[];
  onOpenBacklog: () => void;
  unscheduledCount: number;
  bays?: Bay[];
  conflicts?: { type: string; severity: string; message: string; woIds: string[] }[];
}

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

const ROW_HEIGHT = 52;
const BAR_HEIGHT = 32;
const LABEL_WIDTH = 170;
const DAY_MS = 24 * 60 * 60 * 1000;
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

type ViewMode = "day" | "week" | "month";

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

function getBarColor(wo: WorkOrderWithRisk): string {
  if (wo.status === "closed") return "bg-slate-400/50 border border-slate-400 text-slate-300";
  if (wo.priority === "aog") return "bg-red-600/80 border border-red-500 text-white";
  if (wo.priority === "urgent") return "bg-orange-500/70 border border-orange-400 text-white";
  if (wo.riskLevel === "overdue") return "bg-red-400/60 border border-red-500 text-white";
  if (wo.riskLevel === "at_risk") return "bg-amber-500/60 border border-amber-400 text-foreground";
  if (wo.riskLevel === "on_track") return "bg-sky-500/60 border border-sky-400 text-white";
  return "bg-slate-600/70 border border-slate-500 text-muted-foreground";
}

function getStatusLabel(status: string): string {
  return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export function GanttBoard({
  workOrders,
  onOpenBacklog,
  unscheduledCount,
  bays,
  conflicts,
}: GanttBoardProps) {
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);
  const updateSchedule = useMutation(api.scheduling.updateWOSchedule);

  const [viewMode, setViewMode] = useState<ViewMode>("day");
  const [showConflicts, setShowConflicts] = useState(true);

  const cellWidth = VIEW_CELL_WIDTHS[viewMode];

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

  // ── Only scheduled WOs ─────────────────────────────────────────────────
  const scheduledWOs = useMemo(
    () => workOrders.filter((wo) => wo.scheduledStartDate && wo.promisedDeliveryDate),
    [workOrders],
  );

  // ── Date range ─────────────────────────────────────────────────────────
  const days = useMemo(() => {
    let rangeStartMs = today.getTime() - 30 * DAY_MS;
    let rangeEndMs = today.getTime() + 60 * DAY_MS;

    for (const wo of scheduledWOs) {
      const startMs = wo.scheduledStartDate!;
      const endMs = wo.promisedDeliveryDate!;
      if (startMs < rangeStartMs) rangeStartMs = startMs;
      if (endMs > rangeEndMs) rangeEndMs = endMs;
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

  // ── Conflict WO ids ────────────────────────────────────────────────────
  const conflictWoIds = useMemo(() => {
    const set = new Set<string>();
    for (const c of conflicts ?? []) {
      for (const id of c.woIds) set.add(id);
    }
    return set;
  }, [conflicts]);

  // ── Bar positions ──────────────────────────────────────────────────────
  // Use bays as row groups if available, otherwise use WO list
  const rows = useMemo(() => {
    if (bays && bays.length > 0) {
      return bays.map((bay) => ({
        id: bay._id,
        label: bay.name,
        sublabel: bay.type,
        wos: scheduledWOs.filter(() => true), // all WOs shown; bay assignment TBD
      }));
    }
    return scheduledWOs.map((wo) => ({
      id: wo._id,
      label: wo.aircraft?.currentRegistration ?? wo.workOrderNumber,
      sublabel: wo.workOrderNumber,
      wos: [wo],
    }));
  }, [bays, scheduledWOs]);

  const woPositions = useMemo(() => {
    return scheduledWOs.map((wo) => {
      let startMs = wo.scheduledStartDate!;
      let endMs = wo.promisedDeliveryDate!;

      // Apply drag delta
      if (dragState && dragState.woId === wo._id) {
        const daysDelta = Math.round(dragDelta / cellWidth);
        if (dragState.type === "move") {
          startMs = dragState.origStartDate + daysDelta * DAY_MS;
          endMs = dragState.origEndDate + daysDelta * DAY_MS;
        } else {
          endMs = Math.max(
            dragState.origStartDate + DAY_MS,
            dragState.origEndDate + daysDelta * DAY_MS,
          );
        }
      }

      const startDayIdx = msToDay(startMs) - rangeStartDay;
      const endDayIdx = msToDay(endMs) - rangeStartDay;
      const maxDayIdx = days.length - 1;

      return {
        wo,
        startDayIdx: Math.max(0, Math.min(startDayIdx, maxDayIdx)),
        endDayIdx: Math.max(0, Math.min(endDayIdx, maxDayIdx)),
        isConflict: conflictWoIds.has(wo._id),
      };
    });
  }, [scheduledWOs, rangeStartDay, days.length, dragState, dragDelta, cellWidth, conflictWoIds]);

  // ── Today column ───────────────────────────────────────────────────────
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
          newEnd = Math.max(
            dragState!.origStartDate + DAY_MS,
            dragState!.origEndDate + daysDelta * DAY_MS,
          );
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

  // ── Zoom / scroll helpers ──────────────────────────────────────────────
  function scrollToToday() {
    if (scrollRef.current && todayIndex >= 0) {
      scrollRef.current.scrollLeft = Math.max(0, todayIndex * cellWidth - 200);
    }
  }

  const dateRangeLabel = useMemo(() => {
    if (days.length === 0) return "";
    const fmt = (d: Date) =>
      d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    return `${fmt(days[0])} – ${fmt(days[days.length - 1])}`;
  }, [days]);

  const timelineWidth = days.length * cellWidth;

  // ── Month headers (for week/month views) ───────────────────────────────
  const monthHeaders = useMemo(() => {
    if (viewMode === "day") return null;
    const headers: { label: string; startIdx: number; span: number }[] = [];
    let currentMonth = -1;
    let currentStart = 0;

    days.forEach((day, i) => {
      const month = day.getMonth();
      if (month !== currentMonth) {
        if (currentMonth !== -1) {
          headers.push({
            label: days[currentStart].toLocaleDateString("en-US", {
              month: "short",
              year: "numeric",
            }),
            startIdx: currentStart,
            span: i - currentStart,
          });
        }
        currentMonth = month;
        currentStart = i;
      }
    });
    // last group
    if (days.length > 0) {
      headers.push({
        label: days[currentStart].toLocaleDateString("en-US", {
          month: "short",
          year: "numeric",
        }),
        startIdx: currentStart,
        span: days.length - currentStart,
      });
    }
    return headers;
  }, [days, viewMode]);

  // ── Empty state ────────────────────────────────────────────────────────
  if (workOrders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 py-20">
        <CalendarDays className="w-12 h-12 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">
          No open work orders to display on the Gantt.
        </p>
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
      {/* ── Toolbar ──────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2 px-2 sm:px-4 py-2 border-b border-border/50 bg-background/80 backdrop-blur-sm flex-shrink-0">
        {/* View mode toggles */}
        <div className="flex items-center rounded-md border border-border/60 overflow-hidden">
          {(["day", "week", "month"] as ViewMode[]).map((mode) => (
            <button
              key={mode}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                viewMode === mode
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted/50"
              } ${mode !== "day" ? "border-l border-border/60" : ""}`}
              onClick={() => setViewMode(mode)}
            >
              {mode.charAt(0).toUpperCase() + mode.slice(1)}
            </button>
          ))}
        </div>

        <div className="w-px h-5 bg-border/50 mx-1" />

        <span className="text-xs text-muted-foreground hidden md:block">{dateRangeLabel}</span>

        <div className="flex-1" />

        {/* Unscheduled badge */}
        {unscheduledCount > 0 && (
          <button
            className="flex items-center gap-1.5 text-xs font-medium text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-800 rounded-md px-2.5 py-1.5 hover:bg-amber-200 dark:hover:bg-amber-900/50 transition-colors"
            onClick={onOpenBacklog}
          >
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-white text-[10px] font-bold">
              {unscheduledCount}
            </span>
            unscheduled
          </button>
        )}

        {/* Conflict toggle */}
        {conflicts && conflicts.length > 0 && (
          <button
            className={`flex items-center gap-1.5 text-xs font-medium rounded-md px-2.5 py-1.5 border transition-colors ${
              showConflicts
                ? "text-red-700 dark:text-red-400 bg-red-100 dark:bg-red-950/50 border-red-300 dark:border-red-800"
                : "text-muted-foreground bg-muted/30 border-border/50"
            }`}
            onClick={() => setShowConflicts(!showConflicts)}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            {conflicts.length} conflicts
          </button>
        )}

        <Button variant="outline" size="sm" onClick={scrollToToday} className="text-xs h-7">
          <CalendarDays className="w-3.5 h-3.5" />
          Today
        </Button>
      </div>

      {/* ── Conflict warnings banner ──────────────────────────────────────── */}
      {showConflicts && conflicts && conflicts.length > 0 && (
        <div className="border-b border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/30 px-4 py-2 flex-shrink-0 overflow-y-auto max-h-32">
          {conflicts.map((c, i) => (
            <div
              key={i}
              className={`flex items-start gap-2 text-xs py-0.5 ${
                c.severity === "error" ? "text-red-700 dark:text-red-400" : "text-amber-700 dark:text-amber-400"
              }`}
            >
              <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
              <span>{c.message}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── Gantt chart ──────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left sticky labels */}
        <div
          className="flex-shrink-0 bg-background border-r border-border/40 z-10 overflow-y-auto"
          style={{ width: LABEL_WIDTH }}
        >
          <div
            className="border-b border-border/40 bg-muted/30 flex items-center px-3 sticky top-0"
            style={{ height: ROW_HEIGHT }}
          >
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
              {bays && bays.length > 0 ? "Bay" : "Aircraft / WO"}
            </span>
          </div>
          {(bays && bays.length > 0 ? rows : woPositions.map(({ wo }) => ({
            id: wo._id,
            label: wo.aircraft?.currentRegistration ?? "",
            sublabel: wo.workOrderNumber,
          }))).map((row) => (
            <div
              key={row.id}
              className="flex flex-col justify-center px-3 border-b border-border/30 hover:bg-muted/20 transition-colors cursor-pointer"
              style={{ height: ROW_HEIGHT }}
              onClick={() => {
                if (!bays || bays.length === 0) navigate(`/work-orders/${row.id}`);
              }}
            >
              <span className="text-[11px] font-semibold text-foreground truncate">
                {row.label}
              </span>
              <span className="text-[10px] font-mono text-muted-foreground truncate">
                {row.sublabel}
              </span>
            </div>
          ))}
        </div>

        {/* Right scrollable timeline */}
        <div ref={scrollRef} className="flex-1 overflow-auto">
          <div className="relative" style={{ width: timelineWidth, minHeight: "100%" }}>
            {/* Today vertical line — red dashed */}
            {todayIndex >= 0 && (
              <div
                className="absolute top-0 bottom-0 z-20 pointer-events-none"
                style={{
                  left: todayIndex * cellWidth + cellWidth / 2,
                  width: 2,
                  background:
                    "repeating-linear-gradient(to bottom, #ef4444 0px, #ef4444 4px, transparent 4px, transparent 8px)",
                }}
              />
            )}

            {/* Header row */}
            <div
              className="flex border-b border-border/40 bg-muted/30 sticky top-0 z-10"
              style={{ height: ROW_HEIGHT }}
            >
              {viewMode === "day"
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
                          <span className="text-[9px] leading-none mt-0.5">
                            {DAY_NAMES[day.getDay()]}
                          </span>
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

            {/* WO rows */}
            {woPositions.map(({ wo, startDayIdx, endDayIdx, isConflict }) => {
              const barLeft = startDayIdx * cellWidth;
              const barWidth = Math.max(cellWidth, (endDayIdx - startDayIdx) * cellWidth);
              const barTop = (ROW_HEIGHT - BAR_HEIGHT) / 2;
              const colorClass = isConflict
                ? "bg-red-500/70 border-2 border-red-400 text-white ring-2 ring-red-400/50"
                : getBarColor(wo);
              const isDragging = dragState?.woId === wo._id;

              return (
                <div
                  key={wo._id}
                  className="relative border-b border-border/30"
                  style={{ height: ROW_HEIGHT, width: timelineWidth }}
                >
                  {/* Weekend column shading (day view only) */}
                  {viewMode === "day" &&
                    days.map((day, i) => {
                      const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                      if (!isWeekend) return null;
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
                    className={`absolute rounded-md flex items-center overflow-hidden text-[11px] font-medium transition-shadow ${colorClass} ${
                      isDragging ? "opacity-80 shadow-lg z-30" : "hover:shadow-md cursor-grab"
                    }`}
                    style={{
                      left: barLeft + (isDragging && dragState?.type === "move" ? dragDelta : 0),
                      width:
                        barWidth +
                        (isDragging && dragState?.type === "resize" ? dragDelta : 0),
                      top: barTop,
                      height: BAR_HEIGHT,
                    }}
                    onMouseDown={(e) => handleMouseDown(e, wo, "move")}
                    onDoubleClick={() => navigate(`/work-orders/${wo._id}`)}
                    title={`${wo.workOrderNumber} — ${wo.aircraft?.currentRegistration ?? ""} — ${wo.description}`}
                  >
                    {/* Bar content */}
                    <div className="flex items-center gap-1.5 px-2 min-w-0 flex-1">
                      <span className="font-semibold truncate">{wo.workOrderNumber}</span>
                      {wo.aircraft?.currentRegistration && barWidth > 120 && (
                        <span className="text-[10px] opacity-80 truncate">
                          {wo.aircraft.currentRegistration}
                        </span>
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
