"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

const COLUMNS: { key: PartsBoardColumn; label: string }[] = [
  { key: "requested", label: "Requested" },
  { key: "ordered", label: "Ordered" },
  { key: "received", label: "Received" },
  { key: "issued", label: "Issued" },
  { key: "installed", label: "Installed" },
];

export function PartsLifecycleBoard({ items }: { items: PartsBoardItem[] }) {
  const [statusFilter, setStatusFilter] = useState<"all" | PartsBoardColumn>("all");

  const visibleItems = useMemo(
    () =>
      statusFilter === "all" ? items : items.filter((item) => item.status === statusFilter),
    [items, statusFilter],
  );

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
