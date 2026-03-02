"use client";

/**
 * SignStepDialog.tsx
 * Extracted from tasks/[cardId]/page.tsx (TD-009).
 * The sign-off dialog for a single task card step.
 */

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  AlertTriangle,
  PenLine,
  Loader2,
  AlertCircle,
  ScanLine,
} from "lucide-react";
import { BarcodeScanner } from "@/components/BarcodeScanner";
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
import { FileUpload, type UploadedFile } from "@/components/FileUpload";
import { PhotoGallery } from "@/components/PhotoGallery";

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

  // BUG-LT3-001: Reset rating when a different step is opened.
  // useState initial value only runs once at mount — if the tech closes the
  // dialog for a non-IA step, then opens it for an IA-required step, the
  // rating stays on "airframe" instead of switching to "ia". The tech could
  // sign an IA step with the wrong rating (no IA exercised), creating a
  // regulatory record error under 14 CFR 65.85/65.87.
  //
  // BUG-LT-HUNT-001: Also clear pin and error on open.
  // SignCardDialog had this same fix (BUG-LT4-002) but it was never ported
  // here. If a tech enters a wrong PIN, gets "Invalid PIN", closes, then
  // re-opens (possibly for a *different* step), the stale error banner still
  // shows and the pin field still has the old value — making the dialog look
  // broken before they've even typed anything.
  useEffect(() => {
    if (open) {
      setRating(requiresIa ? "ia" : "airframe");
      setPin("");
      setError(null);
      // BUG-LT-HUNT-003: Also clear photos, parts, notes, and approvedDataRef
      // on re-open. These were only cleared on successful submit (BUG-LT3-001),
      // not on Cancel. A tech who adds photos/parts for Step 2, clicks Cancel,
      // then opens SignStepDialog for Step 3 would see Step 2's photos and
      // parts pre-loaded — creating a risk of attaching the wrong maintenance
      // data to Step 3. Under 14 CFR 43.9 every entry must be accurate; a
      // photo of a completely different component appearing on Step 3's sign-off
      // is a maintenance records violation.
      setPhotoStorageIds([]);
      setPartsInstalled([]);
      setNotes("");
      setApprovedDataRef("");
    }
  }, [open, requiresIa]);
  const [photoStorageIds, setPhotoStorageIds] = useState<string[]>([]);
  const [partScannerOpen, setPartScannerOpen] = useState(false);
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
  const saveDocument = useMutation(api.documents.saveDocument);

  async function handleSign() {
    setError(null);

    // BUG-030: Validate that all parts in the list have a part number.
    // An empty P/N in a maintenance record is not valid per 14 CFR 43.9(a)(4).
    // The backend may silently accept it, creating a permanently uncorrectable
    // blank-P/N record in the maintenance history.
    for (let i = 0; i < partsInstalled.length; i++) {
      if (!partsInstalled[i].partNumber.trim()) {
        setError(
          `Part ${i + 1} is missing a part number. All installed parts must have a P/N per 14 CFR 43.9(a)(4). Remove the empty row or fill in the part number.`,
        );
        return;
      }
    }

    setIsSubmitting(true);
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

      // Save uploaded photos as documents attached to this step
      for (const storageId of photoStorageIds) {
        try {
          await saveDocument({
            organizationId: orgId,
            attachedToTable: "taskCardSteps",
            attachedToId: stepId as string,
            storageId: storageId as Id<"_storage">,
            fileName: `step-${stepNumber}-photo.jpg`,
            fileSize: 0, // Size tracked at upload time
            mimeType: "image/jpeg",
            documentType: "photo",
            description: `Step ${stepNumber} sign-off photo`,
          });
        } catch {
          // Non-blocking — step is already signed
        }
      }

      // BUG-LT3-001: Reset ALL form state on success — not just pin/notes/photos.
      // partsInstalled and approvedDataRef were never cleared, so signing Step 1
      // with a part list would carry those parts into the sign dialog for Step 2.
      // Under 14 CFR 43.9(a)(4), parts records are permanently linked to the step
      // they were submitted with — wrong parts on a step cannot be corrected after sign.
      setPin("");
      setRating(requiresIa ? "ia" : "airframe");
      setNotes("");
      setApprovedDataRef("");
      setPartsInstalled([]);
      setPhotoStorageIds([]);
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
    // BUG-LT2-007: Guard against mid-submit dismissal. Previously the dialog
    // closed on outside-click or Escape even while isSubmitting=true. If the
    // Convex mutation was in-flight, onSuccess() never fired, the page never
    // cleared signStepTarget, and the step appeared still-pending in the UI
    // despite having been signed in the backend. Re-opening would then fail with
    // a "step already completed" error — with no explanation of why.
    <Dialog open={open} onOpenChange={(v) => { if (!v && !isSubmitting) onClose(); }}>
      <DialogContent className="max-w-[95vw] sm:max-w-md">
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
            <Label htmlFor="sign-step-rating" className="text-xs font-medium mb-1.5 block">
              Rating Exercised <span className="text-red-400" aria-hidden="true">*</span>
            </Label>
            <Select
              value={rating}
              onValueChange={(v) => setRating(v as RatingValue)}
            >
              <SelectTrigger id="sign-step-rating" className="h-9 text-sm bg-muted/30 border-border/60" aria-required="true" aria-label="Rating exercised (required)">
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
            <Label htmlFor="sign-step-data-ref" className="text-xs font-medium mb-1.5 block">
              Approved Data Reference{" "}
              <span className="text-muted-foreground font-normal">
                (14 CFR 43.9(a)(3))
              </span>
            </Label>
            <Input
              id="sign-step-data-ref"
              value={approvedDataRef}
              onChange={(e) => setApprovedDataRef(e.target.value)}
              placeholder="e.g. AMM 71-00-00, Rev 42"
              className="h-9 text-sm bg-muted/30 border-border/60"
              aria-label="Approved data reference per 14 CFR 43.9(a)(3)"
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
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 text-[10px] px-2 gap-1"
                  onClick={() => setPartScannerOpen(true)}
                >
                  <ScanLine className="w-3 h-3" />
                  Scan Part
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 text-[10px] px-2"
                  onClick={() => {
                    setPartsInstalled((prev) => [
                      ...prev,
                      { partNumber: "", serialNumber: "", description: "", quantity: 1 },
                    ]);
                  }}
                >
                  + Add Part
                </Button>
              </div>
            </div>
            {partsInstalled.map((part, idx) => (
              <div
                key={idx}
                className="grid grid-cols-2 sm:grid-cols-[1fr_1fr_2fr_60px_24px] gap-1.5 mb-1.5 items-end"
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
                  aria-label={`Remove part ${idx + 1}`}
                  onClick={() => setPartsInstalled((prev) => prev.filter((_, i) => i !== idx))}
                >
                  ×
                </Button>
              </div>
            ))}
          </div>

          {/* Photos */}
          <div>
            <Label className="text-xs font-medium mb-1.5 block">
              Step Photos{" "}
              <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            {photoStorageIds.length > 0 && (
              <div className="mb-2">
                <PhotoGallery
                  storageIds={photoStorageIds}
                  onDelete={(id) =>
                    setPhotoStorageIds((prev) => prev.filter((s) => s !== id))
                  }
                  confirmDelete={false}
                />
              </div>
            )}
            <FileUpload
              accept="images"
              multiple
              compact
              maxSizeMB={10}
              onUpload={(file) =>
                setPhotoStorageIds((prev) => [...prev, file.storageId])
              }
            />
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="sign-step-notes" className="text-xs font-medium mb-1.5 block">
              Notes{" "}
              <span className="text-muted-foreground font-normal">
                (optional)
              </span>
            </Label>
            <Textarea
              id="sign-step-notes"
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
            <Label htmlFor="sign-step-pin" className="text-xs font-medium mb-1.5 block">
              Re-enter PIN to authorize signature{" "}
              <span className="text-red-400" aria-hidden="true">*</span>
            </Label>
            <Input
              id="sign-step-pin"
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="4–6 digit PIN"
              maxLength={6}
              inputMode="numeric"
              className="h-9 font-mono text-sm bg-muted/30 border-border/60"
              aria-required="true"
              aria-describedby="sign-step-pin-hint"
            />
            <p id="sign-step-pin-hint" className="text-[10px] text-muted-foreground mt-1">
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

      {/* Part Barcode Scanner */}
      <BarcodeScanner
        open={partScannerOpen}
        onClose={() => setPartScannerOpen(false)}
        onScan={(value) => {
          setPartScannerOpen(false);
          setPartsInstalled((prev) => [
            ...prev,
            { partNumber: value, serialNumber: "", description: "", quantity: 1 },
          ]);
        }}
        title="Scan Part Barcode"
      />
    </Dialog>
  );
}
