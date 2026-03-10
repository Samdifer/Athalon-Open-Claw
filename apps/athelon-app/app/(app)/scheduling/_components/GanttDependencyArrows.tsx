"use client";

import { useMemo, useState } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export type DependencyType = "FS" | "FF" | "SS" | "SF";

export interface WODependency {
  id: string;
  predecessorId: string;
  successorId: string;
  type: DependencyType;
}

export interface TaskPosition {
  left: number;
  width: number;
  top: number;
  height: number;
}

interface GanttDependencyArrowsProps {
  dependencies: WODependency[];
  taskPositions: Map<string, TaskPosition>;
  containerWidth: number;
  containerHeight: number;
  criticalTaskIds?: Set<string>;
  onDependencyClick?: (dependencyId: string) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// PATH BUILDER
// ─────────────────────────────────────────────────────────────────────────────

function buildPath(
  type: DependencyType,
  pred: TaskPosition,
  succ: TaskPosition,
): { d: string; endX: number; endY: number } {
  const predCenterY = pred.top + pred.height / 2;
  const succCenterY = succ.top + succ.height / 2;
  const gap = 12;

  let startX: number;
  let endX: number;

  switch (type) {
    case "FS":
      startX = pred.left + pred.width;
      endX = succ.left;
      break;
    case "FF":
      startX = pred.left + pred.width;
      endX = succ.left + succ.width;
      break;
    case "SS":
      startX = pred.left;
      endX = succ.left;
      break;
    case "SF":
      startX = pred.left;
      endX = succ.left + succ.width;
      break;
  }

  const midX = (startX + endX) / 2;
  const d =
    endX - startX > gap * 2
      ? `M ${startX} ${predCenterY} C ${midX} ${predCenterY}, ${midX} ${succCenterY}, ${endX} ${succCenterY}`
      : `M ${startX} ${predCenterY} L ${startX + gap} ${predCenterY} L ${startX + gap} ${succCenterY} L ${endX} ${succCenterY}`;

  return { d, endX, endY: succCenterY };
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export function GanttDependencyArrows({
  dependencies,
  taskPositions,
  containerWidth,
  containerHeight,
  criticalTaskIds,
  onDependencyClick,
}: GanttDependencyArrowsProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const paths = useMemo(() => {
    return dependencies
      .map((dep) => {
        const pred = taskPositions.get(dep.predecessorId);
        const succ = taskPositions.get(dep.successorId);
        if (!pred || !succ) return null;

        const { d, endX, endY } = buildPath(dep.type, pred, succ);
        const isCritical =
          criticalTaskIds != null &&
          criticalTaskIds.has(dep.predecessorId) &&
          criticalTaskIds.has(dep.successorId);

        return { id: dep.id, d, endX, endY, isCritical };
      })
      .filter(Boolean) as {
      id: string;
      d: string;
      endX: number;
      endY: number;
      isCritical: boolean;
    }[];
  }, [dependencies, taskPositions, criticalTaskIds]);

  if (paths.length === 0) return null;

  return (
    <svg
      className="absolute inset-0 pointer-events-none z-20"
      width={containerWidth}
      height={containerHeight}
      style={{ overflow: "visible" }}
    >
      <defs>
        <marker
          id="gantt-arrow"
          markerWidth="8"
          markerHeight="6"
          refX="8"
          refY="3"
          orient="auto"
        >
          <path d="M 0 0 L 8 3 L 0 6 Z" className="fill-muted-foreground" />
        </marker>
        <marker
          id="gantt-arrow-critical"
          markerWidth="8"
          markerHeight="6"
          refX="8"
          refY="3"
          orient="auto"
        >
          <path d="M 0 0 L 8 3 L 0 6 Z" fill="#ef4444" />
        </marker>
      </defs>
      {paths.map((p) => {
        const isHovered = hoveredId === p.id;
        return (
          <g key={p.id}>
            {/* Wide invisible hit target for click/hover */}
            <path
              d={p.d}
              fill="none"
              stroke="transparent"
              strokeWidth={12}
              className="pointer-events-auto cursor-pointer"
              onClick={(e) => {
                if (onDependencyClick) {
                  e.stopPropagation();
                  onDependencyClick(p.id);
                }
              }}
              onPointerEnter={() => setHoveredId(p.id)}
              onPointerLeave={() => setHoveredId((prev) => (prev === p.id ? null : prev))}
            />
            {/* Visible connector path */}
            <path
              d={p.d}
              fill="none"
              stroke={p.isCritical ? "#ef4444" : isHovered ? "#60a5fa" : undefined}
              className={p.isCritical || isHovered ? "" : "stroke-muted-foreground/50"}
              strokeWidth={p.isCritical ? 2 : isHovered ? 2.5 : 1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              markerEnd={p.isCritical ? "url(#gantt-arrow-critical)" : "url(#gantt-arrow)"}
              style={{ pointerEvents: "none" }}
            />
          </g>
        );
      })}
    </svg>
  );
}
