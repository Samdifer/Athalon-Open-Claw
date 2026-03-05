"use client";

// MBP-0115: TAT Estimation Badge
// Shows estimated completion time based on historical data for similar aircraft types.

import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Clock, TrendingUp } from "lucide-react";

export type TATEstimate = {
  aircraftType: string;
  averageDays: number;
  sampleCount: number;
  minDays: number;
  maxDays: number;
};

interface TATEstimateBadgeProps {
  aircraftType?: string;
  estimates: TATEstimate[];
  startDate?: number;
  compact?: boolean;
}

export function TATEstimateBadge({
  aircraftType,
  estimates,
  startDate,
  compact = false,
}: TATEstimateBadgeProps) {
  if (!aircraftType) return null;

  const estimate = estimates.find((e) => e.aircraftType === aircraftType);
  if (!estimate || estimate.sampleCount === 0) return null;

  const estimatedEndDate = startDate
    ? new Date(startDate + estimate.averageDays * 24 * 60 * 60 * 1000)
    : null;

  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge
              variant="outline"
              className="text-[9px] px-1.5 py-0 gap-1 bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-400/40 cursor-help"
            >
              <Clock className="w-2.5 h-2.5" />
              ~{estimate.averageDays}d
            </Badge>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs max-w-xs">
            <div className="space-y-1">
              <div className="font-semibold flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5" />
                TAT Estimate: {estimate.averageDays} days
              </div>
              <div className="text-muted-foreground">
                Based on {estimate.sampleCount} similar {aircraftType} WOs
              </div>
              <div className="text-muted-foreground">
                Range: {estimate.minDays}–{estimate.maxDays} days
              </div>
              {estimatedEndDate && (
                <div className="font-medium">
                  Est. completion: {estimatedEndDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </div>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <div className="flex items-center gap-2 text-xs bg-violet-500/10 border border-violet-400/30 rounded-md px-3 py-1.5">
      <TrendingUp className="w-4 h-4 text-violet-500" />
      <div>
        <span className="font-medium text-violet-600 dark:text-violet-400">
          Est. {estimate.averageDays} days
        </span>
        <span className="text-muted-foreground ml-1.5">
          based on {estimate.sampleCount} similar WOs
        </span>
      </div>
      {estimatedEndDate && (
        <span className="ml-auto text-muted-foreground">
          → {estimatedEndDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
        </span>
      )}
    </div>
  );
}

/**
 * Compute estimated end date for a WO given TAT estimates and start date.
 */
export function computeEstimatedEnd(
  aircraftType: string | undefined,
  startDate: number,
  estimates: TATEstimate[],
): { estimatedEndDate: number; averageDays: number; sampleCount: number } | null {
  if (!aircraftType) return null;
  const estimate = estimates.find((e) => e.aircraftType === aircraftType);
  if (!estimate || estimate.sampleCount === 0) return null;
  return {
    estimatedEndDate: startDate + estimate.averageDays * 24 * 60 * 60 * 1000,
    averageDays: estimate.averageDays,
    sampleCount: estimate.sampleCount,
  };
}
