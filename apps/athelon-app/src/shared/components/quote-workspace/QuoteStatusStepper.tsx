"use client";

import { cn } from "@/lib/utils";
import { Check, X } from "lucide-react";

type QuoteStatus = "DRAFT" | "SENT" | "APPROVED" | "CONVERTED" | "DECLINED";

const STEPS: Array<{ status: QuoteStatus; label: string }> = [
  { status: "DRAFT", label: "Draft" },
  { status: "SENT", label: "Sent" },
  { status: "APPROVED", label: "Approved" },
  { status: "CONVERTED", label: "Converted" },
];

function stepIndex(status: QuoteStatus): number {
  if (status === "DECLINED") return 1; // Declined happens at the SENT stage
  return STEPS.findIndex((s) => s.status === status);
}

export interface QuoteStatusStepperProps {
  status: QuoteStatus;
}

export function QuoteStatusStepper({ status }: QuoteStatusStepperProps) {
  const currentIdx = stepIndex(status);
  const isDeclined = status === "DECLINED";

  return (
    <div className="flex items-center gap-0" role="list" aria-label="Quote status progression">
      {STEPS.map((step, idx) => {
        const isPast = idx < currentIdx;
        const isCurrent = idx === currentIdx;
        const isFuture = idx > currentIdx;
        const isDeclinedStep = isDeclined && idx === 1;
        // When declined, steps after SENT (idx > 1) are unreachable
        const isUnreachable = isDeclined && idx > 1;

        return (
          <div key={step.status} className="flex items-center" role="listitem">
            {/* Step circle */}
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-full border-2 text-xs font-semibold transition-colors",
                  isPast && !isDeclinedStep &&
                    "border-primary bg-primary text-primary-foreground",
                  isCurrent && !isDeclinedStep &&
                    "border-primary bg-primary/10 text-primary ring-2 ring-primary/20",
                  isDeclinedStep &&
                    "border-red-500 bg-red-500/10 text-red-600 dark:text-red-400 ring-2 ring-red-500/20",
                  isFuture && !isUnreachable &&
                    "border-border bg-background text-muted-foreground",
                  isUnreachable &&
                    "border-border/40 bg-muted/30 text-muted-foreground/40",
                )}
              >
                {isPast && !isDeclinedStep ? (
                  <Check className="h-3.5 w-3.5" />
                ) : isDeclinedStep ? (
                  <X className="h-3.5 w-3.5" />
                ) : (
                  <span className="text-[10px]">{idx + 1}</span>
                )}
              </div>
              <span
                className={cn(
                  "mt-1 text-[10px] font-medium leading-tight",
                  isPast && !isDeclinedStep && "text-primary",
                  isCurrent && !isDeclinedStep && "text-primary font-semibold",
                  isDeclinedStep && "text-red-600 dark:text-red-400 font-semibold",
                  isFuture && !isUnreachable && "text-muted-foreground",
                  isUnreachable && "text-muted-foreground/40",
                )}
              >
                {isDeclinedStep ? "Declined" : step.label}
              </span>
            </div>

            {/* Connector line (not after last step) */}
            {idx < STEPS.length - 1 && (
              <div
                className={cn(
                  "mx-1.5 h-0.5 w-8 sm:w-12 rounded-full transition-colors",
                  isPast && !isDeclined
                    ? "bg-primary"
                    : isDeclinedStep
                      ? "bg-red-500/30"
                      : "bg-border",
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
