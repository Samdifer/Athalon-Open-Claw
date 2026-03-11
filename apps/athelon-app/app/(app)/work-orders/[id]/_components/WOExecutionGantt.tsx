"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id, Doc } from "@/convex/_generated/dataModel";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { GripVertical, User, AlertTriangle, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  GanttDependencyArrows,
  type DependencyType,
  type WODependency,
  type TaskPosition,
} from "@/app/(app)/scheduling/_components/GanttDependencyArrows";

// ─── Constants ──────────────────────────────────────────────────────────────

const HOUR_WIDTH = 60; // px per hour
const LANE_HEIGHT = 64; // px per tech lane
const HEADER_HEIGHT = 40;
const SIDEBAR_WIDTH = 220;
const TOTAL_HOURS = 24;
const GRID_WIDTH = HOUR_WIDTH * TOTAL_HOURS;
const ENDPOINT_RADIUS = 5; // px radius of dependency endpoint circles
const BAR_TOP_OFFSET = 6; // px — matches top-1.5 (6px)
const BAR_BOTTOM_INSET = 12; // px — matches h-[calc(100%-12px)]

type AssignmentStatus = "scheduled" | "in_progress" | "complete";

const STATUS_COLORS: Record<AssignmentStatus, string> = {
  scheduled: "bg-blue-500/20 border-blue-500/40 text-blue-300",
  in_progress: "bg-amber-500/20 border-amber-500/40 text-amber-300",
  complete: "bg-green-500/20 border-green-500/40 text-green-300",
};

const DEP_TYPE_LABELS: Record<DependencyType, string> = {
  FS: "Finish → Start",
  SS: "Start → Start",
  FF: "Finish → Finish",
  SF: "Start → Finish",
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

function inferDependencyType(
  fromSide: "start" | "end",
  toSide: "start" | "end",
): DependencyType {
  if (fromSide === "end" && toSide === "start") return "FS";
  if (fromSide === "start" && toSide === "start") return "SS";
  if (fromSide === "end" && toSide === "end") return "FF";
  return "SF"; // start → end
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

interface LinkDragState {
  fromAssignmentId: Id<"taskAssignments">;
  fromSide: "start" | "end";
  originX: number;
  originY: number;
  mouseX: number;
  mouseY: number;
}

interface TaskAssignmentDependency {
  _id: Id<"taskAssignmentDependencies">;
  workOrderId: Id<"workOrders">;
  organizationId: string;
  predecessorId: Id<"taskAssignments">;
  successorId: Id<"taskAssignments">;
  type: DependencyType;
  lagMinutes?: number;
  createdAt: number;
}

type InteractionNotice = {
  level: "warning" | "error";
  message: string;
};

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
    workOrderId && orgId ? { workOrderId, organizationId: orgId } : "skip",
  );
  const technicians = useQuery(
    api.technicians.list,
    orgId ? { organizationId: orgId } : "skip",
  );
  const dependenciesRaw = useQuery(
    api.taskAssignmentDependencies.listByWorkOrder,
    workOrderId ? { workOrderId } : "skip",
  );
  const dependencies = dependenciesRaw as TaskAssignmentDependency[] | undefined;

  // Mutations
  const assignTech = useMutation(api.taskAssignments.assignTechToTask);
  const moveAssignment = useMutation(api.taskAssignments.moveAssignment);
  const createDependency = useMutation(api.taskAssignmentDependencies.createDependency);
  const updateDependency = useMutation(api.taskAssignmentDependencies.updateDependency);
  const removeDependency = useMutation(api.taskAssignmentDependencies.removeDependency);

  // State
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [dragDelta, setDragDelta] = useState({ dx: 0, dy: 0 });
  const [linkDrag, setLinkDrag] = useState<LinkDragState | null>(null);
  const [hoveredBarId, setHoveredBarId] = useState<string | null>(null);
  const [hoveredEndpoint, setHoveredEndpoint] = useState<{
    assignmentId: string;
    side: "start" | "end";
  } | null>(null);
  const [selectedDepId, setSelectedDepId] = useState<string | null>(null);
  const [interactionNotice, setInteractionNotice] = useState<InteractionNotice | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const gridContainerRef = useRef<HTMLDivElement>(null);

  const origin = useMemo(() => dayStart(), []);

  const announceBlockedInteraction = useCallback(
    (message: string, level: "warning" | "error" = "warning") => {
      setInteractionNotice({ level, message });
      toast[level === "error" ? "error" : "warning"](message, { duration: 4000 });
    },
    [],
  );

  useEffect(() => {
    if (!interactionNotice) return;
    const timeout = window.setTimeout(() => {
      setInteractionNotice(null);
    }, 5000);
    return () => {
      window.clearTimeout(timeout);
    };
  }, [interactionNotice]);

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

  const techAssignments = useMemo(() => {
    const map = new Map<string, TaskAssignment[]>();
    activeTechs.forEach((tech) => {
      map.set(tech._id, []);
    });
    (assignments ?? []).forEach((assignment) => {
      const list = map.get(assignment.technicianId);
      if (list) list.push(assignment);
    });
    return map;
  }, [activeTechs, assignments]);

  const taskCardMap = useMemo(
    () => new Map((taskCards ?? []).map((tc) => [tc._id, tc])),
    [taskCards],
  );

  // Build assignment → lane index lookup for dependency arrow positioning
  const assignmentLaneIndex = useMemo(() => {
    const map = new Map<string, number>();
    activeTechs.forEach((tech, idx) => {
      const lane = techAssignments.get(tech._id) ?? [];
      lane.forEach((asn) => map.set(asn._id, idx));
    });
    return map;
  }, [activeTechs, techAssignments]);

  // Compute task positions for dependency arrows
  const taskPositions = useMemo(() => {
    const positions = new Map<string, TaskPosition>();
    (assignments ?? []).forEach((asn) => {
      const laneIdx = assignmentLaneIndex.get(asn._id);
      if (laneIdx === undefined) return;
      const left = msToX(asn.scheduledStart, origin);
      const width = msToX(asn.scheduledEnd, origin) - left;
      const barHeight = LANE_HEIGHT - BAR_BOTTOM_INSET;
      positions.set(asn._id, {
        left,
        width,
        top: HEADER_HEIGHT + laneIdx * LANE_HEIGHT + BAR_TOP_OFFSET,
        height: barHeight,
      });
    });
    return positions;
  }, [assignments, assignmentLaneIndex, origin]);

  // Map backend dependencies to the format GanttDependencyArrows expects
  const depArrows: Array<WODependency> = useMemo(
    () =>
      (dependencies ?? []).map((dep) => ({
        id: dep._id,
        predecessorId: dep.predecessorId,
        successorId: dep.successorId,
        type: dep.type as DependencyType,
      })),
    [dependencies],
  );

  // Circular dependency check (client-side preview — server also validates)
  const wouldCreateCycle = useCallback(
    (fromId: string, toId: string): boolean => {
      // Check if toId can reach fromId through existing dependencies
      const adjacency = new Map<string, Array<string>>();
      for (const dep of dependencies ?? []) {
        const list = adjacency.get(dep.predecessorId) ?? [];
        list.push(dep.successorId);
        adjacency.set(dep.predecessorId, list);
      }
      const visited = new Set<string>();
      const stack: Array<string> = [toId];
      while (stack.length > 0) {
        const current = stack.pop()!;
        if (current === fromId) return true;
        if (visited.has(current)) continue;
        visited.add(current);
        const neighbors = adjacency.get(current) ?? [];
        for (const neighbor of neighbors) {
          if (!visited.has(neighbor)) stack.push(neighbor);
        }
      }
      return false;
    },
    [dependencies],
  );

  const findLaneOverlapConflicts = useCallback(
    (args: {
      technicianId: string;
      start: number;
      end: number;
      ignoreAssignmentId?: Id<"taskAssignments">;
    }) => {
      const lane = techAssignments.get(args.technicianId) ?? [];
      return lane.filter((assignment) => {
        if (args.ignoreAssignmentId && assignment._id === args.ignoreAssignmentId) {
          return false;
        }
        return args.start < assignment.scheduledEnd && assignment.scheduledStart < args.end;
      });
    },
    [techAssignments],
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

  const onEndpointPointerDown = useCallback(
    (
      e: React.PointerEvent,
      assignmentId: Id<"taskAssignments">,
      side: "start" | "end",
    ) => {
      e.preventDefault();
      e.stopPropagation();

      const pos = taskPositions.get(assignmentId);
      if (!pos) return;

      const originX = side === "end" ? pos.left + pos.width : pos.left;
      const originY = pos.top + pos.height / 2;

      setLinkDrag({
        fromAssignmentId: assignmentId,
        fromSide: side,
        originX,
        originY,
        mouseX: originX,
        mouseY: originY,
      });
    },
    [taskPositions],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (linkDrag) {
        const rect = gridContainerRef.current?.getBoundingClientRect();
        if (rect) {
          setLinkDrag((prev) =>
            prev
              ? {
                  ...prev,
                  mouseX: e.clientX - rect.left,
                  mouseY: e.clientY - rect.top,
                }
              : null,
          );
        }
        return;
      }
      if (!dragState) return;
      setDragDelta({
        dx: e.clientX - dragState.startX,
        dy: e.clientY - dragState.startY,
      });
    },
    [dragState, linkDrag],
  );

  const onPointerUp = useCallback(
    async (e: React.PointerEvent) => {
      // Handle link drag completion
      if (linkDrag) {
        if (hoveredEndpoint && hoveredEndpoint.assignmentId !== linkDrag.fromAssignmentId) {
          const targetId = hoveredEndpoint.assignmentId as Id<"taskAssignments">;
          const depType = inferDependencyType(linkDrag.fromSide, hoveredEndpoint.side);

          if (wouldCreateCycle(linkDrag.fromAssignmentId, targetId)) {
            announceBlockedInteraction("Cannot create dependency: would create a circular chain.");
          } else if (orgId) {
            try {
              await createDependency({
                workOrderId,
                organizationId: orgId,
                predecessorId: linkDrag.fromAssignmentId,
                successorId: targetId,
                type: depType,
              });
              toast.success(`${depType} dependency created`);
            } catch (err) {
              toast.error(err instanceof Error ? err.message : "Failed to create dependency");
            }
          }
        }
        setLinkDrag(null);
        setHoveredEndpoint(null);
        return;
      }

      if (!dragState) return;
      if (!orgId) {
        announceBlockedInteraction("Assignment update blocked: missing organization context.", "error");
        return;
      }
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

          const overlaps = findLaneOverlapConflicts({
            technicianId: newTech._id,
            start,
            end,
          });
          if (overlaps.length > 0) {
            announceBlockedInteraction(
              `Blocked: ${newTech.legalName} already has an overlapping assignment in this time range.`,
            );
            setDragState(null);
            setDragDelta({ dx: 0, dy: 0 });
            return;
          }

          await assignTech({
            taskCardId: dragState.taskCardId,
            technicianId: newTech._id,
            scheduledStart: start,
            scheduledEnd: end,
            organizationId: orgId,
            workOrderId,
          });
          toast.success("Task assigned");
        } else if (dragState.type === "assign" && dragState.taskCardId && !newTech) {
          announceBlockedInteraction("Assignment blocked: no active technician lane available.");
        } else if (dragState.type === "move" && dragState.assignmentId) {
          const newLeft = clampX(dragState.origLeft + dx);
          const newStart = xToMs(newLeft, origin);
          const newEnd = newStart + (dragState.origWidth / HOUR_WIDTH) * 3_600_000;
          if (!newTech) {
            announceBlockedInteraction("Move blocked: no valid technician lane selected.");
            setDragState(null);
            setDragDelta({ dx: 0, dy: 0 });
            return;
          }
          const overlaps = findLaneOverlapConflicts({
            technicianId: newTech._id,
            start: newStart,
            end: newEnd,
            ignoreAssignmentId: dragState.assignmentId,
          });
          if (overlaps.length > 0) {
            announceBlockedInteraction(
              `Blocked: ${newTech.legalName} has a schedule overlap at the selected time.`,
            );
            setDragState(null);
            setDragDelta({ dx: 0, dy: 0 });
            return;
          }
          await moveAssignment({
            assignmentId: dragState.assignmentId,
            newTechId: newTech._id,
            newStart,
            newEnd,
          });
        } else if (dragState.type === "resize-end" && dragState.assignmentId) {
          const newWidth = Math.max(HOUR_WIDTH / 2, dragState.origWidth + dx);
          const newEnd = xToMs(dragState.origLeft + newWidth, origin);
          const assignment = (assignments ?? []).find((item) => item._id === dragState.assignmentId);
          if (!assignment) {
            announceBlockedInteraction("Resize blocked: assignment no longer exists.", "error");
            setDragState(null);
            setDragDelta({ dx: 0, dy: 0 });
            return;
          }
          const overlaps = findLaneOverlapConflicts({
            technicianId: assignment.technicianId,
            start: assignment.scheduledStart,
            end: newEnd,
            ignoreAssignmentId: assignment._id,
          });
          if (overlaps.length > 0) {
            announceBlockedInteraction("Resize blocked: new duration overlaps another task.");
            setDragState(null);
            setDragDelta({ dx: 0, dy: 0 });
            return;
          }
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
    [
      dragState,
      linkDrag,
      hoveredEndpoint,
      activeTechs,
      origin,
      orgId,
      workOrderId,
      assignTech,
      moveAssignment,
      createDependency,
      assignments,
      findLaneOverlapConflicts,
      announceBlockedInteraction,
      wouldCreateCycle,
    ],
  );

  // ─── Dependency Edit Handlers ───────────────────────────────────────────

  const handleDepTypeChange = useCallback(
    async (depId: Id<"taskAssignmentDependencies">, newType: DependencyType) => {
      try {
        await updateDependency({ dependencyId: depId, type: newType });
        toast.success(`Dependency updated to ${newType}`);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to update dependency");
      }
    },
    [updateDependency],
  );

  const handleDepDelete = useCallback(
    async (depId: Id<"taskAssignmentDependencies">) => {
      try {
        await removeDependency({ dependencyId: depId });
        setSelectedDepId(null);
        toast.success("Dependency removed");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to remove dependency");
      }
    },
    [removeDependency],
  );

  // ─── Link drag target validation ──────────────────────────────────────

  const linkDragTargetValidity = useMemo(() => {
    if (!linkDrag || !hoveredEndpoint) return null;
    if (hoveredEndpoint.assignmentId === linkDrag.fromAssignmentId) return "invalid";
    if (wouldCreateCycle(linkDrag.fromAssignmentId, hoveredEndpoint.assignmentId as Id<"taskAssignments">)) {
      return "invalid";
    }
    return "valid";
  }, [linkDrag, hoveredEndpoint, wouldCreateCycle]);

  // ─── Selected dependency popover position ─────────────────────────────
  // Must be above the loading early-return to maintain consistent hook order.

  const selectedDep = selectedDepId
    ? (dependencies ?? []).find((d) => d._id === selectedDepId)
    : null;
  const selectedDepMidpoint = useMemo(() => {
    if (!selectedDep) return null;
    const pred = taskPositions.get(selectedDep.predecessorId);
    const succ = taskPositions.get(selectedDep.successorId);
    if (!pred || !succ) return null;
    const predAnchorX = selectedDep.type === "SS" || selectedDep.type === "SF"
      ? pred.left
      : pred.left + pred.width;
    const succAnchorX = selectedDep.type === "FF" || selectedDep.type === "SF"
      ? succ.left + succ.width
      : succ.left;
    return {
      x: (predAnchorX + succAnchorX) / 2,
      y: (pred.top + pred.height / 2 + succ.top + succ.height / 2) / 2,
    };
  }, [selectedDep, taskPositions]);

  // ─── Loading ──────────────────────────────────────────────────────────

  if (!assignments || !taskCards || !technicians) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        Loading execution data…
      </div>
    );
  }

  // ─── Render ───────────────────────────────────────────────────────────

  const gridTotalHeight = HEADER_HEIGHT + activeTechs.length * LANE_HEIGHT;

  return (
    <div
      className="flex flex-col gap-3 select-none"
      style={{ touchAction: "pan-x pan-y" }}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      {interactionNotice && (
        <div
          className={cn(
            "w-full rounded-md border px-3 py-2 text-xs flex items-start gap-2",
            interactionNotice.level === "error"
              ? "border-red-500/50 bg-red-500/10 text-red-200"
              : "border-amber-500/50 bg-amber-500/10 text-amber-200",
          )}
          data-testid="wo-execution-interaction-notice"
        >
          <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          <span>{interactionNotice.message}</span>
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-3">
      {/* ── Unassigned sidebar ── */}
      <div className="w-full lg:w-56 shrink-0 space-y-2">
        <h3 className="text-sm font-semibold text-muted-foreground px-1">
          Unassigned Tasks
        </h3>
        <div
          className="flex gap-2 overflow-x-auto pb-1 lg:block lg:space-y-2 lg:overflow-visible lg:pb-0"
          data-testid="wo-execution-unassigned-strip"
        >
          {unassigned.length === 0 && (
            <p className="text-xs text-muted-foreground px-1">All tasks assigned</p>
          )}
          {unassigned.map((tc) => (
            <Card
              key={tc._id}
              className="p-2 cursor-grab border-dashed border-muted-foreground/30 hover:border-primary/50 transition-colors min-w-[220px] lg:min-w-0"
              style={{ touchAction: "none" }}
              data-testid={`wo-unassigned-${tc._id}`}
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
      </div>

      {/* ── Gantt grid ── */}
      <div className="flex-1 min-w-0 overflow-auto border border-border rounded-lg bg-card">
        <div
          ref={gridContainerRef}
          className="relative"
          style={{
            width: SIDEBAR_WIDTH + GRID_WIDTH,
            minHeight: gridTotalHeight,
          }}
          onClick={() => setSelectedDepId(null)}
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
                data-testid={`wo-tech-lane-${tech._id}`}
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

                    const isBarHovered = hoveredBarId === asn._id;
                    const showEndpoints = isBarHovered && !dragState;

                    // During link drag, determine if this bar is a valid target
                    const isLinkTarget = linkDrag && linkDrag.fromAssignmentId !== asn._id;
                    const isLinkTargetHovered =
                      hoveredEndpoint?.assignmentId === asn._id;

                    return (
                      <div
                        key={asn._id}
                        className={cn(
                          "absolute top-1.5 h-[calc(100%-12px)] rounded-md border flex items-center px-2 gap-1 cursor-grab group/bar",
                          STATUS_COLORS[status],
                          isLinkTarget && isLinkTargetHovered && linkDragTargetValidity === "valid" && "ring-2 ring-green-400/60",
                          isLinkTarget && isLinkTargetHovered && linkDragTargetValidity === "invalid" && "ring-2 ring-red-400/60",
                        )}
                        data-testid={`wo-assignment-${asn._id}`}
                        style={{
                          left: displayLeft,
                          width: displayWidth,
                          transform: `translateY(${displayTop}px)`,
                          touchAction: "none",
                          zIndex: isDragging ? 50 : isBarHovered ? 10 : 1,
                        }}
                        onPointerDown={(e) =>
                          onPointerDown(e, "move", {
                            assignmentId: asn._id,
                            origLeft: left,
                            origWidth: width,
                            origTechIndex: idx,
                          })
                        }
                        onPointerEnter={() => setHoveredBarId(asn._id)}
                        onPointerLeave={() => {
                          if (hoveredBarId === asn._id) setHoveredBarId(null);
                        }}
                      >
                        <div className="min-w-0 flex-1 overflow-hidden">
                          <p className="text-[10px] font-medium truncate">
                            {tc?.title ?? "Task"}
                          </p>
                          <p className="text-[9px] opacity-70">{pct}%</p>
                        </div>

                        {/* ── Dependency endpoint: LEFT (start) ── */}
                        <div
                          className={cn(
                            "absolute rounded-full border-2 transition-all duration-150 cursor-crosshair z-20",
                            showEndpoints || (linkDrag && isLinkTarget)
                              ? "opacity-100 scale-100"
                              : "opacity-0 scale-50 pointer-events-none",
                            isLinkTargetHovered && hoveredEndpoint?.side === "start" && linkDragTargetValidity === "valid"
                              ? "bg-green-400 border-green-300"
                              : isLinkTargetHovered && hoveredEndpoint?.side === "start" && linkDragTargetValidity === "invalid"
                                ? "bg-red-400 border-red-300"
                                : "bg-blue-400 border-blue-300",
                          )}
                          style={{
                            width: ENDPOINT_RADIUS * 2,
                            height: ENDPOINT_RADIUS * 2,
                            left: -ENDPOINT_RADIUS,
                            top: "50%",
                            transform: "translateY(-50%)",
                          }}
                          onPointerDown={(e) => {
                            e.stopPropagation();
                            onEndpointPointerDown(e, asn._id, "start");
                          }}
                          onPointerEnter={() =>
                            linkDrag &&
                            setHoveredEndpoint({ assignmentId: asn._id, side: "start" })
                          }
                          onPointerLeave={() =>
                            hoveredEndpoint?.assignmentId === asn._id &&
                            hoveredEndpoint?.side === "start" &&
                            setHoveredEndpoint(null)
                          }
                        />

                        {/* ── Dependency endpoint: RIGHT (end) ── */}
                        <div
                          className={cn(
                            "absolute rounded-full border-2 transition-all duration-150 cursor-crosshair z-20",
                            showEndpoints || (linkDrag && isLinkTarget)
                              ? "opacity-100 scale-100"
                              : "opacity-0 scale-50 pointer-events-none",
                            isLinkTargetHovered && hoveredEndpoint?.side === "end" && linkDragTargetValidity === "valid"
                              ? "bg-green-400 border-green-300"
                              : isLinkTargetHovered && hoveredEndpoint?.side === "end" && linkDragTargetValidity === "invalid"
                                ? "bg-red-400 border-red-300"
                                : "bg-blue-400 border-blue-300",
                          )}
                          style={{
                            width: ENDPOINT_RADIUS * 2,
                            height: ENDPOINT_RADIUS * 2,
                            right: -ENDPOINT_RADIUS,
                            top: "50%",
                            transform: "translateY(-50%)",
                          }}
                          onPointerDown={(e) => {
                            e.stopPropagation();
                            onEndpointPointerDown(e, asn._id, "end");
                          }}
                          onPointerEnter={() =>
                            linkDrag &&
                            setHoveredEndpoint({ assignmentId: asn._id, side: "end" })
                          }
                          onPointerLeave={() =>
                            hoveredEndpoint?.assignmentId === asn._id &&
                            hoveredEndpoint?.side === "end" &&
                            setHoveredEndpoint(null)
                          }
                        />

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

          {/* ── Dependency arrows SVG overlay ── */}
          <GanttDependencyArrows
            dependencies={depArrows}
            taskPositions={taskPositions}
            containerWidth={SIDEBAR_WIDTH + GRID_WIDTH}
            containerHeight={gridTotalHeight}
            onDependencyClick={(depId) => {
              setSelectedDepId((prev) => (prev === depId ? null : depId));
            }}
          />

          {/* ── Ghost connector during link drag ── */}
          {linkDrag && (
            <svg
              className="absolute inset-0 pointer-events-none z-30"
              width={SIDEBAR_WIDTH + GRID_WIDTH}
              height={gridTotalHeight}
              style={{ overflow: "visible" }}
            >
              <line
                x1={linkDrag.originX + SIDEBAR_WIDTH}
                y1={linkDrag.originY}
                x2={linkDrag.mouseX}
                y2={linkDrag.mouseY}
                stroke={
                  hoveredEndpoint
                    ? linkDragTargetValidity === "valid"
                      ? "#4ade80"
                      : "#f87171"
                    : "#60a5fa"
                }
                strokeWidth={2}
                strokeDasharray="6 3"
                strokeLinecap="round"
              />
            </svg>
          )}

          {/* ── Dependency edit popover ── */}
          {selectedDep && selectedDepMidpoint && (
            <div
              className="absolute z-40 bg-popover border border-border rounded-lg shadow-lg p-3 w-52"
              style={{
                left: selectedDepMidpoint.x + SIDEBAR_WIDTH - 104,
                top: selectedDepMidpoint.y + 12,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="space-y-2">
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                  Dependency Type
                </p>
                <div className="grid grid-cols-2 gap-1">
                  {(["FS", "SS", "FF", "SF"] as const).map((t) => (
                    <button
                      key={t}
                      className={cn(
                        "text-[10px] px-2 py-1 rounded border transition-colors",
                        selectedDep.type === t
                          ? "bg-primary/20 border-primary/40 text-primary"
                          : "border-border hover:bg-muted/50 text-muted-foreground",
                      )}
                      onClick={() =>
                        handleDepTypeChange(
                          selectedDep._id as Id<"taskAssignmentDependencies">,
                          t,
                        )
                      }
                    >
                      {DEP_TYPE_LABELS[t]}
                    </button>
                  ))}
                </div>
                <button
                  className="w-full flex items-center justify-center gap-1.5 text-[10px] text-red-400 hover:text-red-300 border border-red-500/30 hover:bg-red-500/10 rounded px-2 py-1 transition-colors"
                  onClick={() =>
                    handleDepDelete(
                      selectedDep._id as Id<"taskAssignmentDependencies">,
                    )
                  }
                >
                  <Trash2 className="h-3 w-3" />
                  Remove Dependency
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      </div>
    </div>
  );
}
