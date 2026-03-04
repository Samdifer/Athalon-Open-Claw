import { useState, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../athelon-app/convex/_generated/api";
import { useCurrentOrg } from "../providers/OrgContextProvider";
import { IOSNavBar } from "@/components/ios/IOSNavBar";
import { IOSSearchBar } from "@/components/ios/IOSSearchBar";
import { IOSGroupedList } from "@/components/ios/IOSGroupedList";
import { IOSListRow } from "@/components/ios/IOSListRow";
import { IOSEmptyState } from "@/components/ios/IOSEmptyState";
import { IOSLoadingSpinner } from "@/components/ios/IOSLoadingSpinner";
import { Plane, Plus } from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AircraftRow {
  _id: string;
  currentRegistration?: string;
  tailNumber?: string;
  make: string;
  model: string;
  series?: string;
  type?: string;
  makeModel?: string;
  status: string;
  totalTimeAirframeHours: number;
  totalLandingCycles?: number;
  openWorkOrderCount: number;
  baseLocation?: string;
}

// ---------------------------------------------------------------------------
// Status grouping helpers
// ---------------------------------------------------------------------------

type FleetGroup = "aog" | "in_maintenance" | "airworthy" | "out_of_service";

const GROUP_ORDER: FleetGroup[] = [
  "aog",
  "in_maintenance",
  "airworthy",
  "out_of_service",
];

const GROUP_LABELS: Record<FleetGroup, string> = {
  aog: "AOG",
  in_maintenance: "In Maintenance",
  airworthy: "Airworthy",
  out_of_service: "Out of Service",
};

function classifyAircraft(ac: AircraftRow): FleetGroup {
  const s = ac.status?.toLowerCase();
  if (s === "aog") return "aog";
  if (s === "out_of_service") return "out_of_service";
  if (s === "in_maintenance") return "in_maintenance";
  return "airworthy";
}

function statusIconBg(group: FleetGroup): string {
  switch (group) {
    case "airworthy":
      return "bg-ios-green";
    case "in_maintenance":
      return "bg-ios-blue";
    case "aog":
      return "bg-ios-red";
    case "out_of_service":
      return "bg-ios-gray";
  }
}

function getDisplayName(ac: AircraftRow): string {
  if (ac.currentRegistration) return ac.currentRegistration;
  if (ac.tailNumber) return ac.tailNumber;
  return "No Reg";
}

function getMakeModel(ac: AircraftRow): string {
  if (ac.makeModel) return ac.makeModel;
  const parts = [ac.make, ac.model];
  if (ac.series) parts.push(ac.series);
  return parts.join(" ");
}

// ---------------------------------------------------------------------------
// Stats card component
// ---------------------------------------------------------------------------

interface StatCardProps {
  label: string;
  value: number;
  color: string;
  bold?: boolean;
}

function StatCard({ label, value, color, bold }: StatCardProps) {
  return (
    <div className="ios-card min-w-[100px] flex-shrink-0 flex flex-col items-center justify-center py-3 px-3">
      <div
        className={`text-[28px] leading-[34px] ${color} ${bold ? "font-black" : "font-bold"}`}
      >
        {value}
      </div>
      <div className="text-[12px] font-medium text-ios-label-secondary mt-0.5 text-center whitespace-nowrap">
        {label}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function FleetList() {
  const { orgId, isLoaded } = useCurrentOrg();
  const [search, setSearch] = useState("");

  const aircraft = useQuery(
    api.aircraft.list,
    isLoaded && orgId ? { organizationId: orgId } : "skip",
  );

  const loading = aircraft === undefined;

  // Classify all aircraft into groups
  const { groups, filtered } = useMemo(() => {
    if (!aircraft) {
      return {
        groups: {
          aog: [] as AircraftRow[],
          in_maintenance: [] as AircraftRow[],
          airworthy: [] as AircraftRow[],
          out_of_service: [] as AircraftRow[],
        },
        filtered: false,
      };
    }

    let list = aircraft as AircraftRow[];
    let isFiltered = false;

    // Apply search filter
    if (search.trim()) {
      isFiltered = true;
      const q = search.toLowerCase();
      list = list.filter((ac) => {
        const reg = getDisplayName(ac).toLowerCase();
        const mm = getMakeModel(ac).toLowerCase();
        const tp = (ac.type ?? "").toLowerCase();
        return reg.includes(q) || mm.includes(q) || tp.includes(q);
      });
    }

    const grouped: Record<FleetGroup, AircraftRow[]> = {
      aog: [],
      in_maintenance: [],
      airworthy: [],
      out_of_service: [],
    };

    for (const ac of list) {
      const group = classifyAircraft(ac);
      grouped[group].push(ac);
    }

    return { groups: grouped, filtered: isFiltered };
  }, [aircraft, search]);

  // Stats from unfiltered data
  const stats = useMemo(() => {
    if (!aircraft) return { total: 0, airworthy: 0, inMaintenance: 0, aog: 0 };
    const all = aircraft as AircraftRow[];
    let airworthyCount = 0;
    let inMaintenanceCount = 0;
    let aogCount = 0;
    for (const ac of all) {
      const group = classifyAircraft(ac);
      if (group === "airworthy") airworthyCount++;
      else if (group === "in_maintenance") inMaintenanceCount++;
      else if (group === "aog") aogCount++;
    }
    return {
      total: all.length,
      airworthy: airworthyCount,
      inMaintenance: inMaintenanceCount,
      aog: aogCount,
    };
  }, [aircraft]);

  // Build grouped sections — only include groups that have aircraft
  const sections = useMemo(() => {
    const result: Array<{
      header: string;
      items: React.ReactNode[];
    }> = [];

    for (const groupKey of GROUP_ORDER) {
      const items = groups[groupKey];
      if (items.length === 0) continue;

      result.push({
        header: `${GROUP_LABELS[groupKey]} (${items.length})`,
        items: items.map((ac) => {
          const tailDisplay = getDisplayName(ac);
          const woCount = ac.openWorkOrderCount ?? 0;

          return (
            <IOSListRow
              key={ac._id}
              title={tailDisplay}
              subtitle={getMakeModel(ac)}
              icon={<Plane className="w-[17px] h-[17px]" />}
              iconBg={statusIconBg(groupKey)}
              detail={
                woCount > 0 ? (
                  <span className="inline-flex items-center justify-center min-w-[20px] h-[20px] px-1.5 rounded-full bg-ios-red text-white text-[12px] font-semibold">
                    {woCount}
                  </span>
                ) : ac.totalTimeAirframeHours ? (
                  <span className="text-[15px] text-ios-label-tertiary">
                    {ac.totalTimeAirframeHours.toLocaleString()} hrs
                  </span>
                ) : undefined
              }
              accessory="disclosure"
              href={`/fleet/${encodeURIComponent(tailDisplay)}`}
            />
          );
        }),
      });
    }

    return result;
  }, [groups]);

  const totalFiltered = GROUP_ORDER.reduce(
    (sum, g) => sum + groups[g].length,
    0,
  );

  return (
    <div>
      <IOSNavBar
        title="Fleet"
        largeTitle
        rightAction={
          <button className="w-[30px] h-[30px] flex items-center justify-center text-ios-blue">
            <Plus className="w-[22px] h-[22px]" strokeWidth={2} />
          </button>
        }
      >
        <IOSSearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search aircraft..."
        />
      </IOSNavBar>

      <div className="pt-2 pb-4">
        {loading && <IOSLoadingSpinner />}

        {!loading && (
          <>
            {/* Stats Banner */}
            <div className="flex gap-3 overflow-x-auto px-4 py-2">
              <StatCard
                label="Total Aircraft"
                value={stats.total}
                color="text-ios-blue"
              />
              <StatCard
                label="Airworthy"
                value={stats.airworthy}
                color="text-ios-green"
              />
              <StatCard
                label="In Maintenance"
                value={stats.inMaintenance}
                color="text-ios-blue"
              />
              <StatCard
                label="AOG"
                value={stats.aog}
                color={stats.aog > 0 ? "text-ios-red" : "text-ios-label-tertiary"}
                bold={stats.aog > 0}
              />
            </div>

            {/* Aircraft List */}
            {totalFiltered === 0 ? (
              <IOSEmptyState
                icon={<Plane className="w-[48px] h-[48px]" />}
                title={filtered ? "No Matching Aircraft" : "No Aircraft Found"}
                subtitle={
                  filtered
                    ? "No aircraft match your search criteria."
                    : "Add aircraft to your fleet to get started."
                }
              />
            ) : (
              <IOSGroupedList sections={sections} />
            )}
          </>
        )}
      </div>
    </div>
  );
}
