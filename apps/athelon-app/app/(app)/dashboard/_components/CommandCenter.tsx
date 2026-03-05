import { useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import type { FunctionReturnType } from "convex/server";
import {
  AlertTriangle,
  Gauge,
  Users,
  Wrench,
  Plane,
  ShieldAlert,
  ClipboardList,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Link } from "react-router-dom";
import { isActiveStatus, getSeverityStyles } from "./dashboardHelpers";

type WorkOrdersWithRisk = FunctionReturnType<typeof api.workOrders.getWorkOrdersWithScheduleRisk>;
type CapacityUtil = FunctionReturnType<typeof api.capacity.getCapacityUtilization>;
type BayData = FunctionReturnType<typeof api.hangarBays.listBays>;
type RosterWorkspace = FunctionReturnType<typeof api.schedulerRoster.getRosterWorkspace>;
type ActiveTimers = FunctionReturnType<typeof api.timeClock.listActiveTimers>;
type FleetAdSummary = FunctionReturnType<typeof api.adCompliance.getFleetAdSummary>;

// ─── KPI Strip ─────────────────────────────────────────────────────────────────

function KPIStrip({
  workOrders,
  fleetAd,
  capacityUtil,
  roster,
  activeTimers,
}: {
  workOrders: WorkOrdersWithRisk | undefined;
  fleetAd: FleetAdSummary | undefined;
  capacityUtil: CapacityUtil | undefined;
  roster: RosterWorkspace | undefined;
  activeTimers: ActiveTimers | undefined;
}) {
  const kpis = useMemo(() => {
    if (!workOrders) return null;

    const active = workOrders.filter((wo) =>
      ["open", "in_progress", "open_discrepancies"].includes(wo.status),
    );
    const aog = active.filter((wo) => wo.priority === "aog");
    const openDisc = workOrders.reduce((acc, wo) => {
      if (["draft", "closed", "voided", "cancelled"].includes(wo.status)) return acc;
      return acc + (wo.openDiscrepancyCount ?? 0);
    }, 0);
    const overdueAds = fleetAd?.fleetTotals?.overdueAds ?? 0;
    const pendingSignoff = workOrders.filter((wo) => wo.status === "pending_signoff").length;

    const utilPct = capacityUtil
      ? Math.min(100, Math.round(capacityUtil.utilizationPercent ?? 0))
      : null;

    const techs = roster?.technicians ?? [];
    const onShift = techs.filter((t: { isOnShiftToday: boolean }) => t.isOnShiftToday).length;
    const clockedIn = activeTimers?.length ?? 0;

    return {
      activeWOs: active.length,
      aogCount: aog.length,
      overdueAds,
      openDiscrepancies: openDisc,
      pendingSignoff,
      utilPct,
      onShift,
      clockedIn,
    };
  }, [workOrders, fleetAd, capacityUtil, roster, activeTimers]);

  if (!kpis) {
    return (
      <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-lg" />
        ))}
      </div>
    );
  }

  const metrics = [
    {
      label: "Active WOs",
      value: kpis.activeWOs,
      icon: Wrench,
      color: "text-sky-400",
      bg: "bg-sky-500/10",
      href: "/work-orders",
      alert: false,
    },
    {
      label: "AOG",
      value: kpis.aogCount,
      icon: Plane,
      color: "text-red-400",
      bg: "bg-red-500/10",
      href: "/work-orders",
      alert: kpis.aogCount > 0,
    },
    {
      label: "Overdue ADs",
      value: kpis.overdueAds,
      icon: ShieldAlert,
      color: "text-amber-400",
      bg: "bg-amber-500/10",
      href: "/compliance/ad-sb",
      alert: kpis.overdueAds > 0,
    },
    {
      label: "Open Squawks",
      value: kpis.openDiscrepancies,
      icon: AlertTriangle,
      color: "text-purple-400",
      bg: "bg-purple-500/10",
      href: "/squawks",
      alert: false,
    },
    {
      label: "Pending QCM",
      value: kpis.pendingSignoff,
      icon: ClipboardList,
      color: "text-orange-400",
      bg: "bg-orange-500/10",
      href: "/work-orders",
      alert: kpis.pendingSignoff > 0,
    },
    {
      label: "Capacity",
      value: kpis.utilPct !== null ? `${kpis.utilPct}%` : "—",
      icon: Gauge,
      color: kpis.utilPct !== null && kpis.utilPct >= 85
        ? "text-red-400"
        : kpis.utilPct !== null && kpis.utilPct >= 70
          ? "text-amber-400"
          : "text-green-400",
      bg: kpis.utilPct !== null && kpis.utilPct >= 85
        ? "bg-red-500/10"
        : kpis.utilPct !== null && kpis.utilPct >= 70
          ? "bg-amber-500/10"
          : "bg-green-500/10",
      href: "/scheduling",
      alert: kpis.utilPct !== null && kpis.utilPct >= 85,
    },
    {
      label: "On Shift",
      value: kpis.onShift,
      icon: Users,
      color: "text-teal-400",
      bg: "bg-teal-500/10",
      href: "/personnel",
      alert: false,
    },
    {
      label: "Clocked In",
      value: kpis.clockedIn,
      icon: Clock,
      color: "text-emerald-400",
      bg: "bg-emerald-500/10",
      href: "/time-clock",
      alert: false,
    },
  ];

  return (
    <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
      {metrics.map((m) => (
        <Link key={m.label} to={m.href}>
          <div
            className={`relative rounded-lg border border-border/50 p-2.5 text-center hover:bg-muted/40 transition-colors cursor-pointer ${
              m.alert ? "border-red-500/40 ring-1 ring-red-500/20" : ""
            }`}
          >
            <m.icon className={`w-3.5 h-3.5 mx-auto mb-1 ${m.color}`} />
            <p className="text-lg font-bold text-foreground leading-none">{m.value}</p>
            <p className="text-[9px] text-muted-foreground mt-1 leading-tight">{m.label}</p>
          </div>
        </Link>
      ))}
    </div>
  );
}

// ─── Compact Attention Queue ───────────────────────────────────────────────────

function CompactAttentionQueue({ workOrders }: { workOrders: WorkOrdersWithRisk | undefined }) {
  const { orgId } = useCurrentOrg();

  const expiringCerts = useQuery(
    api.technicians.listWithExpiringCerts,
    orgId ? { organizationId: orgId, withinDays: 30 } : "skip",
  );

  const items = useMemo(() => {
    if (workOrders === undefined || expiringCerts === undefined) return null;

    type AttentionItem = {
      id: string;
      severity: "critical" | "warning";
      title: string;
      href: string;
    };

    const result: AttentionItem[] = [];

    const aogWOs = workOrders.filter(
      (wo) => wo.priority === "aog" && !["closed", "voided", "cancelled"].includes(wo.status),
    );
    for (const wo of aogWOs.slice(0, 3)) {
      const tail = wo.aircraft?.currentRegistration ?? "Aircraft";
      result.push({
        id: `aog-${wo._id}`,
        severity: "critical",
        title: `AOG: ${tail} (${wo.workOrderNumber})`,
        href: `/work-orders/${wo._id}`,
      });
    }

    const pendingSignoffWOs = workOrders.filter((wo) => wo.status === "pending_signoff");
    if (pendingSignoffWOs.length > 0) {
      result.push({
        id: "pending-signoff",
        severity: "warning",
        title: `${pendingSignoffWOs.length} WO${pendingSignoffWOs.length !== 1 ? "s" : ""} awaiting QCM sign-off`,
        href: "/work-orders",
      });
    }

    const squawkWOs = workOrders.filter(
      (wo) =>
        wo.priority !== "aog" &&
        (wo.openDiscrepancyCount ?? 0) > 0 &&
        !["closed", "voided", "cancelled"].includes(wo.status),
    );
    if (squawkWOs.length > 0) {
      const totalSquawks = squawkWOs.reduce((sum, wo) => sum + (wo.openDiscrepancyCount ?? 0), 0);
      result.push({
        id: "squawks",
        severity: "warning",
        title: `${totalSquawks} open squawk${totalSquawks !== 1 ? "s" : ""} across ${squawkWOs.length} WO${squawkWOs.length !== 1 ? "s" : ""}`,
        href: "/squawks",
      });
    }

    for (const entry of (expiringCerts ?? []).slice(0, 2)) {
      const tech = entry.technician as { legalName?: string } | null;
      const name = tech?.legalName ?? "Technician";
      const expiry = (entry.cert as { iaExpiryDate?: number }).iaExpiryDate;
      const daysLeft = expiry != null
        ? Math.ceil((expiry - Date.now()) / (1000 * 60 * 60 * 24))
        : null;
      const isPast = daysLeft !== null && daysLeft <= 0;
      result.push({
        id: `cert-${(entry.cert as { _id: string })._id}`,
        severity: isPast || (daysLeft !== null && daysLeft <= 7) ? "critical" : "warning",
        title: isPast
          ? `IA EXPIRED: ${name}`
          : `IA expiring: ${name} (${daysLeft}d)`,
        href: "/compliance/audit-trail",
      });
    }

    return result;
  }, [workOrders, expiringCerts]);

  if (items === null) {
    return <Skeleton className="h-full min-h-[120px] w-full rounded-lg" />;
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-4 text-muted-foreground">
        <CheckCircle2 className="w-5 h-5 mb-1.5 text-green-400" />
        <p className="text-xs">All clear</p>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      {items.slice(0, 5).map((item) => {
        const styles = getSeverityStyles(item.severity);
        return (
          <Link key={item.id} to={item.href}>
            <div
              className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md border-l-2 text-xs hover:bg-muted/40 transition-colors cursor-pointer ${styles.border} ${styles.bg}`}
            >
              <AlertTriangle className={`w-3 h-3 flex-shrink-0 ${styles.icon}`} />
              <span className="text-[11px] text-foreground truncate">{item.title}</span>
            </div>
          </Link>
        );
      })}
      {items.length > 5 && (
        <p className="text-[10px] text-muted-foreground text-center pt-1">
          +{items.length - 5} more
        </p>
      )}
    </div>
  );
}

// ─── Compact Capacity Panel ────────────────────────────────────────────────────

function CompactCapacityPanel({
  capacityUtil,
  bays,
}: {
  capacityUtil: CapacityUtil | undefined;
  bays: BayData | undefined;
}) {
  if (!capacityUtil) {
    return <Skeleton className="h-full min-h-[120px] w-full rounded-lg" />;
  }

  const utilPct = Math.min(100, Math.round(capacityUtil.utilizationPercent ?? 0));
  const committed = Math.round(capacityUtil.committedHours ?? 0);
  const available = Math.round(capacityUtil.totalAvailableHours ?? 0);

  const bayList = bays ?? [];
  const occupiedBays = bayList.filter((b) => b.status === "occupied").length;
  const totalBays = bayList.length;

  const barColor =
    utilPct >= 85 ? "[&>div]:bg-red-500" :
    utilPct >= 70 ? "[&>div]:bg-amber-500" :
    "";

  return (
    <div className="space-y-3">
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] font-medium text-muted-foreground">Labor Utilization</span>
          <span className={`text-sm font-bold ${
            utilPct >= 85 ? "text-red-400" : utilPct >= 70 ? "text-amber-400" : "text-green-400"
          }`}>
            {utilPct}%
          </span>
        </div>
        <Progress value={utilPct} className={`h-2 ${barColor}`} />
        <p className="text-[10px] text-muted-foreground mt-1">
          {committed} / {available} hrs this week
        </p>
      </div>

      {totalBays > 0 && (
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-medium text-muted-foreground">Bay Occupancy</span>
            <span className="text-[11px] text-muted-foreground">
              {occupiedBays}/{totalBays}
            </span>
          </div>
          <div className="flex gap-1">
            {bayList.map((bay) => {
              const color =
                bay.status === "occupied"
                  ? "bg-sky-400"
                  : bay.status === "maintenance"
                    ? "bg-orange-400"
                    : "bg-green-400/60";
              return (
                <div
                  key={bay._id}
                  className={`h-3 flex-1 rounded-sm ${color}`}
                  title={`${bay.name}: ${bay.status}`}
                />
              );
            })}
          </div>
          <div className="flex gap-3 mt-1.5 text-[9px] text-muted-foreground/70">
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400/60 inline-block" /> Free
            </span>
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-400 inline-block" /> In Use
            </span>
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-400 inline-block" /> Maint
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Compact Personnel Panel ───────────────────────────────────────────────────

function CompactPersonnelPanel({
  roster,
  activeTimers,
}: {
  roster: RosterWorkspace | undefined;
  activeTimers: ActiveTimers | undefined;
}) {
  const data = useMemo(() => {
    if (!roster) return null;

    const techs = roster.technicians ?? [];
    const onShift = techs.filter((t: { isOnShiftToday: boolean }) => t.isOnShiftToday);

    const clockedInTechIds = new Set<string>();
    if (activeTimers) {
      for (const timer of activeTimers) {
        clockedInTechIds.add(String(timer.technicianId));
      }
    }

    const groups = new Map<string, { teamName: string; color: string; total: number; clockedIn: number }>();
    for (const tech of onShift) {
      const teamKey = tech.teamName ?? "Unassigned";
      const existing = groups.get(teamKey);
      const isClockedIn = clockedInTechIds.has(String(tech.technicianId));
      if (existing) {
        existing.total++;
        if (isClockedIn) existing.clockedIn++;
      } else {
        groups.set(teamKey, {
          teamName: teamKey,
          color: tech.teamColorToken ?? "bg-slate-500",
          total: 1,
          clockedIn: isClockedIn ? 1 : 0,
        });
      }
    }

    return {
      totalTechs: techs.length,
      onShiftCount: onShift.length,
      clockedInCount: onShift.filter((t) => clockedInTechIds.has(String(t.technicianId))).length,
      teams: Array.from(groups.values()),
    };
  }, [roster, activeTimers]);

  if (!data) {
    return <Skeleton className="h-full min-h-[120px] w-full rounded-lg" />;
  }

  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-3">
        <div className="text-center flex-1">
          <p className="text-lg font-bold text-foreground leading-none">{data.onShiftCount}</p>
          <p className="text-[9px] text-muted-foreground mt-0.5">On Shift</p>
        </div>
        <div className="w-px h-8 bg-border/40" />
        <div className="text-center flex-1">
          <p className="text-lg font-bold text-green-400 leading-none">{data.clockedInCount}</p>
          <p className="text-[9px] text-muted-foreground mt-0.5">Clocked In</p>
        </div>
        <div className="w-px h-8 bg-border/40" />
        <div className="text-center flex-1">
          <p className="text-lg font-bold text-muted-foreground leading-none">{data.totalTechs}</p>
          <p className="text-[9px] text-muted-foreground mt-0.5">Total</p>
        </div>
      </div>

      {data.teams.length > 0 && (
        <div className="space-y-1">
          {data.teams.map((team) => (
            <div key={team.teamName} className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${team.color}`} />
              <span className="text-[10px] text-muted-foreground flex-1 truncate">
                {team.teamName}
              </span>
              <span className="text-[10px] text-foreground font-medium">
                {team.clockedIn}/{team.total}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Command Center ───────────────────────────────────────────────────────

export function CommandCenter({
  workOrders,
  fleetAd,
  capacityUtil,
  bays,
  roster,
  activeTimers,
}: {
  workOrders: WorkOrdersWithRisk | undefined;
  fleetAd: FleetAdSummary | undefined;
  capacityUtil: CapacityUtil | undefined;
  bays: BayData | undefined;
  roster: RosterWorkspace | undefined;
  activeTimers: ActiveTimers | undefined;
}) {
  return (
    <div className="space-y-3">
      {/* KPI Strip */}
      <KPIStrip
        workOrders={workOrders}
        fleetAd={fleetAd}
        capacityUtil={capacityUtil}
        roster={roster}
        activeTimers={activeTimers}
      />

      {/* Three-panel command center */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Panel 1: Attention Queue */}
        <Card className="border-border/60">
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-xs font-semibold text-foreground">Attention</span>
              </div>
              <Button asChild variant="ghost" size="sm" className="h-5 px-1.5 text-[10px]">
                <Link to="/work-orders">View All</Link>
              </Button>
            </div>
            <CompactAttentionQueue workOrders={workOrders} />
          </CardContent>
        </Card>

        {/* Panel 2: Capacity + Bays */}
        <Card className="border-border/60">
          <CardContent className="p-3">
            <div className="flex items-center gap-1.5 mb-2">
              <Gauge className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-xs font-semibold text-foreground">Shop Capacity</span>
            </div>
            <CompactCapacityPanel capacityUtil={capacityUtil} bays={bays} />
          </CardContent>
        </Card>

        {/* Panel 3: Personnel */}
        <Card className="border-border/60">
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-xs font-semibold text-foreground">Personnel</span>
              </div>
              <Button asChild variant="ghost" size="sm" className="h-5 px-1.5 text-[10px]">
                <Link to="/personnel">Roster</Link>
              </Button>
            </div>
            <CompactPersonnelPanel roster={roster} activeTimers={activeTimers} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
