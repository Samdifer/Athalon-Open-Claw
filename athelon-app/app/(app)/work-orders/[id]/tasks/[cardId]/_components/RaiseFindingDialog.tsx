"use client";

/**
 * RaiseFindingDialog.tsx
 * Gap 4: "Raise Finding" button inside task card execution.
 * Creates a discrepancy linked to the current work order.
 */

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  AlertTriangle,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

// ─── Constants ────────────────────────────────────────────────────────────────

const FOUND_DURING_OPTIONS = [
  { value: "annual_inspection", label: "Annual Inspection" },
  { value: "100hr_inspection", label: "100-Hour Inspection" },
  { value: "progressive_inspection", label: "Progressive Inspection" },
  { value: "routine_maintenance", label: "Routine Maintenance" },
  { value: "preflight", label: "Preflight" },
  { value: "pilot_report", label: "Pilot Report" },
  { value: "ad_compliance_check", label: "AD Compliance Check" },
  { value: "other", label: "Other" },
] as const;

type FoundDuringValue = (typeof FOUND_DURING_OPTIONS)[number]["value"];

// ─── Props ────────────────────────────────────────────────────────────────────

export interface RaiseFindingDialogProps {
  open: boolean;
  onClose: () => void;
  workOrderId: Id<"workOrders">;
  orgId: Id<"organizations">;
  techId: Id<"technicians">;
  aircraftHours: number;
  taskCardTitle?: string;
  stepDescription?: string;
  onSuccess?: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function RaiseFindingDialog({
  open,
  onClose,
  workOrderId,
  orgId,
  techId,
  aircraftHours,
  taskCardTitle,
  stepDescription,
  onSuccess,
}: RaiseFindingDialogProps) {
  const [description, setDescription] = useState("");
  const [foundDuring, setFoundDuring] = useState<FoundDuringValue>("routine_maintenance");
  const [componentAffected, setComponentAffected] = useState("");
  const [componentPartNumber, setComponentPartNumber] = useState("");
  const [componentSerialNumber, setComponentSerialNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openDiscrepancy = useMutation(api.discrepancies.openDiscrepancy);

  async function handleSubmit() {
    if (!description.trim()) {
      setError("Description is required.");
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      await openDiscrepancy({
        workOrderId,
        organizationId: orgId,
        description: description.trim(),
        foundDuring,
        foundByTechnicianId: techId,
        foundAtAircraftHours: aircraftHours,
        componentAffected: componentAffected.trim() || undefined,
        componentPartNumber: componentPartNumber.trim() || undefined,
        componentSerialNumber: componentSerialNumber.trim() || undefined,
        notes: notes.trim() || undefined,
      });

      // Reset form
      setDescription("");
      setComponentAffected("");
      setComponentPartNumber("");
      setComponentSerialNumber("");
      setNotes("");
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create finding.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            Raise Finding / Squawk
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Context banner */}
          {(taskCardTitle || stepDescription) && (
            <div className="p-2.5 rounded-md bg-muted/40 border border-border/40">
              <p className="text-[11px] text-muted-foreground">
                Found during:{" "}
                <span className="text-foreground font-medium">
                  {taskCardTitle}
                  {stepDescription ? ` → ${stepDescription}` : ""}
                </span>
              </p>
            </div>
          )}

          {/* Description */}
          <div>
            <Label htmlFor="finding-description" className="text-xs font-medium mb-1.5 block">
              Description <span className="text-red-400" aria-hidden="true">*</span>
            </Label>
            <Textarea
              id="finding-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the discrepancy found..."
              rows={3}
              className="text-sm bg-muted/30 border-border/60 resize-none"
              aria-required="true"
            />
          </div>

          {/* Found During */}
          <div>
            <Label htmlFor="finding-found-during" className="text-xs font-medium mb-1.5 block">
              Found During <span className="text-red-400" aria-hidden="true">*</span>
            </Label>
            <Select
              value={foundDuring}
              onValueChange={(v) => setFoundDuring(v as FoundDuringValue)}
            >
              <SelectTrigger id="finding-found-during" className="h-9 text-sm bg-muted/30 border-border/60" aria-required="true" aria-label="Found during (required)">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FOUND_DURING_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Component fields (collapsible row) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <Label htmlFor="finding-component" className="text-xs font-medium mb-1.5 block">
                Component Affected
              </Label>
              <Input
                id="finding-component"
                value={componentAffected}
                onChange={(e) => setComponentAffected(e.target.value)}
                placeholder="e.g. Left main gear"
                className="h-9 text-sm bg-muted/30 border-border/60"
              />
            </div>
            <div>
              <Label htmlFor="finding-part-number" className="text-xs font-medium mb-1.5 block">
                Part Number
              </Label>
              <Input
                id="finding-part-number"
                value={componentPartNumber}
                onChange={(e) => setComponentPartNumber(e.target.value)}
                placeholder="P/N"
                className="h-9 text-sm bg-muted/30 border-border/60"
              />
            </div>
            <div>
              <Label htmlFor="finding-serial-number" className="text-xs font-medium mb-1.5 block">
                Serial Number
              </Label>
              <Input
                id="finding-serial-number"
                value={componentSerialNumber}
                onChange={(e) => setComponentSerialNumber(e.target.value)}
                placeholder="S/N"
                className="h-9 text-sm bg-muted/30 border-border/60"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="finding-notes" className="text-xs font-medium mb-1.5 block">
              Notes{" "}
              <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <Textarea
              id="finding-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional context, references, photos..."
              rows={2}
              className="text-sm bg-muted/30 border-border/60 resize-none"
            />
          </div>

          {error && (
            <div className="flex items-start gap-2 p-2.5 rounded-md border border-red-500/30 bg-red-500/5">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-red-400">{error}</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !description.trim()}
            className="gap-2"
            size="sm"
            variant="destructive"
          >
            {isSubmitting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <AlertTriangle className="w-3.5 h-3.5" />
            )}
            Raise Finding
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
