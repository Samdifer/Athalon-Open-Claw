"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ArrowRightLeft, Plus, Search } from "lucide-react";
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

type InventoryPart = {
  _id: string;
  partNumber: string;
  partName: string;
  description?: string;
  serialNumber?: string;
  condition?: string;
};

type StepPartInstalled = {
  partId?: string;
  partNumber: string;
  serialNumber?: string;
  description: string;
  quantity: number;
  eightOneThirtyReference?: string;
};

type StepPartRemoved = {
  partId?: string;
  partNumber: string;
  serialNumber?: string;
  description: string;
  conditionAtRemoval: "serviceable" | "unserviceable" | "scrap";
};

type StepModel = {
  _id: string;
  stepNumber: number;
  description: string;
  partsInstalled?: Array<{
    partId?: string;
    partNumber: string;
    serialNumber?: string;
    description: string;
    quantity: number;
  }>;
  partsRemoved?: Array<{
    partId?: string;
    partNumber: string;
    serialNumber?: string;
    description: string;
    conditionAtRemoval?: string;
  }>;
};

type StepLocalState = {
  installed: StepPartInstalled[];
  removed: StepPartRemoved[];
};

function stepStorageKey(orgId: string, stepId: string) {
  return `step-parts-trace:${orgId}:${stepId}`;
}

function PartCard({ title, detail, meta }: { title: string; detail?: string; meta?: string }) {
  return (
    <div className="rounded-md border border-border/60 bg-muted/20 p-2.5">
      <p className="text-xs font-mono text-foreground">{title}</p>
      {detail ? <p className="text-xs text-muted-foreground mt-0.5">{detail}</p> : null}
      {meta ? <p className="text-[11px] text-muted-foreground mt-1">{meta}</p> : null}
    </div>
  );
}

export function StepPartsTracker({
  orgId,
  steps,
  inventoryParts,
}: {
  orgId?: string;
  steps: StepModel[];
  inventoryParts: InventoryPart[];
}) {
  const [stepState, setStepState] = useState<Record<string, StepLocalState>>({});
  const [dialog, setDialog] = useState<{ stepId: string; type: "installed" | "removed" } | null>(null);
  const [search, setSearch] = useState("");
  const [selectedPartId, setSelectedPartId] = useState<string>("");
  const [quantity, setQuantity] = useState("1");
  const [ref8130, setRef8130] = useState("");
  const [removeCondition, setRemoveCondition] = useState<"serviceable" | "unserviceable" | "scrap">("serviceable");

  useEffect(() => {
    if (!orgId) return;

    const seeded: Record<string, StepLocalState> = {};
    for (const step of steps) {
      const key = stepStorageKey(orgId, step._id);
      const fromStorage = localStorage.getItem(key);
      if (fromStorage) {
        try {
          const parsed = JSON.parse(fromStorage) as Partial<StepLocalState>;
          // BUG-HUNTER-TRACE-001: Guard against malformed localStorage payloads.
          // A bad payload (manual edits/old schema) previously flowed straight
          // into render paths that expect arrays, causing .map runtime crashes.
          if (Array.isArray(parsed.installed) && Array.isArray(parsed.removed)) {
            seeded[step._id] = {
              installed: parsed.installed,
              removed: parsed.removed,
            };
            continue;
          }
        } catch {
          // fall through to backend seed
        }
      }
      seeded[step._id] = {
        installed: (step.partsInstalled ?? []).map((p) => ({
          partId: p.partId,
          partNumber: p.partNumber,
          serialNumber: p.serialNumber,
          description: p.description,
          quantity: p.quantity,
          eightOneThirtyReference: "",
        })),
        removed: (step.partsRemoved ?? []).map((p) => ({
          partId: p.partId,
          partNumber: p.partNumber,
          serialNumber: p.serialNumber,
          description: p.description,
          conditionAtRemoval:
            p.conditionAtRemoval === "unserviceable"
              ? "unserviceable"
              : p.conditionAtRemoval === "scrap"
              ? "scrap"
              : "serviceable",
        })),
      };
    }
    setStepState(seeded);
  }, [orgId, steps]);

  const filteredParts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return inventoryParts;
    return inventoryParts.filter((p) =>
      [p.partNumber, p.serialNumber, p.partName, p.description]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [inventoryParts, search]);

  function persist(next: Record<string, StepLocalState>): boolean {
    if (!orgId) return false;
    try {
      for (const [stepId, value] of Object.entries(next)) {
        localStorage.setItem(stepStorageKey(orgId, stepId), JSON.stringify(value));
      }
      return true;
    } catch {
      toast.error("Unable to save parts traceability locally.");
      return false;
    }
  }

  function openAddPart(stepId: string, type: "installed" | "removed") {
    setDialog({ stepId, type });
    setSearch("");
    setSelectedPartId("");
    setQuantity("1");
    setRef8130("");
    setRemoveCondition("serviceable");
  }

  function addPart() {
    if (!dialog) return;
    const selected = inventoryParts.find((p) => p._id === selectedPartId);
    if (!selected) {
      toast.error("Select a part first.");
      return;
    }

    let didSave = true;
    setStepState((prev) => {
      const current = prev[dialog.stepId] ?? { installed: [], removed: [] };
      const next = { ...prev };
      if (dialog.type === "installed") {
        const qty = Math.max(1, Number.parseInt(quantity || "1", 10) || 1);
        next[dialog.stepId] = {
          ...current,
          installed: [
            ...current.installed,
            {
              partId: selected._id,
              partNumber: selected.partNumber,
              serialNumber: selected.serialNumber,
              description: selected.description ?? selected.partName,
              quantity: qty,
              eightOneThirtyReference: ref8130.trim() || undefined,
            },
          ],
        };
      } else {
        next[dialog.stepId] = {
          ...current,
          removed: [
            ...current.removed,
            {
              partId: selected._id,
              partNumber: selected.partNumber,
              serialNumber: selected.serialNumber,
              description: selected.description ?? selected.partName,
              conditionAtRemoval: removeCondition,
            },
          ],
        };
      }
      const persisted = persist(next);
      didSave = persisted;
      if (!persisted) return prev;
      return next;
    });

    if (!didSave) return;
    toast.success("Part added to step trace.");
    setDialog(null);
  }

  if (steps.length === 0) {
    return (
      <p className="text-xs text-muted-foreground italic">
        No step-level parts traceability required on this card.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {steps
        .slice()
        .sort((a, b) => a.stepNumber - b.stepNumber)
        .map((step) => {
          const state = stepState[step._id] ?? { installed: [], removed: [] };
          const rowCount = Math.max(state.removed.length, state.installed.length);

          return (
            <div key={step._id} className="rounded-lg border border-border/60 p-3">
              <p className="text-xs text-muted-foreground">Step {step.stepNumber}</p>
              <p className="text-sm text-foreground mb-3">{step.description}</p>

              <div className="grid grid-cols-1 md:grid-cols-[1fr_52px_1fr] gap-3">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Parts Removed
                    </h4>
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => openAddPart(step._id, "removed")}>
                      <Plus className="w-3 h-3 mr-1" /> Add Part
                    </Button>
                  </div>
                  {state.removed.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">No removed parts tracked.</p>
                  ) : (
                    state.removed.map((part, idx) => (
                      <div key={`${part.partNumber}-${idx}`} className="space-y-1">
                        <PartCard
                          title={`${part.partNumber}${part.serialNumber ? ` · S/N ${part.serialNumber}` : ""}`}
                          detail={part.description}
                        />
                        <Badge variant="outline" className="text-[10px] capitalize">
                          {part.conditionAtRemoval}
                        </Badge>
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
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Parts Installed
                    </h4>
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => openAddPart(step._id, "installed")}>
                      <Plus className="w-3 h-3 mr-1" /> Add Part
                    </Button>
                  </div>
                  {state.installed.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">No installed parts tracked.</p>
                  ) : (
                    state.installed.map((part, idx) => (
                      <PartCard
                        key={`${part.partNumber}-${idx}`}
                        title={`${part.partNumber}${part.serialNumber ? ` · S/N ${part.serialNumber}` : ""}`}
                        detail={part.description}
                        meta={`Qty ${part.quantity}${part.eightOneThirtyReference ? ` · 8130-3 ${part.eightOneThirtyReference}` : ""}`}
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
            <DialogTitle>{dialog?.type === "removed" ? "Add Removed Part" : "Add Installed Part"}</DialogTitle>
            <DialogDescription>Select from parts inventory and add to this step trace.</DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8" placeholder="Search P/N, S/N, description" />
            </div>

            <Select value={selectedPartId} onValueChange={setSelectedPartId}>
              <SelectTrigger>
                <SelectValue placeholder="Select part" />
              </SelectTrigger>
              <SelectContent>
                {filteredParts.slice(0, 50).map((part) => (
                  <SelectItem key={part._id} value={part._id}>
                    {part.partNumber} {part.serialNumber ? `· ${part.serialNumber}` : ""}
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
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(null)}>Cancel</Button>
            <Button onClick={addPart}>Add Part</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
