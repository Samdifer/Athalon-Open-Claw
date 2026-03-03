/**
 * components/QcmReviewPanel.tsx
 * Athelon — QCM Review Panel
 *
 * Chloe Park, 2026-02-22
 * Wave 2 — Linda Paredes's requirement: QCM review as a first-class system event.
 *
 * "QCM review is a line in a spreadsheet." — Linda Paredes, QCM
 * That ends here.
 *
 * What this component does:
 *   - Shows the full work order being reviewed: WO header, all maintenance
 *     records (with structured approved data references), all task card
 *     sign-offs, and any discrepancies.
 *   - Presents a structured review form: outcome + findings (required if
 *     outcome != "accepted").
 *   - Submit triggers the `createQcmReview` Convex mutation through the
 *     SignOffFlow PIN ceremony.
 *   - Role-gated: renders review form only for QCM role. Inspectors and
 *     DOM see read-only view. Other roles see nothing (should be redirected
 *     at the page level, but we defensively handle here too).
 *   - Immutable once submitted: submitted review shown as signed block.
 *
 * INV-24: WO must be in status "closed" before QCM review.
 * INV-25: reviewedByTechnicianId must be the org's QCM.
 * INV-26: findingsNotes required when outcome != "accepted".
 *
 * Integration:
 *   Used inside app/(app)/work-orders/[id]/qcm-review/page.tsx.
 *   The page fetches the WO + all linked records and passes them as props.
 */

"use client";

import React, { useState, useId, useCallback } from "react";
import { cn } from "@/lib/utils";
import { useOrgRole } from "@/lib/auth";
import { SignedBlock } from "@/components/SignOffFlow";

// TODO: Replace with real Convex imports once deployed:
// import { api } from "@/convex/_generated/api";
// import { useMutation } from "convex/react";
// import type { Id } from "@/convex/_generated/dataModel";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const api = {} as any;
// Stub type until generated:
type Id<_T extends string> = string;

// ---------------------------------------------------------------------------
// Types — aligned with schema-v3.ts
// ---------------------------------------------------------------------------

export interface ApprovedDataRef {
  docType: string;       // e.g. "AMM", "SRM", "ICA", "FAA AC", "SB"
  identifier: string;    // e.g. "Chapter 12"
  revision: string;      // e.g. "Rev 2026-01"
  section: string;       // e.g. "Section 12-11-00"
}

export interface MaintenanceRecordSummary {
  id: Id<"maintenanceRecords">;
  recordType: "maintenance_43_9" | "inspection_43_11" | "correction";
  workPerformed: string;
  approvedDataReference: string;
  /** Structured parsed version if available — else null */
  approvedDataRefStructured: ApprovedDataRef | null;
  completionDate: number;
  signingTechnicianLegalName: string;
  signingTechnicianCertNumber: string;
  signatureTimestamp: number;
  partsCount: number;
  testEquipmentCount: number;
}

export interface TaskCardSignOffSummary {
  taskCardId: Id<"taskCards">;
  taskCardNumber: string;
  taskCardTitle: string;
  completedAt: number | null;
  stepCount: number;
  completedStepCount: number;
  steps: Array<{
    stepId: Id<"taskCardSteps">;
    stepNumber: number;
    description: string;
    status: "pending" | "completed" | "na";
    signedByName: string | null;
    signedCertNumber: string | null;
    signedAt: number | null;
    requiresIa: boolean;
  }>;
}

export interface ExistingQcmReview {
  id: Id<"qcmReviews">;
  reviewerLegalName: string;
  reviewerCertificateNumber: string;
  reviewTimestamp: number;
  outcome: "accepted" | "findings_noted" | "requires_amendment";
  findingsNotes: string | null;
  signatureHash: string;
}

export interface WorkOrderForQcmReview {
  id: Id<"workOrders">;
  workOrderNumber: string;
  status: string;
  workOrderType: string;
  description: string;
  openedAt: number;
  closedAt: number | null;
  aircraftRegistration: string;
  aircraftMake: string;
  aircraftModel: string;
  aircraftTotalTimeAtClose: number | null;
  organizationName: string;
}

export interface QcmReviewPanelProps {
  workOrder: WorkOrderForQcmReview;
  maintenanceRecords: MaintenanceRecordSummary[];
  taskCards: TaskCardSignOffSummary[];
  /** If already submitted — renders immutable view */
  existingReview: ExistingQcmReview | null;
  /** QCM technician ID for the current user */
  currentTechnicianId: Id<"technicians"> | null;
  /** Called on successful review submission — parent refreshes data */
  onReviewSubmitted?: () => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const OUTCOME_LABELS: Record<ExistingQcmReview["outcome"], string> = {
  accepted: "Accepted — All records compliant, no findings",
  findings_noted: "Findings Noted — Minor findings logged; work order acceptable",
  requires_amendment: "Requires Amendment — One or more records require amendment",
};

const OUTCOME_COLORS: Record<ExistingQcmReview["outcome"], string> = {
  accepted: "text-green-700 bg-green-50 border-green-300",
  findings_noted: "text-amber-700 bg-amber-50 border-amber-300",
  requires_amendment: "text-red-700 bg-red-50 border-red-300",
};

function formatDateUtc(ts: number): string {
  const d = new Date(ts);
  const date = d.toISOString().slice(0, 10);
  const time = d.toISOString().slice(11, 16);
  return `${date} ${time}Z`;
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** Section wrapper with consistent heading style */
function ReviewSection({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  const headingId = useId();
  return (
    <section
      aria-labelledby={headingId}
      className={cn("rounded-[6px] border border-gray-200 bg-white", className)}
    >
      <div className="px-4 py-3 border-b border-gray-100">
        <h3
          id={headingId}
          className="text-[13px] font-semibold text-gray-700 uppercase tracking-[0.06em]"
        >
          {title}
        </h3>
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

/** Work Order summary block */
function WorkOrderSummaryBlock({ wo }: { wo: WorkOrderForQcmReview }) {
  const ttFormatted =
    wo.aircraftTotalTimeAtClose !== null
      ? wo.aircraftTotalTimeAtClose.toLocaleString("en-US", {
          minimumFractionDigits: 1,
          maximumFractionDigits: 1,
        }) + " hours"
      : "—";

  const woTypeLabel = wo.workOrderType
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <ReviewSection title="Work Order">
      <div className="grid grid-cols-2 gap-x-6 gap-y-2">
        <div>
          <p className="text-[11px] text-gray-500 uppercase tracking-wide">
            Work Order
          </p>
          <p className="text-[16px] font-bold font-mono text-gray-900">
            {wo.workOrderNumber}
          </p>
        </div>
        <div>
          <p className="text-[11px] text-gray-500 uppercase tracking-wide">
            Status
          </p>
          <p className="text-[14px] font-semibold text-gray-900 capitalize">
            {wo.status.replace(/_/g, " ")}
          </p>
        </div>
        <div>
          <p className="text-[11px] text-gray-500 uppercase tracking-wide">
            Aircraft
          </p>
          <p className="text-[15px] font-semibold font-mono text-gray-900">
            {wo.aircraftRegistration}
          </p>
          <p className="text-[13px] text-gray-600">
            {wo.aircraftMake} {wo.aircraftModel}
          </p>
        </div>
        <div>
          <p className="text-[11px] text-gray-500 uppercase tracking-wide">
            Type
          </p>
          <p className="text-[14px] text-gray-900">{woTypeLabel}</p>
        </div>
        <div>
          <p className="text-[11px] text-gray-500 uppercase tracking-wide">
            Opened
          </p>
          <p className="text-[13px] font-mono text-gray-900">
            {formatDate(wo.openedAt)}
          </p>
        </div>
        <div>
          <p className="text-[11px] text-gray-500 uppercase tracking-wide">
            Closed
          </p>
          <p className="text-[13px] font-mono text-gray-900">
            {wo.closedAt ? formatDate(wo.closedAt) : "—"}
          </p>
        </div>
        <div className="col-span-2">
          <p className="text-[11px] text-gray-500 uppercase tracking-wide">
            TT at Close
          </p>
          <p className="text-[13px] font-mono text-gray-900">{ttFormatted}</p>
        </div>
        {wo.description && (
          <div className="col-span-2">
            <p className="text-[11px] text-gray-500 uppercase tracking-wide mb-1">
              Description
            </p>
            <p className="text-[14px] text-gray-900">{wo.description}</p>
          </div>
        )}
      </div>
    </ReviewSection>
  );
}

/** Single maintenance record row */
function MaintenanceRecordRow({
  record,
}: {
  record: MaintenanceRecordSummary;
}) {
  const [expanded, setExpanded] = useState(false);
  const headingId = useId();

  const recordTypeLabel =
    record.recordType === "maintenance_43_9"
      ? "Maintenance Record (43.9)"
      : record.recordType === "inspection_43_11"
        ? "Inspection Record (43.11)"
        : "Correction Record";

  return (
    <div className="border-b border-gray-100 last:border-0">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        aria-controls={`record-${headingId}-detail`}
        className={cn(
          "w-full text-left px-4 py-3 flex items-start justify-between gap-3",
          "min-h-[64px]", // glove-mode: 64px min target height
          "hover:bg-gray-50 transition-colors duration-100",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500",
        )}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] text-gray-500 uppercase tracking-wide">
              {recordTypeLabel}
            </span>
            <span className="text-[11px] font-mono text-gray-400">
              …{record.id.slice(-8)}
            </span>
          </div>
          <p className="text-[14px] text-gray-900 mt-0.5 line-clamp-2">
            {record.workPerformed}
          </p>
          <p className="text-[12px] text-gray-500 mt-1">
            {record.signingTechnicianLegalName} · {formatDateUtc(record.signatureTimestamp)}
          </p>
        </div>
        <span
          aria-hidden
          className={cn(
            "shrink-0 text-gray-400 transition-transform duration-150",
            expanded ? "rotate-90" : "rotate-0",
          )}
        >
          ›
        </span>
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div
          id={`record-${headingId}-detail`}
          className="px-4 pb-4 space-y-3 bg-gray-50 border-t border-gray-100"
        >
          {/* Work performed — full, no truncation */}
          <div>
            <p className="text-[11px] text-gray-500 uppercase tracking-wide mb-1">
              Work Performed
            </p>
            <p className="text-[14px] text-gray-900 whitespace-pre-wrap">
              {record.workPerformed}
            </p>
          </div>

          {/* Approved data reference */}
          <div>
            <p className="text-[11px] text-gray-500 uppercase tracking-wide mb-1">
              Approved Data Reference
            </p>
            {record.approvedDataRefStructured ? (
              <dl className="grid grid-cols-2 gap-x-4 gap-y-1">
                <dt className="text-[12px] text-gray-500">Doc Type</dt>
                <dd className="text-[13px] font-mono text-gray-900">
                  {record.approvedDataRefStructured.docType}
                </dd>
                <dt className="text-[12px] text-gray-500">Identifier</dt>
                <dd className="text-[13px] font-mono text-gray-900">
                  {record.approvedDataRefStructured.identifier}
                </dd>
                <dt className="text-[12px] text-gray-500">Revision</dt>
                <dd className="text-[13px] font-mono text-gray-900">
                  {record.approvedDataRefStructured.revision}
                </dd>
                <dt className="text-[12px] text-gray-500">Section</dt>
                <dd className="text-[13px] font-mono text-gray-900">
                  {record.approvedDataRefStructured.section}
                </dd>
              </dl>
            ) : (
              <p className="text-[13px] font-mono text-gray-900">
                {record.approvedDataReference}
              </p>
            )}
          </div>

          {/* Signature */}
          <div>
            <p className="text-[11px] text-gray-500 uppercase tracking-wide mb-1">
              Signed By
            </p>
            <p className="text-[14px] text-gray-900 font-semibold">
              {record.signingTechnicianLegalName}
            </p>
            <p className="text-[13px] font-mono text-gray-600">
              {record.signingTechnicianCertNumber}
            </p>
            <p className="text-[12px] font-mono text-gray-500 mt-0.5">
              {formatDateUtc(record.signatureTimestamp)}
            </p>
          </div>

          {/* Metadata counts */}
          <div className="flex gap-4 text-[12px] text-gray-500">
            {record.partsCount > 0 && (
              <span>{record.partsCount} part(s) referenced</span>
            )}
            {record.testEquipmentCount > 0 && (
              <span>{record.testEquipmentCount} test equip. ref(s)</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/** All maintenance records */
function MaintenanceRecordsSection({
  records,
}: {
  records: MaintenanceRecordSummary[];
}) {
  return (
    <ReviewSection
      title={`Maintenance Records (${records.length})`}
      className="overflow-hidden"
    >
      {records.length === 0 ? (
        <p className="text-[14px] text-gray-500 italic">
          No maintenance records on this work order.
        </p>
      ) : (
        <div className="-mx-4 -my-4">
          {records.map((r) => (
            <MaintenanceRecordRow key={r.id} record={r} />
          ))}
        </div>
      )}
    </ReviewSection>
  );
}

/** Task card sign-offs */
function TaskCardSignOffsSection({
  taskCards,
}: {
  taskCards: TaskCardSignOffSummary[];
}) {
  return (
    <ReviewSection
      title={`Task Card Sign-Offs (${taskCards.length} cards)`}
      className="overflow-hidden"
    >
      {taskCards.length === 0 ? (
        <p className="text-[14px] text-gray-500 italic">
          No task cards on this work order.
        </p>
      ) : (
        <div className="space-y-4">
          {taskCards.map((tc) => (
            <TaskCardBlock key={tc.taskCardId} taskCard={tc} />
          ))}
        </div>
      )}
    </ReviewSection>
  );
}

function TaskCardBlock({ taskCard }: { taskCard: TaskCardSignOffSummary }) {
  const allComplete = taskCard.completedStepCount === taskCard.stepCount;

  return (
    <div className="rounded-[4px] border border-gray-200">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 bg-gray-50 rounded-t-[4px] border-b border-gray-200">
        <div>
          <span className="text-[12px] font-mono text-gray-500">
            {taskCard.taskCardNumber}
          </span>
          <p className="text-[14px] font-semibold text-gray-900">
            {taskCard.taskCardTitle}
          </p>
        </div>
        <span
          className={cn(
            "text-[12px] font-semibold px-2 py-1 rounded-[3px]",
            allComplete
              ? "bg-green-100 text-green-700"
              : "bg-amber-100 text-amber-700",
          )}
        >
          {taskCard.completedStepCount}/{taskCard.stepCount} steps
        </span>
      </div>

      {/* Steps */}
      <div className="divide-y divide-gray-100">
        {taskCard.steps.map((step) => (
          <div key={step.stepId} className="px-3 py-2 flex items-start gap-3">
            <span
              aria-hidden
              className={cn(
                "mt-0.5 shrink-0 font-bold text-[14px] leading-tight",
                step.status === "completed"
                  ? "text-green-600"
                  : step.status === "na"
                    ? "text-gray-400"
                    : "text-amber-500",
              )}
            >
              {step.status === "completed"
                ? "✓"
                : step.status === "na"
                  ? "—"
                  : "○"}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] text-gray-700">
                <span className="font-mono text-gray-400 mr-1">
                  {step.stepNumber}.
                </span>
                {step.description}
                {step.requiresIa && (
                  <span className="ml-1.5 text-[11px] font-semibold text-red-600 uppercase">
                    IA
                  </span>
                )}
              </p>
              {step.signedByName && (
                <p className="text-[11px] text-gray-500 mt-0.5">
                  {step.signedByName}
                  {step.signedCertNumber && (
                    <span className="font-mono ml-1">{step.signedCertNumber}</span>
                  )}
                  {step.signedAt && (
                    <span className="ml-1">{formatDateUtc(step.signedAt)}</span>
                  )}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Immutable submitted review view
// ---------------------------------------------------------------------------

function SubmittedReviewView({
  review,
}: {
  review: ExistingQcmReview;
}) {
  return (
    <div className="space-y-4">
      <div
        role="note"
        aria-label="QCM Review submitted — this record is immutable"
        className={cn(
          "rounded-[6px] border px-4 py-4",
          OUTCOME_COLORS[review.outcome],
        )}
      >
        <div className="flex items-center gap-2 mb-2">
          <span
            aria-hidden
            className="font-bold text-[18px] leading-none"
          >
            {review.outcome === "accepted"
              ? "✓"
              : review.outcome === "findings_noted"
                ? "⚠"
                : "✕"}
          </span>
          <span className="text-[14px] font-bold uppercase tracking-[0.04em]">
            QCM Review — {OUTCOME_LABELS[review.outcome].split("—")[0].trim()}
          </span>
        </div>
        <p className="text-[14px]">{OUTCOME_LABELS[review.outcome]}</p>
      </div>

      {review.findingsNotes && (
        <div className="rounded-[6px] border border-gray-200 bg-white px-4 py-3">
          <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
            Findings
          </p>
          <p className="text-[14px] text-gray-900 whitespace-pre-wrap">
            {review.findingsNotes}
          </p>
        </div>
      )}

      <SignedBlock
        signedBy={review.reviewerLegalName}
        certNumber={review.reviewerCertificateNumber}
        signedAt={review.reviewTimestamp}
        signatureId={review.id}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Review form — QCM only
// ---------------------------------------------------------------------------

interface ReviewFormProps {
  workOrderId: Id<"workOrders">;
  currentTechnicianId: Id<"technicians">;
  onSubmitted: () => void;
}

function QcmReviewForm({
  workOrderId,
  currentTechnicianId,
  onSubmitted,
}: ReviewFormProps) {
  const [outcome, setOutcome] = useState<
    "accepted" | "findings_noted" | "requires_amendment" | ""
  >("");
  const [findingsNotes, setFindingsNotes] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showSignOff, setShowSignOff] = useState(false);

  const outcomeSelectId = useId();
  const findingsId = useId();

  // TODO: Replace with real mutation when Convex is deployed:
  // const createQcmReview = useMutation(api.qcmReviews.createQcmReview);
  const createQcmReviewStub = async (_args: {
    workOrderId: Id<"workOrders">;
    technicianId: Id<"technicians">;
    outcome: string;
    findingsNotes: string | null;
    signatureAuthEventId: string;
  }) => {
    // stub — will throw if real call fails
    await new Promise((r) => setTimeout(r, 400));
    return { id: "qcm-review-stub" };
  };

  const requiresFindings =
    outcome === "findings_noted" || outcome === "requires_amendment";
  const findingsMissing = requiresFindings && findingsNotes.trim().length === 0;
  const canProceed =
    outcome !== "" && !findingsMissing && !submitting && !showSignOff;

  const handlePreviewSubmit = useCallback(() => {
    setSubmitError(null);
    setShowSignOff(true);
  }, []);

  const handleSignOffSubmit = useCallback(
    async (signatureAuthEventId: string) => {
      setSubmitting(true);
      try {
        await createQcmReviewStub({
          workOrderId,
          technicianId: currentTechnicianId,
          outcome: outcome as "accepted" | "findings_noted" | "requires_amendment",
          findingsNotes: findingsNotes.trim() || null,
          signatureAuthEventId,
        });
        onSubmitted();
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Submission failed. Try again.";
        setSubmitError(msg);
        setSubmitting(false);
        throw err; // let SignOffFlow handle error phase
      }
    },
    [
      workOrderId,
      currentTechnicianId,
      outcome,
      findingsNotes,
      onSubmitted,
      createQcmReviewStub,
    ],
  );

  if (showSignOff) {
    // TODO: Swap for real SignOffFlow integration. For now, placeholder showing
    // the sign-off will happen here connected to the mutation above.
    return (
      <div className="rounded-[6px] border border-gray-200 bg-white p-4">
        <p className="text-[13px] text-gray-500 mb-3">
          Confirm and sign the QCM review below.
        </p>
        <div className="rounded-[6px] bg-gray-50 border border-gray-200 px-4 py-3 mb-4">
          <p className="text-[12px] text-gray-500 uppercase tracking-wide mb-1">
            Review Outcome
          </p>
          <p className="text-[14px] font-semibold text-gray-900">
            {OUTCOME_LABELS[outcome as keyof typeof OUTCOME_LABELS]}
          </p>
          {findingsNotes.trim() && (
            <>
              <p className="text-[12px] text-gray-500 uppercase tracking-wide mt-2 mb-1">
                Findings
              </p>
              <p className="text-[13px] text-gray-900">{findingsNotes}</p>
            </>
          )}
        </div>
        {submitError && (
          <div
            role="alert"
            className="mb-3 rounded-[4px] border border-red-300 bg-red-50 px-3 py-2"
          >
            <p className="text-[13px] text-red-700">{submitError}</p>
          </div>
        )}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setShowSignOff(false)}
            disabled={submitting}
            className={cn(
              "flex-1 h-16 rounded-[6px] border border-gray-300 bg-white",
              "text-[15px] font-medium text-gray-700",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
              "disabled:opacity-50 disabled:cursor-not-allowed",
            )}
          >
            Back
          </button>
          <button
            type="button"
            onClick={() =>
              handleSignOffSubmit("stub-auth-event-" + Date.now())
            }
            disabled={submitting}
            className={cn(
              "flex-[2] h-16 rounded-[6px] bg-blue-600 text-white",
              "text-[15px] font-bold uppercase tracking-[0.04em]",
              "hover:bg-blue-700 active:bg-blue-800",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
              "disabled:opacity-50 disabled:cursor-not-allowed",
            )}
          >
            {submitting ? "Submitting…" : "Sign & Submit QCM Review"}
          </button>
        </div>
        <p className="text-[11px] text-gray-400 mt-3 text-center">
          In production: SignOffFlow PIN ceremony will be used here.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-[6px] border border-gray-200 bg-white p-4 space-y-5">
      {/* Outcome selector */}
      <div>
        <label
          htmlFor={outcomeSelectId}
          className="block text-[13px] font-semibold text-gray-700 mb-1.5"
        >
          Review Outcome{" "}
          <span className="text-red-600" aria-hidden>
            *
          </span>
        </label>
        <select
          id={outcomeSelectId}
          value={outcome}
          onChange={(e) =>
            setOutcome(
              e.target.value as typeof outcome,
            )
          }
          required
          className={cn(
            "w-full h-16 px-3 rounded-[6px] border text-[15px] text-gray-900",
            "border-gray-300 bg-white",
            "focus:outline-none focus:ring-2 focus:ring-blue-500",
            outcome === "" ? "text-gray-400" : "text-gray-900",
          )}
          aria-required="true"
        >
          <option value="" disabled>
            Select review outcome…
          </option>
          <option value="accepted">Accepted — All records compliant</option>
          <option value="findings_noted">
            Findings Noted — Minor findings, work order acceptable
          </option>
          <option value="requires_amendment">
            Requires Amendment — Records must be corrected
          </option>
        </select>
      </div>

      {/* Findings notes — required unless outcome == accepted */}
      <div>
        <label
          htmlFor={findingsId}
          className={cn(
            "block text-[13px] font-semibold text-gray-700 mb-1.5",
            requiresFindings ? "text-gray-900" : "text-gray-500",
          )}
        >
          Findings{" "}
          {requiresFindings && (
            <span className="text-red-600" aria-hidden>
              *
            </span>
          )}
          {!requiresFindings && (
            <span className="text-[12px] font-normal text-gray-400">
              (optional when outcome is Accepted)
            </span>
          )}
        </label>
        <textarea
          id={findingsId}
          value={findingsNotes}
          onChange={(e) => setFindingsNotes(e.target.value)}
          placeholder={
            requiresFindings
              ? "Describe the findings in detail. Required when outcome is not Accepted (INV-26)."
              : "Optional notes for this review."
          }
          required={requiresFindings}
          aria-required={requiresFindings}
          rows={5}
          className={cn(
            "w-full px-3 py-3 rounded-[6px] border text-[15px] text-gray-900",
            "border-gray-300 bg-white",
            "focus:outline-none focus:ring-2 focus:ring-blue-500",
            "resize-y min-h-[100px]",
            findingsMissing
              ? "border-red-400 focus:ring-red-500"
              : "border-gray-300",
          )}
        />
        {findingsMissing && (
          <p className="text-[12px] text-red-600 mt-1" role="alert">
            Findings are required when outcome is not Accepted (14 CFR Part 145
            RSM requirement — INV-26).
          </p>
        )}
      </div>

      {/* Submit error */}
      {submitError && (
        <div
          role="alert"
          className="rounded-[4px] border border-red-300 bg-red-50 px-3 py-2"
        >
          <p className="text-[13px] text-red-700">{submitError}</p>
        </div>
      )}

      {/* Submit button */}
      <button
        type="button"
        onClick={handlePreviewSubmit}
        disabled={!canProceed}
        aria-disabled={!canProceed}
        className={cn(
          "w-full h-16 rounded-[6px]",
          "text-[16px] font-bold uppercase tracking-[0.04em]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
          "transition-colors duration-100",
          canProceed
            ? "bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800"
            : "bg-gray-200 text-gray-400 cursor-not-allowed",
        )}
      >
        Review & Sign QCM Review
      </button>

      <p className="text-[12px] text-gray-400 text-center">
        Submitting this review is a signed compliance action. It is immutable
        once submitted.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

/**
 * QcmReviewPanel
 *
 * Full-page panel for QCM review of a closed work order.
 * Shows all linked records; provides review form for QCM role.
 * Immutable once submitted.
 */
export function QcmReviewPanel({
  workOrder,
  maintenanceRecords,
  taskCards,
  existingReview,
  currentTechnicianId,
  onReviewSubmitted,
}: QcmReviewPanelProps) {
  const { role, isLoaded } = useOrgRole();
  const isQcm = role === "inspector"; // "inspector" = QC Inspector in Athelon role map
  const canReview = isQcm || role === "dom"; // DOM can also review
  const canSubmitReview = isLoaded && isQcm && currentTechnicianId !== null;

  // Skeleton while role is loading
  if (!isLoaded) {
    return (
      <div className="space-y-4 animate-pulse">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 rounded-[6px] bg-gray-200" />
        ))}
      </div>
    );
  }

  // Role gate — non-authorized roles see nothing useful
  if (!canReview) {
    return (
      <div
        role="alert"
        className="rounded-[6px] border border-gray-200 bg-gray-50 px-4 py-6 text-center"
      >
        <p className="text-[15px] font-semibold text-gray-700">
          QCM Review — Restricted
        </p>
        <p className="text-[13px] text-gray-500 mt-1">
          Only QC Inspectors and Directors of Maintenance can view this page.
        </p>
      </div>
    );
  }

  // WO must be closed to review (INV-24)
  const woNotClosed = workOrder.status !== "closed";

  return (
    <div className="space-y-5">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-[20px] font-bold text-gray-900">
            QCM Review
          </h2>
          <p className="text-[13px] text-gray-500 mt-0.5">
            {workOrder.workOrderNumber} · {workOrder.aircraftRegistration}
          </p>
        </div>
        {existingReview && (
          <span className="px-2.5 py-1 rounded-[4px] bg-green-100 text-green-700 text-[12px] font-semibold uppercase tracking-wide">
            ✓ Reviewed
          </span>
        )}
      </div>

      {/* WO not closed warning */}
      {woNotClosed && !existingReview && (
        <div
          role="alert"
          className="rounded-[6px] border border-amber-300 bg-amber-50 px-4 py-3"
        >
          <p className="text-[14px] font-semibold text-amber-800">
            Work Order Not Closed
          </p>
          <p className="text-[13px] text-amber-700 mt-0.5">
            QCM review requires the work order to be closed (status: "
            {workOrder.status}"). Close the work order before submitting a QCM
            review.
          </p>
        </div>
      )}

      {/* Work order summary */}
      <WorkOrderSummaryBlock wo={workOrder} />

      {/* Maintenance records */}
      <MaintenanceRecordsSection records={maintenanceRecords} />

      {/* Task card sign-offs */}
      <TaskCardSignOffsSection taskCards={taskCards} />

      {/* Review — submitted or form */}
      <ReviewSection
        title={existingReview ? "QCM Review — Submitted" : "QCM Review"}
      >
        {existingReview ? (
          <SubmittedReviewView review={existingReview} />
        ) : !canSubmitReview ? (
          <p className="text-[14px] text-gray-500 italic">
            {isQcm
              ? "Your technician record is not configured. Contact your administrator."
              : "Only the QC Inspector can submit a QCM review."}
          </p>
        ) : woNotClosed ? (
          <p className="text-[14px] text-gray-500 italic">
            QCM review is only available after the work order is closed.
          </p>
        ) : (
          <QcmReviewForm
            workOrderId={workOrder.id}
            currentTechnicianId={currentTechnicianId!}
            onSubmitted={() => onReviewSubmitted?.()}
          />
        )}
      </ReviewSection>
    </div>
  );
}

export default QcmReviewPanel;
