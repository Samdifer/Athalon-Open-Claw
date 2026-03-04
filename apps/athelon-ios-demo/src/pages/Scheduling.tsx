import { IOSNavBar } from "@/components/ios/IOSNavBar";
import { IOSGroupedList } from "@/components/ios/IOSGroupedList";
import { IOSListRow } from "@/components/ios/IOSListRow";
import {
  Calendar,
  Users,
  BarChart3,
  Warehouse,
  FileSpreadsheet,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Demo data
// ---------------------------------------------------------------------------

interface WeekDay {
  day: string;
  date: string;
  aircraft: number;
  description: string;
  isToday: boolean;
}

const thisWeek: WeekDay[] = [
  { day: "Mon", date: "Mar 3", aircraft: 3, description: "Annual inspections, oil changes", isToday: true },
  { day: "Tue", date: "Mar 4", aircraft: 2, description: "AD compliance, prop overhaul", isToday: false },
  { day: "Wed", date: "Mar 5", aircraft: 4, description: "Avionics install, gear service", isToday: false },
  { day: "Thu", date: "Mar 6", aircraft: 2, description: "Engine teardown, paint touch-up", isToday: false },
  { day: "Fri", date: "Mar 7", aircraft: 1, description: "RTS flight test, final signoffs", isToday: false },
];

interface ScheduledItem {
  id: string;
  aircraft: string;
  workType: string;
  customer: string;
  date: string;
  urgency: "high" | "medium" | "low";
}

const upcomingWork: ScheduledItem[] = [
  {
    id: "s-1",
    aircraft: "N12345",
    workType: "Annual Inspection",
    customer: "Blue Sky Aviation",
    date: "Mar 3",
    urgency: "high",
  },
  {
    id: "s-2",
    aircraft: "N67890",
    workType: "AD 2024-15-06 Compliance",
    customer: "Mountain Air Charter",
    date: "Mar 3",
    urgency: "high",
  },
  {
    id: "s-3",
    aircraft: "N54321",
    workType: "100-Hour Inspection",
    customer: "Valley Flight Training",
    date: "Mar 4",
    urgency: "medium",
  },
  {
    id: "s-4",
    aircraft: "N98765",
    workType: "Prop Overhaul",
    customer: "Summit Air Tours",
    date: "Mar 4",
    urgency: "medium",
  },
  {
    id: "s-5",
    aircraft: "N11223",
    workType: "Avionics Upgrade (G5)",
    customer: "Ridgeline Holdings",
    date: "Mar 5",
    urgency: "low",
  },
  {
    id: "s-6",
    aircraft: "N33445",
    workType: "Landing Gear Service",
    customer: "Alpine Freight LLC",
    date: "Mar 5",
    urgency: "medium",
  },
  {
    id: "s-7",
    aircraft: "N55667",
    workType: "Engine Teardown & Inspection",
    customer: "Cascade Charters",
    date: "Mar 6",
    urgency: "high",
  },
  {
    id: "s-8",
    aircraft: "N77889",
    workType: "Return to Service Flight Test",
    customer: "Blue Sky Aviation",
    date: "Mar 7",
    urgency: "low",
  },
];

function urgencyIconBg(urgency: ScheduledItem["urgency"]): string {
  switch (urgency) {
    case "high":
      return "bg-ios-red";
    case "medium":
      return "bg-ios-orange";
    case "low":
      return "bg-ios-blue";
  }
}

// ---------------------------------------------------------------------------
// Scheduling Page
// ---------------------------------------------------------------------------

export default function Scheduling() {
  return (
    <div>
      <IOSNavBar title="Schedule" backHref="/more" backLabel="More" />

      <div className="pb-6 space-y-1">
        {/* This Week Summary */}
        <div className="px-4 pt-2 pb-1">
          <div className="ios-card">
            <div className="text-[15px] font-semibold text-ios-label mb-3">
              This Week
            </div>
            <div className="space-y-2.5">
              {thisWeek.map((day) => (
                <div
                  key={day.day}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-[10px] ${
                    day.isToday ? "bg-ios-blue/10" : ""
                  }`}
                >
                  <div className="flex flex-col items-center w-[40px] flex-shrink-0">
                    <span
                      className={`text-[11px] font-semibold uppercase ${
                        day.isToday ? "text-ios-blue" : "text-ios-label-secondary"
                      }`}
                    >
                      {day.day}
                    </span>
                    <span
                      className={`text-[17px] font-bold ${
                        day.isToday ? "text-ios-blue" : "text-ios-label"
                      }`}
                    >
                      {day.date.split(" ")[1]}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[15px] text-ios-label leading-[20px]">
                      {day.aircraft} aircraft
                    </div>
                    <div className="text-[13px] text-ios-label-secondary leading-[18px] truncate">
                      {day.description}
                    </div>
                  </div>
                  {day.isToday && (
                    <span className="text-[11px] font-semibold text-ios-blue px-2 py-0.5 bg-ios-blue/10 rounded-full">
                      Today
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Upcoming Work */}
        <IOSGroupedList
          sections={[
            {
              header: "Upcoming Work",
              items: upcomingWork.map((item) => (
                <IOSListRow
                  key={item.id}
                  title={`${item.aircraft} \u2014 ${item.workType}`}
                  subtitle={item.customer}
                  detail={item.date}
                  icon={<Calendar className="w-[17px] h-[17px]" />}
                  iconBg={urgencyIconBg(item.urgency)}
                  accessory="disclosure"
                />
              )),
            },
          ]}
        />

        {/* Navigation */}
        <IOSGroupedList
          sections={[
            {
              header: "Views",
              items: [
                <IOSListRow
                  key="roster"
                  title="Roster & Teams"
                  icon={<Users className="w-[17px] h-[17px]" />}
                  iconBg="bg-ios-purple"
                />,
                <IOSListRow
                  key="capacity"
                  title="Capacity Planner"
                  icon={<BarChart3 className="w-[17px] h-[17px]" />}
                  iconBg="bg-ios-green"
                />,
                <IOSListRow
                  key="bays"
                  title="Bay Allocation"
                  icon={<Warehouse className="w-[17px] h-[17px]" />}
                  iconBg="bg-ios-orange"
                />,
                <IOSListRow
                  key="quotes"
                  title="Quote Workspace"
                  icon={<FileSpreadsheet className="w-[17px] h-[17px]" />}
                  iconBg="bg-ios-blue"
                />,
              ],
            },
          ]}
        />
      </div>
    </div>
  );
}
