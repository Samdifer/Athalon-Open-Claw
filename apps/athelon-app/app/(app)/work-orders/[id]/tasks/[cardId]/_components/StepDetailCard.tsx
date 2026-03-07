"use client";

import { useState } from "react";
import {
  ChevronDown,
  CheckCircle2,
  Circle,
  Minus,
  Loader2,
  ShieldCheck,
  Play,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { formatDateTime } from "@/lib/format";
import { WriteUpTimeline, type WriteUpEntry } from "../../../_components/WriteUpTimeline";
import {
  STEP_AUTHORIZATION_META,
  type StepAuthorizationType,
} from "./stepAuthorization";
import type { Id } from "@/convex/_generated/dataModel";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface StepDetailData {
  _id: string;
  stepNumber: number;
  description: string;
  status: string;
  signOffRequired: boolean;
  signOffRequiresIa: boolean;
  requiredAuthorizationType: StepAuthorizationType;
  requiredAuthorizationLabel: string;
  requiresSpecialTool: boolean;
  specialToolReference?: string | null;
  signerName?: string | null;
  signedAt?: number | null;
  signedCertificateNumber?: string | null;
  naReason?: string | null;
  naAuthorizerName?: string | null;
  notes?: string | null;
  startedAt?: number | null;
  stepDiscrepancySummary?: string | null;
  stepCorrectiveActionSummary?: string | null;
  // Measurements
  measurementSpec?: { name: string; unit: string; minValue?: number; maxValue?: number } | null;
  measurements?: Array<{ value: number; withinLimits: boolean }>;
  // Parts
  partsRemoved?: Array<{ partNumber: string; serialNumber?: string; description: string; quantity: number }>;
  partsInstalled?: Array<{ partNumber: string; serialNumber?: string; description: string; quantity: number }>;
}

export interface StepDetailCardProps {
  step: StepDetailData;
  discrepancyEntries: WriteUpEntry[];
  correctiveActionEntries: WriteUpEntry[];
  onAddDiscrepancyEntry: (stepId: string, text: string) => void;
  onAddCorrectiveActionEntry: (stepId: string, text: string) => void;
  onSignClick?: (step: {
    stepId: Id<"taskCardSteps">;
    stepNumber: number;
    description: string;
    requiresIa: boolean;
    requiredAuthorizationType: StepAuthorizationType;
  }) => void;
  onNaClick?: (step: {
    stepId: Id<"taskCardSteps">;
    stepNumber: number;
    description: string;
  }) => void;
  cardIsVoided?: boolean;
  cardIsComplete?: boolean;
  readOnly?: boolean;
  isSubmitting?: boolean;
  defaultOpen?: boolean;
}

// ─── Status icon helper ─────────────────────────────────────────────────────

function StepStatusIcon({ status }: { status: string }) {
  switch (status) {
    case "completed":
      return <CheckCircle2 className="w-5 h-5 text-green-400" />;
    case "na":
      return <Minus className="w-5 h-5 text-muted-foreground" />;
    case "in_progress":
      return <Loader2 className="w-5 h-5 text-yellow-400 animate-spin" />;
    default:
      return <Circle className="w-5 h-5 text-muted-foreground/40" />;
  }
}

const STATUS_LABEL: Record<string, string> = {
  pending: "Pending",
  in_progress: "In Progress",
  completed: "Complete",
  na: "N/A",
};

const STATUS_STYLE: Record<string, string> = {
  pending: "bg-slate-500/15 text-slate-400 border-slate-500/30",
  in_progress: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  completed: "bg-green-500/15 text-green-400 border-green-500/30",
  na: "bg-muted text-muted-foreground border-border/40",
};

// ─── Component ──────────────────────────────────────────────────────────────

export function StepDetailCard({
  step,
  discrepancyEntries,
  correctiveActionEntries,
  onAddDiscrepancyEntry,
  onAddCorrectiveActionEntry,
  onSignClick,
  onNaClick,
  cardIsVoided = false,
  cardIsComplete = false,
  readOnly = false,
  isSubmitting = false,
  defaultOpen = false,
}: StepDetailCardProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen || step.status === "in_progress");
  const canAct = !cardIsVoided && !cardIsComplete && !readOnly;
  const isPending = step.status === "pending";
  const isInProgress = step.status === "in_progress";

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      {/* Collapsed header row */}
      <CollapsibleTrigger asChild>
        <div className="flex items-center gap-2 py-2.5 px-3 rounded-md cursor-pointer hover:bg-muted/20 transition-colors select-none">
          <StepStatusIcon status={step.status} />
          <span className="text-xs font-medium text-muted-foreground w-14 flex-shrink-0">
            Step {step.stepNumber}
          </span>
          <span className="text-sm text-foreground flex-1 min-w-0 truncate">
            {step.description}
          </span>
          <Badge variant="outline" className={`text-[9px] ${STATUS_STYLE[step.status] ?? ""}`}>
            {STATUS_LABEL[step.status] ?? step.status}
          </Badge>
          {step.signOffRequiresIa && (
            <Badge variant="outline" className="text-[9px] bg-amber-500/15 text-amber-400 border-amber-500/30">
              <ShieldCheck className="w-3 h-3 mr-0.5" />
              IA
            </Badge>
          )}
          <Badge
            variant="outline"
            className={`text-[9px] ${STEP_AUTHORIZATION_META[step.requiredAuthorizationType].badgeClassName}`}
          >
            {step.requiredAuthorizationLabel}
          </Badge>
          <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${isOpen ? "" : "-rotate-90"}`} />
        </div>
      </CollapsibleTrigger>

      {/* Expanded content */}
      <CollapsibleContent>
        <div className="pl-9 pr-3 pb-4 space-y-4">
          {/* Description (full) */}
          <p className="text-sm text-foreground">{step.description}</p>

          {/* In-progress marker */}
          {isInProgress && step.startedAt && (
            <div className="flex items-center gap-1.5 text-[11px] text-yellow-400/80">
              <Play className="w-3 h-3" />
              Started {formatDateTime(step.startedAt)}
            </div>
          )}

          {/* Sign-off info */}
          {step.status === "completed" && (
            <div className="flex items-center gap-1.5 text-[11px] text-green-400/80">
              <CheckCircle2 className="w-3 h-3" />
              {step.signerName ? `Signed by ${step.signerName}` : "Signed"}
              {step.signedAt && (
                <span className="text-muted-foreground/60">· {formatDateTime(step.signedAt)}</span>
              )}
              {step.signedCertificateNumber && (
                <span className="font-mono text-[10px] text-muted-foreground/60">
                  #{step.signedCertificateNumber}
                </span>
              )}
            </div>
          )}
          {step.status === "na" && (
            <div className="text-[11px] text-muted-foreground">
              N/A: {step.naReason}
              {step.naAuthorizerName && <span className="ml-1">· Auth: {step.naAuthorizerName}</span>}
            </div>
          )}

          <Separator className="opacity-30" />

          {/* Discrepancy Write-Up */}
          <WriteUpTimeline
            entries={discrepancyEntries}
            entryType="discrepancy_writeup"
            onAddEntry={(text) => onAddDiscrepancyEntry(step._id, text)}
            readOnly={readOnly}
            isSubmitting={isSubmitting}
            emptyLabel="No discrepancy noted on this step."
          />

          <Separator className="opacity-30" />

          {/* Corrective Action */}
          <WriteUpTimeline
            entries={correctiveActionEntries}
            entryType="corrective_action"
            onAddEntry={(text) => onAddCorrectiveActionEntry(step._id, text)}
            readOnly={readOnly}
            isSubmitting={isSubmitting}
            emptyLabel="No corrective action recorded for this step."
          />

          {/* Measurements */}
          {step.measurementSpec && (
            <>
              <Separator className="opacity-30" />
              <div className="space-y-1">
                <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Measurements — {step.measurementSpec.name} ({step.measurementSpec.unit})
                </h5>
                {step.measurementSpec.minValue !== undefined && step.measurementSpec.maxValue !== undefined && (
                  <p className="text-[11px] text-muted-foreground">
                    Limits: {step.measurementSpec.minValue} – {step.measurementSpec.maxValue} {step.measurementSpec.unit}
                  </p>
                )}
                {step.measurements && step.measurements.length > 0 && (
                  <div className="flex gap-2 flex-wrap">
                    {step.measurements.map((m, i) => (
                      <Badge
                        key={i}
                        variant="outline"
                        className={`text-xs font-mono ${
                          m.withinLimits
                            ? "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/30"
                            : "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30"
                        }`}
                      >
                        {m.value} {step.measurementSpec!.unit}
                        {!m.withinLimits && " — OUT OF LIMITS"}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {/* Parts removed/installed */}
          {((step.partsRemoved && step.partsRemoved.length > 0) ||
            (step.partsInstalled && step.partsInstalled.length > 0)) && (
            <>
              <Separator className="opacity-30" />
              <div className="space-y-2">
                {step.partsRemoved && step.partsRemoved.length > 0 && (
                  <div>
                    <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                      Parts Removed
                    </h5>
                    <div className="space-y-1">
                      {step.partsRemoved.map((p, i) => (
                        <div key={i} className="text-xs flex items-center gap-2">
                          <span className="font-mono text-muted-foreground">{p.partNumber}</span>
                          {p.serialNumber && <span className="font-mono text-muted-foreground/70">S/N {p.serialNumber}</span>}
                          <span className="text-foreground">{p.description}</span>
                          <span className="text-muted-foreground/60">qty {p.quantity}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {step.partsInstalled && step.partsInstalled.length > 0 && (
                  <div>
                    <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                      Parts Installed
                    </h5>
                    <div className="space-y-1">
                      {step.partsInstalled.map((p, i) => (
                        <div key={i} className="text-xs flex items-center gap-2">
                          <span className="font-mono text-muted-foreground">{p.partNumber}</span>
                          {p.serialNumber && <span className="font-mono text-muted-foreground/70">S/N {p.serialNumber}</span>}
                          <span className="text-foreground">{p.description}</span>
                          <span className="text-muted-foreground/60">qty {p.quantity}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Action buttons */}
          {canAct && (isPending || isInProgress) && (
            <>
              <Separator className="opacity-30" />
              <div className="flex items-center gap-2">
                {onSignClick && (
                  <Button
                    variant="default"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() =>
                      onSignClick({
                        stepId: step._id as Id<"taskCardSteps">,
                        stepNumber: step.stepNumber,
                        description: step.description,
                        requiresIa: step.signOffRequiresIa,
                        requiredAuthorizationType: step.requiredAuthorizationType,
                      })
                    }
                  >
                    Sign Step
                  </Button>
                )}
                {onNaClick && isPending && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() =>
                      onNaClick({
                        stepId: step._id as Id<"taskCardSteps">,
                        stepNumber: step.stepNumber,
                        description: step.description,
                      })
                    }
                  >
                    Mark N/A
                  </Button>
                )}
              </div>
            </>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
