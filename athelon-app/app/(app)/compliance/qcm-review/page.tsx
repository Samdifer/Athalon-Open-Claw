"use client";

import { useState, useMemo, useEffect } from "react";
import { Link } from "react-router-dom";
import { useQuery, usePaginatedQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import type { Id } from "@/convex/_generated/dataModel";
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ClipboardList,
  ChevronRight,
  FileSearch,
  ShieldAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { usePagePrereqs } from "@/hooks/usePagePrereqs";
import { ActionableEmptyState } from "@/components/zero-state/ActionableEmptyState";

// ─── IA Steps Table ───────────────────────────────────────────────────────────

type IAStep = {
  _id: string;
  taskCardId: Id<"taskCards">;
  workOrderId: Id<"workOrders"> | null;
  stepNumber: number;
  description: string;
  status: string;
  taskCardTitle: string;
  taskCardNumber: string;
  workOrderNumber: string;
  aircraftRegistration: string;
};

function groupByWorkOrder(steps: IAStep[]): Record<string, IAStep[]> {
  return steps.reduce(
    (acc, step) => {
      const key = step.workOrderNumber;
      if (!acc[key]) acc[key] = [];
      acc[key].push(step);
      return acc;
    },
    {} as Record<string, IAStep[]>,
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "complete")
    return (
      <Badge className="bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/30 text-[10px]">
        Complete
      </Badge>
    );
  if (status === "in_progress")
    return (
      <Badge className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30 text-[10px]">
        In Progress
      </Badge>
    );
  return (
    <Badge
      variant="outline"
      className="text-[10px] text-muted-foreground border-border/40"
    >
      {status}
    </Badge>
  );
}

// ─── Close Readiness Panel ────────────────────────────────────────────────────

function CloseReadinessPanel({
  orgId,
  workOrders,
}: {
  orgId: Id<"organizations">;
  workOrders: Array<{ _id: Id<"workOrders">; workOrderNumber: string; status?: string }>;
}) {
  const [selectedWoId, setSelectedWoId] =
    useState<Id<"workOrders"> | null>(null);

  // BUG-030: Auto-select when exactly one pending_signoff WO exists.
  // A QCM landing on this page with a single sign-off candidate still had to
  // manually open the dropdown and click it — even though there was nothing
  // else to choose. The readiness panel stayed blank, giving no visual cue
  // that the WO was already ready. Now the panel populates automatically so
  // the QCM can proceed without an extra click.
  const pendingSignoffWos = useMemo(
    () => workOrders.filter((wo) => wo.status === "pending_signoff"),
    [workOrders],
  );
  useEffect(() => {
    if (selectedWoId === null && pendingSignoffWos.length === 1) {
      setSelectedWoId(pendingSignoffWos[0]._id);
    }
  }, [pendingSignoffWos, selectedWoId]);

  const readiness = useQuery(
    api.maintenanceRecords.getWorkOrderCloseReadinessV2,
    selectedWoId
      ? { workOrderId: selectedWoId, organizationId: orgId }
      : "skip",
  );

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <ClipboardList className="w-4 h-4 text-muted-foreground" />
          Work Order Close Readiness
        </CardTitle>
        <CardDescription className="text-xs">
          Select a work order to view its close readiness checklist.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* WO Selector */}
        <Select
          value={selectedWoId ?? ""}
          onValueChange={(v) => setSelectedWoId(v as Id<"workOrders">)}
        >
          <SelectTrigger className="h-9 text-sm border-border/60">
            <SelectValue placeholder="Select work order…" />
          </SelectTrigger>
          <SelectContent>
            {/* BUG-QCM-PS-001: WOs were in insertion order (arbitrary). A QCM
                with 100 open WOs had no way to quickly find a specific WO.
                Sorted: pending_signoff first (these are the only ones the QCM
                can actually authorize RTS for), then alphabetically within
                each group. The "ready" label helps the QCM identify sign-off
                candidates immediately without checking each one. */}
            {[...workOrders]
              .sort((a, b) => {
                const aPriority = a.status === "pending_signoff" ? 0 : 1;
                const bPriority = b.status === "pending_signoff" ? 0 : 1;
                if (aPriority !== bPriority) return aPriority - bPriority;
                return a.workOrderNumber.localeCompare(b.workOrderNumber);
              })
              .map((wo) => (
              <SelectItem key={wo._id} value={wo._id}>
                <span className="flex items-center gap-2">
                  <span className="font-mono text-xs">{wo.workOrderNumber}</span>
                  {wo.status === "pending_signoff" && (
                    <span className="text-[10px] text-green-600 dark:text-green-400 font-medium">
                      ready
                    </span>
                  )}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Readiness result */}
        {selectedWoId && readiness === undefined && (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        )}

        {selectedWoId && readiness === null && (
          <p className="text-sm text-muted-foreground text-center py-4">
            Work order not found.
          </p>
        )}

        {readiness && (
          <div className="space-y-3">
            {/* Can-Close indicator */}
            <div
              className={`flex items-center gap-2 p-3 rounded-md border ${
                readiness.canClose
                  ? "bg-green-500/5 border-green-500/30"
                  : "bg-red-500/5 border-red-500/30"
              }`}
            >
              {readiness.canClose ? (
                <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0" />
              ) : (
                <XCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0" />
              )}
              <span className="text-sm font-medium">
                {readiness.canClose
                  ? "Ready to close"
                  : `Not ready — ${readiness.blockers?.length ?? 0} blocker(s)`}
              </span>
              {readiness.canClose && (
                <Button asChild size="sm" className="ml-auto h-7 text-xs">
                  <Link to={`/work-orders/${selectedWoId}/rts`}>
                    Sign Off &amp; Close
                  </Link>
                </Button>
              )}
            </div>

            {/* Blockers */}
            {(readiness.blockers?.length ?? 0) > 0 && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-red-600 dark:text-red-400 uppercase tracking-wide">
                    Blockers
                  </p>
                  {/* BH-QCM-002: Add "View Work Order" link when there are blockers.
                      Previously the QCM saw blockers listed (e.g. "task cards incomplete",
                      "RTS not signed") with no way to navigate to the WO to fix them.
                      They had to manually navigate to /work-orders and search for the WO. */}
                  {selectedWoId && (
                    <Button asChild variant="ghost" size="sm" className="h-6 text-[10px] gap-1 text-primary">
                      <Link to={`/work-orders/${selectedWoId}`}>
                        View Work Order →
                      </Link>
                    </Button>
                  )}
                </div>
                {readiness.blockers!.map((b: string, i: number) => (
                  <div
                    key={i}
                    className="flex items-start gap-2 text-[11px] text-muted-foreground"
                  >
                    <XCircle className="w-3 h-3 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                    {b}
                  </div>
                ))}
              </div>
            )}

            {/* Advisories */}
            {(readiness.advisories?.length ?? 0) > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wide">
                  Advisories
                </p>
                {readiness.advisories!.map((a: string, i: number) => (
                  <div
                    key={i}
                    className="flex items-start gap-2 text-[11px] text-muted-foreground"
                  >
                    <AlertTriangle className="w-3 h-3 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                    {a}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function QcmReviewPage() {
  const { orgId, isLoaded } = useCurrentOrg();

  const iaSteps = useQuery(
    api.gapFixes.listStepsRequiringIAReview,
    orgId ? { organizationId: orgId } : "skip",
  );

  const { results: workOrders, status: workOrdersStatus } = usePaginatedQuery(
    api.workOrders.listWorkOrders,
    orgId ? { organizationId: orgId } : "skip",
    { initialNumItems: 200 },
  );

  const prereq = usePagePrereqs({
    requiresOrg: true,
    isDataLoading:
      !isLoaded ||
      iaSteps === undefined ||
      workOrdersStatus === "LoadingFirstPage",
  });
  const isLoading =
    prereq.state === "loading_context" || prereq.state === "loading_data";

  // BUG-QCM-001: Filter to only steps that actually need IA action.
  // listStepsRequiringIAReview returns ALL IA-flagged steps including already-completed
  // ones. The badge count was showing "12" but only 4 actually needed sign-off.
  // A QCM inspector treating "12" as a real workload queue would be misled.
  // - pendingIaSteps: steps that still need IA attention (shown in queue table)
  // - completedIaStepsCount: steps already signed (shown as a secondary "N done" label)
  // Cast to IAStep[] (status: string) so the literal-union check doesn't false-alarm.
  const allIaSteps = (iaSteps ?? []) as IAStep[];
  const pendingIaSteps = useMemo(
    () => allIaSteps.filter((s) => s.status !== "complete"),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [iaSteps],
  );
  const completedIaStepsCount = allIaSteps.length - pendingIaSteps.length;

  // BH-006: Sort steps within each WO group by stepNumber so IA signs off in
  // sequence (1, 2, 3…) rather than in query insertion order (5, 2, 8, 1).
  // Also sort WO groups by work order number so the queue is deterministic —
  // Object.entries() would otherwise return groups in V8 key-insertion order.
  const grouped = pendingIaSteps.length > 0
    ? Object.fromEntries(
        Object.entries(groupByWorkOrder(pendingIaSteps)).map(([key, steps]) => [
          key,
          [...steps].sort((a, b) => a.stepNumber - b.stepNumber),
        ]),
      )
    : {};
  const woEntries = Object.entries(grouped).sort(([a], [b]) =>
    a.localeCompare(b),
  );

  // BUG-QCM-004: Memoize the open-WO filter — previously computed inline as an
  // IIFE in the JSX, re-running on every render trigger (dialog open/close,
  // selectedWoId change, Convex query updates). With 200 WOs this was O(200)
  // per render. Now recomputes only when workOrders changes.
  const openWos = useMemo(() => {
    // BUG-QCM-PS-002: Previously openWos was unsorted (insertion/database order)
    // and stripped the status field, so CloseReadinessPanel couldn't distinguish
    // pending_signoff WOs from in-progress ones. A QCM with 100 open WOs had to
    // check each one to find which were actually ready for RTS authorization.
    // Now: include status, sort pending_signoff WOs to the top (they're the only
    // ones a QCM can authorize RTS for), then sort remaining alphabetically by WO#.
    return (workOrders ?? [])
      .filter(
        (wo) => !["closed", "cancelled", "voided"].includes(wo.status ?? ""),
      )
      .map((wo) => ({
        _id: wo._id,
        workOrderNumber: wo.workOrderNumber,
        status: wo.status,
      }))
      .sort((a, b) => {
        const aPending = a.status === "pending_signoff" ? 0 : 1;
        const bPending = b.status === "pending_signoff" ? 0 : 1;
        if (aPending !== bPending) return aPending - bPending;
        return (a.workOrderNumber ?? "").localeCompare(b.workOrderNumber ?? "");
      });
  }, [workOrders]);

  if (isLoading) {
    return (
      <div className="space-y-6" data-testid="page-loading-state">
        <Card className="border-border/60">
          <CardContent className="p-6 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (prereq.state === "missing_context") {
    return (
      <ActionableEmptyState
        title="QCM review requires organization setup"
        missingInfo="Complete onboarding before accessing IA sign-off and close-readiness tools."
        primaryActionLabel="Complete Setup"
        primaryActionType="link"
        primaryActionTarget="/onboarding"
      />
    );
  }

  if (!orgId || !iaSteps || workOrdersStatus === "LoadingFirstPage") return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      {/* BUG-QCM-3: Previously the QCM Review page was a dead-end — no quick-access
          links to the AD/SB tracking page or Audit Trail. A QCM inspector doing a
          close-readiness review often needs to cross-reference AD compliance and the
          full audit trail. They had to navigate back to /compliance first. Added two
          shortcut buttons in the page header so the QCM can jump directly to either
          compliance tool without losing their place in the review queue. */}
      <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg sm:text-xl md:text-2xl font-semibold text-foreground flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-muted-foreground" />
            QCM Review Dashboard
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            IA sign-off queue and work order close readiness
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button
            asChild
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs border-border/60"
          >
            <Link to="/compliance/ad-sb">
              <ShieldAlert className="w-3.5 h-3.5" />
              AD/SB Tracking
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs border-border/60"
          >
            <Link to="/compliance/audit-trail">
              <FileSearch className="w-3.5 h-3.5" />
              Audit Trail
            </Link>
          </Button>
        </div>
      </div>

      {/* ── IA Sign-Off Queue ─────────────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-foreground">
            IA Sign-Off Queue
          </h2>
          {/* BUG-QCM-001: Badge now shows only PENDING steps that need action,
              not the total including already-completed ones. A count of "12"
              when only 4 needed sign-off was confusing and inflated the perceived
              queue workload. Show a secondary "N done" note when applicable. */}
          {!isLoading && (
            <>
              <Badge
                variant="secondary"
                className={`text-[10px] ${
                  pendingIaSteps.length > 0
                    ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                    : "bg-muted"
                }`}
              >
                {pendingIaSteps.length} pending
              </Badge>
              {completedIaStepsCount > 0 && (
                <span className="text-[10px] text-muted-foreground/60">
                  · {completedIaStepsCount} done
                </span>
              )}
            </>
          )}
        </div>

        {!isLoading && pendingIaSteps.length === 0 && (
          <ActionableEmptyState
            title="No steps pending IA review"
            missingInfo={
              completedIaStepsCount > 0
                ? `All ${completedIaStepsCount} IA-required step${completedIaStepsCount !== 1 ? "s" : ""} have been signed off.`
                : "Create and advance work orders to generate IA sign-off queue items."
            }
            primaryActionLabel="Create Work Order"
            primaryActionType="link"
            primaryActionTarget="/work-orders/new"
          />
        )}

        {!isLoading && woEntries.length > 0 && (
          <div className="space-y-4">
            {woEntries.map(([woNumber, steps]) => (
              <Card key={woNumber} className="border-border/60">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                    <span className="font-mono text-sm text-foreground">
                      {woNumber}
                    </span>
                    <span className="text-muted-foreground">—</span>
                    <span>{steps[0].aircraftRegistration}</span>
                    <Badge
                      variant="secondary"
                      className="ml-auto text-[10px] bg-muted"
                    >
                      {steps.length} step{steps.length > 1 ? "s" : ""}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="rounded-md border border-border/40 overflow-x-auto">
                    {/* Table header */}
                    <div className="grid grid-cols-[80px_120px_1fr_60px_1fr_100px_100px] gap-2 px-3 py-2 bg-muted/30 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide min-w-[700px]">
                      <span>WO #</span>
                      <span>Aircraft</span>
                      <span>Task Card</span>
                      <span>Step</span>
                      <span>Description</span>
                      <span>Status</span>
                      <span></span>
                    </div>

                    {steps.map((step, i) => (
                      <div key={step._id}>
                        {i > 0 && <Separator className="opacity-30" />}
                        <div className="grid grid-cols-[80px_120px_1fr_60px_1fr_100px_100px] gap-2 px-3 py-2.5 items-center hover:bg-muted/20 transition-colors min-w-[700px]">
                          <span className="font-mono text-xs text-muted-foreground truncate">
                            {step.workOrderNumber}
                          </span>
                          <span className="text-xs font-mono font-medium truncate">
                            {step.aircraftRegistration}
                          </span>
                          <span className="text-xs truncate">
                            {step.taskCardNumber} — {step.taskCardTitle}
                          </span>
                          <span className="text-xs text-center font-mono">
                            {step.stepNumber}
                          </span>
                          <span className="text-xs text-muted-foreground truncate">
                            {step.description}
                          </span>
                          <StatusBadge status={step.status} />
                          <div className="flex justify-end">
                            {step.workOrderId ? (
                              <Button
                                asChild
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs gap-1 border-primary/40 text-primary hover:bg-primary/5"
                              >
                                <Link
                                  to={`/work-orders/${step.workOrderId}/tasks/${step.taskCardId}`}
                                >
                                  IA Sign Off
                                  <ChevronRight className="w-3 h-3" />
                                </Link>
                              </Button>
                            ) : (
                              <span className="text-[10px] text-muted-foreground italic">
                                No WO linked
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* ── Work Order Close Readiness ─────────────────────────────────────── */}
      {/* BUG-QCM-004: `openWos` is now memoized at the top of the component
          (recomputes only when workOrders changes). Previously it was computed
          inside an IIFE here in JSX, re-running on every render trigger including
          WO selector changes, dialog state, and Convex query updates. */}
      {!orgId || openWos.length === 0 ? (
        <ActionableEmptyState
          title="No open work orders available for close-readiness review"
          missingInfo="All current work orders are closed, cancelled, or voided. Create a new work order to use this panel."
          primaryActionLabel="Create Work Order"
          primaryActionType="link"
          primaryActionTarget="/work-orders/new"
        />
      ) : (
        <CloseReadinessPanel orgId={orgId} workOrders={openWos} />
      )}
    </div>
  );
}
