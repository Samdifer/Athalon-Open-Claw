"use client";

import { useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Package } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface LotPickerProps {
  organizationId: Id<"organizations">;
  partNumber: string;
  onSelect: (
    lotId: Id<"lots">,
    lotNumber: string,
    remainingQty: number,
  ) => void;
  value?: Id<"lots"> | null;
  disabled?: boolean;
  className?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function LotPicker({
  organizationId,
  partNumber,
  onSelect,
  value,
  disabled = false,
  className,
}: LotPickerProps) {
  const lots = useQuery(api.partSearch.listAvailableLots, {
    organizationId,
    partNumber,
  });

  // Auto-select if only one lot available
  useEffect(() => {
    if (lots && lots.length === 1 && !value) {
      const lot = lots[0];
      onSelect(lot._id, lot.lotNumber, lot.remainingQuantity);
    }
  }, [lots, value, onSelect]);

  if (lots === undefined) {
    return (
      <div className={`text-xs text-muted-foreground ${className ?? ""}`}>
        Loading lots...
      </div>
    );
  }

  if (lots.length === 0) {
    return (
      <div
        className={`flex items-center gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-600 dark:text-amber-400 ${className ?? ""}`}
      >
        <Package className="w-3.5 h-3.5 flex-shrink-0" />
        No available lots for this part number. Parts department must receive
        stock first.
      </div>
    );
  }

  function formatDate(ts: number): string {
    return new Date(ts).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "2-digit",
    });
  }

  return (
    <Select
      value={value ?? ""}
      onValueChange={(val) => {
        const lot = lots.find((l) => l._id === val);
        if (lot) onSelect(lot._id, lot.lotNumber, lot.remainingQuantity);
      }}
      disabled={disabled}
    >
      <SelectTrigger className={`h-8 text-xs border-border/60 ${className ?? ""}`}>
        <SelectValue placeholder="Select lot..." />
      </SelectTrigger>
      <SelectContent>
        {lots.map((lot) => (
          <SelectItem key={lot._id} value={lot._id}>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[11px] font-medium">
                {lot.lotNumber}
              </span>
              <span className="text-[10px] text-muted-foreground">
                Qty {lot.remainingQuantity}
              </span>
              <span className="text-[10px] text-muted-foreground capitalize">
                {lot.condition}
              </span>
              {lot.shelfLifeExpiryDate && (
                <span className="text-[10px] text-amber-600 dark:text-amber-400">
                  Exp {formatDate(lot.shelfLifeExpiryDate)}
                </span>
              )}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
