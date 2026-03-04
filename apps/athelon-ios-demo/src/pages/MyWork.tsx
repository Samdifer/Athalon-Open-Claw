import { IOSNavBar } from "@/components/ios/IOSNavBar";
import { IOSGroupedList } from "@/components/ios/IOSGroupedList";
import { IOSListRow } from "@/components/ios/IOSListRow";
import { IOSStatusBadge } from "@/components/ios/IOSStatusBadge";
import { CheckCircle2, Circle } from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type TaskStatus = "assigned" | "in_progress" | "completed";

interface DemoTask {
  id: string;
  title: string;
  wo: string;
  status: TaskStatus;
}

interface UpcomingTask {
  id: string;
  title: string;
  wo: string;
  date: string;
}

// ---------------------------------------------------------------------------
// Hardcoded demo data -- realistic MRO tasks
// ---------------------------------------------------------------------------

const todayTasks: DemoTask[] = [
  {
    id: "1",
    title: "Landing gear inspection - N45782",
    wo: "WO-2024-0847",
    status: "in_progress",
  },
  {
    id: "2",
    title: "Replace left main tire assembly - N45782",
    wo: "WO-2024-0847",
    status: "in_progress",
  },
  {
    id: "3",
    title: "AD 2024-15-09 wing spar inspection - N67890",
    wo: "WO-2024-0852",
    status: "assigned",
  },
  {
    id: "4",
    title: "Engine oil pressure sensor replacement - N12345",
    wo: "WO-2024-0855",
    status: "in_progress",
  },
  {
    id: "5",
    title: "Brake assembly check per AMM 32-40 - N45782",
    wo: "WO-2024-0847",
    status: "assigned",
  },
  {
    id: "6",
    title: "Replace wing root fairing per SB-112 - N67890",
    wo: "WO-2024-0852",
    status: "assigned",
  },
  {
    id: "7",
    title: "Service nose strut - refill nitrogen - N54321",
    wo: "WO-2024-0860",
    status: "completed",
  },
  {
    id: "8",
    title: "Inspect landing light lens assembly - N67890",
    wo: "WO-2024-0852",
    status: "completed",
  },
  {
    id: "9",
    title: "Drain and replace engine oil - N54321",
    wo: "WO-2024-0860",
    status: "completed",
  },
  {
    id: "10",
    title: "Torque check wing attach bolts - N12345",
    wo: "WO-2024-0855",
    status: "completed",
  },
];

const upcomingTasks: UpcomingTask[] = [
  {
    id: "u1",
    title: "100-hour engine inspection - N54321",
    wo: "WO-2024-0862",
    date: "Wed, Mar 5",
  },
  {
    id: "u2",
    title: "Avionics panel upgrade - N12345",
    wo: "WO-2024-0865",
    date: "Thu, Mar 6",
  },
  {
    id: "u3",
    title: "Propeller dynamic balance - N67890",
    wo: "WO-2024-0852",
    date: "Thu, Mar 6",
  },
  {
    id: "u4",
    title: "Annual inspection prep - N78901",
    wo: "WO-2024-0870",
    date: "Fri, Mar 7",
  },
  {
    id: "u5",
    title: "Replace ELT battery - N45782",
    wo: "WO-2024-0847",
    date: "Fri, Mar 7",
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function taskIcon(status: TaskStatus) {
  if (status === "completed") {
    return (
      <CheckCircle2
        className="w-[14px] h-[14px] text-ios-green"
        fill="currentColor"
        stroke="white"
      />
    );
  }
  if (status === "in_progress") {
    return (
      <Circle
        className="w-[14px] h-[14px] text-ios-blue"
        strokeWidth={2.5}
      />
    );
  }
  return (
    <Circle
      className="w-[14px] h-[14px] text-ios-gray3"
      strokeWidth={2}
    />
  );
}

function taskIconBg(status: TaskStatus): string {
  if (status === "completed") return "bg-green-50";
  if (status === "in_progress") return "bg-blue-50";
  return "bg-ios-gray5";
}

// ---------------------------------------------------------------------------
// MyWork Page
// ---------------------------------------------------------------------------

export default function MyWork() {
  return (
    <div>
      {/* Nav Bar */}
      <IOSNavBar title="My Work" backHref="/more" backLabel="More" largeTitle />

      {/* Summary KPIs */}
      <div className="px-4 pb-3">
        <div className="flex gap-3">
          {/* Assigned */}
          <div className="ios-card flex-1 flex flex-col items-center py-3">
            <div className="text-[24px] font-bold tabular-nums text-ios-blue">
              8
            </div>
            <div className="text-[11px] font-medium text-ios-label-secondary mt-0.5">
              Assigned
            </div>
          </div>

          {/* In Progress */}
          <div className="ios-card flex-1 flex flex-col items-center py-3">
            <div className="text-[24px] font-bold tabular-nums text-ios-orange">
              3
            </div>
            <div className="text-[11px] font-medium text-ios-label-secondary mt-0.5">
              In Progress
            </div>
          </div>

          {/* Completed Today */}
          <div className="ios-card flex-1 flex flex-col items-center py-3">
            <div className="text-[24px] font-bold tabular-nums text-ios-green">
              5
            </div>
            <div className="text-[11px] font-medium text-ios-label-secondary mt-0.5">
              Completed Today
            </div>
          </div>
        </div>
      </div>

      {/* Today's Tasks */}
      <IOSGroupedList
        sections={[
          {
            header: "Today's Tasks",
            items: todayTasks.map((task) => (
              <IOSListRow
                key={task.id}
                title={task.title}
                subtitle={task.wo}
                icon={taskIcon(task.status)}
                iconBg={taskIconBg(task.status)}
                accessory={<IOSStatusBadge status={task.status} />}
              />
            )),
          },
        ]}
      />

      {/* This Week */}
      <div className="pb-6">
        <IOSGroupedList
          sections={[
            {
              header: "This Week",
              items: upcomingTasks.map((task) => (
                <IOSListRow
                  key={task.id}
                  title={task.title}
                  subtitle={task.wo}
                  detail={task.date}
                  icon={
                    <Circle
                      className="w-[14px] h-[14px] text-ios-gray3"
                      strokeWidth={2}
                    />
                  }
                  iconBg="bg-ios-gray5"
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
