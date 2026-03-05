"use client";

import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import type { Id } from "@/convex/_generated/dataModel";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  TASK_STATUS_LABEL,
  TASK_STATUS_STYLES,
  type TaskStatus,
} from "@/lib/mro-constants";

import type { LeadCenterWorkspace, AssignEntityFn } from "./types";

// ---------------------------------------------------------------------------
// TaskFeedTab — Tab 2 of Lead Center
//
// Full task-card assignment feed extracted from /work-orders/lead Task Feed.
// ---------------------------------------------------------------------------

interface TaskFeedTabProps {
  workspace: LeadCenterWorkspace;
  assignEntity: AssignEntityFn;
  orgId: Id<"organizations">;
}

export function TaskFeedTab({ workspace, assignEntity, orgId }: TaskFeedTabProps) {
  const [assigningKey, setAssigningKey] = useState<string | null>(null);

  const taskCardAssignmentById = useMemo(() => {
    const map = new Map<string, { assignedToTechnicianId?: Id<"technicians"> }>();
    for (const row of workspace.assignments ?? []) {
      if (row.entityType === "task_card" && row.taskCardId) {
        map.set(String(row.taskCardId), row);
      }
    }
    return map;
  }, [workspace.assignments]);

  const handleAssignTaskCard = async (taskCardId: string, nextTechId: string) => {
    setAssigningKey(taskCardId);
    try {
      await assignEntity({
        organizationId: orgId,
        entityType: "task_card",
        taskCardId: taskCardId as Id<"taskCards">,
        assignedToTechnicianId:
          nextTechId === "unassigned" ? undefined : (nextTechId as Id<"technicians">),
      });
      toast.success("Task assignment updated.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to assign task.");
    } finally {
      setAssigningKey(null);
    }
  };

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">Task Assignment Feed</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {workspace.taskCards.length === 0 ? (
          <p className="text-sm text-muted-foreground">No active task cards found.</p>
        ) : (
          <>
            {workspace.taskCards.length > 30 && (
              <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1">
                <span>
                  Showing 30 of {workspace.taskCards.length} task cards
                </span>
                <Link to="/work-orders" className="text-primary hover:underline">
                  View all in Work Orders →
                </Link>
              </div>
            )}
            {workspace.taskCards.slice(0, 30).map((taskCard) => {
              const assignment = taskCardAssignmentById.get(String(taskCard._id));
              const selectedAssignee = taskCard.assignedToTechnicianId
                ? String(taskCard.assignedToTechnicianId)
                : assignment?.assignedToTechnicianId
                  ? String(assignment.assignedToTechnicianId)
                  : "unassigned";

              return (
                <div
                  key={String(taskCard._id)}
                  className="border border-border/50 rounded-md p-2.5 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-2"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs">
                        {taskCard.workOrderNumber}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {taskCard.taskCardNumber}
                      </span>
                      <Badge
                        variant="outline"
                        className={`text-[10px] border ${TASK_STATUS_STYLES[taskCard.status as TaskStatus] ?? "border-border/50 text-muted-foreground"}`}
                      >
                        {TASK_STATUS_LABEL[taskCard.status as TaskStatus] ??
                          taskCard.status}
                      </Badge>
                    </div>
                    <p className="text-sm font-medium truncate">{taskCard.title}</p>
                    <p className="text-[11px] text-muted-foreground">
                      Pending steps: {taskCard.pendingSteps}/{taskCard.totalSteps}
                    </p>
                  </div>
                  <div className="w-full xl:w-[220px]">
                    <Select
                      value={selectedAssignee}
                      onValueChange={(value) =>
                        handleAssignTaskCard(String(taskCard._id), value)
                      }
                    >
                      <SelectTrigger
                        className="h-8 text-xs"
                        disabled={assigningKey === String(taskCard._id)}
                      >
                        <SelectValue placeholder="Assign technician" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unassigned">Unassigned</SelectItem>
                        {workspace.technicians.map((technician) => (
                          <SelectItem
                            key={String(technician._id)}
                            value={String(technician._id)}
                          >
                            {technician.legalName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              );
            })}
          </>
        )}
      </CardContent>
    </Card>
  );
}
