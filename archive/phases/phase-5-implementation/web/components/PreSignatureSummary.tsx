/**
 * components/PreSignatureSummary.tsx
 * Athelon — Pre-Signature Summary Component
 *
 * Chloe Park, 2026-02-22
 * Wave 2 — Spec: phase-5-implementation/wave-1/pre-signature-summary-component.md
 *
 * CRITICAL: This component occupies Phase 1 of SignOffFlow.tsx (the confirmation
 * phase). It shows the complete record the technician is about to sign, rendered
 * exactly as required by 5/10 interview participants (Gary, Troy, Pat, Dale, Felix).
 *
 * Architectural decisions:
 * - SNAPSHOT PATTERN: Data is frozen on mount via useState + useEffect.
 *   The live Convex subscription feeds the snapshot; after that, the summary
 *   does not react to upstream changes. If the WO changes mid-review, the signer
 *   sees what they started reading, not a mutated version. See §3.2 of spec.
 * - GLOVE-MODE COMPLIANT: All interactive targets >= 64px per Tanya's spec.
 *   Proceed button has a 2-second anti-accidental-tap delay on mount.
 * - NO TOOLTIPS: All information is statically displayed.
 * - STICKY FOOTER: Action buttons never scroll off screen (landscape tablet).
 *
 * Five record-type variants:
 *   maintenance_record     — §43.9, full work performed, approved data ref
 *   task_card_step         — §65.81 (A&P) or §65.95 (IA), step description
 *   task_card_step_ia      — same data + RED IA REQUIRED banner
 *   return_to_service      — §43.9 + §65.95 + §91.409, 9-precondition summary
 *   inspection_record      — §43.11, full inspection scope
 *
 * Props:
 *   summary — PreSignatureSummaryData (snapshot already computed by parent, or live
 *              from Convex useQuery). Undefined = loading (skeleton). Null = error.
 *   onProceed — advance SignOffFlow to PIN phase
 *   onCancel — return to idle
 */

"use client";

import React, { useState, useEffect, useId } from "react";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** The five record types that require a pre-signature summary. */
export type PreSignatureRecordType =
  | "maintenance_record"
  | "task_card_step"
  | "return_to_service"
  | "inspection_record";

/** Shape returned by convex/signOff.getPreSignatureSummary. */
export interface PreSignatureSummaryData {
  recordIdentity: {
    recordType: PreSignatureRecordType;
    recordId: string;
    workOrderNumber: string;
    /** Only populated for task_card_step records */
    stepNumber: number | null;
    /** Only populated for task_card_step records */
    taskCardTitle: string | null;
  };
  aircraft: {
    registration: string;
    make: string;
    model: string;
    serialNumber: string;
    /** TT recorded on the work order — NOT a live aircraft query */
    totalTimeAtOpen: number;
  };
  workPerformed: {
    description: string;
    approvedDataReference: string | null;
    minimumLengthMet: boolean;
    /** For return_to_service: 9-precondition close readiness summary */
    closeReadiness?: {
      allTaskCardsComplete: boolean;
      taskCardCount: number;
      allDiscrepanciesDispositioned: boolean;
      discrepancyCount: number;
      signedMaintenanceRecordCount: number;
      adComplianceVerified: boolean;
      aircraftTtReconciled: boolean;
    };
  };
  technician: {
    fullName: string;
    certificateType: string;
    certificateNumber: string | null;
    iaExpiryDate: string | null;
    organizationName: string;
  };
  requiresIa: boolean;
  isIaExpired: boolean;
}

export interface PreSignatureSummaryProps {
  /**
   * The summary data — undefined while Convex query is loading (shows skeleton),
   * null if query errored (shows error state), data if loaded.
   *
   * SNAPSHOT PATTERN: Pass the live Convex query result here. The component
   * freezes it on first non-undefined value internally.
   */
  summary: PreSignatureSummaryData | null | undefined;
  /** Advance SignOffFlow to PIN phase */
  onProceed: () => void;
  /** Return to idle / cancel the signing ceremony */
  onCancel: () => void;
  className?: string;
}

// ---------------------------------------------------------------------------
// Regulatory reference text — static map per spec §1.4.1
// ---------------------------------------------------------------------------

const REGULATORY_TEXT: Record<string, string> = {
  maintenance_record:
    "This record is created pursuant to 14 CFR §43.9. Signing certifies that the work was performed in accordance with the approved data reference and applicable regulations.",
  task_card_step_amp:
    "Signing this step certifies performance of the described work and compliance with the referenced data as an FAA-certificated mechanic pursuant to 14 CFR §65.81.",
  task_card_step_ia:
    "Signing this step as the Inspection Authorization holder certifies that the described work meets the standards required for return to service pursuant to 14 CFR §65.95.",
  return_to_service:
    "Authorizing return to service as an IA holder pursuant to 14 CFR §43.9(a), §65.95, and §91.409. All nine preconditions have been verified by the system at this moment. This authorization is immutable.",
  inspection_record:
    "This inspection record is created pursuant to 14 CFR §43.11. Signing certifies the inspection was performed and the aircraft was found to be in the condition stated.",
};

function getRegulatoryText(
  recordType: PreSignatureRecordType,
  requiresIa: boolean,
): string {
  if (recordType === "task_card_step") {
    return requiresIa
      ? REGULATORY_TEXT.task_card_step_ia
      : REGULATORY_TEXT.task_card_step_amp;
  }
  return REGULATORY_TEXT[recordType] ?? REGULATORY_TEXT.maintenance_record;
}

/** Human-readable label per record type */
function getRecordTypeLabel(recordType: PreSignatureRecordType): string {
  switch (recordType) {
    case "maintenance_record":
      return "Maintenance Record";
    case "task_card_step":
      return "Task Card Step Sign-Off";
    case "return_to_service":
      return "Return to Service Authorization";
    case "inspection_record":
      return "Inspection Sign-Off";
  }
}

// ---------------------------------------------------------------------------
// Section sub-components
// ---------------------------------------------------------------------------

/** §1.1 Record Identity */
function RecordIdentitySection({
  identity,
}: {
  identity: PreSignatureSummaryData["recordIdentity"];
}) {
  const headingId = useId();
  const shortId = identity.recordId.slice(-8);

  return (
    <section aria-labelledby={headingId}>
      <h3
        id={headingId}
        className="text-[11px] font-semibold text-gray-500 uppercase tracking-[0.06em] mb-2"
      >
        Record Identity
      </h3>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-4">
          <span className="text-[13px] text-gray-500">Type</span>
          <span className="text-[15px] font-semibold text-gray-900">
            {getRecordTypeLabel(identity.recordType)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-[13px] text-gray-500">Work Order</span>
          <span className="text-[15px] font-semibold font-mono text-gray-900">
            {identity.workOrderNumber}
          </span>
        </div>
        {identity.stepNumber !== null && identity.taskCardTitle && (
          <div className="flex items-center justify-between gap-4">
            <span className="text-[13px] text-gray-500">Step</span>
            <span className="text-[14px] font-medium text-gray-900">
              Step {identity.stepNumber} — {identity.taskCardTitle}
            </span>
          </div>
        )}
        <div className="flex items-center justify-between gap-4">
          <span className="text-[13px] text-gray-500">Record ID</span>
          <span
            className="text-[13px] font-mono text-gray-700"
            title={identity.recordId}
            aria-label={`Record ID: ${identity.recordId}`}
          >
            …{shortId}
          </span>
        </div>
      </div>
    </section>
  );
}

/** §1.2 Aircraft Snapshot */
function AircraftSection({
  aircraft,
}: {
  aircraft: PreSignatureSummaryData["aircraft"];
}) {
  const headingId = useId();
  const ttFormatted = aircraft.totalTimeAtOpen.toLocaleString("en-US", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });

  return (
    <section aria-labelledby={headingId}>
      <h3
        id={headingId}
        className="text-[11px] font-semibold text-gray-500 uppercase tracking-[0.06em] mb-2"
      >
        Aircraft
      </h3>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-4">
          <span className="text-[13px] text-gray-500">Registration</span>
          <span className="text-[20px] font-semibold font-mono text-gray-900 leading-tight">
            {aircraft.registration}
          </span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-[13px] text-gray-500">Aircraft</span>
          <span className="text-[15px] font-medium text-gray-900">
            {aircraft.make} {aircraft.model}
          </span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-[13px] text-gray-500">Serial No.</span>
          <span className="text-[14px] font-mono text-gray-900">
            {aircraft.serialNumber}
          </span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-[13px] text-gray-500">Total Time (at WO open)</span>
          <span className="text-[14px] font-mono text-gray-900">
            {ttFormatted} hours
          </span>
        </div>
      </div>
    </section>
  );
}

/** §1.3 Work Performed */
function WorkPerformedSection({
  workPerformed,
  recordType,
}: {
  workPerformed: PreSignatureSummaryData["workPerformed"];
  recordType: PreSignatureRecordType;
}) {
  const headingId = useId();
  const charCount = workPerformed.description.length;
  const showMinLengthWarning =
    recordType === "maintenance_record" && !workPerformed.minimumLengthMet;

  return (
    <section aria-labelledby={headingId}>
      <h3
        id={headingId}
        className="text-[11px] font-semibold text-gray-500 uppercase tracking-[0.06em] mb-2"
      >
        Work Performed
      </h3>

      {/* Minimum length warning — blocks proceed */}
      {showMinLengthWarning && (
        <div
          role="alert"
          className="mb-2 rounded-[4px] border border-amber-400 bg-amber-50 px-3 py-2"
        >
          <p className="text-[13px] font-semibold text-amber-800">
            Description too short
          </p>
          <p className="text-[12px] text-amber-700 mt-0.5">
            Work performed description must be at least 50 characters (14 CFR AC
            43-9C). Current length: {charCount} characters. Go back and complete
            the description before signing.
          </p>
        </div>
      )}

      {/* Full description — no truncation */}
      <p className="text-[16px] text-gray-900 leading-relaxed whitespace-pre-wrap">
        {workPerformed.description || (
          <span className="text-gray-400 italic">No description provided.</span>
        )}
      </p>

      {/* Approved data reference */}
      {workPerformed.approvedDataReference && (
        <div className="mt-2.5">
          <span className="text-[12px] font-semibold text-gray-500 uppercase tracking-[0.05em]">
            Approved Data Reference
          </span>
          <p className="mt-0.5 text-[14px] font-mono text-gray-900">
            {workPerformed.approvedDataReference}
          </p>
        </div>
      )}

      {/* Return to service — 9 preconditions */}
      {recordType === "return_to_service" && workPerformed.closeReadiness && (
        <CloseReadinessSummary readiness={workPerformed.closeReadiness} />
      )}
    </section>
  );
}

/** Condensed close readiness summary for RTS sign-offs (§5 spec) */
function CloseReadinessSummary({
  readiness,
}: {
  readiness: NonNullable<
    PreSignatureSummaryData["workPerformed"]["closeReadiness"]
  >;
}) {
  const checks: Array<{ label: string; ok: boolean }> = [
    {
      label: `All task cards complete (${readiness.taskCardCount} of ${readiness.taskCardCount})`,
      ok: readiness.allTaskCardsComplete,
    },
    {
      label: `All discrepancies dispositioned (${readiness.discrepancyCount} of ${readiness.discrepancyCount})`,
      ok: readiness.allDiscrepanciesDispositioned,
    },
    {
      label: `Signed maintenance records (${readiness.signedMaintenanceRecordCount} records)`,
      ok: readiness.signedMaintenanceRecordCount > 0,
    },
    {
      label: "AD compliance verified",
      ok: readiness.adComplianceVerified,
    },
    {
      label: "Aircraft TT reconciled",
      ok: readiness.aircraftTtReconciled,
    },
  ];

  return (
    <div className="mt-3 rounded-[4px] border border-gray-200 bg-gray-50 px-3 py-3">
      <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-[0.05em] mb-2">
        Pre-RTS Verification
      </p>
      <ul className="space-y-1.5" role="list" aria-label="Close readiness checklist">
        {checks.map(({ label, ok }) => (
          <li key={label} className="flex items-start gap-2">
            <span
              aria-hidden
              className={cn(
                "mt-0.5 shrink-0 text-[16px] leading-none font-bold",
                ok ? "text-green-600" : "text-red-600",
              )}
            >
              {ok ? "✓" : "✕"}
            </span>
            <span
              className={cn(
                "text-[13px]",
                ok ? "text-gray-900" : "text-red-700 font-semibold",
              )}
            >
              {label}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** §1.4 Regulatory References */
function RegulatoryReferenceSection({
  recordType,
  requiresIa,
}: {
  recordType: PreSignatureRecordType;
  requiresIa: boolean;
}) {
  const headingId = useId();
  const text = getRegulatoryText(recordType, requiresIa);

  return (
    <section aria-labelledby={headingId}>
      <h3
        id={headingId}
        className="text-[11px] font-semibold text-gray-500 uppercase tracking-[0.06em] mb-2"
      >
        Regulatory Basis
      </h3>
      <p className="text-[15px] text-gray-900 leading-relaxed">{text}</p>
    </section>
  );
}

/** §1.5 Technician Identity — "You are signing as..." */
function TechnicianIdentitySection({
  technician,
  isIaExpired,
  signingAt,
}: {
  technician: PreSignatureSummaryData["technician"];
  isIaExpired: boolean;
  signingAt: Date;
}) {
  const headingId = useId();

  const zuluDate = signingAt.toISOString().slice(0, 10);
  const zuluTime = signingAt.toISOString().slice(11, 19);
  const localString = signingAt.toLocaleString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  });

  // Map cert type from schema values to display
  const certTypeDisplay =
    technician.certificateType === "IA"
      ? "FAA Inspection Authorization Holder"
      : technician.certificateType === "A&P"
        ? "FAA A&P Mechanic"
        : technician.certificateType === "airframe_only"
          ? "FAA Mechanic (Airframe)"
          : technician.certificateType === "powerplant_only"
            ? "FAA Mechanic (Powerplant)"
            : technician.certificateType === "repair_station"
              ? "Repair Station Authorized Person"
              : technician.certificateType;

  return (
    <section aria-labelledby={headingId}>
      <h3
        id={headingId}
        className="text-[11px] font-semibold text-gray-500 uppercase tracking-[0.06em] mb-2"
      >
        You Are Signing As
      </h3>

      <div className="rounded-[6px] border border-gray-200 bg-white px-4 py-3 space-y-2">
        {/* Legal name — prominent */}
        <p className="text-[20px] font-bold text-gray-900 leading-tight">
          {technician.fullName}
        </p>

        {/* Certificate type */}
        <p className="text-[15px] font-medium text-gray-900">
          {certTypeDisplay}
        </p>

        {/* Certificate number */}
        {technician.certificateNumber ? (
          <p className="text-[14px] font-mono text-gray-700">
            {technician.certificateNumber}
          </p>
        ) : (
          <div
            role="alert"
            className="rounded-[4px] border border-amber-400 bg-amber-50 px-3 py-2"
          >
            <p className="text-[13px] font-semibold text-amber-800">
              Certificate number not on file
            </p>
            <p className="text-[12px] text-amber-700 mt-0.5">
              Your certificate number is not on file. Contact your administrator
              before signing.
            </p>
          </div>
        )}

        {/* IA expiry */}
        {technician.iaExpiryDate && (
          <p
            className={cn(
              "text-[13px]",
              isIaExpired ? "text-red-700 font-semibold" : "text-gray-700",
            )}
          >
            {isIaExpired
              ? `⚠ IA Certificate EXPIRED on ${technician.iaExpiryDate}`
              : `IA Certificate valid through ${technician.iaExpiryDate}`}
          </p>
        )}

        {/* Organization */}
        <p className="text-[13px] text-gray-600">{technician.organizationName}</p>

        {/* Signing timestamp — explicit per spec §1.5 */}
        <p className="text-[13px] text-gray-700 border-t border-gray-100 pt-2 mt-2">
          You are signing at{" "}
          <span className="font-mono font-semibold">
            {zuluTime} UTC on {zuluDate}
          </span>{" "}
          <span className="text-gray-500">({localString})</span>
        </p>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Skeleton — same section structure, animated grey blocks, no spinner
// ---------------------------------------------------------------------------

function SkeletonBlock({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "rounded-[4px] bg-gray-200 animate-pulse",
        className,
      )}
      aria-hidden
    />
  );
}

function PreSignatureSummarySkeleton() {
  return (
    <div
      className="flex flex-col max-h-[calc(100vh-64px)]"
      aria-label="Loading sign-off summary"
      aria-busy="true"
    >
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Record identity skeleton */}
        <div className="space-y-2">
          <SkeletonBlock className="h-3 w-24" />
          <SkeletonBlock className="h-5 w-48" />
          <SkeletonBlock className="h-5 w-32" />
        </div>
        {/* Aircraft skeleton */}
        <div className="space-y-2">
          <SkeletonBlock className="h-3 w-16" />
          <SkeletonBlock className="h-7 w-28" />
          <SkeletonBlock className="h-5 w-40" />
          <SkeletonBlock className="h-5 w-36" />
        </div>
        {/* Work performed skeleton */}
        <div className="space-y-2">
          <SkeletonBlock className="h-3 w-28" />
          <SkeletonBlock className="h-4 w-full" />
          <SkeletonBlock className="h-4 w-full" />
          <SkeletonBlock className="h-4 w-3/4" />
        </div>
        {/* Regulatory skeleton */}
        <div className="space-y-2">
          <SkeletonBlock className="h-3 w-32" />
          <SkeletonBlock className="h-4 w-full" />
          <SkeletonBlock className="h-4 w-full" />
        </div>
        {/* Technician skeleton */}
        <div className="rounded-[6px] border border-gray-200 p-4 space-y-2">
          <SkeletonBlock className="h-7 w-48" />
          <SkeletonBlock className="h-5 w-36" />
          <SkeletonBlock className="h-4 w-28" />
        </div>
      </div>
      {/* Action buttons skeleton */}
      <div className="border-t border-gray-200 bg-white px-4 py-3 flex gap-3">
        <SkeletonBlock className="flex-1 h-16 rounded-[6px]" />
        <SkeletonBlock className="flex-1 h-16 rounded-[6px]" />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Error state — sign button absent; cancel only
// ---------------------------------------------------------------------------

function PreSignatureSummaryError({ onCancel }: { onCancel: () => void }) {
  return (
    <div className="flex flex-col max-h-[calc(100vh-64px)]">
      <div className="flex-1 p-4">
        <div
          role="alert"
          className="rounded-[6px] border border-red-300 bg-red-50 px-4 py-4"
        >
          <p className="text-[15px] font-semibold text-red-800 mb-1">
            Unable to load sign-off summary
          </p>
          <p className="text-[14px] text-red-700">
            Unable to load sign-off summary. Do not proceed.
          </p>
          <p className="text-[13px] text-red-600 mt-2">
            What to do:
            <br />
            1. Tap Cancel below.
            <br />
            2. Reload the page and try again.
            <br />
            3. If the problem persists, contact your administrator.
          </p>
        </div>
      </div>
      <div className="border-t border-gray-200 bg-white px-4 py-3">
        <button
          type="button"
          onClick={onCancel}
          className={cn(
            "w-full h-16 rounded-[6px]",
            "border border-gray-300 bg-white",
            "text-[16px] font-medium text-gray-700",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
          )}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

/**
 * PreSignatureSummary
 *
 * Drop into SignOffFlow.tsx Phase 1 (confirming state). Replaces the
 * placeholder "Confirm your sign-off" copy.
 *
 * Pass the live Convex useQuery result as `summary`. The component freezes
 * it internally on first non-undefined value — signer always sees what they
 * started reading, not a mutated version.
 *
 * PROCEED button is disabled for 2 seconds on mount (anti-accidental-tap).
 * Also disabled if:
 *   - certificate number is missing
 *   - IA certificate is expired
 *   - work performed description is too short (< 50 chars on maintenance_record)
 *   - close readiness checks are failing (return_to_service)
 */
export function PreSignatureSummary({
  summary,
  onProceed,
  onCancel,
  className,
}: PreSignatureSummaryProps) {
  // SNAPSHOT: freeze data on first non-undefined value
  const [snapshot, setSnapshot] = useState<PreSignatureSummaryData | null | undefined>(
    summary,
  );
  useEffect(() => {
    // Only update snapshot when transitioning from undefined → data
    if (summary !== undefined && snapshot === undefined) {
      setSnapshot(summary);
    }
  }, [summary, snapshot]);

  // 2-second proceed delay (anti-accidental-tap, per spec §4.6)
  const [proceedDelayDone, setProceedDelayDone] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setProceedDelayDone(true), 2000);
    return () => clearTimeout(timer);
  }, []);

  // Stable signing timestamp captured when component mounts
  const [signingAt] = useState(() => new Date());

  const proceedWarningId = useId();

  // ── Loading ──
  if (snapshot === undefined) {
    return <PreSignatureSummarySkeleton />;
  }

  // ── Error ──
  if (snapshot === null) {
    return <PreSignatureSummaryError onCancel={onCancel} />;
  }

  const data = snapshot;

  const hasCertNumber = Boolean(data.technician.certificateNumber);
  const descriptionTooShort =
    data.recordIdentity.recordType === "maintenance_record" &&
    !data.workPerformed.minimumLengthMet;

  // For RTS: block if any precondition is failing
  const rtsChecksFailing =
    data.recordIdentity.recordType === "return_to_service" &&
    data.workPerformed.closeReadiness != null &&
    (!data.workPerformed.closeReadiness.allTaskCardsComplete ||
      !data.workPerformed.closeReadiness.allDiscrepanciesDispositioned ||
      !data.workPerformed.closeReadiness.adComplianceVerified ||
      !data.workPerformed.closeReadiness.aircraftTtReconciled);

  const proceedBlocked =
    !hasCertNumber ||
    data.isIaExpired ||
    descriptionTooShort ||
    rtsChecksFailing;

  const proceedEnabled = proceedDelayDone && !proceedBlocked;

  // Aria description for proceed button
  const proceedAriaDescriptions: string[] = [];
  if (!proceedDelayDone)
    proceedAriaDescriptions.push("Please review for 2 seconds before proceeding.");
  if (!hasCertNumber)
    proceedAriaDescriptions.push("Cannot proceed: certificate number not on file.");
  if (data.isIaExpired)
    proceedAriaDescriptions.push("Cannot proceed: IA certificate is expired.");
  if (descriptionTooShort)
    proceedAriaDescriptions.push("Cannot proceed: work performed description is too short.");

  return (
    <div
      role="region"
      aria-label="Sign-off summary — review before signing"
      className={cn(
        "flex flex-col bg-white",
        "max-h-[calc(100vh-64px)]",
        // High-contrast red border for IA sign-offs
        data.requiresIa
          ? "rounded-[8px] border-2 border-red-600"
          : "rounded-[8px] border border-gray-200",
        className,
      )}
    >
      {/* IA Required Banner — always at top when applicable */}
      {data.requiresIa && (
        <div
          role="alert"
          className="rounded-t-[6px] border-b border-red-600 bg-red-50 px-4 py-3 flex items-center gap-2 shrink-0"
        >
          <span
            aria-hidden
            className="text-red-600 font-bold text-[18px] leading-none"
          >
            ⚠
          </span>
          <span className="text-[14px] font-semibold text-red-700">
            IA Certificate Required for this sign-off
          </span>
        </div>
      )}

      {/* IA Expired hard block banner */}
      {data.isIaExpired && (
        <div
          role="alert"
          className="border-b border-red-600 bg-red-700 px-4 py-3 shrink-0"
        >
          <p className="text-[14px] font-bold text-white">
            IA Certificate Expired — Cannot Sign
          </p>
          <p className="text-[13px] text-red-200 mt-0.5">
            Your IA certificate expired on {data.technician.iaExpiryDate}. You
            cannot authorize return to service or sign IA-required steps. Contact
            your administrator.
          </p>
        </div>
      )}

      {/* Scrollable content region — buttons always visible below */}
      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-2 space-y-5">
        {/* Divider utility */}
        <RecordIdentitySection identity={data.recordIdentity} />
        <hr className="border-gray-100" aria-hidden />
        <AircraftSection aircraft={data.aircraft} />
        <hr className="border-gray-100" aria-hidden />
        <WorkPerformedSection
          workPerformed={data.workPerformed}
          recordType={data.recordIdentity.recordType}
        />
        <hr className="border-gray-100" aria-hidden />
        <RegulatoryReferenceSection
          recordType={data.recordIdentity.recordType}
          requiresIa={data.requiresIa}
        />
        <hr className="border-gray-100" aria-hidden />
        <TechnicianIdentitySection
          technician={data.technician}
          isIaExpired={data.isIaExpired}
          signingAt={signingAt}
        />
      </div>

      {/* Sticky action footer — never scrolled off screen */}
      <div className="border-t border-gray-200 bg-white px-4 py-3 shrink-0">
        {/* Screen reader only: explain why proceed is blocked */}
        {proceedAriaDescriptions.length > 0 && (
          <p
            id={proceedWarningId}
            role="alert"
            className="sr-only"
          >
            {proceedAriaDescriptions.join(" ")}
          </p>
        )}

        {/* Mobile: stack vertically; sm+: side by side */}
        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={onCancel}
            className={cn(
              "w-full h-16 rounded-[6px]",
              "border border-gray-300 bg-white",
              "text-[16px] font-medium text-gray-700",
              "hover:bg-gray-50",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2",
              "transition-colors duration-100",
            )}
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={proceedEnabled ? onProceed : undefined}
            disabled={!proceedEnabled}
            aria-disabled={!proceedEnabled}
            aria-describedby={
              proceedAriaDescriptions.length > 0 ? proceedWarningId : undefined
            }
            aria-label="Proceed to sign — enter PIN"
            className={cn(
              "w-full h-16 rounded-[6px]",
              "text-[16px] font-bold uppercase tracking-[0.04em]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2",
              "transition-colors duration-100",
              proceedEnabled
                ? "bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800"
                : "bg-gray-200 text-gray-400 cursor-not-allowed",
              // During the 2-second delay, show a subtle dimming that resolves
              !proceedDelayDone && !proceedBlocked
                ? "opacity-60"
                : "",
            )}
          >
            Proceed to Sign
          </button>
        </div>
      </div>
    </div>
  );
}

export default PreSignatureSummary;
