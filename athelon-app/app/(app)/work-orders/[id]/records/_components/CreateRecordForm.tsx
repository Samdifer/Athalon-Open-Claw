"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Link } from "react-router-dom";
import {
  CheckCircle2,
  XCircle,
  Loader2,
  User,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
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

// BUG-QCM-REC-001: Use local date (not UTC) for completionDate default.
// new Date().toISOString() returns a UTC string — for a technician in UTC-5
// working after 7pm, this gives yesterday's date pre-filled. A maintenance
// record with the wrong completion date is a regulatory error under 14 CFR
// 43.9(a)(1). Use padded local year/month/day components instead.
function todayLocalISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const defaultFormState: CreateFormState = {
  workPerformed: "",
  approvedDataDocType: "AMM",
  approvedDataIdentifier: "",
  approvedDataRevision: "",
  approvedDataSection: "",
  completionDate: todayLocalISO(),
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
  // BUG-LT-HUNT-077: Use a lazy initializer so completionDate is computed at
  // first render, not at module load time. defaultFormState is a module-level
  // constant — todayLocalISO() is called once when the module loads (e.g. when
  // the user first visits the app). If the app is left open overnight (common
  // in a maintenance shop — a tech closes his laptop at 5pm and reopens it at
  // 7am the next day), the defaultFormState.completionDate is still yesterday.
  // A maintenance record with the wrong completion date is a regulatory error
  // under 14 CFR 43.9(a)(1). The lazy initializer runs fresh at each component
  // mount, ensuring the date always reflects the actual current day.
  const [form, setForm] = useState<CreateFormState>(() => ({
    ...defaultFormState,
    completionDate: todayLocalISO(),
    ...initialState,
  }));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const technicians = useQuery(api.technicians.list, { organizationId });
  // For correction dropdown — load existing records so tech picks by human-readable seq/description
  const existingRecords = useQuery(
    api.maintenanceRecords.listForWorkOrder,
    form.isCorrection ? { workOrderId, organizationId } : "skip",
  );
  const createRecord = useMutation(api.maintenanceRecords.createMaintenanceRecord);

  const setField = <K extends keyof CreateFormState>(
    key: K,
    value: CreateFormState[K],
  ) => setForm((prev) => ({ ...prev, [key]: value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!form.workPerformed.trim()) {
      setError("Work performed description is required.");
      return;
    }
    if (form.workPerformed.trim().length < 50) {
      setError(
        `Work description must be at least 50 characters per AC 43-9C. Current: ${form.workPerformed.trim().length} chars.`,
      );
      return;
    }
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
    // BUG-LT4-001: Validate completionDate before submitting.
    // new Date("").getTime() === NaN — silently sent to backend if the tech
    // clears the date field. The backend receives NaN as the timestamp and
    // either rejects with a cryptic schema error or stores an invalid date.
    // Per AC 43-9C every maintenance record must have a valid completion date.
    if (!form.completionDate) {
      setError("Completion date is required.");
      return;
    }
    const completionTs = new Date(form.completionDate).getTime();
    if (isNaN(completionTs)) {
      setError("Completion date is invalid. Please enter a valid date.");
      return;
    }
    // BUG-LT-HUNT-078: No future-date validation on completionDate. A tech
    // accidentally typing 2027 instead of 2026 (or auto-fill suggesting a
    // future year) could create a maintenance record with a future completion
    // date — a regulatory error under 14 CFR 43.9(a)(1). The record would be
    // permanently signed with an invalid date and cannot be corrected without
    // creating an amendment record. "Tomorrow" is allowed (just barely in the
    // future due to timezone edge cases); anything beyond 7 days in the future
    // is almost certainly a data entry error.
    const sevenDaysFuture = Date.now() + 7 * 24 * 60 * 60 * 1000;
    if (completionTs > sevenDaysFuture) {
      setError(
        `Completion date (${form.completionDate}) is more than 7 days in the future. Please verify the date — maintenance records must reflect the actual date of work per 14 CFR 43.9(a)(1).`,
      );
      return;
    }
    // BH-LT3-004: Validate RTS statement when "returned to service" is checked.
    // Previously the submit handler had no validation for this field — a tech
    // could check RTS, type 5 chars in the statement, and submit. The backend
    // might accept it or fail with a cryptic schema error; either way the UI
    // gave no proactive feedback. Per 14 CFR 43.9 the statement must be
    // substantive. We enforce a minimum of 50 chars here (same as signCardDialog).
    if (form.returnedToService) {
      if (!form.returnToServiceStatement.trim()) {
        setError("An RTS certification statement is required per 14 CFR 43.9 when returning the aircraft to service.");
        return;
      }
      if (form.returnToServiceStatement.trim().length < 50) {
        setError(
          `RTS certification statement must be at least 50 characters (14 CFR 43.9). Current: ${form.returnToServiceStatement.trim().length} chars.`,
        );
        return;
      }
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
        completionDate: completionTs,
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
            className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 text-xs"
          >
            Correction Record
          </Badge>
        ) : (
          <Badge
            variant="outline"
            className="bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30 text-xs"
          >
            New Maintenance Record — 14 CFR 43.9
          </Badge>
        )}
      </div>

      {/* Correction — Record Being Corrected */}
      {form.isCorrection && (
        <div className="p-3 border border-amber-500/30 rounded-md bg-amber-500/5 space-y-3">
          <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
            Correction fields — per AC 43-9C, all fields are required.
          </p>
          <div className="grid grid-cols-1 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">
                Record Being Corrected <span className="text-red-600 dark:text-red-400">*</span>
              </Label>
              {existingRecords === undefined ? (
                <Skeleton className="h-8 w-full" />
              ) : (
                <Select
                  value={form.correctsRecordId}
                  onValueChange={(v) => setField("correctsRecordId", v)}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Select the record to correct…" />
                  </SelectTrigger>
                  <SelectContent>
                    {(existingRecords ?? []).length === 0 ? (
                      <SelectItem value="__none" disabled>
                        No maintenance records yet
                      </SelectItem>
                    ) : (
                      (existingRecords ?? []).map((r) => {
                        const rawDesc = r.workPerformed ?? "";
                        const desc = rawDesc.slice(0, 55);
                        const date = r.completionDate
                          ? new Date(r.completionDate).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                            })
                          : "no date";
                        return (
                          <SelectItem key={r._id} value={r._id} className="text-xs">
                            <span className="font-mono font-semibold">#{r.sequenceNumber}</span>
                            {" — "}
                            {desc.length < rawDesc.length ? `${desc}…` : desc}
                            {" ("}
                            {date}
                            {")"}
                          </SelectItem>
                        );
                      })
                    )}
                  </SelectContent>
                </Select>
              )}
              <p className="text-[10px] text-muted-foreground">
                Per AC 43-9C — select the record containing an error. The correction record will reference it by ID.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Field Being Corrected</Label>
                {/* BUG-LT-077: correctionFieldName had no maxLength. Capped at 100 chars
                    — sufficient for any field name (e.g. "returnToServiceStatement"). */}
                <Input
                  value={form.correctionFieldName}
                  onChange={(e) =>
                    setField("correctionFieldName", e.target.value.slice(0, 100))
                  }
                  placeholder="e.g. workPerformed"
                  className="text-xs h-8"
                  maxLength={100}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Reason for Correction</Label>
                {/* BUG-LT-077: correctionReason had no maxLength. Capped at 500. */}
                <Input
                  value={form.correctionReason}
                  onChange={(e) =>
                    setField("correctionReason", e.target.value.slice(0, 500))
                  }
                  placeholder="Why is the original incorrect?"
                  className="text-xs h-8"
                  maxLength={500}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Original (Incorrect) Value</Label>
                {/* BUG-LT-077: correctionOriginalValue had no maxLength. Capped at 1000. */}
                <Textarea
                  value={form.correctionOriginalValue}
                  onChange={(e) =>
                    setField("correctionOriginalValue", e.target.value.slice(0, 1000))
                  }
                  rows={2}
                  className="text-xs resize-none"
                  maxLength={1000}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Corrected Value</Label>
                {/* BUG-LT-077: correctionCorrectedValue had no maxLength. Capped at 1000. */}
                <Textarea
                  value={form.correctionCorrectedValue}
                  onChange={(e) =>
                    setField("correctionCorrectedValue", e.target.value.slice(0, 1000))
                  }
                  rows={2}
                  className="text-xs resize-none"
                  maxLength={1000}
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
            Work Performed <span className="text-red-600 dark:text-red-400">*</span>
          </span>
          <span
            className={`text-[11px] ${
              form.workPerformed.trim().length < 50
                ? "text-amber-600 dark:text-amber-400"
                : "text-green-600 dark:text-green-400"
            }`}
          >
            {form.workPerformed.trim().length} / 50 min
          </span>
        </Label>
        {/* BUG-LT-077: workPerformed textarea had no maxLength cap. This is the
            14 CFR 43.9(a)(2) work description — the most important field on the
            maintenance record. A technician pasting a verbose maintenance procedure
            narrative (e.g. a full AMM inspection checklist) could exceed the backend
            schema limit and get a cryptic validation error AFTER completing all other
            fields including re-authentication. The auth event is single-use and
            5-minute-limited; a backend error here means the tech must start over.
            Capped at 3000 chars — generous for any legally-sufficient 43.9 description.
            The "50 min" character counter already exists below this field. */}
        <Textarea
          value={form.workPerformed}
          onChange={(e) => setField("workPerformed", e.target.value.slice(0, 3000))}
          placeholder="Per AC 43-9C: describe work in sufficient detail for someone unfamiliar to understand what was done…"
          rows={3}
          required
          className="text-xs resize-none"
          maxLength={3000}
        />
      </div>

      {/* Approved Data Reference */}
      <div className="space-y-1.5">
        <Label className="text-xs font-medium">
          Approved Data Reference <span className="text-red-600 dark:text-red-400">*</span>
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
            {/* BUG-LT-HUNT-079: approvedDataIdentifier had no maxLength cap.
                A tech pasting a long AMM chapter path could exceed the backend
                schema limit and get a cryptic error AFTER entering their PIN
                (single-use 5-minute auth event consumed). 100 chars is generous
                for any standard document identifier (e.g. "71-00-00-400-001"). */}
            <Input
              value={form.approvedDataIdentifier}
              onChange={(e) =>
                setField("approvedDataIdentifier", e.target.value.slice(0, 100))
              }
              placeholder="e.g. 27-20-00"
              className="text-xs h-8"
              maxLength={100}
              required
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] text-muted-foreground">
              Revision
            </Label>
            {/* BUG-LT-HUNT-079: approvedDataRevision had no maxLength cap. */}
            <Input
              value={form.approvedDataRevision}
              onChange={(e) =>
                setField("approvedDataRevision", e.target.value.slice(0, 50))
              }
              placeholder="e.g. Rev 15"
              className="text-xs h-8"
              maxLength={50}
              required
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] text-muted-foreground">
              Section (opt)
            </Label>
            {/* BUG-LT-HUNT-079: approvedDataSection had no maxLength cap. */}
            <Input
              value={form.approvedDataSection}
              onChange={(e) =>
                setField("approvedDataSection", e.target.value.slice(0, 100))
              }
              placeholder="e.g. §200-000"
              className="text-xs h-8"
              maxLength={100}
            />
          </div>
        </div>
      </div>

      {/* Completion Date + Ratings + Return to Service */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">
            Completion Date <span className="text-red-600 dark:text-red-400">*</span>
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
            Ratings Exercised <span className="text-red-600 dark:text-red-400">*</span>
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

      {/* Return to Service Toggle
          BH-LT3-002: Was a raw HTML <input type="checkbox"> — invisible in
          dark mode (white checkbox on white background). A lead tech marking
          a record as returning the aircraft to service could not see or
          interact with this checkbox in dark mode. Now uses shadcn Checkbox
          with proper dark-mode theming and correct touch target size. */}
      <div className="flex items-start gap-3 p-3 border border-border/40 rounded-md">
        <Checkbox
          id="rts-toggle"
          checked={form.returnedToService}
          onCheckedChange={(checked) => setField("returnedToService", checked === true)}
          className="mt-0.5"
        />
        <div className="flex-1">
          <Label
            htmlFor="rts-toggle"
            className="text-xs font-medium cursor-pointer"
          >
            This record returns the aircraft to service
          </Label>
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
              RTS Certification Statement <span className="text-red-600 dark:text-red-400">*</span>
            </span>
            <span
              className={`text-[11px] ${
                (form.returnToServiceStatement?.trim().length ?? 0) < 50
                  ? "text-amber-600 dark:text-amber-400"
                  : "text-green-600 dark:text-green-400"
              }`}
            >
              {form.returnToServiceStatement?.trim().length ?? 0} / 50 min
            </span>
          </Label>
          {/* BUG-LT-HUNT-080: returnToServiceStatement textarea had no maxLength
              cap. The minimum (50 chars) was enforced but a tech pasting a
              long paragraph could exceed the backend schema limit and get a
              cryptic error AFTER entering their PIN (auth event consumed).
              2000 chars matches the SignCardDialog RTS statement cap. */}
          <Textarea
            value={form.returnToServiceStatement}
            onChange={(e) =>
              setField("returnToServiceStatement", e.target.value.slice(0, 2000))
            }
            placeholder="I certify that this aircraft/component has been…"
            rows={2}
            maxLength={2000}
            className="text-xs resize-none"
          />
          <p className={`text-[10px] text-right mt-0.5 ${(form.returnToServiceStatement?.length ?? 0) >= 1900 ? "text-amber-400" : "text-muted-foreground/50"}`}>
            {form.returnToServiceStatement?.length ?? 0}/2000
          </p>
        </div>
      )}

      {/* Technician Selector */}
      <div className="space-y-1.5">
        <Label className="text-xs font-medium flex items-center gap-1.5">
          <User className="w-3 h-3 text-muted-foreground" />
          Signing Technician <span className="text-red-600 dark:text-red-400">*</span>
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
          Signature Auth Event ID <span className="text-red-600 dark:text-red-400">*</span>
        </Label>
        <Input
          value={form.signatureAuthEventId}
          onChange={(e) => setField("signatureAuthEventId", e.target.value)}
          placeholder="5-minute single-use auth event ID from re-authentication…"
          className="font-mono text-xs h-9"
        />
        {/* BH-LT3-003: Include returnTo + intendedTable params so the signature
            page shows "Continue to Sign-Off" and redirects back here with
            ?authEventId=<id> appended. Without these params the tech had to
            manually type a 25+ char Convex ID — practically impossible in a
            shop context. Same root cause as BH-001 (RTS page). */}
        <p className="text-[11px] text-muted-foreground">
          Obtain from{" "}
          <Link
            to={`/work-orders/${workOrderId}/signature?returnTo=/work-orders/${workOrderId}/records&intendedTable=maintenanceRecords`}
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
          <XCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-[11px] text-red-600 dark:text-red-400">{error}</p>
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
