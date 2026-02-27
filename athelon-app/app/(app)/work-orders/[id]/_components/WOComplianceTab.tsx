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

// ─── Section 1: Task Compliance Summary ──────────────────────────────────────

type TaskComplianceStatus =
  | "all_compliant"
  | "issues_pending"
  | "non_compliant"
  | "no_items";

type TaskComplianceSummaryRow = {
  taskCardId: string;
  taskNumber: string;
  taskTitle: string;
  itemCount: number;
  overallStatus: TaskComplianceStatus;
};

const demoTaskCompliance: TaskComplianceSummaryRow[] = [
  {
    taskCardId: "tc-1",
    taskNumber: "TC-001",
    taskTitle: "Engine Compression Check — All Cylinders",
    itemCount: 2,
    overallStatus: "all_compliant",
  },
  {
    taskCardId: "tc-2",
    taskNumber: "TC-002",
    taskTitle: "Oil Change & Filter Inspection",
    itemCount: 1,
    overallStatus: "issues_pending",
  },
  {
    taskCardId: "tc-3",
    taskNumber: "TC-003",
    taskTitle: "Brake System Inspection",
    itemCount: 0,
    overallStatus: "no_items",
  },
];

function getTaskComplianceOverall(
  rows: TaskComplianceSummaryRow[],
): TaskComplianceStatus {
  if (rows.length === 0) return "no_items";
  if (rows.some((r) => r.overallStatus === "non_compliant"))
    return "non_compliant";
  if (rows.some((r) => r.overallStatus === "issues_pending"))
    return "issues_pending";
  if (rows.every((r) => r.overallStatus === "all_compliant"))
    return "all_compliant";
  return "no_items";
}

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

function TaskComplianceSection({
  workOrderId,
}: {
  workOrderId: string;
}) {
  const overall = getTaskComplianceOverall(demoTaskCompliance);

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
        {demoTaskCompliance.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-sm text-muted-foreground">
              No task compliance data yet. Open a task card and add compliance
              items.
            </p>
          </div>
        ) : (
          <div className="space-y-0">
            {/* Header row */}
            <div className="grid grid-cols-[60px_1fr_100px_120px_90px] gap-3 px-3 py-2 text-[10px] font-medium text-muted-foreground uppercase tracking-wide border-b border-border/40">
              <span>Task #</span>
              <span>Title</span>
              <span>Compliance Items</span>
              <span>Status</span>
              <span className="text-right">Action</span>
            </div>
            {demoTaskCompliance.map((row) => (
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
                      to={`/work-orders/${workOrderId}/tasks/${row.taskCardId}`}
                    >
                      View Task
                      <ChevronRight className="w-3 h-3" />
                    </Link>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Section 2: AD Compliance (inlined from AdComplianceTab) ─────────────────

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
  if (
    complianceStatus === "not_complied" ||
    complianceStatus === "pending_determination"
  ) {
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
      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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

// ─── Section 3: Return to Service ────────────────────────────────────────────

type RtsChecklistItem = {
  id: string;
  label: string;
  complete: boolean;
};

const demoRtsChecklist: RtsChecklistItem[] = [
  { id: "rts-1", label: "All task cards complete", complete: true },
  {
    id: "rts-2",
    label: "All task compliance items resolved",
    complete: true,
  },
  {
    id: "rts-3",
    label: "No open squawks/discrepancies",
    complete: false,
  },
  { id: "rts-4", label: "AD compliance current", complete: false },
  {
    id: "rts-5",
    label: "Maintenance records signed",
    complete: false,
  },
];

function ReturnToServiceSection({
  workOrderId,
}: {
  workOrderId: string;
}) {
  const allComplete = demoRtsChecklist.every((item) => item.complete);
  // Demo: no RTS record exists, so show the checklist state
  const rtsCompleted = false;

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-3">
        <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
          <ShieldCheck className="w-3.5 h-3.5" />
          Return to Service Authorization
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {rtsCompleted ? (
          <Card className="border-green-500/30 bg-green-500/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-green-600 dark:text-green-400">
                    RTS Authorized
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Authorized on Feb 25, 2026 by Ray Kowalski (A&P #12345678)
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {/* Checklist */}
            <div className="space-y-2">
              {demoRtsChecklist.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-2.5 py-1.5"
                >
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

            {/* Action button */}
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
                          <Link to={`/work-orders/${workOrderId}/rts`}>
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

            {/* Note */}
            <p className="text-[11px] text-muted-foreground/70">
              RTS authorization is the final step before closing this work
              order.
            </p>
          </div>
        )}
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
  return (
    <div className="space-y-6">
      <TaskComplianceSection workOrderId={workOrderId} />
      <AdComplianceSection workOrderId={workOrderId} />
      <ReturnToServiceSection workOrderId={workOrderId} />
    </div>
  );
}
