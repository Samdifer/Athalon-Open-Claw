"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { ArrowRightLeft, Plus, Search, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { formatDateTime } from "@/lib/format";

type InventoryPart = {
  _id: string;
  partNumber: string;
  partName: string;
  description?: string;
  serialNumber?: string;
  condition?: string;
  partCategory?: string;
  lotId?: string;
  lotNumber?: string;
  batchNumber?: string;
  eightOneThirtyId?: string;
};

type StepModel = {
  _id: string;
  stepNumber: number;
  description: string;
};

function PartCard({
  title,
  detail,
  meta,
  timeline,
  onVoid,
}: {
  title: string;
  detail?: string;
  meta?: string;
  timeline?: string;
  onVoid?: () => void;
}) {
  return (
    <div className="rounded-md border border-border/60 bg-muted/20 p-2.5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-mono text-foreground">{title}</p>
          {detail ? <p className="text-xs text-muted-foreground mt-0.5">{detail}</p> : null}
          {meta ? <p className="text-[11px] text-muted-foreground mt-1">{meta}</p> : null}
          {timeline ? <p className="text-[10px] text-sky-300 mt-1">{timeline}</p> : null}
        </div>
        {onVoid && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-muted-foreground hover:text-destructive flex-shrink-0"
            onClick={onVoid}
            aria-label="Void trace event"
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        )}
      </div>
    </div>
  );
}

export function StepPartsTracker({
  orgId,
  workOrderId,
  taskCardId,
  techId,
  steps,
  inventoryParts,
}: {
  orgId?: string;
  workOrderId: string;
  taskCardId: string;
  techId?: string;
  steps: StepModel[];
  inventoryParts: InventoryPart[];
}) {
  const events = useQuery(
    api.taskStepPartTrace.listForTaskCard,
    taskCardId ? { taskCardId: taskCardId as Id<"taskCards"> } : "skip",
  );
  const addTraceEvent = useMutation(api.taskStepPartTrace.addTraceEvent);
  const voidTraceEvent = useMutation(api.taskStepPartTrace.voidTraceEvent);

  const [dialog, setDialog] = useState<{ stepId: string; type: "installed" | "removed" } | null>(null);
  const [search, setSearch] = useState("");
  const [selectedPartId, setSelectedPartId] = useState<string>("");
  const [quantity, setQuantity] = useState("1");
  const [ref8130, setRef8130] = useState("");
  const [removeCondition, setRemoveCondition] = useState<"serviceable" | "unserviceable" | "scrap">("serviceable");
  const [fromCustody, setFromCustody] = useState("Inventory");
  const [toCustody, setToCustody] = useState("Aircraft");
  const [custodyNote, setCustodyNote] = useState("");

  const filteredParts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return inventoryParts;
    return inventoryParts.filter((p) =>
      [p.partNumber, p.serialNumber, p.partName, p.description, p.lotNumber, p.batchNumber]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [inventoryParts, search]);

  const stepEvents = useMemo(() => {
    const all = events ?? [];
    const voidedIds = new Set(all.filter((e) => e.eventType === "voided" && e.linkedEventId).map((e) => String(e.linkedEventId)));
    const active = all.filter((e) => e.eventType !== "voided" && !voidedIds.has(String(e._id)));
    return active;
  }, [events]);

  function openAddPart(stepId: string, type: "installed" | "removed") {
    setDialog({ stepId, type });
    setSearch("");
    setSelectedPartId("");
    setQuantity("1");
    setRef8130("");
    setRemoveCondition("serviceable");
    setFromCustody(type === "installed" ? "Inventory" : "Aircraft");
    setToCustody(type === "installed" ? "Aircraft" : "Quarantine");
    setCustodyNote("");
  }

  async function addPart() {
    if (!dialog || !orgId) return;
    const selected = inventoryParts.find((p) => p._id === selectedPartId);
    if (!selected) {
      toast.error("Select a part first.");
      return;
    }

    try {
      const qty = Math.max(1, Number.parseInt(quantity || "1", 10) || 1);
      await addTraceEvent({
        organizationId: orgId as Id<"organizations">,
        workOrderId: workOrderId as Id<"workOrders">,
        taskCardId: taskCardId as Id<"taskCards">,
        stepId: dialog.stepId as Id<"taskCardSteps">,
        eventType: dialog.type,
        partId: selected._id as Id<"parts">,
        partNumber: selected.partNumber,
        serialNumber: selected.serialNumber,
        description: selected.description ?? selected.partName,
        quantity: dialog.type === "installed" ? qty : undefined,
        conditionAtRemoval: dialog.type === "removed" ? removeCondition : undefined,
        partCategory: selected.partCategory,
        lotId: selected.lotId as Id<"lots"> | undefined,
        lotNumber: selected.lotNumber,
        batchNumber: selected.batchNumber,
        eightOneThirtyId: selected.eightOneThirtyId as Id<"eightOneThirtyRecords"> | undefined,
        eightOneThirtyReference: ref8130.trim() || undefined,
        fromCustody: fromCustody.trim() || undefined,
        toCustody: toCustody.trim() || undefined,
        chainOfCustodyNote: custodyNote.trim() || undefined,
        technicianId: techId as Id<"technicians"> | undefined,
      });
      toast.success("Part trace event recorded.");
      setDialog(null);
    } catch {
      toast.error("Failed to save part trace event.");
    }
  }

  async function voidEvent(eventId: Id<"taskStepPartTraceEvents">) {
    try {
      await voidTraceEvent({
        eventId,
        reason: "Voided from task step parts trace UI",
        technicianId: techId as Id<"technicians"> | undefined,
      });
      toast.success("Trace event voided with immutable audit record.");
    } catch {
      toast.error("Failed to void event.");
    }
  }

  if (steps.length === 0) {
    return <p className="text-xs text-muted-foreground italic">No step-level parts traceability required on this card.</p>;
  }

  return (
    <div className="space-y-3">
      {steps
        .slice()
        .sort((a, b) => a.stepNumber - b.stepNumber)
        .map((step) => {
          const removed = stepEvents.filter((e) => String(e.stepId) === step._id && e.eventType === "removed");
          const installed = stepEvents.filter((e) => String(e.stepId) === step._id && e.eventType === "installed");
          const rowCount = Math.max(removed.length, installed.length);

          return (
            <div key={step._id} className="rounded-lg border border-border/60 p-3">
              <p className="text-xs text-muted-foreground">Step {step.stepNumber}</p>
              <p className="text-sm text-foreground mb-3">{step.description}</p>

              <div className="grid grid-cols-1 md:grid-cols-[1fr_52px_1fr] gap-3">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Parts Removed</h4>
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => openAddPart(step._id, "removed")}>
                      <Plus className="w-3 h-3 mr-1" /> Add Part
                    </Button>
                  </div>
                  {removed.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">No removed parts tracked.</p>
                  ) : (
                    removed.map((event) => (
                      <div key={String(event._id)} className="space-y-1">
                        <PartCard
                          title={`${event.partNumber}${event.serialNumber ? ` · S/N ${event.serialNumber}` : ""}`}
                          detail={event.description}
                          meta={`Cond ${event.conditionAtRemoval ?? "serviceable"}${event.lotNumber ? ` · Lot ${event.lotNumber}` : ""}`}
                          timeline={`${event.fromCustody ?? "Unknown"} → ${event.toCustody ?? "Unknown"} · ${formatDateTime(event.createdAt)}`}
                          onVoid={() => void voidEvent(event._id)}
                        />
                        <Badge variant="outline" className="text-[10px] capitalize">{event.conditionAtRemoval ?? "serviceable"}</Badge>
                      </div>
                    ))
                  )}
                </div>

                <div className="hidden md:flex flex-col items-center justify-center gap-2 text-muted-foreground/70">
                  {Array.from({ length: Math.max(1, rowCount) }).map((_, i) => (
                    <div key={i} className="flex flex-col items-center">
                      <div className="h-7 border-l border-dashed border-border" />
                      <ArrowRightLeft className="w-3.5 h-3.5" />
                      <div className="h-7 border-l border-dashed border-border" />
                    </div>
                  ))}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Parts Installed</h4>
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => openAddPart(step._id, "installed")}>
                      <Plus className="w-3 h-3 mr-1" /> Add Part
                    </Button>
                  </div>
                  {installed.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">No installed parts tracked.</p>
                  ) : (
                    installed.map((event) => (
                      <PartCard
                        key={String(event._id)}
                        title={`${event.partNumber}${event.serialNumber ? ` · S/N ${event.serialNumber}` : ""}`}
                        detail={event.description}
                        meta={`Qty ${event.quantity ?? 1}${event.eightOneThirtyReference ? ` · 8130-3 ${event.eightOneThirtyReference}` : ""}${event.batchNumber ? ` · Batch ${event.batchNumber}` : ""}`}
                        timeline={`${event.fromCustody ?? "Unknown"} → ${event.toCustody ?? "Unknown"} · ${formatDateTime(event.createdAt)}`}
                        onVoid={() => void voidEvent(event._id)}
                      />
                    ))
                  )}
                </div>
              </div>
            </div>
          );
        })}

      <Dialog open={!!dialog} onOpenChange={(open) => !open && setDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dialog?.type === "removed" ? "Record Removed Part" : "Record Installed Part"}</DialogTitle>
            <DialogDescription>Select inventory part and capture custody metadata.</DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8" placeholder="Search P/N, S/N, lot, batch" />
            </div>

            <Select value={selectedPartId} onValueChange={setSelectedPartId}>
              <SelectTrigger>
                <SelectValue placeholder="Select part" />
              </SelectTrigger>
              <SelectContent>
                {filteredParts.slice(0, 50).map((part) => (
                  <SelectItem key={part._id} value={part._id}>
                    {part.partNumber} {part.serialNumber ? `· ${part.serialNumber}` : ""} {part.lotNumber ? `· Lot ${part.lotNumber}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {dialog?.type === "installed" ? (
              <>
                <Input value={quantity} onChange={(e) => setQuantity(e.target.value.replace(/[^0-9]/g, ""))} placeholder="Quantity" />
                <Input value={ref8130} onChange={(e) => setRef8130(e.target.value)} placeholder="8130-3 reference (optional)" />
              </>
            ) : (
              <Select value={removeCondition} onValueChange={(v) => setRemoveCondition(v as "serviceable" | "unserviceable" | "scrap")}>
                <SelectTrigger>
                  <SelectValue placeholder="Removal condition" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="serviceable">Serviceable</SelectItem>
                  <SelectItem value="unserviceable">Unserviceable</SelectItem>
                  <SelectItem value="scrap">Scrap</SelectItem>
                </SelectContent>
              </Select>
            )}

            <Input value={fromCustody} onChange={(e) => setFromCustody(e.target.value)} placeholder="From custody/location" />
            <Input value={toCustody} onChange={(e) => setToCustody(e.target.value)} placeholder="To custody/location" />
            <Input value={custodyNote} onChange={(e) => setCustodyNote(e.target.value)} placeholder="Chain-of-custody notes (optional)" />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(null)}>Cancel</Button>
            <Button onClick={() => void addPart()}>Record Event</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
