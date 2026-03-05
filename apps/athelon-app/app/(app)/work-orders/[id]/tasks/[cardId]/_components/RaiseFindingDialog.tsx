"use client";

/**
 * RaiseFindingDialog.tsx
 * Gap 4: "Raise Finding" button inside task card execution.
 * Creates a discrepancy linked to the current work order.
 *
 * Phase D: OP-1003 alignment - adds classification, regulatory flags,
 * and labor estimate fields per Elevate MRO Discrepancy Action Record.
 */

import { useState, useEffect } from "react";
import { toast } from "sonner";
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
import { FileUpload, type UploadedFile } from "@/components/FileUpload";
import { PhotoGallery } from "@/components/PhotoGallery";

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

const SEVERITY_OPTIONS = [
  { value: "minor", label: "Minor" },
  { value: "major", label: "Major" },
  { value: "critical", label: "Critical" },
] as const;

type SeverityValue = (typeof SEVERITY_OPTIONS)[number]["value"];

const SYSTEM_TYPE_OPTIONS = [
  { value: "airframe", label: "Airframe" },
  { value: "engine", label: "Engine" },
  { value: "propeller", label: "Propeller" },
  { value: "appliance", label: "Appliance" },
] as const;

type SystemTypeValue = (typeof SYSTEM_TYPE_OPTIONS)[number]["value"];

const FINDING_CATEGORY_OPTIONS = [
  { value: "planned", label: "Planned" },
  { value: "inspection_found", label: "Inspection Found" },
  { value: "customer_reported", label: "Customer Reported" },
  { value: "rts_found", label: "RTS Found" },
] as const;

type FindingCategoryValue = (typeof FINDING_CATEGORY_OPTIONS)[number]["value"];

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

  // BUG-LT-010: Aircraft hours field - prefilled from prop but editable.
  // When totalTimeAirframeHours is not set on the aircraft, the parent passes
  // aircraftHours=0. Silently logging a finding at 0 hours creates a false
  // maintenance record. Show the value to the tech so they can verify and
  // correct it; warn visually if 0 so they don't miss it.
  const [aircraftHoursEntry, setAircraftHoursEntry] = useState<string>(
    aircraftHours > 0 ? String(aircraftHours) : "",
  );

  // OP-1003 classification fields
  const [severity, setSeverity] = useState<SeverityValue | "">("");
  const [systemType, setSystemType] = useState<SystemTypeValue | "">("");
  const [originStep, setOriginStep] = useState(stepDescription ?? "");
  const [findingCategory, setFindingCategory] = useState<FindingCategoryValue | "">("");
  const [correctiveAction, setCorrectiveAction] = useState("");

  // Regulatory flags
  const [riiRequired, setRiiRequired] = useState(false);
  const [stcRelated, setStcRelated] = useState(false);
  const [stcNumber, setStcNumber] = useState("");

  // Labor estimate
  const [mhEstimate, setMhEstimate] = useState("");

  // MBP-0066: Photo upload for discrepancy evidence
  const [photoStorageIds, setPhotoStorageIds] = useState<string[]>([]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openDiscrepancy = useMutation(api.discrepancies.openDiscrepancy);
  const storeFileMetadata = useMutation(api.fileStorage.storeFileMetadata);

  function resetForm() {
    setDescription("");
    // BUG-LT-HUNT-006: Reset foundDuring to its default - previously omitted,
    // so if a tech changed "Found During" to "Annual Inspection" then cancelled,
    // reopening the dialog for a new finding would pre-select "Annual Inspection"
    // even for a routine maintenance squawk. The "Found During" value is stored
    // on the discrepancy record; a wrong value creates an inaccurate maintenance
    // record under 14 CFR 43.9(a).
    setFoundDuring("routine_maintenance");
    setComponentAffected("");
    setComponentPartNumber("");
    setComponentSerialNumber("");
    setNotes("");
    setSeverity("");
    setSystemType("");
    setOriginStep(stepDescription ?? "");
    setFindingCategory("");
    setCorrectiveAction("");
    setRiiRequired(false);
    setStcRelated(false);
    setStcNumber("");
    setMhEstimate("");
    setAircraftHoursEntry(aircraftHours > 0 ? String(aircraftHours) : "");
    setPhotoStorageIds([]);
  }

  // BUG-LT-HUNT-006: Reset all form state and error when the dialog (re-)opens.
  // Previously there was no useEffect hook here, so a tech who partially filled
  // in a finding (description, photos, component info), clicked Cancel, then
  // re-opened the dialog for a *different* discrepancy would see all the prior
  // data pre-populated. This is particularly dangerous:
  //   1. Description from finding A appears on finding B → wrong discrepancy
  //      description permanently attached to the work order.
  //   2. Photos of Component A show up pre-loaded for Component B → wrong
  //      photographic evidence on the maintenance record.
  //   3. "Mandatory - affects airworthiness" pre-selected from a prior finding
  //      when the new finding is informational only → inflated severity in the
  //      discrepancy log, triggering unnecessary RII holds.
  // Under 14 CFR 43.9 discrepancy records are permanent; they cannot be
  // corrected after the technician submits without a separate amendment.
  useEffect(() => {
    if (open) {
      resetForm();
      setError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function handleSubmit() {
    if (!description.trim()) {
      setError("Description is required.");
      return;
    }
    if (!severity) {
      setError("Severity is required.");
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
      const discoveredWhen =
        findingCategory === "planned"
          ? "planning"
          : findingCategory === "inspection_found"
            ? "inspection"
            : findingCategory === "customer_reported"
              ? "customer_report"
              : undefined;
      const squawkOrigin =
        findingCategory === "inspection_found"
          ? "inspection_finding"
          : findingCategory === "customer_reported"
            ? "customer_reported"
            : findingCategory === "rts_found"
              ? "rts_finding"
              : "routine_check";

      const discrepancyType =
        severity === "critical"
          ? "mandatory"
          : severity === "major"
            ? "recommended"
            : "customer_information";

      const discrepancyResult = await openDiscrepancy({
        workOrderId,
        organizationId: orgId,
        description: description.trim(),
        foundDuring,
        foundByTechnicianId: techId,
        foundAtAircraftHours: aircraftHoursParsed,
        componentAffected: componentAffected.trim() || undefined,
        componentPartNumber: componentPartNumber.trim() || undefined,
        componentSerialNumber: componentSerialNumber.trim() || undefined,
        notes: [
          originStep.trim() ? `Origin Step: ${originStep.trim()}` : "",
          notes.trim(),
          correctiveAction.trim() ? `Corrective Action (initial plan): ${correctiveAction.trim()}` : "",
        ]
          .filter(Boolean)
          .join("\n\n") || undefined,
        squawkOrigin,
        foundDuringRts: findingCategory === "rts_found" ? true : undefined,
        isCustomerReported: findingCategory === "customer_reported" ? true : undefined,
        // OP-1003 fields
        discrepancyType,
        systemType: systemType || undefined,
        discoveredWhen,
        riiRequired: riiRequired || undefined,
        stcRelated: stcRelated || undefined,
        stcNumber: stcRelated && stcNumber.trim() ? stcNumber.trim() : undefined,
        mhEstimate: mhEstimateParsed,
        writtenByTechnicianId: techId,
      });

      // MBP-0066: Save uploaded photos as files linked to the new discrepancy
      const discrepancyId = typeof discrepancyResult === "string"
        ? discrepancyResult
        : (discrepancyResult as { discrepancyId?: string })?.discrepancyId ?? "";
      if (discrepancyId && photoStorageIds.length > 0) {
        for (const storageId of photoStorageIds) {
          try {
            await storeFileMetadata({
              organizationId: orgId,
              storageId: storageId as Id<"_storage">,
              fileName: `discrepancy-photo.jpg`,
              fileSize: 0,
              mimeType: "image/jpeg",
              linkedEntityType: "discrepancy",
              linkedEntityId: discrepancyId,
            });
          } catch {
            // Non-blocking — discrepancy already created
          }
        }
      }

      resetForm();
      // BUG-QCM-RFD-001: No success toast after raising a finding/discrepancy.
      // A QCM who submits a finding has no confirmation it was recorded before
      // the dialog closes. If the WO discrepancy list is not visible in the
      // current scroll position, they may wonder if the finding was lost and
      // submit a duplicate. Findings are permanent maintenance records.
      toast.success("Finding raised - discrepancy created");
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
    // dialog. The finding may or may not have been created in Convex - the
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
            {/* BUG-LT-062: RaiseFindingDialog description textarea had no
                maxLength cap. A tech or QCM pasting a verbose description
                (e.g., full AD text or STC amendment notes) could exceed the
                backend schema limit and get a cryptic validation error.
                Discrepancy descriptions should be concise (mandatory per
                14 CFR 43.9(a)(2)); 1000 chars is generous. Character counter
                turns amber when ≥900 chars. */}
            <Textarea
              id="finding-description"
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, 1000))}
              placeholder="Describe the discrepancy found..."
              rows={3}
              maxLength={1000}
              className="text-sm bg-muted/30 border-border/60 resize-none"
              aria-required="true"
            />
            <p className={`text-[10px] text-right mt-0.5 ${description.length >= 900 ? "text-amber-400" : "text-muted-foreground/50"}`}>
              {description.length}/1000
            </p>
          </div>

          <div>
            <Label htmlFor="finding-origin-step" className="text-xs font-medium mb-1.5 block">
              Origin Step
            </Label>
            <Input
              id="finding-origin-step"
              value={originStep}
              onChange={(e) => setOriginStep(e.target.value.slice(0, 200))}
              placeholder="Which step triggered this finding?"
              maxLength={200}
              className="h-9 text-sm bg-muted/30 border-border/60"
            />
          </div>

          {/* BUG-LT-010: Aircraft Hours at Finding - visible & editable */}
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
                Aircraft total time not on file - enter current hours manually for accurate records.
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

            {/* Severity */}
            <div>
              <Label htmlFor="finding-severity" className="text-xs font-medium mb-1.5 block">
                Severity <span className="text-red-400" aria-hidden="true">*</span>
              </Label>
              <Select value={severity} onValueChange={(v) => setSeverity(v as SeverityValue)}>
                <SelectTrigger id="finding-severity" className="h-9 text-sm bg-muted/30 border-border/60" aria-required="true">
                  <SelectValue placeholder="Select severity..." />
                </SelectTrigger>
                <SelectContent>
                  {SEVERITY_OPTIONS.map((opt) => (
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

            {/* Finding Category */}
            <div>
              <Label htmlFor="finding-category" className="text-xs font-medium mb-1.5 block">
                Finding Category
              </Label>
              <Select
                value={findingCategory}
                onValueChange={(v) => setFindingCategory(v as FindingCategoryValue)}
              >
                <SelectTrigger id="finding-category" className="h-9 text-sm bg-muted/30 border-border/60">
                  <SelectValue placeholder="Select category..." />
                </SelectTrigger>
                <SelectContent>
                  {FINDING_CATEGORY_OPTIONS.map((opt) => (
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
              {/* BUG-LT5-004: Missing maxLength on component/P/N/S/N fields. */}
              <Input
                id="finding-component"
                value={componentAffected}
                onChange={(e) => setComponentAffected(e.target.value.slice(0, 200))}
                maxLength={200}
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
                onChange={(e) => setComponentPartNumber(e.target.value.slice(0, 50))}
                maxLength={50}
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
                onChange={(e) => setComponentSerialNumber(e.target.value.slice(0, 50))}
                maxLength={50}
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
                    onChange={(e) => setStcNumber(e.target.value.slice(0, 50))}
                    maxLength={50}
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

          {/* MBP-0066: Photo upload for discrepancy evidence */}
          <div>
            <Label className="text-xs font-medium mb-1.5 block">
              Evidence Photos{" "}
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
              disabled={isSubmitting}
              onUpload={(file) =>
                setPhotoStorageIds((prev) => [...prev, file.storageId])
              }
            />
          </div>

          {/* Corrective Action */}
          <div>
            <Label htmlFor="finding-corrective-action" className="text-xs font-medium mb-1.5 block">
              Corrective Action
              <span className="text-muted-foreground font-normal ml-1">(required before closing)</span>
            </Label>
            <Textarea
              id="finding-corrective-action"
              value={correctiveAction}
              onChange={(e) => setCorrectiveAction(e.target.value.slice(0, 500))}
              placeholder="Planned corrective action to resolve this finding..."
              rows={2}
              maxLength={500}
              className="text-sm bg-muted/30 border-border/60 resize-none"
            />
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="finding-notes" className="text-xs font-medium mb-1.5 block">
              Notes {" "}
              <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <Textarea
              id="finding-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value.slice(0, 500))}
              placeholder="Additional context, references..."
              rows={2}
              maxLength={500}
              className="text-sm bg-muted/30 border-border/60 resize-none"
            />
            <p className={`text-[10px] text-right mt-0.5 ${notes.length >= 450 ? "text-amber-400" : "text-muted-foreground/50"}`}>
              {notes.length}/500
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
            onClick={handleSubmit}
            disabled={isSubmitting || !description.trim() || !severity || !systemType}
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
