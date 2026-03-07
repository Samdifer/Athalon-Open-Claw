/**
 * WOComplianceTab.tsx
 *
 * AI-001: Task Compliance section now wired to real Convex data via
 *   api.taskCompliance.getComplianceItemsForWorkOrder
 * AI-002: Return-to-Service section now wired to real
 *   api.returnToService.getCloseReadinessReport — shows actual blockers,
 *   real RTS-signed state, and live close-readiness status.
 *
 * No demo/hardcoded data anywhere in this file.
 */

import { Link, useParams } from "react-router-dom";
import { useQuery } from "convex/react";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Clock,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// ─── Shared Types ─────────────────────────────────────────────────────────────

type TaskComplianceStatus =
  | "all_compliant"
  | "issues_pending"
  | "non_compliant"
  | "no_items";

// ─── Shared Sub-Components ────────────────────────────────────────────────────

function ComplianceStatusBadge({ status }: { status: TaskComplianceStatus }) {
  switch (status) {
    case "all_compliant":
      return (
        <Badge
          variant="outline"
          className="bg-green-500/15 text-green-600 dark:text-green-400 border-green-500/30 text-[10px]"
        >
          <CheckCircle2 className="w-2.5 h-2.5 mr-1" />
          All Clear
        </Badge>
      );
    case "issues_pending":
      return (
        <Badge
          variant="outline"
          className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 text-[10px]"
        >
          <Clock className="w-2.5 h-2.5 mr-1" />
          Pending Review
        </Badge>
      );
    case "non_compliant":
      return (
        <Badge
          variant="outline"
          className="bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30 text-[10px]"
        >
          <AlertTriangle className="w-2.5 h-2.5 mr-1" />
          Issues Found
        </Badge>
      );
    case "no_items":
      return (
        <Badge
          variant="outline"
          className="bg-muted text-muted-foreground border-border/40 text-[10px]"
        >
          No Items Added
        </Badge>
      );
  }
}

// ─── Section 1: Task Compliance (AI-001) ──────────────────────────────────────

/**
 * Queries real compliance data from api.taskCompliance.getComplianceItemsForWorkOrder
 * and cross-references task card metadata from api.returnToService.getCloseReadinessReport.
 */
function TaskComplianceSection({
  workOrderId,
  orgId,
}: {
  workOrderId: Id<"workOrders">;
  orgId: Id<"organizations">;
}) {
  // Real compliance items grouped by task card
  const complianceGroups = useQuery(
    api.taskCompliance.getComplianceItemsForWorkOrder,
    { workOrderId },
  );

  // Task card metadata (titles, numbers) from close-readiness report
  const report = useQuery(
    api.returnToService.getCloseReadinessReport,
    { workOrderId, organizationId: orgId },
  );

  if (complianceGroups === undefined || report === undefined) {
    return (
      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Task Compliance
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  // Build a lookup: taskCardId → { taskCardNumber, title }
  const taskCardMeta = new Map<
    string,
    { taskCardNumber?: string; title?: string }
  >();
  if (report) {
    for (const tc of report.taskCards) {
      taskCardMeta.set(String(tc.taskCardId), {
        taskCardNumber: tc.taskCardNumber ?? undefined,
        title: tc.title ?? undefined,
      });
    }
  }

  // Build merged rows: one row per task card in the report,
  // showing compliance status from complianceGroups (or "no_items" if absent).
  const taskCards = report?.taskCards ?? [];

  // Merge compliance groups with task card list
  const complianceByCard = new Map<string, TaskComplianceStatus>();
  for (const group of complianceGroups) {
    complianceByCard.set(String(group.taskCardId), group.overallStatus);
  }

  type Row = {
    taskCardId: string;
    taskNumber: string;
    taskTitle: string;
    itemCount: number;
    overallStatus: TaskComplianceStatus;
  };

  const rows: Row[] = taskCards.map((tc) => {
    const tcIdStr = String(tc.taskCardId);
    const group = complianceGroups.find(
      (g) => String(g.taskCardId) === tcIdStr,
    );
    return {
      taskCardId: tcIdStr,
      taskNumber: tc.taskCardNumber ?? "—",
      taskTitle: tc.title ?? "—",
      itemCount: group?.items.length ?? 0,
      overallStatus: complianceByCard.get(tcIdStr) ?? "no_items",
    };
  });

  // Also include any compliance groups for task cards not in the report
  // (edge case: deleted task cards with lingering compliance items)
  for (const group of complianceGroups) {
    const tcIdStr = String(group.taskCardId);
    if (!rows.find((r) => r.taskCardId === tcIdStr)) {
      const meta = taskCardMeta.get(tcIdStr);
      rows.push({
        taskCardId: tcIdStr,
        taskNumber: meta?.taskCardNumber ?? "—",
        taskTitle: meta?.title ?? "(Task card not found)",
        itemCount: group.items.length,
        overallStatus: group.overallStatus,
      });
    }
  }

  // Compute overall
  function computeOverall(rowList: Row[]): TaskComplianceStatus {
    if (rowList.length === 0) return "no_items";
    if (rowList.some((r) => r.overallStatus === "non_compliant"))
      return "non_compliant";
    if (rowList.some((r) => r.overallStatus === "issues_pending"))
      return "issues_pending";
    if (rowList.every((r) => r.overallStatus === "all_compliant"))
      return "all_compliant";
    return "no_items";
  }

  const overall = computeOverall(rows);

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Task Compliance
          </CardTitle>
          <ComplianceStatusBadge status={overall} />
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {rows.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-sm text-muted-foreground">
              No work cards on this work order. Add work cards to track
              compliance items.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
          <div className="space-y-0 min-w-[480px]">{/* BUG-QCM-TC-001: overflow-x-auto + min-w guards fixed grid cols from clipping on narrow viewports */}
            {/* Header row */}
            <div className="grid grid-cols-[60px_1fr_100px_120px_90px] gap-3 px-3 py-2 text-[10px] font-medium text-muted-foreground uppercase tracking-wide border-b border-border/40">
              <span>Task #</span>
              <span>Title</span>
              <span>Compliance Items</span>
              <span>Status</span>
              <span className="text-right">Action</span>
            </div>
            {rows.map((row) => (
              <div
                key={row.taskCardId}
                className="grid grid-cols-[60px_1fr_100px_120px_90px] gap-3 px-3 py-2.5 items-center border-b border-border/40 last:border-0"
              >
                <span className="font-mono text-xs font-semibold text-foreground">
                  {row.taskNumber}
                </span>
                <span className="text-xs text-muted-foreground truncate">
                  {row.taskTitle}
                </span>
                <span>
                  {row.itemCount > 0 ? (
                    <Badge
                      variant="secondary"
                      className="h-4 min-w-[16px] px-1.5 text-[9px]"
                    >
                      {row.itemCount} item{row.itemCount !== 1 ? "s" : ""}
                    </Badge>
                  ) : (
                    <span className="text-[10px] text-muted-foreground/60">
                      —
                    </span>
                  )}
                </span>
                <ComplianceStatusBadge status={row.overallStatus} />
                <div className="text-right">
                  <Button
                    asChild
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-[10px] gap-1"
                  >
                    <Link
                      to={`/work-orders/${String(workOrderId)}/tasks/${row.taskCardId}`}
                    >
                      View Task
                      <ChevronRight className="w-3 h-3" />
                    </Link>
                  </Button>
                </div>
              </div>
            ))}
          </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Section 2: AD Compliance (unchanged — already uses real data) ────────────

type AdItem = {
  adComplianceId: Id<"adCompliance">;
  adNumber: string;
  adTitle: string;
  complianceStatus: string;
  adType?: string;
  isOverdue: boolean;
  isDueSoon: boolean;
  nextDueDate?: number;
  nextDueHours?: number;
  hoursRemaining?: number;
  daysRemaining?: number;
  lastComplianceDate?: number;
  appliesTo: string;
};

function AdStatusBadge({
  isOverdue,
  isDueSoon,
  complianceStatus,
}: {
  isOverdue: boolean;
  isDueSoon: boolean;
  complianceStatus: string;
}) {
  // BUG-QCM-C1: Previously `pending_determination` was shown as a red "Not Complied"
  // badge — same as `not_complied`. These are meaningfully different states:
  //   • not_complied = AD was never performed (actively non-compliant, blocks RTS)
  //   • pending_determination = applicability not yet established (needs review,
  //     not necessarily a compliance failure)
  // audit-trail/page.tsx already fixed this (BUG-QCM-AT-001). A QCM inspector
  // viewing the WO Compliance tab saw "Not Complied" for a pending AD, then visited
  // the Audit Trail and saw "Pending" for the same record. Inconsistency destroyed
  // trust in both pages. Now both use the same convention: amber "Pending" badge.
  if (complianceStatus === "pending_determination") {
    return (
      <Badge
        variant="outline"
        className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 text-[10px]"
      >
        <Clock className="w-2.5 h-2.5 mr-1" />
        Pending
      </Badge>
    );
  }
  if (complianceStatus === "not_complied") {
    return (
      <Badge
        variant="outline"
        className="bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30 text-[10px]"
      >
        <AlertTriangle className="w-2.5 h-2.5 mr-1" />
        Not Complied
      </Badge>
    );
  }
  if (isOverdue) {
    return (
      <Badge
        variant="outline"
        className="bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30 text-[10px]"
      >
        <AlertTriangle className="w-2.5 h-2.5 mr-1" />
        Overdue
      </Badge>
    );
  }
  if (isDueSoon) {
    return (
      <Badge
        variant="outline"
        className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 text-[10px]"
      >
        <Clock className="w-2.5 h-2.5 mr-1" />
        Due Soon
      </Badge>
    );
  }
  return (
    <Badge
      variant="outline"
      className="bg-green-500/15 text-green-600 dark:text-green-400 border-green-500/30 text-[10px]"
    >
      <CheckCircle2 className="w-2.5 h-2.5 mr-1" />
      Complied
    </Badge>
  );
}

function AdRow({ item }: { item: AdItem }) {
  const fmt = (ms?: number) =>
    ms
      ? new Date(ms).toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
          timeZone: "UTC",
        })
      : null;

  const appliesToColors: Record<string, string> = {
    aircraft:
      "bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30",
    engine:
      "bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30",
    part: "bg-slate-500/15 text-slate-500 dark:text-slate-400 border-slate-500/30",
  };

  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-border/40 last:border-0">
      <AdStatusBadge
        isOverdue={item.isOverdue}
        isDueSoon={item.isDueSoon}
        complianceStatus={item.complianceStatus}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-0.5">
          <span className="font-mono text-xs font-semibold text-foreground">
            {item.adNumber}
          </span>
          <Badge
            variant="outline"
            className={`text-[10px] border ${appliesToColors[item.appliesTo] ?? "bg-muted text-muted-foreground"}`}
          >
            {item.appliesTo}
          </Badge>
        </div>
        <p className="text-[11px] text-muted-foreground truncate">
          {item.adTitle}
        </p>
        <div className="flex items-center gap-3 mt-0.5 flex-wrap">
          {item.lastComplianceDate && (
            <span className="text-[10px] text-muted-foreground/70">
              Last: {fmt(item.lastComplianceDate)}
            </span>
          )}
          {item.nextDueDate != null && (
            <span
              className={`text-[10px] ${item.isOverdue ? "text-red-600 dark:text-red-400" : item.isDueSoon ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground/70"}`}
            >
              Due: {fmt(item.nextDueDate)}
              {item.daysRemaining != null && (
                <span>
                  {" "}
                  (
                  {item.daysRemaining < 0
                    ? `${Math.abs(item.daysRemaining)}d overdue`
                    : `${item.daysRemaining}d`}
                  )
                </span>
              )}
            </span>
          )}
          {item.nextDueHours != null && (
            <span
              className={`text-[10px] font-mono ${item.isOverdue ? "text-red-600 dark:text-red-400" : item.isDueSoon ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground/70"}`}
            >
              Due: {item.nextDueHours.toFixed(1)} hr
              {item.hoursRemaining != null && (
                <span>
                  {" "}
                  (
                  {item.hoursRemaining <= 0
                    ? `${Math.abs(item.hoursRemaining).toFixed(1)} hr over`
                    : `${item.hoursRemaining.toFixed(1)} hr left`}
                  )
                </span>
              )}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function AdComplianceSection({
  workOrderId,
}: {
  workOrderId: string;
}) {
  const params = useParams<{ id: string }>();
  const { orgId } = useCurrentOrg();

  const convexWorkOrderId = (params.id ?? workOrderId) as Id<"workOrders">;

  if (!orgId) {
    return (
      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Airworthiness Directive Compliance
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="py-6 text-center">
            <p className="text-sm text-muted-foreground">
              No organization context. Please sign in to an organization.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div>
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
        <ShieldCheck className="w-3.5 h-3.5" />
        Airworthiness Directive Compliance
      </h3>
      <AdCompliancePanelInner
        workOrderId={convexWorkOrderId}
        organizationId={orgId}
      />
    </div>
  );
}

function AdCompliancePanelInner({
  workOrderId,
  organizationId,
}: {
  workOrderId: Id<"workOrders">;
  organizationId: Id<"organizations">;
}) {
  const report = useQuery(api.returnToService.getCloseReadinessReport, {
    workOrderId,
    organizationId,
  });

  const adData = useQuery(
    api.adCompliance.checkAdDueForAircraft,
    report?.aircraftId
      ? {
          aircraftId: report.aircraftId as Id<"aircraft">,
          organizationId,
        }
      : "skip",
  );

  if (report === undefined || (report?.aircraftId && adData === undefined)) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-14 w-full rounded-md" />
        ))}
      </div>
    );
  }

  if (report === null) {
    return (
      <div className="py-6 text-center">
        <p className="text-sm text-muted-foreground">Work order not found.</p>
      </div>
    );
  }

  if (!report.aircraftId || adData === null) {
    return (
      <div className="py-6 text-center">
        <p className="text-sm text-muted-foreground">
          No aircraft associated with this work order.
        </p>
      </div>
    );
  }

  if (adData === undefined) {
    return (
      <div className="space-y-2">
        {[1, 2].map((i) => (
          <Skeleton key={i} className="h-14 w-full rounded-md" />
        ))}
      </div>
    );
  }

  const { items, summary, currentHours, aircraftRegistration } = adData;

  return (
    <div className="space-y-4">
      {/* Summary Cards
          BUG-QCM-053: Previous 4-card grid (Total ADs, Overdue, Due Soon, Aircraft TT)
          omitted "Not Complied". The audit-trail page AdCompliancePanel and ad-sb/page.tsx
          both show a 5th "Not Complied" card (BUG-QCM-C3, BUG-QCM-052) but the WO
          Compliance tab's inner panel was left on the old 4-card layout. A QCM checking
          the compliance tab on a WO with 0 overdue but 2 never-performed ADs would see
          "Overdue: 0" with no red signal — those ADs block RTS just as hard as overdue
          ones. Now: 5-card grid matching the audit trail's AdCompliancePanel. */}
      {(() => {
        const notCompliedCount =
          (summary as unknown as Record<string, number>)["notCompliedCount"] ?? 0;
        return (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <Card className="border-border/60">
              <CardContent className="p-3">
                <p className="text-[11px] text-muted-foreground mb-1">Total ADs</p>
                <span className="text-lg font-bold text-foreground">
                  {summary.total}
                </span>
              </CardContent>
            </Card>
            <Card
              className={`border-border/60 ${summary.overdueCount > 0 ? "border-red-500/40 bg-red-500/5" : ""}`}
            >
              <CardContent className="p-3">
                <p className="text-[11px] text-muted-foreground mb-1">Overdue</p>
                <span
                  className={`text-lg font-bold ${summary.overdueCount > 0 ? "text-red-600 dark:text-red-400" : "text-foreground"}`}
                >
                  {summary.overdueCount}
                </span>
              </CardContent>
            </Card>
            <Card
              className={`border-border/60 ${notCompliedCount > 0 ? "border-red-500/40 bg-red-500/5" : ""}`}
            >
              <CardContent className="p-3">
                <p className="text-[11px] text-muted-foreground mb-1">Not Complied</p>
                <span
                  className={`text-lg font-bold ${notCompliedCount > 0 ? "text-red-600 dark:text-red-400" : "text-foreground"}`}
                >
                  {notCompliedCount}
                </span>
              </CardContent>
            </Card>
            <Card
              className={`border-border/60 ${summary.dueSoonCount > 0 ? "border-amber-500/40 bg-amber-500/5" : ""}`}
            >
              <CardContent className="p-3">
                <p className="text-[11px] text-muted-foreground mb-1">Due Soon</p>
                <span
                  className={`text-lg font-bold ${summary.dueSoonCount > 0 ? "text-amber-600 dark:text-amber-400" : "text-foreground"}`}
                >
                  {summary.dueSoonCount}
                </span>
              </CardContent>
            </Card>
            <Card className="border-border/60">
              <CardContent className="p-3">
                <p className="text-[11px] text-muted-foreground mb-1">
                  Aircraft TT
                </p>
                <span className="text-lg font-bold font-mono text-foreground">
                  {currentHours.toFixed(1)} hr
                </span>
              </CardContent>
            </Card>
          </div>
        );
      })()}

      {/* Blocking Banner */}
      {summary.hasBlockingItems && (
        <Card className="border-red-500/30 bg-red-500/5">
          <CardContent className="p-3 flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0" />
            <p className="text-xs text-red-600 dark:text-red-400 font-medium">
              {aircraftRegistration} has blocking AD items. Aircraft may not
              return to service until resolved.
            </p>
          </CardContent>
        </Card>
      )}

      {/* AD List */}
      <Card className="border-border/60">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
            <ShieldCheck className="w-3.5 h-3.5" />
            AD Compliance — {aircraftRegistration}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {items.length === 0 ? (
            <div className="py-8 text-center">
              <CheckCircle2 className="w-6 h-6 text-green-500/60 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                No applicable ADs on file.
              </p>
            </div>
          ) : (
            items.map((item: AdItem) => (
              <AdRow key={item.adComplianceId} item={item} />
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Section 3: Return to Service (AI-002) ────────────────────────────────────

/**
 * Replaces hardcoded demoRtsChecklist with real close-readiness data.
 * Shows actual blocking conditions from the backend and correctly
 * reflects whether RTS has already been authorized.
 */
function ReturnToServiceSection({
  workOrderId,
  orgId,
}: {
  workOrderId: Id<"workOrders">;
  orgId: Id<"organizations">;
}) {
  const report = useQuery(api.returnToService.getCloseReadinessReport, {
    workOrderId,
    organizationId: orgId,
  });

  if (report === undefined) {
    return (
      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
            <ShieldCheck className="w-3.5 h-3.5" />
            Return to Service Authorization
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-8 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (report === null) {
    return (
      <Card className="border-border/60">
        <CardContent className="py-6 text-center text-sm text-muted-foreground">
          Work order not found.
        </CardContent>
      </Card>
    );
  }

  // ── Already signed ─────────────────────────────────────────────────────────
  if (report.isAlreadySigned) {
    return (
      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
            <ShieldCheck className="w-3.5 h-3.5" />
            Return to Service Authorization
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <Card className="border-green-500/30 bg-green-500/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-green-600 dark:text-green-400">
                    RTS Authorized
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Return-to-service authorization on file.
                    {report.existingRtsId && (
                      <span className="font-mono ml-1">
                        (Record: {String(report.existingRtsId).slice(0, 12)}…)
                      </span>
                    )}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    );
  }

  // ── Not yet signed — derive real checklist from blockers ───────────────────

  // Build readable checklist from the report's blocker codes and summary
  const summary = report.summary;
  const blockers = report.blockers ?? [];

  type CheckItem = { id: string; label: string; complete: boolean };
  const checkItems: CheckItem[] = [
    {
      id: "task_cards",
      label: `All work cards complete (${summary.completedTaskCards}/${summary.totalTaskCards})`,
      complete:
        summary.completedTaskCards === summary.totalTaskCards &&
        summary.totalTaskCards > 0,
    },
    {
      id: "discrepancies",
      label: `No open findings (${summary.openDiscrepancies} open)`,
      complete: summary.openDiscrepancies === 0,
    },
    {
      id: "maintenance_records",
      // BUG-QCM-C3: Previously required `totalMaintenanceRecords > 0` as part
      // of the "complete" guard. For WOs with no formal maintenance records
      // (e.g. an inspection-only WO, or a new WO before any records are created),
      // this check evaluated to `false`, disabling the "Proceed to RTS
      // Authorization" button even when all backend blockers were resolved.
      // The QCM inspector saw a grayed-out button with no explanation — the
      // checklist item showed "Maintenance records signed (0/0)" as the only
      // incomplete item, but 0 unsigned records is not a failure condition.
      // The actual enforcement gate is PRE-8 on the RTS page, which shows
      // PENDING (not FAIL) when there are 0 records on certain WO types.
      // Now 0 records = vacuously complete in this checklist (consistent with
      // how PRE-8 is evaluated). The RTS page still enforces the real gate.
      label: `Maintenance records signed (${summary.signedMaintenanceRecords}/${summary.totalMaintenanceRecords})`,
      complete:
        summary.totalMaintenanceRecords === 0 ||
        summary.signedMaintenanceRecords === summary.totalMaintenanceRecords,
    },
    {
      id: "blockers",
      label: `No blocking conditions (${blockers.length} blocker${blockers.length !== 1 ? "s" : ""})`,
      complete: blockers.length === 0,
    },
  ];

  const allComplete = checkItems.every((item) => item.complete);

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-3">
        <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
          <ShieldCheck className="w-3.5 h-3.5" />
          Return to Service Authorization
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-4">
          {/* Live Checklist */}
          <div className="space-y-2">
            {checkItems.map((item) => (
              <div key={item.id} className="flex items-center gap-2.5 py-1.5">
                {item.complete ? (
                  <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-500/70 flex-shrink-0" />
                )}
                <span
                  className={`text-sm ${item.complete ? "text-foreground" : "text-muted-foreground"}`}
                >
                  {item.label}
                </span>
              </div>
            ))}
          </div>

          {/* Blocker detail */}
          {blockers.length > 0 && (
            <div className="p-3 border border-red-500/20 bg-red-500/5 rounded-md">
              <p className="text-[11px] font-medium text-red-600 dark:text-red-400 mb-1.5 flex items-center gap-1.5">
                <AlertTriangle className="w-3 h-3" />
                Blocking Conditions ({blockers.length})
              </p>
              <ul className="space-y-1">
                {blockers.map((b: { code: string; description: string }) => (
                  <li
                    key={b.code}
                    className="text-[10px] text-muted-foreground flex items-start gap-1.5"
                  >
                    <span className="text-red-500 font-mono font-bold mt-0.5">
                      ✗
                    </span>
                    <span>
                      <span className="font-mono text-red-600 dark:text-red-400">
                        [{b.code}]
                      </span>{" "}
                      {b.description}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Action Button */}
          <div className="pt-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-block">
                    <Button
                      asChild={allComplete}
                      disabled={!allComplete}
                      className="gap-2"
                    >
                      {allComplete ? (
                        <Link
                          to={`/work-orders/${String(workOrderId)}/rts`}
                        >
                          <ShieldCheck className="w-4 h-4" />
                          Proceed to RTS Authorization
                          <ChevronRight className="w-4 h-4" />
                        </Link>
                      ) : (
                        <>
                          <ShieldCheck className="w-4 h-4" />
                          Proceed to RTS Authorization
                          <ChevronRight className="w-4 h-4" />
                        </>
                      )}
                    </Button>
                  </span>
                </TooltipTrigger>
                {!allComplete && (
                  <TooltipContent>
                    <p>Resolve all checklist items first</p>
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          </div>

          <p className="text-[11px] text-muted-foreground/70">
            RTS authorization is the final step before closing this work order.
            Per 14 CFR 43.9 and Part 145.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main Export ──────────────────────────────────────────────────────────────

export function WOComplianceTab({
  workOrderId,
}: {
  workOrderId: string;
}) {
  const { orgId } = useCurrentOrg();
  const convexWorkOrderId = workOrderId as Id<"workOrders">;

  if (!orgId) {
    return (
      <Card className="border-border/60">
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          Unable to resolve organization context.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* AI-001: Real task compliance data */}
      <TaskComplianceSection workOrderId={convexWorkOrderId} orgId={orgId} />

      {/* Existing: AD compliance (already uses real data) */}
      <AdComplianceSection workOrderId={workOrderId} />

      {/* AI-002: Real RTS state */}
      <ReturnToServiceSection workOrderId={convexWorkOrderId} orgId={orgId} />
    </div>
  );
}
