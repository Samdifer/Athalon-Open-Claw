import { useState, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../athelon-app/convex/_generated/api";
import { useCurrentOrg } from "@/providers/OrgContextProvider";
import { IOSNavBar } from "@/components/ios/IOSNavBar";
import { IOSSearchBar } from "@/components/ios/IOSSearchBar";
import { IOSSegmentedControl } from "@/components/ios/IOSSegmentedControl";
import { IOSGroupedList } from "@/components/ios/IOSGroupedList";
import { IOSListRow } from "@/components/ios/IOSListRow";
import { IOSStatusBadge } from "@/components/ios/IOSStatusBadge";
import { IOSEmptyState } from "@/components/ios/IOSEmptyState";
import { IOSLoadingSpinner } from "@/components/ios/IOSLoadingSpinner";
import { Plus, ClipboardList, Circle } from "lucide-react";

type Segment = "active" | "on_hold" | "pending" | "complete" | "all";

const segments: Array<{ label: string; value: Segment }> = [
  { label: "Active", value: "active" },
  { label: "On Hold", value: "on_hold" },
  { label: "Pending", value: "pending" },
  { label: "Complete", value: "complete" },
  { label: "All", value: "all" },
];

/** Status-to-segment mapping per spec. */
const statusSegmentMap: Record<string, Segment> = {
  open: "active",
  in_progress: "active",
  on_hold: "on_hold",
  pending_inspection: "pending",
  pending_signoff: "pending",
  closed: "complete",
};

function statusToSegment(status: string): Segment {
  return statusSegmentMap[status] ?? "active";
}

/** Status-based icon color configuration. */
function getStatusIconStyle(status: string): {
  iconColor: string;
  iconBg: string;
} {
  const seg = statusToSegment(status);
  switch (seg) {
    case "active":
      return { iconColor: "text-ios-blue", iconBg: "bg-blue-50" };
    case "on_hold":
      return { iconColor: "text-ios-orange", iconBg: "bg-orange-50" };
    case "pending":
      return { iconColor: "text-ios-purple", iconBg: "bg-purple-50" };
    case "complete":
      return { iconColor: "text-ios-green", iconBg: "bg-green-50" };
    default:
      return { iconColor: "text-ios-gray", iconBg: "bg-ios-gray5" };
  }
}

/** Truncate a string to a max length, adding ellipsis if needed. */
function truncate(str: string, max: number): string {
  if (!str) return "";
  return str.length > max ? str.slice(0, max) + "..." : str;
}

interface WorkOrderRow {
  _id: string;
  workOrderNumber?: string;
  aircraftRegistration?: string;
  status: string;
  description: string;
  openedAt?: number;
  aircraft?: {
    currentRegistration?: string;
    make?: string;
    model?: string;
  } | null;
}

export default function WorkOrdersList() {
  const { orgId, isLoaded } = useCurrentOrg();
  const [search, setSearch] = useState("");
  const [segment, setSegment] = useState<Segment>("active");

  const workOrders = useQuery(
    api.workOrders.listActive,
    isLoaded && orgId ? { organizationId: orgId, limit: 50 } : "skip",
  );

  const loading = workOrders === undefined;

  const filtered = useMemo(() => {
    if (!workOrders) return [];

    let list = workOrders as WorkOrderRow[];

    // Filter by segment
    if (segment !== "all") {
      list = list.filter((wo) => statusToSegment(wo.status) === segment);
    }

    // Filter by search text (aircraftRegistration, description, workOrderNumber)
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((wo) => {
        const reg = (
          wo.aircraftRegistration ??
          wo.aircraft?.currentRegistration ??
          ""
        ).toLowerCase();
        const desc = (wo.description ?? "").toLowerCase();
        const num = (wo.workOrderNumber ?? "").toLowerCase();
        return reg.includes(q) || desc.includes(q) || num.includes(q);
      });
    }

    return list;
  }, [workOrders, segment, search]);

  return (
    <div>
      <IOSNavBar
        title="Work Orders"
        largeTitle
        rightAction={
          <button className="w-[30px] h-[30px] flex items-center justify-center text-ios-blue">
            <Plus className="w-[22px] h-[22px]" strokeWidth={2} />
          </button>
        }
      >
        <div className="space-y-2">
          <IOSSearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search work orders..."
          />
          <IOSSegmentedControl
            segments={segments}
            selected={segment}
            onChange={(val) => setSegment(val as Segment)}
          />
        </div>
      </IOSNavBar>

      <div className="pt-2 pb-4">
        {loading && <IOSLoadingSpinner />}

        {!loading && filtered.length === 0 && (
          <IOSEmptyState
            icon={<ClipboardList className="w-[48px] h-[48px]" />}
            title="No Work Orders"
            subtitle={
              segment === "all"
                ? "No work orders match your search."
                : `No ${segments.find((s) => s.value === segment)?.label.toLowerCase()} work orders found.`
            }
          />
        )}

        {!loading && filtered.length > 0 && (
          <IOSGroupedList
            sections={[
              {
                header: `${filtered.length} Work Order${filtered.length !== 1 ? "s" : ""}`,
                items: filtered.map((wo) => {
                  const style = getStatusIconStyle(wo.status);
                  const reg =
                    wo.aircraftRegistration ??
                    wo.aircraft?.currentRegistration ??
                    "Unassigned";
                  const woNum =
                    wo.workOrderNumber ?? wo._id.slice(-6);

                  return (
                    <IOSListRow
                      key={wo._id}
                      title={`${reg} \u2014 WO-${woNum}`}
                      subtitle={truncate(wo.description, 60)}
                      icon={
                        <Circle
                          className={`w-[14px] h-[14px] ${style.iconColor}`}
                          fill="currentColor"
                          strokeWidth={0}
                        />
                      }
                      iconBg={style.iconBg}
                      detail={<IOSStatusBadge status={wo.status} />}
                      accessory="disclosure"
                      href={`/work-orders/${wo._id}`}
                    />
                  );
                }),
              },
            ]}
          />
        )}
      </div>
    </div>
  );
}
