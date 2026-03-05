"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type StepSeed = {
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
};

type IssuedPart = {
  id: string;
  stepId: string;
  stepNumber: number;
  partId?: string;
  partNumber: string;
  serialNumber?: string;
  description: string;
  issuedQty: number;
  returnedQty: number;
  remainingQty: number;
};

type ReturnRecord = {
  id: string;
  partId?: string;
  partNumber: string;
  serialNumber?: string;
  description: string;
  quantity: number;
  condition: "serviceable" | "damaged";
  reason: string;
  stepId: string;
  stepNumber: number;
  returnedAt: number;
};

function stepStorageKey(orgId: string, stepId: string) {
  return `step-parts-trace:${orgId}:${stepId}`;
}

function returnsStorageKey(orgId: string, workOrderId: string, taskCardId: string) {
  return `athelon:parts-returns:${orgId}:${workOrderId}:${taskCardId}`;
}

export function ReturnPartDialog({
  orgId,
  workOrderId,
  taskCardId,
  steps,
}: {
  orgId?: string;
  workOrderId: string;
  taskCardId: string;
  steps: StepSeed[];
}) {
  const [open, setOpen] = useState(false);
  const [selectedIssuedId, setSelectedIssuedId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [condition, setCondition] = useState<"serviceable" | "damaged">("serviceable");
  const [reason, setReason] = useState("");

  const issuedParts = useMemo<IssuedPart[]>(() => {
    if (!orgId) return [];

    const seededInstalled = steps.flatMap((step) =>
      (step.partsInstalled ?? []).map((part, idx) => ({
        id: `${step._id}:seed:${idx}`,
        stepId: step._id,
        stepNumber: step.stepNumber,
        partId: part.partId,
        partNumber: part.partNumber,
        serialNumber: part.serialNumber,
        description: part.description,
        issuedQty: Number(part.quantity) || 1,
      })),
    );

    type LocalInstalledItem = {
      id: string;
      stepId: string;
      stepNumber: number;
      partId?: string;
      partNumber: string;
      serialNumber?: string;
      description: string;
      issuedQty: number;
    };

    const localInstalled: LocalInstalledItem[] = steps.flatMap((step) => {
      try {
        const raw = window.localStorage.getItem(stepStorageKey(orgId, step._id));
        const parsed = raw ? (JSON.parse(raw) as { installed?: Array<Record<string, unknown>> }) : null;
        return (parsed?.installed ?? []).map<LocalInstalledItem>((part, idx) => ({
          id: `${step._id}:local:${idx}`,
          stepId: step._id,
          stepNumber: step.stepNumber,
          partId: part.partId as string | undefined,
          partNumber: String(part.partNumber ?? ""),
          serialNumber: part.serialNumber as string | undefined,
          description: String(part.description ?? ""),
          issuedQty: Number(part.quantity) || 1,
        }));
      } catch {
        return [] as LocalInstalledItem[];
      }
    });

    const allIssued = [...seededInstalled, ...localInstalled];
    const merged = new Map<string, IssuedPart>();

    for (const item of allIssued) {
      const key = `${item.stepId}|${item.partNumber}|${item.serialNumber ?? ""}`;
      const existing = merged.get(key);
      if (existing) {
        existing.issuedQty += item.issuedQty;
      } else {
        merged.set(key, {
          ...item,
          returnedQty: 0,
          remainingQty: item.issuedQty,
        });
      }
    }

    try {
      const returnsRaw = window.localStorage.getItem(
        returnsStorageKey(orgId, workOrderId, taskCardId),
      );
      const returns = returnsRaw ? (JSON.parse(returnsRaw) as ReturnRecord[]) : [];
      for (const ret of returns) {
        const key = `${ret.stepId}|${ret.partNumber}|${ret.serialNumber ?? ""}`;
        const existing = merged.get(key);
        if (!existing) continue;
        existing.returnedQty += ret.quantity;
        existing.remainingQty = Math.max(0, existing.issuedQty - existing.returnedQty);
      }
    } catch {
      // no-op
    }

    return Array.from(merged.values()).filter((part) => part.remainingQty > 0);
  }, [orgId, steps, taskCardId, workOrderId]);

  const selectedPart = issuedParts.find((p) => p.id === selectedIssuedId);

  const handleSubmit = () => {
    if (!orgId) return;
    if (!selectedPart) {
      toast.error("Select an issued part to return.");
      return;
    }
    const qty = Math.max(1, parseInt(quantity || "1", 10) || 1);
    if (qty > selectedPart.remainingQty) {
      toast.error(`Return quantity cannot exceed remaining issued qty (${selectedPart.remainingQty}).`);
      return;
    }
    if (!reason.trim()) {
      toast.error("Reason is required for part return.");
      return;
    }

    const record: ReturnRecord = {
      id: crypto.randomUUID(),
      partId: selectedPart.partId,
      partNumber: selectedPart.partNumber,
      serialNumber: selectedPart.serialNumber,
      description: selectedPart.description,
      quantity: qty,
      condition,
      reason: reason.trim(),
      stepId: selectedPart.stepId,
      stepNumber: selectedPart.stepNumber,
      returnedAt: Date.now(),
    };

    try {
      const key = returnsStorageKey(orgId, workOrderId, taskCardId);
      const currentRaw = window.localStorage.getItem(key);
      const current = currentRaw ? (JSON.parse(currentRaw) as ReturnRecord[]) : [];
      window.localStorage.setItem(key, JSON.stringify([record, ...current]));

      const stepKey = stepStorageKey(orgId, selectedPart.stepId);
      const traceRaw = window.localStorage.getItem(stepKey);
      if (traceRaw) {
        const trace = JSON.parse(traceRaw) as { installed?: any[]; removed?: any[] };
        let qtyRemaining = qty;
        const installed = [...(trace.installed ?? [])].map((it) => {
          if (qtyRemaining <= 0) return it;
          const samePart =
            it.partNumber === selectedPart.partNumber &&
            (it.serialNumber ?? "") === (selectedPart.serialNumber ?? "");
          if (!samePart) return it;
          const currentQty = Number(it.quantity) || 1;
          const deducted = Math.min(currentQty, qtyRemaining);
          qtyRemaining -= deducted;
          return { ...it, quantity: Math.max(0, currentQty - deducted) };
        });

        const sanitizedInstalled = installed.filter((it) => (Number(it.quantity) || 0) > 0);
        const removedEntry = {
          partId: selectedPart.partId,
          partNumber: selectedPart.partNumber,
          serialNumber: selectedPart.serialNumber,
          description: selectedPart.description,
          conditionAtRemoval: condition === "damaged" ? "unserviceable" : "serviceable",
        };
        const removed = [...(trace.removed ?? []), removedEntry];
        window.localStorage.setItem(
          stepKey,
          JSON.stringify({
            ...trace,
            installed: sanitizedInstalled,
            removed,
          }),
        );
      }

      toast.success(`Returned ${qty} x ${selectedPart.partNumber} to inventory.`);
      setOpen(false);
      setSelectedIssuedId("");
      setQuantity("1");
      setCondition("serviceable");
      setReason("");
    } catch {
      toast.error("Failed to record part return.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5" disabled={!orgId || issuedParts.length === 0}>
          <RotateCcw className="w-3.5 h-3.5" />
          Return Part
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Return Part to Inventory</DialogTitle>
          <DialogDescription>
            Return unused issued parts back to stock with condition and traceability reason.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-1">
          <div className="space-y-1.5">
            <Label className="text-xs">Issued part</Label>
            <Select value={selectedIssuedId} onValueChange={setSelectedIssuedId}>
              <SelectTrigger>
                <SelectValue placeholder="Select issued part" />
              </SelectTrigger>
              <SelectContent>
                {issuedParts.map((part) => (
                  <SelectItem key={part.id} value={part.id}>
                    {part.partNumber}
                    {part.serialNumber ? ` · ${part.serialNumber}` : ""} · Step {part.stepNumber} · Remaining {part.remainingQty}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Quantity returning</Label>
              <Input
                type="number"
                min="1"
                step="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value.replace(/[^0-9]/g, ""))}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Condition</Label>
              <Select value={condition} onValueChange={(v) => setCondition(v as "serviceable" | "damaged")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="serviceable">Serviceable</SelectItem>
                  <SelectItem value="damaged">Damaged</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Reason</Label>
            <Textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value.slice(0, 300))}
              placeholder="Why is this part being returned?"
              className="resize-none"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleSubmit}>Confirm Return</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
