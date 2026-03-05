// hooks/useGanttDragDrop.ts
// MBP-0110: Enhanced drag-drop with ghost bar, snap guides
// MBP-0111: Technician skill matching during drag
// MBP-0113: Bay conflict detection during drag

import { useState, useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";

const DAY_MS = 24 * 60 * 60 * 1000;

export type DragPayload = {
  workOrderId: string;
  workOrderNumber: string;
  hangarBayId: string;
  sourceQuoteId?: string;
  type: "move" | "resize";
  startX: number;
  startY: number;
  origStartDate: number;
  origEndDate: number;
  requiredTraining?: string[];
  assignedTechIds?: string[];
};

export type SnapGuide = {
  dayIndex: number;
  label: string;
  type: "start" | "end" | "today";
};

export type SkillWarning = {
  techId: string;
  techName?: string;
  missingTraining: string[];
};

export type ConflictWarning = {
  conflictingWoNumber: string;
  overlapStart: number;
  overlapEnd: number;
};

type Booking = { startDate: number; endDate: number; workOrderId: string; workOrderNumber: string };

export function useGanttDragDrop({
  cellWidth,
  rangeStartDay,
  rows,
  resolveHoveredBayId,
  onScheduleChange,
  techTrainingMap,
  bayBookingsMap,
  disabled,
}: {
  cellWidth: number;
  rangeStartDay: number;
  rows: { id: string; wos: { workOrderId: string; workOrderNumber: string; scheduledStartDate: number; promisedDeliveryDate: number }[] }[];
  resolveHoveredBayId: (clientY: number) => string | null;
  onScheduleChange: (args: {
    workOrderId: string;
    startDate: number;
    endDate: number;
    hangarBayId: string;
    sourceQuoteId?: string;
  }) => Promise<void>;
  techTrainingMap?: Record<string, string[]>;
  bayBookingsMap?: Map<string, Booking[]>;
  disabled?: boolean;
}) {
  const [dragState, setDragState] = useState<DragPayload | null>(null);
  const [dragDelta, setDragDelta] = useState(0);
  const [dragHoverBayId, setDragHoverBayId] = useState<string | null>(null);
  const [snapGuides, setSnapGuides] = useState<SnapGuide[]>([]);
  const [skillWarnings, setSkillWarnings] = useState<SkillWarning[]>([]);
  const [conflictWarnings, setConflictWarnings] = useState<ConflictWarning[]>([]);
  const [ghostPosition, setGhostPosition] = useState<{
    left: number;
    width: number;
    bayRowIndex: number;
  } | null>(null);

  const handlePointerDown = useCallback(
    (
      e: React.PointerEvent,
      wo: {
        workOrderId: string;
        workOrderNumber: string;
        hangarBayId: string;
        sourceQuoteId?: string;
        scheduledStartDate: number;
        promisedDeliveryDate: number;
        requiredTraining?: string[];
        assignedTechIds?: string[];
      },
      type: "move" | "resize",
    ) => {
      if (disabled) return;
      e.preventDefault();
      e.stopPropagation();
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
      setDragState({
        workOrderId: wo.workOrderId,
        workOrderNumber: wo.workOrderNumber,
        hangarBayId: wo.hangarBayId,
        sourceQuoteId: wo.sourceQuoteId,
        type,
        startX: e.clientX,
        startY: e.clientY,
        origStartDate: wo.scheduledStartDate,
        origEndDate: wo.promisedDeliveryDate,
        requiredTraining: wo.requiredTraining,
        assignedTechIds: wo.assignedTechIds,
      });
      setDragDelta(0);
      setDragHoverBayId(null);
      setSnapGuides([]);
      setSkillWarnings([]);
      setConflictWarnings([]);
      setGhostPosition(null);
    },
    [disabled],
  );

  // Check skill matching for target bay
  const checkSkillMatching = useCallback(
    (targetBayId: string, assignedTechIds?: string[], requiredTraining?: string[]) => {
      if (!techTrainingMap || !requiredTraining || requiredTraining.length === 0 || !assignedTechIds) {
        setSkillWarnings([]);
        return;
      }
      const warnings: SkillWarning[] = [];
      for (const techId of assignedTechIds) {
        const techTraining = techTrainingMap[techId] ?? [];
        const missing = requiredTraining.filter((req) => !techTraining.includes(req));
        if (missing.length > 0) {
          warnings.push({ techId, missingTraining: missing });
        }
      }
      setSkillWarnings(warnings);
    },
    [techTrainingMap],
  );

  // Check bay conflicts
  const checkBayConflicts = useCallback(
    (targetBayId: string, startDate: number, endDate: number, excludeWoId: string) => {
      if (!bayBookingsMap) {
        setConflictWarnings([]);
        return;
      }
      const bookings = bayBookingsMap.get(targetBayId) ?? [];
      const conflicts: ConflictWarning[] = [];
      for (const b of bookings) {
        if (b.workOrderId === excludeWoId) continue;
        if (startDate < b.endDate && b.startDate < endDate) {
          conflicts.push({
            conflictingWoNumber: b.workOrderNumber,
            overlapStart: Math.max(startDate, b.startDate),
            overlapEnd: Math.min(endDate, b.endDate),
          });
        }
      }
      setConflictWarnings(conflicts);
    },
    [bayBookingsMap],
  );

  useEffect(() => {
    if (!dragState || disabled) return;

    function handlePointerMove(e: PointerEvent) {
      const delta = e.clientX - dragState!.startX;
      setDragDelta(delta);

      if (dragState!.type === "move") {
        const hoveredBay = resolveHoveredBayId(e.clientY);
        setDragHoverBayId(hoveredBay);

        const daysDelta = Math.round(delta / cellWidth);
        const newStart = dragState!.origStartDate + daysDelta * DAY_MS;
        const newEnd = dragState!.origEndDate + daysDelta * DAY_MS;
        const targetBay = hoveredBay ?? dragState!.hangarBayId;

        // Check skill matching
        checkSkillMatching(targetBay, dragState!.assignedTechIds, dragState!.requiredTraining);

        // Check bay conflicts
        checkBayConflicts(targetBay, newStart, newEnd, dragState!.workOrderId);

        // Compute snap guides
        const msToDay = (ms: number) => Math.floor(ms / DAY_MS);
        const startIdx = msToDay(newStart) - rangeStartDay;
        const endIdx = msToDay(newEnd) - rangeStartDay;
        setSnapGuides([
          { dayIndex: startIdx, label: "Start", type: "start" },
          { dayIndex: endIdx, label: "End", type: "end" },
        ]);

        // Ghost bar position
        const rowIdx = rows.findIndex((r) => r.id === targetBay);
        if (rowIdx >= 0) {
          const left = startIdx * cellWidth;
          const width = Math.max(cellWidth, (endIdx - startIdx) * cellWidth);
          setGhostPosition({ left, width, bayRowIndex: rowIdx });
        }
      } else {
        // Resize
        const daysDelta = Math.round(delta / cellWidth);
        const newEnd = Math.max(
          dragState!.origStartDate + DAY_MS,
          dragState!.origEndDate + daysDelta * DAY_MS,
        );
        checkBayConflicts(dragState!.hangarBayId, dragState!.origStartDate, newEnd, dragState!.workOrderId);
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

        // Show conflict toast if any
        if (conflictWarnings.length > 0) {
          toast.warning(
            `Schedule conflict: overlaps with ${conflictWarnings.map((c) => c.conflictingWoNumber).join(", ")}`,
            { duration: 5000 },
          );
        }

        // Show skill warning toast
        if (skillWarnings.length > 0) {
          toast.warning(
            `Skill gap: ${skillWarnings.length} tech(s) missing required training`,
            { duration: 5000 },
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
      setSnapGuides([]);
      setSkillWarnings([]);
      setConflictWarnings([]);
      setGhostPosition(null);
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
    disabled,
    checkSkillMatching,
    checkBayConflicts,
    conflictWarnings,
    skillWarnings,
    rangeStartDay,
    rows,
  ]);

  return {
    dragState,
    dragDelta,
    dragHoverBayId,
    snapGuides,
    skillWarnings,
    conflictWarnings,
    ghostPosition,
    handlePointerDown,
  };
}
