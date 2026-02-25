"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import Link from "next/link";
import {
  CheckCircle2,
  XCircle,
  Loader2,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// ─── Types ─────────────────────────────────────────────────────────────────────

export type DocType =
  | "AMM"
  | "CMM"
  | "SRM"
  | "AD"
  | "SB"
  | "AC"
  | "ICA"
  | "TCDS"
  | "STC"
  | "other";
export type RatingExercised = "airframe" | "powerplant" | "ia" | "none";

export interface CreateFormState {
  workPerformed: string;
  approvedDataDocType: DocType;
  approvedDataIdentifier: string;
  approvedDataRevision: string;
  approvedDataSection: string;
  completionDate: string;
  returnedToService: boolean;
  returnToServiceStatement: string;
  ratingsExercised: RatingExercised;
  callerTechnicianId: string;
  signatureAuthEventId: string;
  // Correction fields
  isCorrection: boolean;
  correctsRecordId: string;
  correctionFieldName: string;
  correctionOriginalValue: string;
  correctionCorrectedValue: string;
  correctionReason: string;
}

const defaultFormState: CreateFormState = {
  workPerformed: "",
  approvedDataDocType: "AMM",
  approvedDataIdentifier: "",
  approvedDataRevision: "",
  approvedDataSection: "",
  completionDate: new Date().toISOString().slice(0, 10),
  returnedToService: false,
  returnToServiceStatement: "",
  ratingsExercised: "airframe",
  callerTechnicianId: "",
  signatureAuthEventId: "",
  isCorrection: false,
  correctsRecordId: "",
  correctionFieldName: "",
  correctionOriginalValue: "",
  correctionCorrectedValue: "",
  correctionReason: "",
};

// ─── Component ─────────────────────────────────────────────────────────────────

interface CreateRecordFormProps {
  workOrderId: Id<"workOrders">;
  organizationId: Id<"organizations">;
  onSuccess: () => void;
  onCancel: () => void;
  initialState?: Partial<CreateFormState>;
}

export function CreateRecordForm({
  workOrderId,
  organizationId,
  onSuccess,
  onCancel,
  initialState,
}: CreateRecordFormProps) {
  const [form, setForm] = useState<CreateFormState>({
    ...defaultFormState,
    ...initialState,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const technicians = useQuery(api.technicians.list, { organizationId });
  const createRecord = useMutation(api.maintenanceRecords.createMaintenanceRecord);

  const setField = <K extends keyof CreateFormState>(
    key: K,
    value: CreateFormState[K],
  ) => setForm((prev) => ({ ...prev, [key]: value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!form.callerTechnicianId) {
      setError("Please select the signing technician.");
      return;
    }
    if (!form.signatureAuthEventId.trim()) {
      setError("Please provide the signature auth event ID.");
      return;
    }
    if (!form.approvedDataIdentifier.trim()) {
      setError("Approved data reference identifier is required.");
      return;
    }
    if (!form.approvedDataRevision.trim()) {
      setError("Approved data reference revision is required.");
      return;
    }

    setIsSubmitting(true);
    try {
      await createRecord({
        workOrderId,
        organizationId,
        recordType: form.isCorrection ? "correction" : "maintenance_43_9",
        workPerformed: form.workPerformed,
        approvedDataRef: {
          docType: form.approvedDataDocType,
          identifier: form.approvedDataIdentifier,
          revision: form.approvedDataRevision,
          section: form.approvedDataSection || undefined,
        },
        completionDate: new Date(form.completionDate).getTime(),
        returnedToService: form.returnedToService,
        returnToServiceStatement: form.returnedToService
          ? form.returnToServiceStatement
          : undefined,
        ratingsExercised: [form.ratingsExercised],
        callerTechnicianId: form.callerTechnicianId as Id<"technicians">,
        signatureAuthEventId: form.signatureAuthEventId.trim() as Id<"signatureAuthEvents">,
        // Correction fields
        corrects:
          form.isCorrection && form.correctsRecordId
            ? (form.correctsRecordId as Id<"maintenanceRecords">)
            : undefined,
        correctionFieldName: form.isCorrection
          ? form.correctionFieldName
          : undefined,
        correctionOriginalValue: form.isCorrection
          ? form.correctionOriginalValue
          : undefined,
        correctionCorrectedValue: form.isCorrection
          ? form.correctionCorrectedValue
          : undefined,
        correctionReason: form.isCorrection ? form.correctionReason : undefined,
      });
      onSuccess();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create record.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Record Type Header */}
      <div className="flex items-center gap-2">
        {form.isCorrection ? (
          <Badge
            variant="outline"
            className="bg-amber-500/15 text-amber-400 border-amber-500/30 text-xs"
          >
            Correction Record
          </Badge>
        ) : (
          <Badge
            variant="outline"
            className="bg-sky-500/15 text-sky-400 border-sky-500/30 text-xs"
          >
            New Maintenance Record — 14 CFR 43.9
          </Badge>
        )}
      </div>

      {/* Correction — Record Being Corrected */}
      {form.isCorrection && (
        <div className="p-3 border border-amber-500/30 rounded-md bg-amber-500/5 space-y-3">
          <p className="text-[11px] text-amber-400 font-medium">
            Correction fields — per AC 43-9C, all fields are required.
          </p>
          <div className="grid grid-cols-1 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Record Being Corrected (ID)</Label>
              <Input
                value={form.correctsRecordId}
                onChange={(e) => setField("correctsRecordId", e.target.value)}
                placeholder="Maintenance record Convex ID…"
                className="font-mono text-xs h-8"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Field Being Corrected</Label>
                <Input
                  value={form.correctionFieldName}
                  onChange={(e) =>
                    setField("correctionFieldName", e.target.value)
                  }
                  placeholder="e.g. workPerformed"
                  className="text-xs h-8"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Reason for Correction</Label>
                <Input
                  value={form.correctionReason}
                  onChange={(e) =>
                    setField("correctionReason", e.target.value)
                  }
                  placeholder="Why is the original incorrect?"
                  className="text-xs h-8"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Original (Incorrect) Value</Label>
                <Textarea
                  value={form.correctionOriginalValue}
                  onChange={(e) =>
                    setField("correctionOriginalValue", e.target.value)
                  }
                  rows={2}
                  className="text-xs resize-none"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Corrected Value</Label>
                <Textarea
                  value={form.correctionCorrectedValue}
                  onChange={(e) =>
                    setField("correctionCorrectedValue", e.target.value)
                  }
                  rows={2}
                  className="text-xs resize-none"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Work Performed */}
      <div className="space-y-1.5">
        <Label className="text-xs font-medium flex items-center justify-between">
          <span>
            Work Performed <span className="text-red-400">*</span>
          </span>
          <span
            className={`text-[11px] ${
              form.workPerformed.trim().length < 50
                ? "text-amber-400"
                : "text-green-400"
            }`}
          >
            {form.workPerformed.trim().length} / 50 min
          </span>
        </Label>
        <Textarea
          value={form.workPerformed}
          onChange={(e) => setField("workPerformed", e.target.value)}
          placeholder="Per AC 43-9C: describe work in sufficient detail for someone unfamiliar to understand what was done…"
          rows={3}
          required
          className="text-xs resize-none"
        />
      </div>

      {/* Approved Data Reference */}
      <div className="space-y-1.5">
        <Label className="text-xs font-medium">
          Approved Data Reference <span className="text-red-400">*</span>
        </Label>
        <div className="grid grid-cols-4 gap-2">
          <div className="space-y-1">
            <Label className="text-[10px] text-muted-foreground">
              Doc Type
            </Label>
            <Select
              value={form.approvedDataDocType}
              onValueChange={(v) =>
                setField("approvedDataDocType", v as DocType)
              }
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(
                  [
                    "AMM",
                    "CMM",
                    "SRM",
                    "AD",
                    "SB",
                    "AC",
                    "ICA",
                    "TCDS",
                    "STC",
                    "other",
                  ] as DocType[]
                ).map((t) => (
                  <SelectItem key={t} value={t} className="text-xs">
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] text-muted-foreground">
              Identifier
            </Label>
            <Input
              value={form.approvedDataIdentifier}
              onChange={(e) =>
                setField("approvedDataIdentifier", e.target.value)
              }
              placeholder="e.g. 27-20-00"
              className="text-xs h-8"
              required
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] text-muted-foreground">
              Revision
            </Label>
            <Input
              value={form.approvedDataRevision}
              onChange={(e) =>
                setField("approvedDataRevision", e.target.value)
              }
              placeholder="e.g. Rev 15"
              className="text-xs h-8"
              required
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] text-muted-foreground">
              Section (opt)
            </Label>
            <Input
              value={form.approvedDataSection}
              onChange={(e) =>
                setField("approvedDataSection", e.target.value)
              }
              placeholder="e.g. §200-000"
              className="text-xs h-8"
            />
          </div>
        </div>
      </div>

      {/* Completion Date + Ratings + Return to Service */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">
            Completion Date <span className="text-red-400">*</span>
          </Label>
          <Input
            type="date"
            value={form.completionDate}
            onChange={(e) => setField("completionDate", e.target.value)}
            className="text-xs h-9"
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">
            Ratings Exercised <span className="text-red-400">*</span>
          </Label>
          <Select
            value={form.ratingsExercised}
            onValueChange={(v) =>
              setField("ratingsExercised", v as RatingExercised)
            }
          >
            <SelectTrigger className="h-9 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(
                ["airframe", "powerplant", "ia", "none"] as RatingExercised[]
              ).map((r) => (
                <SelectItem key={r} value={r} className="text-xs capitalize">
                  {r}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Return to Service Toggle */}
      <div className="flex items-start gap-3 p-3 border border-border/40 rounded-md">
        <input
          type="checkbox"
          id="rts-toggle"
          checked={form.returnedToService}
          onChange={(e) => setField("returnedToService", e.target.checked)}
          className="mt-1"
        />
        <div className="flex-1">
          <label
            htmlFor="rts-toggle"
            className="text-xs font-medium cursor-pointer"
          >
            This record returns the aircraft to service
          </label>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            If checked, an RTS certification statement is required per 14 CFR
            43.9.
          </p>
        </div>
      </div>
      {form.returnedToService && (
        <div className="space-y-1.5">
          <Label className="text-xs font-medium flex items-center justify-between">
            <span>
              RTS Certification Statement <span className="text-red-400">*</span>
            </span>
            <span
              className={`text-[11px] ${
                (form.returnToServiceStatement?.trim().length ?? 0) < 50
                  ? "text-amber-400"
                  : "text-green-400"
              }`}
            >
              {form.returnToServiceStatement?.trim().length ?? 0} / 50 min
            </span>
          </Label>
          <Textarea
            value={form.returnToServiceStatement}
            onChange={(e) =>
              setField("returnToServiceStatement", e.target.value)
            }
            placeholder="I certify that this aircraft/component has been…"
            rows={2}
            className="text-xs resize-none"
          />
        </div>
      )}

      {/* Technician Selector */}
      <div className="space-y-1.5">
        <Label className="text-xs font-medium flex items-center gap-1.5">
          <User className="w-3 h-3 text-muted-foreground" />
          Signing Technician <span className="text-red-400">*</span>
        </Label>
        {technicians === undefined ? (
          <Skeleton className="h-9 w-full" />
        ) : (
          <Select
            value={form.callerTechnicianId}
            onValueChange={(v) => setField("callerTechnicianId", v)}
          >
            <SelectTrigger className="h-9 text-xs">
              <SelectValue placeholder="Select technician…" />
            </SelectTrigger>
            <SelectContent>
              {technicians.length === 0 ? (
                <SelectItem value="__none" disabled>
                  No technicians found
                </SelectItem>
              ) : (
                technicians.map((tech) => (
                  <SelectItem
                    key={tech._id}
                    value={tech._id}
                    className="text-xs"
                  >
                    {tech.legalName}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Signature Auth Event */}
      <div className="space-y-1.5">
        <Label className="text-xs font-medium">
          Signature Auth Event ID <span className="text-red-400">*</span>
        </Label>
        <Input
          value={form.signatureAuthEventId}
          onChange={(e) => setField("signatureAuthEventId", e.target.value)}
          placeholder="5-minute single-use auth event ID from re-authentication…"
          className="font-mono text-xs h-9"
        />
        <p className="text-[11px] text-muted-foreground">
          Obtain from{" "}
          <Link
            href={`/work-orders/${workOrderId}/signature`}
            className="text-primary hover:underline"
          >
            the signature page
          </Link>
          . Each event is single-use and expires in 5 minutes.
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 p-3 border border-red-500/30 bg-red-500/5 rounded-md">
          <XCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-[11px] text-red-400">{error}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-end gap-2 pt-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onCancel}
          className="h-8 text-xs"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          size="sm"
          disabled={isSubmitting}
          className="h-8 text-xs gap-1.5"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Creating…
            </>
          ) : (
            <>
              <CheckCircle2 className="w-3.5 h-3.5" />
              {form.isCorrection
                ? "Create Correction Record"
                : "Create & Sign Record"}
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
