"use client";

/**
 * LogFindingDialog.tsx
 * AI-006 — Dialog for logging a new finding against a work order.
 *
 * Calls api.discrepancies.openDiscrepancy and toasts on success/failure.
 */

import { useState } from "react";
import { useMutation } from "convex/react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// ─── Types ────────────────────────────────────────────────────────────────────

type FoundDuring =
  | "annual_inspection"
  | "100hr_inspection"
  | "progressive_inspection"
  | "routine_maintenance"
  | "preflight"
  | "pilot_report"
  | "ad_compliance_check"
  | "other";

type AircraftSystem =
  | "airframe"
  | "engine_left"
  | "engine_right"
  | "engine_center"
  | "engine_single"
  | "avionics"
  | "landing_gear"
  | "fuel_system"
  | "hydraulics"
  | "electrical"
  | "other";

export interface LogFindingDialogProps {
  open: boolean;
  onClose: () => void;
  workOrderId: Id<"workOrders">;
  orgId: Id<"organizations">;
  techId: Id<"technicians">;
  aircraftCurrentHours?: number | null;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const FOUND_DURING_OPTIONS: { value: FoundDuring; label: string }[] = [
  { value: "annual_inspection", label: "Annual Inspection" },
  { value: "100hr_inspection", label: "100-Hour Inspection" },
  { value: "progressive_inspection", label: "Progressive Inspection" },
  { value: "routine_maintenance", label: "Routine Maintenance" },
  { value: "preflight", label: "Preflight" },
  { value: "pilot_report", label: "Pilot Report" },
  { value: "ad_compliance_check", label: "AD Compliance Check" },
  { value: "other", label: "Other" },
];

const AIRCRAFT_SYSTEM_OPTIONS: { value: AircraftSystem; label: string }[] = [
  { value: "airframe", label: "Airframe" },
  { value: "engine_left", label: "Engine (Left)" },
  { value: "engine_right", label: "Engine (Right)" },
  { value: "engine_center", label: "Engine (Center)" },
  { value: "engine_single", label: "Engine" },
  { value: "avionics", label: "Avionics" },
  { value: "landing_gear", label: "Landing Gear" },
  { value: "fuel_system", label: "Fuel System" },
  { value: "hydraulics", label: "Hydraulics" },
  { value: "electrical", label: "Electrical" },
  { value: "other", label: "Other" },
];

// ─── Component ────────────────────────────────────────────────────────────────

export function LogFindingDialog({
  open,
  onClose,
  workOrderId,
  orgId,
  techId,
  aircraftCurrentHours,
}: LogFindingDialogProps) {
  const openDiscrepancy = useMutation(api.discrepancies.openDiscrepancy);

  // ── Form state ───────────────────────────────────────────────────────────
  const [description, setDescription] = useState("");
  const [foundDuring, setFoundDuring] = useState<FoundDuring | "">("");
  const [componentAffected, setComponentAffected] = useState("");
  const [aircraftSystem, setAircraftSystem] = useState<AircraftSystem | "">("");
  const [notes, setNotes] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Helpers ──────────────────────────────────────────────────────────────

  function resetForm() {
    setDescription("");
    setFoundDuring("");
    setComponentAffected("");
    setAircraftSystem("");
    setNotes("");
    setError(null);
  }

  function handleClose() {
    if (!isSubmitting) {
      resetForm();
      onClose();
    }
  }

  // ── Submit ───────────────────────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!description.trim()) {
      setError("Description is required.");
      return;
    }
    if (!foundDuring) {
      setError("Please select when this finding was discovered.");
      return;
    }

    setIsSubmitting(true);
    try {
      await openDiscrepancy({
        workOrderId,
        organizationId: orgId,
        description: description.trim(),
        foundDuring,
        foundByTechnicianId: techId,
        foundAtAircraftHours: aircraftCurrentHours ?? 0,
        componentAffected: componentAffected.trim() || undefined,
        aircraftSystem: aircraftSystem || undefined,
        notes: notes.trim() || undefined,
        squawkOrigin: "inspection_finding",
      });
      toast.success("Finding logged successfully.");
      resetForm();
      onClose();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to log finding.";
      setError(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-base">Log Finding</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-1">
          {/* Description (required) */}
          <div className="space-y-1.5">
            <Label htmlFor="sq-description" className="text-xs">
              Description <span className="text-red-400">*</span>
            </Label>
            {/* BUG-LT5-003: Missing maxLength on finding description. A tech
                who pastes a long write-up would get a cryptic mutation error
                on submit. Cap at 1000 chars — generous for a finding entry. */}
            <Textarea
              id="sq-description"
              placeholder="Describe the finding…"
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, 1000))}
              rows={3}
              maxLength={1000}
              className="text-sm resize-none"
              disabled={isSubmitting}
            />
          </div>

          {/* Found During (required) */}
          <div className="space-y-1.5">
            <Label htmlFor="sq-found-during" className="text-xs">
              Found During <span className="text-red-400">*</span>
            </Label>
            <Select
              value={foundDuring}
              onValueChange={(v) => setFoundDuring(v as FoundDuring)}
              disabled={isSubmitting}
            >
              <SelectTrigger id="sq-found-during" className="text-sm h-9">
                <SelectValue placeholder="Select inspection phase…" />
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

          {/* Component Affected (optional) */}
          <div className="space-y-1.5">
            <Label htmlFor="sq-component" className="text-xs">
              Component Affected
              <span className="text-muted-foreground ml-1">(optional)</span>
            </Label>
            {/* BUG-LT5-003: Missing maxLength on component affected field. */}
            <Input
              id="sq-component"
              placeholder="e.g. Left main gear actuator"
              value={componentAffected}
              onChange={(e) => setComponentAffected(e.target.value.slice(0, 200))}
              maxLength={200}
              className="text-sm h-9"
              disabled={isSubmitting}
            />
          </div>

          {/* Aircraft System (optional) */}
          <div className="space-y-1.5">
            <Label htmlFor="sq-system" className="text-xs">
              Aircraft System
              <span className="text-muted-foreground ml-1">(optional)</span>
            </Label>
            <Select
              value={aircraftSystem}
              onValueChange={(v) => setAircraftSystem(v as AircraftSystem | "")}
              disabled={isSubmitting}
            >
              <SelectTrigger id="sq-system" className="text-sm h-9">
                <SelectValue placeholder="Select system…" />
              </SelectTrigger>
              <SelectContent>
                {AIRCRAFT_SYSTEM_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Notes (optional) */}
          <div className="space-y-1.5">
            <Label htmlFor="sq-notes" className="text-xs">
              Notes
              <span className="text-muted-foreground ml-1">(optional)</span>
            </Label>
            {/* BUG-LT5-003: Missing maxLength on finding notes. */}
            <Textarea
              id="sq-notes"
              placeholder="Additional notes or observations…"
              value={notes}
              onChange={(e) => setNotes(e.target.value.slice(0, 500))}
              rows={2}
              maxLength={500}
              className="text-sm resize-none"
              disabled={isSubmitting}
            />
          </div>

          {/* Error display */}
          {error && (
            <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded px-3 py-2">
              {error}
            </p>
          )}

          <DialogFooter className="pt-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting || !description.trim() || !foundDuring}
            >
              {isSubmitting ? "Logging…" : "Log Finding"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
