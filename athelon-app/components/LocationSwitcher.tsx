"use client";

import { useCallback, useSyncExternalStore } from "react";
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

// ─── Tiny shared store (no deps) ──────────────────────────────────────────

let _locationId = "all";
const _listeners = new Set<() => void>();

function _setLocationId(id: string) {
  _locationId = id;
  _listeners.forEach((l) => l());
}
function _subscribe(cb: () => void) {
  _listeners.add(cb);
  return () => { _listeners.delete(cb); };
}
function _getSnapshot() { return _locationId; }

/** Hook to read/write the currently-selected shop location. */
export function useSelectedLocation() {
  const locationId = useSyncExternalStore(_subscribe, _getSnapshot, _getSnapshot);
  return { selectedLocationId: locationId, setSelectedLocationId: _setLocationId };
}

// ─── Component ─────────────────────────────────────────────────────────────

export function LocationSwitcher() {
  const { orgId } = useCurrentOrg();
  const locations = useQuery(
    api.shopLocations.list,
    orgId ? { organizationId: orgId } : "skip",
  );

  const { selectedLocationId, setSelectedLocationId } = useSelectedLocation();

  const selectedLocation = locations?.find((l) => l._id === selectedLocationId);
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
          onClick={() => setSelectedLocationId("all")}
          className="gap-2 text-xs"
        >
          <Globe className="h-3.5 w-3.5" />
          All Locations
        </DropdownMenuItem>
        {locations && locations.length > 0 && <DropdownMenuSeparator />}
        {locations?.filter((l) => l.isActive !== false).map((loc) => (
          <DropdownMenuItem
            key={loc._id}
            onClick={() => setSelectedLocationId(loc._id)}
            className="gap-2 text-xs"
          >
            <MapPin className="h-3.5 w-3.5" />
            <span className="truncate">{loc.name}</span>
            <span className="ml-auto text-[10px] text-muted-foreground font-mono">
              {loc.code}
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
