"use client";

// MBP-0111: Technician Skill Matching — Warning Badge
// Displays warning when assigned techs lack required training for a WO.

import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ShieldAlert } from "lucide-react";

export type SkillGap = {
  techId: string;
  techName?: string;
  missingTraining: string[];
};

interface SkillWarningBadgeProps {
  gaps: SkillGap[];
  compact?: boolean;
}

export function SkillWarningBadge({ gaps, compact = true }: SkillWarningBadgeProps) {
  if (gaps.length === 0) return null;

  const totalMissing = gaps.reduce((sum, g) => sum + g.missingTraining.length, 0);

  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge
              variant="outline"
              className="text-[9px] px-1 py-0 gap-0.5 bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-400/50 cursor-help"
            >
              <ShieldAlert className="w-2.5 h-2.5" />
              {totalMissing}
            </Badge>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs max-w-xs">
            <div className="space-y-1.5">
              <div className="font-semibold text-amber-500 flex items-center gap-1">
                <ShieldAlert className="w-3.5 h-3.5" />
                Training Gaps Detected
              </div>
              {gaps.map((gap) => (
                <div key={gap.techId} className="space-y-0.5">
                  <span className="font-medium">{gap.techName ?? gap.techId}</span>
                  <div className="flex flex-wrap gap-1">
                    {gap.missingTraining.map((t) => (
                      <Badge
                        key={t}
                        variant="destructive"
                        className="text-[9px] px-1 py-0"
                      >
                        {t}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <div className="flex items-start gap-2 text-xs bg-amber-500/10 border border-amber-400/30 rounded-md px-3 py-2">
      <ShieldAlert className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
      <div className="space-y-1">
        <div className="font-medium text-amber-600 dark:text-amber-400">
          {gaps.length} technician(s) missing required training
        </div>
        {gaps.map((gap) => (
          <div key={gap.techId} className="text-muted-foreground">
            <span className="font-medium">{gap.techName ?? gap.techId}:</span>{" "}
            {gap.missingTraining.join(", ")}
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Check skill gaps for a set of technicians against required training.
 */
export function checkSkillGaps(
  techIds: string[],
  requiredTraining: string[],
  trainingMap: Record<string, string[]>,
): SkillGap[] {
  if (requiredTraining.length === 0) return [];
  const gaps: SkillGap[] = [];
  for (const techId of techIds) {
    const techTraining = trainingMap[techId] ?? [];
    const missing = requiredTraining.filter((req) => !techTraining.includes(req));
    if (missing.length > 0) {
      gaps.push({ techId, missingTraining: missing });
    }
  }
  return gaps;
}
