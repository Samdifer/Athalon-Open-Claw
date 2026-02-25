"use client";

/**
 * SignStepDialog.tsx
 * Extracted from tasks/[cardId]/page.tsx (TD-009).
 * The sign-off dialog for a single task card step.
 */

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  AlertTriangle,
  PenLine,
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
import { Separator } from "@/components/ui/separator";

// ─── Types ────────────────────────────────────────────────────────────────────

type RatingValue = "airframe" | "powerplant" | "ia" | "none";

const RATING_OPTIONS: { value: RatingValue; label: string }[] = [
  { value: "airframe", label: "Airframe (A)" },
  { value: "powerplant", label: "Powerplant (P)" },
  { value: "ia", label: "Inspection Authorization (IA)" },
  { value: "none", label: "No rating required" },
];

// ─── Props ────────────────────────────────────────────────────────────────────

export interface SignStepDialogProps {
  open: boolean;
  onClose: () => void;
  stepNumber: number;
  stepDescription: string;
  requiresIa: boolean;
  orgId: Id<"organizations">;
  techId: Id<"technicians">;
  taskCardId: Id<"taskCards">;
  stepId: Id<"taskCardSteps">;
  onSuccess: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function SignStepDialog({
  open,
  onClose,
  stepNumber,
  stepDescription,
  requiresIa,
  orgId,
  techId,
  taskCardId,
  stepId,
  onSuccess,
}: SignStepDialogProps) {
  const [pin, setPin] = useState("");
  const [rating, setRating] = useState<RatingValue>(
    requiresIa ? "ia" : "airframe",
  );
  const [notes, setNotes] = useState("");
  const [approvedDataRef, setApprovedDataRef] = useState("");
  const [partsInstalled, setPartsInstalled] = useState<
    { partNumber: string; serialNumber: string; description: string; quantity: number }[]
  >([]);
  const [showPartsForm, setShowPartsForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // FEAT-018: Fetch IA cert status for the signing technician
  const expiringCerts = useQuery(
    api.technicians.listWithExpiringCerts,
    orgId ? { organizationId: orgId, withinDays: 365 } : "skip",
  );
  const myExpiryEntry = expiringCerts?.find(
    (e) => e.technician?._id === techId,
  );
  const iaCertExpiry = myExpiryEntry?.cert.iaExpiryDate ?? null;
  const iaDaysRemaining =
    iaCertExpiry !== null
      ? Math.ceil((iaCertExpiry - Date.now()) / (1000 * 60 * 60 * 24))
      : null;
  const iaIsExpired = iaDaysRemaining !== null && iaDaysRemaining <= 0;
  const iaExpiringSoon =
    iaDaysRemaining !== null && iaDaysRemaining > 0 && iaDaysRemaining <= 30;
  const certNumber = myExpiryEntry?.cert.certificateNumber ?? null;

  const createAuthEvent = useMutation(api.workOrders.createSignatureAuthEvent);
  const completeStep = useMutation(api.taskCards.completeStep);

  async function handleSign() {
    setIsSubmitting(true);
    setError(null);
    try {
      // Step 1: Create a 5-minute auth event (re-authentication)
      const { eventId } = await createAuthEvent({
        organizationId: orgId,
        technicianId: techId,
        intendedTable: "taskCardSteps",
        pin,
      });

      // Step 2: Complete the step using the auth event
      await completeStep({
        stepId,
        taskCardId,
        organizationId: orgId,
        action: "complete",
        signatureAuthEventId: eventId,
        ratingsExercised: [rating],
        notes: notes.trim() || undefined,
        approvedDataReference: approvedDataRef.trim() || undefined,
        partsInstalled: partsInstalled.length > 0
          ? partsInstalled.map((p) => ({
              partNumber: p.partNumber,
              serialNumber: p.serialNumber || undefined,
              description: p.description,
              quantity: p.quantity,
            }))
          : undefined,
        callerTechnicianId: techId,
      });

      setPin("");
      setNotes("");
      onSuccess();
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to sign step",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <PenLine className="w-4 h-4 text-primary" />
            Sign Step {stepNumber}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <p className="text-sm text-muted-foreground">{stepDescription}</p>

          {requiresIa && (
            <div className="flex items-start gap-2 p-2.5 rounded-md bg-amber-500/10 border border-amber-500/30">
              <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-400">
                This step requires an IA sign-off. Your Inspection Authorization
                must be current.
              </p>
            </div>
          )}

          {/* FEAT-018: IA currency enforcement */}
          {requiresIa && iaIsExpired && (
            <div className="flex items-start gap-2 p-2.5 rounded-md bg-red-500/10 border border-red-500/40">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-xs font-semibold text-red-400">
                  IA Certificate Expired — Sign-off Blocked
                </p>
                <p className="text-[11px] text-red-400/80">
                  Your Inspection Authorization
                  {certNumber ? ` (${certNumber})` : ""} expired{" "}
                  {Math.abs(iaDaysRemaining ?? 0)}d ago. This step requires a
                  current IA. Renewal must be completed before sign-off per
                  14 CFR 65.93.
                </p>
              </div>
            </div>
          )}

          {requiresIa && iaExpiringSoon && (
            <div className="flex items-start gap-2 p-2.5 rounded-md bg-amber-500/10 border border-amber-500/40">
              <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-xs font-semibold text-amber-400">
                  IA Certificate Expiring in {iaDaysRemaining}d
                </p>
                <p className="text-[11px] text-amber-400/80">
                  Cert{certNumber ? ` #${certNumber}` : ""} expires in{" "}
                  {iaDaysRemaining} days. Sign-off permitted, but schedule
                  renewal immediately per 14 CFR 65.93.
                </p>
              </div>
            </div>
          )}

          {/* Rating Exercised */}
          <div>
            <Label className="text-xs font-medium mb-1.5 block">
              Rating Exercised <span className="text-red-400">*</span>
            </Label>
            <Select
              value={rating}
              onValueChange={(v) => setRating(v as RatingValue)}
            >
              <SelectTrigger className="h-9 text-sm bg-muted/30 border-border/60">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RATING_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Approved Data Reference (Gap 1) */}
          <div>
            <Label className="text-xs font-medium mb-1.5 block">
              Approved Data Reference{" "}
              <span className="text-muted-foreground font-normal">
                (14 CFR 43.9(a)(3))
              </span>
            </Label>
            <Input
              value={approvedDataRef}
              onChange={(e) => setApprovedDataRef(e.target.value)}
              placeholder="e.g. AMM 71-00-00, Rev 42"
              className="h-9 text-sm bg-muted/30 border-border/60"
            />
          </div>

          {/* Parts Installed (Gap 2) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <Label className="text-xs font-medium">
                Parts Installed{" "}
                <span className="text-muted-foreground font-normal">
                  (optional)
                </span>
              </Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 text-[10px] px-2"
                onClick={() => {
                  setShowPartsForm(true);
                  setPartsInstalled((prev) => [
                    ...prev,
                    { partNumber: "", serialNumber: "", description: "", quantity: 1 },
                  ]);
                }}
              >
                + Add Part
              </Button>
            </div>
            {partsInstalled.map((part, idx) => (
              <div
                key={idx}
                className="grid grid-cols-[1fr_1fr_2fr_60px_24px] gap-1.5 mb-1.5 items-end"
              >
                <Input
                  placeholder="P/N"
                  value={part.partNumber}
                  onChange={(e) => {
                    const updated = [...partsInstalled];
                    updated[idx] = { ...updated[idx], partNumber: e.target.value };
                    setPartsInstalled(updated);
                  }}
                  className="h-7 text-xs bg-muted/30 border-border/60"
                />
                <Input
                  placeholder="S/N"
                  value={part.serialNumber}
                  onChange={(e) => {
                    const updated = [...partsInstalled];
                    updated[idx] = { ...updated[idx], serialNumber: e.target.value };
                    setPartsInstalled(updated);
                  }}
                  className="h-7 text-xs bg-muted/30 border-border/60"
                />
                <Input
                  placeholder="Description"
                  value={part.description}
                  onChange={(e) => {
                    const updated = [...partsInstalled];
                    updated[idx] = { ...updated[idx], description: e.target.value };
                    setPartsInstalled(updated);
                  }}
                  className="h-7 text-xs bg-muted/30 border-border/60"
                />
                <Input
                  type="number"
                  min={1}
                  value={part.quantity}
                  onChange={(e) => {
                    const updated = [...partsInstalled];
                    updated[idx] = { ...updated[idx], quantity: Number(e.target.value) || 1 };
                    setPartsInstalled(updated);
                  }}
                  className="h-7 text-xs bg-muted/30 border-border/60"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-muted-foreground hover:text-red-400"
                  onClick={() => setPartsInstalled((prev) => prev.filter((_, i) => i !== idx))}
                >
                  ×
                </Button>
              </div>
            ))}
          </div>

          {/* Notes */}
          <div>
            <Label className="text-xs font-medium mb-1.5 block">
              Notes{" "}
              <span className="text-muted-foreground font-normal">
                (optional)
              </span>
            </Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any notes for this step..."
              rows={2}
              className="text-sm bg-muted/30 border-border/60 resize-none"
            />
          </div>

          <Separator className="opacity-40" />

          {/* PIN Re-authentication */}
          <div>
            <Label className="text-xs font-medium mb-1.5 block">
              Re-enter PIN to authorize signature{" "}
              <span className="text-red-400">*</span>
            </Label>
            <Input
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="4–6 digit PIN"
              maxLength={6}
              inputMode="numeric"
              className="h-9 font-mono text-sm bg-muted/30 border-border/60"
            />
            <p className="text-[10px] text-muted-foreground mt-1">
              Creates a 5-minute authorization token for this signature.
            </p>
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
            onClick={handleSign}
            disabled={isSubmitting || pin.length < 4 || (requiresIa && iaIsExpired)}
            className="gap-2"
            size="sm"
          >
            {isSubmitting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <PenLine className="w-3.5 h-3.5" />
            )}
            Sign Step
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
