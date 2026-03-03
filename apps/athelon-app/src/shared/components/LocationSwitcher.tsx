"use client";

import { useCallback, useEffect, useMemo, useSyncExternalStore } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import { MapPin, ChevronsUpDown, Globe } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

const DEFAULT_LOCATION_ID = "all";
const STORAGE_PREFIX = "athelon:selected-location:";

const listeners = new Set<() => void>();
const selectedByOrg = new Map<string, string>();

function storageKey(orgKey: string) {
  return `${STORAGE_PREFIX}${orgKey}`;
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

function emitChange() {
  listeners.forEach((listener) => listener());
}

function readSelection(orgKey: string) {
  if (selectedByOrg.has(orgKey)) {
    return selectedByOrg.get(orgKey)!;
  }

  if (typeof window !== "undefined") {
    const stored = window.localStorage.getItem(storageKey(orgKey));
    if (stored) {
      selectedByOrg.set(orgKey, stored);
      return stored;
    }
  }

  selectedByOrg.set(orgKey, DEFAULT_LOCATION_ID);
  return DEFAULT_LOCATION_ID;
}

function writeSelection(orgKey: string, value: string) {
  selectedByOrg.set(orgKey, value);
  if (typeof window !== "undefined") {
    window.localStorage.setItem(storageKey(orgKey), value);
  }
  emitChange();
}

/** Hook to read/write the currently-selected shop location for an organization. */
export function useSelectedLocation(orgId?: string | null) {
  const orgKey = orgId ?? "global";

  const getSnapshot = useCallback(() => readSelection(orgKey), [orgKey]);
  const selectedLocationId = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const setSelectedLocationId = useCallback(
    (nextLocationId: string) => {
      writeSelection(orgKey, nextLocationId);
    },
    [orgKey],
  );

  return { selectedLocationId, setSelectedLocationId };
}

export function LocationSwitcher() {
  const { orgId } = useCurrentOrg();
  const locations = useQuery(
    api.shopLocations.list,
    orgId ? { organizationId: orgId } : "skip",
  );

  const { selectedLocationId, setSelectedLocationId } = useSelectedLocation(orgId);

  const selectedLocation = useMemo(
    () => locations?.find((location) => location._id === selectedLocationId),
    [locations, selectedLocationId],
  );

  useEffect(() => {
    if (!locations || locations.length === 0) return;
    if (selectedLocationId === DEFAULT_LOCATION_ID) return;

    const stillExists = locations.some((location) => location._id === selectedLocationId);
    if (!stillExists) {
      setSelectedLocationId(DEFAULT_LOCATION_ID);
    }
  }, [locations, selectedLocationId, setSelectedLocationId]);

  const label = selectedLocation?.name ?? "All Locations";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground px-2"
        >
          <MapPin className="h-3.5 w-3.5" />
          <span className="truncate max-w-[120px]">{label}</span>
          <ChevronsUpDown className="h-3 w-3 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[200px]">
        <DropdownMenuItem
          onClick={() => setSelectedLocationId(DEFAULT_LOCATION_ID)}
          className="gap-2 text-xs"
        >
          <Globe className="h-3.5 w-3.5" />
          All Locations
        </DropdownMenuItem>
        {locations && locations.length > 0 && <DropdownMenuSeparator />}
        {locations?.filter((location) => location.isActive !== false).map((location) => (
          <DropdownMenuItem
            key={location._id}
            onClick={() => setSelectedLocationId(location._id)}
            className="gap-2 text-xs"
          >
            <MapPin className="h-3.5 w-3.5" />
            <span className="truncate">{location.name}</span>
            <span className="ml-auto text-[10px] text-muted-foreground font-mono">
              {location.code}
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
