"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import type { Id } from "@/convex/_generated/dataModel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import {
  WO_STATUS_LABEL,
  WO_STATUS_STYLES,
  type WoStatus,
} from "@/lib/mro-constants";

import type { LeadCenterWorkspace, WoSummaryItem, AssignEntityFn } from "./types";

// ---------------------------------------------------------------------------
// ShiftBoardTab — Tab 1 of Lead Center
//
// Merges the old /lead dashboard (My Team, Assignment Board, Team Capacity)
// with the /work-orders/lead Ownership tab (WO assignment).
// ---------------------------------------------------------------------------

function minutesToHours(minutes: number): string {
  return `${(minutes / 60).toFixed(1)}h`;
}

interface ShiftBoardTabProps {
  workspace: LeadCenterWorkspace;
  woSummary: WoSummaryItem[];
  assignEntity: AssignEntityFn;
  orgId: Id<"organizations">;
}

export function ShiftBoardTab({
  workspace,
  woSummary,
  assignEntity,
  orgId,
}: ShiftBoardTabProps) {
  const [assigningTaskId, setAssigningTaskId] = useState<string | null>(null);
  const [assigningWoKey, setAssigningWoKey] = useState<string | null>(null);
  const [workOrderTeamDrafts, setWorkOrderTeamDrafts] = useState<Record<string, string>>({});
  const [workOrderAssigneeDrafts, setWorkOrderAssigneeDrafts] = useState<Record<string, string>>({});

  // Initialize WO assignment drafts from workspace
  useMemo(() => {
    const nextTeamDrafts: Record<string, string> = {};
    const nextAssigneeDrafts: Record<string, string> = {};
    for (const row of workspace.assignments ?? []) {
      if (row.entityType !== "work_order" || !row.workOrderId) continue;
      const key = String(row.workOrderId);
      nextTeamDrafts[key] = row.assignedTeamName ?? "";
      nextAssigneeDrafts[key] = row.assignedToTechnicianId
        ? String(row.assignedToTechnicianId)
        : "unassigned";
    }
    setWorkOrderTeamDrafts(nextTeamDrafts);
    setWorkOrderAssigneeDrafts(nextAssigneeDrafts);
  }, [workspace.assignments]);

  // ---- Derived data ----
  const assignedTaskByTech = useMemo(() => {
    const map = new Map<string, { title: string; workOrderNumber: string }>();
    for (const task of workspace.taskCards ?? []) {
      if (!task.assignedToTechnicianId) continue;
      const key = String(task.assignedToTechnicianId);
      if (!map.has(key)) {
        map.set(key, { title: task.title, workOrderNumber: task.workOrderNumber });
      }
    }
    return map;
  }, [workspace.taskCards]);

  const minutesByTechnician = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of workspace.dayMetrics.personBreakdown ?? []) {
      map.set(String(row.technicianId), row.minutes);
    }
    return map;
  }, [workspace.dayMetrics.personBreakdown]);

  const teamRows = useMemo(() => {
    return (workspace.technicians ?? []).map((t) => {
      const techId = String(t._id);
      const minutes = minutesByTechnician.get(techId) ?? 0;
      const hours = Math.round((minutes / 60) * 10) / 10;
      const currentTask = assignedTaskByTech.get(techId);
      const status = currentTask ? "busy" : minutes > 0 ? "break" : "available";
      return { id: techId, legalName: t.legalName, hours, status, currentTask };
    });
  }, [workspace.technicians, minutesByTechnician, assignedTaskByTech]);

  const unassignedTasks = useMemo(
    () => (workspace.taskCards ?? []).filter((t) => !t.assignedToTechnicianId).slice(0, 10),
    [workspace.taskCards],
  );

  const activeWorkOrders = useMemo(() => {
    if (!woSummary) return [];
    return woSummary
      .filter((wo) =>
        ["open", "in_progress", "pending_inspection", "pending_signoff", "on_hold", "open_discrepancies"].includes(wo.status),
      )
      .filter((wo) => (wo.taskCardCount ?? 0) > 0)
      .map((wo) => {
        const total = wo.taskCardCount ?? 0;
        const complete = wo.completedTaskCardCount ?? 0;
        const progress = total > 0 ? Math.round((complete / total) * 100) : 0;
        return {
          id: String(wo._id),
          number: wo.workOrderNumber,
          aircraft: wo.aircraft?.currentRegistration ?? "—",
          progress,
          tasksRemaining: Math.max(0, total - complete),
        };
      })
      .slice(0, 8);
  }, [woSummary]);

  const capacityData = teamRows.map((row) => ({
    name: row.legalName,
    hours: row.hours,
    target: 8,
  }));

  // ---- Handlers ----
  const handleAssignTask = async (taskCardId: string, techId: string) => {
    setAssigningTaskId(taskCardId);
    try {
      await assignEntity({
        organizationId: orgId,
        entityType: "task_card",
        taskCardId: taskCardId as Id<"taskCards">,
        assignedToTechnicianId: techId as Id<"technicians">,
      });
      toast.success("Task assigned.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to assign task.");
    } finally {
      setAssigningTaskId(null);
    }
  };

  const handleSaveWorkOrderAssignment = async (workOrderId: string) => {
    setAssigningWoKey(workOrderId);
    try {
      await assignEntity({
        organizationId: orgId,
        entityType: "work_order",
        workOrderId: workOrderId as Id<"workOrders">,
        assignedToTechnicianId:
          workOrderAssigneeDrafts[workOrderId] &&
          workOrderAssigneeDrafts[workOrderId] !== "unassigned"
            ? (workOrderAssigneeDrafts[workOrderId] as Id<"technicians">)
            : undefined,
        assignedTeamName: workOrderTeamDrafts[workOrderId]?.trim() || undefined,
      });
      toast.success("Work order ownership updated.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to assign work order.");
    } finally {
      setAssigningWoKey(null);
    }
  };

  return (
    <div className="space-y-5">
      {/* Section A — My Team */}
      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">My Team</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {teamRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No technicians found.</p>
          ) : (
            teamRows.map((member) => (
              <div
                key={member.id}
                className="rounded-md border border-border/60 p-3 flex items-center justify-between gap-3"
              >
                <div>
                  <p className="text-sm font-medium">{member.legalName}</p>
                  <p className="text-xs text-muted-foreground">
                    {member.currentTask
                      ? `${member.currentTask.workOrderNumber} · ${member.currentTask.title}`
                      : "No active task assigned"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[11px]">
                    {member.status}
                  </Badge>
                  <Badge variant="secondary" className="text-[11px]">
                    {member.hours.toFixed(1)}h today
                  </Badge>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Section B — Work Order Ownership */}
      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Work Order Ownership</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {workspace.workOrders.length === 0 ? (
            <p className="text-sm text-muted-foreground">No active work orders.</p>
          ) : (
            workspace.workOrders.map((workOrder) => (
              <div
                key={String(workOrder._id)}
                className="border border-border/50 rounded-md p-3 space-y-2"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-sm font-semibold">
                    {workOrder.workOrderNumber}
                  </span>
                  <Badge
                    variant="outline"
                    className={`text-[10px] border ${WO_STATUS_STYLES[workOrder.status as WoStatus] ?? "border-border/50 text-muted-foreground"}`}
                  >
                    {WO_STATUS_LABEL[workOrder.status as WoStatus] ?? workOrder.status}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {workOrder.promisedDeliveryDate
                      ? `RTS ${workOrder.promisedDeliveryDate}`
                      : "No RTS date"}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Today: {minutesToHours(workOrder.assignedMinutesToday)}
                  </span>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-[180px_1fr_auto] gap-2">
                  <Select
                    value={workOrderAssigneeDrafts[String(workOrder._id)] ?? "unassigned"}
                    onValueChange={(value) =>
                      setWorkOrderAssigneeDrafts((prev) => ({
                        ...prev,
                        [String(workOrder._id)]: value,
                      }))
                    }
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Lead owner" />
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
                  <Input
                    value={workOrderTeamDrafts[String(workOrder._id)] ?? ""}
                    onChange={(event) =>
                      setWorkOrderTeamDrafts((prev) => ({
                        ...prev,
                        [String(workOrder._id)]: event.target.value,
                      }))
                    }
                    placeholder="Team name (e.g. Airframe Day Shift)"
                    className="h-8 text-xs"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs"
                    onClick={() => handleSaveWorkOrderAssignment(String(workOrder._id))}
                    disabled={assigningWoKey === String(workOrder._id)}
                  >
                    {assigningWoKey === String(workOrder._id) ? "Saving..." : "Save"}
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Section C — Quick-Assign Unassigned Tasks */}
      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Unassigned Tasks</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {unassignedTasks.length === 0 ? (
            <p className="text-sm text-muted-foreground">No unassigned tasks.</p>
          ) : (
            unassignedTasks.map((task) => (
              <div
                key={String(task._id)}
                className="rounded-md border border-border/60 p-3 flex items-center justify-between gap-3"
              >
                <div>
                  <p className="text-sm font-medium">
                    {task.workOrderNumber} · {task.taskCardNumber}
                  </p>
                  <p className="text-xs text-muted-foreground">{task.title}</p>
                </div>
                <Select
                  onValueChange={(value) => handleAssignTask(String(task._id), value)}
                >
                  <SelectTrigger
                    className="w-52 h-8 text-xs"
                    disabled={assigningTaskId === String(task._id)}
                  >
                    <SelectValue placeholder="Assign technician" />
                  </SelectTrigger>
                  <SelectContent>
                    {workspace.technicians.map((t) => (
                      <SelectItem key={String(t._id)} value={String(t._id)}>
                        {t.legalName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Section D — Team Capacity */}
      {capacityData.length > 0 && (
        <Card className="border-border/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Team Capacity</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={capacityData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11 }}
                  interval={0}
                  angle={-25}
                  textAnchor="end"
                  height={70}
                />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => [`${v}h`, "Hours"]} />
                <ReferenceLine y={8} stroke="#f59e0b" strokeDasharray="4 4" />
                <Bar dataKey="hours" fill="#06b6d4" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Section E — Active WO Summary */}
      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Active WO Summary</CardTitle>
        </CardHeader>
        <CardContent>
          {activeWorkOrders.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No active work orders with work cards.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
              {activeWorkOrders.map((wo) => (
                <div
                  key={wo.id}
                  className="rounded-md border border-border/60 p-3 space-y-2"
                >
                  <p className="text-sm font-mono font-semibold">{wo.number}</p>
                  <p className="text-xs text-muted-foreground">
                    Aircraft: {wo.aircraft}
                  </p>
                  <div className="space-y-1">
                    <p className="text-xs">Progress {wo.progress}%</p>
                    <Progress value={wo.progress} className="h-1.5" />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {wo.tasksRemaining} tasks remaining
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
