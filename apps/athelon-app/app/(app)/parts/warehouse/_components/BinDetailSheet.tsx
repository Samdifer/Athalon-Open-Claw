"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import { Package, Barcode, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";

interface BinDetailSheetProps {
  binId: string | null;
  onClose: () => void;
}

function conditionBadgeVariant(condition: string | undefined): "default" | "secondary" | "destructive" | "outline" {
  switch (condition) {
    case "serviceable":
    case "new":
      return "default";
    case "unserviceable":
    case "scrap":
      return "destructive";
    case "overhauled":
    case "repaired":
      return "secondary";
    default:
      return "outline";
  }
}

function PartsTable({ binId }: { binId: Id<"warehouseBins"> }) {
  const { orgId } = useCurrentOrg();

  const parts = useQuery(
    api.warehouseLocations.listPartsInBin,
    orgId ? { organizationId: orgId, binLocationId: binId } : "skip",
  );

  if (parts === undefined) {
    return (
      <div className="space-y-3 p-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  if (parts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <Package className="h-10 w-10 mb-3 opacity-40" />
        <p className="text-sm font-medium">No parts in this bin</p>
        <p className="text-xs mt-1">Parts assigned to this bin will appear here.</p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Part #</TableHead>
          <TableHead>Name</TableHead>
          <TableHead>S/N</TableHead>
          <TableHead>Condition</TableHead>
          <TableHead className="text-right">Qty</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {parts.map((part) => (
          <TableRow key={part._id}>
            <TableCell className="font-mono text-xs">
              {(part as Record<string, unknown>).partNumber as string ?? "-"}
            </TableCell>
            <TableCell className="max-w-[160px] truncate">
              {(part as Record<string, unknown>).name as string ?? (part as Record<string, unknown>).description as string ?? "-"}
            </TableCell>
            <TableCell className="font-mono text-xs">
              {(part as Record<string, unknown>).serialNumber as string ?? "-"}
            </TableCell>
            <TableCell>
              <Badge variant={conditionBadgeVariant((part as Record<string, unknown>).condition as string | undefined)}>
                {((part as Record<string, unknown>).condition as string) ?? "unknown"}
              </Badge>
            </TableCell>
            <TableCell className="text-right">
              {(part as Record<string, unknown>).quantity as number ?? 1}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function LotsTable({ binId }: { binId: Id<"warehouseBins"> }) {
  const { orgId } = useCurrentOrg();

  const lots = useQuery(
    api.warehouseLocations.listLotsInBin,
    orgId ? { organizationId: orgId, binLocationId: binId } : "skip",
  );

  if (lots === undefined) {
    return (
      <div className="space-y-3 p-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  if (lots.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <Package className="h-10 w-10 mb-3 opacity-40" />
        <p className="text-sm font-medium">No lots in this bin</p>
        <p className="text-xs mt-1">Lots assigned to this bin will appear here.</p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Lot #</TableHead>
          <TableHead>Part #</TableHead>
          <TableHead className="text-right">Remaining Qty</TableHead>
          <TableHead>Condition</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {lots.map((lot) => (
          <TableRow key={lot._id}>
            <TableCell className="font-mono text-xs">
              {(lot as Record<string, unknown>).lotNumber as string ?? "-"}
            </TableCell>
            <TableCell className="font-mono text-xs">
              {(lot as Record<string, unknown>).partNumber as string ?? "-"}
            </TableCell>
            <TableCell className="text-right">
              {(lot as Record<string, unknown>).remainingQuantity as number ?? (lot as Record<string, unknown>).quantity as number ?? 0}
            </TableCell>
            <TableCell>
              <Badge variant={conditionBadgeVariant((lot as Record<string, unknown>).condition as string | undefined)}>
                {((lot as Record<string, unknown>).condition as string) ?? "unknown"}
              </Badge>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export function BinDetailSheet({ binId, onClose }: BinDetailSheetProps) {
  const binFullPath = useQuery(
    api.warehouseLocations.getBinFullPath,
    binId ? { binId: binId as Id<"warehouseBins"> } : "skip",
  );

  const isOpen = binId !== null;

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            {binFullPath ? binFullPath.bin.name : <Skeleton className="h-5 w-32" />}
          </SheetTitle>
          <SheetDescription>
            {binFullPath ? (
              <span className="flex items-center gap-1.5 text-xs">
                <MapPin className="h-3 w-3" />
                {binFullPath.displayPath}
              </span>
            ) : (
              <Skeleton className="h-4 w-48" />
            )}
          </SheetDescription>
        </SheetHeader>

        {binFullPath && (
          <div className="space-y-4 px-4 pb-4">
            {/* Metadata */}
            <div className="grid grid-cols-2 gap-3 rounded-lg border p-3">
              <div>
                <p className="text-xs text-muted-foreground">Code</p>
                <p className="text-sm font-medium">{binFullPath.bin.code}</p>
              </div>
              {binFullPath.bin.barcode && (
                <div>
                  <p className="text-xs text-muted-foreground">Barcode</p>
                  <p className="text-sm font-medium flex items-center gap-1.5">
                    <Barcode className="h-3.5 w-3.5 text-muted-foreground" />
                    {binFullPath.bin.barcode}
                  </p>
                </div>
              )}
              <div>
                <p className="text-xs text-muted-foreground">Warehouse</p>
                <p className="text-sm">{binFullPath.warehouseName}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Area</p>
                <p className="text-sm">{binFullPath.areaName}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Shelf</p>
                <p className="text-sm">{binFullPath.shelfName}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Location</p>
                <p className="text-sm">{binFullPath.shelfLocationName}</p>
              </div>
            </div>

            {/* Contents Tabs */}
            <Tabs defaultValue="parts">
              <TabsList className="w-full">
                <TabsTrigger value="parts" className="flex-1">
                  Parts
                </TabsTrigger>
                <TabsTrigger value="lots" className="flex-1">
                  Lots
                </TabsTrigger>
              </TabsList>
              <TabsContent value="parts">
                <PartsTable binId={binId as Id<"warehouseBins">} />
              </TabsContent>
              <TabsContent value="lots">
                <LotsTable binId={binId as Id<"warehouseBins">} />
              </TabsContent>
            </Tabs>
          </div>
        )}

        {binId && !binFullPath && (
          <div className="space-y-4 px-4">
            <Skeleton className="h-32 w-full rounded-lg" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
