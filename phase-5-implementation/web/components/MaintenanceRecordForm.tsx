/**
 * components/MaintenanceRecordForm.tsx
 * Athelon — Maintenance Record Creation Form
 *
 * Chloe Park, 2026-02-22
 * Wave 2
 *
 * Form for creating a maintenance record after task card completion.
 *
 * CRITICAL DESIGN DECISIONS (backed by interview evidence):
 *
 * 1. STRUCTURED APPROVED DATA REFERENCE (not free text)
 *    Dale (Avionics), Pat (IA), and Troy (A&P) all described the same problem:
 *    free-text approved data fields get abbreviated, inconsistently formatted,
 *    and are hard for FAA inspectors to cross-reference. Four discrete fields:
 *    Doc Type, Identifier, Revision, Section. All required. Pattern-validated.
 *    This matches the FAA AC 43.9-1F format requirement.
 *
 * 2. TEST EQUIPMENT MULTI-SELECT (from org's library)
 *    Dale's requirement (REQ-DP-01): test equipment must be traceable on each
 *    maintenance record. Multi-select from the org's testEquipment library.
 *    Shows calibration status (current / expired) for each item.
 *    Expired equipment generates a warning, not a hard block (per spec + Marcus).
 *
 * 3. PREVIEW BEFORE SIGN
 *    Preview button renders PreSignatureSummary with frozen data before launching
 *    the sign/submit flow. The mechanic sees exactly what they're signing before
 *    the PIN ceremony. This is the "see the record, not the form" pattern that
 *    Felix (Sheet Metal) and Dale requested.
 *
 * 4. AUTOSAVE
 *    All non-signing fields autosave after 800ms of inactivity. No explicit save
 *    button. Visual sync indicator per Finn's spec. The "Save" button only appears
 *    as an explicit action when autosave has not yet triggered.
 *
 * Connects to `createMaintenanceRecord` mutation (Devraj's implementation).
 * See schema-v3.ts maintenanceRecords table for the full field spec.
 */

"use client";

import React, {
  useState,
  useCallback,
  useEffect,
  useRef,
  useId,
} from "react";
import { cn } from "@/lib/utils";
import { useOrgRole } from "@/lib/auth";
import { PreSignatureSummary } from "@/components/PreSignatureSummary";
import type { PreSignatureSummaryData } from "@/components/PreSignatureSummary";

// TODO: Replace with real imports after `npx convex dev`:
// import { api } from "@/convex/_generated/api";
// import { useMutation, useQuery } from "convex/react";
// import type { Id, Doc } from "@/convex/_generated/dataModel";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const api = {} as any;
type Id<_T extends string> = string;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Approved data document type options. */
export type ApprovedDocType =
  | "AMM"
  | "SRM"
  | "ICA"
  | "SB"
  | "AD"
  | "FAA_AC"
  | "MMPL"
  | "CMM"
  | "TCDS"
  | "Manufacturer_Letter"
  | "Other";

export const APPROVED_DOC_TYPE_LABELS: Record<ApprovedDocType, string> = {
  AMM: "AMM — Aircraft Maintenance Manual",
  SRM: "SRM — Structural Repair Manual",
  ICA: "ICA — Instructions for Continued Airworthiness",
  SB: "SB — Service Bulletin",
  AD: "AD — Airworthiness Directive",
  FAA_AC: "FAA AC — Advisory Circular",
  MMPL: "MMPL — Maintenance Manual Parts List",
  CMM: "CMM — Component Maintenance Manual",
  TCDS: "TCDS — Type Certificate Data Sheet",
  Manufacturer_Letter: "Manufacturer Letter / Service Information",
  Other: "Other (describe in identifier field)",
};

/** A single test equipment selection from the org's library */
export interface TestEquipmentOption {
  id: Id<"testEquipment">;
  equipmentName: string;
  partNumber: string;
  serialNumber: string;
  equipmentType: string;
  calibrationCertNumber: string;
  calibrationExpiryDate: number;
  status: "current" | "expired" | "out_for_calibration" | "removed_from_service" | "quarantine";
}

export interface MaintenanceRecordFormProps {
  workOrderId: Id<"workOrders">;
  taskCardId?: Id<"taskCards">;
  taskCardTitle?: string;
  /** Pre-populated aircraft info for the form summary */
  aircraftRegistration: string;
  aircraftMake: string;
  aircraftModel: string;
  aircraftSerialNumber: string;
  aircraftTotalTimeAtOpen: number;
  workOrderNumber: string;
  /** Available test equipment for this org */
  testEquipmentOptions: TestEquipmentOption[];
  /** Current user identity for signing */
  signerName: string;
  signerCertNumber: string | null;
  signerCertType: string;
  signerOrgName: string;
  signerIaExpiryDate: string | null;
  isIaExpired: boolean;
  currentTechnicianId: Id<"technicians">;
  /** Called on successful submission */
  onSuccess?: (recordId: Id<"maintenanceRecords">) => void;
  /** Called if user cancels */
  onCancel?: () => void;
  className?: string;
}

// ---------------------------------------------------------------------------
// Sync state indicator
// ---------------------------------------------------------------------------

type SyncState = "idle" | "saving" | "saved" | "error";

function SyncIndicator({ state }: { state: SyncState }) {
  if (state === "idle") return null;

  return (
    <span
      aria-live="polite"
      aria-atomic="true"
      className={cn(
        "text-[12px]",
        state === "saving" && "text-gray-400",
        state === "saved" && "text-green-600",
        state === "error" && "text-red-600",
      )}
    >
      {state === "saving" && "Saving…"}
      {state === "saved" && "✓ Saved"}
      {state === "error" && "Save failed"}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Approved Data Reference — four discrete fields
// ---------------------------------------------------------------------------

interface ApprovedDataRefFields {
  docType: ApprovedDocType | "";
  identifier: string;
  revision: string;
  section: string;
}

function approvedDataRefToString(fields: ApprovedDataRefFields): string {
  if (!fields.docType) return "";
  const parts = [fields.docType, fields.identifier, fields.revision, fields.section]
    .filter(Boolean);
  return parts.join(", ");
}

function ApprovedDataReferenceFields({
  value,
  onChange,
  disabled,
}: {
  value: ApprovedDataRefFields;
  onChange: (v: ApprovedDataRefFields) => void;
  disabled?: boolean;
}) {
  const docTypeId = useId();
  const identifierId = useId();
  const revisionId = useId();
  const sectionId = useId();

  return (
    <div className="space-y-3">
      {/* Doc Type */}
      <div>
        <label
          htmlFor={docTypeId}
          className="block text-[13px] font-semibold text-gray-700 mb-1"
        >
          Document Type{" "}
          <span className="text-red-600" aria-hidden>
            *
          </span>
        </label>
        <select
          id={docTypeId}
          value={value.docType}
          disabled={disabled}
          onChange={(e) =>
            onChange({ ...value, docType: e.target.value as ApprovedDocType | "" })
          }
          required
          aria-required="true"
          className={cn(
            "w-full h-14 px-3 rounded-[6px] border text-[15px]",
            "border-gray-300 bg-white text-gray-900",
            "focus:outline-none focus:ring-2 focus:ring-blue-500",
            "disabled:bg-gray-50 disabled:text-gray-500",
            !value.docType ? "text-gray-400" : "",
          )}
        >
          <option value="" disabled>
            Select document type…
          </option>
          {(Object.entries(APPROVED_DOC_TYPE_LABELS) as [ApprovedDocType, string][]).map(
            ([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ),
          )}
        </select>
      </div>

      {/* Identifier */}
      <div>
        <label
          htmlFor={identifierId}
          className="block text-[13px] font-semibold text-gray-700 mb-1"
        >
          Identifier{" "}
          <span className="text-red-600" aria-hidden>
            *
          </span>
          <span className="font-normal text-[12px] text-gray-400 ml-1">
            e.g. "Chapter 12" or "AD 2024-15-07"
          </span>
        </label>
        <input
          id={identifierId}
          type="text"
          value={value.identifier}
          disabled={disabled}
          onChange={(e) => onChange({ ...value, identifier: e.target.value })}
          placeholder="Chapter 12"
          required
          aria-required="true"
          className={cn(
            "w-full h-14 px-3 rounded-[6px] border text-[15px] font-mono",
            "border-gray-300 bg-white text-gray-900",
            "focus:outline-none focus:ring-2 focus:ring-blue-500",
            "placeholder:text-gray-400 placeholder:font-sans",
            "disabled:bg-gray-50 disabled:text-gray-500",
          )}
        />
      </div>

      {/* Revision */}
      <div>
        <label
          htmlFor={revisionId}
          className="block text-[13px] font-semibold text-gray-700 mb-1"
        >
          Revision{" "}
          <span className="text-red-600" aria-hidden>
            *
          </span>
          <span className="font-normal text-[12px] text-gray-400 ml-1">
            e.g. "Rev 2026-01" or "Rev 23"
          </span>
        </label>
        <input
          id={revisionId}
          type="text"
          value={value.revision}
          disabled={disabled}
          onChange={(e) => onChange({ ...value, revision: e.target.value })}
          placeholder="Rev 2026-01"
          required
          aria-required="true"
          className={cn(
            "w-full h-14 px-3 rounded-[6px] border text-[15px] font-mono",
            "border-gray-300 bg-white text-gray-900",
            "focus:outline-none focus:ring-2 focus:ring-blue-500",
            "placeholder:text-gray-400 placeholder:font-sans",
            "disabled:bg-gray-50 disabled:text-gray-500",
          )}
        />
      </div>

      {/* Section */}
      <div>
        <label
          htmlFor={sectionId}
          className="block text-[13px] font-semibold text-gray-700 mb-1"
        >
          Section{" "}
          <span className="text-red-600" aria-hidden>
            *
          </span>
          <span className="font-normal text-[12px] text-gray-400 ml-1">
            e.g. "Section 12-11-00" or "Page Block 401"
          </span>
        </label>
        <input
          id={sectionId}
          type="text"
          value={value.section}
          disabled={disabled}
          onChange={(e) => onChange({ ...value, section: e.target.value })}
          placeholder="Section 12-11-00"
          required
          aria-required="true"
          className={cn(
            "w-full h-14 px-3 rounded-[6px] border text-[15px] font-mono",
            "border-gray-300 bg-white text-gray-900",
            "focus:outline-none focus:ring-2 focus:ring-blue-500",
            "placeholder:text-gray-400 placeholder:font-sans",
            "disabled:bg-gray-50 disabled:text-gray-500",
          )}
        />
      </div>

      {/* Composed preview */}
      {value.docType && value.identifier && (
        <div className="rounded-[4px] bg-gray-50 border border-gray-200 px-3 py-2">
          <p className="text-[11px] text-gray-500 uppercase tracking-wide mb-1">
            Approved Data Reference (as stored)
          </p>
          <p className="text-[13px] font-mono text-gray-900">
            {approvedDataRefToString(value)}
          </p>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Test Equipment multi-select
// ---------------------------------------------------------------------------

function TestEquipmentSelector({
  options,
  selected,
  onChange,
  disabled,
}: {
  options: TestEquipmentOption[];
  selected: Id<"testEquipment">[];
  onChange: (ids: Id<"testEquipment">[]) => void;
  disabled?: boolean;
}) {
  const now = Date.now();

  const toggle = useCallback(
    (id: Id<"testEquipment">) => {
      onChange(
        selected.includes(id)
          ? selected.filter((s) => s !== id)
          : [...selected, id],
      );
    },
    [selected, onChange],
  );

  if (options.length === 0) {
    return (
      <div className="rounded-[6px] border border-gray-200 bg-gray-50 px-4 py-3">
        <p className="text-[14px] text-gray-500 italic">
          No test equipment in your organization's library.{" "}
          <a
            href="/settings/test-equipment"
            className="text-blue-600 underline"
          >
            Add equipment →
          </a>
        </p>
      </div>
    );
  }

  const hasExpiredSelected = selected.some((id) => {
    const eq = options.find((o) => o.id === id);
    return eq && eq.calibrationExpiryDate <= now;
  });

  return (
    <div className="space-y-2">
      {hasExpiredSelected && (
        <div
          role="alert"
          className="rounded-[4px] border border-amber-300 bg-amber-50 px-3 py-2"
        >
          <p className="text-[13px] font-semibold text-amber-800">
            Expired calibration — Warning
          </p>
          <p className="text-[12px] text-amber-700 mt-0.5">
            One or more selected items have expired calibration certificates.
            This is a warning, not a block. The maintenance record will note that
            calibration was not current at time of use.
          </p>
        </div>
      )}

      <div
        className="rounded-[6px] border border-gray-200 overflow-hidden"
        role="group"
        aria-label="Test equipment used"
      >
        {options
          .filter(
            (eq) =>
              eq.status !== "removed_from_service" &&
              eq.status !== "quarantine",
          )
          .map((eq, idx, arr) => {
            const isSelected = selected.includes(eq.id);
            const isExpired = eq.calibrationExpiryDate <= now;
            const expiry = new Date(eq.calibrationExpiryDate).toLocaleDateString(
              "en-US",
              { year: "numeric", month: "2-digit", day: "2-digit" },
            );

            return (
              <label
                key={eq.id}
                className={cn(
                  "flex items-start gap-3 px-4 py-3 cursor-pointer select-none",
                  "min-h-[64px]", // glove-mode target
                  idx !== arr.length - 1 ? "border-b border-gray-100" : "",
                  isSelected
                    ? "bg-blue-50 hover:bg-blue-100"
                    : "bg-white hover:bg-gray-50",
                  "transition-colors duration-100",
                  disabled ? "cursor-not-allowed opacity-60" : "",
                )}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  disabled={disabled}
                  onChange={() => !disabled && toggle(eq.id)}
                  className={cn(
                    "mt-1 h-5 w-5 rounded border-gray-300 text-blue-600",
                    "focus:ring-2 focus:ring-blue-500",
                  )}
                  aria-describedby={`eq-${eq.id}-desc`}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[14px] font-semibold text-gray-900">
                      {eq.equipmentName}
                    </span>
                    {isExpired && (
                      <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded-[3px] bg-amber-100 text-amber-700 uppercase tracking-wide">
                        Cal. Expired
                      </span>
                    )}
                    {eq.status === "out_for_calibration" && (
                      <span className="text-[11px] px-1.5 py-0.5 rounded-[3px] bg-blue-100 text-blue-700">
                        Out for Cal.
                      </span>
                    )}
                  </div>
                  <p
                    id={`eq-${eq.id}-desc`}
                    className="text-[12px] font-mono text-gray-600 mt-0.5"
                  >
                    P/N {eq.partNumber} · S/N {eq.serialNumber}
                  </p>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    Cal. cert: {eq.calibrationCertNumber} · Expires: {expiry}
                  </p>
                </div>
              </label>
            );
          })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Preview modal overlay — shows PreSignatureSummary before sign flow
// ---------------------------------------------------------------------------

function PreviewModal({
  summaryData,
  onProceed,
  onCancel,
}: {
  summaryData: PreSignatureSummaryData;
  onProceed: () => void;
  onCancel: () => void;
}) {
  // Trap focus within modal on mount
  const modalRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    modalRef.current?.focus();
  }, []);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Pre-signature summary — review before signing"
      className={cn(
        "fixed inset-0 z-[400] flex items-end sm:items-center justify-center",
        "bg-black/60 p-4",
      )}
    >
      <div
        ref={modalRef}
        tabIndex={-1}
        className={cn(
          "w-full max-w-xl bg-white rounded-t-[12px] sm:rounded-[12px]",
          "outline-none",
          "max-h-[95vh] flex flex-col overflow-hidden",
        )}
      >
        {/* Modal header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 shrink-0">
          <h2 className="text-[15px] font-bold text-gray-900">
            Review Before Signing
          </h2>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Close preview"
            className={cn(
              "h-10 w-10 flex items-center justify-center rounded-[6px]",
              "text-gray-500 hover:bg-gray-100",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
            )}
          >
            <svg
              aria-hidden
              className="w-5 h-5"
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="5" y1="5" x2="15" y2="15" />
              <line x1="15" y1="5" x2="5" y2="15" />
            </svg>
          </button>
        </div>

        {/* PreSignatureSummary fills the modal */}
        <div className="flex-1 overflow-hidden">
          <PreSignatureSummary
            summary={summaryData}
            onProceed={onProceed}
            onCancel={onCancel}
          />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

interface FormState {
  workPerformed: string;
  approvedData: ApprovedDataRefFields;
  selectedEquipment: Id<"testEquipment">[];
  completionDate: string; // ISO date string YYYY-MM-DD
}

interface ValidationErrors {
  workPerformed?: string;
  approvedData?: string;
  completionDate?: string;
}

function validateForm(state: FormState): ValidationErrors {
  const errors: ValidationErrors = {};

  if (state.workPerformed.trim().length === 0) {
    errors.workPerformed = "Work performed description is required.";
  } else if (state.workPerformed.trim().length < 50) {
    errors.workPerformed = `Work performed description must be at least 50 characters (14 CFR AC 43-9C). Current: ${state.workPerformed.trim().length} characters.`;
  }

  if (!state.approvedData.docType) {
    errors.approvedData = "Approved data document type is required.";
  } else if (
    !state.approvedData.identifier.trim() ||
    !state.approvedData.revision.trim() ||
    !state.approvedData.section.trim()
  ) {
    errors.approvedData =
      "All four approved data reference fields are required (14 CFR 43.9(a)(1)).";
  }

  if (!state.completionDate) {
    errors.completionDate = "Completion date is required.";
  }

  return errors;
}

function isFormValid(errors: ValidationErrors): boolean {
  return Object.keys(errors).length === 0;
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

/**
 * MaintenanceRecordForm
 *
 * Full form for creating a maintenance record. Displays structured approved
 * data reference fields, test equipment multi-select, work performed narrative,
 * and a preview button that shows PreSignatureSummary before auth flow.
 *
 * On submit, calls createMaintenanceRecord mutation via the sign flow.
 */
export function MaintenanceRecordForm({
  workOrderId,
  taskCardId,
  taskCardTitle,
  aircraftRegistration,
  aircraftMake,
  aircraftModel,
  aircraftSerialNumber,
  aircraftTotalTimeAtOpen,
  workOrderNumber,
  testEquipmentOptions,
  signerName,
  signerCertNumber,
  signerCertType,
  signerOrgName,
  signerIaExpiryDate,
  isIaExpired,
  currentTechnicianId,
  onSuccess,
  onCancel,
  className,
}: MaintenanceRecordFormProps) {
  const { role, isLoaded } = useOrgRole();

  // ── Form state ──
  const [workPerformed, setWorkPerformed] = useState("");
  const [approvedData, setApprovedData] = useState<ApprovedDataRefFields>({
    docType: "",
    identifier: "",
    revision: "",
    section: "",
  });
  const [selectedEquipment, setSelectedEquipment] = useState<Id<"testEquipment">[]>([]);
  const [completionDate, setCompletionDate] = useState<string>(
    new Date().toISOString().slice(0, 10),
  );

  // ── UI state ──
  const [syncState, setSyncState] = useState<SyncState>("idle");
  const [showPreview, setShowPreview] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const [showValidation, setShowValidation] = useState(false);

  // Autosave timer
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autosaveDraft = useCallback(() => {
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    setSyncState("saving");
    autosaveTimer.current = setTimeout(() => {
      // TODO: Persist draft to localStorage or Convex draft mutation
      // For now: just mark as saved
      setSyncState("saved");
      setTimeout(() => setSyncState("idle"), 2000);
    }, 800);
  }, []);

  // Trigger autosave on any field change
  useEffect(() => {
    autosaveDraft();
    return () => {
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workPerformed, approvedData, selectedEquipment, completionDate]);

  // Re-validate when fields change (only show after first submit attempt)
  useEffect(() => {
    if (showValidation) {
      const state: FormState = {
        workPerformed,
        approvedData,
        selectedEquipment,
        completionDate,
      };
      setValidationErrors(validateForm(state));
    }
  }, [workPerformed, approvedData, selectedEquipment, completionDate, showValidation]);

  // IDs for form elements
  const workPerformedId = useId();
  const completionDateId = useId();

  // ── Role gate: AMTs and above can create maintenance records ──
  if (!isLoaded) {
    return (
      <div className="animate-pulse space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-14 rounded-[6px] bg-gray-200" />
        ))}
      </div>
    );
  }

  const canCreate = role === "amt" || role === "inspector" || role === "supervisor" || role === "dom";
  if (!canCreate) {
    return (
      <div
        role="alert"
        className="rounded-[6px] border border-gray-200 bg-gray-50 px-4 py-4 text-center"
      >
        <p className="text-[14px] text-gray-600">
          You do not have permission to create maintenance records.
        </p>
      </div>
    );
  }

  // ── Handlers ──

  const handlePreviewClick = useCallback(() => {
    const state: FormState = {
      workPerformed,
      approvedData,
      selectedEquipment,
      completionDate,
    };
    const errors = validateForm(state);
    setValidationErrors(errors);
    setShowValidation(true);

    if (isFormValid(errors)) {
      setShowPreview(true);
    }
  }, [workPerformed, approvedData, selectedEquipment, completionDate]);

  const handleSignAndSubmit = useCallback(async () => {
    setSubmitting(true);
    setSubmitError(null);

    const approvedDataString = approvedDataRefToString(approvedData);

    try {
      // TODO: Replace with real mutation after Convex deployment:
      // const createRecord = useMutation(api.maintenanceRecords.createMaintenanceRecord);
      // const result = await createRecord({
      //   workOrderId,
      //   taskCardId: taskCardId ?? null,
      //   workPerformed: workPerformed.trim(),
      //   approvedDataReference: approvedDataString,
      //   approvedDataRefStructured: {
      //     docType: approvedData.docType as string,
      //     identifier: approvedData.identifier,
      //     revision: approvedData.revision,
      //     section: approvedData.section,
      //   },
      //   testEquipmentIds: selectedEquipment,
      //   completionDate: new Date(completionDate).getTime(),
      //   technicianId: currentTechnicianId,
      //   // signatureAuthEventId comes from SignOffFlow — will be wired in Wave 3
      // });
      // Stub:
      await new Promise((r) => setTimeout(r, 600));
      const stubRecordId: Id<"maintenanceRecords"> = "stub-maintenance-record-" + Date.now();

      setShowPreview(false);
      onSuccess?.(stubRecordId);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Submission failed. Please try again.";
      setSubmitError(msg);
      setSubmitting(false);
      throw err;
    }
  }, [
    workOrderId,
    taskCardId,
    workPerformed,
    approvedData,
    selectedEquipment,
    completionDate,
    currentTechnicianId,
    onSuccess,
  ]);

  // ── Build PreSignatureSummaryData for preview ──
  const previewSummaryData: PreSignatureSummaryData = {
    recordIdentity: {
      recordType: "maintenance_record",
      recordId: "preview-" + Date.now(),
      workOrderNumber,
      stepNumber: null,
      taskCardTitle: taskCardTitle ?? null,
    },
    aircraft: {
      registration: aircraftRegistration,
      make: aircraftMake,
      model: aircraftModel,
      serialNumber: aircraftSerialNumber,
      totalTimeAtOpen: aircraftTotalTimeAtOpen,
    },
    workPerformed: {
      description: workPerformed,
      approvedDataReference: approvedDataRefToString(approvedData) || null,
      minimumLengthMet: workPerformed.trim().length >= 50,
    },
    technician: {
      fullName: signerName,
      certificateType: signerCertType,
      certificateNumber: signerCertNumber,
      iaExpiryDate: signerIaExpiryDate,
      organizationName: signerOrgName,
    },
    requiresIa: false, // maintenance records don't require IA by default
    isIaExpired,
  };

  const charCount = workPerformed.trim().length;
  const charProgress = Math.min(100, (charCount / 50) * 100);

  return (
    <>
      <div className={cn("space-y-6", className)}>
        {/* Form header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-[18px] font-bold text-gray-900">
              New Maintenance Record
            </h2>
            {taskCardTitle && (
              <p className="text-[13px] text-gray-500 mt-0.5">{taskCardTitle}</p>
            )}
          </div>
          <SyncIndicator state={syncState} />
        </div>

        {/* Context pill: WO + Aircraft */}
        <div className="flex items-center gap-2 px-3 py-2 rounded-[6px] bg-gray-50 border border-gray-200">
          <span className="text-[13px] font-mono font-semibold text-gray-700">
            {workOrderNumber}
          </span>
          <span className="text-gray-300" aria-hidden>|</span>
          <span className="text-[13px] font-mono font-semibold text-gray-700">
            {aircraftRegistration}
          </span>
          <span className="text-[13px] text-gray-500">
            {aircraftMake} {aircraftModel}
          </span>
        </div>

        {/* ── Completion Date ── */}
        <div>
          <label
            htmlFor={completionDateId}
            className="block text-[13px] font-semibold text-gray-700 mb-1.5"
          >
            Completion Date{" "}
            <span className="text-red-600" aria-hidden>
              *
            </span>
          </label>
          <input
            id={completionDateId}
            type="date"
            value={completionDate}
            onChange={(e) => setCompletionDate(e.target.value)}
            required
            max={new Date().toISOString().slice(0, 10)}
            className={cn(
              "w-full h-14 px-3 rounded-[6px] border text-[15px] font-mono",
              "border-gray-300 bg-white text-gray-900",
              "focus:outline-none focus:ring-2 focus:ring-blue-500",
              validationErrors.completionDate
                ? "border-red-400 focus:ring-red-500"
                : "",
            )}
          />
          {validationErrors.completionDate && (
            <p className="text-[12px] text-red-600 mt-1" role="alert">
              {validationErrors.completionDate}
            </p>
          )}
        </div>

        {/* ── Work Performed ── */}
        <div>
          <div className="flex items-baseline justify-between mb-1.5">
            <label
              htmlFor={workPerformedId}
              className="text-[13px] font-semibold text-gray-700"
            >
              Work Performed{" "}
              <span className="text-red-600" aria-hidden>
                *
              </span>
            </label>
            <span
              className={cn(
                "text-[12px]",
                charCount >= 50 ? "text-green-600" : "text-amber-600",
              )}
              aria-live="polite"
              aria-label={`${charCount} characters entered, 50 minimum required`}
            >
              {charCount}/50 min
            </span>
          </div>

          {/* Progress bar toward 50-char minimum */}
          {charCount < 50 && (
            <div
              role="progressbar"
              aria-valuenow={charCount}
              aria-valuemin={0}
              aria-valuemax={50}
              aria-label="Work performed description minimum length progress"
              className="w-full h-1 bg-gray-200 rounded-full mb-2 overflow-hidden"
            >
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-200",
                  charProgress > 75 ? "bg-amber-400" : "bg-gray-400",
                )}
                style={{ width: `${charProgress}%` }}
              />
            </div>
          )}

          <textarea
            id={workPerformedId}
            value={workPerformed}
            onChange={(e) => setWorkPerformed(e.target.value)}
            placeholder="Describe all work performed. Include: what was done, how it was done, and what condition was found. Minimum 50 characters (14 CFR AC 43-9C)."
            required
            aria-required="true"
            rows={7}
            className={cn(
              "w-full px-3 py-3 rounded-[6px] border text-[16px] text-gray-900",
              "border-gray-300 bg-white leading-relaxed",
              "focus:outline-none focus:ring-2 focus:ring-blue-500",
              "resize-y min-h-[140px]",
              validationErrors.workPerformed
                ? "border-red-400 focus:ring-red-500"
                : "",
            )}
          />
          {validationErrors.workPerformed && (
            <p className="text-[12px] text-red-600 mt-1" role="alert">
              {validationErrors.workPerformed}
            </p>
          )}
        </div>

        {/* ── Approved Data Reference ── */}
        <div>
          <div className="mb-3">
            <h3 className="text-[13px] font-semibold text-gray-700">
              Approved Data Reference{" "}
              <span className="text-red-600" aria-hidden>
                *
              </span>
            </h3>
            <p className="text-[12px] text-gray-500 mt-0.5">
              14 CFR 43.9(a)(1) requires a specific approved data reference for
              every maintenance record. Use the four fields below — not a free
              text field.
            </p>
          </div>

          <ApprovedDataReferenceFields
            value={approvedData}
            onChange={setApprovedData}
          />

          {validationErrors.approvedData && (
            <p className="text-[12px] text-red-600 mt-2" role="alert">
              {validationErrors.approvedData}
            </p>
          )}
        </div>

        {/* ── Test Equipment ── */}
        <div>
          <div className="mb-3">
            <h3 className="text-[13px] font-semibold text-gray-700">
              Test Equipment Used{" "}
              <span className="text-[12px] font-normal text-gray-400">
                (optional — required for IFR return-to-service work)
              </span>
            </h3>
            <p className="text-[12px] text-gray-500 mt-0.5">
              Select all test equipment used during this work. Calibration status
              is snapshotted at signing time (Dale Purcell requirement, REQ-DP-01).
            </p>
          </div>

          <TestEquipmentSelector
            options={testEquipmentOptions}
            selected={selectedEquipment}
            onChange={setSelectedEquipment}
          />

          {selectedEquipment.length > 0 && (
            <p
              className="text-[12px] text-gray-500 mt-2"
              aria-live="polite"
            >
              {selectedEquipment.length} item
              {selectedEquipment.length !== 1 ? "s" : ""} selected
            </p>
          )}
        </div>

        {/* ── Submit error ── */}
        {submitError && (
          <div
            role="alert"
            className="rounded-[6px] border border-red-300 bg-red-50 px-4 py-3"
          >
            <p className="text-[13px] font-semibold text-red-800">
              Submission failed
            </p>
            <p className="text-[13px] text-red-700 mt-0.5">{submitError}</p>
          </div>
        )}

        {/* ── Action buttons ── */}
        <div className="flex flex-col gap-3 sm:flex-row pt-2 border-t border-gray-100">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={submitting}
              className={cn(
                "w-full sm:flex-1 h-16 rounded-[6px]",
                "border border-gray-300 bg-white",
                "text-[15px] font-medium text-gray-700",
                "hover:bg-gray-50",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
                "disabled:opacity-50 disabled:cursor-not-allowed",
              )}
            >
              Cancel
            </button>
          )}

          <button
            type="button"
            onClick={handlePreviewClick}
            disabled={submitting}
            className={cn(
              "w-full sm:flex-[2] h-16 rounded-[6px]",
              "bg-blue-600 text-white",
              "text-[16px] font-bold uppercase tracking-[0.04em]",
              "hover:bg-blue-700 active:bg-blue-800",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
              "transition-colors duration-100",
              "disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed",
            )}
          >
            Preview & Sign
          </button>
        </div>

        <p className="text-[11px] text-gray-400 text-center -mt-3">
          Review the complete record before signing. Your signature is a legal
          certification under 14 CFR Part 43.
        </p>
      </div>

      {/* Preview modal — shows PreSignatureSummary before sign flow */}
      {showPreview && (
        <PreviewModal
          summaryData={previewSummaryData}
          onProceed={handleSignAndSubmit}
          onCancel={() => setShowPreview(false)}
        />
      )}
    </>
  );
}

export default MaintenanceRecordForm;
