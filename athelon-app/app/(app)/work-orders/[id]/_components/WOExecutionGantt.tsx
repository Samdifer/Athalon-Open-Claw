"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id, Doc } from "@/convex/_generated/dataModel";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { GripVertical, User, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Constants ──────────────────────────────────────────────────────────────

const HOUR_WIDTH = 60; // px per hour
const LANE_HEIGHT = 64; // px per tech lane
const HEADER_HEIGHT = 40;
const SIDEBAR_WIDTH = 220;
const TOTAL_HOURS = 24;
const GRID_WIDTH = HOUR_WIDTH * TOTAL_HOURS;

type AssignmentStatus = "scheduled" | "in_progress" | "complete";

const STATUS_COLORS: Record<AssignmentStatus, string> = {
  scheduled: "bg-blue-500/20 border-blue-500/40 text-blue-300",
  in_progress: "bg-amber-500/20 border-amber-500/40 text-amber-300",
  complete: "bg-green-500/20 border-green-500/40 text-green-300",
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function dayStart(ts?: number): number {
  const d = ts ? new Date(ts) : new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function msToX(ms: number, origin: number): number {
  return ((ms - origin) / 3_600_000) * HOUR_WIDTH;
}

function xToMs(x: number, origin: number): number {
  return origin + (x / HOUR_WIDTH) * 3_600_000;
}

function clampX(x: number): number {
  return Math.max(0, Math.min(GRID_WIDTH, x));
}

// ─── Types ──────────────────────────────────────────────────────────────────

interface Props {
  workOrderId: Id<"workOrders">;
}

type TaskAssignment = Doc<"taskAssignments">;

interface DragState {
  type: "move" | "resize-end" | "assign";
  assignmentId?: Id<"taskAssignments">;
  taskCardId?: Id<"taskCards">;
  startX: number;
  startY: number;
  origLeft: number;
  origWidth: number;
  origTechIndex: number;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function WOExecutionGantt({ workOrderId }: Props) {
  const { orgId } = useCurrentOrg();

  // Queries
  const assignments = useQuery(
    api.taskAssignments.listByWorkOrder,
    workOrderId ? { workOrderId } : "skip",
  );
  const taskCards = useQuery(
    api.taskCards.listTaskCardsForWorkOrder,
    workOrderId ? { workOrderId } : "skip",
  );
  const technicians = useQuery(
    api.technicians.list,
    orgId ? { organizationId: orgId } : "skip",
  );

  // Mutations
  const assignTech = useMutation(api.taskAssignments.assignTechToTask);
  const moveAssignment = useMutation(api.taskAssignments.moveAssignment);

  // State
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [dragDelta, setDragDelta] = useState({ dx: 0, dy: 0 });
  const gridRef = useRef<HTMLDivElement>(null);

  const origin = useMemo(() => dayStart(), []);

  const activeTechs = useMemo(
    () => (technicians ?? []).filter((t) => t.status === "active"),
    [technicians],
  );

  // Assigned task card IDs
  const assignedCardIds = useMemo(() => {
    const set = new Set<string>();
    (assignments ?? []).forEach((a) => set.add(a.taskCardId));
    return set;
  }, [assignments]);

  // Unassigned task cards
  const unassigned = useMemo(
    () => (taskCards ?? []).filter((tc) => !assignedCardIds.has(tc._id)),
    [taskCards, assignedCardIds],
  );

  // ─── Pointer Handlers ──────────────────────────────────────────────────

  const onPointerDown = useCallback(
    (
      e: React.PointerEvent,
      type: DragState["type"],
      opts: {
        assignmentId?: Id<"taskAssignments">;
        taskCardId?: Id<"taskCards">;
        origLeft?: number;
        origWidth?: number;
        origTechIndex?: number;
      },
    ) => {
      e.preventDefault();
      e.stopPropagation();
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      setDragState({
        type,
        assignmentId: opts.assignmentId,
        taskCardId: opts.taskCardId,
        startX: e.clientX,
        startY: e.clientY,
        origLeft: opts.origLeft ?? 0,
        origWidth: opts.origWidth ?? 120,
        origTechIndex: opts.origTechIndex ?? 0,
      });
      setDragDelta({ dx: 0, dy: 0 });
    },
    [],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragState) return;
      setDragDelta({
        dx: e.clientX - dragState.startX,
        dy: e.clientY - dragState.startY,
      });
    },
    [dragState],
  );

  const onPointerUp = useCallback(
    async (e: React.PointerEvent) => {
      if (!dragState || !orgId) return;
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);

      const dx = e.clientX - dragState.startX;
      const dy = e.clientY - dragState.startY;
      const newTechIndex = Math.max(
        0,
        Math.min(
          activeTechs.length - 1,
          dragState.origTechIndex + Math.round(dy / LANE_HEIGHT),
        ),
      );
      const newTech = activeTechs[newTechIndex];

      try {
        if (dragState.type === "assign" && dragState.taskCardId && newTech) {
          // Drop from sidebar onto grid
          const rect = gridRef.current?.getBoundingClientRect();
          const dropX = rect ? clampX(e.clientX - rect.left) : 0;
          const start = xToMs(dropX, origin);
          const end = start + 2 * 3_600_000; // default 2h
          await assignTech({
            taskCardId: dragState.taskCardId,
            technicianId: newTech._id,
            scheduledStart: start,
            scheduledEnd: end,
            organizationId: orgId,
            workOrderId,
          });
          toast.success("Task assigned");
        } else if (dragState.type === "move" && dragState.assignmentId) {
          const newLeft = clampX(dragState.origLeft + dx);
          const newStart = xToMs(newLeft, origin);
          const newEnd = newStart + (dragState.origWidth / HOUR_WIDTH) * 3_600_000;
          await moveAssignment({
            assignmentId: dragState.assignmentId,
            newTechId: newTech?._id,
            newStart,
            newEnd,
          });
        } else if (dragState.type === "resize-end" && dragState.assignmentId) {
          const newWidth = Math.max(HOUR_WIDTH / 2, dragState.origWidth + dx);
          const newEnd = xToMs(dragState.origLeft + newWidth, origin);
          await moveAssignment({
            assignmentId: dragState.assignmentId,
            newEnd,
          });
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Assignment failed");
      }

      setDragState(null);
      setDragDelta({ dx: 0, dy: 0 });
    },
    [dragState, activeTechs, origin, orgId, workOrderId, assignTech, moveAssignment],
  );

  // ─── Loading ──────────────────────────────────────────────────────────

  if (!assignments || !taskCards || !technicians) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        Loading execution data…
      </div>
    );
  }

  // ─── Tech → assignment map ────────────────────────────────────────────

  const techAssignments = new Map<string, TaskAssignment[]>();
  activeTechs.forEach((t) => techAssignments.set(t._id, []));
  assignments.forEach((a) => {
    const arr = techAssignments.get(a.technicianId);
    if (arr) arr.push(a);
  });

  const taskCardMap = new Map(taskCards.map((tc) => [tc._id, tc]));

  // ─── Render ───────────────────────────────────────────────────────────

  return (
    <div
      className="flex gap-3 select-none"
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      {/* ── Unassigned sidebar ── */}
      <div className="w-56 shrink-0 space-y-2">
        <h3 className="text-sm font-semibold text-muted-foreground px-1">
          Unassigned Tasks
        </h3>
        {unassigned.length === 0 && (
          <p className="text-xs text-muted-foreground px-1">All tasks assigned</p>
        )}
        {unassigned.map((tc) => (
          <Card
            key={tc._id}
            className="p-2 cursor-grab border-dashed border-muted-foreground/30 hover:border-primary/50 transition-colors"
            style={{ touchAction: "none" }}
            onPointerDown={(e) =>
              onPointerDown(e, "assign", { taskCardId: tc._id as Id<"taskCards"> })
            }
          >
            <div className="flex items-center gap-2">
              <GripVertical className="h-3.5 w-3.5 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium truncate">{tc.title}</p>
                <p className="text-[10px] text-muted-foreground">
                  {tc.taskCardNumber} · {tc.estimatedHours ?? "?"}h est.
                </p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* ── Gantt grid ── */}
      <div className="flex-1 overflow-x-auto border border-border rounded-lg bg-card">
        <div
          className="relative"
          style={{
            width: SIDEBAR_WIDTH + GRID_WIDTH,
            minHeight: HEADER_HEIGHT + activeTechs.length * LANE_HEIGHT,
          }}
        >
          {/* Hour headers */}
          <div
            className="sticky top-0 z-10 flex border-b border-border bg-card/80 backdrop-blur"
            style={{ height: HEADER_HEIGHT, paddingLeft: SIDEBAR_WIDTH }}
          >
            {Array.from({ length: TOTAL_HOURS }, (_, i) => (
              <div
                key={i}
                className="text-[10px] text-muted-foreground border-l border-border/30 flex items-end pb-1 pl-1"
                style={{ width: HOUR_WIDTH }}
              >
                {String(i).padStart(2, "0")}:00
              </div>
            ))}
          </div>

          {/* Tech lanes */}
          {activeTechs.map((tech, idx) => {
            const laneAssignments = techAssignments.get(tech._id) ?? [];
            return (
              <div
                key={tech._id}
                className={cn(
                  "flex border-b border-border/30",
                  idx % 2 === 0 ? "bg-muted/10" : "bg-transparent",
                )}
                style={{ height: LANE_HEIGHT }}
              >
                {/* Tech label */}
                <div
                  className="flex items-center gap-2 px-3 shrink-0 border-r border-border/30"
                  style={{ width: SIDEBAR_WIDTH }}
                >
                  <User className="h-3.5 w-3.5 text-muted-foreground" />
                  <div className="min-w-0">
                    <p className="text-xs font-medium truncate">{tech.legalName}</p>
                    <p className="text-[10px] text-muted-foreground capitalize">
                      {(tech.role ?? "technician").replace("_", " ")}
                    </p>
                  </div>
                </div>

                {/* Grid area */}
                <div ref={idx === 0 ? gridRef : undefined} className="relative flex-1" style={{ width: GRID_WIDTH }}>
                  {/* Grid lines */}
                  {Array.from({ length: TOTAL_HOURS }, (_, h) => (
                    <div
                      key={h}
                      className="absolute top-0 bottom-0 border-l border-border/15"
                      style={{ left: h * HOUR_WIDTH }}
                    />
                  ))}

                  {/* Assignment bars */}
                  {laneAssignments.map((asn) => {
                    const left = msToX(asn.scheduledStart, origin);
                    const width = msToX(asn.scheduledEnd, origin) - left;
                    const tc = taskCardMap.get(asn.taskCardId);
                    const status = asn.status as AssignmentStatus;
                    const pct = asn.percentComplete ?? 0;

                    // Apply drag offset if this is the dragged bar
                    const isDragging =
                      dragState?.assignmentId === asn._id;
                    const displayLeft =
                      isDragging && dragState?.type === "move"
                        ? clampX(left + dragDelta.dx)
                        : left;
                    const displayWidth =
                      isDragging && dragState?.type === "resize-end"
                        ? Math.max(HOUR_WIDTH / 2, width + dragDelta.dx)
                        : width;
                    const displayTop =
                      isDragging && dragState?.type === "move"
                        ? dragDelta.dy
                        : 0;

                    return (
                      <div
                        key={asn._id}
                        className={cn(
                          "absolute top-1.5 h-[calc(100%-12px)] rounded-md border flex items-center px-2 gap-1 cursor-grab",
                          STATUS_COLORS[status],
                        )}
                        style={{
                          left: displayLeft,
                          width: displayWidth,
                          transform: `translateY(${displayTop}px)`,
                          touchAction: "none",
                          zIndex: isDragging ? 50 : 1,
                        }}
                        onPointerDown={(e) =>
                          onPointerDown(e, "move", {
                            assignmentId: asn._id,
                            origLeft: left,
                            origWidth: width,
                            origTechIndex: idx,
                          })
                        }
                      >
                        <div className="min-w-0 flex-1 overflow-hidden">
                          <p className="text-[10px] font-medium truncate">
                            {tc?.title ?? "Task"}
                          </p>
                          <p className="text-[9px] opacity-70">{pct}%</p>
                        </div>
                        {/* Resize handle */}
                        <div
                          className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-white/10"
                          style={{ touchAction: "none" }}
                          onPointerDown={(e) =>
                            onPointerDown(e, "resize-end", {
                              assignmentId: asn._id,
                              origLeft: left,
                              origWidth: width,
                              origTechIndex: idx,
                            })
                          }
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {activeTechs.length === 0 && (
            <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
              No active technicians in this organization
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
