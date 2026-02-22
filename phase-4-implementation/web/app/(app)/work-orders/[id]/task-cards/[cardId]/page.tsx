/**
 * app/(app)/work-orders/[id]/task-cards/[cardId]/page.tsx
 * Athelon — Task Card Detail Page
 *
 * Chloe Park, 2026-02-22
 *
 * The document a mechanic works against and signs off. Shows all steps with
 * their current state, the sign-off flow, and the final inspector sign-off.
 *
 * Route: /work-orders/[id]/task-cards/[cardId]
 *
 * Features:
 *   - Task card header: number, title, type, reference docs, assigned tech
 *   - Progress bar: steps completed / total
 *   - Steps list using TaskCardStep components (one per step, sequential)
 *   - Sign-off section at bottom — sticky on mobile when task is ready
 *   - Inspector sign-off (isAtLeast("inspector")) shown after all steps done
 *   - "Return to Work" button for cards in deferred/blocked state
 *   - Cannot-sign blocker banner when requirements not met
 *
 * Data:
 *   useQuery(api.taskCards.get, { id: cardId })
 *   useQuery(api.taskCardSteps.listByTaskCard, { taskCardId: cardId })
 *
 * Sign-off uses SignOffFlow component (components/SignOffFlow.tsx).
 *
 * Role gates:
 *   - Sign steps: userCanSign = can("signTaskCard")
 *   - Inspector sign-off: isAtLeast("inspector")
 *   - Return to work button: isAtLeast("supervisor")
 */

"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { cn } from "@/lib/utils";
import {
  StatusBadge,
  taskCardStatusToVariant,
} from "@/components/StatusBadge";
import { TaskCardStep, type TaskCardStepDoc } from "@/components/TaskCardStep";
import { SignOffFlow } from "@/components/SignOffFlow";
import { useOrgRole } from "@/lib/auth";

// TODO: Replace with real import once Convex is deployed.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const api = {} as any;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TaskCardDetail {
  _id: string;
  _creationTime: number;
  workOrderId: string;
  workOrderNumber: string;        // Denormalized
  aircraftId: string;
  tailNumber: string;             // Denormalized
  organizationId: string;
  taskCardNumber: string;
  title: string;
  taskType: string;
  approvedDataSource: string;
  approvedDataRevision?: string;
  assignedToTechnicianId?: string;
  assignedTechName?: string;      // Denormalized
  status: string;
  startedAt?: number;
  completedAt?: number;
  stepCount: number;
  completedStepCount: number;
  naStepCount: number;
  notes?: string;
  // Computed by server:
  signOffReady: boolean;          // All prerequisites met to sign
  signOffBlockReason?: string;    // Why sign-off is blocked (if any)
  requiresInspector: boolean;     // Any step needs IA
  inspectorSignedAt?: number;
  inspectorSignedBy?: string;
  inspectorCertNumber?: string;
  inspectorSignatureId?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

function formatZulu(ms: number): string {
  const dt = new Date(ms);
  return `${dt.toISOString().slice(0, 10)} ${dt.toISOString().slice(11, 16)}Z`;
}

const TASK_TYPE_LABELS: Record<string, string> = {
  inspection: "Inspection",
  repair: "Repair",
  replacement: "Replacement",
  ad_compliance: "AD Compliance",
  functional_check: "Functional Check",
  rigging: "Rigging",
  return_to_service: "Return to Service",
  overhaul: "Overhaul",
  modification: "Modification",
};

// ---------------------------------------------------------------------------
// Skeletons
// ---------------------------------------------------------------------------

function TaskCardHeaderSkeleton() {
  return (
    <div className="animate-pulse px-4 pt-5 pb-4 sm:px-6 border-b border-[#363D4E]">
      <div className="h-4 w-36 rounded bg-[#2E3445] mb-4" />
      <div className="flex gap-2 mb-3">
        <div className="h-5 w-16 rounded bg-[#2E3445]" />
        <div className="h-5 w-20 rounded bg-[#2E3445]" />
      </div>
      <div className="h-6 w-80 rounded bg-[#2E3445] mb-2" />
      <div className="h-4 w-56 rounded bg-[#242936] mb-1" />
      <div className="h-4 w-40 rounded bg-[#242936]" />
    </div>
  );
}

function StepsListSkeleton() {
  return (
    <div
      className="flex flex-col gap-3 animate-pulse"
      aria-busy="true"
      aria-label="Loading task steps"
    >
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="rounded-[8px] border border-[#363D4E] bg-[#1A1E28] px-4 py-3.5"
        >
          <div className="flex items-start gap-3">
            <div className="h-4 w-5 rounded bg-[#2E3445] shrink-0 mt-1" />
            <div className="flex-1">
              <div className="h-4 w-3/4 rounded bg-[#2E3445] mb-2" />
              <div className="h-3 w-1/2 rounded bg-[#242936]" />
            </div>
            <div className="h-5 w-5 rounded-full bg-[#2E3445] shrink-0" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Progress bar
// ---------------------------------------------------------------------------

function StepProgressBar({
  total,
  completed,
  na,
}: {
  total: number;
  completed: number;
  na: number;
}) {
  if (total === 0) return null;

  const completedPct = (completed / total) * 100;
  const naPct = (na / total) * 100;
  const allDone = completed + na >= total;

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[12px] text-gray-500">
          Progress
        </span>
        <span
          className={cn(
            "text-[12px] tabular-nums font-medium",
            allDone ? "text-green-400" : "text-gray-400",
          )}
        >
          {completed}/{total} steps
          {na > 0 && <span className="text-gray-600 ml-1">({na} N/A)</span>}
        </span>
      </div>
      <div
        className="h-1.5 rounded-full bg-[#363D4E] overflow-hidden"
        role="progressbar"
        aria-valuenow={completed}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-label={`${completed} of ${total} steps completed`}
      >
        {/* Completed portion */}
        <div
          className="h-full float-left bg-green-600 transition-all duration-300"
          style={{ width: `${completedPct}%` }}
        />
        {/* N/A portion */}
        <div
          className="h-full float-left bg-gray-600 transition-all duration-300"
          style={{ width: `${naPct}%` }}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Cannot-sign blocker banner
// ---------------------------------------------------------------------------

function SignOffBlockedBanner({ reason }: { reason: string }) {
  return (
    <div
      className="rounded-[6px] border border-amber-800/50 bg-amber-950/20 px-4 py-4"
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        <svg
          aria-hidden
          className="w-5 h-5 text-amber-400 shrink-0 mt-0.5"
          viewBox="0 0 10 9"
          fill="currentColor"
        >
          <path d="M5 0.5L9.5 8.5H0.5L5 0.5Z" />
          <rect x="4.25" y="3.5" width="1.5" height="2.5" fill="#451a03" rx="0.25" />
          <rect x="4.25" y="6.5" width="1.5" height="1.5" fill="#451a03" rx="0.25" />
        </svg>
        <div>
          <p className="text-[13px] font-semibold text-amber-300 mb-0.5">
            Cannot sign off yet
          </p>
          <p className="text-[13px] text-amber-400 leading-relaxed">{reason}</p>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Inspector sign-off section
// ---------------------------------------------------------------------------

function InspectorSignOffSection({
  taskCard,
  canSignAsInspector,
  signerName,
  certNumber,
}: {
  taskCard: TaskCardDetail;
  canSignAsInspector: boolean;
  signerName: string;
  certNumber: string;
}) {
  const [showSignOff, setShowSignOff] = useState(false);

  // Already inspector-signed
  if (taskCard.inspectorSignedAt && taskCard.inspectorSignedBy) {
    return (
      <div>
        <h3 className="text-[13px] font-semibold text-gray-400 uppercase tracking-[0.04em] mb-3">
          Inspector Sign-Off
        </h3>
        <div className="rounded-[6px] border border-green-800/50 bg-green-950/20 px-4 py-4">
          <div className="flex items-center gap-2 mb-2">
            <svg className="w-4 h-4 text-green-400" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <polyline points="3,8 7,12 13,4" />
            </svg>
            <span className="text-[13px] font-semibold text-green-300">Inspector Approved</span>
          </div>
          <p className="text-[14px] text-gray-200">{taskCard.inspectorSignedBy}</p>
          {taskCard.inspectorCertNumber && (
            <p className="text-[12px] font-mono text-gray-500">{taskCard.inspectorCertNumber}</p>
          )}
          <p className="text-[12px] font-mono text-gray-400 mt-1">
            {formatZulu(taskCard.inspectorSignedAt)}
          </p>
          {taskCard.inspectorSignatureId && (
            <p className="text-[11px] font-mono text-gray-600 mt-1.5 break-all">
              {taskCard.inspectorSignatureId}
            </p>
          )}
          <p className="text-[11px] text-gray-600 mt-1">
            This record is cryptographically locked.
          </p>
        </div>
      </div>
    );
  }

  if (!taskCard.requiresInspector) return null;

  return (
    <div>
      <h3 className="text-[13px] font-semibold text-gray-400 uppercase tracking-[0.04em] mb-3">
        Inspector Sign-Off Required
      </h3>

      {taskCard.status !== "complete" ? (
        <div className="rounded-[6px] border border-[#363D4E] bg-[#1A1E28] px-4 py-3 text-[13px] text-gray-500">
          Inspector sign-off will be available after all steps are complete.
        </div>
      ) : !canSignAsInspector ? (
        <div className="rounded-[6px] border border-[#363D4E] bg-[#1A1E28] px-4 py-3 text-[13px] text-gray-500">
          Awaiting inspector sign-off. An Inspector or DOM must sign.
        </div>
      ) : showSignOff ? (
        <SignOffFlow
          recordDescription={`${taskCard.taskCardNumber} — ${taskCard.title}`}
          certifyingStatement={`I certify that ${taskCard.title} was inspected and found to be in an airworthy condition, performed in accordance with ${taskCard.approvedDataSource}${taskCard.approvedDataRevision ? ` Rev. ${taskCard.approvedDataRevision}` : ""} on ${taskCard.tailNumber}.`}
          signerName={signerName}
          certNumber={certNumber}
          context="Inspector Sign-Off"
          onSubmit={async (signatureAuthEventId) => {
            // TODO: Wire to real Convex mutation:
            // await inspectorSignTaskCard({ taskCardId: taskCard._id, signatureAuthEventId });
            throw new Error("Inspector sign mutation not yet wired — stub");
          }}
          onCancel={() => setShowSignOff(false)}
        />
      ) : (
        <button
          type="button"
          onClick={() => setShowSignOff(true)}
          className={cn(
            "w-full h-14 rounded-[6px]",
            "border-2 border-blue-600 bg-blue-950/20",
            "text-[14px] font-semibold text-blue-300 uppercase tracking-[0.04em]",
            "hover:bg-blue-950/40 active:bg-blue-950/60",
            "transition-colors duration-100",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400",
          )}
        >
          Inspector Sign-Off
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default function TaskCardDetailPage() {
  const params = useParams<{ id: string; cardId: string }>();
  const { id: workOrderId, cardId } = params;

  const { can, isAtLeast, isLoaded, displayName, rawClaims } = useOrgRole();

  const [showTaskCardSignOff, setShowTaskCardSignOff] = useState(false);

  // ── Data queries ──
  const taskCard = useQuery(
    api.taskCards?.get ?? null,
    cardId ? { id: cardId } : "skip",
  ) as TaskCardDetail | undefined;

  const steps = useQuery(
    api.taskCardSteps?.listByTaskCard ?? null,
    cardId ? { taskCardId: cardId } : "skip",
  ) as TaskCardStepDoc[] | undefined;

  // ── Derived state ──
  const userCanSign = isLoaded && can("signTaskCard");
  const canReturnToWork = isLoaded && isAtLeast("supervisor");
  const canSignAsInspector = isLoaded && isAtLeast("inspector");

  // First unsigned step index (for isNextToSign prop)
  const nextUnsignedStepIndex = useMemo(() => {
    if (!steps) return -1;
    return steps.findIndex(
      (s) => s.status !== "signed" && s.status !== "na",
    );
  }, [steps]);

  // Signer name and cert number from JWT claims (fallback to role display)
  const signerName =
    (rawClaims?.legalName as string | undefined) ?? displayName ?? "Unknown";
  const certNumber =
    (rawClaims?.certNumber as string | undefined) ?? "Certificate on record";

  // Whether we should show the sticky sign-off bar at the bottom
  const isLoading = taskCard === undefined || steps === undefined;
  const isComplete = taskCard?.status === "complete";
  const isDeferred = taskCard?.status === "not_started" || taskCard?.status === "voided";
  const isReadyToSign = taskCard?.signOffReady === true && !isComplete;

  // Return to work mutation (supervisor+)
  const returnToWork = useMutation(api.taskCards?.returnToWork ?? null);

  // ── Render ──
  return (
    <div className="flex flex-col h-full min-h-0">
      {/* ── Header ── */}
      {isLoading && taskCard === undefined ? (
        <TaskCardHeaderSkeleton />
      ) : taskCard ? (
        <div className="px-4 pt-5 pb-4 sm:px-6 border-b border-[#363D4E]">
          {/* Back link */}
          <Link
            href={`/work-orders/${workOrderId}`}
            className="inline-flex items-center gap-1.5 text-[12px] text-gray-500 hover:text-gray-300 transition-colors mb-3"
          >
            <svg aria-hidden className="w-3.5 h-3.5" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="8,2 4,6 8,10" />
            </svg>
            <span className="font-mono text-gray-600">{taskCard.workOrderNumber}</span>
          </Link>

          {/* Card number + status */}
          <div className="flex flex-wrap items-center gap-2.5 mb-2">
            <span className="font-mono text-[13px] text-gray-400">
              {taskCard.taskCardNumber}
            </span>
            <StatusBadge
              variant={taskCardStatusToVariant(taskCard.status)}
              size="sm"
            />
            <span className="text-[12px] text-gray-600">
              {TASK_TYPE_LABELS[taskCard.taskType] ?? taskCard.taskType}
            </span>
          </div>

          {/* Title */}
          <h1 className="text-[20px] font-semibold text-gray-100 leading-snug mb-2">
            {taskCard.title}
          </h1>

          {/* Reference + aircraft */}
          <div className="space-y-1 mb-3">
            <p className="text-[13px] text-gray-400">
              <span className="text-gray-600">Ref: </span>
              {taskCard.approvedDataSource}
              {taskCard.approvedDataRevision && (
                <span className="text-gray-600"> Rev. {taskCard.approvedDataRevision}</span>
              )}
            </p>
            <p className="text-[13px] text-gray-500">
              Aircraft: <span className="text-gray-400 font-medium">{taskCard.tailNumber}</span>
            </p>
            {taskCard.assignedTechName && (
              <p className="text-[13px] text-gray-500">
                Assigned: <span className="text-gray-400">{taskCard.assignedTechName}</span>
              </p>
            )}
          </div>

          {/* Progress bar */}
          <StepProgressBar
            total={taskCard.stepCount}
            completed={taskCard.completedStepCount}
            na={taskCard.naStepCount}
          />

          {/* Completed / started timestamps */}
          {(taskCard.startedAt || taskCard.completedAt) && (
            <div className="flex gap-4 mt-2">
              {taskCard.startedAt && (
                <p className="text-[11px] text-gray-600 tabular-nums">
                  Started {formatDate(taskCard.startedAt)}
                </p>
              )}
              {taskCard.completedAt && (
                <p className="text-[11px] text-green-600 tabular-nums">
                  Completed {formatDate(taskCard.completedAt)}
                </p>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center flex-1 px-4 py-16">
          <p className="text-[16px] text-gray-400 mb-2">Task card not found</p>
          <Link href={`/work-orders/${workOrderId}`} className="text-[14px] text-blue-400 hover:text-blue-300">
            ← Back to Work Order
          </Link>
        </div>
      )}

      {/* ── Steps list ── */}
      {taskCard && (
        <div
          className={cn(
            "flex-1 overflow-y-auto px-4 pt-4 sm:px-6",
            isReadyToSign || taskCard.signOffBlockReason
              ? "pb-40" // extra space for sticky bottom sign-off bar
              : "pb-8",
          )}
        >
          {/* Steps heading */}
          <h2 className="text-[13px] font-semibold text-gray-500 uppercase tracking-[0.04em] mb-3">
            Steps
          </h2>

          {/* Steps */}
          {steps === undefined ? (
            <StepsListSkeleton />
          ) : steps.length === 0 ? (
            <div className="rounded-[6px] border border-[#363D4E] border-dashed flex flex-col items-center py-10 px-4 text-center">
              <p className="text-[14px] text-gray-500">No steps defined for this task card.</p>
              <p className="text-[12px] text-gray-600 mt-1">
                Steps are added when the task card template is created.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {steps.map((step, index) => (
                <TaskCardStep
                  key={step._id}
                  step={step}
                  taskCardSignOffReady={taskCard.signOffReady}
                  isNextToSign={index === nextUnsignedStepIndex}
                  userCanSign={userCanSign}
                />
              ))}
            </div>
          )}

          {/* Notes */}
          {taskCard.notes && taskCard.notes.trim() !== "" && (
            <div className="mt-6">
              <h3 className="text-[12px] font-semibold text-gray-600 uppercase tracking-[0.04em] mb-2">
                Task Notes
              </h3>
              <p className="text-[14px] text-gray-400 leading-relaxed whitespace-pre-wrap">
                {taskCard.notes}
              </p>
            </div>
          )}

          {/* Inspector sign-off section (shown below steps) */}
          {taskCard && steps !== undefined && !isLoading && (
            <div className="mt-8">
              <InspectorSignOffSection
                taskCard={taskCard}
                canSignAsInspector={canSignAsInspector}
                signerName={signerName}
                certNumber={certNumber}
              />
            </div>
          )}

          {/* Full task card sign-off section (after all steps signed) */}
          {taskCard && steps !== undefined && isReadyToSign && !showTaskCardSignOff && (
            <div className="mt-6 pb-2">
              <div className="rounded-[8px] border border-blue-700/40 bg-blue-950/20 px-5 py-5">
                <div className="flex items-center gap-2 mb-3">
                  <svg aria-hidden className="w-4 h-4 text-blue-400" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 2L13 4L5 12L2 13L3 10L11 2Z" />
                  </svg>
                  <span className="text-[13px] font-semibold text-blue-300 uppercase tracking-[0.04em]">
                    Ready to Sign Off
                  </span>
                </div>
                <p className="text-[13px] text-gray-400 mb-4 leading-relaxed">
                  All {taskCard.stepCount} steps are complete. Sign off to certify this task card.
                </p>
                {userCanSign ? (
                  <button
                    type="button"
                    onClick={() => setShowTaskCardSignOff(true)}
                    className={cn(
                      "w-full h-14 rounded-[6px]",
                      "bg-blue-600 hover:bg-blue-700 active:bg-blue-800",
                      "text-[15px] font-semibold text-white uppercase tracking-[0.04em]",
                      "transition-colors duration-100",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400",
                    )}
                  >
                    Sign Off Task Card
                  </button>
                ) : (
                  <p className="text-[13px] text-gray-500">
                    You do not have permission to sign task cards.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Sign-off flow (expanded) */}
          {showTaskCardSignOff && taskCard && (
            <div className="mt-6 pb-2">
              <SignOffFlow
                recordDescription={`${taskCard.taskCardNumber} — ${taskCard.title}`}
                certifyingStatement={`I certify that all work required by ${taskCard.title} was performed in accordance with ${taskCard.approvedDataSource}${taskCard.approvedDataRevision ? ` Rev. ${taskCard.approvedDataRevision}` : ""} on ${taskCard.tailNumber}.`}
                signerName={signerName}
                certNumber={certNumber}
                context={`${taskCard.completedStepCount + taskCard.naStepCount} of ${taskCard.stepCount} steps completed`}
                onSubmit={async (signatureAuthEventId) => {
                  // TODO: Wire to real Convex mutation once deployed:
                  // await completeTaskCard({ taskCardId: taskCard._id, signatureAuthEventId });
                  throw new Error("completeTaskCard mutation not yet wired — stub");
                }}
                onCancel={() => setShowTaskCardSignOff(false)}
              />
            </div>
          )}

          {/* Blocker banner — shown when task card sign-off is blocked */}
          {taskCard.signOffBlockReason && !isComplete && !showTaskCardSignOff && (
            <div className="mt-6">
              <SignOffBlockedBanner reason={taskCard.signOffBlockReason} />
            </div>
          )}

          {/* Return to work button — for deferred/voided cards */}
          {(taskCard.status === "voided") && canReturnToWork && (
            <div className="mt-6">
              <div className="rounded-[6px] border border-[#363D4E] bg-[#1A1E28] px-4 py-4">
                <p className="text-[13px] text-gray-400 mb-3">
                  This task card has been voided. Supervisors can reactivate it if the work needs to be performed.
                </p>
                <button
                  type="button"
                  onClick={async () => {
                    // TODO: Wire to real mutation:
                    // await returnToWork({ taskCardId: taskCard._id });
                    console.log("Return to work — stub");
                  }}
                  className={cn(
                    "w-full h-12 rounded-[6px]",
                    "border border-amber-600/60 bg-amber-950/20",
                    "text-[14px] font-semibold text-amber-300 uppercase tracking-[0.04em]",
                    "hover:bg-amber-950/40 transition-colors duration-100",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400",
                  )}
                >
                  Return to Work
                </button>
              </div>
            </div>
          )}

          {/* Complete badge */}
          {isComplete && (
            <div className="mt-8 rounded-[8px] border border-green-800/50 bg-green-950/20 px-5 py-5">
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
                  Task Card Complete
                </span>
              </div>
              {taskCard.completedAt && (
                <p className="text-[13px] text-gray-500 tabular-nums">
                  Completed {formatZulu(taskCard.completedAt)}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Sticky bottom sign-off bar for mobile (when ready to sign, not yet shown inline) ── */}
      {/* Per Tanya's spec §4.6: "sticky bottom bar that appears when signOffReady === true" */}
      {taskCard && isReadyToSign && !showTaskCardSignOff && !isComplete && userCanSign && (
        <div className="fixed bottom-0 left-0 right-0 z-[50] sm:hidden border-t border-blue-700/40 bg-[#0F1117]/95 backdrop-blur-sm px-4 py-3">
          <button
            type="button"
            onClick={() => {
              setShowTaskCardSignOff(true);
              // Scroll to the sign-off section
              window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
            }}
            className={cn(
              "w-full h-14 rounded-[6px]",
              "bg-blue-600 hover:bg-blue-700",
              "text-[15px] font-semibold text-white uppercase tracking-[0.04em]",
              "transition-colors duration-100",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400",
            )}
          >
            Sign Off Task Card
          </button>
        </div>
      )}
    </div>
  );
}
