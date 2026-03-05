import { useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import type { FunctionReturnType } from "convex/server";
import {
  AlertTriangle,
  ClipboardList,
  Package,
  ShieldAlert,
  Wrench,
  TrendingUp,
  Clock,
  ChevronRight,
  CheckCircle2,
  Circle,
  Timer,
  ArrowUp,
  ArrowDown,
  DollarSign,
  Bell,
  ClipboardCheck,
  FileBox,
  Users,
  Calendar,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "react-router-dom";
import { ScheduleHealthWidget } from "./_components/ScheduleHealthWidget";
import { WOStatusChart } from "./_components/WOStatusChart";
import { RevenueTrendChart } from "./_components/RevenueTrendChart";
import { TATChart } from "./_components/TATChart";
import { TechUtilizationChart } from "./_components/TechUtilizationChart";
import {
  AreaChart,
  Area,
  ResponsiveContainer,
} from "recharts";

// ─── Status label map ─────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  open: "Open",
  in_progress: "In Progress",
  pending_signoff: "Pending Sign-Off",
  on_hold: "On Hold",
  closed: "Closed",
  voided: "Voided",
  cancelled: "Cancelled",
};

// ─── KPI Sparkline ──────────────────────────────────────────────────────────

function MiniSparkline({ data, color, id }: { data: number[]; color: string; id: string }) {
  const chartData = data.map((v, i) => ({ i, v }));
  const gradId = `grad-${id}-${color}`;
  return (
    <ResponsiveContainer width="100%" height={28}>
      <AreaChart data={chartData} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.3} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey="v"
          stroke={color}
          strokeWidth={1.5}
          fill={`url(#${gradId})`}
          dot={false}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────

type WorkOrdersWithRisk = FunctionReturnType<typeof api.workOrders.getWorkOrdersWithScheduleRisk>;
type FleetAdSummary = FunctionReturnType<typeof api.adCompliance.getFleetAdSummary>;

// ─── Live KPI Cards ─────────────────────────────────────────────────────────

function LiveKPICards({
  workOrders,
  fleetAd,
}: {
  workOrders: WorkOrdersWithRisk | undefined;
  fleetAd: FleetAdSummary | undefined;
}) {
  const kpis = useMemo(() => {
    if (!workOrders) return null;

    // "Active" matches the WO list page's Active tab definition so the KPI
    // count is consistent with what the user sees when they click through.
    const active = workOrders.filter((wo) =>
      ["open", "in_progress", "open_discrepancies"].includes(wo.status),
    );
    const aog = active.filter((wo) => wo.priority === "aog");
    // BUG-DOM-116: Draft WOs were included in the open-discrepancy count because
    // only closed/voided/cancelled statuses were excluded. A draft WO is pre-work —
    // its squawks are speculative entries, not actionable shop discrepancies. Including
    // them inflated the KPI and could mislead the DOM into chasing ghosts. Fix: also
    // exclude draft from the sum.
    const openDisc = workOrders.reduce((acc, wo) => {
      if (["draft", "closed", "voided", "cancelled"].includes(wo.status)) return acc;
      return acc + (wo.openDiscrepancyCount ?? 0);
    }, 0);
    const overdueAds = fleetAd?.fleetTotals?.overdueAds ?? 0;

    return {
      activeWOs: active.length,
      aogCount: aog.length,
      overdueAds,
      openDiscrepancies: openDisc,
    };
  }, [workOrders, fleetAd]);

  if (!kpis) return null;

  const cards = [
    {
      title: "Active Work Orders",
      value: kpis.activeWOs,
      spark: [3, 5, 4, 6, kpis.activeWOs, kpis.activeWOs + 1, kpis.activeWOs],
      color: "#38bdf8",
      // No trend arrow — more active WOs can mean a growing backlog (bad) or
      // a busy shop (good). A static threshold arrow misleads more than it helps.
      trend: null as null,
      href: "/work-orders",
    },
    {
      title: "AOG Aircraft",
      value: kpis.aogCount,
      spark: [0, 1, 0, 0, kpis.aogCount, kpis.aogCount, 0],
      color: "#ef4444",
      trend: null,
      href: "/work-orders",
      alert: kpis.aogCount > 0,
    },
    {
      title: "Overdue ADs",
      value: kpis.overdueAds,
      spark: [2, 1, 3, 2, kpis.overdueAds, kpis.overdueAds, 1],
      color: "#f59e0b",
      trend: null,
      href: "/compliance/ad-sb",
      alert: kpis.overdueAds > 0,
    },
    {
      title: "Open Discrepancies",
      value: kpis.openDiscrepancies,
      spark: [1, 2, 1, 3, kpis.openDiscrepancies, 2, kpis.openDiscrepancies],
      color: "#a78bfa",
      trend: null,
      href: "/squawks",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map((c) => (
        <Link key={c.title} to={c.href}>
          <Card
            className={`hover:bg-card/80 transition-colors cursor-pointer border-border/60 ${
              c.alert ? "border-red-500/40" : ""
            }`}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-1">
                <p className="text-[11px] text-muted-foreground font-medium">
                  {c.title}
                </p>
                {c.trend === "up" && <ArrowUp className="w-3 h-3 text-emerald-500" />}
                {c.trend === "down" && <ArrowDown className="w-3 h-3 text-red-400" />}
                {c.alert && (
                  <Badge variant="destructive" className="text-[9px] h-4 px-1">
                    !
                  </Badge>
                )}
              </div>
              <p className="text-2xl font-bold text-foreground">{c.value}</p>
              <MiniSparkline data={c.spark} color={c.color} id={c.title} />
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}

// ─── Secondary Live KPIs ──────────────────────────────────────────────────────

function LiveSecondaryKPIs() {
  const { orgId } = useCurrentOrg();

  // BUG-SM-HUNT-012: "Parts Awaiting Inspection" was duplicated here AND in the
  // Inventory Health section below, firing the same Convex query twice and
  // showing identical data side-by-side. Replaced with "Pending Sign-Off" count
  // which is operationally critical for shop managers tracking WOs ready for QCM
  // release. "Parts Awaiting Inspection" is already covered by Inventory Health.
  const woData = useQuery(
    api.workOrders.getWorkOrdersWithScheduleRisk,
    orgId ? { organizationId: orgId } : "skip",
  );

  const expiringCerts = useQuery(
    api.technicians.listWithExpiringCerts,
    orgId ? { organizationId: orgId, withinDays: 30 } : "skip",
  );

  const pendingSignoffCount = useMemo(() => {
    if (!woData) return null;
    return woData.filter((wo) => wo.status === "pending_signoff").length;
  }, [woData]);

  const certsCount = expiringCerts?.length ?? null;

  const cards = [
    {
      title: "Pending Sign-Off",
      value: pendingSignoffCount,
      sub: "ready for QCM release",
      icon: ClipboardList,
      href: "/work-orders",
      color: "text-sky-400",
      bgColor: "bg-sky-500/10",
      alert: (pendingSignoffCount ?? 0) > 0,
    },
    {
      title: "Certs Expiring (30d)",
      value: certsCount,
      sub: "IA/AMT certificates",
      icon: ShieldAlert,
      href: "/personnel",
      color: "text-orange-400",
      bgColor: "bg-orange-500/10",
      alert: (certsCount ?? 0) > 0,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3">
      {cards.map((c) => (
        <Link key={c.title} to={c.href}>
          <Card
            className={`hover:bg-card/80 transition-colors cursor-pointer border-border/60 ${
              c.alert ? "border-amber-500/30" : ""
            }`}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">
                    {c.title}
                  </p>
                  <span className="block text-2xl font-bold text-foreground mt-1">
                    {c.value ?? <Skeleton className="h-7 w-10 inline-block" />}
                  </span>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{c.sub}</p>
                </div>
                <div className={`p-2 rounded-lg ${c.bgColor}`}>
                  <c.icon className={`w-4 h-4 ${c.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}

// ─── Inventory Health Section ─────────────────────────────────────────────────

/**
 * Inventory Health dashboard widget — Phase 8 integration.
 *
 * Uses Phase 5-7 Convex queries that may not be present in the generated API
 * types until `convex dev` is run against the latest schema. We use safe casts
 * with explicit result type annotations. The queries resolve once the backend
 * files (inventoryValuation.ts, inventoryAlerts.ts, workOrderParts.ts) are
 * deployed.
 */

// Result types for Phase 5-7 backend queries (types resolve after `convex dev`)
type InventoryValueResult = {
  totalValue: number;
  partCount: number;
  conditionBreakdown: Record<string, { count: number; value: number }>;
};

type AlertsSummaryResult = {
  lowStock: number;
  expiringSoon: number;
  total: number;
};

type OpenPartRequest = {
  _id: string;
  partNumber: string;
  status: string;
};

function InventoryHealthSection() {
  const { orgId } = useCurrentOrg();

  // Phase 5-7 queries — types resolve after `convex dev`
  const inventoryValue = useQuery(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- types resolve after convex dev
    (api as Record<string, Record<string, unknown>>).inventoryValuation?.getInventoryValue as typeof api.parts.listParts,
    orgId ? { organizationId: orgId } : "skip",
  ) as InventoryValueResult | undefined;

  const alertsSummary = useQuery(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- types resolve after convex dev
    (api as Record<string, Record<string, unknown>>).inventoryAlerts?.getReorderAlerts as typeof api.parts.listParts,
    orgId ? { organizationId: orgId } : "skip",
  ) as AlertsSummaryResult | undefined;

  const pendingInspection = useQuery(
    api.parts.listParts,
    orgId ? { organizationId: orgId, location: "pending_inspection" as const } : "skip",
  );

  const openRequests = useQuery(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- types resolve after convex dev
    (api as Record<string, Record<string, unknown>>).workOrderParts?.listOpenRequests as typeof api.parts.listParts,
    orgId ? { organizationId: orgId } : "skip",
  ) as OpenPartRequest[] | undefined;

  const totalValue = inventoryValue?.totalValue ?? null;
  const partCount = inventoryValue?.partCount ?? null;
  const alertCount = alertsSummary?.total ?? alertsSummary?.lowStock ?? null;
  const pendingCount = pendingInspection?.length ?? null;
  const openRequestCount = Array.isArray(openRequests) ? openRequests.length : null;

  const cards = [
    {
      title: "Total Inventory Value",
      value: totalValue !== null
        ? `$${totalValue.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
        : null,
      sub: partCount !== null ? `${partCount} parts tracked` : "Loading...",
      icon: DollarSign,
      href: "/reports/inventory",
      color: "text-emerald-400",
      bgColor: "bg-emerald-500/10",
      alert: false,
    },
    {
      title: "Low Stock Alerts",
      value: alertCount,
      sub: "parts at or below reorder point",
      icon: Bell,
      href: "/parts/alerts",
      color: "text-red-400",
      bgColor: "bg-red-500/10",
      alert: (alertCount ?? 0) > 0,
    },
    {
      title: "Parts Awaiting Inspection",
      value: pendingCount,
      sub: "pending receiving inspection",
      icon: ClipboardCheck,
      href: "/parts/receiving",
      color: "text-amber-400",
      bgColor: "bg-amber-500/10",
      alert: (pendingCount ?? 0) > 0,
    },
    {
      title: "Open Part Requests",
      value: openRequestCount,
      sub: "work order parts needed",
      icon: FileBox,
      href: "/parts/requests",
      color: "text-sky-400",
      bgColor: "bg-sky-500/10",
      alert: (openRequestCount ?? 0) > 5,
    },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Package className="w-4 h-4 text-muted-foreground" />
          Inventory Health
        </h2>
        <Button asChild variant="ghost" size="sm" className="h-7 text-xs">
          <Link to="/parts" className="flex items-center gap-1">
            View Inventory
            <ChevronRight className="w-3 h-3" />
          </Link>
        </Button>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {cards.map((c) => (
          <Link key={c.title} to={c.href}>
            <Card
              className={`hover:bg-card/80 transition-colors cursor-pointer border-border/60 ${
                c.alert ? "border-amber-500/30" : ""
              }`}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] text-muted-foreground font-medium">
                      {c.title}
                    </p>
                    <span className="block text-2xl font-bold text-foreground mt-1">
                      {c.value ?? <Skeleton className="h-7 w-10 inline-block" />}
                    </span>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{c.sub}</p>
                  </div>
                  <div className={`p-2 rounded-lg ${c.bgColor}`}>
                    <c.icon className={`w-4 h-4 ${c.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}

// ─── Live Active Work Orders ──────────────────────────────────────────────────

function LiveActiveWorkOrders({ workOrders }: { workOrders: WorkOrdersWithRisk | undefined }) {
  const active = useMemo(() => {
    if (!workOrders) return null;
    return workOrders
      .filter((wo) => !["draft", "closed", "voided", "cancelled"].includes(wo.status))
      .sort((a, b) => {
        // AOG first, then by openedAt desc
        if (a.priority === "aog" && b.priority !== "aog") return -1;
        if (b.priority === "aog" && a.priority !== "aog") return 1;
        return (b.openedAt ?? 0) - (a.openedAt ?? 0);
      })
      .slice(0, 5);
  }, [workOrders]);

  if (!active) {
    return (
      <div className="space-y-1">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    );
  }

  if (active.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
        <CheckCircle2 className="w-6 h-6 mb-2 text-green-400" />
        <p className="text-sm">No active work orders</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {active.map((wo, i) => {
        const daysOpen = wo.openedAt
          ? Math.floor((Date.now() - wo.openedAt) / (1000 * 60 * 60 * 24))
          : 0;
        const tasksComplete = wo.completedTaskCardCount;
        const tasksTotal = wo.taskCardCount;

        return (
          <div key={wo._id}>
            {i > 0 && <Separator className="my-1 opacity-40" />}
            <Link to={`/work-orders/${wo._id}`}>
              <div
                className={`flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/40 transition-colors cursor-pointer ${
                  wo.priority === "aog" ? "aog-indicator pl-3" : ""
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-mono text-xs text-muted-foreground font-medium">
                      {wo.workOrderNumber ?? wo._id.slice(0, 8)}
                    </span>
                    {getStatusBadge(wo.status, STATUS_LABELS[wo.status] ?? wo.status, wo.priority ?? undefined)}
                    {wo.openDiscrepancyCount > 0 && (
                      <Badge className="bg-red-500/15 text-red-400 border-red-500/30 text-[9px] h-4 px-1">
                        {wo.openDiscrepancyCount} squawk{wo.openDiscrepancyCount === 1 ? "" : "s"}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    {wo.aircraft && (
                      <span className="font-mono text-sm font-semibold text-foreground">
                        {wo.aircraft.currentRegistration}
                      </span>
                    )}
                    {wo.aircraft && (
                      <span className="text-xs text-muted-foreground">
                        {wo.aircraft.make} {wo.aircraft.model}
                      </span>
                    )}
                    {wo.description && (
                      <>
                        <span className="text-muted-foreground text-xs">·</span>
                        <span className="text-xs text-muted-foreground truncate">
                          {wo.description}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex-shrink-0 text-right min-w-[80px]">
                  {tasksTotal > 0 ? (
                    <>
                      <div className="flex items-center justify-end gap-1.5 mb-1">
                        {tasksComplete === tasksTotal ? (
                          <CheckCircle2 className="w-3 h-3 text-green-400" />
                        ) : (
                          <Circle className="w-3 h-3 text-muted-foreground" />
                        )}
                        <span className="text-[11px] text-muted-foreground">
                          {tasksComplete}/{tasksTotal} tasks
                        </span>
                      </div>
                      <Progress
                        value={(tasksComplete / tasksTotal) * 100}
                        className="h-1 w-20"
                      />
                    </>
                  ) : (
                    <span className="text-[11px] text-muted-foreground">No tasks yet</span>
                  )}
                  <div className="flex items-center justify-end gap-1 mt-1">
                    <Timer className="w-3 h-3 text-muted-foreground/60" />
                    <span className="text-[10px] text-muted-foreground/60">
                      {daysOpen}d open
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          </div>
        );
      })}
    </div>
  );
}

// ─── Live Attention Items ─────────────────────────────────────────────────────

function LiveAttentionItems({ workOrders }: { workOrders: WorkOrdersWithRisk | undefined }) {
  const { orgId } = useCurrentOrg();

  const expiringCerts = useQuery(
    api.technicians.listWithExpiringCerts,
    orgId ? { organizationId: orgId, withinDays: 30 } : "skip",
  );

  const items = useMemo(() => {
    if (workOrders === undefined || expiringCerts === undefined) return null;

    type AttentionItem = {
      id: string;
      severity: "critical" | "warning" | "info";
      title: string;
      description: string;
      action: string;
      href: string;
      icon: typeof AlertTriangle;
    };

    const result: AttentionItem[] = [];

    // AOG aircraft — highest priority
    const aogWOs = workOrders.filter(
      (wo) => wo.priority === "aog" && !["closed", "voided", "cancelled"].includes(wo.status),
    );
    for (const wo of aogWOs.slice(0, 2)) {
      const tail = wo.aircraft?.currentRegistration ?? "Unknown aircraft";
      const type = wo.aircraft ? `${wo.aircraft.make} ${wo.aircraft.model}` : "";
      result.push({
        id: `aog-${wo._id}`,
        severity: "critical",
        title: "AOG Aircraft",
        description: `${tail}${type ? ` ${type}` : ""} — ${wo.description ?? "No description"} (${wo.workOrderNumber})`,
        action: "View WO",
        href: `/work-orders/${wo._id}`,
        icon: AlertTriangle,
      });
    }

    // WOs with open squawks (non-AOG, non-closed)
    const squawkWOs = workOrders.filter(
      (wo) =>
        wo.priority !== "aog" &&
        (wo.openDiscrepancyCount ?? 0) > 0 &&
        !["closed", "voided", "cancelled"].includes(wo.status),
    );
    for (const wo of squawkWOs.slice(0, 2)) {
      const tail = wo.aircraft?.currentRegistration ?? "Unknown";
      const count = wo.openDiscrepancyCount ?? 0;
      result.push({
        id: `squawk-${wo._id}`,
        severity: "warning",
        title: "Open Squawk(s) Requiring Disposition",
        description: `${count} open squawk${count !== 1 ? "s" : ""} on ${wo.workOrderNumber} (${tail})`,
        action: "View",
        href: "/squawks",
        icon: AlertTriangle,
      });
    }

    // WOs awaiting QCM sign-off — ready to release but stuck in queue
    const pendingSignoffWOs = workOrders.filter(
      (wo) => wo.status === "pending_signoff",
    );
    if (pendingSignoffWOs.length > 0) {
      result.push({
        id: "pending-signoff",
        severity: "warning",
        title: `${pendingSignoffWOs.length} Work Order${pendingSignoffWOs.length !== 1 ? "s" : ""} Awaiting Sign-Off`,
        description: pendingSignoffWOs.length === 1
          ? `${pendingSignoffWOs[0]!.workOrderNumber} (${pendingSignoffWOs[0]!.aircraft?.currentRegistration ?? "—"}) is ready for QCM release`
          : `${pendingSignoffWOs.map((w) => w.workOrderNumber).slice(0, 3).join(", ")}${pendingSignoffWOs.length > 3 ? ` +${pendingSignoffWOs.length - 3} more` : ""} — QCM sign-off required`,
        action: "View",
        href: "/work-orders",
        icon: ClipboardList,
      });
    }

    // Expiring or expired IA certs
    for (const entry of (expiringCerts ?? []).slice(0, 3)) {
      const tech = entry.technician as { legalName?: string } | null;
      const name = tech?.legalName ?? "Unknown technician";
      const expiry = (entry.cert as { iaExpiryDate?: number }).iaExpiryDate;
      const daysLeft = expiry != null
        ? Math.ceil((expiry - Date.now()) / (1000 * 60 * 60 * 24))
        : null;
      const isPast = daysLeft !== null && daysLeft <= 0;
      result.push({
        id: `cert-${(entry.cert as { _id: string })._id}`,
        severity: isPast || (daysLeft !== null && daysLeft <= 7) ? "critical" : "warning",
        title: isPast ? "IA Certificate EXPIRED" : "IA Certificate Expiring",
        description: isPast
          ? `${name} — IA cert has expired`
          : `${name} — expires in ${daysLeft} day${daysLeft !== 1 ? "s" : ""}`,
        action: "View",
        href: "/compliance/audit-trail",
        icon: ShieldAlert,
      });
    }

    return result;
  }, [workOrders, expiringCerts]);

  if (items === null) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-14 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
        <CheckCircle2 className="w-6 h-6 mb-2 text-green-400" />
        <p className="text-sm">All clear — no items require attention</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {items.map((item) => {
        const styles = getSeverityStyles(item.severity);
        return (
          <div
            key={item.id}
            className={`flex items-start gap-3 p-3 rounded-lg border-l-2 ${styles.border} ${styles.bg} border border-border/40`}
          >
            <item.icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${styles.icon}`} />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-foreground">{item.title}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                {item.description}
              </p>
            </div>
            <Button asChild variant="ghost" size="sm" className="h-6 px-2 text-[11px] flex-shrink-0">
              <Link to={item.href}>{item.action}</Link>
            </Button>
          </div>
        );
      })}
    </div>
  );
}

// ─── Live Fleet Status ────────────────────────────────────────────────────────

function LiveFleetStatus({ workOrders }: { workOrders: WorkOrdersWithRisk | undefined }) {
  const { orgId } = useCurrentOrg();

  const fleet = useQuery(
    api.aircraft.list,
    orgId ? { organizationId: orgId } : "skip",
  );

  const fleetRows = useMemo(() => {
    if (!fleet) return null;

    // Build set of registrations that have an active AOG work order
    const aogRegs = new Set<string>();
    if (workOrders) {
      for (const wo of workOrders) {
        if (
          wo.priority === "aog" &&
          !["closed", "voided", "cancelled"].includes(wo.status) &&
          wo.aircraft?.currentRegistration
        ) {
          aogRegs.add(wo.aircraft.currentRegistration);
        }
      }
    }

    // Sort: AOG first, then in-maintenance (open WOs), then others — so critical
    // aircraft always appear in the capped dashboard widget.
    const sorted = [...fleet].sort((a, b) => {
      const aIsAog = a.currentRegistration ? aogRegs.has(a.currentRegistration) : false;
      const bIsAog = b.currentRegistration ? aogRegs.has(b.currentRegistration) : false;
      const aOpenWos = (a as typeof a & { openWorkOrderCount?: number }).openWorkOrderCount ?? 0;
      const bOpenWos = (b as typeof b & { openWorkOrderCount?: number }).openWorkOrderCount ?? 0;
      if (aIsAog && !bIsAog) return -1;
      if (!aIsAog && bIsAog) return 1;
      if (aOpenWos > 0 && bOpenWos === 0) return -1;
      if (aOpenWos === 0 && bOpenWos > 0) return 1;
      return 0;
    });

    return sorted.slice(0, 5).map((ac) => {
      const reg = ac.currentRegistration ?? ac.serialNumber;
      const isAog = ac.currentRegistration ? aogRegs.has(ac.currentRegistration) : false;
      const openWos = (ac as typeof ac & { openWorkOrderCount?: number }).openWorkOrderCount ?? 0;
      const fleetHref = reg ? `/fleet/${encodeURIComponent(reg)}` : "/fleet";

      let statusLabel: string;
      let statusColor: string;
      let statusDot: string;

      if (isAog) {
        statusLabel = "AOG";
        statusColor = "text-red-400";
        statusDot = "bg-red-500";
      } else if (openWos > 0) {
        statusLabel = "In Maintenance";
        statusColor = "text-sky-400";
        statusDot = "bg-sky-400";
      } else if (ac.status === "airworthy") {
        statusLabel = "Airworthy";
        statusColor = "text-green-400";
        statusDot = "bg-green-400";
      } else if (ac.status === "out_of_service") {
        statusLabel = "Out of Service";
        statusColor = "text-orange-400";
        statusDot = "bg-orange-400";
      } else {
        statusLabel = ac.status.replace(/_/g, " ");
        statusColor = "text-muted-foreground";
        statusDot = "bg-muted-foreground/40";
      }

      return {
        id: String(ac._id),
        tail: reg ?? "—",
        type: `${ac.make} ${ac.model}`.trim(),
        openWos,
        statusLabel,
        statusColor,
        statusDot,
        href: fleetHref,
      };
    });
  }, [fleet, workOrders]);

  if (!fleetRows) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-10 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (fleetRows.length === 0) {
    return (
      <div className="py-6 text-center text-sm text-muted-foreground">
        No aircraft in fleet.{" "}
        <Link to="/fleet" className="text-primary hover:underline text-sm">
          Add aircraft →
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {fleetRows.map((aircraft, i) => (
        <div key={aircraft.id}>
          {i > 0 && <Separator className="my-1 opacity-40" />}
          <Link to={aircraft.href}>
            <div className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/40 transition-colors cursor-pointer">
              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${aircraft.statusDot}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-mono font-semibold text-sm text-foreground">
                    {aircraft.tail}
                  </span>
                  {aircraft.openWos > 0 && (
                    <Badge variant="secondary" className="text-[9px] h-4 px-1 bg-muted">
                      {aircraft.openWos} WO
                    </Badge>
                  )}
                </div>
                <span className="text-[11px] text-muted-foreground">{aircraft.type}</span>
              </div>
              <span className={`text-[10px] font-medium flex-shrink-0 ${aircraft.statusColor}`}>
                {aircraft.statusLabel}
              </span>
            </div>
          </Link>
        </div>
      ))}
    </div>
  );
}

// ─── Status helpers ───────────────────────────────────────────────────────────

function getStatusBadge(status: string, label: string, priority?: string) {
  if (priority === "aog")
    return (
      <Badge className="bg-red-500/15 text-red-400 border border-red-500/30 font-medium text-[10px]">
        AOG
      </Badge>
    );
  const map: Record<string, string> = {
    open: "bg-blue-500/15 text-blue-400 border border-blue-500/30",
    in_progress:
      "bg-sky-500/15 text-sky-400 border border-sky-500/30",
    pending_inspection:
      "bg-amber-500/15 text-amber-400 border border-amber-500/30",
    pending_signoff:
      "bg-amber-500/15 text-amber-400 border border-amber-500/30",
    open_discrepancies:
      "bg-red-500/15 text-red-400 border border-red-500/30",
    on_hold: "bg-orange-500/15 text-orange-400 border border-orange-500/30",
    draft: "bg-slate-500/15 text-slate-400 border border-slate-500/30",
    closed: "bg-green-500/15 text-green-400 border border-green-500/30",
    cancelled: "bg-slate-500/15 text-slate-400 border border-slate-500/30",
    voided: "bg-slate-500/15 text-slate-400 border border-slate-500/30",
  };
  return (
    <Badge
      variant="outline"
      className={`font-medium text-[10px] ${map[status] ?? "bg-muted text-muted-foreground"}`}
    >
      {label}
    </Badge>
  );
}

function getSeverityStyles(severity: string) {
  const map: Record<string, { border: string; icon: string; bg: string }> = {
    critical: {
      border: "border-l-red-500",
      icon: "text-red-400",
      bg: "bg-red-500/5",
    },
    warning: {
      border: "border-l-amber-500",
      icon: "text-amber-400",
      bg: "bg-amber-500/5",
    },
    info: {
      border: "border-l-sky-500",
      icon: "text-sky-400",
      bg: "bg-sky-500/5",
    },
  };
  return map[severity] ?? map["info"]!;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { orgId, org } = useCurrentOrg();

  // Shared queries — lifted here so both LiveKPICards and LiveActiveWorkOrders
  // receive the same data without duplicate subscriptions.
  const workOrdersWithRisk = useQuery(
    api.workOrders.getWorkOrdersWithScheduleRisk,
    orgId ? { organizationId: orgId } : "skip",
  );

  const fleetAd = useQuery(
    api.adCompliance.getFleetAdSummary,
    orgId ? { organizationId: orgId } : "skip",
  );

  // BUG-SM-HUNT-019: todayLabel was memoized with no deps `useMemo(fn, [])`,
  // so it computed once on mount. A shop manager who leaves the dashboard open
  // past midnight sees yesterday's date all day. Since `workOrdersWithRisk`
  // changes frequently (Convex live query), keying on its reference identity
  // triggers a re-evaluation often enough to stay current without adding a timer.
  const todayLabel = useMemo(() => {
    const d = new Date();
    return d.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workOrdersWithRisk]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg sm:text-xl md:text-2xl font-semibold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {org?.name ?? "MRO Dashboard"} — {todayLabel}
          </p>
        </div>
        <Button asChild size="sm" className="w-full sm:w-auto">
          <Link to="/work-orders/new">
            <Wrench className="w-3.5 h-3.5 mr-1.5" />
            New Work Order
          </Link>
        </Button>
      </div>

      {/* Live KPI Cards */}
      <LiveKPICards workOrders={workOrdersWithRisk} fleetAd={fleetAd} />

      {/* Secondary Live KPIs */}
      <LiveSecondaryKPIs />

      {/* Inventory Health — Phase 8 integration */}
      <InventoryHealthSection />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        {/* Left: Attention Queue + Work Orders */}
        <div className="lg:col-span-2 space-y-6">
          {/* Attention Queue */}
          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  Attention Required
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <LiveAttentionItems workOrders={workOrdersWithRisk} />
            </CardContent>
          </Card>

          {/* Open Work Orders (all non-terminal statuses) */}
          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <ClipboardList className="w-4 h-4 text-muted-foreground" />
                  Open Work Orders
                </CardTitle>
                <Button asChild variant="ghost" size="sm" className="h-7 text-xs">
                  <Link to="/work-orders" className="flex items-center gap-1">
                    View All
                    <ChevronRight className="w-3 h-3" />
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <LiveActiveWorkOrders workOrders={workOrdersWithRisk} />
            </CardContent>
          </Card>
        </div>

        {/* Right: Schedule Health + Fleet Status */}
        <div className="space-y-6">
          {/* Schedule Health Widget — uses live Convex data */}
          <ScheduleHealthWidget />

          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-muted-foreground" />
                  Fleet Status
                </CardTitle>
                <Button asChild variant="ghost" size="sm" className="h-7 text-xs">
                  <Link to="/fleet" className="flex items-center gap-1">
                    View All
                    <ChevronRight className="w-3 h-3" />
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <LiveFleetStatus workOrders={workOrdersWithRisk} />
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-2">
              <Button
                asChild
                variant="outline"
                className="w-full justify-start h-9 text-xs gap-2 border-border/60"
                size="sm"
              >
                <Link to="/work-orders/new">
                  <Wrench className="w-3.5 h-3.5" />
                  New Work Order
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="w-full justify-start h-9 text-xs gap-2 border-border/60"
                size="sm"
              >
                <Link to="/squawks">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  View Squawks
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="w-full justify-start h-9 text-xs gap-2 border-border/60"
                size="sm"
              >
                <Link to="/parts/requests">
                  <Package className="w-3.5 h-3.5" />
                  View Parts Queue
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="w-full justify-start h-9 text-xs gap-2 border-border/60"
                size="sm"
              >
                <Link to="/compliance/audit-trail">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  Audit Trail
                </Link>
              </Button>
              {/* BUG-SM-HUNT-015: Shop managers use scheduling and reports daily
                  but had to hunt through sidebar nav. Adding quick-action links
                  completes the Dashboard → WOs → Scheduling → Reports workflow. */}
              <Button
                asChild
                variant="outline"
                className="w-full justify-start h-9 text-xs gap-2 border-border/60"
                size="sm"
              >
                <Link to="/scheduling">
                  <Calendar className="w-3.5 h-3.5" />
                  Scheduling Board
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="w-full justify-start h-9 text-xs gap-2 border-border/60"
                size="sm"
              >
                <Link to="/reports">
                  <TrendingUp className="w-3.5 h-3.5" />
                  Reports
                </Link>
              </Button>
              {/* BUG-FD-005: Dashboard had no front-desk quick actions. The only
                  shortcuts were MRO-tech oriented (WOs, squawks, parts). Front desk
                  staff need one-click access to quotes, customers, and invoices —
                  the pages they use most. Without these, they had to navigate through
                  the sidebar menu every time, adding friction to every customer call. */}
              <Separator className="my-1" />
              <Button
                asChild
                variant="outline"
                className="w-full justify-start h-9 text-xs gap-2 border-border/60"
                size="sm"
              >
                <Link to="/billing/quotes/new">
                  <FileBox className="w-3.5 h-3.5" />
                  New Quote
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="w-full justify-start h-9 text-xs gap-2 border-border/60"
                size="sm"
              >
                <Link to="/billing/customers">
                  <Users className="w-3.5 h-3.5" />
                  Find Customer
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="w-full justify-start h-9 text-xs gap-2 border-border/60"
                size="sm"
              >
                <Link to="/billing/invoices">
                  <DollarSign className="w-3.5 h-3.5" />
                  Invoices
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <WOStatusChart workOrders={workOrdersWithRisk ?? []} />
        <RevenueTrendChart />
        <TATChart />
        <TechUtilizationChart />
      </div>
    </div>
  );
}
