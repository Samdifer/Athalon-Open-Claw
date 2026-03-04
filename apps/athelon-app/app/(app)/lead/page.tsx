"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
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

const ALLOWED_ROLES = new Set(["lead_technician", "shop_manager", "admin"]);

function todayIso(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function LeadTechnicianWorkspacePage() {
  const { orgId, tech, isLoaded } = useCurrentOrg();
  const [reportDate] = useState(todayIso());
  const [handoffDraft, setHandoffDraft] = useState("");
  const [assigningTaskId, setAssigningTaskId] = useState<string | null>(null);
  const [savingHandoff, setSavingHandoff] = useState(false);

  const canAccess = ALLOWED_ROLES.has(tech?.role ?? "");
  const shouldQuery = Boolean(orgId && canAccess);

  const workspace = useQuery(
    api.leadTurnover.getLeadWorkspace,
    shouldQuery && orgId ? { organizationId: orgId, reportDate } : "skip",
  );

  const woSummary = useQuery(
    api.workOrders.getWorkOrdersWithScheduleRisk,
    shouldQuery && orgId
      ? { organizationId: orgId, shopLocationId: "all" }
      : "skip",
  );

  const assignEntity = useMutation(api.leadTurnover.assignEntity);
  const upsertTurnoverDraft = useMutation(api.leadTurnover.upsertTurnoverDraft);

  const assignedTaskByTech = useMemo(() => {
    const map = new Map<string, { title: string; workOrderNumber: string }>();
    for (const task of workspace?.taskCards ?? []) {
      if (!task.assignedToTechnicianId) continue;
      const key = String(task.assignedToTechnicianId);
      if (!map.has(key)) {
        map.set(key, { title: task.title, workOrderNumber: task.workOrderNumber });
      }
    }
    return map;
  }, [workspace?.taskCards]);

  const minutesByTechnician = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of workspace?.dayMetrics.personBreakdown ?? []) {
      map.set(String(row.technicianId), row.minutes);
    }
    return map;
  }, [workspace?.dayMetrics.personBreakdown]);

  const teamRows = useMemo(() => {
    return (workspace?.technicians ?? []).map((t) => {
      const techId = String(t._id);
      const minutes = minutesByTechnician.get(techId) ?? 0;
      const hours = Math.round((minutes / 60) * 10) / 10;
      const currentTask = assignedTaskByTech.get(techId);
      const status = currentTask ? "busy" : minutes > 0 ? "break" : "available";
      return {
        id: techId,
        legalName: t.legalName,
        hours,
        status,
        currentTask,
      };
    });
  }, [workspace?.technicians, minutesByTechnician, assignedTaskByTech]);

  const unassignedTasks = useMemo(
    () => (workspace?.taskCards ?? []).filter((t) => !t.assignedToTechnicianId),
    [workspace?.taskCards],
  );

  const activeWorkOrders = useMemo(() => {
    if (!woSummary) return [];
    return woSummary
      .filter((wo) => ["open", "in_progress", "pending_inspection", "pending_signoff", "on_hold", "open_discrepancies"].includes(wo.status))
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

  const handleAssignTask = async (taskCardId: string, techId: string) => {
    if (!orgId) return;
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

  const handleSaveHandoff = async () => {
    if (!orgId || !workspace) return;
    const note = handoffDraft.trim();
    if (!note) return;

    setSavingHandoff(true);
    try {
      const stamped = `[${new Date().toISOString()}] ${workspace.caller.legalName}: ${note}`;
      const prior = workspace.report?.leadNotes?.trim();
      const leadNotes = prior ? `${stamped}\n${prior}` : stamped;

      await upsertTurnoverDraft({
        organizationId: orgId,
        reportDate,
        selectedWorkOrderIds: (workspace.report?.selectedWorkOrderIds ?? []).map((id) => id as Id<"workOrders">),
        summaryText: workspace.report?.summaryText,
        aiDraftSummary: workspace.report?.aiDraftSummary,
        leadNotes,
        upcomingDeadlinesNotes: workspace.report?.upcomingDeadlinesNotes,
        partsOrderedSummary: workspace.report?.partsOrderedSummary,
        partsReceivedSummary: workspace.report?.partsReceivedSummary,
        workOrderNotes: workspace.report?.workOrderNotes,
      });
      setHandoffDraft("");
      toast.success("Handoff note saved.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save handoff note.");
    } finally {
      setSavingHandoff(false);
    }
  };

  if (!isLoaded || (shouldQuery && (workspace === undefined || woSummary === undefined))) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-44 w-full" />
        <Skeleton className="h-80 w-full" />
      </div>
    );
  }

  if (!orgId) {
    return <Card><CardContent className="py-10 text-sm text-muted-foreground">Organization context unavailable.</CardContent></Card>;
  }

  if (!canAccess) {
    return (
      <Card className="border-border/60">
        <CardContent className="py-10 text-center space-y-2">
          <p className="font-medium">Lead Dashboard Access Required</p>
          <p className="text-xs text-muted-foreground">Only lead technicians, shop managers, and admins can access this workspace.</p>
          <Button asChild variant="outline" size="sm"><Link to="/dashboard">Back to dashboard</Link></Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">Lead Technician Workspace</h1>
        <p className="text-sm text-muted-foreground">Team oversight, assignment control, and shift handoff.</p>
      </div>

      <Card className="border-border/60">
        <CardHeader><CardTitle className="text-sm">My Team</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {teamRows.map((member) => (
            <div key={member.id} className="rounded-md border border-border/60 p-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">{member.legalName}</p>
                <p className="text-xs text-muted-foreground">
                  {member.currentTask
                    ? `${member.currentTask.workOrderNumber} · ${member.currentTask.title}`
                    : "No active task assigned"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[11px]">{member.status}</Badge>
                <Badge variant="secondary" className="text-[11px]">{member.hours.toFixed(1)}h today</Badge>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="border-border/60">
        <CardHeader><CardTitle className="text-sm">Assignment Board</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {unassignedTasks.length === 0 ? (
            <p className="text-sm text-muted-foreground">No unassigned tasks.</p>
          ) : (
            unassignedTasks.map((task) => (
              <div key={String(task._id)} className="rounded-md border border-border/60 p-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">{task.workOrderNumber} · {task.taskCardNumber}</p>
                  <p className="text-xs text-muted-foreground">{task.title}</p>
                </div>
                <Select onValueChange={(value) => handleAssignTask(String(task._id), value)}>
                  <SelectTrigger className="w-52 h-8 text-xs" disabled={assigningTaskId === String(task._id)}>
                    <SelectValue placeholder="Assign technician" />
                  </SelectTrigger>
                  <SelectContent>
                    {workspace?.technicians.map((t) => (
                      <SelectItem key={String(t._id)} value={String(t._id)}>{t.legalName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card className="border-border/60">
        <CardHeader><CardTitle className="text-sm">Team Capacity</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={capacityData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-25} textAnchor="end" height={70} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: number | string) => [`${v}h`, "Hours"]} />
              <ReferenceLine y={8} stroke="#f59e0b" strokeDasharray="4 4" />
              <Bar dataKey="hours" fill="#06b6d4" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="border-border/60">
        <CardHeader><CardTitle className="text-sm">Active WO Summary</CardTitle></CardHeader>
        <CardContent>
          {activeWorkOrders.length === 0 ? (
            <p className="text-sm text-muted-foreground">No active work orders with task cards.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
              {activeWorkOrders.map((wo) => (
                <div key={wo.id} className="rounded-md border border-border/60 p-3 space-y-2">
                  <p className="text-sm font-mono font-semibold">{wo.number}</p>
                  <p className="text-xs text-muted-foreground">Aircraft: {wo.aircraft}</p>
                  <div className="space-y-1">
                    <p className="text-xs">Progress {wo.progress}%</p>
                    <Progress value={wo.progress} className="h-1.5" />
                  </div>
                  <p className="text-xs text-muted-foreground">{wo.tasksRemaining} tasks remaining</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-border/60">
        <CardHeader><CardTitle className="text-sm">Shift Handoff Notes</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            value={handoffDraft}
            onChange={(e) => setHandoffDraft(e.target.value)}
            rows={4}
            placeholder="Add a handoff note for the next shift..."
            className="text-sm"
          />
          <div className="flex justify-end">
            <Button size="sm" onClick={handleSaveHandoff} disabled={savingHandoff || !handoffDraft.trim()}>
              {savingHandoff ? "Saving..." : "Save Handoff Note"}
            </Button>
          </div>
          <div className="rounded-md border border-border/60 p-3 bg-muted/20">
            <p className="text-xs font-medium mb-1">Latest Notes</p>
            <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-sans">
              {workspace?.report?.leadNotes ?? "No notes recorded yet."}
            </pre>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
