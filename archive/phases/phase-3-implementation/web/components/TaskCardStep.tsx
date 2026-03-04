/**
 * components/TaskCardStep.tsx
 * Athelon — Task Card Step Component
 *
 * Chloe Park, 2026-02-22
 *
 * Renders a single step within a task card. A task card is composed of multiple
 * ordered steps that must be completed (and signed) sequentially.
 *
 * State machine per step:
 *   pending → signing → signed (terminal, immutable)
 *   pending → signing → error (reverts to pending)
 *   pending → blocked (no user action until blocker resolves)
 *
 * Sign button triggers the `completeStep` Convex mutation. High-stakes action —
 * no optimistic update. The signed state only renders after server confirmation.
 *
 * Per Finn's design note: "The sign-off confirmation screen must only render after
 * the Convex mutation resolves — not optimistically."
 *
 * signatureAuthEvent flow:
 *   1. User clicks SIGN
 *   2. Frontend calls createSignatureAuthEvent mutation → gets eventId
 *   3. Clerk re-auth triggered (or fresh token checked)
 *   4. Frontend calls completeStep mutation with { stepId, signatureAuthEventId }
 *   5. Convex verifies token freshness (< 15 min) and eventId integrity
 *   6. On success → step.status = "signed", audit record written
 *   7. UI reflects signed state from server (not optimistic)
 */

"use client";

import React, { useState, useCallback, useId } from "react";
// TODO: import { useMutation } from "convex/react"; — un-stub when Convex is deployed
import { cn } from "@/lib/utils";

// TODO: Import these from "@/convex/_generated/api" once Convex is deployed.
// Stubbed here so the component can be developed and type-checked independently.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const api = {} as any;

// ---------------------------------------------------------------------------
// Types — mirrors Convex Doc<"taskCardSteps">
// ---------------------------------------------------------------------------

// TODO: Replace with `import { Doc } from "@/convex/_generated/dataModel"` once deployed.
export interface TaskCardStepDoc {
  _id: string;
  _creationTime: number;
  taskCardId: string;
  workOrderId: string;
  stepNumber: number;
  description: string;
  referenceManual?: string;    // e.g. "King Air MM 61-20-01"
  referenceSection?: string;   // e.g. "Ignition System — Points Inspection"
  status: "pending" | "in_progress" | "signed" | "blocked" | "na";
  /** If blocked: the human-readable reason */
  blockerReason?: string;
  /** Sign-off data (present only when status === "signed") */
  signedBy?: string;           // User display name
  signedByUserId?: string;
  signedByCertNumber?: string; // A&P / IA cert number
  signedAt?: number;           // Unix ms
  signatureAuthEventId?: string;
  signatureId?: string;        // UUID, references audit record
  /** Notes logged during this step */
  notes?: string;
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface TaskCardStepProps {
  step: TaskCardStepDoc;
  /** Is the task card currently eligible for sign-off? (all required fields complete) */
  taskCardSignOffReady?: boolean;
  /** Is this step the next one to be signed (all prior steps signed)? */
  isNextToSign?: boolean;
  /** Org role — controls whether the sign button renders at all */
  userCanSign?: boolean;
  className?: string;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** Signed step — immutable record block. Never editable post-sign. */
function SignedStepBlock({
  signedBy,
  signedByCertNumber,
  signedAt,
  signatureId,
}: {
  signedBy?: string;
  signedByCertNumber?: string;
  signedAt?: number;
  signatureId?: string;
}) {
  const signedAtDate = signedAt ? new Date(signedAt) : null;
  const zuluString = signedAtDate
    ? `${signedAtDate.toISOString().slice(0, 10)} ${signedAtDate.toISOString().slice(11, 16)}Z`
    : "—";
  const localString = signedAtDate
    ? signedAtDate.toLocaleString("en-US", {
        month: "numeric",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        timeZoneName: "short",
      })
    : "—";

  return (
    <div
      className={cn(
        "mt-3 rounded-[6px] border border-green-800/50 bg-green-950/30 px-4 py-3",
        "text-[13px]",
      )}
      role="note"
      aria-label="Step signed off — this record is locked"
    >
      {/* Header row */}
      <div className="flex items-center gap-2 mb-1.5">
        {/* Checkmark icon */}
        <svg
          aria-hidden
          className="w-4 h-4 text-green-400 shrink-0"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="3,8 7,12 13,4" />
        </svg>
        <span className="font-semibold text-green-300 uppercase tracking-[0.04em] text-[12px]">
          Signed Off
        </span>
      </div>

      {/* Who */}
      <p className="text-gray-300">
        {signedBy ?? "Unknown"}{" "}
        {signedByCertNumber && (
          <span className="text-gray-500">
            &bull;{" "}
            <span className="font-mono text-[12px]">{signedByCertNumber}</span>
          </span>
        )}
      </p>

      {/* When — Zulu primary, local secondary (ux-component-library-spec.md §2.3) */}
      <p className="text-gray-400 mt-0.5">
        <time dateTime={signedAtDate?.toISOString()} className="font-mono text-[12px]">
          {zuluString}
        </time>
        <span className="text-gray-600 ml-2 text-[11px]">({localString})</span>
      </p>

      {/* Signature ID — UUID for audit trail lookup */}
      {signatureId && (
        <p className="text-gray-600 mt-1.5 text-[11px]">
          <span className="font-mono">{signatureId}</span>
          <button
            type="button"
            className="ml-2 text-blue-500 hover:text-blue-400 underline text-[11px]"
            onClick={() => {
              // TODO: Open audit trail drawer filtered to this signature event
            }}
          >
            View audit record
          </button>
        </p>
      )}

      <p className="text-gray-600 mt-1 text-[11px]">
        This record is cryptographically locked.
      </p>
    </div>
  );
}

/** Sign button + confirmation flow — shown when step is ready to sign. */
function SignButton({
  stepId,
  stepNumber,
  taskCardId,
  isNextToSign,
  onSignSuccess,
}: {
  stepId: string;
  stepNumber: number;
  taskCardId: string;
  isNextToSign: boolean;
  onSignSuccess: () => void;
}) {
  type SignState = "idle" | "confirming" | "authenticating" | "submitting" | "error";
  const [signState, setSignState] = useState<SignState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // TODO: Wire to real Convex mutation once deployed:
  // const completeStep = useMutation(api.taskCardSteps.completeStep);
  // const createAuthEvent = useMutation(api.signatureAuthEvents.create);

  // Placeholder mutation stubs — remove when Convex is deployed
  const completeStep = useCallback(
    async (_args: {
      stepId: string;
      taskCardId: string;
      signatureAuthEventId: string;
    }): Promise<void> => {
      // TODO: Replace with actual Convex mutation
      throw new Error("Convex not yet deployed — completeStep is stubbed");
    },
    [],
  );

  const createAuthEvent = useCallback(
    async (_args: { stepId: string; taskCardId: string }): Promise<string> => {
      // TODO: Replace with actual Convex mutation — returns signatureAuthEventId
      throw new Error("Convex not yet deployed — createAuthEvent is stubbed");
    },
    [],
  );

  const handleSignClick = useCallback(async () => {
    setSignState("confirming");
    setErrorMessage(null);
  }, []);

  const handleConfirm = useCallback(async () => {
    setSignState("authenticating");

    let signatureAuthEventId: string;
    try {
      // Step 1: Create a signature auth event (reservations/lock)
      signatureAuthEventId = await createAuthEvent({ stepId, taskCardId });
    } catch (err) {
      setSignState("error");
      setErrorMessage(
        "Failed to initiate sign-off. Please try again.",
      );
      return;
    }

    // Step 2: Clerk re-auth (fresh token < 15 minutes required by Convex)
    // TODO: Trigger Clerk step-up auth here once Clerk SDK is wired.
    // clerk.openSignIn({ redirectUrl: window.location.href })
    // For now, we proceed directly (Week 2 — Jonas is implementing signatureAuthEvents endpoint).

    setSignState("submitting");

    try {
      // Step 3: Call completeStep mutation with the auth event ID
      await completeStep({ stepId, taskCardId, signatureAuthEventId });
      onSignSuccess();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Sign-off failed. Please try again.";

      // Handle TOKEN_STALE — Convex error code for re-auth requirement
      if (message.includes("TOKEN_STALE")) {
        setSignState("error");
        setErrorMessage(
          "Your session needs to be refreshed before signing. Please sign in again.",
        );
      } else {
        setSignState("error");
        setErrorMessage(message);
      }
    }
  }, [stepId, taskCardId, createAuthEvent, completeStep, onSignSuccess]);

  const handleCancel = useCallback(() => {
    setSignState("idle");
    setErrorMessage(null);
  }, []);

  // ── Idle: show the SIGN button ──
  if (signState === "idle") {
    return (
      <div className="mt-3 flex justify-end">
        <button
          type="button"
          onClick={handleSignClick}
          className={cn(
            // Finn's spec: "Large blue button, right-aligned, full row height"
            // Touch target ≥ 48px height (60px preferred for primary actions)
            "inline-flex items-center gap-2 px-5 h-12 rounded-[6px]",
            "bg-blue-600 hover:bg-blue-700 active:bg-blue-800",
            "text-white text-[14px] font-semibold uppercase tracking-[0.04em]",
            "transition-colors duration-100",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2",
            "focus-visible:ring-offset-[#1A1E28]",
            // More prominent on next-to-sign
            isNextToSign && "shadow-[0_0_0_2px_rgba(37,99,235,0.4)]",
          )}
          aria-label={`Sign off step ${stepNumber}`}
        >
          {/* Pen icon */}
          <svg
            aria-hidden
            className="w-4 h-4"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M11.5 2.5L13.5 4.5L5 13L2 14L3 11L11.5 2.5Z" />
          </svg>
          Sign Off
        </button>
      </div>
    );
  }

  // ── Confirming: show certification statement ──
  if (signState === "confirming") {
    return (
      <div
        className="mt-3 rounded-[6px] border border-blue-800/50 bg-blue-950/30 p-4"
        role="dialog"
        aria-modal="false"
        aria-label="Confirm step sign-off"
      >
        <p className="text-[13px] font-semibold text-gray-100 mb-2">
          Sign off Step {stepNumber}?
        </p>
        <p className="text-[12px] text-gray-400 mb-4 leading-relaxed">
          By signing, you certify that this step was performed in accordance with
          the referenced maintenance data and applicable FAA regulations. This
          signature is permanent and legally binding.
        </p>
        <div className="flex gap-3 justify-end">
          <button
            type="button"
            onClick={handleCancel}
            className="px-4 h-10 text-[13px] text-gray-400 hover:text-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className={cn(
              "px-5 h-10 rounded-[6px]",
              "bg-blue-600 hover:bg-blue-700 text-white",
              "text-[13px] font-semibold uppercase tracking-[0.04em]",
              "transition-colors duration-100",
            )}
          >
            Proceed to Sign
          </button>
        </div>
      </div>
    );
  }

  // ── Submitting / authenticating: spinner ──
  if (signState === "submitting" || signState === "authenticating") {
    return (
      <div className="mt-3 flex items-center justify-end gap-2 text-[13px] text-gray-400">
        {/* Spinner */}
        <svg
          aria-hidden
          className="w-4 h-4 animate-spin text-blue-500"
          viewBox="0 0 24 24"
          fill="none"
        >
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.3" />
          <path
            d="M12 2a10 10 0 0 1 10 10"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </svg>
        <span>
          {signState === "authenticating" ? "Authenticating…" : "Signing…"}
        </span>
      </div>
    );
  }

  // ── Error: show message + retry ──
  if (signState === "error") {
    return (
      <div className="mt-3 rounded-[6px] border border-red-800/50 bg-red-950/30 p-4">
        <p className="text-[13px] font-semibold text-red-300 mb-1">
          Sign-off failed
        </p>
        <p className="text-[12px] text-red-400 mb-3">{errorMessage}</p>
        <div className="flex gap-3 justify-end">
          <button
            type="button"
            onClick={handleCancel}
            className="px-4 h-9 text-[13px] text-gray-400 hover:text-gray-200 transition-colors"
          >
            Dismiss
          </button>
          <button
            type="button"
            onClick={handleSignClick}
            className="px-4 h-9 rounded-[6px] bg-blue-600 hover:bg-blue-700 text-white text-[13px] font-semibold transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return null;
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

/**
 * TaskCardStep
 *
 * Renders one step within a task card. Handles all three meaningful states:
 *
 *   pending    — step not yet done; SIGN button visible if userCanSign && isNextToSign
 *   signed     — immutable sign-off block; no user actions
 *   blocked    — amber left border; inline blocker reason; no sign button
 *   in_progress — same as pending visually (timer may be running)
 *   na         — not applicable; shown greyed out with dash indicator
 */
export function TaskCardStep({
  step,
  taskCardSignOffReady = false,
  isNextToSign = false,
  userCanSign = false,
  className,
}: TaskCardStepProps) {
  // After a successful sign, we locally flip to "signed" state rather than
  // relying on a Convex re-query (which will propagate in real time anyway).
  // This avoids the brief flash of the unsigned UI while the query updates.
  // Note: NOT an optimistic update — we only flip after server confirms.
  const [localSigned, setLocalSigned] = useState(false);

  const isSigned = step.status === "signed" || localSigned;
  const isBlocked = step.status === "blocked";
  const isNa = step.status === "na";
  const isPending =
    !isSigned && !isBlocked && !isNa;

  const showSignButton =
    isPending &&
    userCanSign &&
    taskCardSignOffReady &&
    isNextToSign;

  const stepId = useId(); // For aria-labelledby linkage

  return (
    <div
      className={cn(
        "relative rounded-[8px] border bg-[#1A1E28] px-4 py-3.5",
        // Default border
        "border-[#363D4E]",
        // Blocked: amber left border (spec §4.2 Blocked task card)
        isBlocked && "border-l-4 border-l-amber-600 border-[#363D4E]",
        // Signed: subtle green left accent
        isSigned && "border-l-4 border-l-green-700 border-[#363D4E]",
        // NA: muted
        isNa && "opacity-60",
        // Next-to-sign: blue left accent to draw attention
        !isSigned && !isBlocked && isNextToSign && "border-l-4 border-l-blue-600 border-[#363D4E]",
        className,
      )}
      aria-labelledby={stepId}
    >
      {/* ── Header row: step number + status icon ── */}
      <div className="flex items-start gap-3">
        {/* Step number */}
        <span
          className="font-mono text-[12px] text-gray-600 mt-0.5 w-5 shrink-0 tabular-nums"
          aria-label={`Step ${step.stepNumber}`}
        >
          {step.stepNumber}.
        </span>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Step description */}
          <p
            id={stepId}
            className={cn(
              "text-[15px] leading-snug",
              isSigned ? "text-gray-300" : "text-gray-100",
              isNa && "line-through text-gray-600",
            )}
          >
            {step.description}
          </p>

          {/* Reference manual — if specified */}
          {step.referenceManual && (
            <p className="mt-1 text-[12px] text-gray-500">
              Ref: {step.referenceManual}
              {step.referenceSection && ` — ${step.referenceSection}`}
            </p>
          )}

          {/* Blocker warning — inline, always visible (not a tooltip) */}
          {isBlocked && step.blockerReason && (
            <div
              className="mt-2 flex items-start gap-2 text-[12px] text-amber-400"
              role="alert"
              aria-live="polite"
            >
              {/* Warning icon */}
              <svg
                aria-hidden
                className="w-3.5 h-3.5 shrink-0 mt-0.5"
                viewBox="0 0 10 9"
                fill="currentColor"
              >
                <path d="M5 0.5L9.5 8.5H0.5L5 0.5Z" />
                <rect x="4.25" y="3.5" width="1.5" height="2.5" fill="#1A1E28" rx="0.25" />
                <rect x="4.25" y="6.5" width="1.5" height="1.5" fill="#1A1E28" rx="0.25" />
              </svg>
              <span>{step.blockerReason}</span>
            </div>
          )}

          {/* Notes */}
          {step.notes && (
            <p className="mt-2 text-[12px] text-gray-500 italic leading-relaxed">
              {step.notes}
            </p>
          )}

          {/* Signed block */}
          {isSigned && (
            <SignedStepBlock
              signedBy={step.signedBy}
              signedByCertNumber={step.signedByCertNumber}
              signedAt={step.signedAt}
              signatureId={step.signatureId}
            />
          )}

          {/* NA indicator */}
          {isNa && (
            <p className="mt-1 text-[12px] text-gray-600">Not applicable</p>
          )}

          {/* Sign button — only when eligible */}
          {showSignButton && (
            <SignButton
              stepId={step._id}
              stepNumber={step.stepNumber}
              taskCardId={step.taskCardId}
              isNextToSign={isNextToSign}
              onSignSuccess={() => setLocalSigned(true)}
            />
          )}

          {/* Pending but not-next-to-sign: subtle indicator */}
          {isPending && !showSignButton && !isBlocked && (
            <p className="mt-1.5 text-[11px] text-gray-600">
              {userCanSign && !taskCardSignOffReady
                ? "Complete all requirements before signing"
                : userCanSign && taskCardSignOffReady && !isNextToSign
                  ? "Sign previous steps first"
                  : null}
            </p>
          )}
        </div>

        {/* Right: status indicator */}
        <div className="shrink-0 mt-1" aria-hidden>
          {isSigned && (
            <svg className="w-5 h-5 text-green-500" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3,8 7,12 13,4" />
            </svg>
          )}
          {isBlocked && (
            <svg className="w-5 h-5 text-amber-500" viewBox="0 0 10 9" fill="currentColor">
              <path d="M5 0.5L9.5 8.5H0.5L5 0.5Z" />
              <rect x="4.25" y="3.5" width="1.5" height="2.5" fill="#1A1E28" rx="0.25" />
              <rect x="4.25" y="6.5" width="1.5" height="1.5" fill="#1A1E28" rx="0.25" />
            </svg>
          )}
          {isPending && (
            <svg className="w-5 h-5 text-gray-600" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="8" cy="8" r="6" />
            </svg>
          )}
        </div>
      </div>
    </div>
  );
}

export default TaskCardStep;
