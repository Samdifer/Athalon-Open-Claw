"use client";

/**
 * Work Order Kanban Board
 *
 * Drag-and-drop Kanban view of work orders organized by status columns.
 * Uses native HTML5 drag-and-drop (no library dependencies).
 */

import { useState, useMemo, useCallback, memo, type DragEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "convex/react";
import {
  Search,
  ArrowLeft,
  GripVertical,
  Plane,
  Clock,
  User,
  Filter,
} from "lucide-react";
import { api } from "@/convex/_generated/api";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { Id } from "@/convex/_generated/dataModel";

// ─── Kanban column definitions ──────────────────────────────────────────────

const KANBAN_COLUMNS = [
  { key: "draft", label: "Draft", color: "border-t-slate-400" },
  { key: "open", label: "Open", color: "border-t-blue-500" },
  { key: "in_progress", label: "In Progress", color: "border-t-amber-500" },
  { key: "on_hold", label: "On Hold", color: "border-t-orange-500" },
  { key: "pending_inspection", label: "Pending Inspection", color: "border-t-purple-500" },
  { key: "complete", label: "Complete", color: "border-t-green-500" },
] as const;

type KanbanStatus = (typeof KANBAN_COLUMNS)[number]["key"];

// Map "complete" display column to actual statuses
const STATUS_MAP: Record<string, string[]> = {
  draft: ["draft"],
  open: ["open"],
  // open_discrepancies means active work with found squawks — still "In Progress",
  // not "Pending Inspection". Inspectors seeing a WO with open discrepancies in
  // the "Pending Inspection" column would incorrectly assume it's ready for QC.
  in_progress: ["in_progress", "open_discrepancies"],
  on_hold: ["on_hold"],
  pending_inspection: ["pending_inspection", "pending_signoff"],
  complete: ["closed"],
};

// Reverse map: actual status → kanban column
function getKanbanColumn(status: string): KanbanStatus {
  for (const [col, statuses] of Object.entries(STATUS_MAP)) {
    if (statuses.includes(status)) return col as KanbanStatus;
  }
  return "draft";
}

// Map kanban column → mutation status (for drop)
// BUG-SM-HUNT-018: Dragging a `pending_signoff` WO out of "Pending Inspection"
// and back (or from any column) mapped to `pending_inspection`, silently
// downgrading QCM sign-off state to regular inspection. The column now maps to
// `pending_inspection` for most drops, but the drop handler checks the WO's
// original status and preserves `pending_signoff` if it was already there.
const COLUMN_TO_STATUS: Record<string, string> = {
  draft: "draft",
  open: "open",
  in_progress: "in_progress",
  on_hold: "on_hold",
  pending_inspection: "pending_inspection",
  // "complete" column is read-only — can't drag into closed
};

// ─── Priority badge colors ──────────────────────────────────────────────────

function priorityBadge(priority: string) {
  switch (priority) {
    case "aog":
      return (
        <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-[10px] px-1.5">
          AOG
        </Badge>
      );
    case "urgent":
      return (
        <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-[10px] px-1.5">
          Urgent
        </Badge>
      );
    default:
      return (
        <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-[10px] px-1.5">
          Routine
        </Badge>
      );
  }
}

// ─── Days open calculation ──────────────────────────────────────────────────

function daysOpen(openedAt: number): number {
  return Math.floor((Date.now() - openedAt) / (1000 * 60 * 60 * 24));
}

// ─── Work Order Card ────────────────────────────────────────────────────────

type WoCardData = {
  _id: string;
  workOrderNumber: string;
  status: string;
  priority: string;
  description: string;
  openedAt: number;
  customerName: string | null;
  promisedDeliveryDate?: number;
  taskCardCount?: number;
  completedTaskCardCount?: number;
  aircraft: { currentRegistration?: string | null; make: string; model: string } | null;
};

// memo so that drag-state changes (dragOverColumn / draggedWoId) on the parent do NOT
// re-render every card — only cards whose props actually changed will re-render.
const WoCard = memo(function WoCard({
  wo,
  onDragStart,
}: {
  wo: WoCardData;
  onDragStart: (e: DragEvent<HTMLDivElement>, woId: string) => void;
}) {
  const navigate = useNavigate();
  const days = daysOpen(wo.openedAt);

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, wo._id)}
      onClick={() => navigate(`/work-orders/${wo._id}`)}
      className={cn(
        "group cursor-grab active:cursor-grabbing rounded-lg border bg-card p-3 shadow-sm",
        "hover:shadow-md hover:border-primary/30 transition-all duration-150",
        "select-none"
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5">
          <GripVertical className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-muted-foreground/70" />
          <span className="font-mono text-xs font-semibold text-foreground">
            {wo.workOrderNumber}
          </span>
          {/* BUG-SM-HUNT-020: pending_signoff WOs were visually identical to
              pending_inspection in the same kanban column. QCM-ready work
              orders need a clear badge so the shop manager can distinguish
              "ready for QCM release" from "waiting for inspector review". */}
          {wo.status === "pending_signoff" && (
            <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30 text-[9px] px-1">
              QCM
            </Badge>
          )}
        </div>
        {priorityBadge(wo.priority)}
      </div>

      {wo.aircraft && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1.5">
          <Plane className="h-3 w-3" />
          <span className="font-medium">
            {wo.aircraft.currentRegistration || `${wo.aircraft.make} ${wo.aircraft.model}`}
          </span>
        </div>
      )}

      {wo.customerName && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1.5">
          <User className="h-3 w-3" />
          <span className="truncate">{wo.customerName}</span>
        </div>
      )}

      <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
        {wo.description}
      </p>

      <div className="flex items-center justify-between text-[10px] text-muted-foreground/70">
        <div className="flex items-center gap-1.5">
          <Clock className="h-3 w-3" />
          <span>{days}d open</span>
        </div>
        {wo.taskCardCount != null && wo.taskCardCount > 0 && (
          <span>
            {wo.completedTaskCardCount ?? 0}/{wo.taskCardCount} tasks
          </span>
        )}
      </div>

      {wo.promisedDeliveryDate && (
        <div className="flex items-center gap-1.5 text-[10px] mt-1">
          <span className={wo.promisedDeliveryDate < Date.now() ? "text-red-400 font-medium" : "text-muted-foreground/70"}>
            Due: {new Date(wo.promisedDeliveryDate).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })}
          </span>
        </div>
      )}
    </div>
  );
});

// ─── Main Kanban Page ───────────────────────────────────────────────────────

export default function KanbanPage() {
  const { orgId } = useCurrentOrg();
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const [aircraftFilter, setAircraftFilter] = useState<string>("all");
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  const [draggedWoId, setDraggedWoId] = useState<string | null>(null);

  const workOrders = useQuery(
    api.workOrders.getWorkOrdersWithScheduleRisk,
    orgId ? { organizationId: orgId } : "skip"
  );

  const updateStatus = useMutation(api.workOrders.updateWorkOrderStatus);

  // Get unique aircraft for filter
  const aircraftOptions = useMemo(() => {
    if (!workOrders) return [];
    const seen = new Set<string>();
    return workOrders
      .filter((wo) => wo.aircraft?.currentRegistration)
      .map((wo) => ({
        value: wo.aircraft!.currentRegistration!,
        label: `${wo.aircraft!.currentRegistration} (${wo.aircraft!.make} ${wo.aircraft!.model})`,
      }))
      .filter((opt) => {
        if (seen.has(opt.value)) return false;
        seen.add(opt.value);
        return true;
      });
  }, [workOrders]);

  // Count of voided/cancelled WOs excluded from the board.
  // BUG-SM-093: these WOs silently disappeared from the board — a shop manager
  // who just voided a WO would think the board was broken. Show a count so they
  // know where the WO went (and can use List View with "Complete" tab to see it).
  const hiddenTerminalCount = useMemo(() => {
    if (!workOrders) return 0;
    return workOrders.filter((wo) => wo.status === "voided" || wo.status === "cancelled").length;
  }, [workOrders]);

  // Filter work orders
  const filtered = useMemo(() => {
    if (!workOrders) return [];
    return workOrders.filter((wo) => {
      // Exclude terminal statuses except closed (shown in "complete" column)
      if (wo.status === "voided" || wo.status === "cancelled") return false;

      // Search filter
      if (search) {
        const q = search.toLowerCase();
        const matchesSearch =
          wo.workOrderNumber.toLowerCase().includes(q) ||
          wo.description.toLowerCase().includes(q) ||
          (wo.customerName && wo.customerName.toLowerCase().includes(q)) ||
          (wo.aircraft?.currentRegistration &&
            wo.aircraft.currentRegistration.toLowerCase().includes(q));
        if (!matchesSearch) return false;
      }

      // Aircraft filter
      if (aircraftFilter !== "all") {
        if (wo.aircraft?.currentRegistration !== aircraftFilter) return false;
      }

      return true;
    });
  }, [workOrders, search, aircraftFilter]);

  // Group by kanban column
  const columns = useMemo(() => {
    const groups: Record<string, WoCardData[]> = {};
    for (const col of KANBAN_COLUMNS) {
      groups[col.key] = [];
    }
    for (const wo of filtered) {
      const col = getKanbanColumn(wo.status);
      if (groups[col]) {
        groups[col].push({
          _id: wo._id,
          workOrderNumber: wo.workOrderNumber,
          status: wo.status,
          priority: wo.priority,
          description: wo.description,
          openedAt: wo.openedAt,
          customerName: wo.customerName,
          promisedDeliveryDate: wo.promisedDeliveryDate,
          taskCardCount: wo.taskCardCount,
          completedTaskCardCount: wo.completedTaskCardCount,
          aircraft: wo.aircraft,
        });
      }
    }
    // Sort each column: AOG first, then urgent, then routine; within same priority by days open
    const priorityOrder: Record<string, number> = { aog: 0, urgent: 1, routine: 2 };
    for (const col of Object.keys(groups)) {
      groups[col].sort((a, b) => {
        const pa = priorityOrder[a.priority] ?? 2;
        const pb = priorityOrder[b.priority] ?? 2;
        if (pa !== pb) return pa - pb;
        return a.openedAt - b.openedAt; // older first
      });
    }
    return groups;
  }, [filtered]);

  // ─── Drag handlers ──────────────────────────────────────────────────────

  // useCallback so WoCard (memo-wrapped) receives a stable reference and skips
  // re-rendering when only dragOverColumn / draggedWoId state changes.
  const handleDragStart = useCallback((e: DragEvent<HTMLDivElement>, woId: string) => {
    e.dataTransfer.setData("text/plain", woId);
    e.dataTransfer.effectAllowed = "move";
    setDraggedWoId(woId);
  }, []);

  function handleDragOver(e: DragEvent<HTMLDivElement>, columnKey: string) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverColumn(columnKey);
  }

  function handleDragLeave() {
    setDragOverColumn(null);
  }

  async function handleDrop(e: DragEvent<HTMLDivElement>, columnKey: string) {
    e.preventDefault();
    setDragOverColumn(null);
    setDraggedWoId(null);

    const woId = e.dataTransfer.getData("text/plain");
    if (!woId || !orgId) return;

    // Can't drop into "complete" column
    if (columnKey === "complete") {
      toast.error("Use the RTS workflow to close work orders.");
      return;
    }

    const newStatus = COLUMN_TO_STATUS[columnKey];
    if (!newStatus) return;

    // Find the WO to check if it's already in this column
    const wo = filtered.find((w) => w._id === woId);
    if (!wo) return;
    if (getKanbanColumn(wo.status) === columnKey) return; // same column

    // Can't move closed WOs
    if (wo.status === "closed") {
      toast.error("Closed work orders cannot be moved.");
      return;
    }

    // BUG-SM-HUNT-018: If dropping into "Pending Inspection" column and the WO
    // was already `pending_signoff`, preserve the sign-off state. Downgrading
    // from pending_signoff → pending_inspection silently reverts QCM readiness.
    let resolvedStatus = newStatus;
    if (columnKey === "pending_inspection" && wo.status === "pending_signoff") {
      resolvedStatus = "pending_signoff";
    }

    try {
      await updateStatus({
        workOrderId: woId as Id<"workOrders">,
        organizationId: orgId,
        newStatus: resolvedStatus as "draft" | "open" | "in_progress" | "on_hold" | "pending_inspection" | "pending_signoff" | "open_discrepancies" | "closed" | "cancelled" | "voided",
      });
      toast.success(`Moved to ${KANBAN_COLUMNS.find((c) => c.key === columnKey)?.label}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update status.");
    }
  }

  // ─── Loading state ────────────────────────────────────────────────────────

  if (!orgId || !workOrders) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <div className="flex gap-4 overflow-x-auto">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-[600px] w-[280px] flex-shrink-0" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/work-orders">
              <ArrowLeft className="h-4 w-4 mr-1" />
              List View
            </Link>
          </Button>
          <h1 className="text-lg sm:text-xl md:text-2xl font-semibold text-foreground">Work Orders — Kanban</h1>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search WO number, aircraft, customer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select value={aircraftFilter} onValueChange={setAircraftFilter}>
          <SelectTrigger className="w-[200px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="All Aircraft" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Aircraft</SelectItem>
            {aircraftOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Hidden terminal WO notice — only shows if there are voided/cancelled WOs */}
      {hiddenTerminalCount > 0 && (
        <p className="text-xs text-muted-foreground/70">
          {hiddenTerminalCount} voided or cancelled work order{hiddenTerminalCount !== 1 ? "s" : ""} hidden from board.{" "}
          <Link to="/work-orders" className="text-primary hover:underline">
            View in list →
          </Link>
        </p>
      )}

      {/* Kanban board */}
      <div className="flex gap-4 overflow-x-auto pb-4 -mx-2 px-2 md:-mx-6 md:px-6">
        {KANBAN_COLUMNS.map((col) => {
          const items = columns[col.key] || [];
          const isDropTarget = dragOverColumn === col.key;
          const isComplete = col.key === "complete";

          return (
            <Card
              key={col.key}
              className={cn(
                "flex-shrink-0 w-[280px] md:w-[300px] flex flex-col max-h-[calc(100vh-220px)]",
                `border-t-4 ${col.color}`,
                isDropTarget && !isComplete && "ring-2 ring-primary/50 bg-primary/5",
                isComplete && "opacity-80"
              )}
              onDragOver={(e) => handleDragOver(e, col.key)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, col.key)}
            >
              <CardHeader className="pb-2 pt-3 px-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold">{col.label}</CardTitle>
                  <Badge variant="secondary" className="text-xs">
                    {items.length}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto px-3 pb-3 space-y-2">
                {items.length === 0 ? (
                  <div className="text-xs text-muted-foreground/50 text-center py-8">
                    No work orders
                  </div>
                ) : (
                  items.map((wo) => (
                    <WoCard key={wo._id} wo={wo} onDragStart={handleDragStart} />
                  ))
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
