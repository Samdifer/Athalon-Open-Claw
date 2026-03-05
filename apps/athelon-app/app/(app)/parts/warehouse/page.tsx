"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import {
  Warehouse,
  Plus,
  MapPin,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

import { LocationHierarchyTree } from "./_components/LocationHierarchyTree";
import { CreateLocationDialog } from "./_components/CreateLocationDialog";

export default function WarehouseLocationsPage() {
  const { orgId } = useCurrentOrg();
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const warehouses = useQuery(
    api.warehouseLocations.listWarehouses,
    orgId ? { organizationId: orgId } : "skip",
  );

  const isLoading = warehouses === undefined;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b">
        <div className="flex items-center gap-3">
          <Warehouse className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-xl font-semibold">Warehouse Locations</h1>
            <p className="text-sm text-muted-foreground">
              Manage warehouse hierarchy: areas, shelves, locations, and bins
            </p>
          </div>
        </div>
        <Button className="gap-1.5" onClick={() => setCreateDialogOpen(true)}>
          <Plus className="h-4 w-4" />
          Add Warehouse
        </Button>
      </div>

      {/* Content: Two-panel layout */}
      <div className="flex flex-1 min-h-0">
        {/* Left Panel: Warehouse List */}
        <div className="w-80 border-r flex flex-col min-h-0">
          <div className="px-4 py-3 border-b">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Warehouses
            </p>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {isLoading &&
              Array.from({ length: 3 }).map((_, i) => (
                <Card key={i} className="p-0">
                  <CardContent className="p-3">
                    <Skeleton className="h-5 w-32 mb-2" />
                    <Skeleton className="h-4 w-20 mb-1" />
                    <Skeleton className="h-3 w-full" />
                  </CardContent>
                </Card>
              ))}

            {warehouses && warehouses.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <Warehouse className="h-12 w-12 mb-4 opacity-30" />
                <p className="text-sm font-medium">No warehouses</p>
                <p className="text-xs mt-1 text-center px-4">
                  Create your first warehouse to start organizing inventory locations.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4 gap-1.5"
                  onClick={() => setCreateDialogOpen(true)}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Create First Warehouse
                </Button>
              </div>
            )}

            {warehouses?.map((wh) => (
              <Card
                key={wh._id}
                className={cn(
                  "p-0 cursor-pointer transition-colors hover:bg-accent/50",
                  selectedWarehouseId === wh._id && "ring-2 ring-primary bg-primary/5",
                )}
                onClick={() => setSelectedWarehouseId(wh._id)}
              >
                <CardContent className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{wh.name}</p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
                          {wh.code}
                        </Badge>
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 text-[10px] font-medium",
                            wh.isActive
                              ? "text-emerald-600"
                              : "text-muted-foreground",
                          )}
                        >
                          <span
                            className={cn(
                              "h-1.5 w-1.5 rounded-full",
                              wh.isActive ? "bg-emerald-500" : "bg-muted-foreground/40",
                            )}
                          />
                          {wh.isActive ? "Active" : "Inactive"}
                        </span>
                      </div>
                    </div>
                  </div>
                  {wh.description && (
                    <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                      {wh.description}
                    </p>
                  )}
                  {wh.address && (
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                      <MapPin className="h-3 w-3 flex-shrink-0" />
                      <span className="truncate">{wh.address}</span>
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Right Panel: Hierarchy Tree */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {selectedWarehouseId ? (
            <div className="p-4">
              <LocationHierarchyTree warehouseId={selectedWarehouseId} />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <Warehouse className="h-16 w-16 mb-4 opacity-20" />
              <p className="text-sm font-medium">Select a warehouse</p>
              <p className="text-xs mt-1">
                Choose a warehouse from the left to view its location hierarchy.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Create Warehouse Dialog */}
      <CreateLocationDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        level="warehouse"
      />
    </div>
  );
}
