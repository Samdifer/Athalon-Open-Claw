"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import {
  Plus,
  Trash2,
  Search,
  ArrowUpDown,
  List,
  LayoutGrid,
  Grid3x3,
  Package,
  Plane,
  Filter,
  MapPin,
} from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AIRCRAFT_TYPE_PACKAGES,
  type AircraftType,
} from "./AircraftTypePackages";

type ViewMode = "list" | "small" | "large";
type SortField = "name" | "make" | "bays";
type SortDir = "asc" | "desc";

const CATEGORY_BADGE: Record<
  AircraftType["category"],
  { label: string; className: string }
> = {
  "single-engine": {
    label: "Single-Engine",
    className: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  },
  "multi-engine": {
    label: "Multi-Engine",
    className: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  },
  turboprop: {
    label: "Turboprop",
    className: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
  },
  "light-jet": {
    label: "Light Jet",
    className: "bg-sky-100 text-sky-700 dark:bg-sky-900 dark:text-sky-300",
  },
  "midsize-jet": {
    label: "Midsize Jet",
    className: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300",
  },
  "large-jet": {
    label: "Large Jet",
    className: "bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-300",
  },
  helicopter: {
    label: "Helicopter",
    className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300",
  },
};

function normalizeAircraftKey(make: string, model: string, series?: string): string {
  return `${make.trim().toLowerCase()}::${model.trim().toLowerCase()}::${series?.trim().toLowerCase() ?? ""}`;
}

export default function SupportedAircraftTab() {
  const { orgId } = useCurrentOrg();
  const organizationId = orgId as Id<"organizations"> | undefined;

  const workspace = useQuery(
    api.stationConfig.getStationConfigWorkspace,
    organizationId ? { organizationId } : "skip",
  );

  const upsertSupportedAircraft = useMutation(api.stationConfig.upsertSupportedAircraft);
  const deleteSupportedAircraft = useMutation(api.stationConfig.deleteSupportedAircraft);
  const bulkImportPackage = useMutation(api.stationConfig.bulkImportSupportedAircraftPackage);

  const locations = (workspace?.locations ?? []).filter((location: any) => location.isActive !== false) as any[];
  const bays = (workspace?.bays ?? []) as any[];
  const supportedAircraft = (workspace?.supportedAircraft ?? []) as any[];

  const [selectedLocationId, setSelectedLocationId] = useState<string>("");
  const [selectedPackageId, setSelectedPackageId] = useState<string>("");

  const [showAddForm, setShowAddForm] = useState(false);
  const [newMake, setNewMake] = useState("");
  const [newModel, setNewModel] = useState("");
  const [newSeries, setNewSeries] = useState("");
  const [newCategory, setNewCategory] = useState<AircraftType["category"]>("single-engine");

  const [searchQuery, setSearchQuery] = useState("");
  const [makeFilters, setMakeFilters] = useState<string[]>([]);
  const [showMakeFilter, setShowMakeFilter] = useState(false);
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const [viewMode, setViewMode] = useState<ViewMode>("large");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!selectedLocationId && locations.length > 0) {
      setSelectedLocationId(String(locations[0]._id));
    }
  }, [locations, selectedLocationId]);

  const selectedLocation = useMemo(
    () => locations.find((location) => String(location._id) === selectedLocationId),
    [locations, selectedLocationId],
  );

  const locationBays = useMemo(
    () =>
      bays
        .filter((bay) => String(bay.shopLocationId ?? "") === selectedLocationId)
        .sort((a, b) => {
          const aOrder = typeof a.displayOrder === "number" ? a.displayOrder : Number.MAX_SAFE_INTEGER;
          const bOrder = typeof b.displayOrder === "number" ? b.displayOrder : Number.MAX_SAFE_INTEGER;
          if (aOrder !== bOrder) return aOrder - bOrder;
          return a.name.localeCompare(b.name);
        }),
    [bays, selectedLocationId],
  );

  const scopedAircraft = useMemo(
    () =>
      supportedAircraft.filter(
        (entry) => String(entry.shopLocationId ?? "") === selectedLocationId,
      ),
    [selectedLocationId, supportedAircraft],
  );

  const uniqueMakes = useMemo(
    () => Array.from(new Set(scopedAircraft.map((entry) => entry.make))).sort(),
    [scopedAircraft],
  );

  const filteredSorted = useMemo(() => {
    let entries = [...scopedAircraft];

    if (searchQuery.trim()) {
      const needle = searchQuery.toLowerCase();
      entries = entries.filter(
        (entry) =>
          entry.make.toLowerCase().includes(needle) ||
          entry.model.toLowerCase().includes(needle) ||
          (entry.series ?? "").toLowerCase().includes(needle),
      );
    }

    if (makeFilters.length > 0) {
      entries = entries.filter((entry) => makeFilters.includes(entry.make));
    }

    entries.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "name":
          cmp = `${a.make} ${a.model}`.localeCompare(`${b.make} ${b.model}`);
          break;
        case "make":
          cmp = a.make.localeCompare(b.make) || a.model.localeCompare(b.model);
          break;
        case "bays":
          cmp = (a.compatibleBayIds?.length ?? 0) - (b.compatibleBayIds?.length ?? 0);
          break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });

    return entries;
  }, [scopedAircraft, searchQuery, makeFilters, sortField, sortDir]);

  function renderCategoryBadge(category: AircraftType["category"]) {
    const config = CATEGORY_BADGE[category];
    return (
      <Badge variant="outline" className={`text-xs px-1.5 py-0 border-0 ${config.className}`}>
        {config.label}
      </Badge>
    );
  }

  function renderBaySummary(entry: any) {
    return (
      <span className="text-xs text-muted-foreground">
        {entry.compatibleBayIds.length} of {locationBays.length} bays
      </span>
    );
  }

  async function handleToggleBay(entry: any, bayId: Id<"hangarBays">) {
    if (!organizationId) return;
    const hasBay = entry.compatibleBayIds.includes(bayId);
    const nextBayIds = hasBay
      ? entry.compatibleBayIds.filter((id: Id<"hangarBays">) => id !== bayId)
      : [...entry.compatibleBayIds, bayId];

    try {
      await upsertSupportedAircraft({
        organizationId,
        aircraftConfigId: entry._id,
        shopLocationId: entry.shopLocationId,
        make: entry.make,
        model: entry.model,
        series: entry.series,
        category: entry.category,
        compatibleBayIds: nextBayIds,
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update compatibility");
    }
  }

  async function handleDelete(entry: any) {
    if (!organizationId) return;
    try {
      await deleteSupportedAircraft({
        organizationId,
        aircraftConfigId: entry._id,
      });
      toast.success(`Removed ${entry.make} ${entry.model}`);
      setExpandedIds((prev) => {
        const next = new Set(prev);
        next.delete(String(entry._id));
        return next;
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove aircraft type");
    }
  }

  async function handleImportPackage() {
    if (!organizationId || !selectedLocation || !selectedPackageId) return;
    const pkg = AIRCRAFT_TYPE_PACKAGES.find((value) => value.id === selectedPackageId);
    if (!pkg) return;

    try {
      const result = await bulkImportPackage({
        organizationId,
        shopLocationId: selectedLocation._id,
        entries: pkg.aircraft.map((aircraft) => ({
          make: aircraft.make,
          model: aircraft.model,
          series: aircraft.series,
          category: aircraft.category,
        })),
      });

      const message =
        result.imported > 0 && result.skipped > 0
          ? `Imported ${result.imported} aircraft, skipped ${result.skipped} duplicates`
          : result.imported > 0
            ? `Imported ${result.imported} aircraft`
            : `No new aircraft imported (${result.skipped} duplicates skipped)`;
      toast.success(message);
      setSelectedPackageId("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to import package");
    }
  }

  async function handleManualAdd() {
    if (!organizationId || !selectedLocation) return;

    const make = newMake.trim();
    const model = newModel.trim();
    if (!make || !model) {
      toast.error("Make and model are required");
      return;
    }

    const duplicate = scopedAircraft.some(
      (entry) => normalizeAircraftKey(entry.make, entry.model, entry.series) === normalizeAircraftKey(make, model, newSeries),
    );
    if (duplicate) {
      toast.error(`${make} ${model} already exists for this location`);
      return;
    }

    try {
      await upsertSupportedAircraft({
        organizationId,
        shopLocationId: selectedLocation._id,
        make,
        model,
        series: newSeries.trim() || undefined,
        category: newCategory,
        compatibleBayIds: locationBays.map((bay) => bay._id),
      });
      toast.success(`Added ${make} ${model}`);
      setNewMake("");
      setNewModel("");
      setNewSeries("");
      setNewCategory("single-engine");
      setShowAddForm(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add aircraft type");
    }
  }

  function toggleExpanded(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleMakeFilter(make: string) {
    setMakeFilters((prev) =>
      prev.includes(make) ? prev.filter((item) => item !== make) : [...prev, make],
    );
  }

  function renderBayCheckboxes(entry: any) {
    return (
      <div className="flex flex-wrap gap-x-3 gap-y-1.5">
        {locationBays.map((bay) => (
          <label key={String(bay._id)} className="flex items-center gap-1.5 cursor-pointer">
            <Checkbox
              checked={entry.compatibleBayIds.includes(bay._id)}
              onCheckedChange={() => void handleToggleBay(entry, bay._id)}
              className="h-3.5 w-3.5"
            />
            <span className="text-xs text-muted-foreground">{bay.name}</span>
          </label>
        ))}
      </div>
    );
  }

  function renderListView() {
    return (
      <div className="border rounded-md overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/30">
              <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Aircraft</th>
              <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Series</th>
              <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Category</th>
              <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Bays</th>
              <th className="w-8" />
            </tr>
          </thead>
          <tbody>
            {filteredSorted.map((entry) => {
              const entryId = String(entry._id);
              const isExpanded = expandedIds.has(entryId);
              return (
                <>
                  <tr
                    key={entryId}
                    className="border-b last:border-0 hover:bg-muted/20 cursor-pointer"
                    onClick={() => toggleExpanded(entryId)}
                  >
                    <td className="px-3 py-2 text-sm font-medium">
                      {entry.make} {entry.model}
                    </td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">
                      {entry.series ?? "--"}
                    </td>
                    <td className="px-3 py-2">{renderCategoryBadge(entry.category)}</td>
                    <td className="px-3 py-2">{renderBaySummary(entry)}</td>
                    <td className="px-3 py-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={(event) => {
                          event.stopPropagation();
                          void handleDelete(entry);
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr className="bg-muted/10" key={`${entryId}-expanded`}>
                      <td colSpan={5} className="px-3 py-2">
                        {renderBayCheckboxes(entry)}
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  function renderSmallGrid() {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
        {filteredSorted.map((entry) => (
          <div
            key={String(entry._id)}
            className="border rounded-md p-2.5 flex flex-col gap-1.5 bg-card hover:bg-muted/20 transition-colors"
          >
            <div className="flex items-start justify-between gap-1">
              <span className="text-sm font-medium leading-tight">
                {entry.make} {entry.model}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0"
                onClick={() => void handleDelete(entry)}
              >
                <Trash2 className="h-3 w-3 text-destructive" />
              </Button>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {renderCategoryBadge(entry.category)}
              <Badge variant="outline" className="text-xs px-1.5 py-0">
                {entry.compatibleBayIds.length}/{locationBays.length} bays
              </Badge>
            </div>
          </div>
        ))}
      </div>
    );
  }

  function renderLargeGrid() {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {filteredSorted.map((entry) => (
          <Card key={String(entry._id)} className="gap-0">
            <CardHeader className="p-3 pb-2">
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-0.5 min-w-0">
                  <CardTitle className="text-sm font-medium leading-tight">
                    {entry.make} {entry.model}
                  </CardTitle>
                  {entry.series && (
                    <CardDescription className="text-xs">{entry.series}</CardDescription>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {renderCategoryBadge(entry.category)}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => void handleDelete(entry)}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-3 pt-0 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Bay Compatibility</span>
                {renderBaySummary(entry)}
              </div>
              {renderBayCheckboxes(entry)}
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (workspace === undefined) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-52" />
        </CardHeader>
        <CardContent className="space-y-2">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="p-4 pb-3">
        <div className="flex items-center gap-2">
          <Plane className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-sm font-semibold">Supported Aircraft Types</CardTitle>
        </div>
        <CardDescription className="text-xs">
          Manage aircraft support and bay compatibility per station location.
        </CardDescription>
      </CardHeader>

      <CardContent className="p-4 pt-0 space-y-4">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Location</Label>
          <Select value={selectedLocationId} onValueChange={setSelectedLocationId}>
            <SelectTrigger className="h-8 text-xs w-full sm:w-72">
              <SelectValue placeholder="Select location" />
            </SelectTrigger>
            <SelectContent>
              {locations.map((location) => (
                <SelectItem key={String(location._id)} value={String(location._id)} className="text-xs">
                  {location.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {!selectedLocation && (
          <div className="rounded-md border border-dashed p-6 text-center">
            <MapPin className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Select a location to configure supported aircraft.</p>
          </div>
        )}

        {selectedLocation && (
          <>
            <div className="flex items-end gap-2 flex-wrap">
              <div className="space-y-1 flex-1 min-w-[200px]">
                <Label className="text-xs text-muted-foreground">
                  <Package className="inline h-3 w-3 mr-1 -mt-0.5" />
                  Import Aircraft Package
                </Label>
                <Select value={selectedPackageId} onValueChange={setSelectedPackageId}>
                  <SelectTrigger className="h-8 text-xs w-full">
                    <SelectValue placeholder="Select a package..." />
                  </SelectTrigger>
                  <SelectContent>
                    {AIRCRAFT_TYPE_PACKAGES.map((pkg) => (
                      <SelectItem key={pkg.id} value={pkg.id} className="text-xs">
                        {pkg.name} ({pkg.aircraft.length} aircraft)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                size="sm"
                className="h-8 text-xs"
                disabled={!selectedPackageId}
                onClick={() => void handleImportPackage()}
              >
                <Package className="h-3.5 w-3.5 mr-1" />
                Import Package
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs"
                onClick={() => setShowAddForm((value) => !value)}
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                Add Manually
              </Button>
            </div>

            {showAddForm && (
              <div className="border rounded-md p-3 bg-muted/20 space-y-3">
                <p className="text-xs font-medium text-muted-foreground">Add Aircraft Type</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Make *</Label>
                    <Input
                      className="h-8 text-xs"
                      placeholder="e.g. Cessna"
                      value={newMake}
                      onChange={(event) => setNewMake(event.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Model *</Label>
                    <Input
                      className="h-8 text-xs"
                      placeholder="e.g. 172"
                      value={newModel}
                      onChange={(event) => setNewModel(event.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Series</Label>
                    <Input
                      className="h-8 text-xs"
                      placeholder="e.g. Skyhawk"
                      value={newSeries}
                      onChange={(event) => setNewSeries(event.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Category</Label>
                    <Select value={newCategory} onValueChange={(value) => setNewCategory(value as AircraftType["category"])}>
                      <SelectTrigger className="h-8 text-xs w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(CATEGORY_BADGE).map(([key, value]) => (
                          <SelectItem key={key} value={key} className="text-xs">
                            {value.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" className="h-8 text-xs" onClick={() => void handleManualAdd()}>
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    Add Aircraft Type
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 text-xs"
                    onClick={() => setShowAddForm(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative flex-1 min-w-[180px]">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  className="h-8 text-xs pl-7"
                  placeholder="Search make, model, or series..."
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                />
              </div>

              <div className="relative">
                <Button
                  size="sm"
                  variant={makeFilters.length > 0 ? "secondary" : "outline"}
                  className="h-8 text-xs"
                  onClick={() => setShowMakeFilter((value) => !value)}
                >
                  <Filter className="h-3.5 w-3.5 mr-1" />
                  Make
                  {makeFilters.length > 0 && (
                    <Badge variant="secondary" className="ml-1 text-xs px-1 py-0 h-4">
                      {makeFilters.length}
                    </Badge>
                  )}
                </Button>
                {showMakeFilter && (
                  <div className="absolute top-full left-0 mt-1 z-50 bg-popover border rounded-md shadow-md p-2 space-y-1 min-w-[160px]">
                    {uniqueMakes.map((make) => (
                      <label
                        key={make}
                        className="flex items-center gap-2 cursor-pointer px-1 py-0.5 rounded hover:bg-muted/50"
                      >
                        <Checkbox
                          checked={makeFilters.includes(make)}
                          onCheckedChange={() => toggleMakeFilter(make)}
                          className="h-3.5 w-3.5"
                        />
                        <span className="text-xs">{make}</span>
                      </label>
                    ))}
                    {makeFilters.length > 0 && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 text-xs w-full mt-1"
                        onClick={() => setMakeFilters([])}
                      >
                        Clear
                      </Button>
                    )}
                  </div>
                )}
              </div>

              <Select value={sortField} onValueChange={(value) => setSortField(value as SortField)}>
                <SelectTrigger className="h-8 text-xs w-[110px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name" className="text-xs">Name</SelectItem>
                  <SelectItem value="make" className="text-xs">Make</SelectItem>
                  <SelectItem value="bays" className="text-xs">Bay Count</SelectItem>
                </SelectContent>
              </Select>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                onClick={() => setSortDir((value) => (value === "asc" ? "desc" : "asc"))}
                title={sortDir === "asc" ? "Ascending" : "Descending"}
              >
                <ArrowUpDown className="h-3.5 w-3.5" />
              </Button>

              <div className="flex border rounded-md overflow-hidden ml-auto">
                {([
                  { mode: "list" as const, icon: List, title: "List" },
                  { mode: "small" as const, icon: LayoutGrid, title: "Small Grid" },
                  { mode: "large" as const, icon: Grid3x3, title: "Large Grid" },
                ]).map(({ mode, icon: Icon, title }) => (
                  <Button
                    key={mode}
                    size="icon"
                    variant={viewMode === mode ? "secondary" : "ghost"}
                    className="h-8 w-8 rounded-none"
                    onClick={() => setViewMode(mode)}
                    title={title}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </Button>
                ))}
              </div>
            </div>

            {locationBays.length === 0 && (
              <div className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
                No bays found for this location. Bay compatibility can be configured after bays are added.
              </div>
            )}

            {scopedAircraft.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Plane className="h-10 w-10 text-muted-foreground/40 mb-3" />
                <p className="text-sm font-medium text-muted-foreground">
                  No aircraft types configured for this location.
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Import a package or add an aircraft manually to start.
                </p>
              </div>
            ) : filteredSorted.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Search className="h-8 w-8 text-muted-foreground/40 mb-2" />
                <p className="text-sm text-muted-foreground">No aircraft match the current filters.</p>
              </div>
            ) : (
              <>
                <p className="text-xs text-muted-foreground">
                  Showing {filteredSorted.length} of {scopedAircraft.length} aircraft type
                  {scopedAircraft.length === 1 ? "" : "s"}
                </p>
                {viewMode === "list" && renderListView()}
                {viewMode === "small" && renderSmallGrid()}
                {viewMode === "large" && renderLargeGrid()}
              </>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
