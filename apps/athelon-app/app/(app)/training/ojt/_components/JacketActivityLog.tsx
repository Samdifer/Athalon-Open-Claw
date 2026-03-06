"use client";

import { useMemo, useState } from "react";
import type { Doc } from "@/convex/_generated/dataModel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Clock, User, FileText } from "lucide-react";

type StageEvent = Doc<"ojtStageEvents">;
type Task = Doc<"ojtTasks">;
type Section = Doc<"ojtCurriculumSections">;

type JacketActivityLogProps = {
  events: StageEvent[];
  tasks: Task[];
  sections: Section[];
  techniciansMap: Map<string, string>;
};

function formatDateTime(ts?: number): string {
  if (!ts) return "---";
  return new Date(ts).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function stageLabel(event: StageEvent): string {
  if (event.columnNumber) {
    if (event.isAuthorizationSignOff) {
      return `Column 5 (Authorization)`;
    }
    return `Column ${event.columnNumber}`;
  }
  return event.stage.charAt(0).toUpperCase() + event.stage.slice(1);
}

function methodBadge(method?: string) {
  if (!method) return null;
  const colors: Record<string, string> = {
    "hands-on": "bg-blue-500/15 text-blue-400 border-blue-500/30",
    classroom: "bg-purple-500/15 text-purple-400 border-purple-500/30",
    CBT: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  };
  return (
    <Badge className={colors[method] ?? ""} variant="outline">
      {method}
    </Badge>
  );
}

export function JacketActivityLog({
  events,
  tasks,
  sections,
  techniciansMap,
}: JacketActivityLogProps) {
  const [sectionFilter, setSectionFilter] = useState("all");

  const taskMap = useMemo(() => {
    const map = new Map<string, Task>();
    for (const t of tasks) {
      map.set(t._id, t);
    }
    return map;
  }, [tasks]);

  const sectionMap = useMemo(() => {
    const map = new Map<string, Section>();
    for (const s of sections) {
      map.set(s._id, s);
    }
    return map;
  }, [sections]);

  // Sort newest first
  const sortedEvents = useMemo(() => {
    let filtered = [...events];

    if (sectionFilter !== "all") {
      filtered = filtered.filter((e) => {
        const task = taskMap.get(e.taskId);
        return task?.sectionId === sectionFilter;
      });
    }

    return filtered.sort((a, b) => b.createdAt - a.createdAt);
  }, [events, sectionFilter, taskMap]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-sm font-semibold">Activity Log</CardTitle>
          <Select value={sectionFilter} onValueChange={setSectionFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filter by section" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sections</SelectItem>
              {sections
                .sort((a, b) => a.displayOrder - b.displayOrder)
                .map((s) => (
                  <SelectItem key={s._id} value={s._id}>
                    {s.name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {sortedEvents.length === 0 ? (
          <div className="flex items-center justify-center h-24 text-sm text-muted-foreground">
            No sign-off events recorded yet.
          </div>
        ) : (
          <div className="space-y-3">
            {sortedEvents.map((event) => {
              const task = taskMap.get(event.taskId);
              const section = task ? sectionMap.get(task.sectionId) : undefined;
              const trainerName = techniciansMap.get(event.trainerId) ?? "Unknown";

              return (
                <div
                  key={event._id}
                  className="rounded-md border p-3 space-y-1.5"
                >
                  {/* Top row: date + stage badge */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" />
                      <span>{formatDateTime(event.createdAt)}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {methodBadge(event.trainingMethod)}
                      <Badge
                        className={
                          event.isAuthorizationSignOff
                            ? "bg-green-500/15 text-green-400 border-green-500/30"
                            : "bg-blue-500/15 text-blue-400 border-blue-500/30"
                        }
                      >
                        {stageLabel(event)}
                      </Badge>
                    </div>
                  </div>

                  {/* Task description */}
                  <div className="flex items-start gap-2">
                    <FileText className="h-3.5 w-3.5 mt-0.5 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-sm font-medium">
                        {task?.description ?? "Unknown task"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        ATA {task?.ataChapter ?? "---"}
                        {section ? ` / ${section.name}` : ""}
                      </p>
                    </div>
                  </div>

                  {/* Trainer info */}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <User className="h-3.5 w-3.5" />
                    <span>Trainer: {trainerName}</span>
                    {event.actualMinutes && (
                      <span className="ml-2">{event.actualMinutes} min</span>
                    )}
                  </div>

                  {/* Notes */}
                  {event.notes && (
                    <p className="text-xs text-muted-foreground bg-muted/50 rounded p-2 mt-1">
                      {event.notes}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
