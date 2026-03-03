"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import {
  Warehouse,
  PlaneTakeoff,
  Wrench,
  Plus,
  Star,
  ChevronDown,
  ChevronRight,
  GripVertical,
  Pencil,
  Trash2,
  MapPin,
} from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

type BayType = "hangar" | "ramp" | "paint";
type BayStatus = "available" | "occupied" | "maintenance";

const CERT_TYPES = [
  { value: "part_145", label: "Part 145" },
  { value: "part_135", label: "Part 135" },
  { value: "part_121", label: "Part 121" },
  { value: "part_91", label: "Part 91" },
];

const BAY_TYPES: { value: BayType; label: string }[] = [
  { value: "hangar", label: "Hangar" },
  { value: "ramp", label: "Ramp" },
  { value: "paint", label: "Paint" },
];

const STATUS_CLASSES: Record<BayStatus, string> = {
  available: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  occupied: "bg-sky-500/15 text-sky-700 dark:text-sky-400",
  maintenance: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
};

const BAY_TYPE_ICON: Record<BayType, typeof Warehouse> = {
  hangar: Warehouse,
  ramp: PlaneTakeoff,
  paint: Wrench,
};

function certBadgeVariant(certType?: string): "default" | "secondary" | "outline" {
  if (certType === "part_145") return "default";
  if (certType === "part_135") return "secondary";
  return "outline";
}

export default function FacilitiesAndBaysTab() {
  const { orgId } = useCurrentOrg();
  const organizationId = orgId as Id<"organizations"> | undefined;

  const workspace = useQuery(
    api.stationConfig.getStationConfigWorkspace,
    organizationId ? { organizationId } : "skip",
  );

  const createLocation = useMutation(api.shopLocations.create);
  const updateLocation = useMutation(api.shopLocations.update);
  const deactivateLocation = useMutation(api.shopLocations.remove);

  const createBay = useMutation(api.hangarBays.createBay);
  const updateBay = useMutation(api.hangarBays.updateBay);
  const reorderBays = useMutation(api.hangarBays.reorderBays);
  const deleteBay = useMutation(api.hangarBays.deleteBay);

  const locations = (workspace?.locations ?? []) as any[];
  const bays = (workspace?.bays ?? []) as any[];

  const [expandedLocations, setExpandedLocations] = useState<Set<string>>(new Set());
  const [dragBayId, setDragBayId] = useState<string | null>(null);

  const [locDialogOpen, setLocDialogOpen] = useState(false);
  const [editLocId, setEditLocId] = useState<Id<"shopLocations"> | null>(null);
  const [locName, setLocName] = useState("");
  const [locCode, setLocCode] = useState("");
  const [locAddress, setLocAddress] = useState("");
  const [locCity, setLocCity] = useState("");
  const [locState, setLocState] = useState("");
  const [locZip, setLocZip] = useState("");
  const [locCertNumber, setLocCertNumber] = useState("");
  const [locCertType, setLocCertType] = useState("");
  const [locCapabilities, setLocCapabilities] = useState("");
  const [locIsPrimary, setLocIsPrimary] = useState(false);

  const [bayDialogOpen, setBayDialogOpen] = useState(false);
  const [editBayId, setEditBayId] = useState<Id<"hangarBays"> | null>(null);
  const [bayLocationId, setBayLocationId] = useState<Id<"shopLocations"> | null>(null);
  const [bayName, setBayName] = useState("");
  const [bayType, setBayType] = useState<BayType>("hangar");
  const [bayCapacity, setBayCapacity] = useState(1);
  const [bayDescription, setBayDescription] = useState("");

  const activeLocations = useMemo(
    () => locations.filter((location) => location.isActive !== false),
    [locations],
  );

  useEffect(() => {
    if (activeLocations.length === 0) {
      setExpandedLocations(new Set());
      return;
    }
    setExpandedLocations((prev) => {
      if (prev.size > 0) return prev;
      return new Set(activeLocations.map((location) => String(location._id)));
    });
  }, [activeLocations]);

  const resetLocForm = useCallback(() => {
    setEditLocId(null);
    setLocName("");
    setLocCode("");
    setLocAddress("");
    setLocCity("");
    setLocState("");
    setLocZip("");
    setLocCertNumber("");
    setLocCertType("");
    setLocCapabilities("");
    setLocIsPrimary(false);
  }, []);

  const resetBayForm = useCallback(() => {
    setEditBayId(null);
    setBayLocationId(null);
    setBayName("");
    setBayType("hangar");
    setBayCapacity(1);
    setBayDescription("");
  }, []);

  function toggleExpand(locationId: string) {
    setExpandedLocations((prev) => {
      const next = new Set(prev);
      if (next.has(locationId)) next.delete(locationId);
      else next.add(locationId);
      return next;
    });
  }

  function baysForLocation(locationId: Id<"shopLocations">) {
    return bays
      .filter((bay) => bay.shopLocationId === locationId)
      .sort((a, b) => {
        const aOrder = typeof a.displayOrder === "number" ? a.displayOrder : Number.MAX_SAFE_INTEGER;
        const bOrder = typeof b.displayOrder === "number" ? b.displayOrder : Number.MAX_SAFE_INTEGER;
        if (aOrder !== bOrder) return aOrder - bOrder;
        return a.name.localeCompare(b.name);
      });
  }

  function openAddLocation() {
    resetLocForm();
    setLocDialogOpen(true);
  }

  function openEditLocation(location: any) {
    setEditLocId(location._id);
    setLocName(location.name ?? "");
    setLocCode(location.code ?? "");
    setLocAddress(location.address ?? "");
    setLocCity(location.city ?? "");
    setLocState(location.state ?? "");
    setLocZip(location.zip ?? "");
    setLocCertNumber(location.certificateNumber ?? "");
    setLocCertType(location.certificateType ?? "");
    setLocCapabilities((location.capabilities ?? []).join(", "));
    setLocIsPrimary(location.isPrimary ?? false);
    setLocDialogOpen(true);
  }

  async function saveLocation() {
    if (!organizationId) return;
    if (!locName.trim() || !locCode.trim()) {
      toast.error("Name and code are required");
      return;
    }

    const payload = {
      name: locName.trim(),
      code: locCode.trim().toUpperCase(),
      address: locAddress.trim() || undefined,
      city: locCity.trim() || undefined,
      state: locState.trim() || undefined,
      zip: locZip.trim() || undefined,
      certificateNumber: locCertNumber.trim() || undefined,
      certificateType: locCertType
        ? (locCertType as "part_145" | "part_135" | "part_121" | "part_91")
        : undefined,
      capabilities: locCapabilities
        .split(",")
        .map((capability) => capability.trim())
        .filter(Boolean),
      isPrimary: locIsPrimary,
    };

    try {
      if (editLocId) {
        await updateLocation({ id: editLocId, ...payload });
        toast.success("Location updated");
      } else {
        const createdId = await createLocation({ organizationId, ...payload });
        setExpandedLocations((prev) => new Set([...prev, String(createdId)]));
        toast.success("Location created");
      }
      setLocDialogOpen(false);
      resetLocForm();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save location");
    }
  }

  async function setPrimary(locationId: Id<"shopLocations">) {
    try {
      await updateLocation({ id: locationId, isPrimary: true });
      toast.success("Primary location updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update primary location");
    }
  }

  async function handleDeactivateLocation(locationId: Id<"shopLocations">) {
    try {
      await deactivateLocation({ id: locationId });
      toast.success("Location deactivated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to deactivate location");
    }
  }

  function openAddBay(locationId: Id<"shopLocations">) {
    resetBayForm();
    setBayLocationId(locationId);
    setBayDialogOpen(true);
  }

  function openEditBay(bay: any) {
    setEditBayId(bay._id);
    setBayLocationId((bay.shopLocationId ?? null) as Id<"shopLocations"> | null);
    setBayName(bay.name ?? "");
    setBayType((bay.type ?? "hangar") as BayType);
    setBayCapacity(bay.capacity ?? 1);
    setBayDescription(bay.description ?? "");
    setBayDialogOpen(true);
  }

  async function saveBay() {
    if (!organizationId) return;
    if (!bayName.trim()) {
      toast.error("Bay name is required");
      return;
    }

    try {
      if (editBayId) {
        await updateBay({
          bayId: editBayId,
          name: bayName.trim(),
          type: bayType,
          capacity: Math.max(1, bayCapacity),
          description: bayDescription.trim() || undefined,
        });
        toast.success("Bay updated");
      } else {
        if (!bayLocationId) {
          toast.error("Select a location for this bay");
          return;
        }
        await createBay({
          organizationId,
          shopLocationId: bayLocationId,
          name: bayName.trim(),
          type: bayType,
          capacity: Math.max(1, bayCapacity),
          description: bayDescription.trim() || undefined,
        });
        toast.success("Bay created");
      }

      setBayDialogOpen(false);
      resetBayForm();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save bay");
    }
  }

  async function handleDeleteBay(bayId: Id<"hangarBays">) {
    if (!organizationId) return;
    try {
      await deleteBay({ organizationId, bayId });
      toast.success("Bay deleted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete bay");
    }
  }

  function handleDragStart(bayId: Id<"hangarBays">) {
    setDragBayId(String(bayId));
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
  }

  async function handleDrop(targetBayId: Id<"hangarBays">, locationId: Id<"shopLocations">) {
    if (!organizationId || !dragBayId || dragBayId === String(targetBayId)) {
      setDragBayId(null);
      return;
    }

    const locationBays = baysForLocation(locationId);
    const dragIndex = locationBays.findIndex((bay) => String(bay._id) === dragBayId);
    const dropIndex = locationBays.findIndex((bay) => bay._id === targetBayId);

    if (dragIndex === -1 || dropIndex === -1) {
      setDragBayId(null);
      return;
    }

    const reordered = [...locationBays];
    const [moved] = reordered.splice(dragIndex, 1);
    reordered.splice(dropIndex, 0, moved);

    try {
      await reorderBays({
        organizationId,
        shopLocationId: locationId,
        orderedBayIds: reordered.map((bay) => bay._id),
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to reorder bays");
    } finally {
      setDragBayId(null);
    }
  }

  if (workspace === undefined) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-28 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold flex items-center gap-2">
          <Warehouse className="h-4 w-4 text-muted-foreground" />
          Facilities &amp; Bays
        </h2>
        <Button size="sm" className="h-8 text-xs" onClick={openAddLocation}>
          <Plus className="h-3.5 w-3.5 mr-1" />
          Add Location
        </Button>
      </div>

      {activeLocations.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <MapPin className="h-8 w-8 mx-auto mb-3 text-muted-foreground/50" />
            <p className="text-sm font-medium text-muted-foreground">No facilities configured</p>
            <p className="text-xs text-muted-foreground mt-1">
              Add your first location to begin managing hangar bays and ramp positions.
            </p>
            <Button
              size="sm"
              variant="outline"
              className="mt-4 h-8 text-xs"
              onClick={openAddLocation}
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              Add Location
            </Button>
          </CardContent>
        </Card>
      )}

      {activeLocations.map((location) => {
        const locationBays = baysForLocation(location._id);
        const isExpanded = expandedLocations.has(String(location._id));

        return (
          <Card key={String(location._id)}>
            <CardHeader className="py-3 px-4">
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  className="p-0.5 rounded hover:bg-muted transition-colors"
                  onClick={() => toggleExpand(String(location._id))}
                  aria-label={isExpanded ? "Collapse" : "Expand"}
                >
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>

                {location.isPrimary && (
                  <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500 shrink-0" />
                )}

                <CardTitle className="text-sm font-semibold leading-none">
                  {location.name}
                </CardTitle>

                <Badge variant="outline" className="font-mono text-[10px] px-1.5 py-0">
                  {location.code}
                </Badge>

                {location.certificateType && (
                  <Badge
                    variant={certBadgeVariant(location.certificateType)}
                    className="text-[10px] px-1.5 py-0"
                  >
                    {location.certificateType.replace("_", " ").toUpperCase()}
                  </Badge>
                )}

                {(location.capabilities ?? []).map((capability: string) => (
                  <Badge
                    key={capability}
                    variant="outline"
                    className="text-[10px] px-1.5 py-0 text-muted-foreground"
                  >
                    {capability}
                  </Badge>
                ))}

                <div className="flex-1" />

                <span className="text-xs text-muted-foreground">
                  {locationBays.length} bay{locationBays.length === 1 ? "" : "s"}
                </span>

                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  onClick={() => openEditLocation(location)}
                  aria-label={`Edit ${location.name}`}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>

                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  onClick={() => setPrimary(location._id)}
                  aria-label="Set primary"
                >
                  <Star className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>

                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-destructive"
                  onClick={() => handleDeactivateLocation(location._id)}
                  aria-label="Deactivate location"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </CardHeader>

            {isExpanded && (
              <CardContent className="pt-0 px-4 pb-3">
                {locationBays.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic py-2">
                    No bays configured for this location.
                  </p>
                ) : (
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {locationBays.map((bay) => {
                      const Icon = BAY_TYPE_ICON[(bay.type ?? "hangar") as BayType];
                      const bayStatus = (bay.status ?? "available") as BayStatus;
                      return (
                        <div
                          key={String(bay._id)}
                          draggable
                          onDragStart={() => handleDragStart(bay._id)}
                          onDragOver={handleDragOver}
                          onDrop={() => void handleDrop(bay._id, location._id)}
                          className={`group relative flex items-center gap-2 rounded-md border bg-card p-2 cursor-pointer transition-colors hover:bg-muted/50 ${
                            dragBayId === String(bay._id) ? "opacity-40" : ""
                          }`}
                          onClick={() => openEditBay(bay)}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(event) => {
                            if (event.key === "Enter") openEditBay(bay);
                          }}
                        >
                          <div
                            className="cursor-grab active:cursor-grabbing text-muted-foreground/50 hover:text-muted-foreground"
                            onMouseDown={(event) => event.stopPropagation()}
                            aria-label="Drag to reorder"
                          >
                            <GripVertical className="h-3.5 w-3.5" />
                          </div>

                          <Icon className="h-4 w-4 text-muted-foreground shrink-0" />

                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate">{bay.name}</p>
                            <p className="text-[10px] text-muted-foreground">Cap {bay.capacity}</p>
                          </div>

                          <Badge
                            variant="outline"
                            className={`text-[10px] px-1.5 py-0 border-0 shrink-0 ${STATUS_CLASSES[bayStatus]}`}
                          >
                            {bayStatus}
                          </Badge>

                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                            onClick={(event) => {
                              event.stopPropagation();
                              void handleDeleteBay(bay._id);
                            }}
                            aria-label={`Delete ${bay.name}`}
                          >
                            <Trash2 className="h-3 w-3 text-destructive" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}

                <Button
                  size="sm"
                  variant="outline"
                  className="mt-2 h-7 text-xs"
                  onClick={() => openAddBay(location._id)}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add Bay
                </Button>
              </CardContent>
            )}
          </Card>
        );
      })}

      <Dialog
        open={locDialogOpen}
        onOpenChange={(open) => {
          if (!open) resetLocForm();
          setLocDialogOpen(open);
        }}
      >
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editLocId ? "Edit Location" : "Add Location"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Name *</Label>
                <Input
                  className="h-8 text-sm"
                  value={locName}
                  onChange={(event) => setLocName(event.target.value)}
                  placeholder="Main Hangar"
                />
              </div>
              <div>
                <Label className="text-xs">Code *</Label>
                <Input
                  className="h-8 text-sm font-mono"
                  value={locCode}
                  onChange={(event) => setLocCode(event.target.value)}
                  placeholder="MH01"
                />
              </div>
            </div>
            <div>
              <Label className="text-xs">Address</Label>
              <Input
                className="h-8 text-sm"
                value={locAddress}
                onChange={(event) => setLocAddress(event.target.value)}
                placeholder="123 Airport Rd"
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs">City</Label>
                <Input className="h-8 text-sm" value={locCity} onChange={(event) => setLocCity(event.target.value)} />
              </div>
              <div>
                <Label className="text-xs">State</Label>
                <Input className="h-8 text-sm" value={locState} onChange={(event) => setLocState(event.target.value)} />
              </div>
              <div>
                <Label className="text-xs">ZIP</Label>
                <Input className="h-8 text-sm" value={locZip} onChange={(event) => setLocZip(event.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Certificate #</Label>
                <Input
                  className="h-8 text-sm font-mono"
                  value={locCertNumber}
                  onChange={(event) => setLocCertNumber(event.target.value)}
                />
              </div>
              <div>
                <Label className="text-xs">Certificate Type</Label>
                <Select value={locCertType || "none"} onValueChange={(value) => setLocCertType(value === "none" ? "" : value)}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {CERT_TYPES.map((certType) => (
                      <SelectItem key={certType.value} value={certType.value}>
                        {certType.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs">Capabilities (comma-separated)</Label>
              <Input
                className="h-8 text-sm"
                value={locCapabilities}
                onChange={(event) => setLocCapabilities(event.target.value)}
                placeholder="Airframe, Powerplant, Avionics"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="loc-primary"
                checked={locIsPrimary}
                onChange={(event) => setLocIsPrimary(event.target.checked)}
                className="rounded border-input"
              />
              <Label htmlFor="loc-primary" className="text-xs">
                Primary location
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={() => setLocDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button size="sm" className="h-8 text-xs" onClick={() => void saveLocation()}>
              {editLocId ? "Save Changes" : "Create Location"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={bayDialogOpen}
        onOpenChange={(open) => {
          if (!open) resetBayForm();
          setBayDialogOpen(open);
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editBayId ? "Edit Bay" : "Add Bay"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {!editBayId && (
              <div>
                <Label className="text-xs">Location</Label>
                <Select
                  value={bayLocationId ? String(bayLocationId) : "none"}
                  onValueChange={(value) =>
                    setBayLocationId(value === "none" ? null : (value as Id<"shopLocations">))
                  }
                >
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder="Select location" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Select location</SelectItem>
                    {activeLocations.map((location) => (
                      <SelectItem key={String(location._id)} value={String(location._id)}>
                        {location.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label className="text-xs">Name *</Label>
              <Input
                className="h-8 text-sm"
                value={bayName}
                onChange={(event) => setBayName(event.target.value)}
                placeholder="Bay 1"
              />
            </div>
            <div>
              <Label className="text-xs">Type</Label>
              <Select value={bayType} onValueChange={(value) => setBayType(value as BayType)}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BAY_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Capacity</Label>
              <Input
                className="h-8 text-sm"
                type="number"
                min={1}
                value={bayCapacity}
                onChange={(event) =>
                  setBayCapacity(Math.max(1, Number.parseInt(event.target.value, 10) || 1))
                }
              />
            </div>
            <div>
              <Label className="text-xs">Description</Label>
              <Textarea
                className="text-sm min-h-[60px]"
                value={bayDescription}
                onChange={(event) => setBayDescription(event.target.value)}
                placeholder="Optional notes about this bay..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={() => setBayDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button size="sm" className="h-8 text-xs" onClick={() => void saveBay()}>
              {editBayId ? "Save Changes" : "Add Bay"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
