"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
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
import { Loader2 } from "lucide-react";
import type { Id } from "@/convex/_generated/dataModel";

// ─── Types ──────────────────────────────────────────────────────────────────

type Disposition =
  | "corrected"
  | "deferred_grounded"
  | "no_fault_found"
  | "no_fault_found_could_not_reproduce"
  | "deferred_mel";

interface DiscrepancyDispositionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  discrepancyId: Id<"discrepancies">;
  discrepancyNumber: string;
}

const DISPOSITION_OPTIONS: { value: Disposition; label: string }[] = [
  { value: "corrected", label: "Corrected" },
  { value: "deferred_grounded", label: "Deferred (Grounded)" },
  { value: "deferred_mel", label: "Deferred (MEL)" },
  { value: "no_fault_found", label: "No Fault Found" },
  { value: "no_fault_found_could_not_reproduce", label: "Could Not Reproduce" },
];

const MEL_CATEGORIES = ["A", "B", "C", "D"] as const;

// ─── Component ──────────────────────────────────────────────────────────────

export function DiscrepancyDispositionDialog({
  open,
  onOpenChange,
  discrepancyId,
  discrepancyNumber,
}: DiscrepancyDispositionDialogProps) {
  const { orgId, techId } = useCurrentOrg();
  const [disposition, setDisposition] = useState<Disposition | "">("");
  const [correctiveAction, setCorrectiveAction] = useState("");
  const [deferredReason, setDeferredReason] = useState("");
  const [noFaultNotes, setNoFaultNotes] = useState("");
  const [melItemNumber, setMelItemNumber] = useState("");
  const [melCategory, setMelCategory] = useState<"A" | "B" | "C" | "D" | "">("");
  const [submitting, setSubmitting] = useState(false);

  const dispositionMutation = useMutation(api.discrepancies.dispositionDiscrepancy);
  const deferMutation = useMutation(api.discrepancies.deferDiscrepancy);

  const resetForm = () => {
    setDisposition("");
    setCorrectiveAction("");
    setDeferredReason("");
    setNoFaultNotes("");
    setMelItemNumber("");
    setMelCategory("");
  };

  const handleSubmit = async () => {
    if (!orgId || !techId || !disposition) return;

    setSubmitting(true);
    try {
      if (disposition === "deferred_mel") {
        if (!melItemNumber || !melCategory) {
          toast.error("MEL item number and category are required.");
          setSubmitting(false);
          return;
        }
        // deferDiscrepancy requires a signatureAuthEventId — for now we skip
        // since that requires a full auth flow. Show message.
        toast.error(
          "MEL deferral requires pre-signing authentication. Use the full deferral workflow.",
        );
        setSubmitting(false);
        return;
      }

      await dispositionMutation({
        discrepancyId,
        organizationId: orgId as Id<"organizations">,
        disposition,
        dispositionedByTechnicianId: techId as Id<"technicians">,
        ...(disposition === "corrected" && correctiveAction
          ? { correctiveAction }
          : {}),
        ...(disposition === "deferred_grounded" && deferredReason
          ? { deferredReason }
          : {}),
        ...((disposition === "no_fault_found" ||
          disposition === "no_fault_found_could_not_reproduce") &&
        noFaultNotes
          ? { noFaultNotes }
          : {}),
      });

      toast.success(`Discrepancy ${discrepancyNumber} dispositioned as "${disposition.replace(/_/g, " ")}"`);
      resetForm();
      onOpenChange(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Disposition failed";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const isValid =
    disposition !== "" &&
    (disposition !== "corrected" || correctiveAction.trim().length > 0) &&
    (disposition !== "deferred_grounded" || deferredReason.trim().length > 0) &&
    (disposition !== "deferred_mel" || (melItemNumber.trim() && melCategory));

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); onOpenChange(v); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Disposition {discrepancyNumber}</DialogTitle>
          <DialogDescription>
            Record the resolution for this discrepancy.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Disposition type */}
          <div className="space-y-1.5">
            <Label>Disposition</Label>
            <Select value={disposition} onValueChange={(v) => setDisposition(v as Disposition)}>
              <SelectTrigger>
                <SelectValue placeholder="Select disposition…" />
              </SelectTrigger>
              <SelectContent>
                {DISPOSITION_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Corrective action (for "corrected") */}
          {disposition === "corrected" && (
            <div className="space-y-1.5">
              <Label>Corrective Action *</Label>
              <Textarea
                value={correctiveAction}
                onChange={(e) => setCorrectiveAction(e.target.value)}
                placeholder="Describe the corrective action taken…"
                rows={3}
              />
            </div>
          )}

          {/* Deferred grounded reason */}
          {disposition === "deferred_grounded" && (
            <div className="space-y-1.5">
              <Label>Deferral Reason *</Label>
              <Textarea
                value={deferredReason}
                onChange={(e) => setDeferredReason(e.target.value)}
                placeholder="Reason for grounding deferral…"
                rows={3}
              />
            </div>
          )}

          {/* MEL fields */}
          {disposition === "deferred_mel" && (
            <>
              <div className="space-y-1.5">
                <Label>MEL Item Number *</Label>
                <Input
                  value={melItemNumber}
                  onChange={(e) => setMelItemNumber(e.target.value)}
                  placeholder="e.g., 28-10-01"
                />
              </div>
              <div className="space-y-1.5">
                <Label>MEL Category *</Label>
                <Select value={melCategory} onValueChange={(v) => setMelCategory(v as typeof melCategory)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category…" />
                  </SelectTrigger>
                  <SelectContent>
                    {MEL_CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        Category {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {/* No fault notes */}
          {(disposition === "no_fault_found" ||
            disposition === "no_fault_found_could_not_reproduce") && (
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea
                value={noFaultNotes}
                onChange={(e) => setNoFaultNotes(e.target.value)}
                placeholder="Describe findings…"
                rows={3}
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!isValid || submitting}>
            {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Submit Disposition
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
