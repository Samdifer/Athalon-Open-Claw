"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import type { Id } from "@/convex/_generated/dataModel";
import {
  Plus,
  Search,
  Copy,
  ToggleLeft,
  ToggleRight,
  Trash2,
  Pencil,
  Package,
  Clock,
  Wrench,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

interface LaborItem {
  description: string;
  estimatedHours: number;
  skillRequired?: string;
}

interface RequiredPart {
  partNumber: string;
  description: string;
  quantity: number;
  unitCost?: number;
}

interface ExternalService {
  vendorName?: string;
  description: string;
  estimatedCost: number;
}

export default function LaborKitsPage() {
  const { orgId, isLoaded } = useCurrentOrg();
  const [search, setSearch] = useState("");
  const [aircraftFilter, setAircraftFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<Id<"laborKits"> | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [ataChapter, setAtaChapter] = useState("");
  const [aircraftType, setAircraftType] = useState("");
  const [laborRate, setLaborRate] = useState<number | undefined>();
  const [laborItems, setLaborItems] = useState<LaborItem[]>([
    { description: "", estimatedHours: 0 },
  ]);
  const [requiredParts, setRequiredParts] = useState<RequiredPart[]>([]);
  const [externalServices, setExternalServices] = useState<ExternalService[]>([]);

  const kits = useQuery(
    api.laborKits.listLaborKits,
    orgId ? { orgId } : "skip",
  );

  const createKit = useMutation(api.laborKits.createLaborKit);
  const updateKit = useMutation(api.laborKits.updateLaborKit);
  const toggleKit = useMutation(api.laborKits.toggleLaborKit);
  const duplicateKit = useMutation(api.laborKits.duplicateLaborKit);
  const deleteKit = useMutation(api.laborKits.deleteLaborKit);

  const resetForm = () => {
    setName("");
    setDescription("");
    setAtaChapter("");
    setAircraftType("");
    setLaborRate(undefined);
    setLaborItems([{ description: "", estimatedHours: 0 }]);
    setRequiredParts([]);
    setExternalServices([]);
    setEditingId(null);
  };

  const openCreate = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEdit = (kit: NonNullable<typeof kits>[number]) => {
    setEditingId(kit._id);
    setName(kit.name);
    setDescription(kit.description ?? "");
    setAtaChapter(kit.ataChapter ?? "");
    setAircraftType(kit.aircraftType ?? "");
    setLaborRate(kit.laborRate);
    setLaborItems(kit.laborItems.length > 0 ? kit.laborItems : [{ description: "", estimatedHours: 0 }]);
    setRequiredParts(kit.requiredParts);
    setExternalServices(kit.externalServices ?? []);
    setDialogOpen(true);
  };

  const totalHours = laborItems.reduce((sum, item) => sum + (item.estimatedHours || 0), 0);
  const totalPartsCost = requiredParts.reduce(
    (sum, p) => sum + (p.unitCost || 0) * (p.quantity || 0),
    0,
  );
  const totalServicesCost = externalServices.reduce(
    (sum, s) => sum + (s.estimatedCost || 0),
    0,
  );
  const totalLaborCost = totalHours * (laborRate || 0);
  const totalCost = totalLaborCost + totalPartsCost + totalServicesCost;

  const handleSave = async () => {
    if (!orgId || !name.trim()) return;
    const validLaborItems = laborItems.filter((i) => i.description.trim());
    const validParts = requiredParts.filter((p) => p.partNumber.trim());
    const validServices = externalServices.filter((s) => s.description.trim());

    if (editingId) {
      await updateKit({
        id: editingId,
        name,
        description: description || undefined,
        ataChapter: ataChapter || undefined,
        aircraftType: aircraftType || undefined,
        estimatedHours: totalHours,
        laborRate,
        laborItems: validLaborItems,
        requiredParts: validParts,
        externalServices: validServices.length > 0 ? validServices : undefined,
      });
    } else {
      await createKit({
        orgId,
        name,
        description: description || undefined,
        ataChapter: ataChapter || undefined,
        aircraftType: aircraftType || undefined,
        estimatedHours: totalHours,
        laborRate,
        laborItems: validLaborItems,
        requiredParts: validParts,
        externalServices: validServices.length > 0 ? validServices : undefined,
      });
    }
    setDialogOpen(false);
    resetForm();
  };

  // Derive unique aircraft types for filter
  const aircraftTypes = Array.from(
    new Set((kits ?? []).map((k) => k.aircraftType).filter(Boolean) as string[]),
  );

  const filtered = (kits ?? []).filter((kit) => {
    const matchesSearch =
      !search ||
      kit.name.toLowerCase().includes(search.toLowerCase()) ||
      (kit.ataChapter ?? "").toLowerCase().includes(search.toLowerCase());
    const matchesAircraft =
      aircraftFilter === "all" || kit.aircraftType === aircraftFilter;
    return matchesSearch && matchesAircraft;
  });

  if (!isLoaded || !kits) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Labor Kits</h1>
          <p className="text-muted-foreground">
            Reusable templates that bundle labor tasks with parts
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          New Labor Kit
        </Button>
      </div>

      <div className="flex gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search kits..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={aircraftFilter} onValueChange={setAircraftFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Aircraft type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Aircraft</SelectItem>
            {aircraftTypes.map((t) => (
              <SelectItem key={t} value={t}>
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Package className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No labor kits found</p>
            <Button variant="outline" className="mt-4" onClick={openCreate}>
              Create your first kit
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Aircraft Type</TableHead>
                <TableHead>ATA Chapter</TableHead>
                <TableHead className="text-right">Est. Hours</TableHead>
                <TableHead className="text-right">Labor Items</TableHead>
                <TableHead className="text-right">Parts</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((kit) => (
                <TableRow key={kit._id}>
                  <TableCell>
                    <div>
                      <span className="font-medium">{kit.name}</span>
                      {kit.description && (
                        <p className="text-xs text-muted-foreground truncate max-w-xs">
                          {kit.description}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{kit.aircraftType ?? "—"}</TableCell>
                  <TableCell>{kit.ataChapter ?? "—"}</TableCell>
                  <TableCell className="text-right">{kit.estimatedHours}h</TableCell>
                  <TableCell className="text-right">{kit.laborItems.length}</TableCell>
                  <TableCell className="text-right">{kit.requiredParts.length}</TableCell>
                  <TableCell>
                    <Badge variant={kit.isActive ? "default" : "secondary"}>
                      {kit.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEdit(kit)}
                        title="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => duplicateKit({ id: kit._id })}
                        title="Duplicate"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => toggleKit({ id: kit._id })}
                        title={kit.isActive ? "Deactivate" : "Activate"}
                      >
                        {kit.isActive ? (
                          <ToggleRight className="h-4 w-4" />
                        ) : (
                          <ToggleLeft className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          if (confirm("Delete this labor kit?")) {
                            deleteKit({ id: kit._id });
                          }
                        }}
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) { setDialogOpen(false); resetForm(); } else { setDialogOpen(true); } }}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Labor Kit" : "New Labor Kit"}</DialogTitle>
            <DialogDescription>
              Define labor tasks, required parts, and external services.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label>Name *</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., King Air B200 Phase 1 Inspection" />
              </div>
              <div className="col-span-2">
                <Label>Description</Label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
              </div>
              <div>
                <Label>Aircraft Type</Label>
                <Input value={aircraftType} onChange={(e) => setAircraftType(e.target.value)} placeholder="e.g., King Air B200" />
              </div>
              <div>
                <Label>ATA Chapter</Label>
                <Input value={ataChapter} onChange={(e) => setAtaChapter(e.target.value)} placeholder="e.g., 05" />
              </div>
              <div>
                <Label>Labor Rate ($/hr)</Label>
                <Input type="number" value={laborRate ?? ""} onChange={(e) => setLaborRate(e.target.value ? Number(e.target.value) : undefined)} />
              </div>
            </div>

            {/* Labor Items */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="flex items-center gap-2">
                  <Wrench className="h-4 w-4" /> Labor Items
                </Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setLaborItems([...laborItems, { description: "", estimatedHours: 0 }])}
                >
                  <Plus className="h-3 w-3 mr-1" /> Add
                </Button>
              </div>
              <div className="space-y-2">
                {laborItems.map((item, i) => (
                  <div key={i} className="flex gap-2 items-start">
                    <Input
                      placeholder="Task description"
                      className="flex-1"
                      value={item.description}
                      onChange={(e) => {
                        const next = [...laborItems];
                        next[i] = { ...next[i], description: e.target.value };
                        setLaborItems(next);
                      }}
                    />
                    <Input
                      type="number"
                      placeholder="Hours"
                      className="w-24"
                      value={item.estimatedHours || ""}
                      onChange={(e) => {
                        const next = [...laborItems];
                        next[i] = { ...next[i], estimatedHours: Number(e.target.value) || 0 };
                        setLaborItems(next);
                      }}
                    />
                    <Input
                      placeholder="Skill"
                      className="w-32"
                      value={item.skillRequired ?? ""}
                      onChange={(e) => {
                        const next = [...laborItems];
                        next[i] = { ...next[i], skillRequired: e.target.value || undefined };
                        setLaborItems(next);
                      }}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setLaborItems(laborItems.filter((_, j) => j !== i))}
                      disabled={laborItems.length <= 1}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            {/* Required Parts */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="flex items-center gap-2">
                  <Package className="h-4 w-4" /> Required Parts
                </Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setRequiredParts([...requiredParts, { partNumber: "", description: "", quantity: 1 }])}
                >
                  <Plus className="h-3 w-3 mr-1" /> Add
                </Button>
              </div>
              <div className="space-y-2">
                {requiredParts.map((part, i) => (
                  <div key={i} className="flex gap-2 items-start">
                    <Input
                      placeholder="Part #"
                      className="w-36"
                      value={part.partNumber}
                      onChange={(e) => {
                        const next = [...requiredParts];
                        next[i] = { ...next[i], partNumber: e.target.value };
                        setRequiredParts(next);
                      }}
                    />
                    <Input
                      placeholder="Description"
                      className="flex-1"
                      value={part.description}
                      onChange={(e) => {
                        const next = [...requiredParts];
                        next[i] = { ...next[i], description: e.target.value };
                        setRequiredParts(next);
                      }}
                    />
                    <Input
                      type="number"
                      placeholder="Qty"
                      className="w-20"
                      value={part.quantity || ""}
                      onChange={(e) => {
                        const next = [...requiredParts];
                        next[i] = { ...next[i], quantity: Number(e.target.value) || 0 };
                        setRequiredParts(next);
                      }}
                    />
                    <Input
                      type="number"
                      placeholder="Unit $"
                      className="w-24"
                      value={part.unitCost ?? ""}
                      onChange={(e) => {
                        const next = [...requiredParts];
                        next[i] = { ...next[i], unitCost: e.target.value ? Number(e.target.value) : undefined };
                        setRequiredParts(next);
                      }}
                    />
                    <Button type="button" variant="ghost" size="icon" onClick={() => setRequiredParts(requiredParts.filter((_, j) => j !== i))}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            {/* External Services */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>External Services (optional)</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setExternalServices([...externalServices, { description: "", estimatedCost: 0 }])}
                >
                  <Plus className="h-3 w-3 mr-1" /> Add
                </Button>
              </div>
              <div className="space-y-2">
                {externalServices.map((svc, i) => (
                  <div key={i} className="flex gap-2 items-start">
                    <Input
                      placeholder="Vendor"
                      className="w-36"
                      value={svc.vendorName ?? ""}
                      onChange={(e) => {
                        const next = [...externalServices];
                        next[i] = { ...next[i], vendorName: e.target.value || undefined };
                        setExternalServices(next);
                      }}
                    />
                    <Input
                      placeholder="Description"
                      className="flex-1"
                      value={svc.description}
                      onChange={(e) => {
                        const next = [...externalServices];
                        next[i] = { ...next[i], description: e.target.value };
                        setExternalServices(next);
                      }}
                    />
                    <Input
                      type="number"
                      placeholder="Cost"
                      className="w-28"
                      value={svc.estimatedCost || ""}
                      onChange={(e) => {
                        const next = [...externalServices];
                        next[i] = { ...next[i], estimatedCost: Number(e.target.value) || 0 };
                        setExternalServices(next);
                      }}
                    />
                    <Button type="button" variant="ghost" size="icon" onClick={() => setExternalServices(externalServices.filter((_, j) => j !== i))}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            {/* Summary */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Clock className="h-4 w-4" /> Cost Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-2 text-sm">
                <span className="text-muted-foreground">Total Hours:</span>
                <span className="text-right font-medium">{totalHours}h</span>
                <span className="text-muted-foreground">Labor Cost:</span>
                <span className="text-right font-medium">${totalLaborCost.toFixed(2)}</span>
                <span className="text-muted-foreground">Parts Cost:</span>
                <span className="text-right font-medium">${totalPartsCost.toFixed(2)}</span>
                <span className="text-muted-foreground">Services Cost:</span>
                <span className="text-right font-medium">${totalServicesCost.toFixed(2)}</span>
                <span className="font-semibold">Total Estimated:</span>
                <span className="text-right font-bold">${totalCost.toFixed(2)}</span>
              </CardContent>
            </Card>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!name.trim()}>
              {editingId ? "Save Changes" : "Create Kit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
