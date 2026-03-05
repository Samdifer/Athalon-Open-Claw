import { useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import type { FunctionReturnType } from "convex/server";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Link } from "react-router-dom";

type WorkOrdersWithRisk = FunctionReturnType<typeof api.workOrders.getWorkOrdersWithScheduleRisk>;

export function FleetStatusList({ workOrders }: { workOrders: WorkOrdersWithRisk | undefined }) {
  const { orgId } = useCurrentOrg();

  const fleet = useQuery(
    api.aircraft.list,
    orgId ? { organizationId: orgId } : "skip",
  );

  const fleetRows = useMemo(() => {
    if (!fleet) return null;

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
        statusLabel = (ac.status ?? "unknown").replace(/_/g, " ");
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
          Add aircraft
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
