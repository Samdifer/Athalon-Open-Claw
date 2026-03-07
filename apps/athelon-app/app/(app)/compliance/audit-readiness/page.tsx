"use client";

import { useMemo } from "react";
import { Link } from "react-router-dom";
import { usePaginatedQuery, useQueries, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import { usePagePrereqs } from "@/hooks/usePagePrereqs";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  ClipboardCheck,
  FileSearch,
  FileText,
  ShieldAlert,
  ShieldCheck,
  Wrench,
  GraduationCap,
  SearchCheck,
  Siren,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ActionableEmptyState } from "@/components/zero-state/ActionableEmptyState";
import { AuditReadinessScore } from "../_components/AuditReadinessScore";
import { ComplianceTimeline } from "../_components/ComplianceTimeline";
import { AuditChecklistGenerator } from "../_components/AuditChecklistGenerator";

type Metric = {
  key: string;
  label: string;
  value: string;
  score: number;
  href: string;
  tone: "green" | "yellow" | "red";
  trend: "up" | "flat" | "down";
  detail: string;
};

const clampPct = (n: number) => Math.max(0, Math.min(100, Math.round(n)));
const toneFromScore = (score: number): Metric["tone"] => (score >= 90 ? "green" : score >= 70 ? "yellow" : "red");
const trendFromScore = (score: number): Metric["trend"] => (score >= 90 ? "up" : score >= 70 ? "flat" : "down");

export default function AuditReadinessPage() {
  const { orgId, isLoaded } = useCurrentOrg();

  const technicians = useQuery(api.technicians.list, orgId ? { organizationId: orgId } : "skip");
  const training = useQuery(api.training.listOrgTraining, orgId ? { orgId } : "skip");
  const expiringTraining = useQuery(api.training.listExpiringTraining, orgId ? { orgId, withinDays: 90 } : "skip");

  const tools = useQuery(api.toolCrib.listTools, orgId ? { orgId, shopLocationId: "all" } : "skip");
  const calibrationDue = useQuery(api.toolCrib.listCalibrationDue, orgId ? { orgId, withinDays: 180, shopLocationId: "all" } : "skip");

  const adSummary = useQuery(api.adCompliance.getFleetAdSummary, orgId ? { organizationId: orgId } : "skip");
  const aircraft = useQuery(api.aircraft.list, orgId ? { organizationId: orgId } : "skip");

  const iaSteps = useQuery(api.gapFixes.listStepsRequiringIAReview, orgId ? { organizationId: orgId } : "skip");
  const discrepancies = useQuery(api.discrepancies.listDiscrepancies, orgId ? { organizationId: orgId } : "skip");
  const stationWorkspace = useQuery(api.stationConfig.getStationConfigWorkspace, orgId ? { organizationId: orgId } : "skip");

  const { results: workOrders, status: workOrdersStatus } = usePaginatedQuery(
    api.workOrders.listWorkOrders,
    orgId ? { organizationId: orgId } : "skip",
    { initialNumItems: 200 },
  );

  const adRecordQueries = useMemo(
    () =>
      Object.fromEntries(
        (aircraft ?? []).map((a) => [
          String(a._id),
          { query: api.adCompliance.listAdRecordsForAircraft, args: { aircraftId: a._id, organizationId: orgId! } },
        ]),
      ),
    [aircraft, orgId],
  );
  const adRecordsByAircraft = useQueries(adRecordQueries);

  const prereq = usePagePrereqs({
    requiresOrg: true,
    isDataLoading:
      !isLoaded ||
      technicians === undefined ||
      training === undefined ||
      expiringTraining === undefined ||
      tools === undefined ||
      calibrationDue === undefined ||
      adSummary === undefined ||
      iaSteps === undefined ||
      discrepancies === undefined ||
      stationWorkspace === undefined ||
      workOrdersStatus === "LoadingFirstPage" ||
      aircraft === undefined,
  });

  if (prereq.state === "missing_context") {
    return (
      <ActionableEmptyState
        title="Audit readiness requires organization setup"
        missingInfo="Complete onboarding before using the Part 145 audit readiness dashboard."
        primaryActionLabel="Complete Setup"
        primaryActionType="link"
        primaryActionTarget="/onboarding"
      />
    );
  }

  if (prereq.state === "loading_context" || prereq.state === "loading_data") {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-28 w-full" />)}
        </div>
      </div>
    );
  }

  if (!orgId) return null;

  const totalTechs = (technicians ?? []).length;
  const techsWithCurrent = new Set((training ?? []).filter((r) => r.status === "current").map((r) => r.technicianId)).size;
  const trainingScore = totalTechs === 0 ? 100 : clampPct((techsWithCurrent / totalTechs) * 100);

  const activeTools = (tools ?? []).filter((t) => t.status !== "retired");
  const toolsCurrent = activeTools.filter((t) => t.status !== "calibration_due" && t.status !== "out_for_calibration").length;
  const toolScore = activeTools.length === 0 ? 100 : clampPct((toolsCurrent / activeTools.length) * 100);

  const trackedAds = adSummary?.fleetTotals.trackedAds ?? 0;
  // BUG-QCM-HUNT-130: problematicAds previously summed only overdueAds + pendingAds,
  // ignoring notCompliedAds (ADs that were never performed). An aircraft with 4
  // never-performed ADs but 0 date-overrun ADs would show an AD Compliance score
  // of 100% — grossly misleading for a QCM preparing for an audit. Those ADs block
  // RTS just as hard as overdue ones and should penalize the readiness score equally.
  // Now includes notCompliedAds via the same defensive type-cast used throughout
  // the compliance section (backend field exists but isn't in the TS surface yet).
  const notCompliedAds = (adSummary?.fleetTotals as unknown as Record<string, number> | undefined)?.["notCompliedAds"] ?? 0;
  const problematicAds = (adSummary?.fleetTotals.overdueAds ?? 0) + notCompliedAds + (adSummary?.fleetTotals.pendingAds ?? 0);
  const adScore = trackedAds === 0 ? 100 : clampPct(((trackedAds - problematicAds) / trackedAds) * 100);

  const workspaceWarningPenalty = Math.min((stationWorkspace?.warnings?.length ?? 0) * 20, 100);
  const rsmScore = clampPct(100 - workspaceWarningPenalty);

  const iaPending = (iaSteps ?? []).length;
  const pendingSignoff = (workOrders ?? []).filter((w) => w.status === "pending_signoff").length;
  const qcmScore = clampPct(100 - iaPending * 5 - pendingSignoff * 3);

  const openDiscrepancies = (discrepancies ?? []).filter((d) => d.status === "open" || d.status === "under_evaluation");
  const oldestOpenAt = openDiscrepancies.reduce<number | null>((oldest, d) => {
    if (!d.createdAt) return oldest;
    if (oldest === null || d.createdAt < oldest) return d.createdAt;
    return oldest;
  }, null);
  const oldestOpenDays = oldestOpenAt ? Math.floor((Date.now() - oldestOpenAt) / 86_400_000) : 0;
  // BUG-DOM-115: oldestOpenDays was subtracted raw from 100. A single discrepancy
  // open for 97+ days drove the score permanently to 0 regardless of how few
  // discrepancies existed, making the metric useless as a trend indicator. The age
  // penalty is now capped at 30 days so the formula stays bounded: worst case from
  // age alone is −30, leaving room for count-based deductions to provide signal.
  const agePenalty = Math.min(oldestOpenDays, 30);
  const discrepancyScore = clampPct(100 - openDiscrepancies.length * 4 - agePenalty);

  const metrics: Metric[] = [
    {
      key: "training",
      label: "Training Compliance",
      value: `${trainingScore}%`,
      score: trainingScore,
      href: "/personnel/training",
      tone: toneFromScore(trainingScore),
      trend: trendFromScore(trainingScore),
      detail: `${techsWithCurrent}/${totalTechs} technicians with current records`,
    },
    {
      key: "tools",
      label: "Tool Calibration",
      value: `${toolScore}%`,
      score: toolScore,
      href: "/parts/tools",
      tone: toneFromScore(toolScore),
      trend: trendFromScore(toolScore),
      detail: `${toolsCurrent}/${activeTools.length} active tools currently calibrated`,
    },
    {
      key: "ads",
      label: "AD Compliance",
      value: `${adScore}%`,
      score: adScore,
      href: "/compliance/ad-sb",
      tone: toneFromScore(adScore),
      trend: trendFromScore(adScore),
      detail: `${problematicAds} of ${trackedAds} tracked ADs need action`,
    },
    {
      key: "rsm",
      label: "RSM Revision Currency",
      value: `${rsmScore}%`,
      score: rsmScore,
      href: "/settings/station-config",
      tone: toneFromScore(rsmScore),
      trend: trendFromScore(rsmScore),
      detail: `${stationWorkspace?.warnings?.length ?? 0} station config warning(s)`,
    },
    {
      key: "qcm",
      label: "QCM Review Outcomes",
      value: `${qcmScore}%`,
      score: qcmScore,
      href: "/compliance/qcm-review",
      tone: toneFromScore(qcmScore),
      trend: trendFromScore(qcmScore),
      detail: `${iaPending} IA steps pending · ${pendingSignoff} WOs awaiting sign-off`,
    },
    {
      key: "disc",
      label: "Open Findings",
      value: String(openDiscrepancies.length),
      score: discrepancyScore,
      href: "/findings",
      tone: toneFromScore(discrepancyScore),
      trend: trendFromScore(discrepancyScore),
      detail: openDiscrepancies.length > 0 ? `Oldest open: ${oldestOpenDays} day(s)` : "No open discrepancies",
    },
  ];

  const deadlineItems = [
    ...(expiringTraining ?? [])
      .filter((r) => !!r.expiresAt)
      .map((r) => ({
        id: `training-${r._id}`,
        category: "Training" as const,
        label: `${r.courseName} (${r.status.replace("_", " ")})`,
        dueAt: r.expiresAt as number,
        href: "/personnel/training",
      })),
    ...(calibrationDue ?? [])
      .filter((t) => !!t.nextCalibrationDue)
      .map((t) => ({
        id: `tool-${t._id}`,
        category: "Tool Calibration" as const,
        label: `${t.toolNumber} calibration due`,
        dueAt: t.nextCalibrationDue as number,
        href: "/parts/tools",
      })),
    ...Object.values(adRecordsByAircraft ?? {})
      .flatMap((rows: any) => (Array.isArray(rows) ? rows : []))
      .filter((r: any) => r?.applicable && r?.nextDueDate)
      .map((r: any) => ({
        id: `ad-${r._id}`,
        category: "AD" as const,
        label: `${r.ad?.adNumber ?? "AD"} next due`,
        dueAt: r.nextDueDate as number,
        href: "/compliance/ad-sb",
      })),
  ];

  const checklistItems = [
    { group: "Training Records" as const, title: "Technician recurrent training currency", compliant: trainingScore >= 90, actionHref: "/personnel/training" },
    { group: "Tool Calibration" as const, title: "Calibration due queue under control", compliant: toolScore >= 90, actionHref: "/parts/tools" },
    { group: "AD/SB Status" as const, title: "No overdue or pending AD determinations", compliant: adScore >= 90, actionHref: "/compliance/ad-sb" },
    { group: "QCM Reviews" as const, title: "IA sign-off queue within threshold", compliant: qcmScore >= 90, actionHref: "/compliance/qcm-review" },
    { group: "Documentation" as const, title: "Station config / documentation warnings cleared", compliant: rsmScore >= 90, actionHref: "/settings/station-config" },
    { group: "Documentation" as const, title: "Open findings aged and dispositioned", compliant: discrepancyScore >= 90, actionHref: "/findings" },
  ];

  return (
    <div className="space-y-6">
      {/* BUG-QCM-HUNT-133: Audit Readiness page was missing cross-navigation links
          to sibling compliance pages. Every other compliance subpage (ad-sb, audit-trail,
          qcm-review) has "← Compliance", "AD/SB Tracking", "Audit Trail", and "QCM Review"
          shortcut buttons. The Audit Readiness page had none — a QCM inspector arriving
          from the compliance dashboard had to use the sidebar or browser back button to
          navigate to other compliance tools. Added consistent cross-nav matching the
          pattern established in BUG-QCM-F4 and BUG-QCM-055. */}
      <div className="flex flex-col sm:flex-row gap-2 sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5 text-muted-foreground" />
            Part 145 Audit Readiness
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Aggregated readiness metrics, deadline timeline, and pre-audit checklist in one view.</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5 text-xs text-muted-foreground"
          >
            <Link to="/compliance">
              <ArrowLeft className="w-3.5 h-3.5" />
              Compliance
            </Link>
          </Button>
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
          <Button
            asChild
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs border-border/60"
          >
            <Link to="/compliance/qcm-review">
              <SearchCheck className="w-3.5 h-3.5" />
              QCM Review
            </Link>
          </Button>
        </div>
      </div>

      <AuditReadinessScore
        metrics={metrics.map((m) => ({
          label: m.label,
          score: m.score,
          weight: m.key === "ads" || m.key === "training" ? 1.4 : 1,
        }))}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {metrics.map((m) => {
          const toneClass =
            m.tone === "green"
              ? "border-emerald-500/30 bg-emerald-500/5"
              : m.tone === "yellow"
                ? "border-amber-500/30 bg-amber-500/5"
                : "border-rose-500/30 bg-rose-500/5";

          const TrendIcon = m.trend === "up" ? ArrowUpRight : m.trend === "down" ? ArrowDownRight : ArrowRight;
          const icon =
            m.key === "training" ? <GraduationCap className="w-4 h-4" /> :
            m.key === "tools" ? <Wrench className="w-4 h-4" /> :
            m.key === "ads" ? <ShieldCheck className="w-4 h-4" /> :
            m.key === "rsm" ? <FileText className="w-4 h-4" /> :
            m.key === "qcm" ? <SearchCheck className="w-4 h-4" /> :
            <Siren className="w-4 h-4" />;

          return (
            <Link key={m.key} to={m.href}>
              <Card className={`border-border/60 hover:border-primary/40 transition-colors ${toneClass}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">{m.label}</p>
                      <p className="text-2xl font-bold mt-1">{m.value}</p>
                      <p className="text-[11px] text-muted-foreground mt-1">{m.detail}</p>
                    </div>
                    <div className="text-muted-foreground">
                      {icon}
                      <TrendIcon className="w-4 h-4 mt-2" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <ComplianceTimeline items={deadlineItems} />
        <AuditChecklistGenerator
          items={checklistItems}
          overallScore={Math.round(
            metrics.reduce((sum, m) => sum + m.score * (m.key === "ads" || m.key === "training" ? 1.4 : 1), 0) /
            (metrics.reduce((sum, m) => sum + (m.key === "ads" || m.key === "training" ? 1.4 : 1), 0) || 1),
          )}
        />
      </div>

      {metrics.some((m) => m.tone === "red") && (
        <Card className="border-rose-500/30 bg-rose-500/5">
          <CardContent className="p-3 text-sm flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-500" />
            One or more readiness areas are in red status. Prioritize those items before the next FAA or customer audit.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
