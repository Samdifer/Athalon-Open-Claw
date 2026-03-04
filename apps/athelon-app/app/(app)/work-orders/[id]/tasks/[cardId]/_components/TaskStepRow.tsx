"use client";

/**
 * TaskStepRow.tsx
 * Extracted from tasks/[cardId]/page.tsx (TD-009).
 * Updated: GAP-18 (Start/in-progress), GAP-07 (add step support).
 * Renders a single step row (status icon, description, sign-off info, sign/start button).
 */

import { useState, useEffect } from "react";
import {
  CheckCircle2,
  Circle,
  Minus,
  PenLine,
  Play,
  Loader2,
  SlashSquare,
  Clock,
  Square,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { Id } from "@/convex/_generated/dataModel";
import { formatDateTime } from "@/lib/format";

// ─── Utility: format elapsed milliseconds as H:MM:SS ─────────────────────────

function formatElapsed(ms: number): string {
  const totalSec = Math.floor(Math.max(0, ms) / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// ─── Prop types ───────────────────────────────────────────────────────────────

export interface TaskStepRowProps {
  step: {
    _id: string;
    stepNumber: number;
    description: string;
    status: string;
    signOffRequiresIa: boolean;
    requiresSpecialTool: boolean;
    specialToolReference?: string | null;
    signerName?: string | null;
    signedAt?: number | null;
    signedCertificateNumber?: string | null;
    naReason?: string | null;
    naAuthorizerName?: string | null;
    notes?: string | null;
    startedAt?: number | null;
  };
  idx: number;
  cardIsVoided: boolean;
  cardIsComplete: boolean;
  orgId: Id<"organizations"> | undefined;
  techId: Id<"technicians"> | undefined;
  onSignClick: (step: {
    stepId: Id<"taskCardSteps">;
    stepNumber: number;
    description: string;
    requiresIa: boolean;
  }) => void;
  onStartClick?: (stepId: Id<"taskCardSteps">) => void;
  /** True only when THIS SPECIFIC STEP's start mutation is in-flight.
   *  Controls the spinner on this row's Start button.
   *  BUG-LT-HUNT-081: Previously page.tsx passed isAnyStepStarting to every
   *  row via this prop, so ALL pending step Start buttons showed the Loader2
   *  spinner whenever any one step was being started — confusing for a tech
   *  who clicked Start on Step 3 and saw Steps 1, 4, and 5 also spinning. */
  isStarting?: boolean;
  /** True when ANY step action is in-flight (not necessarily this row's).
   *  Disables all action buttons (Start, N/A, Sign) without showing a spinner
   *  on rows that are NOT the active mutation target.
   *  BUG-LT-HUNT-081: Separating this from isStarting lets us block race-
   *  condition clicks on other rows while keeping the spinner scoped to the
   *  one row that is actually mutating. */
  anyMutationPending?: boolean;
  /** Called when the tech clicks "N/A" on a pending step. */
  onNaClick?: (step: {
    stepId: Id<"taskCardSteps">;
    stepNumber: number;
    description: string;
  }) => void;
  onStepTimerClick?: (stepId: Id<"taskCardSteps">) => void;
  isStepTimerActive?: boolean;
  isStepTimerBusy?: boolean;
  /** BUG-LT-HUNT-076: Unix ms timestamp when the active step timer started.
   *  When provided and isStepTimerActive=true, displays a live elapsed counter
   *  on the "Stop Clock" button so the tech can see at a glance how long
   *  they've been clocked on this step without navigating to Time Clock. */
  stepTimerClockInAt?: number;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function TaskStepRow({
  step,
  idx,
  cardIsVoided,
  cardIsComplete,
  orgId,
  techId,
  onSignClick,
  onStartClick,
  isStarting,
  anyMutationPending,
  onNaClick,
  onStepTimerClick,
  isStepTimerActive,
  isStepTimerBusy,
  stepTimerClockInAt,
}: TaskStepRowProps) {
  const isInProgress = step.status === "in_progress";
  const isPending = step.status === "pending";

  // BUG-LT-HUNT-076: Live elapsed counter for the active step timer.
  // Ticks every second while the step timer is running. Clears on stop.
  const [stepElapsedMs, setStepElapsedMs] = useState<number>(0);
  useEffect(() => {
    if (!isStepTimerActive || !stepTimerClockInAt) {
      setStepElapsedMs(0);
      return;
    }
    setStepElapsedMs(Date.now() - stepTimerClockInAt);
    const id = setInterval(() => {
      setStepElapsedMs(Date.now() - stepTimerClockInAt);
    }, 1000);
    return () => clearInterval(id);
  }, [isStepTimerActive, stepTimerClockInAt]);

  return (
    <div>
      {idx > 0 && <Separator className="opacity-20 my-0" />}
      <div className="py-3 flex items-start gap-2 sm:gap-3">
        {/* Status icon */}
        <div className="flex-shrink-0 mt-0.5">
          {step.status === "completed" ? (
            <CheckCircle2 className="w-5 h-5 text-green-400" />
          ) : step.status === "na" ? (
            <Minus className="w-5 h-5 text-muted-foreground" />
          ) : isInProgress ? (
            <Loader2 className="w-5 h-5 text-yellow-400 animate-spin" />
          ) : (
            <Circle className="w-5 h-5 text-muted-foreground/40" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
            <span className="text-xs font-medium text-muted-foreground">
              Step {step.stepNumber}
            </span>
            {isInProgress && (
              <Badge className="bg-yellow-500/15 text-yellow-400 border border-yellow-500/30 text-[9px]">
                In Progress
              </Badge>
            )}
            {step.signOffRequiresIa && (
              <Badge className="bg-amber-500/15 text-amber-400 border border-amber-500/30 text-[9px]">
                IA Required
              </Badge>
            )}
            {step.requiresSpecialTool && step.specialToolReference && (
              <Badge
                variant="outline"
                className="text-[9px] border-border/40 text-muted-foreground"
              >
                Tool: {step.specialToolReference}
              </Badge>
            )}
          </div>
          <p className="text-sm text-foreground">{step.description}</p>

          {/* In-progress info */}
          {isInProgress && step.startedAt && (
            <div className="mt-1 flex items-center gap-1.5 text-[11px] text-yellow-400/80">
              <Play className="w-3 h-3" />
              Started {formatDateTime(step.startedAt)}
            </div>
          )}

          {/* Sign-off info */}
          {step.status === "completed" && (
            <div className="mt-1 flex items-center gap-1.5 text-[11px] text-green-400/80">
              <CheckCircle2 className="w-3 h-3" />
              {step.signerName ? `Signed by ${step.signerName}` : "Signed"}
              {step.signedAt && (
                <span className="text-muted-foreground/60">
                  ·{" "}
                  {formatDateTime(step.signedAt)}
                </span>
              )}
              {step.signedCertificateNumber && (
                <span className="font-mono text-[10px] text-muted-foreground/60">
                  #{step.signedCertificateNumber}
                </span>
              )}
            </div>
          )}
          {step.status === "na" && (
            <div className="mt-1 text-[11px] text-muted-foreground">
              N/A: {step.naReason}
              {step.naAuthorizerName && (
                <span className="ml-1">· Auth: {step.naAuthorizerName}</span>
              )}
            </div>
          )}
          {step.notes && step.status !== "pending" && (
            <p className="text-[11px] text-muted-foreground mt-0.5 italic">
              Note: {step.notes}
            </p>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1.5 flex-shrink-0 flex-wrap">
          {(isPending || isInProgress) &&
            !cardIsVoided &&
            !cardIsComplete &&
            orgId &&
            techId &&
            onStepTimerClick && (
              <Button
                variant="outline"
                size="sm"
                className={`h-7 text-xs gap-1 border ${
                  isStepTimerActive
                    ? "border-red-500/40 text-red-400 hover:bg-red-500/10"
                    : "border-green-500/40 text-green-400 hover:bg-green-500/10"
                }`}
                disabled={isStepTimerBusy}
                onClick={() => onStepTimerClick(step._id as Id<"taskCardSteps">)}
                aria-label={`${isStepTimerActive ? "Stop" : "Start"} step timer ${step.stepNumber}`}
              >
                {isStepTimerBusy ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : isStepTimerActive ? (
                  <Square className="w-3 h-3" />
                ) : (
                  <Clock className="w-3 h-3" />
                )}
                {isStepTimerActive
                  ? stepElapsedMs > 0
                    ? formatElapsed(stepElapsedMs)
                    : "Stop Clock"
                  : "Clock Step"}
              </Button>
            )}

          {/* Start button — for pending steps (GAP-18) */}
          {isPending &&
            !cardIsVoided &&
            !cardIsComplete &&
            orgId &&
            techId &&
            onStartClick && (
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1 border-yellow-500/40 text-yellow-400 hover:bg-yellow-500/10"
                // BUG-LT-HUNT-081: disabled uses anyMutationPending (not
                // isStarting) so OTHER steps' mutations also lock this button.
                // But the spinner is scoped to isStarting — only THIS row
                // shows the spinner when it's the one being started.
                disabled={isStarting || (anyMutationPending ?? false)}
                onClick={() => onStartClick(step._id as Id<"taskCardSteps">)}
                aria-label={`Start step ${step.stepNumber}`}
              >
                {isStarting ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Play className="w-3 h-3" />
                )}
                Start
              </Button>
            )}

          {/* N/A button — for pending or in_progress steps.
              BUG-LT-004: Previously only showed for pending steps. A tech who
              accidentally clicked "Start" on the wrong step had NO path to mark
              it N/A — they were stuck. The step remained in_progress forever
              unless signed (which creates a false maintenance record) or the
              entire card was voided. Extending N/A to in_progress steps lets
              the tech recover gracefully: "I started this step then realized
              the aircraft doesn't have this system." */}
          {/* BUG-LT-071: N/A button must be disabled when isStarting is true.
              If a start mutation is in-flight for this step, clicking N/A opens
              the MarkNaDialog. If the tech submits the N/A before the start
              resolves, the start mutation may succeed (step → in_progress) just
              as the N/A fires — two conflicting mutations on the same step.
              The backend may process both, leaving the step in an ambiguous
              state, or reject the N/A with "step already in_progress" after
              the mark_na payload was already sent. Either way the tech sees a
              confusing error or incorrect step state on a permanent maintenance
              record. Disabled state matches the Start button pattern. */}
          {(isPending || isInProgress) &&
            !cardIsVoided &&
            !cardIsComplete &&
            orgId &&
            techId &&
            onNaClick && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs flex-shrink-0 gap-1 text-muted-foreground hover:text-foreground border border-dashed border-border/40 hover:border-border/70"
                disabled={isStarting || (anyMutationPending ?? false)}
                onClick={() =>
                  onNaClick({
                    stepId: step._id as Id<"taskCardSteps">,
                    stepNumber: step.stepNumber,
                    description: step.description,
                  })
                }
                aria-label={`Mark step ${step.stepNumber} as not applicable`}
              >
                <SlashSquare className="w-3 h-3" />
                N/A
              </Button>
            )}

          {/* Sign button — for pending or in_progress steps.
              BUG-LT-070: Sign button must be disabled when isStarting is true.
              If a start mutation is in-flight for this step, the step is still
              in `pending` state from the frontend's perspective. Clicking Sign
              opens the SignStepDialog; if the tech enters their PIN and submits
              before the start resolves, the backend receives a completeStep
              call on a `pending` step (not `in_progress`), which it rejects.
              The tech then gets a confusing "step not in progress" error after
              consuming their 5-minute auth event. Even for in_progress steps,
              having two concurrent mutations (start + sign) is a race condition.
              Disabled state matches the N/A and Start button patterns. */}
          {(isPending || isInProgress) &&
            !cardIsVoided &&
            !cardIsComplete &&
            orgId &&
            techId && (
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs flex-shrink-0 gap-1 border-border/60"
                disabled={isStarting || (anyMutationPending ?? false)}
                onClick={() =>
                  onSignClick({
                    stepId: step._id as Id<"taskCardSteps">,
                    stepNumber: step.stepNumber,
                    description: step.description,
                    requiresIa: step.signOffRequiresIa,
                  })
                }
              >
                <PenLine className="w-3 h-3" />
                Sign
              </Button>
            )}
        </div>
      </div>
    </div>
  );
}
