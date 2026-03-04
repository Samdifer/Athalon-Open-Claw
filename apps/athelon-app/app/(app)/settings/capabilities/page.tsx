"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { Award, Pencil, Plus, Trash2 } from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { RatingBadge } from "../_components/RatingBadge";
import { CapabilitiesListPrint } from "../_components/CapabilitiesListPrint";

type CapabilitySectionKey = "airframe" | "powerplant" | "instrument" | "radio" | "accessory";

type SectionDef = {
  key: CapabilitySectionKey;
  title: string;
  hint: string;
  defaultCategory: "single-engine" | "multi-engine" | "turboprop" | "light-jet" | "midsize-jet" | "large-jet" | "helicopter";
};

type CapabilityRow = {
  id: Id<"stationSupportedAircraft">;
  section: CapabilitySectionKey;
  ratingClass: 1 | 2 | 3 | 4;
  rating: string;
  limitation?: string;
  make: string;
  model: string;
  series?: string;
  category: "single-engine" | "multi-engine" | "turboprop" | "light-jet" | "midsize-jet" | "large-jet" | "helicopter";
  compatibleBayIds: Id<"hangarBays">[];
  shopLocationId?: Id<"shopLocations">;
};

const SECTION_DEFS: SectionDef[] = [
  {
    key: "airframe",
    title: "Airframe Ratings",
    hint: "By make / model / series",
    defaultCategory: "single-engine",
  },
  {
    key: "powerplant",
    title: "Powerplant Ratings",
    hint: "By engine make / model",
    defaultCategory: "turboprop",
  },
  {
    key: "instrument",
    title: "Instrument Ratings",
    hint: "Bench and panel instrument capability",
    defaultCategory: "multi-engine",
  },
  {
    key: "radio",
    title: "Radio Ratings",
    hint: "Communication / navigation systems",
    defaultCategory: "light-jet",
  },
  {
    key: "accessory",
    title: "Accessory Ratings",
    hint: "Electrical / mechanical accessory classes",
    defaultCategory: "helicopter",
  },
];

function classFromCategory(category: CapabilityRow["category"]): 1 | 2 | 3 | 4 {
  switch (category) {
    case "single-engine":
    case "multi-engine":
      return 1;
    case "turboprop":
    case "helicopter":
      return 2;
    case "light-jet":
      return 3;
    case "midsize-jet":
    case "large-jet":
      return 4;
  }
}

function toSection(make: string, category: CapabilityRow["category"]): CapabilitySectionKey {
  if (make.startsWith("ENG ")) return "powerplant";
  if (make.startsWith("INS ")) return "instrument";
  if (make.startsWith("RAD ")) return "radio";
  if (make.startsWith("ACC ")) return "accessory";

  if (category === "turboprop") return "powerplant";
  if (category === "helicopter") return "accessory";
  return "airframe";
}

function decodeLimitation(series?: string): string | undefined {
  if (!series) return undefined;
  const match = series.match(/\[LIM:(.*)\]$/);
  if (!match) return undefined;
  return match[1]?.trim() || undefined;
}

function stripLimitation(series?: string): string | undefined {
  if (!series) return undefined;
  return series.replace(/\s*\[LIM:.*\]$/, "").trim() || undefined;
}

function encodeSeries(series: string, limitation: string): string | undefined {
  const cleanSeries = series.trim();
  const cleanLimitation = limitation.trim();
  if (cleanLimitation) {
    return `${cleanSeries}${cleanSeries ? " " : ""}[LIM:${cleanLimitation}]`;
  }
  return cleanSeries || undefined;
}

export default function CapabilitiesListPage() {
  const { orgId, org } = useCurrentOrg();
  const organizationId = orgId as Id<"organizations"> | undefined;

  const workspace = useQuery(
    api.stationConfig.getStationConfigWorkspace,
    organizationId ? { organizationId } : "skip",
  );
  const upsertSupportedAircraft = useMutation(api.stationConfig.upsertSupportedAircraft);
  const deleteSupportedAircraft = useMutation(api.stationConfig.deleteSupportedAircraft);

  const [openSection, setOpenSection] = useState<CapabilitySectionKey | null>(null);
  const [editingRow, setEditingRow] = useState<CapabilityRow | null>(null);
  const [formClass, setFormClass] = useState<"1" | "2" | "3" | "4">("1");
  const [formRating, setFormRating] = useState("");
  const [formSeries, setFormSeries] = useState("");
  const [formLimitation, setFormLimitation] = useState("");

  const supportedAircraft = workspace?.supportedAircraft ?? [];
  const locations = workspace?.locations ?? [];
  const bays = workspace?.bays ?? [];

  const primaryLocation = useMemo(
    () => locations.find((l: any) => l.isPrimary) ?? locations[0],
    [locations],
  );

  const rows = useMemo(() => {
    return supportedAircraft.map((entry: any) => {
      const cleanSeries = stripLimitation(entry.series);
      const limitation = decodeLimitation(entry.series);
      const section = toSection(entry.make, entry.category);
      return {
        id: entry._id,
        section,
        ratingClass: classFromCategory(entry.category),
        rating: `${entry.make} ${entry.model}`.trim(),
        limitation,
        make: entry.make,
        model: entry.model,
        series: cleanSeries,
        category: entry.category,
        compatibleBayIds: entry.compatibleBayIds ?? [],
        shopLocationId: entry.shopLocationId,
      } satisfies CapabilityRow;
    });
  }, [supportedAircraft]);

  const bySection = useMemo(() => {
    const grouped: Record<CapabilitySectionKey, CapabilityRow[]> = {
      airframe: [],
      powerplant: [],
      instrument: [],
      radio: [],
      accessory: [],
    };
    rows.forEach((row) => grouped[row.section].push(row));
    return grouped;
  }, [rows]);

  function resetForm() {
    setFormClass("1");
    setFormRating("");
    setFormSeries("");
    setFormLimitation("");
    setEditingRow(null);
  }

  function openCreateDialog(section: CapabilitySectionKey) {
    resetForm();
    setOpenSection(section);
  }

  function openEditDialog(section: CapabilitySectionKey, row: CapabilityRow) {
    setEditingRow(row);
    setOpenSection(section);
    setFormClass(String(row.ratingClass) as "1" | "2" | "3" | "4");
    setFormRating(row.rating);
    setFormSeries(row.series ?? "");
    setFormLimitation(row.limitation ?? "");
  }

  function categoryForClass(value: "1" | "2" | "3" | "4", section: CapabilitySectionKey): CapabilityRow["category"] {
    if (section === "powerplant") return "turboprop";
    if (section === "instrument") return "multi-engine";
    if (section === "radio") return "light-jet";
    if (section === "accessory") return "helicopter";

    if (value === "1") return "single-engine";
    if (value === "2") return "turboprop";
    if (value === "3") return "light-jet";
    return "midsize-jet";
  }

  function makeWithSectionPrefix(section: CapabilitySectionKey, make: string): string {
    const trimmed = make.trim();
    if (section === "powerplant") return trimmed.startsWith("ENG ") ? trimmed : `ENG ${trimmed}`;
    if (section === "instrument") return trimmed.startsWith("INS ") ? trimmed : `INS ${trimmed}`;
    if (section === "radio") return trimmed.startsWith("RAD ") ? trimmed : `RAD ${trimmed}`;
    if (section === "accessory") return trimmed.startsWith("ACC ") ? trimmed : `ACC ${trimmed}`;
    return trimmed;
  }

  async function handleSave(section: CapabilitySectionKey) {
    if (!organizationId) return;
    const text = formRating.trim();
    if (!text) {
      toast.error("Rating text is required");
      return;
    }

    const words = text.split(/\s+/).filter(Boolean);
    const makeSeed = words[0] ?? "General";
    const modelSeed = words.slice(1).join(" ") || "Rating";
    const make = makeWithSectionPrefix(section, makeSeed);
    const category = editingRow?.category ?? categoryForClass(formClass, section);

    try {
      await upsertSupportedAircraft({
        organizationId,
        aircraftConfigId: editingRow?.id,
        shopLocationId: editingRow?.shopLocationId ?? primaryLocation?._id,
        make,
        model: modelSeed,
        series: encodeSeries(formSeries, formLimitation),
        category,
        compatibleBayIds:
          editingRow?.compatibleBayIds ??
          bays
            .filter((bay: any) => bay.shopLocationId === (editingRow?.shopLocationId ?? primaryLocation?._id))
            .map((bay: any) => bay._id),
      });
      toast.success(editingRow ? "Capability updated" : "Capability added");
      setOpenSection(null);
      resetForm();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to save capability");
    }
  }

  async function handleDelete(row: CapabilityRow) {
    if (!organizationId) return;
    try {
      await deleteSupportedAircraft({
        organizationId,
        aircraftConfigId: row.id,
      });
      toast.success("Capability removed");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to remove capability");
    }
  }

  const stationAddress = primaryLocation
    ? [primaryLocation.addressLine1, primaryLocation.city, primaryLocation.state, primaryLocation.postalCode]
        .filter(Boolean)
        .join(", ")
    : "Address not configured";

  const printSections = SECTION_DEFS.map((section) => ({
    key: section.key,
    title: section.title,
    rows: bySection[section.key],
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold flex items-center gap-2">
          <Award className="h-5 w-5 text-muted-foreground" />
          Repair Station Capabilities List
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          FAA OpSpecs-style ratings register using station supported aircraft capability records.
        </p>
      </div>

      <CapabilitiesListPrint
        certificateNumber={org?.certificateNumber ?? "RS-CERT-PENDING"}
        stationName={org?.name ?? "Repair Station"}
        stationAddress={stationAddress}
        sections={printSections}
      />

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {SECTION_DEFS.map((section) => (
          <Card key={section.key} className="border-border/60">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-sm">{section.title}</CardTitle>
                  <CardDescription className="text-xs">{section.hint}</CardDescription>
                </div>
                <Dialog
                  open={openSection === section.key}
                  onOpenChange={(open) => {
                    if (open) return;
                    setOpenSection(null);
                    resetForm();
                  }}
                >
                  <DialogTrigger asChild>
                    <Button
                      size="sm"
                      className="h-8 text-xs"
                      variant="outline"
                      onClick={() => openCreateDialog(section.key)}
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" />
                      Add Rating
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{editingRow ? "Edit" : "Add"} {section.title}</DialogTitle>
                      <DialogDescription>
                        Store FAA class, rating text, and optional limitation.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-2">
                      <div className="space-y-1">
                        <Label className="text-xs">Class</Label>
                        <Select value={formClass} onValueChange={(v) => setFormClass(v as "1" | "2" | "3" | "4") }>
                          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1" className="text-xs">Class 1</SelectItem>
                            <SelectItem value="2" className="text-xs">Class 2</SelectItem>
                            <SelectItem value="3" className="text-xs">Class 3</SelectItem>
                            <SelectItem value="4" className="text-xs">Class 4</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1 sm:col-span-2">
                        <Label className="text-xs">Rating</Label>
                        <Input
                          className="h-8 text-xs"
                          placeholder="e.g., Pratt & Whitney PT6A"
                          value={formRating}
                          onChange={(e) => setFormRating(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Series (optional)</Label>
                        <Input
                          className="h-8 text-xs"
                          value={formSeries}
                          onChange={(e) => setFormSeries(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Limitation (optional)</Label>
                        <Input
                          className="h-8 text-xs"
                          value={formLimitation}
                          onChange={(e) => setFormLimitation(e.target.value)}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => { setOpenSection(null); resetForm(); }}>
                        Cancel
                      </Button>
                      <Button onClick={() => void handleSave(section.key)}>
                        {editingRow ? "Save Changes" : "Add Rating"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {bySection[section.key].length === 0 ? (
                <p className="text-xs text-muted-foreground">No ratings listed.</p>
              ) : (
                bySection[section.key].map((row) => (
                  <div key={row.id} className="rounded-md border p-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <RatingBadge
                          ratingClass={row.ratingClass}
                          ratingText={row.rating}
                          hasLimitation={Boolean(row.limitation)}
                        />
                        {row.series ? (
                          <p className="text-xs text-muted-foreground">Series: {row.series}</p>
                        ) : null}
                        {row.limitation ? (
                          <Badge variant="outline" className="text-[11px]">Limitation: {row.limitation}</Badge>
                        ) : null}
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => openEditDialog(section.key, row)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => void handleDelete(row)}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Separator />
      <p className="text-[11px] text-muted-foreground">
        Notes: Capability rows are persisted in station supported-aircraft records. Non-airframe sections are tagged
        with section prefixes and retained in the same data source for unified OpSpecs output.
      </p>
    </div>
  );
}
