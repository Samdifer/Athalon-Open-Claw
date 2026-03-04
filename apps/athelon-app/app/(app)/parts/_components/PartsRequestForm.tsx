"use client";

import { useMemo, useState } from "react";
import { Search, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PartStatusBadge } from "@/src/shared/components/PartStatusBadge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type PartsRequestStatus = "requested" | "ordered" | "shipped" | "received" | "issued";
export type PartsRequestUrgency = "normal" | "urgent" | "aog";

export interface PartsRequestRecord {
  id: string;
  partNumber: string;
  description: string;
  manufacturer: string;
  unitCost?: number;
  quantity: number;
  urgency: PartsRequestUrgency;
  requestingTechnician: string;
  workOrderRef: string;
  destination: string;
  status: PartsRequestStatus;
  createdAt: number;
  updatedAt: number;
}

interface CatalogPart {
  _id: string;
  partNumber: string;
  partName: string;
  description?: string;
  supplier?: string;
}

interface PartsRequestFormProps {
  partsCatalog: CatalogPart[];
  requests: PartsRequestRecord[];
  onRequestsChange: (next: PartsRequestRecord[]) => void;
  initialWorkOrderRef?: string;
}

const statusOptions: PartsRequestStatus[] = ["requested", "ordered", "shipped", "received", "issued"];

export function PartsRequestForm({
  partsCatalog,
  requests,
  onRequestsChange,
  initialWorkOrderRef,
}: PartsRequestFormProps) {
  const [partNumber, setPartNumber] = useState("");
  const [description, setDescription] = useState("");
  const [manufacturer, setManufacturer] = useState("");
  const [unitCost, setUnitCost] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [urgency, setUrgency] = useState<PartsRequestUrgency>("normal");
  const [requestingTechnician, setRequestingTechnician] = useState("");
  const [workOrderRef, setWorkOrderRef] = useState(initialWorkOrderRef ?? "");
  const [destination, setDestination] = useState("");
  const [listFilter, setListFilter] = useState<"all" | PartsRequestStatus>("all");

  const filtered = useMemo(
    () => requests.filter((r) => (listFilter === "all" ? true : r.status === listFilter)),
    [requests, listFilter],
  );

  const catalogMap = useMemo(() => {
    const map = new Map<string, CatalogPart>();
    for (const item of partsCatalog) map.set(item.partNumber.toUpperCase(), item);
    return map;
  }, [partsCatalog]);

  function prefillFromCatalog(rawPn: string) {
    const selected = catalogMap.get(rawPn.toUpperCase());
    if (!selected) return;
    setPartNumber(selected.partNumber);
    setDescription(selected.description || selected.partName || "");
    setManufacturer(selected.supplier || "");
  }

  function resetForm() {
    setPartNumber("");
    setDescription("");
    setManufacturer("");
    setUnitCost("");
    setQuantity("1");
    setUrgency("normal");
    setRequestingTechnician("");
    setWorkOrderRef(initialWorkOrderRef ?? "");
    setDestination("");
  }

  function submitRequest() {
    if (!partNumber.trim() || !description.trim() || !requestingTechnician.trim()) {
      toast.error("Part number, description, and requesting technician are required.");
      return;
    }
    const qty = Math.max(1, Number(quantity || "1"));
    const parsedUnitCost = unitCost.trim() ? Number(unitCost) : undefined;
    const now = Date.now();
    const next: PartsRequestRecord = {
      id: `pr_${now}_${Math.random().toString(36).slice(2, 8)}`,
      partNumber: partNumber.trim().toUpperCase(),
      description: description.trim(),
      manufacturer: manufacturer.trim(),
      unitCost: Number.isFinite(parsedUnitCost) ? parsedUnitCost : undefined,
      quantity: Number.isFinite(qty) ? qty : 1,
      urgency,
      requestingTechnician: requestingTechnician.trim(),
      workOrderRef: workOrderRef.trim(),
      destination: destination.trim(),
      status: "requested",
      createdAt: now,
      updatedAt: now,
    };

    onRequestsChange([next, ...requests]);
    toast.success(`Request submitted for ${next.partNumber}`);
    resetForm();
  }

  return (
    <div className="space-y-4">
      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Search className="w-4 h-4 text-muted-foreground" />
            Parts Request Intake
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Part Number</Label>
              <Input
                list="parts-catalog"
                value={partNumber}
                onChange={(e) => {
                  setPartNumber(e.target.value);
                  prefillFromCatalog(e.target.value);
                }}
                placeholder="Search / enter P/N"
                className="h-8 text-xs"
              />
              <datalist id="parts-catalog">
                {partsCatalog.map((part) => (
                  <option key={part._id} value={part.partNumber}>
                    {part.partName}
                  </option>
                ))}
              </datalist>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Description</Label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} className="h-8 text-xs" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Manufacturer</Label>
              <Input value={manufacturer} onChange={(e) => setManufacturer(e.target.value)} className="h-8 text-xs" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Unit Cost (USD)</Label>
              <Input value={unitCost} onChange={(e) => setUnitCost(e.target.value)} className="h-8 text-xs" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Quantity Needed</Label>
              <Input type="number" min={1} value={quantity} onChange={(e) => setQuantity(e.target.value)} className="h-8 text-xs" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Urgency</Label>
              <Select value={urgency} onValueChange={(v) => setUrgency(v as PartsRequestUrgency)}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                  <SelectItem value="aog">AOG</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Requesting Technician</Label>
              <Input value={requestingTechnician} onChange={(e) => setRequestingTechnician(e.target.value)} className="h-8 text-xs" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Work Order Ref</Label>
              <Input value={workOrderRef} onChange={(e) => setWorkOrderRef(e.target.value)} className="h-8 text-xs" placeholder="WO-xxxx" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Destination / Task Step</Label>
            <Textarea value={destination} onChange={(e) => setDestination(e.target.value)} rows={2} className="text-xs" placeholder="Which task card step needs this part" />
          </div>
          <Button size="sm" className="h-8 text-xs" onClick={submitRequest}>
            <Send className="w-3.5 h-3.5 mr-1.5" />
            Submit Request
          </Button>
        </CardContent>
      </Card>

      <Card className="border-border/60">
        <CardHeader className="pb-3 flex-row items-center justify-between">
          <CardTitle className="text-sm">Request List</CardTitle>
          <Select value={listFilter} onValueChange={(v) => setListFilter(v as "all" | PartsRequestStatus)}>
            <SelectTrigger className="h-8 text-xs w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {statusOptions.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent className="space-y-2">
          {filtered.length === 0 ? (
            <p className="text-xs text-muted-foreground">No requests in this filter.</p>
          ) : (
            filtered.slice(0, 8).map((r) => (
              <div key={r.id} className="rounded-md border border-border/50 px-3 py-2 text-xs flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-mono font-semibold truncate">{r.partNumber} · Qty {r.quantity}</p>
                  <p className="text-muted-foreground truncate">{r.description}</p>
                </div>
                <PartStatusBadge status={r.status} />
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
