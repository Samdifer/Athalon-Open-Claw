"use client";

import { useState, useCallback } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface BinLocationPickerProps {
  value?: string; // bin ID (Id<"warehouseBins">)
  onChange: (binId: string | undefined) => void;
  disabled?: boolean;
}

export function BinLocationPicker({
  value,
  onChange,
  disabled = false,
}: BinLocationPickerProps) {
  const { orgId } = useCurrentOrg();

  const [warehouseId, setWarehouseId] = useState<
    Id<"warehouses"> | undefined
  >(undefined);
  const [areaId, setAreaId] = useState<Id<"warehouseAreas"> | undefined>(
    undefined,
  );
  const [shelfId, setShelfId] = useState<
    Id<"warehouseShelves"> | undefined
  >(undefined);
  const [shelfLocationId, setShelfLocationId] = useState<
    Id<"warehouseShelfLocations"> | undefined
  >(undefined);

  // ── Queries ────────────────────────────────────────────────────────────────

  const warehouses = useQuery(
    api.warehouseLocations.listWarehouses,
    orgId ? { organizationId: orgId } : "skip",
  );

  const areas = useQuery(
    api.warehouseLocations.listAreas,
    orgId && warehouseId
      ? { organizationId: orgId, warehouseId }
      : "skip",
  );

  const shelves = useQuery(
    api.warehouseLocations.listShelves,
    orgId && areaId
      ? { organizationId: orgId, areaId }
      : "skip",
  );

  const shelfLocations = useQuery(
    api.warehouseLocations.listShelfLocations,
    orgId && shelfId
      ? { organizationId: orgId, shelfId }
      : "skip",
  );

  const bins = useQuery(
    api.warehouseLocations.listBins,
    orgId && shelfLocationId
      ? { organizationId: orgId, shelfLocationId }
      : "skip",
  );

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleWarehouseChange = useCallback(
    (id: string) => {
      setWarehouseId(id as Id<"warehouses">);
      setAreaId(undefined);
      setShelfId(undefined);
      setShelfLocationId(undefined);
      onChange(undefined);
    },
    [onChange],
  );

  const handleAreaChange = useCallback(
    (id: string) => {
      setAreaId(id as Id<"warehouseAreas">);
      setShelfId(undefined);
      setShelfLocationId(undefined);
      onChange(undefined);
    },
    [onChange],
  );

  const handleShelfChange = useCallback(
    (id: string) => {
      setShelfId(id as Id<"warehouseShelves">);
      setShelfLocationId(undefined);
      onChange(undefined);
    },
    [onChange],
  );

  const handleShelfLocationChange = useCallback(
    (id: string) => {
      setShelfLocationId(id as Id<"warehouseShelfLocations">);
      onChange(undefined);
    },
    [onChange],
  );

  const handleBinChange = useCallback(
    (id: string) => {
      onChange(id);
    },
    [onChange],
  );

  // ── Empty / loading states ─────────────────────────────────────────────────

  if (!orgId) {
    return null;
  }

  if (warehouses === undefined) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="space-y-1.5">
            <Skeleton className="h-3.5 w-20" />
            <Skeleton className="h-9 w-full" />
          </div>
        ))}
      </div>
    );
  }

  if (warehouses.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No warehouses configured
      </p>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
      {/* Warehouse */}
      <div className="space-y-1.5">
        <Label className="text-xs">Warehouse</Label>
        <Select
          value={warehouseId ?? ""}
          onValueChange={handleWarehouseChange}
          disabled={disabled}
        >
          <SelectTrigger className="h-9 text-xs w-full">
            <SelectValue placeholder="Select warehouse" />
          </SelectTrigger>
          <SelectContent>
            {warehouses.map((w) => (
              <SelectItem key={w._id} value={w._id}>
                {w.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Area */}
      <div className="space-y-1.5">
        <Label className="text-xs">Area</Label>
        {warehouseId && areas === undefined ? (
          <Skeleton className="h-9 w-full" />
        ) : (
          <Select
            value={areaId ?? ""}
            onValueChange={handleAreaChange}
            disabled={disabled || !warehouseId}
          >
            <SelectTrigger className="h-9 text-xs w-full">
              <SelectValue placeholder="Select area" />
            </SelectTrigger>
            <SelectContent>
              {(areas ?? []).map((a) => (
                <SelectItem key={a._id} value={a._id}>
                  {a.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Shelf */}
      <div className="space-y-1.5">
        <Label className="text-xs">Shelf</Label>
        {areaId && shelves === undefined ? (
          <Skeleton className="h-9 w-full" />
        ) : (
          <Select
            value={shelfId ?? ""}
            onValueChange={handleShelfChange}
            disabled={disabled || !areaId}
          >
            <SelectTrigger className="h-9 text-xs w-full">
              <SelectValue placeholder="Select shelf" />
            </SelectTrigger>
            <SelectContent>
              {(shelves ?? []).map((s) => (
                <SelectItem key={s._id} value={s._id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Shelf Location */}
      <div className="space-y-1.5">
        <Label className="text-xs">Shelf Location</Label>
        {shelfId && shelfLocations === undefined ? (
          <Skeleton className="h-9 w-full" />
        ) : (
          <Select
            value={shelfLocationId ?? ""}
            onValueChange={handleShelfLocationChange}
            disabled={disabled || !shelfId}
          >
            <SelectTrigger className="h-9 text-xs w-full">
              <SelectValue placeholder="Select location" />
            </SelectTrigger>
            <SelectContent>
              {(shelfLocations ?? []).map((sl) => (
                <SelectItem key={sl._id} value={sl._id}>
                  {sl.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Bin */}
      <div className="space-y-1.5">
        <Label className="text-xs">Bin</Label>
        {shelfLocationId && bins === undefined ? (
          <Skeleton className="h-9 w-full" />
        ) : (
          <Select
            value={value ?? ""}
            onValueChange={handleBinChange}
            disabled={disabled || !shelfLocationId}
          >
            <SelectTrigger className="h-9 text-xs w-full">
              <SelectValue placeholder="Select bin" />
            </SelectTrigger>
            <SelectContent>
              {(bins ?? []).map((b) => (
                <SelectItem key={b._id} value={b._id}>
                  {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
    </div>
  );
}
