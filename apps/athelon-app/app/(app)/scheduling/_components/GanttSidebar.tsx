"use client";

import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export type WorkOrderRow = {
  _id: string;
  workOrderNumber: string;
  status: string;
  priority: "routine" | "urgent" | "aog";
  aircraft: { currentRegistration: string | undefined; make: string; model: string } | null;
  effectiveEstimatedHours: number;
  completedHours: number;
  scheduledStartDate?: number;
  promisedDeliveryDate?: number;
};

interface GanttSidebarProps {
  workOrders: WorkOrderRow[];
  rowHeight: number;
  onWOClick?: (woId: string) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// PRIORITY CONFIG
// ─────────────────────────────────────────────────────────────────────────────

const PRIORITY_ORDER: Record<string, number> = { aog: 0, urgent: 1, routine: 2 };

function PriorityDot({ priority }: { priority: string }) {
  const cls =
    priority === "aog"
      ? "bg-red-500 aog-pulse"
      : priority === "urgent"
        ? "bg-amber-500"
        : "bg-sky-500";
  return <span className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${cls}`} />;
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export function GanttSidebar({ workOrders, rowHeight, onWOClick }: GanttSidebarProps) {
  const [search, setSearch] = useState("");

  // Sort: AOG first, then by scheduledStartDate
  const sorted = useMemo(() => {
    let list = [...workOrders];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (wo) =>
          wo.workOrderNumber.toLowerCase().includes(q) ||
          wo.aircraft?.currentRegistration?.toLowerCase().includes(q),
      );
    }
    return list.sort((a, b) => {
      const pa = PRIORITY_ORDER[a.priority] ?? 99;
      const pb = PRIORITY_ORDER[b.priority] ?? 99;
      if (pa !== pb) return pa - pb;
      return (a.scheduledStartDate ?? 0) - (b.scheduledStartDate ?? 0);
    });
  }, [workOrders, search]);

  return (
    <div className="flex flex-col bg-background border-r border-border/40" style={{ width: 200 }}>
      {/* Search */}
      <div className="px-2 py-1.5 border-b border-border/40">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search WOs..."
            className="h-7 pl-7 text-xs"
          />
        </div>
      </div>

      {/* Header */}
      <div
        className="flex items-center px-3 border-b border-border/40 bg-muted/30 text-[11px] font-medium text-muted-foreground uppercase tracking-wide"
        style={{ height: rowHeight, minHeight: rowHeight }}
      >
        Work Order
      </div>

      {/* Rows */}
      <div className="flex-1 overflow-y-auto">
        {sorted.map((wo) => {
          const pct =
            wo.effectiveEstimatedHours > 0
              ? Math.round((wo.completedHours / wo.effectiveEstimatedHours) * 100)
              : 0;

          return (
            <div
              key={wo._id}
              className="flex items-center gap-2 px-3 border-b border-border/30 hover:bg-muted/20 transition-colors cursor-pointer"
              style={{ height: rowHeight, minHeight: rowHeight }}
              onClick={() => onWOClick?.(wo._id)}
            >
              <PriorityDot priority={wo.priority} />
              <div className="flex flex-col min-w-0 flex-1">
                <span className="text-[11px] font-mono font-semibold text-foreground truncate">
                  {wo.workOrderNumber}
                </span>
                <span className="text-[10px] text-muted-foreground truncate">
                  {wo.aircraft?.currentRegistration ?? "—"} · {pct}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
