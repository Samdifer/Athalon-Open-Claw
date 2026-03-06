"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3 } from "lucide-react";

type SectionScore = {
  sectionId: string;
  sectionName: string;
  taskCount: number;
  completedTasks: number;
  totalScore: number;
  maxScore: number;
  percentage: number;
};

type JacketScoringCardProps = {
  sections: SectionScore[];
};

function barColor(pct: number): string {
  if (pct >= 75) return "bg-green-500";
  if (pct >= 25) return "bg-amber-500";
  return "bg-red-500";
}

function barTextColor(pct: number): string {
  if (pct >= 75) return "text-green-400";
  if (pct >= 25) return "text-amber-400";
  return "text-red-400";
}

export function JacketScoringCard({ sections }: JacketScoringCardProps) {
  const totalTasks = sections.reduce((sum, s) => sum + s.taskCount, 0);
  const totalCompleted = sections.reduce((sum, s) => sum + s.completedTasks, 0);
  const totalScore = sections.reduce((sum, s) => sum + s.totalScore, 0);
  const totalMaxScore = sections.reduce((sum, s) => sum + s.maxScore, 0);
  const overallPct = totalMaxScore > 0 ? Math.round((totalScore / totalMaxScore) * 100) : 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <BarChart3 className="h-4 w-4" />
          Scoring Summary
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Overall stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold">{overallPct}%</p>
            <p className="text-xs text-muted-foreground">Overall Score</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold">
              {totalCompleted}/{totalTasks}
            </p>
            <p className="text-xs text-muted-foreground">Tasks Complete</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold">
              {totalScore}/{totalMaxScore}
            </p>
            <p className="text-xs text-muted-foreground">Sign-offs</p>
          </div>
        </div>

        {/* Section bars */}
        {sections.length === 0 ? (
          <div className="flex items-center justify-center h-20 text-sm text-muted-foreground">
            No sections to score.
          </div>
        ) : (
          <div className="space-y-3">
            {sections.map((s) => (
              <div key={s.sectionId} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="truncate font-medium" title={s.sectionName}>
                    {s.sectionName}
                  </span>
                  <span className={`text-xs font-medium ${barTextColor(s.percentage)}`}>
                    {s.percentage}% ({s.completedTasks}/{s.taskCount})
                  </span>
                </div>
                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${barColor(s.percentage)}`}
                    style={{ width: `${s.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
