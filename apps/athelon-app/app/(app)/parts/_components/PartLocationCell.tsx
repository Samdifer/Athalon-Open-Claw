"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Skeleton } from "@/components/ui/skeleton";
import { MapPin } from "lucide-react";

interface PartLocationCellProps {
  binLocationId?: string;
  legacyBinLocation?: string; // Fallback flat string like "A-3-B-12"
}

function BinLocationDisplay({ binId }: { binId: string }) {
  const bin = useQuery(api.warehouseLocations.getBin, {
    binId: binId as Id<"warehouseBins">,
  });

  if (bin === undefined) {
    return <Skeleton className="h-4 w-24 inline-block" />;
  }

  if (bin === null) {
    return (
      <span className="text-sm text-muted-foreground flex items-center gap-1.5">
        <MapPin className="size-3.5 shrink-0 text-muted-foreground/70" />
        Unknown bin
      </span>
    );
  }

  return (
    <span className="text-sm flex items-center gap-1.5">
      <MapPin className="size-3.5 shrink-0 text-muted-foreground/70" />
      {bin.displayPath ?? bin.name}
    </span>
  );
}

export function PartLocationCell({
  binLocationId,
  legacyBinLocation,
}: PartLocationCellProps) {
  // Prefer structured bin location over legacy flat string
  if (binLocationId) {
    return <BinLocationDisplay binId={binLocationId} />;
  }

  // Fallback to legacy flat string
  if (legacyBinLocation) {
    return (
      <span className="text-sm text-muted-foreground flex items-center gap-1.5">
        <MapPin className="size-3.5 shrink-0 text-muted-foreground/70" />
        {legacyBinLocation}
      </span>
    );
  }

  // No location data at all
  return (
    <span className="text-sm text-muted-foreground">&mdash;</span>
  );
}
