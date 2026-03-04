import { IOSNavBar } from "@/components/ios/IOSNavBar";
import { IOSGroupedList } from "@/components/ios/IOSGroupedList";
import { IOSListRow } from "@/components/ios/IOSListRow";
import { IOSStatusBadge } from "@/components/ios/IOSStatusBadge";
import {
  Plane,
  ClipboardList,
  FileText,
  CreditCard,
  CheckCircle2,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Demo data
// ---------------------------------------------------------------------------

interface PortalAircraft {
  id: string;
  tail: string;
  type: string;
  status: string;
}

const customerAircraft: PortalAircraft[] = [
  { id: "pa-1", tail: "N12345", type: "Cessna 172S Skyhawk", status: "in_maintenance" },
  { id: "pa-2", tail: "N67890", type: "Piper PA-28-181 Archer", status: "airworthy" },
  { id: "pa-3", tail: "N54321", type: "Beechcraft A36 Bonanza", status: "airworthy" },
];

interface ActivityEntry {
  id: string;
  title: string;
  subtitle: string;
  date: string;
  type: "wo" | "quote" | "invoice" | "inspection";
}

const recentActivity: ActivityEntry[] = [
  {
    id: "act-1",
    title: "Work Order Opened",
    subtitle: "N12345 \u2014 Annual Inspection",
    date: "Mar 1",
    type: "wo",
  },
  {
    id: "act-2",
    title: "Quote Received",
    subtitle: "N67890 \u2014 Prop Overhaul Estimate",
    date: "Feb 28",
    type: "quote",
  },
  {
    id: "act-3",
    title: "Invoice Paid",
    subtitle: "INV-2024-0412 \u2014 $2,850.00",
    date: "Feb 25",
    type: "invoice",
  },
  {
    id: "act-4",
    title: "Inspection Complete",
    subtitle: "N54321 \u2014 100-Hour Inspection signed off",
    date: "Feb 22",
    type: "inspection",
  },
];

function activityIcon(type: ActivityEntry["type"]) {
  switch (type) {
    case "wo":
      return <ClipboardList className="w-[17px] h-[17px]" />;
    case "quote":
      return <FileText className="w-[17px] h-[17px]" />;
    case "invoice":
      return <CreditCard className="w-[17px] h-[17px]" />;
    case "inspection":
      return <CheckCircle2 className="w-[17px] h-[17px]" />;
  }
}

function activityIconBg(type: ActivityEntry["type"]): string {
  switch (type) {
    case "wo":
      return "bg-ios-blue";
    case "quote":
      return "bg-ios-purple";
    case "invoice":
      return "bg-ios-green";
    case "inspection":
      return "bg-ios-teal";
  }
}

// ---------------------------------------------------------------------------
// CustomerPortal Page
// ---------------------------------------------------------------------------

export default function CustomerPortal() {
  return (
    <div>
      <IOSNavBar title="Customer Portal" backHref="/more" backLabel="More" />

      <div className="pb-6 space-y-1">
        {/* Welcome Card */}
        <div className="px-4 pt-2 pb-1">
          <div className="ios-card">
            <div className="text-[20px] font-semibold text-ios-label leading-[25px]">
              Welcome to Athalon
            </div>
            <div className="text-[15px] text-ios-label-secondary leading-[20px] mt-1">
              Track your aircraft maintenance in real-time
            </div>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="px-4 pb-1">
          <div className="grid grid-cols-2 gap-3">
            <div className="ios-card flex flex-col items-center py-3">
              <div className="text-[28px] font-bold tabular-nums text-ios-blue">
                2
              </div>
              <div className="text-[11px] font-medium text-ios-label-secondary mt-0.5 text-center">
                Active Work Orders
              </div>
            </div>
            <div className="ios-card flex flex-col items-center py-3">
              <div className="text-[28px] font-bold tabular-nums text-ios-purple">
                1
              </div>
              <div className="text-[11px] font-medium text-ios-label-secondary mt-0.5 text-center">
                Pending Quotes
              </div>
            </div>
            <div className="ios-card flex flex-col items-center py-3">
              <div className="text-[28px] font-bold tabular-nums text-ios-orange">
                $4,200
              </div>
              <div className="text-[11px] font-medium text-ios-label-secondary mt-0.5 text-center">
                Outstanding Invoices
              </div>
            </div>
            <div className="ios-card flex flex-col items-center py-3">
              <div className="text-[28px] font-bold tabular-nums text-ios-green">
                3
              </div>
              <div className="text-[11px] font-medium text-ios-label-secondary mt-0.5 text-center">
                Fleet
              </div>
            </div>
          </div>
        </div>

        {/* Your Aircraft */}
        <IOSGroupedList
          sections={[
            {
              header: "Your Aircraft",
              items: customerAircraft.map((ac) => (
                <IOSListRow
                  key={ac.id}
                  title={ac.tail}
                  subtitle={ac.type}
                  icon={<Plane className="w-[17px] h-[17px]" />}
                  iconBg={
                    ac.status === "airworthy" ? "bg-ios-green" : "bg-ios-orange"
                  }
                  detail={<IOSStatusBadge status={ac.status} />}
                  accessory="disclosure"
                />
              )),
            },
          ]}
        />

        {/* Recent Activity */}
        <IOSGroupedList
          sections={[
            {
              header: "Recent Activity",
              items: recentActivity.map((entry) => (
                <IOSListRow
                  key={entry.id}
                  title={entry.title}
                  subtitle={entry.subtitle}
                  detail={entry.date}
                  icon={activityIcon(entry.type)}
                  iconBg={activityIconBg(entry.type)}
                  accessory="disclosure"
                />
              )),
            },
          ]}
        />
      </div>
    </div>
  );
}
