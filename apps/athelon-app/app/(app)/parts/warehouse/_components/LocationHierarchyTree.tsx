"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import {
  Building2,
  Server,
  LayoutGrid,
  Box,
  Plus,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible";
import { CreateLocationDialog } from "./CreateLocationDialog";
import { BinDetailSheet } from "./BinDetailSheet";

interface LocationHierarchyTreeProps {
  warehouseId: string;
}

// ─── Bin Level ───────────────────────────────────────────────────────────────

function BinItem({
  bin,
  onSelect,
}: {
  bin: { _id: Id<"warehouseBins">; name: string; code: string; barcode?: string };
  onSelect: (binId: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(bin._id)}
      className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent transition-colors text-left"
    >
      <Box className="h-3.5 w-3.5 text-amber-600 flex-shrink-0" />
      <span className="truncate">{bin.name}</span>
      <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 flex-shrink-0">
        {bin.code}
      </Badge>
      {bin.barcode && (
        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 flex-shrink-0">
          {bin.barcode}
        </Badge>
      )}
    </button>
  );
}

// ─── Shelf Location Level ────────────────────────────────────────────────────

function ShelfLocationNode({
  shelfLocation,
  onSelectBin,
}: {
  shelfLocation: {
    _id: Id<"warehouseShelfLocations">;
    name: string;
    code: string;
  };
  onSelectBin: (binId: string) => void;
}) {
  const { orgId } = useCurrentOrg();
  const [isOpen, setIsOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const bins = useQuery(
    api.warehouseLocations.listBins,
    orgId && isOpen
      ? { organizationId: orgId, shelfLocationId: shelfLocation._id }
      : "skip",
  );

  return (
    <>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div className="flex items-center group">
          <CollapsibleTrigger className="flex flex-1 items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent transition-colors">
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 data-[state=open]:rotate-90" style={{ transform: isOpen ? "rotate(90deg)" : undefined }} />
            <LayoutGrid className="h-3.5 w-3.5 text-violet-600 flex-shrink-0" />
            <span className="truncate">{shelfLocation.name}</span>
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 flex-shrink-0">
              {shelfLocation.code}
            </Badge>
          </CollapsibleTrigger>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
            onClick={(e) => {
              e.stopPropagation();
              setCreateDialogOpen(true);
            }}
            title="Add Bin"
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>
        <CollapsibleContent>
          <div className="ml-6 border-l border-border/50 pl-3 space-y-0.5 py-1">
            {bins === undefined && isOpen && (
              <div className="space-y-1 py-1">
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-6 w-36" />
              </div>
            )}
            {bins && bins.length === 0 && (
              <p className="text-xs text-muted-foreground py-1 px-2">No bins</p>
            )}
            {bins?.map((bin) => (
              <BinItem key={bin._id} bin={bin} onSelect={onSelectBin} />
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>

      <CreateLocationDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        level="bin"
        parentId={shelfLocation._id}
      />
    </>
  );
}

// ─── Shelf Level ─────────────────────────────────────────────────────────────

function ShelfNode({
  shelf,
  onSelectBin,
}: {
  shelf: { _id: Id<"warehouseShelves">; name: string; code: string };
  onSelectBin: (binId: string) => void;
}) {
  const { orgId } = useCurrentOrg();
  const [isOpen, setIsOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const shelfLocations = useQuery(
    api.warehouseLocations.listShelfLocations,
    orgId && isOpen
      ? { organizationId: orgId, shelfId: shelf._id }
      : "skip",
  );

  return (
    <>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div className="flex items-center group">
          <CollapsibleTrigger className="flex flex-1 items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent transition-colors">
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground transition-transform duration-200" style={{ transform: isOpen ? "rotate(90deg)" : undefined }} />
            <Server className="h-3.5 w-3.5 text-blue-600 flex-shrink-0" />
            <span className="truncate">{shelf.name}</span>
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 flex-shrink-0">
              {shelf.code}
            </Badge>
          </CollapsibleTrigger>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
            onClick={(e) => {
              e.stopPropagation();
              setCreateDialogOpen(true);
            }}
            title="Add Shelf Location"
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>
        <CollapsibleContent>
          <div className="ml-6 border-l border-border/50 pl-3 space-y-0.5 py-1">
            {shelfLocations === undefined && isOpen && (
              <div className="space-y-1 py-1">
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-6 w-36" />
              </div>
            )}
            {shelfLocations && shelfLocations.length === 0 && (
              <p className="text-xs text-muted-foreground py-1 px-2">No shelf locations</p>
            )}
            {shelfLocations?.map((sl) => (
              <ShelfLocationNode
                key={sl._id}
                shelfLocation={sl}
                onSelectBin={onSelectBin}
              />
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>

      <CreateLocationDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        level="shelfLocation"
        parentId={shelf._id}
      />
    </>
  );
}

// ─── Area Level ──────────────────────────────────────────────────────────────

function AreaNode({
  area,
  onSelectBin,
}: {
  area: { _id: Id<"warehouseAreas">; name: string; code: string; areaType?: string };
  onSelectBin: (binId: string) => void;
}) {
  const { orgId } = useCurrentOrg();
  const [isOpen, setIsOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const shelves = useQuery(
    api.warehouseLocations.listShelves,
    orgId && isOpen
      ? { organizationId: orgId, areaId: area._id }
      : "skip",
  );

  return (
    <>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div className="flex items-center group">
          <CollapsibleTrigger className="flex flex-1 items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent transition-colors">
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground transition-transform duration-200" style={{ transform: isOpen ? "rotate(90deg)" : undefined }} />
            <Building2 className="h-3.5 w-3.5 text-emerald-600 flex-shrink-0" />
            <span className="truncate font-medium">{area.name}</span>
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 flex-shrink-0">
              {area.code}
            </Badge>
            {area.areaType && area.areaType !== "general" && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 flex-shrink-0">
                {area.areaType.replace("_", " ")}
              </Badge>
            )}
          </CollapsibleTrigger>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
            onClick={(e) => {
              e.stopPropagation();
              setCreateDialogOpen(true);
            }}
            title="Add Shelf"
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>
        <CollapsibleContent>
          <div className="ml-6 border-l border-border/50 pl-3 space-y-0.5 py-1">
            {shelves === undefined && isOpen && (
              <div className="space-y-1 py-1">
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-6 w-36" />
              </div>
            )}
            {shelves && shelves.length === 0 && (
              <p className="text-xs text-muted-foreground py-1 px-2">No shelves</p>
            )}
            {shelves?.map((shelf) => (
              <ShelfNode
                key={shelf._id}
                shelf={shelf}
                onSelectBin={onSelectBin}
              />
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>

      <CreateLocationDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        level="shelf"
        parentId={area._id}
      />
    </>
  );
}

// ─── Root: LocationHierarchyTree ─────────────────────────────────────────────

export function LocationHierarchyTree({ warehouseId }: LocationHierarchyTreeProps) {
  const { orgId } = useCurrentOrg();
  const [createAreaOpen, setCreateAreaOpen] = useState(false);
  const [selectedBinId, setSelectedBinId] = useState<string | null>(null);

  const areas = useQuery(
    api.warehouseLocations.listAreas,
    orgId
      ? {
          organizationId: orgId,
          warehouseId: warehouseId as Id<"warehouses">,
        }
      : "skip",
  );

  if (areas === undefined) {
    return (
      <div className="space-y-3 p-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-6 w-3/4" />
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {/* Header with Add Area button */}
      <div className="flex items-center justify-between px-2 pb-2">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Location Hierarchy
        </h3>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 gap-1.5 text-xs"
          onClick={() => setCreateAreaOpen(true)}
        >
          <Plus className="h-3.5 w-3.5" />
          Add Area
        </Button>
      </div>

      {areas.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <Building2 className="h-10 w-10 mb-3 opacity-40" />
          <p className="text-sm font-medium">No areas yet</p>
          <p className="text-xs mt-1">Create areas to organize this warehouse.</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-4 gap-1.5"
            onClick={() => setCreateAreaOpen(true)}
          >
            <Plus className="h-3.5 w-3.5" />
            Add First Area
          </Button>
        </div>
      ) : (
        <div className="space-y-0.5">
          {areas.map((area) => (
            <AreaNode
              key={area._id}
              area={area}
              onSelectBin={setSelectedBinId}
            />
          ))}
        </div>
      )}

      {/* Create Area Dialog */}
      <CreateLocationDialog
        open={createAreaOpen}
        onOpenChange={setCreateAreaOpen}
        level="area"
        parentId={warehouseId}
      />

      {/* Bin Detail Sheet */}
      <BinDetailSheet
        binId={selectedBinId}
        onClose={() => setSelectedBinId(null)}
      />
    </div>
  );
}
