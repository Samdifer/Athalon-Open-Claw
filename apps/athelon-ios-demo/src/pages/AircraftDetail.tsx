import { useState, useMemo } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "../../../athelon-app/convex/_generated/api";
import { useCurrentOrg } from "../providers/OrgContextProvider";
import { IOSNavBar } from "@/components/ios/IOSNavBar";
import { IOSSegmentedControl } from "@/components/ios/IOSSegmentedControl";
import { IOSGroupedList } from "@/components/ios/IOSGroupedList";
import { IOSListRow } from "@/components/ios/IOSListRow";
import { IOSStatusBadge } from "@/components/ios/IOSStatusBadge";
import { IOSProgressRing } from "@/components/ios/IOSProgressRing";
import { IOSEmptyState } from "@/components/ios/IOSEmptyState";
import { IOSLoadingSpinner } from "@/components/ios/IOSLoadingSpinner";
import {
  Plane,
  Shield,
  Clock,
  BookOpen,
  FileText,
  Wrench,
  ClipboardCheck,
} from "lucide-react";

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
  serialNumber: string;
  status: string;
  totalTimeAirframeHours: number;
  totalLandingCycles?: number;
  cycles?: number;
  yearOfManufacture?: number;
  aircraftCategory: string;
  engineCount: number;
  maxGrossWeightLbs?: number;
  baseLocation?: string;
  ownerName?: string;
  operatingRegulation?: string;
  experimental: boolean;
  hobbsReading?: number;
  openWorkOrderCount: number;
}

// ---------------------------------------------------------------------------
// Demo data — AD Compliance
// ---------------------------------------------------------------------------

const mockADs = [
  {
    id: "1",
    number: "AD 2024-15-06",
    title: "Fuel tank inspection for cracks",
    method: "Repetitive inspection every 500 hours or 12 calendar months",
    status: "compliant",
  },
  {
    id: "2",
    number: "AD 2024-15-09",
    title: "Wing spar carry-through inspection",
    method: "One-time ultrasonic inspection within 1,000 hours TIS",
    status: "compliant",
  },
  {
    id: "3",
    number: "AD 2023-22-04",
    title: "Fuel selector valve replacement",
    method: "One-time replacement with improved part",
    status: "compliant",
  },
  {
    id: "4",
    number: "AD 2024-08-11",
    title: "Landing gear actuator bolt inspection",
    method: "Inspection within 100 hours TIS and every 500 hours thereafter",
    status: "deferred",
  },
  {
    id: "5",
    number: "AD 2023-05-02",
    title: "Exhaust system cracking inspection",
    method: "Repetitive inspection every 100 hours",
    status: "compliant",
  },
  {
    id: "6",
    number: "AD 2024-19-07",
    title: "Seat track engagement and locking",
    method: "One-time inspection and corrective action as needed",
    status: "compliant",
  },
  {
    id: "7",
    number: "AD 2023-11-15",
    title: "Propeller blade root fatigue crack inspection",
    method: "Repetitive eddy current inspection every 200 hours",
    status: "non_compliant",
  },
  {
    id: "8",
    number: "AD 2024-03-22",
    title: "Stabilizer trim actuator inspection",
    method: "Inspection at next annual or 12 calendar months",
    status: "compliant",
  },
];

// ---------------------------------------------------------------------------
// Demo data — Deferred maintenance
// ---------------------------------------------------------------------------

const mockDeferredItems = [
  {
    id: "1",
    title: "Landing gear actuator bolt inspection",
    date: "Feb 12, 2026",
    priority: "high" as const,
  },
  {
    id: "2",
    title: "Avionics cooling fan replacement",
    date: "Jan 28, 2026",
    priority: "medium" as const,
  },
  {
    id: "3",
    title: "Cabin door seal replacement",
    date: "Dec 15, 2025",
    priority: "low" as const,
  },
  {
    id: "4",
    title: "ELT antenna cable reroute",
    date: "Nov 03, 2025",
    priority: "medium" as const,
  },
  {
    id: "5",
    title: "Inoperative #2 NAV light (INOP placard applied)",
    date: "Mar 01, 2026",
    priority: "low" as const,
  },
];

// ---------------------------------------------------------------------------
// Demo data — Logbook entries
// ---------------------------------------------------------------------------

const mockLogbook = [
  {
    id: "1",
    type: "Annual Inspection",
    description:
      "Completed annual inspection per 14 CFR 43 Appendix D. Aircraft returned to service.",
    date: "Nov 15, 2025",
    category: "inspection" as const,
  },
  {
    id: "2",
    type: "Oil Change",
    description:
      "Engine oil and filter change -- Phillips 20W-50. Oil analysis sample sent to Blackstone Labs.",
    date: "Oct 28, 2025",
    category: "maintenance" as const,
  },
  {
    id: "3",
    type: "Nose Wheel Tire Replacement",
    description: "Replaced nose wheel tire and tube. Goodyear Flight Custom III 5.00-5 6PLY.",
    date: "Oct 15, 2025",
    category: "maintenance" as const,
  },
  {
    id: "4",
    type: "100-Hour Inspection",
    description: "100-hour inspection completed per 14 CFR 43 Appendix D. No discrepancies found.",
    date: "Aug 22, 2025",
    category: "inspection" as const,
  },
  {
    id: "5",
    type: "Cross-Country Flight",
    description: "Repositioning flight KAPA to KDEN. 0.8 hours Hobbs. No squawks.",
    date: "Aug 10, 2025",
    category: "flight" as const,
  },
  {
    id: "6",
    type: "ELT Battery Replacement",
    description:
      "Replaced ELT battery (Artex 452-6499). Antenna connection inspected and tested. Op-check satisfactory.",
    date: "Jul 10, 2025",
    category: "maintenance" as const,
  },
  {
    id: "7",
    type: "Oil Change",
    description:
      "Engine oil and filter change -- Phillips 20W-50. Oil analysis within normal limits.",
    date: "Jun 02, 2025",
    category: "maintenance" as const,
  },
  {
    id: "8",
    type: "Prop Overhaul",
    description:
      "McCauley propeller removed and sent to Sensenich for overhaul. Reinstalled with new gaskets.",
    date: "May 18, 2025",
    category: "maintenance" as const,
  },
  {
    id: "9",
    type: "Ferry Flight",
    description: "Ferry flight KBJC to KAPA after avionics install. 0.3 hours Hobbs.",
    date: "Apr 25, 2025",
    category: "flight" as const,
  },
  {
    id: "10",
    type: "Transponder Check",
    description:
      "Transponder and altitude encoder check per 14 CFR 91.413. All tests within tolerance.",
    date: "Mar 15, 2025",
    category: "inspection" as const,
  },
];

// ---------------------------------------------------------------------------
// Tabs
// ---------------------------------------------------------------------------

type Tab = "overview" | "ad_compliance" | "deferred" | "logbook";

const tabSegments: Array<{ label: string; value: Tab }> = [
  { label: "Overview", value: "overview" },
  { label: "AD Compliance", value: "ad_compliance" },
  { label: "Deferred", value: "deferred" },
  { label: "Logbook", value: "logbook" },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

function formatNumber(n: number | undefined | null): string {
  if (n === undefined || n === null) return "--";
  return n.toLocaleString();
}

function formatCategory(cat: string): string {
  return cat
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function priorityColor(priority: "high" | "medium" | "low"): string {
  switch (priority) {
    case "high":
      return "bg-red-50 text-ios-red";
    case "medium":
      return "bg-orange-50 text-ios-orange";
    case "low":
      return "bg-blue-50 text-ios-blue";
  }
}

function priorityLabel(priority: "high" | "medium" | "low"): string {
  return priority.charAt(0).toUpperCase() + priority.slice(1);
}

function logbookIcon(category: "inspection" | "maintenance" | "flight") {
  switch (category) {
    case "inspection":
      return <ClipboardCheck className="w-[17px] h-[17px]" />;
    case "maintenance":
      return <Wrench className="w-[17px] h-[17px]" />;
    case "flight":
      return <Plane className="w-[17px] h-[17px]" />;
  }
}

function logbookIconBg(category: "inspection" | "maintenance" | "flight"): string {
  switch (category) {
    case "inspection":
      return "bg-green-100";
    case "maintenance":
      return "bg-orange-100";
    case "flight":
      return "bg-blue-100";
  }
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function AircraftDetail() {
  const { tail } = useParams<{ tail: string }>();
  const { orgId, isLoaded } = useCurrentOrg();
  const [tab, setTab] = useState<Tab>("overview");

  // Fetch aircraft list and find by tail number
  const aircraftList = useQuery(
    api.aircraft.list,
    isLoaded && orgId ? { organizationId: orgId } : "skip",
  );

  const loading = aircraftList === undefined;

  const aircraft = useMemo(() => {
    if (!aircraftList || !tail) return null;
    const decodedTail = decodeURIComponent(tail);
    return (
      (aircraftList as AircraftRow[]).find(
        (ac) =>
          ac.currentRegistration === decodedTail ||
          ac.tailNumber === decodedTail,
      ) ?? null
    );
  }, [aircraftList, tail]);

  // Loading state
  if (loading) {
    return (
      <div>
        <IOSNavBar
          title="Loading..."
          backHref="/fleet"
          backLabel="Fleet"
          largeTitle={false}
        />
        <IOSLoadingSpinner />
      </div>
    );
  }

  // Not found
  if (!aircraft) {
    return (
      <div>
        <IOSNavBar
          title={tail ? decodeURIComponent(tail) : "Unknown"}
          backHref="/fleet"
          backLabel="Fleet"
          largeTitle={false}
        />
        <IOSEmptyState
          icon={<Plane className="w-[48px] h-[48px]" />}
          title="Aircraft Not Found"
          subtitle="This aircraft may have been removed or is not in your fleet."
        />
      </div>
    );
  }

  const tailNumber = getDisplayName(aircraft);
  const displayMakeModel = getMakeModel(aircraft);
  const totalTime = formatNumber(aircraft.totalTimeAirframeHours);
  const cycles = formatNumber(aircraft.totalLandingCycles ?? aircraft.cycles);
  const nextInspectionDate = "Jun 15, 2026";

  return (
    <div>
      {/* Nav Bar */}
      <IOSNavBar
        title={tailNumber}
        backHref="/fleet"
        backLabel="Fleet"
        largeTitle={false}
      />

      {/* Hero Card */}
      <div className="px-4 pt-2 pb-1">
        <div className="ios-card">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-[28px] font-bold leading-[34px] text-ios-label">
                {tailNumber}
              </div>
              <div className="text-[17px] text-ios-label-secondary mt-0.5">
                {aircraft.type
                  ? `${aircraft.type} / ${displayMakeModel}`
                  : displayMakeModel}
              </div>
            </div>
            <IOSStatusBadge status={aircraft.status} />
          </div>

          {/* Divider */}
          <div className="h-[0.5px] bg-ios-separator my-3" />

          {/* 3-column stats */}
          <div className="flex items-center justify-between">
            <div className="flex flex-col items-center flex-1">
              <div className="text-[20px] font-semibold text-ios-label">
                {totalTime}
              </div>
              <div className="text-[12px] text-ios-label-secondary">
                Total Time (hrs)
              </div>
            </div>
            <div className="w-[0.5px] h-[36px] bg-ios-separator" />
            <div className="flex flex-col items-center flex-1">
              <div className="text-[20px] font-semibold text-ios-label">
                {cycles}
              </div>
              <div className="text-[12px] text-ios-label-secondary">
                Cycles
              </div>
            </div>
            <div className="w-[0.5px] h-[36px] bg-ios-separator" />
            <div className="flex flex-col items-center flex-1">
              <div className="text-[20px] font-semibold text-ios-label">
                {nextInspectionDate}
              </div>
              <div className="text-[12px] text-ios-label-secondary">
                Next Inspection
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Selector */}
      <div className="px-4 py-2">
        <IOSSegmentedControl
          segments={tabSegments}
          selected={tab}
          onChange={(val) => setTab(val as Tab)}
        />
      </div>

      {/* Tab Content */}
      <div className="pb-6">
        {tab === "overview" && <OverviewTab aircraft={aircraft} />}
        {tab === "ad_compliance" && <ADComplianceTab />}
        {tab === "deferred" && <DeferredTab />}
        {tab === "logbook" && <LogbookTab />}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Overview Tab
// ---------------------------------------------------------------------------

function OverviewTab({ aircraft }: { aircraft: AircraftRow }) {
  const tailNumber = getDisplayName(aircraft);
  const displayMakeModel = getMakeModel(aircraft);
  const mockLastInspection = "Nov 15, 2025";
  const mockNextInspectionDue = "Nov 15, 2026";
  const woCount = aircraft.openWorkOrderCount ?? 0;

  return (
    <IOSGroupedList
      sections={[
        {
          header: "Aircraft Information",
          items: [
            <IOSListRow
              key="registration"
              title="Registration"
              detail={tailNumber}
              accessory={undefined}
            />,
            <IOSListRow
              key="make-model"
              title="Make / Model"
              detail={displayMakeModel}
              accessory={undefined}
            />,
            <IOSListRow
              key="serial"
              title="Serial Number"
              detail={aircraft.serialNumber}
              accessory={undefined}
            />,
            <IOSListRow
              key="year"
              title="Year"
              detail={aircraft.yearOfManufacture?.toString() ?? "N/A"}
              accessory={undefined}
            />,
            <IOSListRow
              key="type"
              title="Type"
              detail={
                aircraft.type
                  ? formatCategory(aircraft.type)
                  : formatCategory(aircraft.aircraftCategory)
              }
              accessory={undefined}
            />,
          ],
        },
        {
          header: "Maintenance Status",
          items: [
            <IOSListRow
              key="status"
              title="Status"
              detail={<IOSStatusBadge status={aircraft.status} />}
              accessory={undefined}
            />,
            <IOSListRow
              key="total-time"
              title="Total Time"
              detail={`${formatNumber(aircraft.totalTimeAirframeHours)} hrs`}
              accessory={undefined}
            />,
            <IOSListRow
              key="cycles"
              title="Cycles"
              detail={formatNumber(aircraft.totalLandingCycles ?? aircraft.cycles)}
              accessory={undefined}
            />,
            <IOSListRow
              key="last-inspection"
              title="Last Inspection"
              detail={mockLastInspection}
              accessory={undefined}
            />,
            <IOSListRow
              key="next-inspection"
              title="Next Inspection Due"
              detail={mockNextInspectionDue}
              accessory={undefined}
            />,
          ],
        },
        {
          header: "Current Work",
          items: [
            <IOSListRow
              key="open-wo"
              title="Open Work Orders"
              detail={
                woCount > 0 ? (
                  <span className="inline-flex items-center justify-center min-w-[20px] h-[20px] px-1.5 rounded-full bg-ios-red text-white text-[12px] font-semibold">
                    {woCount}
                  </span>
                ) : (
                  <span className="text-ios-label-tertiary">None</span>
                )
              }
              accessory="disclosure"
              href="/work-orders"
              icon={<FileText className="w-[17px] h-[17px]" />}
              iconBg="bg-ios-blue"
            />,
          ],
        },
      ]}
    />
  );
}

// ---------------------------------------------------------------------------
// AD Compliance Tab
// ---------------------------------------------------------------------------

function ADComplianceTab() {
  const compliantCount = mockADs.filter((ad) => ad.status === "compliant").length;
  const totalCount = mockADs.length;
  const compliancePercentage = Math.round((compliantCount / totalCount) * 100);

  return (
    <div>
      {/* Summary card with progress ring */}
      <div className="px-4 py-3">
        <div className="ios-card flex items-center gap-4">
          <IOSProgressRing
            value={compliancePercentage}
            size={72}
            strokeWidth={7}
            color={
              compliancePercentage === 100
                ? "var(--color-ios-green)"
                : compliancePercentage >= 80
                  ? "var(--color-ios-orange)"
                  : "var(--color-ios-red)"
            }
            label="Compliant"
          />
          <div className="flex-1">
            <div className="text-[20px] font-semibold text-ios-label">
              {compliantCount} of {totalCount}
            </div>
            <div className="text-[15px] text-ios-label-secondary">
              Airworthiness Directives compliant
            </div>
          </div>
        </div>
      </div>

      <IOSGroupedList
        sections={[
          {
            header: "Airworthiness Directives",
            items: mockADs.map((ad) => (
              <IOSListRow
                key={ad.id}
                title={ad.number}
                subtitle={`${ad.title} -- ${ad.method}`}
                icon={<Shield className="w-[17px] h-[17px]" />}
                iconBg={
                  ad.status === "compliant"
                    ? "bg-green-100"
                    : ad.status === "non_compliant"
                      ? "bg-red-100"
                      : "bg-yellow-100"
                }
                detail={<IOSStatusBadge status={ad.status} />}
                accessory="disclosure"
              />
            )),
          },
        ]}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Deferred Maintenance Tab
// ---------------------------------------------------------------------------

function DeferredTab() {
  if (mockDeferredItems.length === 0) {
    return (
      <IOSEmptyState
        icon={<Clock className="w-[48px] h-[48px]" />}
        title="No Deferred Items"
        subtitle="All maintenance items are current. No deferrals on record."
      />
    );
  }

  return (
    <IOSGroupedList
      sections={[
        {
          header: "Deferred Items",
          footer:
            "Deferred items must be resolved before the next scheduled inspection or within the MEL-specified timeframe.",
          items: mockDeferredItems.map((item) => (
            <IOSListRow
              key={item.id}
              title={item.title}
              subtitle={`Deferred since ${item.date}`}
              icon={<Clock className="w-[17px] h-[17px]" />}
              iconBg="bg-orange-100"
              detail={
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-[12px] font-medium ${priorityColor(item.priority)}`}
                >
                  {priorityLabel(item.priority)}
                </span>
              }
              accessory="disclosure"
            />
          )),
        },
      ]}
    />
  );
}

// ---------------------------------------------------------------------------
// Logbook Tab
// ---------------------------------------------------------------------------

function LogbookTab() {
  if (mockLogbook.length === 0) {
    return (
      <IOSEmptyState
        icon={<BookOpen className="w-[48px] h-[48px]" />}
        title="No Logbook Entries"
        subtitle="No maintenance logbook entries have been recorded."
      />
    );
  }

  return (
    <IOSGroupedList
      sections={[
        {
          header: "Recent Entries",
          items: mockLogbook.map((entry) => (
            <IOSListRow
              key={entry.id}
              title={entry.type}
              subtitle={entry.description}
              icon={logbookIcon(entry.category)}
              iconBg={logbookIconBg(entry.category)}
              detail={
                <span className="text-[13px] text-ios-label-secondary whitespace-nowrap">
                  {entry.date}
                </span>
              }
              accessory="disclosure"
            />
          )),
        },
      ]}
    />
  );
}
