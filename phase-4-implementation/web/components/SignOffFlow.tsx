/**
 * components/SignOffFlow.tsx
 * Athelon — Three-Phase Regulatory Sign-Off Component
 *
 * Chloe Park, 2026-02-22
 *
 * Implements the full signing ceremony from UX spec §4.6 and §5.4:
 *
 *   Phase 1 — CONFIRMATION
 *     Show the certifying statement. Signer reviews exactly what they are
 *     certifying before proceeding. Cannot skip.
 *
 *   Phase 2 — RE-AUTHENTICATION (PIN dialpad)
 *     6-digit PIN entry. Phone-dialpad layout. 64px buttons per Tanya's spec.
 *     Step-up auth creates a signatureAuthEvent on the server.
 *
 *   Phase 3 — SUBMISSION
 *     Calls the parent-supplied `onSubmit` callback with (authEventId, pin).
 *     Parent is responsible for the domain mutation (completeStep, closeWorkOrder, etc.)
 *     On success: renders the immutable signed block.
 *     On failure: shows error with retry.
 *
 * The immutable signed block follows spec §5.4:
 *   - Who signed (legal name + cert number)
 *   - Zulu timestamp primary, local time secondary
 *   - Signature UUID with audit trail link
 *   - "This record is cryptographically locked." — verbatim per spec
 *
 * Usage:
 *   <SignOffFlow
 *     recordDescription="Left Magneto Inspection — Task Card TC-007"
 *     certifyingStatement="You are certifying that left magneto inspection was performed..."
 *     signerName="Ray Kowalski"
 *     certNumber="A&P Cert. #3892045"
 *     onSubmit={async (authEventId) => {
 *       await completeStep({ stepId, taskCardId, signatureAuthEventId: authEventId });
 *     }}
 *     onCancel={() => setShowSignOff(false)}
 *   />
 */

"use client";

import React, {
  useState,
  useCallback,
  useRef,
  useEffect,
  useId,
} from "react";
import { cn } from "@/lib/utils";

// TODO: Import from "@/convex/_generated/api" once Convex is deployed.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const api = {} as any;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ExistingSignature {
  signedBy: string;
  certNumber: string;
  signedAt: number;
  signatureId: string;
}

export interface SignOffFlowProps {
  /** Short description of what's being signed — shown in confirmation header */
  recordDescription: string;
  /** Full legal certification statement shown during confirmation */
  certifyingStatement: string;
  /** Signer's legal name (pre-populated from personnel record) */
  signerName: string;
  /** Signer's certificate number (e.g. "A&P Cert. #3892045") */
  certNumber: string;
  /**
   * Called after successful PIN auth. Parent is responsible for calling the
   * actual Convex mutation. The signatureAuthEventId returned from the server
   * must be passed to the domain mutation.
   *
   * Throw any error to trigger the error state.
   */
  onSubmit: (signatureAuthEventId: string) => Promise<void>;
  /** Called when the user cancels at any phase (before submission). */
  onCancel: () => void;
  /**
   * If a signature already exists (e.g. re-rendering after page refresh),
   * skip straight to the immutable signed block.
   */
  existingSignature?: ExistingSignature;
  /**
   * Optional context string — e.g. "Step 3 of 7" or "Return to Service"
   * Shown below the record description.
   */
  context?: string;
  className?: string;
}

// ---------------------------------------------------------------------------
// Phase types
// ---------------------------------------------------------------------------

type Phase =
  | "confirmation"   // Phase 1: Show certifying statement, confirm intent
  | "pin_entry"      // Phase 2: PIN dialpad entry
  | "submitting"     // Phase 3a: Waiting for mutation
  | "success"        // Phase 3b: Signed — show immutable block
  | "error";         // Phase 3c: Mutation failed

// ---------------------------------------------------------------------------
// PIN length requirement (matches signatureAuthEvents.pin length on server)
// ---------------------------------------------------------------------------

const PIN_LENGTH = 6;

// ---------------------------------------------------------------------------
// Dialpad configuration — phone dialpad layout
// ---------------------------------------------------------------------------

type DialKey =
  | "1" | "2" | "3"
  | "4" | "5" | "6"
  | "7" | "8" | "9"
  | "blank" | "0" | "backspace";

const DIALPAD_KEYS: DialKey[] = [
  "1", "2", "3",
  "4", "5", "6",
  "7", "8", "9",
  "blank", "0", "backspace",
];

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** Immutable signed block — spec §5.4. Never editable after creation. */
export function SignedBlock({
  signedBy,
  certNumber,
  signedAt,
  signatureId,
  compact = false,
}: {
  signedBy: string;
  certNumber: string;
  signedAt: number;
  signatureId: string;
  compact?: boolean;
}) {
  const dt = new Date(signedAt);

  // Zulu: "2026-02-25 14:32Z"
  const zuluDate = dt.toISOString().slice(0, 10);
  const zuluTime = dt.toISOString().slice(11, 16);
  const zuluString = `${zuluDate} ${zuluTime}Z`;

  // Local: "2/25/2026, 07:32 MST"
  const localString = dt.toLocaleString("en-US", {
    month: "numeric",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  });

  return (
    <div
      className={cn(
        "rounded-[6px] border border-green-800/50 bg-green-950/30",
        compact ? "px-3 py-2.5" : "px-4 py-4",
      )}
      role="note"
      aria-label="Signed off — this record is cryptographically locked"
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <svg
          aria-hidden
          className={cn("shrink-0 text-green-400", compact ? "w-3.5 h-3.5" : "w-4 h-4")}
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="3,8 7,12 13,4" />
        </svg>
        <span
          className={cn(
            "font-semibold text-green-300 uppercase tracking-[0.05em]",
            compact ? "text-[11px]" : "text-[12px]",
          )}
        >
          Signed Off
        </span>
      </div>

      {/* Who */}
      <p className={cn("text-gray-200 font-medium", compact ? "text-[13px]" : "text-[14px]")}>
        {signedBy}
      </p>
      <p className={cn("text-gray-400", compact ? "text-[12px]" : "text-[13px]")}>
        <span className="font-mono">{certNumber}</span>
      </p>

      {/* When — Zulu primary, local secondary per spec §5.5 */}
      <p className={cn("mt-1.5", compact ? "text-[12px]" : "text-[13px]")}>
        <time
          dateTime={dt.toISOString()}
          className="font-mono text-gray-300"
        >
          {zuluString}
        </time>
        <span className="text-gray-500 ml-2 text-[11px]">({localString})</span>
      </p>

      {/* Signature ID — UUID for audit trail */}
      <div className="mt-2 pt-2 border-t border-green-900/40">
        <p className="text-[11px] text-gray-600">
          <span className="font-mono break-all">{signatureId}</span>
        </p>
        <p className="text-[11px] text-gray-600 mt-0.5">
          This record is cryptographically locked.
        </p>
      </div>
    </div>
  );
}

/** Phase 1: Confirmation panel */
function ConfirmationPhase({
  recordDescription,
  certifyingStatement,
  signerName,
  certNumber,
  context,
  onProceed,
  onCancel,
}: {
  recordDescription: string;
  certifyingStatement: string;
  signerName: string;
  certNumber: string;
  context?: string;
  onProceed: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      {/* Record being signed */}
      <div>
        <p className="text-[12px] text-gray-500 uppercase tracking-[0.05em] mb-1">
          Signing
        </p>
        <p className="text-[16px] font-semibold text-gray-100 leading-snug">
          {recordDescription}
        </p>
        {context && (
          <p className="text-[13px] text-gray-400 mt-0.5">{context}</p>
        )}
      </div>

      {/* Certification statement — the legal text */}
      <div className="rounded-[6px] border border-[#363D4E] bg-[#0F1117] px-4 py-4">
        <p className="text-[12px] text-amber-400 font-semibold uppercase tracking-[0.04em] mb-2">
          Certification Statement
        </p>
        <p className="text-[14px] text-gray-300 leading-relaxed">
          {certifyingStatement}
        </p>
      </div>

      {/* Signer identity */}
      <div className="flex items-center gap-3 rounded-[6px] border border-[#363D4E] bg-[#1A1E28] px-4 py-3">
        {/* Person icon */}
        <svg
          aria-hidden
          className="w-5 h-5 text-gray-400 shrink-0"
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="10" cy="7" r="3" />
          <path d="M3 18c0-3.866 3.134-7 7-7s7 3.134 7 7" />
        </svg>
        <div>
          <p className="text-[14px] font-medium text-gray-200">{signerName}</p>
          <p className="text-[12px] font-mono text-gray-500">{certNumber}</p>
        </div>
      </div>

      {/* Warning */}
      <p className="text-[12px] text-gray-500 leading-relaxed">
        By proceeding, you affirm that you are{" "}
        <strong className="text-gray-300">{signerName}</strong> and that the above
        statement is true. Your signature is permanent and legally binding under
        14 CFR Part 43.
      </p>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onCancel}
          className={cn(
            "flex-1 h-14 rounded-[6px]",
            "border border-[#363D4E] bg-[#1A1E28]",
            "text-[14px] font-medium text-gray-400 hover:text-gray-200",
            "transition-colors duration-100",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400",
          )}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onProceed}
          className={cn(
            "flex-[2] h-14 rounded-[6px]",
            "bg-blue-600 hover:bg-blue-700 active:bg-blue-800",
            "text-[14px] font-semibold text-white uppercase tracking-[0.04em]",
            "transition-colors duration-100",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400",
          )}
        >
          Proceed to Sign
        </button>
      </div>
    </div>
  );
}

/** Phase 2: PIN entry with dialpad */
function PinEntryPhase({
  signerName,
  certNumber,
  onSubmitPin,
  onCancel,
  isSubmitting,
  error,
}: {
  signerName: string;
  certNumber: string;
  onSubmitPin: (pin: string) => void;
  onCancel: () => void;
  isSubmitting: boolean;
  error: string | null;
}) {
  const [pin, setPin] = useState<string>("");
  const [pinVisible, setPinVisible] = useState(false);

  const handleKey = useCallback(
    (key: DialKey) => {
      if (isSubmitting) return;

      if (key === "backspace") {
        setPin((prev) => prev.slice(0, -1));
        return;
      }
      if (key === "blank") return;

      if (pin.length < PIN_LENGTH) {
        const newPin = pin + key;
        setPin(newPin);
        // Auto-submit when PIN is complete
        if (newPin.length === PIN_LENGTH) {
          onSubmitPin(newPin);
        }
      }
    },
    [pin, isSubmitting, onSubmitPin],
  );

  // Physical keyboard support
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Backspace") {
        handleKey("backspace");
      } else if (/^[0-9]$/.test(e.key)) {
        handleKey(e.key as DialKey);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleKey]);

  return (
    <div className="flex flex-col items-center gap-5">
      {/* Signer identity reminder */}
      <div className="text-center">
        <p className="text-[13px] text-gray-500">Signing as</p>
        <p className="text-[15px] font-semibold text-gray-200">{signerName}</p>
        <p className="text-[12px] font-mono text-gray-500">{certNumber}</p>
      </div>

      {/* PIN display — dots */}
      <div className="flex items-center gap-3" aria-label={`${pin.length} of ${PIN_LENGTH} digits entered`}>
        {Array.from({ length: PIN_LENGTH }).map((_, i) => {
          const filled = i < pin.length;
          const char = pin[i];
          return (
            <div
              key={i}
              className={cn(
                "w-10 h-10 rounded-[4px] flex items-center justify-center",
                "border transition-all duration-100",
                filled
                  ? "border-blue-500 bg-blue-950/40"
                  : "border-[#363D4E] bg-[#1A1E28]",
              )}
              aria-hidden
            >
              {filled && (
                <span className="text-[18px] font-mono text-blue-300 leading-none">
                  {pinVisible ? char : "●"}
                </span>
              )}
            </div>
          );
        })}

        {/* Show/hide toggle */}
        <button
          type="button"
          onClick={() => setPinVisible((v) => !v)}
          className="ml-1 p-2 text-gray-500 hover:text-gray-300 transition-colors"
          aria-label={pinVisible ? "Hide PIN" : "Show PIN"}
        >
          {pinVisible ? (
            <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M1 8s3-5 7-5 7 5 7 5-3 5-7 5-7-5-7-5z" />
              <circle cx="8" cy="8" r="2" />
              <line x1="2" y1="2" x2="14" y2="14" />
            </svg>
          ) : (
            <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M1 8s3-5 7-5 7 5 7 5-3 5-7 5-7-5-7-5z" />
              <circle cx="8" cy="8" r="2" />
            </svg>
          )}
        </button>
      </div>

      {/* Error message */}
      {error && (
        <div
          className="w-full rounded-[6px] border border-red-800/50 bg-red-950/30 px-3 py-2.5"
          role="alert"
        >
          <p className="text-[13px] text-red-400">{error}</p>
        </div>
      )}

      {/* Dialpad — 3×4 grid. Per spec: 64px buttons. */}
      <div
        className="grid grid-cols-3 gap-3 w-full max-w-[300px]"
        role="group"
        aria-label="PIN entry keypad"
      >
        {DIALPAD_KEYS.map((key, index) => {
          if (key === "blank") {
            return <div key={index} aria-hidden />;
          }

          if (key === "backspace") {
            return (
              <button
                key={index}
                type="button"
                onClick={() => handleKey("backspace")}
                disabled={isSubmitting || pin.length === 0}
                className={cn(
                  // 64px buttons per Tanya's spec for sign-off flow
                  "h-16 w-full rounded-[8px]",
                  "border border-[#363D4E] bg-[#1A1E28]",
                  "flex items-center justify-center",
                  "text-gray-400 hover:text-gray-100 hover:bg-[#2E3445]",
                  "active:bg-[#3A4155]",
                  "transition-colors duration-75",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400",
                  "disabled:opacity-30 disabled:cursor-not-allowed",
                )}
                aria-label="Delete last digit"
              >
                <svg
                  aria-hidden
                  className="w-5 h-5"
                  viewBox="0 0 20 20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M13 7L7 13M7 7l6 6" />
                  <path d="M19 10a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" strokeOpacity="0" />
                  <path d="M3 10L7 4h10v12H7l-4-6z" />
                </svg>
              </button>
            );
          }

          return (
            <button
              key={index}
              type="button"
              onClick={() => handleKey(key)}
              disabled={isSubmitting || pin.length >= PIN_LENGTH}
              className={cn(
                // 64px height — Tanya's sign-off dialpad spec
                "h-16 w-full rounded-[8px]",
                "border border-[#363D4E] bg-[#1A1E28]",
                "flex items-center justify-center",
                "text-[24px] font-semibold text-gray-100",
                "hover:bg-[#2E3445] hover:border-[#4A5264]",
                "active:bg-[#3A4155]",
                "transition-colors duration-75",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400",
                "disabled:opacity-30 disabled:cursor-not-allowed",
              )}
              aria-label={`Digit ${key}`}
            >
              {key}
            </button>
          );
        })}
      </div>

      {/* Status */}
      {isSubmitting ? (
        <div className="flex items-center gap-2 text-[13px] text-gray-400">
          <svg
            aria-hidden
            className="w-4 h-4 animate-spin text-blue-500"
            viewBox="0 0 24 24"
            fill="none"
          >
            <circle
              cx="12" cy="12" r="10"
              stroke="currentColor"
              strokeWidth="3"
              strokeOpacity="0.3"
            />
            <path
              d="M12 2a10 10 0 0 1 10 10"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
            />
          </svg>
          <span>Verifying signature…</span>
        </div>
      ) : (
        <p className="text-[12px] text-gray-600 text-center">
          Enter your {PIN_LENGTH}-digit PIN to confirm your identity.
          <br />
          Auto-submits when complete.
        </p>
      )}

      {/* Cancel */}
      {!isSubmitting && (
        <button
          type="button"
          onClick={onCancel}
          className="text-[13px] text-gray-500 hover:text-gray-300 transition-colors"
        >
          ← Back to confirmation
        </button>
      )}
    </div>
  );
}

/** Phase 3: Success — immutable signed block */
function SuccessPhase({
  signedBy,
  certNumber,
  signedAt,
  signatureId,
}: {
  signedBy: string;
  certNumber: string;
  signedAt: number;
  signatureId: string;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 mb-1">
        <svg
          aria-hidden
          className="w-5 h-5 text-green-400"
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="4,10 9,15 16,5" />
        </svg>
        <span className="text-[14px] font-semibold text-green-300">
          Signature recorded
        </span>
      </div>
      <SignedBlock
        signedBy={signedBy}
        certNumber={certNumber}
        signedAt={signedAt}
        signatureId={signatureId}
      />
    </div>
  );
}

/** Error phase */
function ErrorPhase({
  message,
  onRetry,
  onCancel,
}: {
  message: string;
  onRetry: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div
        className="rounded-[6px] border border-red-800/50 bg-red-950/30 px-4 py-4"
        role="alert"
      >
        <p className="text-[14px] font-semibold text-red-300 mb-1">
          Sign-off failed
        </p>
        <p className="text-[13px] text-red-400 leading-relaxed">{message}</p>
      </div>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onCancel}
          className={cn(
            "flex-1 h-12 rounded-[6px]",
            "border border-[#363D4E] bg-[#1A1E28]",
            "text-[14px] text-gray-400 hover:text-gray-200",
            "transition-colors duration-100",
          )}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onRetry}
          className={cn(
            "flex-[2] h-12 rounded-[6px]",
            "bg-blue-600 hover:bg-blue-700",
            "text-[14px] font-semibold text-white uppercase tracking-[0.04em]",
            "transition-colors duration-100",
          )}
        >
          Try Again
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

/**
 * SignOffFlow
 *
 * Mount this component when the user initiates a signing action.
 * It manages the full three-phase ceremony and calls `onSubmit` with the
 * server-verified signatureAuthEventId.
 *
 * The parent is responsible for the domain mutation call inside `onSubmit`.
 * Throw any error from `onSubmit` to trigger the error phase.
 */
export function SignOffFlow({
  recordDescription,
  certifyingStatement,
  signerName,
  certNumber,
  onSubmit,
  onCancel,
  existingSignature,
  context,
  className,
}: SignOffFlowProps) {
  const [phase, setPhase] = useState<Phase>(
    existingSignature ? "success" : "confirmation",
  );
  const [pinError, setPinError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [completedSignature, setCompletedSignature] =
    useState<ExistingSignature | null>(existingSignature ?? null);

  const descriptionId = useId();

  // Handle transition from confirmation → pin entry
  const handleProceedToPin = useCallback(() => {
    setPhase("pin_entry");
    setPinError(null);
  }, []);

  // Handle PIN submission — create signatureAuthEvent on server, then call parent onSubmit
  const handleSubmitPin = useCallback(
    async (pin: string) => {
      setIsSubmitting(true);
      setPinError(null);

      let signatureAuthEventId: string;

      try {
        // TODO: Replace with real Convex mutation call:
        // const createAuthEvent = useMutation(api.signatureAuthEvents.create);
        // signatureAuthEventId = await createAuthEvent({
        //   authMethod: "pin",
        //   pin,
        //   intendedTable: "taskCardSteps", // or whatever the parent specifies
        // });
        //
        // Stubbed until Jonas's signatureAuthEvents endpoint is live:
        signatureAuthEventId = `stub-auth-event-${Date.now()}`;
      } catch (err) {
        setIsSubmitting(false);
        const msg =
          err instanceof Error
            ? err.message
            : "Authentication failed. Please try again.";
        setPinError(msg);
        return;
      }

      // Phase 3: call parent's domain mutation
      setPhase("submitting");
      setIsSubmitting(false);

      try {
        await onSubmit(signatureAuthEventId);

        // On success: populate the signed block
        // In production, the parent should provide the real server-returned signature data.
        // Until Convex is live, we build the block from local context.
        setCompletedSignature({
          signedBy: signerName,
          certNumber,
          signedAt: Date.now(),
          signatureId: signatureAuthEventId,
        });
        setPhase("success");
      } catch (err) {
        const msg =
          err instanceof Error
            ? err.message
            : "Sign-off failed. Please try again.";

        // TOKEN_STALE: Convex requires re-auth
        if (msg.includes("TOKEN_STALE")) {
          setErrorMessage(
            "Your session needs to be refreshed before signing. Please sign in again and retry.",
          );
        } else {
          setErrorMessage(msg);
        }
        setPhase("error");
      }
    },
    [onSubmit, signerName, certNumber],
  );

  // Reset back to confirmation on retry
  const handleRetry = useCallback(() => {
    setPhase("confirmation");
    setErrorMessage(null);
    setPinError(null);
    setIsSubmitting(false);
  }, []);

  return (
    <div
      className={cn(
        "rounded-[8px] border border-[#363D4E] bg-[#1A1E28] px-5 py-5",
        className,
      )}
      aria-labelledby={descriptionId}
      role="region"
      aria-label="Signature sign-off"
    >
      {/* Phase indicator */}
      {phase !== "success" && phase !== "error" && (
        <div className="flex items-center gap-2 mb-4">
          {(
            [
              { key: "confirmation", label: "1. Confirm" },
              { key: "pin_entry", label: "2. Authenticate" },
              { key: "submitting", label: "3. Submit" },
            ] as const
          ).map(({ key, label }) => {
            const isActive =
              phase === key ||
              (phase === "submitting" && key === "submitting");
            const isPast =
              (key === "confirmation" && phase !== "confirmation") ||
              (key === "pin_entry" && (phase === "submitting" || phase === "success"));

            return (
              <React.Fragment key={key}>
                <span
                  className={cn(
                    "text-[11px] font-medium uppercase tracking-[0.04em]",
                    isActive ? "text-blue-400" : isPast ? "text-green-500" : "text-gray-600",
                  )}
                >
                  {label}
                </span>
                {key !== "submitting" && (
                  <span
                    className="text-gray-700 text-[11px]"
                    aria-hidden
                  >
                    →
                  </span>
                )}
              </React.Fragment>
            );
          })}
        </div>
      )}

      {/* Phase content */}
      {phase === "confirmation" && (
        <ConfirmationPhase
          recordDescription={recordDescription}
          certifyingStatement={certifyingStatement}
          signerName={signerName}
          certNumber={certNumber}
          context={context}
          onProceed={handleProceedToPin}
          onCancel={onCancel}
        />
      )}

      {phase === "pin_entry" && (
        <PinEntryPhase
          signerName={signerName}
          certNumber={certNumber}
          onSubmitPin={handleSubmitPin}
          onCancel={handleProceedToPin /* go back to confirmation */}
          isSubmitting={isSubmitting}
          error={pinError}
        />
      )}

      {phase === "submitting" && (
        <div className="flex flex-col items-center gap-3 py-6">
          <svg
            aria-hidden
            className="w-8 h-8 animate-spin text-blue-500"
            viewBox="0 0 24 24"
            fill="none"
          >
            <circle
              cx="12" cy="12" r="10"
              stroke="currentColor"
              strokeWidth="3"
              strokeOpacity="0.2"
            />
            <path
              d="M12 2a10 10 0 0 1 10 10"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
            />
          </svg>
          <p className="text-[14px] text-gray-400">Recording signature…</p>
          <p className="text-[12px] text-gray-600">Do not close this page.</p>
        </div>
      )}

      {phase === "success" && completedSignature && (
        <SuccessPhase
          signedBy={completedSignature.signedBy}
          certNumber={completedSignature.certNumber}
          signedAt={completedSignature.signedAt}
          signatureId={completedSignature.signatureId}
        />
      )}

      {phase === "error" && (
        <ErrorPhase
          message={errorMessage ?? "An unknown error occurred."}
          onRetry={handleRetry}
          onCancel={onCancel}
        />
      )}
    </div>
  );
}

export default SignOffFlow;
