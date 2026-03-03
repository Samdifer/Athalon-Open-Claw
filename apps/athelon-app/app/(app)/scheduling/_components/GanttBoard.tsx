"use client";

import { useState, useRef, useMemo, useEffect, useCallback, type RefObject } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  CalendarDays,
  Plus,
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Archive,
  Ban,
  CheckCircle2,
  SlidersHorizontal,
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
  sourceQuoteId?: string;
  quoteNumber?: string | null;
  quoteStatus?: string | null;
  quoteTotal?: number | null;
};

type Bay = {
  _id: string;
  name: string;
  type: string;
  status: string;
};

type ScheduledPlannerProject = {
  assignmentId: string;
  workOrderId: string;
  workOrderNumber: string;
  workOrderStatus: string;
  priority: "routine" | "urgent" | "aog";
  description: string;
  scheduledStartDate: number;
  promisedDeliveryDate: number;
  hangarBayId: string;
  sourceQuoteId?: string;
  dailyEffort?: { dayOffset: number; effortHours: number }[];
  nonWorkDays?: number[];
  quoteNumber?: string | null;
  quoteStatus?: string | null;
  quoteTotal?: number | null;
  aircraft: { currentRegistration: string | undefined; make: string; model: string } | null;
  archivedAt?: number;
  isLocked: boolean;
};

interface GanttBoardProps {
  workOrders: WorkOrderWithRisk[];
  scheduledProjects: ScheduledPlannerProject[];
  onOpenBacklog: () => void;
  unscheduledCount: number;
  onScheduleChange: (args: {
    workOrderId: string;
    startDate: number;
    endDate: number;
    hangarBayId: string;
    sourceQuoteId?: string;
  }) => Promise<void>;
  bays?: Bay[];
  conflicts?: { type: string; severity: string; message: string; woIds: string[] }[];
  scrollRef?: RefObject<HTMLDivElement | null>;
  onTimelineScroll?: (scrollLeft: number) => void;
  onTimelineConfigChange?: (args: {
    timelineStartMs: number;
    totalDays: number;
    cellWidth: number;
    todayIndex: number;
  }) => void;
  onReorderBays?: (orderedBayIds: string[]) => Promise<void>;
  onArchiveAssignment?: (assignmentId: string) => Promise<void>;
  interactionMode?: "normal" | "distribute" | "block";
  magicSelectionMode?: boolean;
  selectedMagicWorkOrderIds?: string[];
  onToggleMagicWorkOrder?: (workOrderId: string) => void;
  onApplyDayModelEdit?: (args: {
    assignmentId: string;
    workOrderId: string;
    dayOffset: number;
    mode: "distribute" | "block";
    adjustment: 1 | -1;
  }) => Promise<void>;
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

type BacklogDropPayload = {
  workOrderId: string;
  sourceQuoteId?: string;
};

function parseBacklogPayload(raw: string): BacklogDropPayload | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed.workOrderId !== "string") return null;
    return {
      workOrderId: parsed.workOrderId,
      sourceQuoteId:
        typeof parsed.sourceQuoteId === "string" ? parsed.sourceQuoteId : undefined,
    };
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export function GanttBoard({
  workOrders,
  scheduledProjects,
  onOpenBacklog,
  unscheduledCount,
  onScheduleChange,
  bays,
  conflicts,
  scrollRef,
  onTimelineScroll,
  onTimelineConfigChange,
  onReorderBays,
  onArchiveAssignment,
  interactionMode = "normal",
  magicSelectionMode = false,
  selectedMagicWorkOrderIds = [],
  onToggleMagicWorkOrder,
  onApplyDayModelEdit,
}: GanttBoardProps) {
  const navigate = useNavigate();
  const internalScrollRef = useRef<HTMLDivElement>(null);
  const timelineScrollRef = scrollRef ?? internalScrollRef;
  const timelineCanvasRef = useRef<HTMLDivElement>(null);

  const [viewMode, setViewMode] = useState<ViewMode>("day");
  const [showConflicts, setShowConflicts] = useState(true);
  const isEditMode = interactionMode !== "normal";
  const dayEditMode: "distribute" | "block" =
    interactionMode === "normal" ? "distribute" : interactionMode;

  const cellWidth = VIEW_CELL_WIDTHS[viewMode];

  // ── Drag state ─────────────────────────────────────────────────────────
  const [dragState, setDragState] = useState<{
    workOrderId: string;
    hangarBayId: string;
    sourceQuoteId?: string;
    type: "move" | "resize";
    startX: number;
    origStartDate: number;
    origEndDate: number;
  } | null>(null);
  const [dragDelta, setDragDelta] = useState(0);
  const [dragHoverBayId, setDragHoverBayId] = useState<string | null>(null);
  const [laneDropTargetId, setLaneDropTargetId] = useState<string | null>(null);

  // ── Today ──────────────────────────────────────────────────────────────
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  // ── Date range ─────────────────────────────────────────────────────────
  const days = useMemo(() => {
    let rangeStartMs = today.getTime() - 30 * DAY_MS;
    let rangeEndMs = today.getTime() + 60 * DAY_MS;

    for (const project of scheduledProjects) {
      const startMs = project.scheduledStartDate;
      const endMs = project.promisedDeliveryDate;
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
  }, [today, scheduledProjects]);

  const rangeStartDay = useMemo(() => msToDay(days[0]?.getTime() ?? 0), [days]);

  // ── Conflict WO ids ────────────────────────────────────────────────────
  const conflictWoIds = useMemo(() => {
    const set = new Set<string>();
    for (const c of conflicts ?? []) {
      for (const id of c.woIds) set.add(id);
    }
    return set;
  }, [conflicts]);

  const workOrderMap = useMemo(
    () => new Map(workOrders.map((wo) => [wo._id, wo])),
    [workOrders],
  );

  // ── Row model ──────────────────────────────────────────────────────────
  const rows = useMemo(() => {
    if (bays && bays.length > 0) {
      return bays.map((bay) => ({
        id: bay._id,
        label: bay.name,
        sublabel: bay.type,
        wos: scheduledProjects.filter((wo) => wo.hangarBayId === bay._id),
      }));
    }
    return scheduledProjects.map((wo) => ({
      id: wo.workOrderId,
      label: wo.aircraft?.currentRegistration ?? wo.workOrderNumber,
      sublabel: wo.workOrderNumber,
      wos: [wo],
    }));
  }, [bays, scheduledProjects]);

  const getProjectPosition = useCallback(
    (wo: ScheduledPlannerProject) => {
      let startMs = wo.scheduledStartDate;
      let endMs = wo.promisedDeliveryDate;

      if (dragState && dragState.workOrderId === wo.workOrderId) {
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
        startMs,
        endMs,
        startDayIdx: Math.max(0, Math.min(startDayIdx, maxDayIdx)),
        endDayIdx: Math.max(0, Math.min(endDayIdx, maxDayIdx)),
      };
    },
    [dragState, dragDelta, cellWidth, rangeStartDay, days.length],
  );

  const resolveHoveredBayId = useCallback(
    (clientY: number): string | null => {
      if (!bays || bays.length === 0) return null;
      const canvas = timelineCanvasRef.current;
      if (!canvas) return null;
      const rect = canvas.getBoundingClientRect();
      const relativeY = clientY - rect.top - ROW_HEIGHT;
      if (relativeY < 0) return null;
      const rowIndex = Math.floor(relativeY / ROW_HEIGHT);
      if (rowIndex < 0 || rowIndex >= rows.length) return null;
      return rows[rowIndex]?.id ?? null;
    },
    [bays, rows],
  );

  // ── Today column ───────────────────────────────────────────────────────
  const todayIndex = useMemo(
    () => days.findIndex((d) => d.toDateString() === today.toDateString()),
    [days, today],
  );

  // ── Auto-scroll to today ──────────────────────────────────────────────
  useEffect(() => {
    if (timelineScrollRef.current && todayIndex >= 0) {
      timelineScrollRef.current.scrollLeft = Math.max(0, todayIndex * cellWidth - 200);
    }
  }, [todayIndex, cellWidth, timelineScrollRef]);

  // ── Drag handlers ─────────────────────────────────────────────────────
  const handlePointerDown = useCallback(
    (e: React.PointerEvent, wo: ScheduledPlannerProject, type: "move" | "resize") => {
      e.preventDefault();
      e.stopPropagation();
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
      setDragState({
        workOrderId: wo.workOrderId,
        hangarBayId: wo.hangarBayId,
        sourceQuoteId: wo.sourceQuoteId,
        type,
        startX: e.clientX,
        origStartDate: wo.scheduledStartDate,
        origEndDate: wo.promisedDeliveryDate,
      });
      setDragDelta(0);
      setDragHoverBayId(null);
    },
    [],
  );

  useEffect(() => {
    if (!dragState) return;
    if (isEditMode || magicSelectionMode) return;

    function handlePointerMove(e: PointerEvent) {
      setDragDelta(e.clientX - dragState!.startX);
      if (dragState?.type === "move") {
        setDragHoverBayId(resolveHoveredBayId(e.clientY));
      }
    }

    async function handlePointerUp(e: PointerEvent) {
      (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
      const delta = e.clientX - dragState!.startX;
      const daysDelta = Math.round(delta / cellWidth);
      const nextHangarBayId =
        dragState!.type === "move"
          ? dragHoverBayId ?? dragState!.hangarBayId
          : dragState!.hangarBayId;
      const didMoveAcrossBay = nextHangarBayId !== dragState!.hangarBayId;

      if (daysDelta !== 0 || didMoveAcrossBay) {
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
          await onScheduleChange({
            workOrderId: dragState!.workOrderId,
            startDate: newStart,
            endDate: newEnd,
            hangarBayId: nextHangarBayId,
            sourceQuoteId: dragState!.sourceQuoteId,
          });
          toast.success("Schedule updated");
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Failed to update schedule");
        }
      }

      setDragState(null);
      setDragDelta(0);
      setDragHoverBayId(null);
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [
    dragState,
    cellWidth,
    onScheduleChange,
    dragHoverBayId,
    resolveHoveredBayId,
    isEditMode,
    magicSelectionMode,
  ]);

  const moveBayRow = useCallback(
    async (bayId: string, direction: -1 | 1) => {
      if (isEditMode || magicSelectionMode) return;
      if (!onReorderBays || !bays || bays.length < 2) return;
      const ids = rows.map((row) => row.id);
      const currentIdx = ids.indexOf(bayId);
      if (currentIdx < 0) return;
      const nextIdx = currentIdx + direction;
      if (nextIdx < 0 || nextIdx >= ids.length) return;
      const next = [...ids];
      [next[currentIdx], next[nextIdx]] = [next[nextIdx], next[currentIdx]];
      try {
        await onReorderBays(next);
        toast.success("Bay order updated");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to reorder bays");
      }
    },
    [onReorderBays, bays, rows, isEditMode, magicSelectionMode],
  );

  // ── Zoom / scroll helpers ──────────────────────────────────────────────
  function scrollToToday() {
    if (timelineScrollRef.current && todayIndex >= 0) {
      timelineScrollRef.current.scrollLeft = Math.max(0, todayIndex * cellWidth - 200);
    }
  }

  const dateRangeLabel = useMemo(() => {
    if (days.length === 0) return "";
    const fmt = (d: Date) =>
      d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    return `${fmt(days[0])} – ${fmt(days[days.length - 1])}`;
  }, [days]);

  const timelineWidth = days.length * cellWidth;

  useEffect(() => {
    if (!onTimelineConfigChange || days.length === 0) return;
    onTimelineConfigChange({
      timelineStartMs: days[0].getTime(),
      totalDays: days.length,
      cellWidth,
      todayIndex,
    });
  }, [onTimelineConfigChange, days, cellWidth, todayIndex]);

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

      {isEditMode && (
        <div
          className={`px-4 py-1.5 border-b text-xs flex items-center justify-between ${
            dayEditMode === "distribute"
              ? "border-amber-500/40 bg-amber-500/10 text-amber-300"
              : "border-rose-500/40 bg-rose-500/10 text-rose-300"
          }`}
          data-testid="gantt-edit-mode-banner"
        >
          <span className="flex items-center gap-2">
            {dayEditMode === "distribute" ? (
              <>
                <SlidersHorizontal className="h-3.5 w-3.5" />
                Distribute mode: click a day slice to add 1.0h, shift-click to remove 1.0h.
              </>
            ) : (
              <>
                <Ban className="h-3.5 w-3.5" />
                Block mode: click a day slice to toggle non-work days.
              </>
            )}
          </span>
          <span className="text-[11px] opacity-80">Drag/resize is paused in edit mode.</span>
        </div>
      )}

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
          {rows.map((row) => (
            <div
              key={row.id}
              className={`border-b border-border/30 hover:bg-muted/20 transition-colors ${
                bays && bays.length > 0 ? "px-2" : "px-3 cursor-pointer"
              }`}
              style={{ height: ROW_HEIGHT }}
              data-testid={`gantt-row-label-${row.id}`}
              onClick={() => {
                if (!bays || bays.length === 0) navigate(`/work-orders/${row.id}`);
              }}
            >
              <div className="flex h-full items-center gap-2">
                <div className="min-w-0 flex-1">
                  <span className="text-[11px] font-semibold text-foreground truncate block">
                    {row.label}
                  </span>
                  <span className="text-[10px] font-mono text-muted-foreground truncate block">
                    {row.sublabel} {bays && row.wos.length > 0 ? `• ${row.wos.length} WO` : ""}
                  </span>
                </div>
                {bays && bays.length > 0 && (
                  <div className="flex flex-col gap-0.5">
                    <button
                      type="button"
                      className="h-4 w-4 rounded border border-border/60 text-muted-foreground hover:bg-muted/50 disabled:opacity-30"
                      disabled={isEditMode || magicSelectionMode}
                      onClick={(event) => {
                        event.stopPropagation();
                        void moveBayRow(row.id, -1);
                      }}
                      aria-label={`Move ${row.label} up`}
                      data-testid={`bay-row-up-${row.id}`}
                    >
                      <ArrowUp className="h-2.5 w-2.5 mx-auto" />
                    </button>
                    <button
                      type="button"
                      className="h-4 w-4 rounded border border-border/60 text-muted-foreground hover:bg-muted/50 disabled:opacity-30"
                      disabled={isEditMode || magicSelectionMode}
                      onClick={(event) => {
                        event.stopPropagation();
                        void moveBayRow(row.id, 1);
                      }}
                      aria-label={`Move ${row.label} down`}
                      data-testid={`bay-row-down-${row.id}`}
                    >
                      <ArrowDown className="h-2.5 w-2.5 mx-auto" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Right scrollable timeline */}
        <div
          ref={timelineScrollRef}
          className="flex-1 overflow-auto"
          onScroll={(e) => onTimelineScroll?.(e.currentTarget.scrollLeft)}
          data-testid="gantt-timeline-scroll"
        >
          <div
            ref={timelineCanvasRef}
            className="relative"
            style={{ width: timelineWidth, minHeight: "100%" }}
          >
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
            {rows.map((row) => (
              <div
                key={row.id}
                className={`relative border-b border-border/30 ${
                  laneDropTargetId === row.id ? "bg-primary/10" : ""
                } ${dragHoverBayId === row.id ? "ring-1 ring-inset ring-primary/50" : ""}`}
                style={{ height: ROW_HEIGHT, width: timelineWidth }}
                data-testid={`gantt-lane-${row.id}`}
                onDragOver={(event) => {
                  if (isEditMode || magicSelectionMode) return;
                  if (!bays || bays.length === 0) return;
                  const payload =
                    parseBacklogPayload(
                      event.dataTransfer.getData("application/x-athelon-work-order"),
                    ) ?? parseBacklogPayload(event.dataTransfer.getData("text/plain"));
                  if (!payload) return;
                  event.preventDefault();
                  event.dataTransfer.dropEffect = "move";
                  setLaneDropTargetId(row.id);
                }}
                onDragLeave={(event) => {
                  if (
                    event.relatedTarget instanceof Node &&
                    event.currentTarget.contains(event.relatedTarget)
                  ) {
                    return;
                  }
                  setLaneDropTargetId(null);
                }}
                onDrop={async (event) => {
                  if (isEditMode || magicSelectionMode) return;
                  if (!bays || bays.length === 0) return;
                  event.preventDefault();
                  setLaneDropTargetId(null);
                  const payload =
                    parseBacklogPayload(
                      event.dataTransfer.getData("application/x-athelon-work-order"),
                    ) ?? parseBacklogPayload(event.dataTransfer.getData("text/plain"));
                  if (!payload) {
                    toast.error("Invalid drop payload");
                    return;
                  }
                  const workOrder = workOrderMap.get(payload.workOrderId);
                  if (!workOrder) {
                    toast.error("Work order not found in backlog");
                    return;
                  }

                  const rect = event.currentTarget.getBoundingClientRect();
                  const relativeX = Math.max(0, event.clientX - rect.left);
                  const dayIndex = Math.max(
                    0,
                    Math.min(days.length - 1, Math.floor(relativeX / cellWidth)),
                  );
                  const startDate = days[dayIndex]?.getTime() ?? Date.now();
                  const durationDays = Math.max(
                    1,
                    Math.ceil(Math.max(1, workOrder.effectiveEstimatedHours || 1) / 8),
                  );
                  const endDate = startDate + durationDays * DAY_MS;

                  try {
                    await onScheduleChange({
                      workOrderId: payload.workOrderId,
                      startDate,
                      endDate,
                      hangarBayId: row.id,
                      sourceQuoteId: payload.sourceQuoteId ?? workOrder.sourceQuoteId,
                    });
                    toast.success("Work order scheduled");
                  } catch (err) {
                    toast.error(err instanceof Error ? err.message : "Failed to schedule work order");
                  }
                }}
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

                {row.wos.map((wo) => {
                  const { startDayIdx, endDayIdx } = getProjectPosition(wo);
                  const durationDays = Math.max(
                    1,
                    Math.ceil((wo.promisedDeliveryDate - wo.scheduledStartDate) / DAY_MS),
                  );
                  const barLeft = startDayIdx * cellWidth;
                  const barWidth = Math.max(cellWidth, (endDayIdx - startDayIdx) * cellWidth);
                  const barTop = (ROW_HEIGHT - BAR_HEIGHT) / 2;
                  const isConflict = conflictWoIds.has(wo.workOrderId);
                  const isMagicSelected = selectedMagicWorkOrderIds.includes(wo.workOrderId);
                  const interactionPaused = isEditMode || magicSelectionMode;
                  const mapped = workOrderMap.get(wo.workOrderId);
                  const dayEffortMap = new Map<number, number>(
                    (wo.dailyEffort ?? []).map((row) => [row.dayOffset, row.effortHours]),
                  );
                  const nonWorkDaySet = new Set<number>(
                    (wo.nonWorkDays ?? []).filter((offset) => offset >= 0 && offset < durationDays),
                  );
                  const maxDayEffort = Math.max(
                    0,
                    ...Array.from({ length: durationDays }, (_, offset) =>
                      nonWorkDaySet.has(offset) ? 0 : Math.max(0, dayEffortMap.get(offset) ?? 0),
                    ),
                  );
                  const colorClass = isConflict
                    ? "bg-red-500/70 border-2 border-red-400 text-white ring-2 ring-red-400/50"
                    : getBarColor(
                        mapped ?? {
                          _id: wo.workOrderId,
                          workOrderNumber: wo.workOrderNumber,
                          status: wo.workOrderStatus,
                          priority: wo.priority,
                          description: wo.description,
                          openedAt: 0,
                          promisedDeliveryDate: wo.promisedDeliveryDate,
                          scheduledStartDate: wo.scheduledStartDate,
                          taskCardEstimateTotal: 0,
                          effectiveEstimatedHours: 0,
                          completedHours: 0,
                          remainingHours: 0,
                          riskLevel: "on_track",
                          aircraft: wo.aircraft,
                        },
                      );
                  const isDragging = dragState?.workOrderId === wo.workOrderId;

                  return (
                    <div
                      key={`${row.id}-${wo.workOrderId}`}
                      className={`absolute rounded-md flex items-center overflow-hidden text-[11px] font-medium transition-shadow ${colorClass} ${
                        isDragging
                          ? "opacity-80 shadow-lg z-30"
                          : interactionPaused
                            ? "hover:shadow-md cursor-pointer"
                            : "hover:shadow-md cursor-grab"
                      } ${
                        isMagicSelected
                          ? "ring-2 ring-violet-300/90 ring-offset-1 ring-offset-background"
                          : ""
                      }`}
                      style={{
                        left: barLeft + (isDragging && dragState?.type === "move" ? dragDelta : 0),
                        width:
                          barWidth +
                          (isDragging && dragState?.type === "resize" ? dragDelta : 0),
                        top: barTop,
                        height: BAR_HEIGHT,
                        touchAction: "none",
                      }}
                      onPointerDown={(e) => {
                        if (interactionPaused) return;
                        handlePointerDown(e, wo, "move");
                      }}
                      onClick={(e) => {
                        if (!magicSelectionMode) return;
                        e.preventDefault();
                        e.stopPropagation();
                        onToggleMagicWorkOrder?.(wo.workOrderId);
                      }}
                      onDoubleClick={() => {
                        if (interactionPaused || magicSelectionMode) return;
                        navigate(`/work-orders/${wo.workOrderId}`);
                      }}
                      title={`${wo.workOrderNumber} — ${wo.aircraft?.currentRegistration ?? ""} — ${wo.description}${wo.quoteNumber ? ` — ${wo.quoteNumber}` : ""}`}
                      data-testid={`gantt-bar-${wo.assignmentId}`}
                      data-magic-selected={isMagicSelected ? "true" : "false"}
                    >
                      <div className="flex items-center gap-1.5 px-2 pr-6 min-w-0 flex-1">
                        <span className="font-semibold truncate">{wo.workOrderNumber}</span>
                        {wo.aircraft?.currentRegistration && barWidth > 120 && (
                          <span className="text-[10px] opacity-80 truncate">
                            {wo.aircraft.currentRegistration}
                          </span>
                        )}
                        {wo.quoteNumber && barWidth > 170 && (
                          <span className="text-[10px] opacity-90 truncate">
                            {wo.quoteNumber}
                          </span>
                        )}
                        {isMagicSelected && (
                          <span
                            className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-violet-500/80 text-white"
                            title="Selected for Magic Scheduler"
                          >
                            <CheckCircle2 className="h-3 w-3" />
                          </span>
                        )}
                      </div>

                      {onArchiveAssignment && !interactionPaused && (
                        <button
                          type="button"
                          className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 rounded border border-white/30 bg-black/20 text-white hover:bg-black/35 flex items-center justify-center"
                          aria-label={`Archive ${wo.workOrderNumber}`}
                          data-testid={`archive-assignment-${wo.assignmentId}`}
                          onPointerDown={(e) => {
                            e.stopPropagation();
                          }}
                          onClick={async (e) => {
                            e.stopPropagation();
                            try {
                              await onArchiveAssignment(wo.assignmentId);
                              toast.success("Assignment archived");
                            } catch (err) {
                              toast.error(
                                err instanceof Error
                                  ? err.message
                                  : "Failed to archive assignment",
                              );
                            }
                          }}
                        >
                          <Archive className="h-2.5 w-2.5" />
                        </button>
                      )}

                      {!interactionPaused && (
                        <div
                          className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-white/20"
                          style={{ touchAction: "none" }}
                          onPointerDown={(e) => {
                            e.stopPropagation();
                            handlePointerDown(e, wo, "resize");
                          }}
                        />
                      )}

                      {isEditMode && viewMode === "day" && onApplyDayModelEdit && (
                        <div className="absolute inset-0 z-20 flex">
                          {Array.from({ length: durationDays }).map((_, dayOffset) => {
                            const isBlocked = nonWorkDaySet.has(dayOffset);
                            const effortHours = Math.max(0, dayEffortMap.get(dayOffset) ?? 0);
                            const intensity = maxDayEffort > 0 ? effortHours / maxDayEffort : 0;
                            const backgroundColor =
                              dayEditMode === "block"
                                ? isBlocked
                                  ? "rgba(244,63,94,0.52)"
                                  : "rgba(255,255,255,0.06)"
                                : isBlocked
                                  ? "rgba(244,63,94,0.42)"
                                  : `rgba(245,158,11,${0.2 + intensity * 0.65})`;
                            const adjustment: 1 | -1 = 1;
                            return (
                              <button
                                key={`${wo.assignmentId}-${dayOffset}`}
                                type="button"
                                className="h-full border-l border-black/20 first:border-l-0"
                                style={{
                                  width: `${100 / durationDays}%`,
                                  backgroundColor,
                                }}
                                title={
                                  dayEditMode === "distribute"
                                    ? `Day ${dayOffset + 1}: ${effortHours.toFixed(1)}h (${isBlocked ? "blocked" : "active"})`
                                    : `Day ${dayOffset + 1}: ${isBlocked ? "blocked" : "active"}`
                                }
                                data-testid={`gantt-day-segment-${wo.assignmentId}-${dayOffset}`}
                                onPointerDown={(event) => {
                                  event.preventDefault();
                                  event.stopPropagation();
                                }}
                                onClick={(event) => {
                                  event.preventDefault();
                                  event.stopPropagation();
                                  const nextAdjustment: 1 | -1 = event.shiftKey ? -1 : adjustment;
                                  void onApplyDayModelEdit({
                                    assignmentId: wo.assignmentId,
                                    workOrderId: wo.workOrderId,
                                    dayOffset,
                                    mode: dayEditMode,
                                    adjustment: nextAdjustment,
                                  });
                                }}
                              />
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
