"use client";

import { useState, useRef, useMemo, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  CalendarDays,
  Plus,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// LOCAL TYPE: WorkOrderWithRisk
// Mirrors the return shape of convex/workOrders.ts getWorkOrdersWithScheduleRisk
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

// ─────────────────────────────────────────────────────────────────────────────
// PROPS
// ─────────────────────────────────────────────────────────────────────────────

interface GanttBoardProps {
  workOrders: WorkOrderWithRisk[];
  onOpenBacklog: () => void;
  unscheduledCount: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

const ZOOM_LEVELS = [20, 30, 40, 60, 80, 120, 180] as const;
const ROW_HEIGHT = 48; // px
const BAR_HEIGHT = 28; // px
const LABEL_WIDTH = 160; // px
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

type ViewMode = "wo_timeline" | "tech_view";

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function msToDay(ms: number): number {
  return Math.floor(ms / (24 * 60 * 60 * 1000));
}

function getBarColor(wo: WorkOrderWithRisk): string {
  if (wo.priority === "aog") {
    return "bg-red-600/80 border border-red-500 text-white";
  }
  if (wo.priority === "urgent") {
    return "bg-orange-500/70 border border-orange-400 text-white";
  }
  if (wo.riskLevel === "overdue") {
    return "bg-red-400/60 border border-red-500 text-white";
  }
  if (wo.riskLevel === "at_risk") {
    return "bg-amber-500/60 border border-amber-400 text-foreground";
  }
  if (wo.riskLevel === "on_track") {
    return "bg-sky-500/60 border border-sky-400 text-white";
  }
  return "bg-slate-600/70 border border-slate-500 text-muted-foreground";
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export function GanttBoard({ workOrders, onOpenBacklog, unscheduledCount }: GanttBoardProps) {
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);

  const [cellWidth, setCellWidth] = useState<number>(40);
  const [viewMode, setViewMode] = useState<ViewMode>("wo_timeline");

  // ── Today ──────────────────────────────────────────────────────────────────
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  // ── Date range ─────────────────────────────────────────────────────────────
  const days = useMemo(() => {
    // Default: 30 days before today to 60 days after
    let rangeStartMs = today.getTime() - 30 * 24 * 60 * 60 * 1000;
    let rangeEndMs = today.getTime() + 60 * 24 * 60 * 60 * 1000;

    // Expand to cover all WO dates
    for (const wo of workOrders) {
      const startMs = wo.scheduledStartDate ?? wo.openedAt;
      const endMs = wo.promisedDeliveryDate ?? startMs + 30 * 24 * 60 * 60 * 1000;
      if (startMs < rangeStartMs) rangeStartMs = startMs;
      if (endMs > rangeEndMs) rangeEndMs = endMs;
    }

    // Normalize to midnight
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
  }, [today, workOrders]);

  // ── Pre-computed WO bar positions ─────────────────────────────────────────
  const rangeStartDay = useMemo(() => msToDay(days[0]?.getTime() ?? 0), [days]);

  const woPositions = useMemo(() => {
    return workOrders.map((wo) => {
      const startMs = wo.scheduledStartDate ?? wo.openedAt;
      const endMs =
        wo.promisedDeliveryDate ?? startMs + 30 * 24 * 60 * 60 * 1000;

      const startDayIdx = msToDay(startMs) - rangeStartDay;
      const endDayIdx = msToDay(endMs) - rangeStartDay;
      const maxDayIdx = days.length - 1;

      const clampedStart = Math.max(0, Math.min(startDayIdx, maxDayIdx));
      const clampedEnd = Math.max(clampedStart, Math.min(endDayIdx, maxDayIdx));

      return {
        wo,
        startDayIdx: clampedStart,
        endDayIdx: clampedEnd,
      };
    });
  }, [workOrders, rangeStartDay, days.length]);

  // ── Today column index ─────────────────────────────────────────────────────
  const todayIndex = useMemo(
    () => days.findIndex((d) => d.toDateString() === today.toDateString()),
    [days, today],
  );

  // ── Auto-scroll to today on mount / cellWidth change ──────────────────────
  useEffect(() => {
    if (scrollRef.current && todayIndex >= 0) {
      const scrollX = Math.max(0, todayIndex * cellWidth - 120);
      scrollRef.current.scrollLeft = scrollX;
    }
  }, [todayIndex, cellWidth]);

  // ── Zoom helpers ───────────────────────────────────────────────────────────
  function zoomIn() {
    const idx = ZOOM_LEVELS.indexOf(cellWidth as (typeof ZOOM_LEVELS)[number]);
    if (idx < ZOOM_LEVELS.length - 1) {
      setCellWidth(ZOOM_LEVELS[idx + 1]);
    } else if (idx === -1) {
      // Not in list — find next larger
      const next = ZOOM_LEVELS.find((z) => z > cellWidth);
      if (next !== undefined) setCellWidth(next);
    }
  }

  function zoomOut() {
    const idx = ZOOM_LEVELS.indexOf(cellWidth as (typeof ZOOM_LEVELS)[number]);
    if (idx > 0) {
      setCellWidth(ZOOM_LEVELS[idx - 1]);
    } else if (idx === -1) {
      // Not in list — find next smaller
      const prev = [...ZOOM_LEVELS].reverse().find((z) => z < cellWidth);
      if (prev !== undefined) setCellWidth(prev);
    }
  }

  function scrollToToday() {
    if (scrollRef.current && todayIndex >= 0) {
      const scrollX = Math.max(0, todayIndex * cellWidth - 120);
      scrollRef.current.scrollLeft = scrollX;
    }
  }

  // ── Date range label ───────────────────────────────────────────────────────
  const dateRangeLabel = useMemo(() => {
    if (days.length === 0) return "";
    const first = days[0];
    const last = days[days.length - 1];
    const fmt = (d: Date) =>
      d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    return `${fmt(first)} – ${fmt(last)}`;
  }, [days]);

  // ── Total timeline width ───────────────────────────────────────────────────
  const timelineWidth = days.length * cellWidth;

  // ── Empty state ────────────────────────────────────────────────────────────
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
    <div className="flex flex-col h-full">
      {/* ── Toolbar ──────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2 px-2 sm:px-4 py-2.5 border-b border-border/50 bg-background/80 backdrop-blur-sm flex-shrink-0">
        {/* View mode toggles */}
        <div className="flex items-center rounded-md border border-border/60 overflow-hidden">
          <button
            className={`px-3 py-1.5 text-xs font-medium transition-colors ${
              viewMode === "wo_timeline"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted/50"
            }`}
            onClick={() => setViewMode("wo_timeline")}
          >
            WO Timeline
          </button>
          <button
            className={`px-3 py-1.5 text-xs font-medium transition-colors border-l border-border/60 ${
              viewMode === "tech_view"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted/50"
            }`}
            onClick={() => setViewMode("tech_view")}
          >
            Tech View
          </button>
        </div>

        <div className="w-px h-5 bg-border/50 mx-1" />

        {/* Date range */}
        <span className="text-xs text-muted-foreground hidden md:block">
          {dateRangeLabel}
        </span>

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

        <div className="w-px h-5 bg-border/50 mx-1" />

        {/* Zoom controls */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={zoomOut}
            disabled={cellWidth <= ZOOM_LEVELS[0]}
            aria-label="Zoom out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </Button>
          <span className="text-[11px] text-muted-foreground w-14 text-center tabular-nums">
            {cellWidth}px/d
          </span>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={zoomIn}
            disabled={cellWidth >= ZOOM_LEVELS[ZOOM_LEVELS.length - 1]}
            aria-label="Zoom in"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </Button>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={scrollToToday}
          className="text-xs h-7"
        >
          <CalendarDays className="w-3.5 h-3.5" />
          Today
        </Button>
      </div>

      {/* ── Tech View placeholder ─────────────────────────────────────────── */}
      {viewMode === "tech_view" && (
        <div className="flex flex-col items-center justify-center flex-1 gap-3 py-20 px-8 text-center">
          <p className="text-sm text-muted-foreground max-w-md">
            Technician workload view — assign task cards to technicians on their
            task cards to populate this view.
          </p>
          <Button asChild variant="outline" size="sm">
            <Link to="/personnel">Go to Personnel</Link>
          </Button>
        </div>
      )}

      {/* ── WO Timeline ──────────────────────────────────────────────────── */}
      {viewMode === "wo_timeline" && (
        <div className="flex flex-1 overflow-hidden">
          {/* Left sticky labels */}
          <div
            className="flex-shrink-0 bg-background border-r border-border/40 z-10"
            style={{ width: LABEL_WIDTH }}
          >
            {/* Header placeholder */}
            <div
              className="border-b border-border/40 bg-muted/30 flex items-center px-3"
              style={{ height: ROW_HEIGHT }}
            >
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                Aircraft / WO
              </span>
            </div>
            {/* Row labels */}
            {woPositions.map(({ wo }) => (
              <div
                key={wo._id}
                className="flex flex-col justify-center px-3 border-b border-border/30 hover:bg-muted/20 transition-colors cursor-pointer"
                style={{ height: ROW_HEIGHT }}
                onClick={() => navigate(`/work-orders/${wo._id}`)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    navigate(`/work-orders/${wo._id}`);
                  }
                }}
              >
                {wo.aircraft ? (
                  <span className="text-[11px] font-semibold text-foreground truncate">
                    {wo.aircraft.currentRegistration}
                  </span>
                ) : null}
                <span className="text-[10px] font-mono text-muted-foreground truncate">
                  {wo.workOrderNumber}
                </span>
              </div>
            ))}
          </div>

          {/* Right scrollable timeline */}
          <div
            ref={scrollRef}
            className="flex-1 overflow-x-auto overflow-y-hidden"
          >
            <div className="relative" style={{ width: timelineWidth }}>
              {/* Today indicator */}
              {todayIndex >= 0 && (
                <div
                  className="absolute top-0 bottom-0 bg-primary/60 z-20 pointer-events-none"
                  style={{
                    left: todayIndex * cellWidth + cellWidth / 2,
                    width: 1,
                  }}
                />
              )}

              {/* Header row — day cells */}
              <div
                className="flex border-b border-border/40 bg-muted/30 sticky top-0 z-10"
                style={{ height: ROW_HEIGHT }}
              >
                {days.map((day, i) => {
                  const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                  const isToday = day.toDateString() === today.toDateString();
                  return (
                    <div
                      key={i}
                      className={`flex flex-col items-center justify-center flex-shrink-0 border-r border-border/20 select-none ${
                        isToday
                          ? "bg-primary/10 font-bold text-primary"
                          : isWeekend
                            ? "bg-muted/20 text-muted-foreground/50"
                            : "text-muted-foreground"
                      }`}
                      style={{ width: cellWidth }}
                    >
                      {cellWidth >= 30 && (
                        <>
                          <span className="text-[10px] leading-none">
                            {day.getDate()}
                          </span>
                          {cellWidth >= 40 && (
                            <span className="text-[9px] leading-none mt-0.5">
                              {DAY_NAMES[day.getDay()]}
                            </span>
                          )}
                        </>
                      )}
                      {cellWidth < 30 && (
                        <span className="text-[9px] leading-none">
                          {day.getDate()}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* WO rows */}
              {woPositions.map(({ wo, startDayIdx, endDayIdx }) => {
                const barLeft = startDayIdx * cellWidth;
                const barWidth = Math.max(
                  cellWidth,
                  (endDayIdx - startDayIdx) * cellWidth,
                );
                const barTop = (ROW_HEIGHT - BAR_HEIGHT) / 2;
                const colorClass = getBarColor(wo);

                return (
                  <div
                    key={wo._id}
                    className="relative border-b border-border/30"
                    style={{ height: ROW_HEIGHT, width: timelineWidth }}
                  >
                    {/* Weekend column shading */}
                    {days.map((day, i) => {
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
                      className={`absolute rounded flex items-center px-1.5 cursor-pointer overflow-hidden text-[11px] font-medium transition-opacity hover:opacity-90 ${colorClass}`}
                      style={{
                        left: barLeft,
                        width: barWidth,
                        top: barTop,
                        height: BAR_HEIGHT,
                      }}
                      onClick={() => navigate(`/work-orders/${wo._id}`)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          navigate(`/work-orders/${wo._id}`);
                        }
                      }}
                      title={`${wo.workOrderNumber} — ${wo.description}`}
                    >
                      <span className="truncate">
                        {wo.workOrderNumber}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
