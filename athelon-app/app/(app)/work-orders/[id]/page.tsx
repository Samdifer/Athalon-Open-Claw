"use client";

import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "convex/react";
import {
  ArrowLeft,
  AlertTriangle,
  Package,
  FileText,
  ShieldCheck,
  XCircle,
  Clock,
  User,
  Calendar,
  TrendingUp,
  Paperclip,
  CheckCircle2,
} from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { formatDate } from "@/lib/format";
import { Download } from "lucide-react";
import { toast } from "sonner";
import {
  WO_STATUS_LABEL,
  WO_STATUS_STYLES,
  WO_TYPE_LABEL,
  type WoStatus,
  type WoType,
} from "@/lib/mro-constants";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  WorkItemsList,
  type WorkItem,
  type TaskCardItem,
  type DiscrepancyItem,
} from "@/app/(app)/work-orders/[id]/_components/WorkItemsList";
import { WOComplianceTab } from "@/app/(app)/work-orders/[id]/_components/WOComplianceTab";
import { DocumentAttachmentPanel } from "@/app/(app)/work-orders/[id]/_components/DocumentAttachmentPanel";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";

type RiskLevel = "overdue" | "at_risk" | "on_track" | "no_date";

function isWorkOrderNumberRef(value: string): boolean {
  return /^WO-/i.test(value.trim());
}

function isConvexIdLike(value: string): boolean {
  return /^[A-Za-z0-9]{10,}$/.test(value);
}

function getScheduleRiskLevel(promisedDeliveryDateMs: number | null | undefined): RiskLevel {
  if (!promisedDeliveryDateMs) return "no_date";
  const now = Date.now();
  if (promisedDeliveryDateMs < now) return "overdue";
  const daysLeft = (promisedDeliveryDateMs - now) / (1000 * 60 * 60 * 24);
  return daysLeft <= 2 ? "at_risk" : "on_track";
}

function normalizeDiscrepancyStatus(
  status: string,
  disposition?: string,
): "open" | "deferred" | "corrected" {
  if (status !== "dispositioned") return "open";
  if (disposition === "deferred_mel" || disposition === "deferred_grounded") return "deferred";
  return "corrected";
}

function partStatusLabel(location: string): string {
  const map: Record<string, string> = {
    pending_inspection: "Pending Inspection",
    inventory: "Inventory",
    installed: "Installed",
    removed_pending_disposition: "Removed",
    quarantine: "Quarantine",
    scrapped: "Scrapped",
    returned_to_vendor: "Returned",
  };
  return map[location] ?? location;
}

function partStatusStyle(location: string): string {
  const map: Record<string, string> = {
    installed: "bg-green-500/15 text-green-400 border-green-500/30",
    inventory: "bg-sky-500/15 text-sky-400 border-sky-500/30",
    pending_inspection: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    quarantine: "bg-red-500/15 text-red-400 border-red-500/30",
    removed_pending_disposition: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  };
  return map[location] ?? "bg-slate-500/15 text-slate-400 border-slate-500/30";
}

function ScheduleRiskChip({ riskLevel }: { riskLevel: RiskLevel }) {
  if (riskLevel === "no_date") return null;
  const styles = {
    overdue: "bg-red-500/15 text-red-400 border-red-500/30",
    at_risk: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    on_track: "bg-green-500/15 text-green-400 border-green-500/30",
  } as const;
  const labels = { overdue: "Overdue", at_risk: "At Risk", on_track: "On Track" } as const;
  return (
    <Badge variant="outline" className={`text-[10px] font-medium border gap-1 ${styles[riskLevel]}`}>
      <TrendingUp className="w-2.5 h-2.5" />
      {labels[riskLevel]}
    </Badge>
  );
}

export default function WorkOrderDetailPage() {
  const { id: routeRef = "" } = useParams<{ id: string }>();
  const { orgId, isLoaded } = useCurrentOrg();

  const legacyResolution = useQuery(
    api.workOrders.resolveWorkOrderRef,
    orgId && isWorkOrderNumberRef(routeRef)
      ? { organizationId: orgId, workOrderRef: routeRef }
      : "skip",
  );

  const workOrderId = useMemo(() => {
    if (!routeRef) return undefined;
    if (isWorkOrderNumberRef(routeRef)) return legacyResolution?.workOrderId;
    if (isConvexIdLike(routeRef)) return routeRef as Id<"workOrders">;
    return undefined;
  }, [legacyResolution?.workOrderId, routeRef]);

  const data = useQuery(
    api.workOrders.getWorkOrder,
    orgId && workOrderId ? { workOrderId, organizationId: orgId } : "skip",
  );

  const closeReadiness = useQuery(
    api.workOrders.getCloseReadiness,
    orgId && workOrderId ? { workOrderId, organizationId: orgId } : "skip",
  );

  const allParts = useQuery(
    api.parts.listParts,
    orgId ? { organizationId: orgId } : "skip",
  );

  const isLegacyRefResolving =
    isWorkOrderNumberRef(routeRef) && orgId && legacyResolution === undefined;
  const isDataLoading = Boolean(orgId && workOrderId && data === undefined);

  if (!isLoaded || isLegacyRefResolving || isDataLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!orgId) {
    return (
      <Card className="border-border/60">
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          Unable to resolve organization context.
        </CardContent>
      </Card>
    );
  }

  if (!workOrderId) {
    return (
      <Card className="border-border/60">
        <CardContent className="py-10 text-center">
          <p className="text-sm font-medium text-foreground">Invalid work order reference</p>
          <p className="text-xs text-muted-foreground mt-1">
            Ref: <span className="font-mono">{routeRef || "—"}</span>
          </p>
          <Button asChild size="sm" className="mt-4">
            <Link to="/work-orders">Back to Work Orders</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card className="border-border/60">
        <CardContent className="py-10 text-center">
          <p className="text-sm font-medium text-foreground">Work order not found</p>
          <p className="text-xs text-muted-foreground mt-1">
            ID: <span className="font-mono">{String(workOrderId)}</span>
          </p>
          <Button asChild size="sm" className="mt-4">
            <Link to="/work-orders">Back to Work Orders</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const wo = data.workOrder;
  const aircraft = data.aircraft;
  const taskCards = data.taskCards ?? [];
  const discrepancies = data.discrepancies ?? [];
  const auditEvents = data.auditEvents ?? [];

  const tasksComplete = taskCards.filter((tc) => tc.status === "complete").length;
  const tasksTotal = taskCards.length;
  const openSquawks = discrepancies.filter(
    (d) => d.status === "open" || d.status === "under_evaluation",
  ).length;
  const riskLevel = getScheduleRiskLevel(wo.promisedDeliveryDate);

  const workItems: WorkItem[] = [
    ...taskCards.map(
      (tc): TaskCardItem => ({
        kind: "task",
        id: String(tc._id),
        number: tc.taskCardNumber,
        title: tc.title,
        status: tc.status,
        taskType: tc.taskType,
        stepCount: tc.stepCount ?? tc.steps.length,
        completedStepCount:
          tc.completedStepCount ??
          tc.steps.filter((s) => s.status === "completed" || s.status === "na").length,
        aircraftSystem: tc.aircraftSystem,
        isInspectionItem: tc.isInspectionItem,
        isCustomerReported: tc.isCustomerReported,
      }),
    ),
    ...discrepancies.map(
      (sq): DiscrepancyItem => ({
        kind: "finding",
        id: String(sq._id),
        number: sq.discrepancyNumber,
        description: sq.description,
        status: normalizeDiscrepancyStatus(sq.status, sq.disposition),
        disposition: sq.disposition,
        foundBy: sq.foundByTechnicianId,
        foundDate: formatDate(sq.foundAt),
        aircraftSystem: sq.aircraftSystem,
        squawkOrigin: sq.squawkOrigin,
        isCustomerReported: sq.isCustomerReported,
        foundDuringRts: sq.foundDuringRts,
      }),
    ),
  ];

  const partsForThisWorkOrder = (allParts ?? []).filter(
    (part) =>
      part.receivingWorkOrderId === workOrderId ||
      part.reservedForWorkOrderId === workOrderId ||
      part.installedByWorkOrderId === workOrderId ||
      part.installedOnWorkOrderId === workOrderId ||
      part.removedByWorkOrderId === workOrderId,
  );

  const readinessBlockers = closeReadiness?.blockers ?? [];
  const canClose = closeReadiness?.canClose ?? false;

  return (
    <div className="space-y-5">
      <div>
        <Button asChild variant="ghost" size="sm" className="h-7 -ml-2 mb-3 text-xs text-muted-foreground">
          <Link to="/work-orders">
            <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
            Work Orders
          </Link>
        </Button>
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 mb-1 flex-wrap">
              <h1 className="text-lg sm:text-xl md:text-2xl font-semibold font-mono text-foreground">{wo.workOrderNumber}</h1>
              <Badge
                variant="outline"
                className={`text-[11px] font-medium border ${
                  WO_STATUS_STYLES[wo.status as WoStatus] ?? "bg-muted text-muted-foreground"
                }`}
              >
                {WO_STATUS_LABEL[wo.status as WoStatus] ?? wo.status}
              </Badge>
              <Badge variant="outline" className="text-[10px] text-muted-foreground border-border/40">
                {WO_TYPE_LABEL[wo.workOrderType as WoType] ?? wo.workOrderType}
              </Badge>
              <ScheduleRiskChip riskLevel={riskLevel} />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono font-bold text-2xl text-foreground">
                {aircraft?.currentRegistration ?? "—"}
              </span>
              {aircraft && (
                <span className="text-base text-muted-foreground">
                  {aircraft.make} {aircraft.model}
                </span>
              )}
              {aircraft?.serialNumber && (
                <>
                  <span className="text-muted-foreground/40">·</span>
                  <span className="text-sm text-muted-foreground">S/N {aircraft.serialNumber}</span>
                </>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-1">{wo.description}</p>
          </div>

          <div className="w-full sm:w-auto flex-shrink-0 flex flex-col gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs"
              onClick={async () => {
                try {
                  const { WorkOrderPDF } = await import("@/lib/pdf/WorkOrderPDF");
                  const { downloadPDF } = await import("@/lib/pdf/download");
                  const el = WorkOrderPDF({
                    orgName: "Athelon Aviation",
                    workOrderNumber: wo.workOrderNumber,
                    status: wo.status,
                    type: wo.workOrderType,
                    createdAt: wo._creationTime,
                    promisedDeliveryDate: wo.promisedDeliveryDate ?? undefined,
                    aircraftRegistration: aircraft?.currentRegistration ?? undefined,
                    aircraftType: aircraft ? `${aircraft.make} ${aircraft.model}` : undefined,
                    taskCards: taskCards.map((tc) => ({
                      cardNumber: tc.taskCardNumber ?? "—",
                      title: tc.title ?? "—",
                      status: tc.status ?? "—",
                      assignedTo: undefined,
                    })),
                  });
                  await downloadPDF(el, `WO-${wo.workOrderNumber}.pdf`);
                  toast.success("Work Order PDF downloaded");
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : "Failed to generate PDF");
                }
              }}
            >
              <Download className="w-3.5 h-3.5" />
              Download PDF
            </Button>
            {canClose ? (
              <Button asChild className="gap-2">
                <Link to={`/work-orders/${workOrderId}/signature`}>
                  <ShieldCheck className="w-4 h-4" />
                  Sign Off & Close
                </Link>
              </Button>
            ) : (
              <Button variant="outline" disabled className="gap-2 opacity-50">
                <ShieldCheck className="w-4 h-4" />
                Sign Off & Close
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <Card className="border-border/60">
          <CardContent className="p-3">
            <p className="text-[11px] text-muted-foreground mb-1">Task Progress</p>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-foreground">
                {tasksComplete}/{tasksTotal}
              </span>
              <Progress value={tasksTotal > 0 ? (tasksComplete / tasksTotal) * 100 : 0} className="h-1.5 flex-1" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/60">
          <CardContent className="p-3">
            <p className="text-[11px] text-muted-foreground mb-1">Open Squawks</p>
            <span className={`text-lg font-bold ${openSquawks > 0 ? "text-red-400" : "text-foreground"}`}>
              {openSquawks}
            </span>
          </CardContent>
        </Card>
        <Card className="border-border/60">
          <CardContent className="p-3">
            <p className="text-[11px] text-muted-foreground mb-1">Parts Linked</p>
            <span className="text-lg font-bold text-foreground">{partsForThisWorkOrder.length}</span>
          </CardContent>
        </Card>
        <Card className="border-border/60">
          <CardContent className="p-3">
            <p className="text-[11px] text-muted-foreground mb-1">Opened</p>
            <span className="text-sm font-semibold text-foreground">{formatDate(wo.openedAt)}</span>
          </CardContent>
        </Card>
        <Card
          className={`border-border/60 ${
            riskLevel === "overdue"
              ? "border-red-500/40 bg-red-500/5"
              : riskLevel === "at_risk"
                ? "border-amber-500/40 bg-amber-500/5"
                : ""
          }`}
        >
          <CardContent className="p-3">
            <div className="flex items-center gap-1 mb-1">
              <Calendar className="w-3 h-3 text-muted-foreground" />
              <p className="text-[11px] text-muted-foreground">Promised Delivery</p>
            </div>
            {wo.promisedDeliveryDate ? (
              <span
                className={`text-sm font-semibold ${
                  riskLevel === "overdue"
                    ? "text-red-400"
                    : riskLevel === "at_risk"
                      ? "text-amber-400"
                      : "text-foreground"
                }`}
              >
                {formatDate(wo.promisedDeliveryDate)}
              </span>
            ) : (
              <span className="text-sm text-muted-foreground/60">Not set</span>
            )}
            {wo.estimatedLaborHoursOverride !== undefined && (
              <div className="flex items-center gap-1 mt-1">
                <Clock className="w-3 h-3 text-muted-foreground/60" />
                <span className="text-[10px] text-muted-foreground">
                  {wo.estimatedLaborHoursOverride}h est.
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {!canClose && readinessBlockers.length > 0 && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="p-3">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-amber-400 mb-1">
                  Cannot close WO — {readinessBlockers.length} blockers
                </p>
                <ul className="space-y-0.5">
                  {readinessBlockers.map((b) => (
                    <li key={b} className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                      <XCircle className="w-3 h-3 text-red-400 flex-shrink-0" />
                      {b}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="squawks">
        <TabsList className="h-9 bg-muted/40 p-0.5 mb-4 overflow-x-auto max-w-full flex-wrap">
          {(
            [
              { value: "squawks", label: "Squawks", Icon: AlertTriangle, count: workItems.length, indicator: null },
              { value: "compliance", label: "Compliance", Icon: ShieldCheck, count: null, indicator: "amber" as const },
              { value: "parts", label: "Parts", Icon: Package, count: partsForThisWorkOrder.length, indicator: null },
              { value: "documents", label: "Documents", Icon: Paperclip, count: null, indicator: null },
              { value: "notes", label: "Notes & Activity", Icon: FileText, count: auditEvents.length, indicator: null },
            ] as const
          ).map(({ value, label, Icon, count, indicator }) => (
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
              {indicator === "amber" && <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="squawks" className="mt-0">
          <WorkItemsList items={workItems} workOrderId={String(workOrderId)} />
        </TabsContent>

        <TabsContent value="compliance" className="mt-0">
          <WOComplianceTab workOrderId={String(workOrderId)} />
        </TabsContent>

        <TabsContent value="parts" className="mt-0">
          {partsForThisWorkOrder.length === 0 ? (
            <Card className="border-border/60">
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                No parts currently linked to this work order.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {partsForThisWorkOrder.map((part) => (
                <Card key={String(part._id)} className="border-border/60">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <Package className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="font-mono text-xs font-semibold text-foreground">
                            P/N: {part.partNumber}
                          </span>
                          <Badge
                            variant="outline"
                            className={`text-[10px] font-medium border ${partStatusStyle(part.location)}`}
                          >
                            {partStatusLabel(part.location)}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{part.partName}</p>
                        <div className="flex items-center gap-3 mt-1 flex-wrap">
                          {part.serialNumber && (
                            <span className="text-[11px] font-mono text-muted-foreground">
                              S/N: {part.serialNumber}
                            </span>
                          )}
                          {part.supplier && (
                            <span className="text-[11px] text-muted-foreground">
                              Supplier: {part.supplier}
                            </span>
                          )}
                          {part.eightOneThirtyId && (
                            <span className="text-[11px] text-muted-foreground">
                              8130-3 attached
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="documents" className="mt-0">
          <DocumentAttachmentPanel
            organizationId={orgId}
            attachedToTable="workOrders"
            attachedToId={String(workOrderId)}
          />
        </TabsContent>

        <TabsContent value="notes" className="mt-0">
          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Work Order Activity
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {auditEvents.length === 0 ? (
                <div className="py-6 text-sm text-muted-foreground">No audit events yet.</div>
              ) : (
                <div className="space-y-3">
                  {auditEvents.map((ev, i) => (
                    <div key={String(ev._id)}>
                      {i > 0 && <Separator className="opacity-30 mb-3" />}
                      <div className="flex items-start gap-3">
                        <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 mt-1.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-foreground">{ev.notes ?? ev.eventType}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <User className="w-3 h-3 text-muted-foreground/60" />
                            <span className="text-[11px] text-muted-foreground">{ev.userId ?? "System"}</span>
                            <span className="text-muted-foreground/40">·</span>
                            <span className="font-mono text-[10px] text-muted-foreground/70">
                              {new Date(ev.timestamp).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
