import { useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../athelon-app/convex/_generated/api";
import { useCurrentOrg } from "@/providers/OrgContextProvider";
import { IOSNavBar } from "@/components/ios/IOSNavBar";
import { IOSGroupedList } from "@/components/ios/IOSGroupedList";
import { IOSListRow } from "@/components/ios/IOSListRow";
import { IOSStatusBadge } from "@/components/ios/IOSStatusBadge";
import { IOSProgressRing } from "@/components/ios/IOSProgressRing";
import { IOSLoadingSpinner } from "@/components/ios/IOSLoadingSpinner";
import {
  PlaneTakeoff,
  Package,
  ShieldCheck,
  Plus,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Greeting helper
// ---------------------------------------------------------------------------

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AircraftRow {
  _id: string;
  currentRegistration?: string;
  make: string;
  model: string;
  status: string;
  openWorkOrderCount: number;
}

interface WorkOrderRow {
  _id: string;
  workOrderNumber: string;
  status: string;
  description: string;
  aircraftRegistration?: string;
  aircraft: {
    currentRegistration: string;
    make: string;
    model: string;
  } | null;
}

// ---------------------------------------------------------------------------
// Dashboard Page
// ---------------------------------------------------------------------------

export default function Dashboard() {
  const { orgId, isLoaded, tech } = useCurrentOrg();

  // Convex queries
  const aircraft = useQuery(
    api.aircraft.list,
    isLoaded && orgId ? { organizationId: orgId } : "skip",
  ) as AircraftRow[] | undefined;

  const workOrders = useQuery(
    api.workOrders.listActive,
    isLoaded && orgId ? { organizationId: orgId, limit: 5 } : "skip",
  ) as WorkOrderRow[] | undefined;

  const activeCount = useQuery(
    api.workOrders.countActive,
    isLoaded && orgId ? { organizationId: orgId } : "skip",
  );

  const loading =
    aircraft === undefined || workOrders === undefined || activeCount === undefined;

  // Compute KPIs
  const kpis = useMemo(() => {
    if (!aircraft) {
      return { activeWOs: 0, fleetSize: 0, aogCount: 0, availability: 0 };
    }

    const fleetSize = aircraft.length;
    const aogCount = aircraft.filter((ac) => ac.status === "AOG").length;
    const airworthyCount = aircraft.filter(
      (ac) => ac.status !== "AOG" && ac.status !== "out_of_service",
    ).length;
    const availability =
      fleetSize > 0 ? Math.round((airworthyCount / fleetSize) * 100) : 100;

    return {
      activeWOs: activeCount ?? 0,
      fleetSize,
      aogCount,
      availability,
    };
  }, [aircraft, activeCount]);

  // User greeting
  const firstName = tech?.firstName ?? "Technician";

  return (
    <div>
      {/* Nav Bar */}
      <IOSNavBar
        title="Dashboard"
        largeTitle
        rightAction={
          <button className="text-[17px] text-ios-blue font-normal">
            Edit
          </button>
        }
      />

      {/* Greeting */}
      <div className="px-4 pt-1 pb-4">
        <p className="text-[15px] text-ios-label-secondary">
          {getGreeting()}, {firstName}
        </p>
      </div>

      {loading ? (
        <IOSLoadingSpinner />
      ) : (
        <div className="space-y-1 pb-6">
          {/* KPI Grid - 2x2 */}
          <div className="px-4">
            <div className="grid grid-cols-2 gap-3">
              {/* Active Work Orders */}
              <div className="ios-card relative overflow-hidden">
                <div className="absolute left-0 top-0 bottom-0 w-[4px] rounded-l-[12px] bg-ios-blue" />
                <div className="pl-2">
                  <div className="text-[28px] font-bold tabular-nums text-ios-label">
                    {kpis.activeWOs}
                  </div>
                  <div className="text-[13px] text-ios-label-secondary mt-0.5">
                    work orders in progress
                  </div>
                </div>
              </div>

              {/* Fleet Size */}
              <div className="ios-card relative overflow-hidden">
                <div className="absolute left-0 top-0 bottom-0 w-[4px] rounded-l-[12px] bg-ios-green" />
                <div className="pl-2">
                  <div className="text-[28px] font-bold tabular-nums text-ios-label">
                    {kpis.fleetSize}
                  </div>
                  <div className="text-[13px] text-ios-label-secondary mt-0.5">
                    aircraft in fleet
                  </div>
                </div>
              </div>

              {/* AOG Aircraft */}
              <div className="ios-card relative overflow-hidden">
                <div
                  className={`absolute left-0 top-0 bottom-0 w-[4px] rounded-l-[12px] ${
                    kpis.aogCount > 0 ? "bg-ios-red" : "bg-ios-green"
                  }`}
                />
                <div className="pl-2">
                  <div
                    className={`text-[28px] font-bold tabular-nums ${
                      kpis.aogCount > 0 ? "text-ios-red" : "text-ios-label"
                    }`}
                  >
                    {kpis.aogCount}
                  </div>
                  <div className="text-[13px] text-ios-label-secondary mt-0.5">
                    AOG aircraft
                  </div>
                </div>
              </div>

              {/* Availability */}
              <div className="ios-card flex items-center justify-between">
                <div>
                  <div className="text-[13px] text-ios-label-secondary">
                    Availability
                  </div>
                </div>
                <IOSProgressRing
                  value={kpis.availability}
                  size={56}
                  strokeWidth={6}
                  color={
                    kpis.availability >= 80
                      ? "var(--color-ios-green)"
                      : kpis.availability >= 50
                        ? "var(--color-ios-orange)"
                        : "var(--color-ios-red)"
                  }
                />
              </div>
            </div>
          </div>

          {/* Active Work Orders */}
          {workOrders && workOrders.length > 0 && (
            <IOSGroupedList
              sections={[
                {
                  header: "Active Work Orders",
                  items: (workOrders as WorkOrderRow[]).slice(0, 5).map((wo) => {
                    const reg =
                      wo.aircraftRegistration ??
                      wo.aircraft?.currentRegistration ??
                      "Unassigned";
                    const desc =
                      wo.description.length > 44
                        ? wo.description.slice(0, 44) + "..."
                        : wo.description;
                    return (
                      <IOSListRow
                        key={wo._id}
                        title={reg}
                        subtitle={desc}
                        detail={<IOSStatusBadge status={wo.status} />}
                        href={`/work-orders/${wo._id}`}
                        accessory="disclosure"
                      />
                    );
                  }),
                },
              ]}
            />
          )}

          {/* Quick Actions */}
          <IOSGroupedList
            sections={[
              {
                header: "Quick Actions",
                items: [
                  <IOSListRow
                    key="new-wo"
                    title="New Work Order"
                    icon={<Plus className="w-[14px] h-[14px]" />}
                    iconBg="bg-ios-blue"
                    href="/work-orders"
                    accessory="disclosure"
                  />,
                  <IOSListRow
                    key="view-fleet"
                    title="View Fleet"
                    icon={<PlaneTakeoff className="w-[14px] h-[14px]" />}
                    iconBg="bg-ios-green"
                    href="/fleet"
                    accessory="disclosure"
                  />,
                  <IOSListRow
                    key="parts"
                    title="Parts Inventory"
                    icon={<Package className="w-[14px] h-[14px]" />}
                    iconBg="bg-ios-orange"
                    href="/more/parts"
                    accessory="disclosure"
                  />,
                  <IOSListRow
                    key="compliance"
                    title="Compliance Check"
                    icon={<ShieldCheck className="w-[14px] h-[14px]" />}
                    iconBg="bg-ios-purple"
                    href="/more/compliance"
                    accessory="disclosure"
                  />,
                ],
              },
            ]}
          />
        </div>
      )}
    </div>
  );
}
