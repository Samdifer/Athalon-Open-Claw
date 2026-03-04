"use client";

import { useMemo } from "react";
import { useQuery } from "convex/react";
import { Flame } from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type Goal = Doc<"ojtTrainingGoals">;

export function StreakTracker({ technicianId }: { technicianId?: Id<"technicians"> }) {
  const { techId } = useCurrentOrg();
  const targetTech = technicianId ?? (techId as Id<"technicians"> | undefined);
  const goals = useQuery(api.ojt.listGoals, targetTech ? { technicianId: targetTech } : "skip");

  const streak = useMemo(() => computeStreak(goals ?? []), [goals]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">OKR Streak Tracker</CardTitle>
      </CardHeader>
      <CardContent>
        {!goals ? (
          <Skeleton className="h-28 w-full" />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="rounded-lg border p-4 flex items-center gap-3 touch-manipulation">
              <Flame className="h-7 w-7 text-orange-500" />
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Current Streak</p>
                <p className="text-2xl font-bold">{streak.current}</p>
                <p className="text-xs text-muted-foreground">Consecutive completed periods</p>
              </div>
            </div>

            <div className="rounded-lg border p-4 flex items-center gap-3 touch-manipulation">
              <Flame className="h-7 w-7 text-rose-500" />
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Longest Streak</p>
                <p className="text-2xl font-bold">{streak.longest}</p>
                <p className="text-xs text-muted-foreground">Best all-time goal run</p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function computeStreak(goals: Goal[]) {
  if (goals.length === 0) return { current: 0, longest: 0 };

  const sorted = [...goals]
    .filter((goal) => goal.status !== "cancelled")
    .sort((a, b) => a.periodEnd - b.periodEnd);

  let longest = 0;
  let running = 0;
  for (const goal of sorted) {
    if (goal.status === "completed") {
      running += 1;
      longest = Math.max(longest, running);
    } else if (goal.status === "missed") {
      running = 0;
    }
  }

  let current = 0;
  for (let i = sorted.length - 1; i >= 0; i -= 1) {
    if (sorted[i].status === "completed") current += 1;
    else if (sorted[i].status === "missed") break;
  }

  return { current, longest };
}
