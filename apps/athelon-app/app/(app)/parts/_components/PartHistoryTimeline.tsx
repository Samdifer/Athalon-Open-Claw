"use client";

/**
 * PartHistoryTimeline.tsx
 * Inventory Phase 3: Part Lifecycle History
 *
 * Vertical timeline component showing the full audit trail for a part.
 * Each event is displayed with a color-coded icon, description, timestamp,
 * and linked references (work orders, aircraft, etc.).
 *
 * Supports FAA traceability and chain-of-custody requirements per
 * 14 CFR Part 145.
 */

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  PackagePlus,
  CheckCircle,
  Warehouse,
  ArrowRight,
  Bookmark,
  Wrench,
  ArrowLeftRight,
  AlertTriangle,
  ShieldAlert,
  Trash2,
  PackageOpen,
  RotateCcw,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateTime } from "@/lib/format";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface PartHistoryTimelineProps {
  partId: Id<"parts">;
}

type EventType =
  | "received"
  | "inspected"
  | "stocked"
  | "moved"
  | "reserved"
  | "installed"
  | "removed"
  | "shelf_life_alert"
  | "quarantined"
  | "scrapped"
  | "issued"
  | "returned";

// ─── Event Configuration ────────────────────────────────────────────────────

const EVENT_CONFIG: Record<
  EventType,
  {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    dotColor: string;
    lineColor: string;
  }
> = {
  received: {
    icon: PackagePlus,
    label: "Received",
    dotColor: "bg-green-500",
    lineColor: "text-green-500",
  },
  inspected: {
    icon: CheckCircle,
    label: "Inspected",
    dotColor: "bg-green-500",
    lineColor: "text-green-500",
  },
  stocked: {
    icon: Warehouse,
    label: "Stocked",
    dotColor: "bg-green-500",
    lineColor: "text-green-500",
  },
  moved: {
    icon: ArrowLeftRight,
    label: "Moved",
    dotColor: "bg-blue-500",
    lineColor: "text-blue-500",
  },
  reserved: {
    icon: Bookmark,
    label: "Reserved",
    dotColor: "bg-blue-500",
    lineColor: "text-blue-500",
  },
  installed: {
    icon: Wrench,
    label: "Installed",
    dotColor: "bg-green-500",
    lineColor: "text-green-500",
  },
  removed: {
    icon: ArrowRight,
    label: "Removed",
    dotColor: "bg-blue-500",
    lineColor: "text-blue-500",
  },
  shelf_life_alert: {
    icon: AlertTriangle,
    label: "Shelf Life Alert",
    dotColor: "bg-amber-500",
    lineColor: "text-amber-500",
  },
  quarantined: {
    icon: ShieldAlert,
    label: "Quarantined",
    dotColor: "bg-red-500",
    lineColor: "text-red-500",
  },
  scrapped: {
    icon: Trash2,
    label: "Scrapped",
    dotColor: "bg-red-500",
    lineColor: "text-red-500",
  },
  issued: {
    icon: PackageOpen,
    label: "Issued",
    dotColor: "bg-blue-500",
    lineColor: "text-blue-500",
  },
  returned: {
    icon: RotateCcw,
    label: "Returned",
    dotColor: "bg-blue-500",
    lineColor: "text-blue-500",
  },
};

// ─── Timeline Event Row ─────────────────────────────────────────────────────

function TimelineEvent({
  event,
  isLast,
}: {
  event: {
    _id: string;
    eventType: EventType;
    notes?: string;
    performedByUserId?: string;
    workOrderId?: Id<"workOrders">;
    aircraftId?: Id<"aircraft">;
    lotId?: Id<"lots">;
    fromLocation?: string;
    toLocation?: string;
    timestamp: number;
  };
  isLast: boolean;
}) {
  const config = EVENT_CONFIG[event.eventType] ?? EVENT_CONFIG.received;
  const IconComponent = config.icon;

  return (
    <div className="flex gap-3">
      {/* Timeline track */}
      <div className="flex flex-col items-center flex-shrink-0">
        <div
          className={`w-7 h-7 rounded-full flex items-center justify-center ${config.dotColor}`}
        >
          <IconComponent className="w-3.5 h-3.5 text-white" />
        </div>
        {!isLast && (
          <div className="w-px flex-1 bg-border/60 min-h-[24px]" />
        )}
      </div>

      {/* Event content */}
      <div className="pb-5 min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-medium text-foreground">
            {config.label}
          </span>
          <span className="text-[10px] text-muted-foreground">
            {formatDateTime(event.timestamp)}
          </span>
        </div>

        {/* Notes */}
        {event.notes && (
          <p className="text-xs text-muted-foreground mt-0.5">
            {event.notes}
          </p>
        )}

        {/* Location change */}
        {event.fromLocation && event.toLocation && (
          <p className="text-[10px] text-muted-foreground mt-0.5">
            {event.fromLocation} → {event.toLocation}
          </p>
        )}

        {/* References */}
        <div className="flex items-center gap-2 flex-wrap mt-1">
          {event.performedByUserId && (
            <span className="text-[10px] text-muted-foreground bg-muted/50 rounded px-1.5 py-0.5">
              User: {event.performedByUserId.slice(0, 12)}...
            </span>
          )}
          {event.workOrderId && (
            <span className="text-[10px] text-muted-foreground bg-muted/50 rounded px-1.5 py-0.5">
              WO: {String(event.workOrderId).slice(0, 12)}...
            </span>
          )}
          {event.aircraftId && (
            <span className="text-[10px] text-muted-foreground bg-muted/50 rounded px-1.5 py-0.5">
              A/C: {String(event.aircraftId).slice(0, 12)}...
            </span>
          )}
          {event.lotId && (
            <span className="text-[10px] text-muted-foreground bg-muted/50 rounded px-1.5 py-0.5">
              Lot: {String(event.lotId).slice(0, 12)}...
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function PartHistoryTimeline({ partId }: PartHistoryTimelineProps) {
  const history = useQuery(api.partHistory.listHistoryForPart, { partId });

  if (history === undefined) {
    return (
      <div className="space-y-3 py-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-3">
            <Skeleton className="w-7 h-7 rounded-full flex-shrink-0" />
            <div className="flex-1 space-y-1">
              <Skeleton className="h-3 w-32" />
              <Skeleton className="h-3 w-48" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="py-8 text-center">
        <PackagePlus className="w-6 h-6 text-muted-foreground/30 mx-auto mb-2" />
        <p className="text-xs text-muted-foreground">No history recorded</p>
        <p className="text-[11px] text-muted-foreground/60 mt-0.5">
          Part lifecycle events will appear here as they occur.
        </p>
      </div>
    );
  }

  return (
    <div className="py-2">
      {history.map((event, idx) => (
        <TimelineEvent
          key={event._id}
          event={{ ...event, timestamp: (event as unknown as { timestamp?: number }).timestamp ?? event._creationTime } as Parameters<typeof TimelineEvent>[0]["event"]}
          isLast={idx === history.length - 1}
        />
      ))}
    </div>
  );
}
