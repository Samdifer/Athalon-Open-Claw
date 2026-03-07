"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Link } from "react-router-dom";
import {
  CalendarDays,
  ClipboardList,
  Download,
  FileText,
  Save,
  Send,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import { formatDate, formatDateUTC } from "@/lib/format";
import {
  WO_STATUS_LABEL,
  WO_STATUS_STYLES,
  type WoStatus,
  TASK_STATUS_LABEL,
  TASK_STATUS_STYLES,
  type TaskStatus,
} from "@/lib/mro-constants";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const LEAD_ROLES = new Set(["lead_technician", "shop_manager", "admin"]);

// BUG-QCM-HUNT-002: toISOString() returns a UTC date string. A lead tech in
// UTC-5 working the evening shift (after 7pm local = midnight+ UTC) would see
// tomorrow's UTC date pre-filled. The backend queries turnover reports by date
// key — requesting tomorrow's date creates or loads the wrong day's draft,
// potentially overwriting or orphaning today's report. Fix: use local date
// components (same pattern as BUG-QCM-REC-001 in CreateRecordForm).
function todayIso(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function minutesToHours(minutes: number): string {
  return `${(minutes / 60).toFixed(2)}h`;
}

export default function WorkOrderLeadWorkspacePage() {
  const { orgId, tech, isLoaded } = useCurrentOrg();

  const [reportDate, setReportDate] = useState(todayIso());
  const [selectedWorkOrderIds, setSelectedWorkOrderIds] = useState<string[]>([]);
  const [summaryText, setSummaryText] = useState("");
  const [aiDraftSummary, setAiDraftSummary] = useState("");
  const [leadNotes, setLeadNotes] = useState("");
  const [upcomingDeadlinesNotes, setUpcomingDeadlinesNotes] = useState("");
  const [partsOrderedSummary, setPartsOrderedSummary] = useState("");
  const [partsReceivedSummary, setPartsReceivedSummary] = useState("");
  const [workOrderNotes, setWorkOrderNotes] = useState<Record<string, string>>({});
  const [workOrderTeamDrafts, setWorkOrderTeamDrafts] = useState<Record<string, string>>({});
  const [workOrderAssigneeDrafts, setWorkOrderAssigneeDrafts] = useState<Record<string, string>>({});
  const [assigningKey, setAssigningKey] = useState<string | null>(null);
  const [savingDraft, setSavingDraft] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const canAccessLeadWorkspace = LEAD_ROLES.has(tech?.role ?? "");
  const shouldQueryWorkspace = Boolean(orgId && canAccessLeadWorkspace);

  const workspace = useQuery(
    api.leadTurnover.getLeadWorkspace,
    shouldQueryWorkspace && orgId ? { organizationId: orgId, reportDate } : "skip",
  );

  const assignEntity = useMutation(api.leadTurnover.assignEntity);
  const upsertTurnoverDraft = useMutation(api.leadTurnover.upsertTurnoverDraft);
  const submitTurnoverReport = useMutation(api.leadTurnover.submitTurnoverReport);

  const workOrderNumberById = useMemo(() => {
    const map = new Map<string, string>();
    for (const wo of workspace?.workOrders ?? []) {
      map.set(String(wo._id), wo.workOrderNumber);
    }
    return map;
  }, [workspace?.workOrders]);

  const taskCardAssignmentById = useMemo(() => {
    const map = new Map<string, any>();
    for (const row of workspace?.assignments ?? []) {
      if (row.entityType === "task_card" && row.taskCardId) {
        map.set(String(row.taskCardId), row);
      }
    }
    return map;
  }, [workspace?.assignments]);

  useEffect(() => {
    if (!workspace) return;

    const report = workspace.report;
    if (report) {
      setSelectedWorkOrderIds(report.selectedWorkOrderIds.map((id: Id<"workOrders">) => String(id)));
      setSummaryText(report.summaryText ?? "");
      setAiDraftSummary(report.aiDraftSummary ?? workspace.aiDraftSummary ?? "");
      setLeadNotes(report.leadNotes ?? "");
      setUpcomingDeadlinesNotes(report.upcomingDeadlinesNotes ?? "");
      setPartsOrderedSummary(report.partsOrderedSummary ?? "");
      setPartsReceivedSummary(report.partsReceivedSummary ?? "");

      const nextWorkOrderNotes: Record<string, string> = {};
      for (const row of report.workOrderNotes ?? []) {
        nextWorkOrderNotes[String(row.workOrderId)] = row.notes ?? "";
      }
      setWorkOrderNotes(nextWorkOrderNotes);
    } else {
      const defaults = workspace.workOrders
        .filter((wo) => wo.assignedMinutesToday > 0)
        .slice(0, 4)
        .map((wo) => String(wo._id));

      const fallback = defaults.length > 0
        ? defaults
        : workspace.workOrders.slice(0, 3).map((wo) => String(wo._id));

      setSelectedWorkOrderIds(fallback);
      setSummaryText("");
      setAiDraftSummary(workspace.aiDraftSummary ?? "");
      setLeadNotes("");
      setUpcomingDeadlinesNotes("");
      setPartsOrderedSummary("");
      setPartsReceivedSummary("");
      setWorkOrderNotes({});
    }

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
  // BUG-LT-HUNT-109: workspace?.aiDraftSummary was missing from the dep
  // array. When the backend regenerates the AI draft summary (e.g., a new
  // batch of time-clock entries rolls in after midnight), the textarea would
  // keep showing the stale draft because the effect never re-ran — reportDate,
  // report._id, and report.updatedAt had not changed. The lead would see an
  // outdated summary and potentially submit it verbatim. Added
  // workspace?.aiDraftSummary to the dep array so the textarea updates when
  // the backend provides a fresh draft. The in-effect guard
  // `workspace.report ? report.aiDraftSummary : workspace.aiDraftSummary`
  // already protects against overwriting user-edited text when a saved report
  // exists (it reads from report.aiDraftSummary, not workspace.aiDraftSummary).
  }, [workspace?.reportDate, workspace?.report?._id, workspace?.report?.updatedAt, workspace?.aiDraftSummary]);

  if (!isLoaded || (shouldQueryWorkspace && workspace === undefined)) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!orgId) {
    return (
      <Card className="border-border/60">
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          Unable to resolve organization context.
        </CardContent>
      </Card>
    );
  }

  if (!canAccessLeadWorkspace) {
    return (
      <Card className="border-border/60">
        <CardContent className="py-12 text-center space-y-2">
          <p className="text-sm font-medium text-foreground">Lead Workspace Access Required</p>
          <p className="text-xs text-muted-foreground">
            This page is available to lead technicians, shop managers, and administrators.
          </p>
          <Button asChild variant="outline" size="sm" className="mt-2">
            <Link to="/work-orders">Back to Work Orders</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const reportIsSubmitted = workspace?.report?.status === "submitted";

  const toggleWorkOrderSelection = (workOrderId: string, checked: boolean) => {
    setSelectedWorkOrderIds((prev) => {
      if (checked) {
        if (prev.includes(workOrderId)) return prev;
        return [...prev, workOrderId];
      }
      return prev.filter((id) => id !== workOrderId);
    });
  };

  const buildDraftPayload = () => ({
    organizationId: orgId,
    reportDate,
    selectedWorkOrderIds: selectedWorkOrderIds.map((id) => id as Id<"workOrders">),
    summaryText: summaryText.trim() || undefined,
    aiDraftSummary: aiDraftSummary.trim() || undefined,
    leadNotes: leadNotes.trim() || undefined,
    upcomingDeadlinesNotes: upcomingDeadlinesNotes.trim() || undefined,
    partsOrderedSummary: partsOrderedSummary.trim() || undefined,
    partsReceivedSummary: partsReceivedSummary.trim() || undefined,
    workOrderNotes: selectedWorkOrderIds.map((workOrderId) => ({
      workOrderId: workOrderId as Id<"workOrders">,
      notes: workOrderNotes[workOrderId]?.trim() || undefined,
    })),
  });

  const handleSaveDraft = async () => {
    setSavingDraft(true);
    try {
      await upsertTurnoverDraft(buildDraftPayload());
      toast.success("Turnover draft saved.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save draft.");
    } finally {
      setSavingDraft(false);
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const saved = await upsertTurnoverDraft(buildDraftPayload());
      await submitTurnoverReport({
        organizationId: orgId,
        reportId: saved.reportId,
      });
      toast.success("Turnover report submitted and locked.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to submit report.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!workspace) return;
    setDownloading(true);
    try {
      const { TurnoverReportPDF } = await import("@/lib/pdf/TurnoverReportPDF");
      const { downloadPDF } = await import("@/lib/pdf/download");

      const reportStatus =
        workspace.report?.status === "submitted" ? "submitted" : "draft";
      const personRows = (workspace.dayMetrics.personBreakdown ?? []).map((row: any) => ({
        name: row.technicianName,
        hours: row.minutes / 60,
      }));
      const teamRows = (workspace.report?.teamBreakdown ?? []).map((row: any) => ({
        teamName: row.teamName,
        hours: row.minutes / 60,
        notes: row.notes,
      }));
      const woRows = selectedWorkOrderIds.map((workOrderId) => ({
        workOrderNumber: workOrderNumberById.get(workOrderId) ?? "—",
        notes: workOrderNotes[workOrderId] ?? "",
      }));

      const doc = TurnoverReportPDF({
        orgName: workspace?.caller?.legalName ? "Athelon Aviation" : undefined,
        reportDate,
        generatedAt: Date.now(),
        status: reportStatus,
        leadName: workspace.caller.legalName,
        totalHours: (workspace.dayMetrics.totalMinutes ?? 0) / 60,
        workOrderHours: (workspace.dayMetrics.workOrderMinutes ?? 0) / 60,
        aiDraftSummary: aiDraftSummary.trim() || workspace.aiDraftSummary,
        summaryText: summaryText.trim() || undefined,
        leadNotes: leadNotes.trim() || undefined,
        upcomingDeadlinesNotes: upcomingDeadlinesNotes.trim() || undefined,
        partsOrderedSummary: partsOrderedSummary.trim() || undefined,
        partsReceivedSummary: partsReceivedSummary.trim() || undefined,
        personBreakdown: personRows,
        teamBreakdown: teamRows,
        workOrderNotes: woRows,
      });

      await downloadPDF(doc, `Turnover-${reportDate}.pdf`);
      toast.success("Turnover report PDF downloaded.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to generate PDF.");
    } finally {
      setDownloading(false);
    }
  };

  const handleAssignTaskCard = async (taskCardId: string, nextTechId: string) => {
    setAssigningKey(`task-${taskCardId}`);
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

  const handleSaveWorkOrderAssignment = async (workOrderId: string) => {
    setAssigningKey(`wo-${workOrderId}`);
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
      setAssigningKey(null);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-3">
        <div>
          <h1 className="text-lg sm:text-xl md:text-2xl font-semibold text-foreground">
            Lead Workspace
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Team assignments and daily turnover reporting.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            type="date"
            value={reportDate}
            onChange={(event) => setReportDate(event.target.value)}
            className="h-8 w-[170px] text-xs"
            aria-label="Turnover report date"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1.5"
            onClick={handleSaveDraft}
            disabled={savingDraft || reportIsSubmitted}
          >
            <Save className="w-3.5 h-3.5" />
            {savingDraft ? "Saving..." : "Save Draft"}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1.5"
            onClick={handleDownloadPdf}
            disabled={downloading}
          >
            <Download className="w-3.5 h-3.5" />
            {downloading ? "Generating..." : "PDF"}
          </Button>
          <Button
            type="button"
            size="sm"
            className="h-8 text-xs gap-1.5"
            onClick={handleSubmit}
            disabled={submitting || reportIsSubmitted}
          >
            <Send className="w-3.5 h-3.5" />
            {reportIsSubmitted ? "Submitted" : submitting ? "Submitting..." : "Submit"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <Card className="border-border/60">
          <CardContent className="p-3">
            <p className="text-[11px] text-muted-foreground mb-1">Selected Date</p>
            <div className="flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-semibold">{reportDate}</span>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/60">
          <CardContent className="p-3">
            <p className="text-[11px] text-muted-foreground mb-1">Total Applied</p>
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-semibold">
                {minutesToHours(workspace?.dayMetrics.totalMinutes ?? 0)}
              </span>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/60">
          <CardContent className="p-3">
            <p className="text-[11px] text-muted-foreground mb-1">Work Order Hours</p>
            <div className="flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-semibold">
                {minutesToHours(workspace?.dayMetrics.workOrderMinutes ?? 0)}
              </span>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/60">
          <CardContent className="p-3">
            <p className="text-[11px] text-muted-foreground mb-1">Report Status</p>
            <Badge
              variant="outline"
              className={
                reportIsSubmitted
                  ? "text-green-600 dark:text-green-400 border-green-500/30"
                  : "text-amber-600 dark:text-amber-400 border-amber-500/30"
              }
            >
              {reportIsSubmitted ? "Submitted (Locked)" : "Draft"}
            </Badge>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="ownership" className="space-y-4">
        <TabsList className="h-9 bg-muted/40 p-0.5 overflow-x-auto max-w-full flex-wrap">
          {([
            {
              value: "ownership",
              label: "Ownership",
              Icon: Users,
              count: workspace?.workOrders.length ?? null,
              indicator: null as "amber" | "green" | null,
            },
            {
              value: "tasks",
              label: "Task Feed",
              Icon: ClipboardList,
              count: workspace?.taskCards.length ?? null,
              indicator: null as "amber" | "green" | null,
            },
            {
              value: "turnover",
              label: "Turnover Report",
              Icon: FileText,
              count: null,
              indicator: reportIsSubmitted
                ? ("green" as const)
                : (summaryText || leadNotes || aiDraftSummary)
                  ? ("amber" as const)
                  : null,
            },
            {
              value: "history",
              label: "History",
              Icon: CalendarDays,
              count: workspace?.history.length || null,
              indicator: null as "amber" | "green" | null,
            },
          ] as const).map(({ value, label, Icon, count, indicator }) => (
            <TabsTrigger
              key={value}
              value={value}
              className="h-8 px-3.5 text-xs gap-1.5 data-[state=active]:bg-background"
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
              {count !== null && (
                <Badge
                  variant="secondary"
                  className="h-4 min-w-[16px] px-1 text-[9px] bg-muted-foreground/20 text-muted-foreground"
                >
                  {count}
                </Badge>
              )}
              {indicator === "amber" && (
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              )}
              {indicator === "green" && (
                <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
              )}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="ownership" className="mt-0">
          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Users className="w-4 h-4" />
                Work Order Ownership
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {workspace?.workOrders.length === 0 ? (
                <p className="text-sm text-muted-foreground">No active work orders.</p>
              ) : (
                workspace?.workOrders.map((workOrder) => (
                  <div
                    key={String(workOrder._id)}
                    className="border border-border/50 rounded-md p-3 space-y-2"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-sm font-semibold">
                        {workOrder.workOrderNumber}
                      </span>
                      {/* BUG-LT-HUNT-107: Was showing raw snake_case status
                          value (e.g. "in_progress") instead of the human-readable
                          label ("In Progress"). Applied WO_STATUS_LABEL lookup
                          and WO_STATUS_STYLES color coding to match the WO list
                          page and detail page patterns. */}
                      <Badge
                        variant="outline"
                        className={`text-[10px] border ${WO_STATUS_STYLES[workOrder.status as WoStatus] ?? "border-border/50 text-muted-foreground"}`}
                      >
                        {WO_STATUS_LABEL[workOrder.status as WoStatus] ?? workOrder.status}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {workOrder.promisedDeliveryDate
                          ? `RTS ${formatDate(workOrder.promisedDeliveryDate)}`
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
                          {workspace?.technicians.map((technician) => (
                            <SelectItem key={String(technician._id)} value={String(technician._id)}>
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
                        disabled={assigningKey === `wo-${String(workOrder._id)}`}
                      >
                        {assigningKey === `wo-${String(workOrder._id)}` ? "Saving..." : "Save"}
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tasks" className="mt-0">
          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Task Assignment Feed</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {workspace?.taskCards.length === 0 ? (
                <p className="text-sm text-muted-foreground">No active task cards found.</p>
              ) : (
                /* BUG-LT-HUNT-108: slice(0, 30) previously had no overflow
                   indicator. With 31+ task cards, the lead had no way to know
                   tasks beyond 30 were silently hidden — they could assign 30
                   tasks and believe the queue was fully staffed while tasks 31+
                   remained unassigned. Added "Showing X of Y" label and a
                   "View all" link to the work orders list when overflow exists. */
                <>
                {(workspace?.taskCards.length ?? 0) > 30 && (
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1">
                    <span>Showing 30 of {workspace?.taskCards.length} task cards</span>
                    <Link to="/work-orders" className="text-primary hover:underline">
                      View all in Work Orders →
                    </Link>
                  </div>
                )}
                {workspace?.taskCards.slice(0, 30).map((taskCard) => {
                  const assignment = taskCardAssignmentById.get(String(taskCard._id));
                  const selectedAssignee =
                    taskCard.assignedToTechnicianId
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
                          <span className="font-mono text-xs">{taskCard.workOrderNumber}</span>
                          <span className="text-xs text-muted-foreground">{taskCard.taskCardNumber}</span>
                          {/* BUG-LT-HUNT-107: Same raw-status fix for task cards. */}
                          <Badge
                            variant="outline"
                            className={`text-[10px] border ${TASK_STATUS_STYLES[taskCard.status as TaskStatus] ?? "border-border/50 text-muted-foreground"}`}
                          >
                            {TASK_STATUS_LABEL[taskCard.status as TaskStatus] ?? taskCard.status}
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
                          onValueChange={(value) => handleAssignTaskCard(String(taskCard._id), value)}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="Assign technician" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="unassigned">Unassigned</SelectItem>
                            {workspace?.technicians.map((technician) => (
                              <SelectItem key={String(technician._id)} value={String(technician._id)}>
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
        </TabsContent>

        <TabsContent value="turnover" className="mt-0">
          <Card className="border-border/60" data-testid="turnover-editor">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Turnover Report Editor</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Work Orders Included
                </p>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
                  {workspace?.workOrders.map((workOrder) => {
                    const workOrderId = String(workOrder._id);
                    const checked = selectedWorkOrderIds.includes(workOrderId);
                    return (
                      <label
                        key={workOrderId}
                        className="border border-border/50 rounded-md p-2 flex items-start gap-2 cursor-pointer"
                      >
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(value) => toggleWorkOrderSelection(workOrderId, Boolean(value))}
                          className="mt-0.5"
                        />
                        <span className="text-xs">
                          <span className="font-mono font-semibold">{workOrder.workOrderNumber}</span>{" "}
                          <span className="text-muted-foreground">{workOrder.description}</span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-muted-foreground">AI Draft Summary</p>
                  <Textarea
                    value={aiDraftSummary}
                    onChange={(event) => setAiDraftSummary(event.target.value)}
                    rows={4}
                    placeholder="AI-assisted draft summary of completed work..."
                    className="text-xs"
                    disabled={reportIsSubmitted}
                  />
                </div>
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-muted-foreground">Lead Final Summary</p>
                  <Textarea
                    value={summaryText}
                    onChange={(event) => setSummaryText(event.target.value)}
                    rows={4}
                    placeholder="Final turnover summary..."
                    className="text-xs"
                    disabled={reportIsSubmitted}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground">Lead Notes</p>
                <Textarea
                  value={leadNotes}
                  onChange={(event) => setLeadNotes(event.target.value)}
                  rows={3}
                  placeholder="Shift handoff context, blockers, staffing notes..."
                  className="text-xs"
                  disabled={reportIsSubmitted}
                />
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-muted-foreground">Upcoming Deadlines</p>
                  <Textarea
                    value={upcomingDeadlinesNotes}
                    onChange={(event) => setUpcomingDeadlinesNotes(event.target.value)}
                    rows={3}
                    className="text-xs"
                    disabled={reportIsSubmitted}
                  />
                </div>
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-muted-foreground">Parts Ordered</p>
                  <Textarea
                    value={partsOrderedSummary}
                    onChange={(event) => setPartsOrderedSummary(event.target.value)}
                    rows={3}
                    className="text-xs"
                    disabled={reportIsSubmitted}
                  />
                </div>
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-muted-foreground">Parts Received</p>
                  <Textarea
                    value={partsReceivedSummary}
                    onChange={(event) => setPartsReceivedSummary(event.target.value)}
                    rows={3}
                    className="text-xs"
                    disabled={reportIsSubmitted}
                  />
                </div>
              </div>

              {selectedWorkOrderIds.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Per-Work-Order Notes
                  </p>
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                    {selectedWorkOrderIds.map((workOrderId) => (
                      <div key={workOrderId} className="space-y-1">
                        <p className="text-xs font-mono text-foreground">
                          {workOrderNumberById.get(workOrderId) ?? workOrderId}
                        </p>
                        <Textarea
                          value={workOrderNotes[workOrderId] ?? ""}
                          onChange={(event) =>
                            setWorkOrderNotes((prev) => ({
                              ...prev,
                              [workOrderId]: event.target.value,
                            }))
                          }
                          rows={3}
                          className="text-xs"
                          disabled={reportIsSubmitted}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="mt-0">
          <Card className="border-border/60" data-testid="turnover-history">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Submitted History</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {workspace?.history.length === 0 ? (
                <p className="text-sm text-muted-foreground">No submitted turnover reports yet.</p>
              ) : (
                workspace?.history.map((report) => (
                  <div
                    key={String(report._id)}
                    className="border border-border/50 rounded-md p-2.5 flex flex-wrap items-center justify-between gap-2"
                  >
                    <div>
                      <p className="text-sm font-medium">{report.reportDate}</p>
                      <p className="text-xs text-muted-foreground">
                        {report.leadName} · {minutesToHours(report.timeAppliedMinutes)} total ·{" "}
                        {minutesToHours(report.shopWorkOrderMinutes)} WO ·{" "}
                        {report.selectedWorkOrderCount} work orders
                      </p>
                    </div>
                    <Badge variant="outline" className="text-[10px] border-green-500/30 text-green-600 dark:text-green-400">
                      Submitted {report.submittedAt ? formatDate(report.submittedAt) : ""}
                    </Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
