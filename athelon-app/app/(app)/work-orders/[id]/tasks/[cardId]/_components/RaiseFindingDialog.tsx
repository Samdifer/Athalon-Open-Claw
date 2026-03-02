"use client";

/**
 * RaiseFindingDialog.tsx
 * Gap 4: "Raise Finding" button inside task card execution.
 * Creates a discrepancy linked to the current work order.
 *
 * Phase D: OP-1003 alignment — adds classification, regulatory flags,
 * and labor estimate fields per Elevate MRO Discrepancy Action Record.
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
import { FileUpload, type UploadedFile } from "@/components/FileUpload";
import { PhotoGallery } from "@/components/PhotoGallery";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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

const DISCREPANCY_TYPE_OPTIONS = [
  { value: "mandatory", label: "Mandatory \u2014 affects airworthiness" },
  { value: "recommended", label: "Recommended \u2014 does not affect airworthiness" },
  { value: "customer_information", label: "Customer Information only" },
  { value: "ops_check", label: "Ops Check required" },
] as const;

type DiscrepancyTypeValue = (typeof DISCREPANCY_TYPE_OPTIONS)[number]["value"];

const SYSTEM_TYPE_OPTIONS = [
  { value: "airframe", label: "Airframe" },
  { value: "engine", label: "Engine" },
  { value: "propeller", label: "Propeller" },
  { value: "appliance", label: "Appliance" },
] as const;

type SystemTypeValue = (typeof SYSTEM_TYPE_OPTIONS)[number]["value"];

const DISCOVERED_WHEN_OPTIONS = [
  { value: "customer_report", label: "Customer Report" },
  { value: "planning", label: "During Planning" },
  { value: "inspection", label: "During Inspection" },
  { value: "post_quote", label: "After Customer Quote" },
] as const;

type DiscoveredWhenValue = (typeof DISCOVERED_WHEN_OPTIONS)[number]["value"];

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
  // Existing fields
  const [description, setDescription] = useState("");
  const [foundDuring, setFoundDuring] = useState<FoundDuringValue>("routine_maintenance");
  const [componentAffected, setComponentAffected] = useState("");
  const [componentPartNumber, setComponentPartNumber] = useState("");
  const [componentSerialNumber, setComponentSerialNumber] = useState("");
  const [notes, setNotes] = useState("");

  // BUG-LT-010: Aircraft hours field — prefilled from prop but editable.
  // When totalTimeAirframeHours is not set on the aircraft, the parent passes
  // aircraftHours=0. Silently logging a finding at 0 hours creates a false
  // maintenance record. Show the value to the tech so they can verify and
  // correct it; warn visually if 0 so they don't miss it.
  const [aircraftHoursEntry, setAircraftHoursEntry] = useState<string>(
    aircraftHours > 0 ? String(aircraftHours) : "",
  );

  // OP-1003 classification fields
  const [discrepancyType, setDiscrepancyType] = useState<DiscrepancyTypeValue | "">("");
  const [systemType, setSystemType] = useState<SystemTypeValue | "">("");
  const [discoveredWhen, setDiscoveredWhen] = useState<DiscoveredWhenValue | "">("");

  // Regulatory flags
  const [riiRequired, setRiiRequired] = useState(false);
  const [stcRelated, setStcRelated] = useState(false);
  const [stcNumber, setStcNumber] = useState("");

  // Labor estimate
  const [mhEstimate, setMhEstimate] = useState("");

  // Photos
  const [photoStorageIds, setPhotoStorageIds] = useState<string[]>([]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openDiscrepancy = useMutation(api.discrepancies.openDiscrepancy);

  function resetForm() {
    setDescription("");
    setComponentAffected("");
    setComponentPartNumber("");
    setComponentSerialNumber("");
    setNotes("");
    setDiscrepancyType("");
    setSystemType("");
    setDiscoveredWhen("");
    setRiiRequired(false);
    setStcRelated(false);
    setStcNumber("");
    setMhEstimate("");
    setPhotoStorageIds([]);
    setAircraftHoursEntry(aircraftHours > 0 ? String(aircraftHours) : "");
  }

  async function handleSubmit() {
    if (!description.trim()) {
      setError("Description is required.");
      return;
    }
    if (!discrepancyType) {
      setError("Discrepancy type is required.");
      return;
    }
    if (!systemType) {
      setError("System type is required.");
      return;
    }
    // BUG-LT2-003: Validate mhEstimate before calling backend.
    // parseFloat("abc") = NaN which was silently passed to the DB.
    const mhEstimateParsed = mhEstimate.trim() ? parseFloat(mhEstimate) : undefined;
    if (mhEstimate.trim() && (isNaN(mhEstimateParsed!) || mhEstimateParsed! < 0)) {
      setError("Estimated man-hours must be a valid positive number (e.g. 2.5).");
      return;
    }
    // BUG-LT-010: Validate aircraft hours entry.
    const aircraftHoursParsed = aircraftHoursEntry.trim()
      ? parseFloat(aircraftHoursEntry)
      : 0;
    if (aircraftHoursEntry.trim() && (isNaN(aircraftHoursParsed) || aircraftHoursParsed < 0)) {
      setError("Aircraft hours must be a valid non-negative number (e.g. 2450.3).");
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
        foundAtAircraftHours: aircraftHoursParsed,
        componentAffected: componentAffected.trim() || undefined,
        componentPartNumber: componentPartNumber.trim() || undefined,
        componentSerialNumber: componentSerialNumber.trim() || undefined,
        notes: notes.trim() || undefined,
        // OP-1003 fields
        discrepancyType: discrepancyType || undefined,
        systemType: systemType || undefined,
        discoveredWhen: discoveredWhen || undefined,
        riiRequired: riiRequired || undefined,
        stcRelated: stcRelated || undefined,
        stcNumber: stcRelated && stcNumber.trim() ? stcNumber.trim() : undefined,
        mhEstimate: mhEstimateParsed,
        writtenByTechnicianId: techId,
      });

      resetForm();
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create finding.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    // BUG-LT-001: Guard against mid-submit dismissal. Without this, pressing
    // Escape or clicking outside while handleSubmit is in-flight closes the
    // dialog. The finding may or may not have been created in Convex — the
    // tech assumes it was saved (they clicked "Raise Finding"), but if the
    // mutation was still awaiting auth, the finding is silently dropped.
    // Same pattern as SignStepDialog (BUG-LT2-007) and SignCardDialog.
    <Dialog open={open} onOpenChange={(v) => { if (!v && !isSubmitting) onClose(); }}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
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
                  {stepDescription ? ` \u2192 ${stepDescription}` : ""}
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

          {/* BUG-LT-010: Aircraft Hours at Finding — visible & editable */}
          <div>
            <Label htmlFor="finding-aircraft-hours" className="text-xs font-medium mb-1.5 block">
              Aircraft Hours at Finding{" "}
              <span className="text-muted-foreground font-normal">(14 CFR 43.9(a))</span>
            </Label>
            <Input
              id="finding-aircraft-hours"
              type="number"
              step="0.1"
              min="0"
              value={aircraftHoursEntry}
              onChange={(e) => setAircraftHoursEntry(e.target.value)}
              placeholder="e.g. 2450.3"
              className="h-9 text-sm bg-muted/30 border-border/60 w-40"
            />
            {(aircraftHoursEntry === "" || parseFloat(aircraftHoursEntry) === 0 || isNaN(parseFloat(aircraftHoursEntry))) && (
              <p className="text-[11px] text-amber-500 mt-1 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                Aircraft total time not on file — enter current hours manually for accurate records.
              </p>
            )}
            {aircraftHoursEntry !== "" && parseFloat(aircraftHoursEntry) > 0 && !isNaN(parseFloat(aircraftHoursEntry)) && (
              <p className="text-[10px] text-muted-foreground mt-1">
                Prefilled from aircraft master record. Correct if needed.
              </p>
            )}
          </div>

          {/* ── Classification (OP-1003) ─────────────────────────────────── */}
          <div className="space-y-3 pt-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Classification
            </p>

            {/* Discrepancy Type */}
            <div>
              <Label htmlFor="finding-disc-type" className="text-xs font-medium mb-1.5 block">
                Discrepancy Type <span className="text-red-400" aria-hidden="true">*</span>
              </Label>
              <Select
                value={discrepancyType}
                onValueChange={(v) => setDiscrepancyType(v as DiscrepancyTypeValue)}
              >
                <SelectTrigger id="finding-disc-type" className="h-9 text-sm bg-muted/30 border-border/60" aria-required="true">
                  <SelectValue placeholder="Select type..." />
                </SelectTrigger>
                <SelectContent>
                  {DISCREPANCY_TYPE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* System Type */}
            <div>
              <Label htmlFor="finding-sys-type" className="text-xs font-medium mb-1.5 block">
                System Type <span className="text-red-400" aria-hidden="true">*</span>
              </Label>
              <Select
                value={systemType}
                onValueChange={(v) => setSystemType(v as SystemTypeValue)}
              >
                <SelectTrigger id="finding-sys-type" className="h-9 text-sm bg-muted/30 border-border/60" aria-required="true">
                  <SelectValue placeholder="Select system..." />
                </SelectTrigger>
                <SelectContent>
                  {SYSTEM_TYPE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Discovered When */}
            <div>
              <Label htmlFor="finding-discovered-when" className="text-xs font-medium mb-1.5 block">
                Discovered When
              </Label>
              <Select
                value={discoveredWhen}
                onValueChange={(v) => setDiscoveredWhen(v as DiscoveredWhenValue)}
              >
                <SelectTrigger id="finding-discovered-when" className="h-9 text-sm bg-muted/30 border-border/60">
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  {DISCOVERED_WHEN_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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

          {/* ── Regulatory Flags (OP-1003) ───────────────────────────────── */}
          <div className="space-y-3 pt-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Regulatory Flags
            </p>

            {/* RII Required */}
            <div className="flex items-center justify-between gap-3">
              <div>
                <Label htmlFor="finding-rii" className="text-xs font-medium block">
                  RII Required
                </Label>
                <p className="text-[11px] text-muted-foreground">
                  An IA must inspect before return to service
                </p>
              </div>
              <Switch
                id="finding-rii"
                checked={riiRequired}
                onCheckedChange={setRiiRequired}
              />
            </div>

            {/* STC Related */}
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <Label htmlFor="finding-stc" className="text-xs font-medium block">
                    Related to STC
                  </Label>
                </div>
                <Switch
                  id="finding-stc"
                  checked={stcRelated}
                  onCheckedChange={setStcRelated}
                />
              </div>
              {stcRelated && (
                <div>
                  <Label htmlFor="finding-stc-number" className="text-xs font-medium mb-1.5 block">
                    STC Number
                  </Label>
                  <Input
                    id="finding-stc-number"
                    value={stcNumber}
                    onChange={(e) => setStcNumber(e.target.value)}
                    placeholder="e.g. SA02338SE"
                    className="h-9 text-sm bg-muted/30 border-border/60"
                  />
                </div>
              )}
            </div>
          </div>

          {/* ── Labor Estimate (OP-1003) ─────────────────────────────────── */}
          <div>
            <Label htmlFor="finding-mh-estimate" className="text-xs font-medium mb-1.5 block">
              Estimated Man-Hours
            </Label>
            <Input
              id="finding-mh-estimate"
              type="number"
              step="0.1"
              min="0"
              value={mhEstimate}
              onChange={(e) => setMhEstimate(e.target.value)}
              placeholder="e.g. 2.5"
              className="h-9 text-sm bg-muted/30 border-border/60 w-32"
            />
          </div>

          {/* Photos */}
          <div>
            <Label className="text-xs font-medium mb-1.5 block">
              Photos{" "}
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
              disabled={isSubmitting}
            />
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
              placeholder="Additional context, references..."
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
            disabled={isSubmitting || !description.trim() || !discrepancyType || !systemType}
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
