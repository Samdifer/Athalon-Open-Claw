"use client";

import type { Id } from "@/convex/_generated/dataModel";
import { Package } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { PartStatusBadge } from "@/src/shared/components/PartStatusBadge";
import { resolvePartThumbnailUrl } from "@/src/shared/lib/demo-thumbnails";

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
  unitCost?: number;
  isOwnerSupplied: boolean;
  isLifeLimited: boolean;
}

const CONDITION_LABEL: Record<string, string> = {
  new: "New",
  serviceable: "Serviceable",
  overhauled: "OH",
  repaired: "Repaired",
  unserviceable: "Unserviceable",
  quarantine: "Quarantine",
  scrapped: "Scrapped",
};

function getConditionStyles(condition: string): string {
  const map: Record<string, string> = {
    new: "bg-green-500/15 text-green-600 dark:text-green-400 border-green-500/30",
    serviceable: "bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30",
    overhauled: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30",
    repaired: "bg-teal-500/15 text-teal-600 dark:text-teal-400 border-teal-500/30",
    unserviceable: "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30",
    quarantine: "bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30",
    scrapped: "bg-slate-500/15 text-slate-500 dark:text-slate-400 border-slate-500/30",
  };
  return map[condition] ?? "bg-muted text-muted-foreground";
}

interface PartsTileViewProps {
  parts: PartDoc[];
  thumbnails: Record<string, string | null> | undefined;
  onPartClick: (part: PartDoc) => void;
  canViewCost: boolean;
}

export function PartsTileView({
  parts,
  thumbnails,
  onPartClick,
  canViewCost,
}: PartsTileViewProps) {
  if (parts.length === 0) {
    return (
      <div className="py-16 text-center">
        <Package className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
        <p className="text-sm font-medium text-muted-foreground">No parts found</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3">
      {parts.map((part) => {
        const thumbUrl = thumbnails?.[String(part._id)] ?? null;
        const resolvedThumbUrl = resolvePartThumbnailUrl({
          imageUrl: thumbUrl,
          partNumber: part.partNumber,
          partName: part.partName,
          description: part.description,
          serialNumber: part.serialNumber,
          condition: part.condition,
          location: part.location,
          isSerialized: part.isSerialized,
          isLifeLimited: part.isLifeLimited,
          isOwnerSupplied: part.isOwnerSupplied,
        });
        const qty = part.quantityOnHand ?? part.quantity;
        const isInventory = part.location === "inventory";

        return (
          <Card
            key={part._id}
            className="border-border/60 hover:border-primary/30 hover:shadow-md transition-all cursor-pointer overflow-hidden"
            onClick={() => onPartClick(part)}
          >
            {/* Image area */}
            <div className="aspect-[4/3] bg-muted/20 relative overflow-hidden">
              <img
                src={resolvedThumbUrl}
                alt={part.partName}
                className="w-full h-full object-cover"
                loading="lazy"
              />
              {/* Condition badge overlay */}
              <div className="absolute top-1.5 right-1.5">
                <Badge
                  variant="outline"
                  className={`text-[9px] border font-medium backdrop-blur-sm bg-background/70 ${getConditionStyles(part.condition)}`}
                >
                  {CONDITION_LABEL[part.condition] ?? part.condition}
                </Badge>
              </div>
            </div>

            {/* Info area */}
            <div className="p-2.5 space-y-1">
              <p className="font-mono text-xs font-semibold text-foreground truncate">
                {part.partNumber}
              </p>
              <p className="text-xs text-muted-foreground truncate leading-tight">
                {part.partName}
              </p>
              <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                <PartStatusBadge status={part.location} />
                {!part.isSerialized && isInventory && qty != null && (
                  <span className="text-[10px] font-medium text-foreground">
                    Qty: {qty}
                  </span>
                )}
                {part.serialNumber && (
                  <span className="text-[10px] font-mono text-muted-foreground truncate">
                    S/N {part.serialNumber}
                  </span>
                )}
              </div>
              {canViewCost && part.unitCost != null && (
                <p className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                  ${part.unitCost.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
