"use client";

/**
 * MarkNaDialog.tsx
 * Allows a technician to mark a task card step as N/A (Not Applicable).
 *
 * Backend: completeStep({ action: "mark_na", naReason, naAuthorizedById })
 * Self-authorization is permitted for routine N/A items.
 * No signature auth event is required for N/A marking.
 */

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Minus, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

// ─── Props ────────────────────────────────────────────────────────────────────

export interface MarkNaDialogProps {
  open: boolean;
  onClose: () => void;
  stepNumber: number;
  stepDescription: string;
  orgId: Id<"organizations">;
  techId: Id<"technicians">;
  taskCardId: Id<"taskCards">;
  stepId: Id<"taskCardSteps">;
  onSuccess: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function MarkNaDialog({
  open,
  onClose,
  stepNumber,
  stepDescription,
  orgId,
  techId,
  taskCardId,
  stepId,
  onSuccess,
}: MarkNaDialogProps) {
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const completeStep = useMutation(api.taskCards.completeStep);

  // BUG-LT-HUNT-002: Reset reason and error when the dialog (re-)opens.
  // Without this, if a tech opens the N/A dialog for Step 3, types a reason,
  // then closes WITHOUT submitting, then opens the dialog again for Step 5,
  // Step 5's dialog pre-fills with Step 3's reason text — and any stale error
  // from a previous failed attempt is still visible. This is particularly bad
  // for maintenance records: a tech may not notice the pre-filled text and
  // accidentally submit Step 5 with Step 3's reason. Under 14 CFR 43.9(a)(2)
  // the N/A reason is a permanent maintenance record and cannot be corrected
  // after sign-off.
  useEffect(() => {
    if (open) {
      setReason("");
      setError(null);
    }
  }, [open]);

  async function handleMarkNa() {
    const trimmedReason = reason.trim();
    if (!trimmedReason) {
      setError("A reason is required to mark a step N/A.");
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      await completeStep({
        stepId,
        taskCardId,
        organizationId: orgId,
        action: "mark_na",
        naReason: trimmedReason,
        // Self-authorization is permitted per backend rule:
        // "Self-authorization (naAuthorizedById == callerTechnicianId) is permitted
        //  for routine N/A items."
        naAuthorizedById: techId,
        callerTechnicianId: techId,
      });
      setReason("");
      // BUG-QCM-MNA-001: No toast after step is marked N/A. Same silent-close
      // issue as SignStepDialog / SignCardDialog. A tech marking 3 steps N/A
      // on a large task card has no confirmation the action was recorded — they
      // must scroll up to see the step status change before the Convex
      // subscription fires. Added toast so the action is clearly acknowledged.
      toast.success(`Step ${stepNumber} marked N/A`);
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to mark step N/A");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    // BUG-LT-002: Guard against mid-submit dismissal. Without this check,
    // pressing Escape or clicking outside while completeStep is in-flight
    // closes the dialog. The Convex mutation may still succeed and mark the
    // step as N/A, but onSuccess() never fires, signStepTarget never clears,
    // and the UI still shows the step as pending even though it was marked N/A.
    // Re-opening attempts a second N/A mutation, which the backend rejects
    // ("step already completed") with no clear explanation.
    <Dialog open={open} onOpenChange={(v) => { if (!v && !isSubmitting) onClose(); }}>
      <DialogContent className="max-w-[95vw] sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Minus className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
            Mark Step {stepNumber} — Not Applicable
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <p className="text-sm text-muted-foreground line-clamp-3">{stepDescription}</p>

          <div className="flex items-start gap-2 p-2.5 rounded-md bg-muted/40 border border-border/50">
            <Minus className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground">
              Marking a step N/A indicates the step does not apply to this
              specific aircraft or work scope. A reason must be recorded per
              14 CFR 43.9(a)(2). Self-authorization is permitted.
            </p>
          </div>

          {/* Reason */}
          <div>
            <Label htmlFor="na-reason" className="text-xs font-medium mb-1.5 block">
              Reason Step Does Not Apply{" "}
              <span className="text-red-400" aria-hidden="true">*</span>
            </Label>
            {/* BUG-LT-073: N/A reason textarea had no maxLength cap. All other
                sign-off dialog textareas (SignStepDialog notes, SignCardDialog
                RTS statement, RaiseFindingDialog description) were capped in
                prior cycles, but MarkNaDialog was missed. A tech pasting a
                long AMM statement or discrepancy description into the reason
                field could exceed the backend schema limit and get a cryptic
                validation error on submit — losing the entered text and having
                to re-type. Under 14 CFR 43.9(a)(2) the N/A reason is a
                permanent maintenance record; an unclear error on submit is
                especially bad here. 500 chars is generous for any N/A reason
                (e.g. "Not installed — aircraft does not have ADS-B Out
                equipment; modification deferred per AMM 34-51-00 Rev 12").
                Counter turns amber at ≥450 chars. */}
            <Textarea
              id="na-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value.slice(0, 500))}
              placeholder="e.g. Not applicable — aircraft does not have this system installed. See task card note for details."
              rows={3}
              maxLength={500}
              className="text-sm bg-muted/30 border-border/60 resize-none"
              aria-required="true"
              autoFocus
            />
            <div className="flex items-center justify-between mt-1">
              <p className="text-[10px] text-muted-foreground">
                This reason becomes part of the permanent maintenance record.
              </p>
              <p className={`text-[10px] ${reason.length >= 450 ? "text-amber-400" : "text-muted-foreground/50"}`}>
                {reason.length}/500
              </p>
            </div>
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
            variant="outline"
            size="sm"
            onClick={handleMarkNa}
            disabled={isSubmitting || !reason.trim()}
            className="gap-1.5 border-muted-foreground/30"
          >
            {isSubmitting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Minus className="w-3.5 h-3.5" />
            )}
            Mark N/A
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
