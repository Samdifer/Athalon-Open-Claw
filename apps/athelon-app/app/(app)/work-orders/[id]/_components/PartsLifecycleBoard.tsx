"use client";

import { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { PartStatusBadge } from "@/src/shared/components/PartStatusBadge";

export type PartsBoardColumn = "requested" | "ordered" | "received" | "issued" | "installed";

export type PartsBoardItem = {
  id: string;
  partNumber: string;
  partName: string;
  serialNumber?: string;
  supplier?: string;
  quantity?: number;
  status: PartsBoardColumn;
};

/** Shape of a workOrderParts record returned by the query. */
interface WoPartRecord {
  _id: string;
  partNumber: string;
  partName: string;
  status: string;
  quantityRequested: number;
}

const COLUMNS: { key: PartsBoardColumn; label: string }[] = [
  { key: "requested", label: "Requested" },
  { key: "ordered", label: "Ordered" },
  { key: "received", label: "Received" },
  { key: "issued", label: "Issued" },
  { key: "installed", label: "Installed" },
];

/**
 * Maps a workOrderParts status to the board column. Statuses like
 * "returned" and "cancelled" are excluded from the board.
 */
function mapWoPartStatusToColumn(
  status: string,
): PartsBoardColumn | null {
  switch (status) {
    case "requested":
      return "requested";
    case "ordered":
      return "ordered";
    case "received":
      return "received";
    case "issued":
      return "issued";
    case "installed":
      return "installed";
    default:
      return null; // cancelled, returned -- not shown on board
  }
}

interface PartsLifecycleBoardProps {
  /** Pass items directly (legacy prop-based usage) */
  items?: PartsBoardItem[];
  /** When provided, fetches live data from the workOrderParts table */
  workOrderId?: Id<"workOrders">;
}

export function PartsLifecycleBoard({ items, workOrderId }: PartsLifecycleBoardProps) {
  const [statusFilter, setStatusFilter] = useState<"all" | PartsBoardColumn>("all");

  // Fetch live data when workOrderId is provided.
  // NOTE: api.workOrderParts types resolve after `convex dev` regenerates
  // the API module. The cast below is safe and will be unnecessary once
  // the generated types include the new workOrderParts module.
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const woPartsData: WoPartRecord[] | undefined = useQuery(
    (api as any).workOrderParts?.listForWorkOrder,
    workOrderId ? { workOrderId } : "skip",
  ) as WoPartRecord[] | undefined;
  /* eslint-enable @typescript-eslint/no-explicit-any */

  // Transform workOrderParts records into board items
  const liveItems = useMemo<PartsBoardItem[]>(() => {
    if (!woPartsData) return [];
    return (woPartsData as WoPartRecord[])
      .map((record: WoPartRecord): PartsBoardItem | null => {
        const column = mapWoPartStatusToColumn(record.status);
        if (!column) return null;
        return {
          id: record._id,
          partNumber: record.partNumber,
          partName: record.partName,
          quantity: record.quantityRequested,
          status: column,
        };
      })
      .filter((item: PartsBoardItem | null): item is PartsBoardItem => item !== null);
  }, [woPartsData]);

  // Use live items if workOrderId was provided; otherwise use prop items
  const resolvedItems = workOrderId ? liveItems : (items ?? []);
  const isLoading = workOrderId !== undefined && woPartsData === undefined;

  const visibleItems = useMemo(
    () =>
      statusFilter === "all"
        ? resolvedItems
        : resolvedItems.filter((item) => item.status === statusFilter),
    [resolvedItems, statusFilter],
  );

  if (isLoading) {
    return (
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        {COLUMNS.map((column) => (
          <Card key={column.key} className="border-border/60 bg-muted/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold">{column.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <Skeleton className="h-16 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">Parts lifecycle flow</p>
        <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as "all" | PartsBoardColumn)}>
          <SelectTrigger className="h-8 w-[180px] text-xs">
            <SelectValue placeholder="Filter status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {COLUMNS.map((column) => (
              <SelectItem key={column.key} value={column.key}>
                {column.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        {COLUMNS.map((column) => {
          const columnItems = visibleItems.filter((item) => item.status === column.key);
          return (
            <Card key={column.key} className="border-border/60 bg-muted/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-semibold flex items-center justify-between">
                  <span>{column.label}</span>
                  <span className="text-muted-foreground">{columnItems.length}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {columnItems.length === 0 ? (
                  <p className="text-[11px] text-muted-foreground">No parts</p>
                ) : (
                  columnItems.map((item) => (
                    <div key={item.id} className="rounded-md border border-border/60 bg-background p-2.5 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-[11px] font-semibold truncate">{item.partNumber}</span>
                        <PartStatusBadge status={item.status} />
                      </div>
                      <p className="text-xs text-foreground truncate">{item.partName}</p>
                      <div className="flex flex-wrap gap-2 text-[10px] text-muted-foreground">
                        {item.serialNumber && <span>S/N {item.serialNumber}</span>}
                        {typeof item.quantity === "number" && <span>Qty {item.quantity}</span>}
                        {item.supplier && <span>{item.supplier}</span>}
                      </div>
                    </div>
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
