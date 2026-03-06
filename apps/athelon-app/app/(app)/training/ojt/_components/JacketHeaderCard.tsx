"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Calendar, Clock, Award, BookOpen } from "lucide-react";

type JacketHeaderCardProps = {
  technicianName: string;
  curriculumName: string;
  version: string | undefined;
  status: string;
  startedAt: number | undefined;
  lastActivity: number | undefined;
  totalTasks: number;
  completedTasks: number;
  authorizationsGranted: number;
  authorizationsTotal: number;
};

function formatDate(ts?: number): string {
  if (!ts) return "---";
  return new Date(ts).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function statusBadge(status: string) {
  if (status === "fully_qualified") {
    return (
      <Badge className="bg-green-500/15 text-green-400 border-green-500/30">
        Fully Qualified
      </Badge>
    );
  }
  if (status === "in_progress") {
    return (
      <Badge className="bg-blue-500/15 text-blue-400 border-blue-500/30">
        In Progress
      </Badge>
    );
  }
  if (status === "suspended") {
    return (
      <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/30">
        Suspended
      </Badge>
    );
  }
  return <Badge variant="outline">Not Started</Badge>;
}

export function JacketHeaderCard({
  technicianName,
  curriculumName,
  version,
  status,
  startedAt,
  lastActivity,
  totalTasks,
  completedTasks,
  authorizationsGranted,
  authorizationsTotal,
}: JacketHeaderCardProps) {
  const progressPct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          {/* Left: Name and curriculum info */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold">{technicianName}</h1>
              {statusBadge(status)}
            </div>
            <p className="text-sm text-muted-foreground">
              {curriculumName}
              {version ? ` v${version}` : ""}
            </p>
          </div>

          {/* Right: Key stats */}
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>Started {formatDate(startedAt)}</span>
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>Last Activity {formatDate(lastActivity)}</span>
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <BookOpen className="h-4 w-4" />
              <span>
                {completedTasks}/{totalTasks} tasks
              </span>
            </div>
            {authorizationsTotal > 0 && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Award className="h-4 w-4" />
                <span>
                  {authorizationsGranted}/{authorizationsTotal} authorizations
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-4 space-y-1.5">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Overall Progress</span>
            <span className="font-medium">{progressPct}%</span>
          </div>
          <Progress value={progressPct} className="h-2.5" />
        </div>
      </CardContent>
    </Card>
  );
}
