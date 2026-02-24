"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import Link from "next/link";
import {
  ArrowLeft,
  FileText,
  PlusCircle,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  AlertTriangle,
  Wrench,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  User,
  Lock,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { NotFoundCard } from "@/components/NotFoundCard";

// ─── Types ─────────────────────────────────────────────────────────────────────

type DocType = "AMM" | "CMM" | "SRM" | "AD" | "SB" | "AC" | "ICA" | "TCDS" | "STC" | "other";
type RatingExercised = "airframe" | "powerplant" | "ia" | "none";

interface CreateFormState {
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

// ─── Record Status Badge ────────────────────────────────────────────────────────

function RecordStatusBadge({ isSigned, isBlocking }: { isSigned: boolean; isBlocking: boolean }) {
  if (isSigned && !isBlocking) {
    return (
      <Badge variant="outline" className="bg-green-500/15 text-green-400 border-green-500/30 text-[10px]">
        <CheckCircle2 className="w-2.5 h-2.5 mr-1" />
        Signed
      </Badge>
    );
  }
  if (isBlocking) {
    return (
      <Badge variant="outline" className="bg-red-500/15 text-red-400 border-red-500/30 text-[10px]">
        <XCircle className="w-2.5 h-2.5 mr-1" />
        Unsigned
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="bg-amber-500/15 text-amber-400 border-amber-500/30 text-[10px]">
      <Clock className="w-2.5 h-2.5 mr-1" />
      Pending
    </Badge>
  );
}

// ─── Record Type Badge ──────────────────────────────────────────────────────────

function RecordTypeBadge({ recordType }: { recordType: string }) {
  const map: Record<string, string> = {
    maintenance_43_9: "bg-sky-500/15 text-sky-400 border-sky-500/30",
    inspection_43_11: "bg-purple-500/15 text-purple-400 border-purple-500/30",
    correction: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  };
  const labels: Record<string, string> = {
    maintenance_43_9: "43.9 Maint",
    inspection_43_11: "43.11 Insp",
    correction: "Correction",
  };
  return (
    <Badge
      variant="outline"
      className={`text-[10px] border ${map[recordType] ?? "bg-muted text-muted-foreground"}`}
    >
      {labels[recordType] ?? recordType}
    </Badge>
  );
}

// ─── Create Record Form ─────────────────────────────────────────────────────────

function CreateRecordForm({
  workOrderId,
  organizationId,
  onSuccess,
  onCancel,
  initialState,
}: {
  workOrderId: Id<"workOrders">;
  organizationId: Id<"organizations">;
  onSuccess: () => void;
  onCancel: () => void;
  initialState?: Partial<CreateFormState>;
}) {
  const [form, setForm] = useState<CreateFormState>({ ...defaultFormState, ...initialState });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const technicians = useQuery(api.technicians.list, { organizationId });
  const createRecord = useMutation(api.maintenanceRecords.createMaintenanceRecord);

  const setField = <K extends keyof CreateFormState>(key: K, value: CreateFormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

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
        returnToServiceStatement: form.returnedToService ? form.returnToServiceStatement : undefined,
        ratingsExercised: [form.ratingsExercised],
        callerTechnicianId: form.callerTechnicianId as Id<"technicians">,
        signatureAuthEventId: form.signatureAuthEventId.trim() as Id<"signatureAuthEvents">,
        // Correction fields
        corrects: form.isCorrection && form.correctsRecordId ? form.correctsRecordId as Id<"maintenanceRecords"> : undefined,
        correctionFieldName: form.isCorrection ? form.correctionFieldName : undefined,
        correctionOriginalValue: form.isCorrection ? form.correctionOriginalValue : undefined,
        correctionCorrectedValue: form.isCorrection ? form.correctionCorrectedValue : undefined,
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
          <Badge variant="outline" className="bg-amber-500/15 text-amber-400 border-amber-500/30 text-xs">
            Correction Record
          </Badge>
        ) : (
          <Badge variant="outline" className="bg-sky-500/15 text-sky-400 border-sky-500/30 text-xs">
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
                  onChange={(e) => setField("correctionFieldName", e.target.value)}
                  placeholder="e.g. workPerformed"
                  className="text-xs h-8"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Reason for Correction</Label>
                <Input
                  value={form.correctionReason}
                  onChange={(e) => setField("correctionReason", e.target.value)}
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
                  onChange={(e) => setField("correctionOriginalValue", e.target.value)}
                  rows={2}
                  className="text-xs resize-none"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Corrected Value</Label>
                <Textarea
                  value={form.correctionCorrectedValue}
                  onChange={(e) => setField("correctionCorrectedValue", e.target.value)}
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
          <span>Work Performed <span className="text-red-400">*</span></span>
          <span className={`text-[11px] ${form.workPerformed.trim().length < 50 ? "text-amber-400" : "text-green-400"}`}>
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
            <Label className="text-[10px] text-muted-foreground">Doc Type</Label>
            <Select
              value={form.approvedDataDocType}
              onValueChange={(v) => setField("approvedDataDocType", v as DocType)}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(["AMM", "CMM", "SRM", "AD", "SB", "AC", "ICA", "TCDS", "STC", "other"] as DocType[]).map((t) => (
                  <SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] text-muted-foreground">Identifier</Label>
            <Input
              value={form.approvedDataIdentifier}
              onChange={(e) => setField("approvedDataIdentifier", e.target.value)}
              placeholder="e.g. 27-20-00"
              className="text-xs h-8"
              required
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] text-muted-foreground">Revision</Label>
            <Input
              value={form.approvedDataRevision}
              onChange={(e) => setField("approvedDataRevision", e.target.value)}
              placeholder="e.g. Rev 15"
              className="text-xs h-8"
              required
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] text-muted-foreground">Section (opt)</Label>
            <Input
              value={form.approvedDataSection}
              onChange={(e) => setField("approvedDataSection", e.target.value)}
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
            onValueChange={(v) => setField("ratingsExercised", v as RatingExercised)}
          >
            <SelectTrigger className="h-9 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(["airframe", "powerplant", "ia", "none"] as RatingExercised[]).map((r) => (
                <SelectItem key={r} value={r} className="text-xs capitalize">{r}</SelectItem>
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
          <label htmlFor="rts-toggle" className="text-xs font-medium cursor-pointer">
            This record returns the aircraft to service
          </label>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            If checked, an RTS certification statement is required per 14 CFR 43.9.
          </p>
        </div>
      </div>
      {form.returnedToService && (
        <div className="space-y-1.5">
          <Label className="text-xs font-medium flex items-center justify-between">
            <span>RTS Certification Statement <span className="text-red-400">*</span></span>
            <span className={`text-[11px] ${(form.returnToServiceStatement?.trim().length ?? 0) < 50 ? "text-amber-400" : "text-green-400"}`}>
              {form.returnToServiceStatement?.trim().length ?? 0} / 50 min
            </span>
          </Label>
          <Textarea
            value={form.returnToServiceStatement}
            onChange={(e) => setField("returnToServiceStatement", e.target.value)}
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
                <SelectItem value="__none" disabled>No technicians found</SelectItem>
              ) : (
                technicians.map((tech) => (
                  <SelectItem key={tech._id} value={tech._id} className="text-xs">
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
          <Link href={`/work-orders/${workOrderId}/signature`} className="text-primary hover:underline">
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
        <Button type="button" variant="ghost" size="sm" onClick={onCancel} className="h-8 text-xs">
          Cancel
        </Button>
        <Button type="submit" size="sm" disabled={isSubmitting} className="h-8 text-xs gap-1.5">
          {isSubmitting ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Creating…
            </>
          ) : (
            <>
              <CheckCircle2 className="w-3.5 h-3.5" />
              {form.isCorrection ? "Create Correction Record" : "Create & Sign Record"}
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MaintenanceRecordsPage() {
  const params = useParams<{ id: string }>();
  const workOrderId = params.id as Id<"workOrders">;
  const { orgId } = useCurrentOrg();

  const [showForm, setShowForm] = useState(false);
  const [correctionTarget, setCorrectionTarget] = useState<string | null>(null);

  // Fetch close readiness report (contains maintenance records summary)
  const report = useQuery(
    api.returnToService.getCloseReadinessReport,
    orgId && workOrderId
      ? { workOrderId, organizationId: orgId }
      : "skip",
  );

  // FEAT-021: Fetch full records (with signatureHash) for immutability indicator
  const fullRecords = useQuery(
    api.maintenanceRecords.listForWorkOrder,
    orgId && workOrderId
      ? { workOrderId, organizationId: orgId }
      : "skip",
  );

  // Build signatureHash lookup map: recordId → hash
  const hashMap = new Map<string, string>(
    (fullRecords ?? [])
      .filter((r) => r.signatureHash)
      .map((r) => [r._id as string, r.signatureHash as string]),
  );

  function handleSuccess() {
    setShowForm(false);
    setCorrectionTarget(null);
  }

  function handleCorrect(recordId: string) {
    setCorrectionTarget(recordId);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // ── Loading ────────────────────────────────────────────────────────────────
  if (report === undefined) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-7 w-32" />
        <Skeleton className="h-8 w-64" />
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (report === null) {
    return (
      <NotFoundCard
        message="Work order not found. It may have been deleted or the link is invalid."
        backHref="/work-orders"
        backLabel="Back to Work Orders"
      />
    );
  }

  const records = report.maintenanceRecords;
  const unsignedCount = records.filter((r: { isBlocking: boolean }) => r.isBlocking).length;

  return (
    <div className="space-y-5">
      {/* Back */}
      <Button asChild variant="ghost" size="sm" className="h-7 -ml-2 text-xs text-muted-foreground">
        <Link href={`/work-orders/${workOrderId}`}>
          <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
          {report.workOrderNumber}
        </Link>
      </Button>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-foreground flex items-center gap-2">
            <FileText className="w-5 h-5 text-muted-foreground" />
            Maintenance Records
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            <span className="font-mono">{report.workOrderNumber}</span>
            {" · "}
            <span className="font-mono font-semibold">{report.aircraftRegistration}</span>
          </p>
        </div>
        {!showForm && (
          <Button
            size="sm"
            onClick={() => { setCorrectionTarget(null); setShowForm(true); }}
            className="gap-1.5 h-8 text-xs"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            Add Record
          </Button>
        )}
      </div>

      {/* Status Banner */}
      {unsignedCount > 0 && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="p-3 flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <p className="text-xs text-amber-400">
              {unsignedCount} record{unsignedCount !== 1 ? "s" : ""} {unsignedCount !== 1 ? "are" : "is"} not signed.
              All maintenance records must be signed before RTS can be authorized.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Create Form */}
      {showForm && orgId && (
        <Card className="border-primary/30 bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
              {correctionTarget ? (
                <>
                  <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                  Correction Record
                </>
              ) : (
                <>
                  <PlusCircle className="w-3.5 h-3.5" />
                  New Maintenance Record
                </>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CreateRecordForm
              workOrderId={workOrderId}
              organizationId={orgId}
              onSuccess={handleSuccess}
              onCancel={() => { setShowForm(false); setCorrectionTarget(null); }}
              initialState={
                correctionTarget
                  ? { isCorrection: true, correctsRecordId: correctionTarget }
                  : { isCorrection: false }
              }
            />
          </CardContent>
        </Card>
      )}

      {/* Records List */}
      <Card className="border-border/60">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Wrench className="w-3.5 h-3.5" />
              Records ({records.length})
            </span>
            {records.length > 0 && unsignedCount === 0 && (
              <span className="flex items-center gap-1 text-green-400">
                <CheckCircle2 className="w-3.5 h-3.5" />
                All Signed
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {records.length === 0 ? (
            <div className="py-10 text-center">
              <FileText className="w-7 h-7 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No maintenance records yet.</p>
              <p className="text-[11px] text-muted-foreground/70 mt-1">
                Per 14 CFR 43.9, at least one signed maintenance record is required before RTS.
              </p>
              {!showForm && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4 h-8 text-xs gap-1.5"
                  onClick={() => { setCorrectionTarget(null); setShowForm(true); }}
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  Add First Record
                </Button>
              )}
            </div>
          ) : (
            <div>
              {records.map((record: {
                recordId: string;
                recordType: string;
                completionDate?: number;
                isSigned: boolean;
                isBlocking: boolean;
              }, idx: number) => {
                const sigHash = hashMap.get(record.recordId);
                const hashPreview = sigHash ? sigHash.slice(0, 8) : null;

                return (
                  <div key={record.recordId}>
                    {idx > 0 && <Separator className="opacity-30 my-1" />}
                    <div className="flex items-start gap-3 py-3">
                      <div className="flex-shrink-0 mt-0.5">
                        <RecordStatusBadge isSigned={record.isSigned} isBlocking={record.isBlocking} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                          <RecordTypeBadge recordType={record.recordType} />
                          <span className="font-mono text-[10px] text-muted-foreground/60">
                            {record.recordId.slice(0, 12)}…
                          </span>
                          {/* FEAT-021: Immutability indicator for signed records */}
                          {record.isSigned && hashPreview && (
                            <span
                              title="This record is cryptographically sealed and cannot be modified."
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border border-amber-500/40 bg-amber-500/10 text-amber-400 text-[10px] font-mono cursor-help"
                            >
                              <Lock className="w-2.5 h-2.5 flex-shrink-0" />
                              {hashPreview}
                            </span>
                          )}
                        </div>
                        {record.completionDate && (
                          <p className="text-[11px] text-muted-foreground">
                            Completion:{" "}
                            {new Date(record.completionDate).toLocaleDateString("en-US", {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                              timeZone: "UTC",
                            })}
                          </p>
                        )}
                        {/* FEAT-021: Correction required notice for signed records */}
                        {record.isSigned && (
                          <div className="mt-1.5 flex items-start gap-1.5 p-2 rounded border border-amber-500/20 bg-amber-500/5">
                            <Info className="w-3 h-3 text-amber-400/70 flex-shrink-0 mt-0.5" />
                            <p className="text-[10px] text-amber-400/70 leading-relaxed">
                              <span className="font-semibold text-amber-400">CORRECTION REQUIRED?</span>{" "}
                              This record is sealed. Errors must be corrected via the
                              append-only correction chain — create a Correction Record
                              referencing this record&apos;s ID. The original record is
                              preserved unchanged per 14 CFR 43.9 and AC 43-9C.
                            </p>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-[10px] gap-1 px-2"
                          onClick={() => handleCorrect(record.recordId)}
                        >
                          <RotateCcw className="w-3 h-3" />
                          Correct
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Regulatory Note */}
      <p className="text-[11px] text-muted-foreground/60 text-center">
        Maintenance records are immutable once signed. Errors must be corrected by creating a correction record.
        Per 14 CFR 43.9 and AC 43-9C.
      </p>
    </div>
  );
}
