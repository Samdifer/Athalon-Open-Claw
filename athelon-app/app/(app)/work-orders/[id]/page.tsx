"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import type { Id } from "@/convex/_generated/dataModel";
import {
  AlertTriangle,
  FileText,
  ShieldCheck,
  Timer,
  User,
  XCircle,
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
import { WorkOrderHeader } from "./_components/WorkOrderHeader";
import { TaskCardList } from "./_components/TaskCardList";
import { DiscrepancyList } from "./_components/DiscrepancyList";
import { formatDate, formatDateTime } from "@/lib/format";

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

  const openedDate = wo.openedAt ? formatDate(wo.openedAt) : null;

  const canClose = readiness?.canClose ?? false;
  const blockers = readiness?.blockers ?? [];

  return (
    <div className="space-y-5">
      {/* Back + Header (extracted) */}
      <WorkOrderHeader wo={wo} aircraft={aircraft} id={id} canClose={canClose} />

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
                Icon: ShieldCheck,
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

        {/* ── Task Cards Tab (extracted) ──────────────────────────────────── */}
        <TabsContent value="tasks" className="mt-0">
          <TaskCardList taskCards={taskCards} workOrderId={id} />
        </TabsContent>

        {/* ── Squawks Tab (extracted) ──────────────────────────────────────── */}
        <TabsContent value="squawks" className="mt-0">
          <DiscrepancyList discrepancies={discrepancies} />
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
                              {formatDateTime(ev.timestamp)}
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
