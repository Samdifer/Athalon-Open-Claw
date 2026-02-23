"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import type { Id } from "@/convex/_generated/dataModel";
import {
  ArrowLeft,
  ClipboardList,
  AlertTriangle,
  Package,
  FileText,
  CheckCircle2,
  Circle,
  Clock,
  Wrench,
  ChevronRight,
  ShieldCheck,
  XCircle,
  Timer,
  User,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { AdComplianceTab } from "./AdComplianceTab";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  open: "Open",
  in_progress: "In Progress",
  on_hold: "On Hold",
  pending_inspection: "Pending Inspection",
  pending_signoff: "Pending Sign-Off",
  open_discrepancies: "Open Discrepancies",
  closed: "Closed",
  cancelled: "Cancelled",
  voided: "Voided",
};

const WO_TYPE_LABEL: Record<string, string> = {
  routine: "Routine",
  unscheduled: "Unscheduled",
  annual_inspection: "Annual Inspection",
  "100hr_inspection": "100-Hour Inspection",
  progressive_inspection: "Progressive Inspection",
  ad_compliance: "AD Compliance",
  major_repair: "Major Repair",
  major_alteration: "Major Alteration",
  field_approval: "Field Approval",
  ferry_permit: "Ferry Permit",
};

function getStatusStyles(status: string): string {
  const map: Record<string, string> = {
    in_progress: "bg-sky-500/15 text-sky-400 border-sky-500/30",
    open: "bg-blue-500/15 text-blue-400 border-blue-500/30",
    pending_signoff: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    pending_inspection: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    on_hold: "bg-orange-500/15 text-orange-400 border-orange-500/30",
    draft: "bg-slate-500/15 text-slate-400 border-slate-500/30",
    closed: "bg-green-500/15 text-green-400 border-green-500/30",
    cancelled: "bg-slate-500/15 text-slate-400 border-slate-500/30",
    open_discrepancies: "bg-red-500/15 text-red-400 border-red-500/30",
  };
  return map[status] ?? "bg-muted text-muted-foreground";
}

function getTaskStatusStyles(status: string): string {
  const map: Record<string, string> = {
    complete: "bg-green-500/15 text-green-400 border-green-500/30",
    in_progress: "bg-sky-500/15 text-sky-400 border-sky-500/30",
    not_started: "bg-slate-500/15 text-slate-400 border-slate-500/30",
    incomplete_na_steps: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    voided: "bg-slate-500/15 text-slate-400 border-slate-500/30",
  };
  return map[status] ?? "bg-muted text-muted-foreground";
}

const TASK_STATUS_LABEL: Record<string, string> = {
  not_started: "Not Started",
  in_progress: "In Progress",
  incomplete_na_steps: "Needs IA Review",
  complete: "Complete",
  voided: "Voided",
};

const TASK_TYPE_LABEL: Record<string, string> = {
  inspection: "Inspection",
  repair: "Repair",
  replacement: "Replacement",
  ad_compliance: "AD Compliance",
  functional_check: "Functional Check",
  rigging: "Rigging",
  return_to_service: "Return to Service",
  overhaul: "Overhaul",
  modification: "Modification",
};

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function WorkOrderDetailSkeleton() {
  return (
    <div className="space-y-5">
      <Skeleton className="h-7 w-24" />
      <div className="space-y-3">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-6 w-48" />
      </div>
      <div className="grid grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-lg" />
        ))}
      </div>
      <Skeleton className="h-64 rounded-lg" />
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function WorkOrderDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { orgId, isLoaded: orgLoaded } = useCurrentOrg();

  const data = useQuery(
    api.workOrders.getWorkOrder,
    orgId && id
      ? { workOrderId: id as Id<"workOrders">, organizationId: orgId }
      : "skip",
  );

  const readiness = useQuery(
    api.workOrders.getCloseReadiness,
    orgId && id
      ? { workOrderId: id as Id<"workOrders">, organizationId: orgId }
      : "skip",
  );

  const isLoading = !orgLoaded || data === undefined;

  if (isLoading) return <WorkOrderDetailSkeleton />;

  if (!data) {
    return (
      <div className="text-center py-20">
        <XCircle className="w-8 h-8 text-red-400/60 mx-auto mb-3" />
        <p className="text-sm font-medium text-muted-foreground">
          Work order not found
        </p>
        <Button asChild variant="ghost" size="sm" className="mt-4">
          <Link href="/work-orders">← Back to Work Orders</Link>
        </Button>
      </div>
    );
  }

  const { workOrder: wo, aircraft, taskCards, discrepancies, auditEvents } =
    data;

  const tasksComplete = taskCards.filter(
    (tc) => tc.status === "complete",
  ).length;
  const tasksTotal = taskCards.length;
  const openSquawks = discrepancies.filter(
    (d) => d.status === "open" || d.status === "under_evaluation",
  ).length;

  const openedDate = wo.openedAt
    ? new Date(wo.openedAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;

  const canClose = readiness?.canClose ?? false;
  const blockers = readiness?.blockers ?? [];

  return (
    <div className="space-y-5">
      {/* Back + Header */}
      <div>
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="h-7 -ml-2 mb-3 text-xs text-muted-foreground"
        >
          <Link href="/work-orders">
            <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
            Work Orders
          </Link>
        </Button>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 mb-1 flex-wrap">
              <h1 className="text-xl font-semibold font-mono text-foreground">
                {wo.workOrderNumber}
              </h1>
              <Badge
                variant="outline"
                className={`text-[11px] font-medium border ${getStatusStyles(wo.status)}`}
              >
                {STATUS_LABEL[wo.status] ?? wo.status}
              </Badge>
              <Badge
                variant="outline"
                className="text-[10px] text-muted-foreground border-border/40"
              >
                {WO_TYPE_LABEL[wo.workOrderType] ?? wo.workOrderType}
              </Badge>
              {wo.priority === "aog" && (
                <Badge className="bg-red-500/15 text-red-400 border border-red-500/30 text-[11px] font-semibold">
                  AOG
                </Badge>
              )}
              {wo.priority === "urgent" && (
                <Badge className="bg-orange-500/15 text-orange-400 border border-orange-500/30 text-[11px]">
                  Urgent
                </Badge>
              )}
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
                  <span className="text-sm text-muted-foreground">
                    S/N {aircraft.serialNumber}
                  </span>
                </>
              )}
            </div>
            {wo.description && (
              <p className="text-sm text-muted-foreground mt-1">
                {wo.description}
              </p>
            )}
          </div>

          {/* Sign-Off Button */}
          <div className="flex-shrink-0 flex gap-2">
            {canClose ? (
              <Button asChild className="gap-2">
                <Link href={`/work-orders/${id}/signature`}>
                  <ShieldCheck className="w-4 h-4" />
                  Sign Off & Close
                </Link>
              </Button>
            ) : (
              <Button
                variant="outline"
                disabled
                className="gap-2 opacity-50 cursor-not-allowed"
              >
                <ShieldCheck className="w-4 h-4" />
                Sign Off & Close
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="border-border/60">
          <CardContent className="p-3">
            <p className="text-[11px] text-muted-foreground mb-1">
              Task Progress
            </p>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-foreground">
                {tasksComplete}/{tasksTotal}
              </span>
              {tasksTotal > 0 && (
                <Progress
                  value={(tasksComplete / tasksTotal) * 100}
                  className="h-1.5 flex-1"
                />
              )}
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/60">
          <CardContent className="p-3">
            <p className="text-[11px] text-muted-foreground mb-1">
              Open Squawks
            </p>
            <span
              className={`text-lg font-bold ${
                openSquawks > 0 ? "text-red-400" : "text-foreground"
              }`}
            >
              {openSquawks}
            </span>
          </CardContent>
        </Card>
        <Card className="border-border/60">
          <CardContent className="p-3">
            <p className="text-[11px] text-muted-foreground mb-1">
              Hours at Open
            </p>
            <span className="text-lg font-bold font-mono text-foreground">
              {wo.aircraftTotalTimeAtOpen > 0
                ? wo.aircraftTotalTimeAtOpen.toFixed(1)
                : "—"}
            </span>
          </CardContent>
        </Card>
        <Card className="border-border/60">
          <CardContent className="p-3">
            <p className="text-[11px] text-muted-foreground mb-1">
              Opened
            </p>
            <span className="text-sm font-medium text-foreground flex items-center gap-1">
              {openedDate ? (
                <>
                  <Timer className="w-3.5 h-3.5 text-muted-foreground" />
                  {openedDate}
                </>
              ) : (
                <span className="text-muted-foreground text-xs">
                  Draft — not opened
                </span>
              )}
            </span>
          </CardContent>
        </Card>
      </div>

      {/* Close Readiness Warning */}
      {readiness && !canClose && blockers.length > 0 && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="p-3">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-amber-400 mb-1">
                  Cannot close WO — {blockers.length} blocker
                  {blockers.length > 1 ? "s" : ""}
                </p>
                <ul className="space-y-0.5">
                  {blockers.map((b, i) => (
                    <li
                      key={i}
                      className="text-[11px] text-muted-foreground flex items-start gap-1.5"
                    >
                      <XCircle className="w-3 h-3 text-red-400 flex-shrink-0 mt-0.5" />
                      {b}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs defaultValue="tasks">
        <TabsList className="h-9 bg-muted/40 p-0.5 mb-4">
          {(
            [
              {
                value: "tasks",
                label: "Task Cards",
                Icon: ClipboardList,
                badge: `${tasksComplete}/${tasksTotal}`,
              },
              {
                value: "squawks",
                label: "Squawks",
                Icon: AlertTriangle,
                badge: openSquawks > 0 ? String(openSquawks) : null,
              },
              {
                value: "notes",
                label: "Activity",
                Icon: FileText,
                badge: null,
              },
              {
                value: "compliance",
                label: "AD Compliance",
                Icon: ShieldCheck,
                badge: null,
              },
            ] as const
          ).map(({ value, label, Icon, badge }) => (
            <TabsTrigger
              key={value}
              value={value}
              className="h-8 px-3.5 text-xs gap-1.5 data-[state=active]:bg-background"
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
              {badge && (
                <Badge
                  variant="secondary"
                  className="h-4 min-w-[16px] px-1 text-[9px] bg-muted-foreground/20 text-muted-foreground"
                >
                  {badge}
                </Badge>
              )}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* ── Task Cards Tab ──────────────────────────────────────────────── */}
        <TabsContent value="tasks" className="mt-0">
          <div className="space-y-2">
            {taskCards.length === 0 ? (
              <Card className="border-border/60">
                <CardContent className="py-10 text-center">
                  <ClipboardList className="w-6 h-6 text-muted-foreground/40 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    No task cards on this work order
                  </p>
                  <p className="text-xs text-muted-foreground/60 mt-1">
                    Add task cards to begin maintenance work.
                  </p>
                </CardContent>
              </Card>
            ) : (
              taskCards.map((tc) => {
                const completedSteps = tc.steps.filter(
                  (s) => s.status === "completed" || s.status === "na",
                ).length;
                const totalSteps = tc.steps.length;

                return (
                  <Link
                    key={tc._id}
                    href={`/work-orders/${id}/tasks/${tc._id}`}
                  >
                    <Card className="border-border/60 hover:border-primary/30 hover:bg-card/80 transition-all cursor-pointer">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span className="font-mono text-xs text-muted-foreground font-medium">
                                {tc.taskCardNumber}
                              </span>
                              <Badge
                                variant="outline"
                                className={`text-[10px] font-medium border ${getTaskStatusStyles(tc.status)}`}
                              >
                                {tc.status === "complete" && (
                                  <CheckCircle2 className="w-2.5 h-2.5 mr-1" />
                                )}
                                {tc.status === "in_progress" && (
                                  <Circle className="w-2.5 h-2.5 mr-1" />
                                )}
                                {TASK_STATUS_LABEL[tc.status] ?? tc.status}
                              </Badge>
                              <Badge
                                variant="outline"
                                className="text-[10px] text-muted-foreground border-border/40"
                              >
                                {TASK_TYPE_LABEL[tc.taskType] ?? tc.taskType}
                              </Badge>
                            </div>
                            <p className="text-sm font-medium text-foreground">
                              {tc.title}
                            </p>
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                              {tc.approvedDataSource}
                            </p>
                          </div>
                          <div className="flex-shrink-0 flex items-center gap-3">
                            {totalSteps > 0 && (
                              <div className="text-right">
                                <div className="flex items-center gap-1.5 mb-1 justify-end">
                                  <span className="text-[11px] text-muted-foreground">
                                    {completedSteps}/{totalSteps} steps
                                  </span>
                                </div>
                                <Progress
                                  value={
                                    (completedSteps / totalSteps) * 100
                                  }
                                  className="h-1 w-16"
                                />
                              </div>
                            )}
                            <ChevronRight className="w-4 h-4 text-muted-foreground/50" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })
            )}

            {/* Add Task Card CTA */}
            <Button
              asChild
              variant="outline"
              size="sm"
              className="w-full h-9 text-xs border-border/60 border-dashed gap-1.5 mt-2"
            >
              <Link href={`/work-orders/${id}/tasks/new`}>
                <Wrench className="w-3.5 h-3.5" />
                Add Task Card
              </Link>
            </Button>
          </div>
        </TabsContent>

        {/* ── Squawks Tab ─────────────────────────────────────────────────── */}
        <TabsContent value="squawks" className="mt-0">
          <div className="space-y-2">
            {discrepancies.length === 0 ? (
              <Card className="border-border/60">
                <CardContent className="py-10 text-center">
                  <CheckCircle2 className="w-6 h-6 text-green-400/60 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    No squawks on this work order
                  </p>
                </CardContent>
              </Card>
            ) : (
              discrepancies.map((sq) => (
                <Card
                  key={sq._id}
                  className="border-l-4 border-l-red-500 border-border/60"
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="font-mono text-xs text-muted-foreground">
                            {sq.discrepancyNumber ?? sq._id}
                          </span>
                          <Badge
                            className={`border text-[10px] ${
                              sq.status === "open"
                                ? "bg-red-500/15 text-red-400 border-red-500/30"
                                : "bg-amber-500/15 text-amber-400 border-amber-500/30"
                            }`}
                          >
                            {sq.status === "open" ? "Open" : sq.status}
                          </Badge>
                          {sq.disposition && (
                            <Badge
                              variant="outline"
                              className="text-[10px] text-amber-400 border-amber-500/30"
                            >
                              {sq.disposition}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-foreground">
                          {sq.description}
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-1">
                          Found{" "}
                          {new Date(sq._creationTime).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}

            <Button
              variant="outline"
              size="sm"
              className="w-full h-9 text-xs border-border/60 border-dashed gap-1.5 mt-2"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              Log Squawk
            </Button>
          </div>
        </TabsContent>

        {/* ── Activity Tab ─────────────────────────────────────────────────── */}
        <TabsContent value="notes" className="mt-0">
          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Work Order Activity
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {auditEvents.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No activity yet
                </p>
              ) : (
                <div className="space-y-3">
                  {auditEvents.map((ev, i) => (
                    <div key={ev._id}>
                      {i > 0 && <Separator className="opacity-30 mb-3" />}
                      <div className="flex items-start gap-3">
                        <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 mt-1.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-foreground">
                            {ev.notes ?? ev.eventType}
                          </p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <User className="w-3 h-3 text-muted-foreground/60" />
                            <span className="text-[11px] text-muted-foreground">
                              {ev.userId}
                            </span>
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

        {/* ── AD Compliance Tab ────────────────────────────────────────────── */}
        <TabsContent value="compliance" className="mt-0">
          <AdComplianceTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
