"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  CalendarDays,
  Download,
  FileText,
  Save,
  Send,
} from "lucide-react";
import type { Id } from "@/convex/_generated/dataModel";
import { formatDate } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";

import type { LeadCenterWorkspace } from "./types";

// ---------------------------------------------------------------------------
// TurnoverTab — Tab 6 of Lead Center
//
// Turnover report editor + submitted history. Extracted from
// /work-orders/lead Turnover Report and History tabs.
// ---------------------------------------------------------------------------

function minutesToHours(minutes: number): string {
  return `${(minutes / 60).toFixed(2)}h`;
}

interface TurnoverTabProps {
  workspace: LeadCenterWorkspace;
  reportDate: string;
  orgId: Id<"organizations">;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  upsertTurnoverDraft: (args: any) => Promise<any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  submitTurnoverReport: (args: any) => Promise<any>;
}

export function TurnoverTab({
  workspace,
  reportDate,
  orgId,
  upsertTurnoverDraft,
  submitTurnoverReport,
}: TurnoverTabProps) {
  const [selectedWorkOrderIds, setSelectedWorkOrderIds] = useState<string[]>([]);
  const [summaryText, setSummaryText] = useState("");
  const [aiDraftSummary, setAiDraftSummary] = useState("");
  const [leadNotes, setLeadNotes] = useState("");
  const [upcomingDeadlinesNotes, setUpcomingDeadlinesNotes] = useState("");
  const [partsOrderedSummary, setPartsOrderedSummary] = useState("");
  const [partsReceivedSummary, setPartsReceivedSummary] = useState("");
  const [workOrderNotes, setWorkOrderNotes] = useState<Record<string, string>>({});
  const [savingDraft, setSavingDraft] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const workOrderNumberById = useMemo(() => {
    const map = new Map<string, string>();
    for (const wo of workspace.workOrders ?? []) {
      map.set(String(wo._id), wo.workOrderNumber);
    }
    return map;
  }, [workspace.workOrders]);

  // Sync local state from workspace report
  useEffect(() => {
    if (!workspace) return;

    const report = workspace.report;
    if (report) {
      setSelectedWorkOrderIds(
        report.selectedWorkOrderIds.map((id: Id<"workOrders">) => String(id)),
      );
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

      const fallback =
        defaults.length > 0
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
  }, [
    workspace?.reportDate,
    workspace?.report?._id,
    workspace?.report?.updatedAt,
    workspace?.aiDraftSummary,
  ]);

  const reportIsSubmitted = workspace.report?.status === "submitted";

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
      toast.error(
        error instanceof Error ? error.message : "Failed to save draft.",
      );
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
      toast.error(
        error instanceof Error ? error.message : "Failed to submit report.",
      );
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
      const personRows = (workspace.dayMetrics.personBreakdown ?? []).map(
        (row: { technicianName: string; minutes: number }) => ({
          name: row.technicianName,
          hours: row.minutes / 60,
        }),
      );
      const teamRows = (workspace.report?.teamBreakdown ?? []).map(
        (row: { teamName: string; minutes: number; notes?: string }) => ({
          teamName: row.teamName,
          hours: row.minutes / 60,
          notes: row.notes,
        }),
      );
      const woRows = selectedWorkOrderIds.map((workOrderId) => ({
        workOrderNumber: workOrderNumberById.get(workOrderId) ?? "—",
        notes: workOrderNotes[workOrderId] ?? "",
      }));

      const doc = TurnoverReportPDF({
        orgName: workspace.caller?.legalName ? "Athelon Aviation" : undefined,
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
      toast.error(
        error instanceof Error ? error.message : "Failed to generate PDF.",
      );
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Action bar */}
      <div className="flex flex-wrap items-center gap-2">
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
          {reportIsSubmitted
            ? "Submitted"
            : submitting
              ? "Submitting..."
              : "Submit"}
        </Button>
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
      </div>

      {/* Turnover Report Editor */}
      <Card className="border-border/60" data-testid="turnover-editor">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">
            Turnover Report Editor
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Work Orders Included
            </p>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
              {workspace.workOrders.map((workOrder) => {
                const workOrderId = String(workOrder._id);
                const checked = selectedWorkOrderIds.includes(workOrderId);
                return (
                  <label
                    key={workOrderId}
                    className="border border-border/50 rounded-md p-2 flex items-start gap-2 cursor-pointer"
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(value) =>
                        toggleWorkOrderSelection(workOrderId, Boolean(value))
                      }
                      className="mt-0.5"
                    />
                    <span className="text-xs">
                      <span className="font-mono font-semibold">
                        {workOrder.workOrderNumber}
                      </span>{" "}
                      <span className="text-muted-foreground">
                        {workOrder.description}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">
                AI Draft Summary
              </p>
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
              <p className="text-xs font-medium text-muted-foreground">
                Lead Final Summary
              </p>
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
              <p className="text-xs font-medium text-muted-foreground">
                Upcoming Deadlines
              </p>
              <Textarea
                value={upcomingDeadlinesNotes}
                onChange={(event) =>
                  setUpcomingDeadlinesNotes(event.target.value)
                }
                rows={3}
                className="text-xs"
                disabled={reportIsSubmitted}
              />
            </div>
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">
                Parts Ordered
              </p>
              <Textarea
                value={partsOrderedSummary}
                onChange={(event) =>
                  setPartsOrderedSummary(event.target.value)
                }
                rows={3}
                className="text-xs"
                disabled={reportIsSubmitted}
              />
            </div>
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">
                Parts Received
              </p>
              <Textarea
                value={partsReceivedSummary}
                onChange={(event) =>
                  setPartsReceivedSummary(event.target.value)
                }
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

      {/* Submitted History */}
      <Card className="border-border/60" data-testid="turnover-history">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Submitted History</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {workspace.history.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No submitted turnover reports yet.
            </p>
          ) : (
            workspace.history.map((report) => (
              <div
                key={String(report._id)}
                className="border border-border/50 rounded-md p-2.5 flex flex-wrap items-center justify-between gap-2"
              >
                <div>
                  <p className="text-sm font-medium">{report.reportDate}</p>
                  <p className="text-xs text-muted-foreground">
                    {report.leadName} ·{" "}
                    {minutesToHours(report.timeAppliedMinutes)} total ·{" "}
                    {minutesToHours(report.shopWorkOrderMinutes)} WO ·{" "}
                    {report.selectedWorkOrderCount} work orders
                  </p>
                </div>
                <Badge
                  variant="outline"
                  className="text-[10px] border-green-500/30 text-green-600 dark:text-green-400"
                >
                  Submitted{" "}
                  {report.submittedAt ? formatDate(report.submittedAt) : ""}
                </Badge>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
