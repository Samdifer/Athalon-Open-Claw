import { useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import type { FunctionReturnType } from "convex/server";
import {
  ArrowUp,
  ArrowDown,
  ClipboardList,
  ShieldAlert,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "react-router-dom";
import { MiniSparkline } from "./dashboardHelpers";

type WorkOrdersWithRisk = FunctionReturnType<typeof api.workOrders.getWorkOrdersWithScheduleRisk>;
type FleetAdSummary = FunctionReturnType<typeof api.adCompliance.getFleetAdSummary>;

export function KPICardsRow({
  workOrders,
  fleetAd,
}: {
  workOrders: WorkOrdersWithRisk | undefined;
  fleetAd: FleetAdSummary | undefined;
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
      title: "Open Findings",
      value: kpis.openDiscrepancies,
      spark: [1, 2, 1, 3, kpis.openDiscrepancies, 2, kpis.openDiscrepancies],
      color: "#a78bfa",
      trend: null,
      href: "/findings",
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

export function SecondaryKPICards() {
  const { orgId } = useCurrentOrg();

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
