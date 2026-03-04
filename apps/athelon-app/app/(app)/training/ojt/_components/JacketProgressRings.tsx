"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type JacketProgressRingsProps = {
  jacketId: Id<"ojtJackets">;
  title?: string;
};

function ringColor(percentage: number): string {
  if (percentage > 75) return "#16a34a";
  if (percentage >= 25) return "#eab308";
  return "#dc2626";
}

export function JacketProgressRings({ jacketId, title = "Section Completion" }: JacketProgressRingsProps) {
  const radarData = useQuery(api.ojt.getRadarData, { jacketId });

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {!radarData ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-[150px] w-full" />
            ))}
          </div>
        ) : radarData.length === 0 ? (
          <div className="h-28 flex items-center justify-center text-sm text-muted-foreground">
            No curriculum section data available
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {radarData.map((section) => {
              const radius = 40;
              const strokeWidth = 8;
              const normalizedRadius = radius - strokeWidth / 2;
              const circumference = normalizedRadius * 2 * Math.PI;
              const strokeDashoffset = circumference - (section.percentage / 100) * circumference;
              const color = ringColor(section.percentage);

              return (
                <div key={section.sectionId} className="border rounded-lg p-4 flex items-center gap-4">
                  <svg height={radius * 2} width={radius * 2} className="shrink-0">
                    <circle
                      stroke="hsl(var(--muted))"
                      fill="transparent"
                      strokeWidth={strokeWidth}
                      r={normalizedRadius}
                      cx={radius}
                      cy={radius}
                    />
                    <circle
                      stroke={color}
                      fill="transparent"
                      strokeLinecap="round"
                      strokeWidth={strokeWidth}
                      strokeDasharray={`${circumference} ${circumference}`}
                      style={{ strokeDashoffset, transition: "stroke-dashoffset 0.35s" }}
                      r={normalizedRadius}
                      cx={radius}
                      cy={radius}
                      transform={`rotate(-90 ${radius} ${radius})`}
                    />
                    <text
                      x="50%"
                      y="50%"
                      dominantBaseline="middle"
                      textAnchor="middle"
                      className="fill-foreground"
                      style={{ fontSize: 14, fontWeight: 600 }}
                    >
                      {section.percentage}%
                    </text>
                  </svg>

                  <div className="min-w-0">
                    <p className="text-sm font-medium leading-tight truncate" title={section.section}>
                      {section.section}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {section.completedTasks}/{section.taskCount} tasks complete
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Score {section.score}/{section.maxScore}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
