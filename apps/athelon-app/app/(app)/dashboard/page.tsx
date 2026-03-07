import { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import { useOfflineSnapshot } from "@/src/shared/hooks/useOfflineSnapshot";
import type { FunctionReturnType } from "convex/server";
import {
  ChevronRight,
  Wrench,
  ChevronDown,
  BarChart,
  TrendingUp,
  Package,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

// ─── Command Center (above-the-fold hero) ────────────────────────────────────
import { CommandCenter } from "./_components/CommandCenter";

// ─── Primary content ─────────────────────────────────────────────────────────
import { ActiveWorkOrderBoard } from "./_components/ActiveWorkOrderBoard";

// ─── Secondary content (below-the-fold, collapsible) ─────────────────────────
import { UpcomingWorkOrders } from "./_components/UpcomingWorkOrders";
import { ScheduleHealthWidget } from "./_components/ScheduleHealthWidget";
import { FleetStatusList } from "./_components/FleetStatusList";
import { InventoryHealthSection } from "./_components/InventoryHealthSection";
import { WOStatusChart } from "./_components/WOStatusChart";
import { RevenueTrendChart } from "./_components/RevenueTrendChart";
import { TATChart } from "./_components/TATChart";
import { TechUtilizationChart } from "./_components/TechUtilizationChart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { WelcomeModal } from "./_components/WelcomeModal";

// ─── Collapsible Section ─────────────────────────────────────────────────────

function CollapsibleSection({
  title,
  icon: Icon,
  defaultOpen = false,
  children,
}: {
  title: string;
  icon: React.ElementType;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 w-full text-left py-2 group"
      >
        <Icon className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          {title}
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${
            isOpen ? "rotate-0" : "-rotate-90"
          }`}
        />
        <span className="flex-1 h-px bg-border/40 ml-2" />
      </button>
      {isOpen && <div className="space-y-4 mt-1">{children}</div>}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [showWelcome, setShowWelcome] = useState(true);
  const { orgId, org } = useCurrentOrg();

  // Shared queries — lifted here so both LiveKPICards and LiveActiveWorkOrders
  // receive the same data without duplicate subscriptions.
  const workOrdersWithRiskLive = useQuery(
    api.workOrders.getWorkOrdersWithScheduleRisk,
    orgId ? { organizationId: orgId } : "skip",
  );

  const fleetAdLive = useQuery(
    api.adCompliance.getFleetAdSummary,
    orgId ? { organizationId: orgId } : "skip",
  );

  const { value: workOrdersWithRisk, fromCache: workOrdersFromCache } = useOfflineSnapshot(
    `offline:dashboard:workOrders:${orgId ?? "unknown"}`,
    workOrdersWithRiskLive,
  );
  const { value: fleetAd, fromCache: fleetAdFromCache } = useOfflineSnapshot(
    `offline:dashboard:fleetAd:${orgId ?? "unknown"}`,
    fleetAdLive,
  );

  // NOTE: these datasets are optional inputs for the command center/boards.
  // Keep undefined-safe defaults so dashboard remains renderable when queries are deferred.
  const capacityUtil = undefined;
  const bays = undefined;
  const roster = undefined;
  const activeTimers = undefined;
  const laborByWO = undefined;

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
    <div className="space-y-4">
      <WelcomeModal open={showWelcome} onClose={() => setShowWelcome(false)} />

      {/* ─── Page Header ─────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg sm:text-xl md:text-2xl font-semibold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {org?.name ?? "MRO Dashboard"} — {todayLabel}
          </p>
          {(workOrdersFromCache || fleetAdFromCache) && (
            <Badge variant="outline" className="mt-2 text-[10px] border-amber-500/40 text-amber-300">
              Showing cached offline snapshot
            </Badge>
          )}
        </div>
        <Button asChild size="sm" className="w-full sm:w-auto">
          <Link to="/work-orders/new">
            <Wrench className="w-3.5 h-3.5 mr-1.5" />
            New Work Order
          </Link>
        </Button>
      </div>

      {/* ─── Command Center (KPIs + Attention + Capacity + Personnel) ─ */}
      <CommandCenter
        workOrders={workOrdersWithRisk}
        fleetAd={fleetAd}
        capacityUtil={capacityUtil}
        bays={bays}
        roster={roster}
        activeTimers={activeTimers}
      />

      {/* ─── Work In Progress Board ─────────────────────────────────── */}
      <ActiveWorkOrderBoard workOrders={workOrdersWithRisk} laborByWO={laborByWO} />

      {/* ─── Upcoming Work Orders ─────────────────────────────────────── */}
      <UpcomingWorkOrders workOrders={workOrdersWithRisk} />

      {/* ─── Detailed Sections (collapsible, below the fold) ──────────── */}
      <div className="space-y-4 pt-2">
        <CollapsibleSection title="Schedule & Fleet" icon={TrendingUp} defaultOpen={false}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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
                <FleetStatusList workOrders={workOrdersWithRisk} />
              </CardContent>
            </Card>
          </div>
        </CollapsibleSection>

        <CollapsibleSection title="Inventory" icon={Package} defaultOpen={false}>
          <InventoryHealthSection />
        </CollapsibleSection>

        <CollapsibleSection title="Analytics" icon={BarChart} defaultOpen={false}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <WOStatusChart workOrders={workOrdersWithRisk ?? []} />
            <RevenueTrendChart />
            <TATChart />
            <TechUtilizationChart />
          </div>
        </CollapsibleSection>
      </div>
    </div>
  );
}
