"use client";

import { lazy, Suspense, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery } from "convex/react";
import {
  CalendarDays,
  ClipboardList,
  Clock,
  FileText,
  GraduationCap,
  Send,
  Users,
} from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { ShiftBoardTab } from "./_components/ShiftBoardTab";
import { TaskFeedTab } from "./_components/TaskFeedTab";
import { WorkOrderMonitorTab } from "./_components/WorkOrderMonitorTab";
import { TimeHoursTab } from "./_components/TimeHoursTab";
import { TurnoverTab } from "./_components/TurnoverTab";
import type { LeadCenterWorkspace, WoSummaryItem } from "./_components/types";

// Lazy-load the roster workspace (large component with 5 sub-tabs)
const SchedulingRosterWorkspace = lazy(
  () => import("@/app/(app)/scheduling/_components/roster/SchedulingRosterWorkspace"),
);

// ---------------------------------------------------------------------------
// Lead Center — Unified lead technician workspace
//
// Consolidates the old /lead dashboard and /work-orders/lead workspace into
// a single tabbed page so a lead mechanic can effectuate all duties from one
// location: shift board, task assignments, WO monitoring, time oversight,
// roster management, and turnover reporting.
// ---------------------------------------------------------------------------

const ALLOWED_ROLES = new Set(["lead_technician", "shop_manager", "admin"]);

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

export default function LeadCenterPage() {
  const { orgId, tech, isLoaded } = useCurrentOrg();
  const [reportDate, setReportDate] = useState(todayIso());

  const canAccess = ALLOWED_ROLES.has(tech?.role ?? "");
  const shouldQuery = Boolean(orgId && canAccess);

  // ---- Data queries (shared across tabs) ----
  const workspace = useQuery(
    api.leadTurnover.getLeadWorkspace,
    shouldQuery && orgId ? { organizationId: orgId, reportDate } : "skip",
  ) as LeadCenterWorkspace | undefined;

  const woSummary = useQuery(
    api.workOrders.getWorkOrdersWithScheduleRisk,
    shouldQuery && orgId
      ? { organizationId: orgId, shopLocationId: "all" }
      : "skip",
  ) as WoSummaryItem[] | undefined;

  // ---- Mutations ----
  const assignEntity = useMutation(api.leadTurnover.assignEntity);
  const upsertTurnoverDraft = useMutation(api.leadTurnover.upsertTurnoverDraft);
  const submitTurnoverReport = useMutation(api.leadTurnover.submitTurnoverReport);

  // ---- Loading states ----
  if (!isLoaded || (shouldQuery && (workspace === undefined || woSummary === undefined))) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-80 w-full" />
      </div>
    );
  }

  if (!orgId) {
    return (
      <Card>
        <CardContent className="py-10 text-sm text-muted-foreground">
          Organization context unavailable.
        </CardContent>
      </Card>
    );
  }

  if (!canAccess) {
    return (
      <Card className="border-border/60">
        <CardContent className="py-10 text-center space-y-2">
          <p className="font-medium">Lead Center Access Required</p>
          <p className="text-xs text-muted-foreground">
            Only lead technicians, shop managers, and admins can access this
            workspace.
          </p>
          <Button asChild variant="outline" size="sm">
            <Link to="/dashboard">Back to dashboard</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const reportIsSubmitted = workspace?.report?.status === "submitted";

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-3">
        <div>
          <h1 className="text-lg sm:text-xl md:text-2xl font-semibold text-foreground">
            Lead Center
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Team oversight, assignments, time tracking, roster, and shift
            turnover — all in one place.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            type="date"
            value={reportDate}
            onChange={(event) => setReportDate(event.target.value)}
            className="h-8 w-[170px] text-xs"
            aria-label="Report date"
          />
          <Button
            asChild
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1.5"
          >
            <Link to="/training/ojt">
              <GraduationCap className="w-3.5 h-3.5" />
              OJT Training
            </Link>
          </Button>
        </div>
      </div>

      {/* KPI stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="border-border/60">
          <CardContent className="p-3">
            <p className="text-[11px] text-muted-foreground mb-1">Report Date</p>
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
            <p className="text-[11px] text-muted-foreground mb-1">WO Hours</p>
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

      {/* Tabbed workspace */}
      <Tabs defaultValue="shift-board" className="space-y-4">
        <TabsList className="h-9 bg-muted/40 p-0.5 overflow-x-auto max-w-full flex-wrap">
          {([
            {
              value: "shift-board",
              label: "Shift Board",
              Icon: Users,
              count: workspace?.technicians.length ?? null,
            },
            {
              value: "task-feed",
              label: "Task Feed",
              Icon: ClipboardList,
              count: workspace?.taskCards.length ?? null,
            },
            {
              value: "work-orders",
              label: "Work Orders",
              Icon: FileText,
              count: woSummary?.filter((wo) =>
                ["open", "in_progress", "pending_inspection", "pending_signoff", "on_hold", "open_discrepancies"].includes(wo.status),
              ).length ?? null,
            },
            {
              value: "time-hours",
              label: "Time & Hours",
              Icon: Clock,
              count: null,
            },
            {
              value: "roster",
              label: "Roster",
              Icon: CalendarDays,
              count: null,
            },
            {
              value: "turnover",
              label: "Turnover",
              Icon: Send,
              count: null,
              indicator: reportIsSubmitted
                ? ("green" as const)
                : (workspace?.report?.summaryText ||
                    workspace?.report?.leadNotes ||
                    workspace?.report?.aiDraftSummary)
                  ? ("amber" as const)
                  : null,
            },
          ] as const).map(({ value, label, Icon, count, ...rest }) => (
            <TabsTrigger
              key={value}
              value={value}
              className="h-8 px-3.5 text-xs gap-1.5 data-[state=active]:bg-background"
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
              {count !== null && count !== undefined && (
                <Badge
                  variant="secondary"
                  className="h-4 min-w-[16px] px-1 text-[9px] bg-muted-foreground/20 text-muted-foreground"
                >
                  {count}
                </Badge>
              )}
              {"indicator" in rest && rest.indicator === "amber" && (
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              )}
              {"indicator" in rest && rest.indicator === "green" && (
                <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
              )}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="shift-board" className="mt-0">
          <ShiftBoardTab
            workspace={workspace!}
            woSummary={woSummary ?? []}
            assignEntity={assignEntity}
            orgId={orgId}
          />
        </TabsContent>

        <TabsContent value="task-feed" className="mt-0">
          <TaskFeedTab
            workspace={workspace!}
            assignEntity={assignEntity}
            orgId={orgId}
          />
        </TabsContent>

        <TabsContent value="work-orders" className="mt-0">
          <WorkOrderMonitorTab woSummary={woSummary ?? []} />
        </TabsContent>

        <TabsContent value="time-hours" className="mt-0">
          <TimeHoursTab orgId={orgId} />
        </TabsContent>

        <TabsContent value="roster" className="mt-0">
          <Suspense
            fallback={
              <div className="space-y-4">
                <Skeleton className="h-8 w-64" />
                <Skeleton className="h-60 w-full" />
              </div>
            }
          >
            <SchedulingRosterWorkspace
              organizationId={orgId}
              shopLocationId="all"
              embedded
            />
          </Suspense>
        </TabsContent>

        <TabsContent value="turnover" className="mt-0">
          <TurnoverTab
            workspace={workspace!}
            reportDate={reportDate}
            orgId={orgId}
            upsertTurnoverDraft={upsertTurnoverDraft}
            submitTurnoverReport={submitTurnoverReport}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
