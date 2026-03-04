"use client";

import { useEffect, useMemo, useState } from "react";
import { Building2, Plus, Pencil } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export type VendorServiceStatus = "requested" | "in_progress" | "complete";

type VendorService = {
  id: string;
  vendorName: string;
  serviceDescription: string;
  quotedCost?: number;
  actualCost?: number;
  poReference?: string;
  status: VendorServiceStatus;
  createdAt: number;
  updatedAt: number;
};

const STATUS_LABEL: Record<VendorServiceStatus, string> = {
  requested: "Requested",
  in_progress: "In Progress",
  complete: "Complete",
};

const STATUS_STYLES: Record<VendorServiceStatus, string> = {
  requested: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30",
  in_progress: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30",
  complete: "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/30",
};

function buildStorageKey(workOrderId: string, cardId: string) {
  return `athelon:taskCardVendorServices:${workOrderId}:${cardId}`;
}

function parseMoney(value: string): number | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const parsed = Number(trimmed);
  if (Number.isNaN(parsed) || parsed < 0) return undefined;
  return parsed;
}

export function VendorServicePanel({
  workOrderId,
  cardId,
  readOnly = false,
}: {
  workOrderId: string;
  cardId: string;
  readOnly?: boolean;
}) {
  const storageKey = useMemo(() => buildStorageKey(workOrderId, cardId), [workOrderId, cardId]);
  const [services, setServices] = useState<VendorService[]>([]);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [vendorName, setVendorName] = useState("");
  const [serviceDescription, setServiceDescription] = useState("");
  const [quotedCost, setQuotedCost] = useState("");
  const [actualCost, setActualCost] = useState("");
  const [poReference, setPoReference] = useState("");
  const [status, setStatus] = useState<VendorServiceStatus>("requested");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) {
        setServices([]);
        return;
      }
      const parsed = JSON.parse(raw) as VendorService[];
      setServices(Array.isArray(parsed) ? parsed : []);
    } catch {
      setServices([]);
    }
  }, [storageKey]);

  function persist(next: VendorService[]) {
    setServices(next);
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {
      toast.error("Unable to save vendor service changes locally.");
    }
  }

  function resetForm() {
    setEditingId(null);
    setVendorName("");
    setServiceDescription("");
    setQuotedCost("");
    setActualCost("");
    setPoReference("");
    setStatus("requested");
  }

  function startCreate() {
    resetForm();
    setOpen(true);
  }

  function startEdit(item: VendorService) {
    setEditingId(item.id);
    setVendorName(item.vendorName);
    setServiceDescription(item.serviceDescription);
    setQuotedCost(item.quotedCost != null ? String(item.quotedCost) : "");
    setActualCost(item.actualCost != null ? String(item.actualCost) : "");
    setPoReference(item.poReference ?? "");
    setStatus(item.status);
    setOpen(true);
  }

  function save() {
    if (!vendorName.trim() || !serviceDescription.trim()) {
      toast.error("Vendor name and service description are required.");
      return;
    }

    const quoted = parseMoney(quotedCost);
    const actual = parseMoney(actualCost);

    if (quotedCost.trim() && quoted === undefined) {
      toast.error("Quoted cost must be a valid positive number.");
      return;
    }
    if (actualCost.trim() && actual === undefined) {
      toast.error("Actual cost must be a valid positive number.");
      return;
    }

    const now = Date.now();

    if (editingId) {
      const next = services.map((svc) =>
        svc.id === editingId
          ? {
              ...svc,
              vendorName: vendorName.trim(),
              serviceDescription: serviceDescription.trim(),
              quotedCost: quoted,
              actualCost: actual,
              poReference: poReference.trim() || undefined,
              status,
              updatedAt: now,
            }
          : svc,
      );
      persist(next);
      toast.success("Vendor service updated.");
    } else {
      const next: VendorService[] = [
        {
          id: `vs_${now}_${Math.random().toString(36).slice(2, 7)}`,
          vendorName: vendorName.trim(),
          serviceDescription: serviceDescription.trim(),
          quotedCost: quoted,
          actualCost: actual,
          poReference: poReference.trim() || undefined,
          status,
          createdAt: now,
          updatedAt: now,
        },
        ...services,
      ];
      persist(next);
      toast.success("Vendor service added.");
    }

    setOpen(false);
    resetForm();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
          <Building2 className="w-3.5 h-3.5" aria-hidden="true" />
          Vendor Services
        </h2>
        {!readOnly && (
          <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={startCreate}>
            <Plus className="w-3 h-3" />
            Add Vendor Service
          </Button>
        )}
      </div>

      {services.length === 0 ? (
        <p className="text-xs text-muted-foreground italic py-4">
          No vendor services yet. Add one to track external maintenance support.
        </p>
      ) : (
        <div className="space-y-2">
          {services.map((svc) => (
            <Card key={svc.id} className="border-border/60">
              <CardContent className="p-3 space-y-1.5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-foreground">{svc.vendorName}</p>
                    <p className="text-xs text-muted-foreground">{svc.serviceDescription}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Badge variant="outline" className={`text-[10px] border ${STATUS_STYLES[svc.status]}`}>
                      {STATUS_LABEL[svc.status]}
                    </Badge>
                    {!readOnly && (
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => startEdit(svc)}>
                        <Pencil className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                  <span>Quoted: {svc.quotedCost != null ? `$${svc.quotedCost.toFixed(2)}` : "—"}</span>
                  <span>Actual: {svc.actualCost != null ? `$${svc.actualCost.toFixed(2)}` : "—"}</span>
                  <span>PO: {svc.poReference || "—"}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); setOpen(v); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Vendor Service" : "Add Vendor Service"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label className="text-xs">Vendor Name</Label>
              <Input value={vendorName} onChange={(e) => setVendorName(e.target.value)} className="h-9" />
            </div>
            <div>
              <Label className="text-xs">Service Description</Label>
              <Textarea value={serviceDescription} onChange={(e) => setServiceDescription(e.target.value)} rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Quoted Cost</Label>
                <Input type="number" min="0" step="0.01" value={quotedCost} onChange={(e) => setQuotedCost(e.target.value)} className="h-9" />
              </div>
              <div>
                <Label className="text-xs">Actual Cost</Label>
                <Input type="number" min="0" step="0.01" value={actualCost} onChange={(e) => setActualCost(e.target.value)} className="h-9" />
              </div>
            </div>
            <div>
              <Label className="text-xs">PO Reference</Label>
              <Input value={poReference} onChange={(e) => setPoReference(e.target.value)} className="h-9" />
            </div>
            <div>
              <Label className="text-xs">Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as VendorServiceStatus)}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="requested">Requested</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="complete">Complete</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
            <Button size="sm" onClick={save}>{editingId ? "Save Changes" : "Add Service"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
