"use client";

/**
 * PartReturnDialog — MBP-0048: Part Return-to-Parts Workflow
 *
 * Allows a tech to initiate a "Return Part to Stock" from any context.
 * Pre-fills return info (part number, serial, condition).
 * Parts clerk sees return in queue on the parts requests page, confirms receipt,
 * and after receiving inspection → re-stocks.
 *
 * Uses localStorage for the return queue (consistent with existing
 * ReturnPartDialog in src/shared/components/).
 */

import { useState } from "react";
import { toast } from "sonner";
import { RotateCcw, Package } from "lucide-react";
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

export type PartReturnQueueItem = {
  id: string;
  partNumber: string;
  serialNumber?: string;
  condition: "serviceable" | "unserviceable" | "needs_inspection";
  quantity: number;
  reason: string;
  returnedBy: string;
  returnedAt: number;
  status: "pending" | "received" | "inspected" | "restocked" | "rejected";
};

const RETURN_QUEUE_KEY = "athelon:part-return-queue";

export function getReturnQueue(orgId: string): PartReturnQueueItem[] {
  try {
    const raw = localStorage.getItem(`${RETURN_QUEUE_KEY}:${orgId}`);
    return raw ? (JSON.parse(raw) as PartReturnQueueItem[]) : [];
  } catch {
    return [];
  }
}

export function saveReturnQueue(orgId: string, queue: PartReturnQueueItem[]) {
  localStorage.setItem(`${RETURN_QUEUE_KEY}:${orgId}`, JSON.stringify(queue));
}

interface PartReturnDialogProps {
  orgId?: string;
  /** Pre-fill part number */
  partNumber?: string;
  /** Pre-fill serial number */
  serialNumber?: string;
  /** Pre-fill condition */
  condition?: string;
  /** Name of the tech returning the part */
  techName?: string;
  /** Trigger button variant */
  triggerVariant?: "default" | "outline" | "ghost";
}

export function PartReturnDialog({
  orgId,
  partNumber: prefillPN = "",
  serialNumber: prefillSN = "",
  condition: prefillCondition,
  techName = "Unknown",
  triggerVariant = "outline",
}: PartReturnDialogProps) {
  const [open, setOpen] = useState(false);
  const [partNumber, setPartNumber] = useState(prefillPN);
  const [serialNumber, setSerialNumber] = useState(prefillSN);
  const [condition, setCondition] = useState<"serviceable" | "unserviceable" | "needs_inspection">(
    (prefillCondition === "unserviceable" ? "unserviceable" : prefillCondition === "needs_inspection" ? "needs_inspection" : "serviceable"),
  );
  const [quantity, setQuantity] = useState("1");
  const [reason, setReason] = useState("");

  // Reset form when dialog opens
  function handleOpenChange(isOpen: boolean) {
    setOpen(isOpen);
    if (isOpen) {
      setPartNumber(prefillPN);
      setSerialNumber(prefillSN);
      setCondition(
        prefillCondition === "unserviceable" ? "unserviceable" : prefillCondition === "needs_inspection" ? "needs_inspection" : "serviceable",
      );
      setQuantity("1");
      setReason("");
    }
  }

  function handleSubmit() {
    if (!orgId) return;
    if (!partNumber.trim()) {
      toast.error("Part number is required.");
      return;
    }
    if (!reason.trim()) {
      toast.error("Return reason is required.");
      return;
    }
    const qty = Math.max(1, parseInt(quantity || "1", 10) || 1);

    const item: PartReturnQueueItem = {
      id: crypto.randomUUID(),
      partNumber: partNumber.trim(),
      serialNumber: serialNumber.trim() || undefined,
      condition,
      quantity: qty,
      reason: reason.trim(),
      returnedBy: techName,
      returnedAt: Date.now(),
      status: "pending",
    };

    const queue = getReturnQueue(orgId);
    queue.unshift(item);
    saveReturnQueue(orgId, queue);

    toast.success(`Return request submitted for ${partNumber.trim()}.`);
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" variant={triggerVariant} className="h-8 text-xs gap-1.5" disabled={!orgId}>
          <RotateCcw className="w-3.5 h-3.5" />
          Return Part to Stock
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-4 h-4" />
            Return Part to Stock
          </DialogTitle>
          <DialogDescription>
            Submit a part return request. The parts clerk will review, inspect, and re-stock.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Part Number *</Label>
              <Input
                value={partNumber}
                onChange={(e) => setPartNumber(e.target.value)}
                placeholder="e.g. MS20470AD4-4"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Serial Number</Label>
              <Input
                value={serialNumber}
                onChange={(e) => setSerialNumber(e.target.value)}
                placeholder="Optional"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Quantity</Label>
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
              <Select value={condition} onValueChange={(v) => setCondition(v as typeof condition)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="serviceable">Serviceable</SelectItem>
                  <SelectItem value="unserviceable">Unserviceable</SelectItem>
                  <SelectItem value="needs_inspection">Needs Inspection</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Reason *</Label>
            <Textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value.slice(0, 300))}
              placeholder="Why is this part being returned?"
              className="resize-none"
            />
            <p className="text-[10px] text-right text-muted-foreground">{reason.length}/300</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleSubmit}>Submit Return</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
