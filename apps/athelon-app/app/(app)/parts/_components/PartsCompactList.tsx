"use client";

import type { Id } from "@/convex/_generated/dataModel";
import { Package } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface PartDoc {
  _id: Id<"parts">;
  partNumber: string;
  partName: string;
  description?: string;
  serialNumber?: string;
  isSerialized?: boolean;
  condition: string;
  location: string;
  quantityOnHand?: number;
  quantity?: number;
  partCategory?: string;
  binLocation?: string;
  binLocationId?: Id<"warehouseBins">;
  unitCost?: number;
  isOwnerSupplied: boolean;
  isLifeLimited: boolean;
}

const CONDITION_COLOR: Record<string, string> = {
  new: "text-green-600 dark:text-green-400",
  serviceable: "text-sky-600 dark:text-sky-400",
  overhauled: "text-blue-600 dark:text-blue-400",
  repaired: "text-teal-600 dark:text-teal-400",
  unserviceable: "text-red-600 dark:text-red-400",
  quarantine: "text-orange-600 dark:text-orange-400",
  scrapped: "text-slate-500 dark:text-slate-400",
};

const CONDITION_LABEL: Record<string, string> = {
  new: "New",
  serviceable: "Svc",
  overhauled: "OH",
  repaired: "Rep",
  unserviceable: "U/S",
  quarantine: "Quar",
  scrapped: "Scrap",
};

const LOCATION_LABEL: Record<string, string> = {
  pending_inspection: "Pending",
  inventory: "In Stock",
  installed: "Installed",
  removed_pending_disposition: "Disposition",
  quarantine: "Quarantine",
  scrapped: "Scrapped",
  returned_to_vendor: "Returned",
};

interface PartsCompactListProps {
  parts: PartDoc[];
  onPartClick: (part: PartDoc) => void;
  canViewCost: boolean;
}

export function PartsCompactList({
  parts,
  onPartClick,
  canViewCost,
}: PartsCompactListProps) {
  if (parts.length === 0) {
    return (
      <div className="py-16 text-center">
        <Package className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
        <p className="text-sm font-medium text-muted-foreground">No parts found</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border/60 overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/20">
            <TableHead className="py-1.5 text-[10px]">P/N</TableHead>
            <TableHead className="py-1.5 text-[10px]">Name</TableHead>
            <TableHead className="py-1.5 text-[10px]">S/N</TableHead>
            <TableHead className="py-1.5 text-[10px]">Cond</TableHead>
            <TableHead className="py-1.5 text-[10px]">Location</TableHead>
            <TableHead className="py-1.5 text-[10px]">Qty</TableHead>
            <TableHead className="py-1.5 text-[10px]">Bin</TableHead>
            {canViewCost && <TableHead className="py-1.5 text-[10px]">Cost</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {parts.map((part) => {
            const qty = part.quantityOnHand ?? part.quantity;
            return (
              <TableRow
                key={part._id}
                className="cursor-pointer hover:bg-muted/10 transition-colors"
                onClick={() => onPartClick(part)}
              >
                <TableCell className="py-1 font-mono text-xs font-semibold">
                  {part.partNumber}
                </TableCell>
                <TableCell className="py-1 text-xs max-w-[200px] truncate">
                  {part.partName}
                </TableCell>
                <TableCell className="py-1 font-mono text-xs text-muted-foreground">
                  {part.serialNumber ?? "—"}
                </TableCell>
                <TableCell className={`py-1 text-xs font-medium ${CONDITION_COLOR[part.condition] ?? "text-muted-foreground"}`}>
                  {CONDITION_LABEL[part.condition] ?? part.condition}
                </TableCell>
                <TableCell className="py-1 text-xs text-muted-foreground">
                  {LOCATION_LABEL[part.location] ?? part.location}
                </TableCell>
                <TableCell className="py-1 text-xs font-medium">
                  {qty != null ? qty : "—"}
                </TableCell>
                <TableCell className="py-1 font-mono text-xs text-muted-foreground">
                  {part.binLocation ?? "—"}
                </TableCell>
                {canViewCost && (
                  <TableCell className="py-1 text-xs text-emerald-600 dark:text-emerald-400">
                    {part.unitCost != null
                      ? `$${part.unitCost.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                      : "—"}
                  </TableCell>
                )}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
