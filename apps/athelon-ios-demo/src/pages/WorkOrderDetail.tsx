import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "../../../athelon-app/convex/_generated/api";
import { useCurrentOrg } from "@/providers/OrgContextProvider";
import { Id } from "../../../athelon-app/convex/_generated/dataModel";
import { IOSNavBar } from "@/components/ios/IOSNavBar";
import { IOSSegmentedControl } from "@/components/ios/IOSSegmentedControl";
import { IOSGroupedList } from "@/components/ios/IOSGroupedList";
import { IOSListRow } from "@/components/ios/IOSListRow";
import { IOSStatusBadge } from "@/components/ios/IOSStatusBadge";
import { IOSEmptyState } from "@/components/ios/IOSEmptyState";
import { IOSLoadingSpinner } from "@/components/ios/IOSLoadingSpinner";
import {
  AlertTriangle,
  CheckCircle2,
  Circle,
  FileText,
  Image,
  Shield,
  Wrench,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Tab configuration
// ---------------------------------------------------------------------------

type Tab = "overview" | "squawks" | "tasks" | "compliance" | "docs";

const tabSegments: Array<{ label: string; value: Tab }> = [
  { label: "Overview", value: "overview" },
  { label: "Squawks", value: "squawks" },
  { label: "Tasks", value: "tasks" },
  { label: "Compliance", value: "compliance" },
  { label: "Docs", value: "docs" },
];

// ---------------------------------------------------------------------------
// Demo data for tabs without live backend data
// ---------------------------------------------------------------------------

const demoSquawks = [
  {
    id: "sq-1",
    description: "Corrosion found on wing root fairing",
    system: "Airframe - Wing",
    severity: "critical",
  },
  {
    id: "sq-2",
    description: "Landing light lens cracked",
    system: "Electrical - Lighting",
    severity: "minor",
  },
  {
    id: "sq-3",
    description: "Oil leak at #2 cylinder push rod housing",
    system: "Powerplant - Engine",
    severity: "major",
  },
  {
    id: "sq-4",
    description: "Elevator trim tab hinge worn beyond limits",
    system: "Airframe - Empennage",
    severity: "major",
  },
  {
    id: "sq-5",
    description: "Pitot tube mount cracked",
    system: "Instruments - Pitot Static",
    severity: "minor",
  },
];

const demoTasks = [
  {
    id: "tc-1",
    description: "Remove and replace wing root fairing",
    hours: "3.5",
    status: "completed",
  },
  {
    id: "tc-2",
    description: "Replace landing light lens assembly",
    hours: "1.0",
    status: "in_progress",
  },
  {
    id: "tc-3",
    description: "Repair oil leak per SB-2024-123",
    hours: "4.0",
    status: "open",
  },
  {
    id: "tc-4",
    description: "Perform compression check all cylinders",
    hours: "2.0",
    status: "open",
  },
  {
    id: "tc-5",
    description: "Complete annual inspection checklist",
    hours: "6.0",
    status: "open",
  },
  {
    id: "tc-6",
    description: "Inspect elevator trim tab hinge and replace",
    hours: "2.5",
    status: "open",
  },
  {
    id: "tc-7",
    description: "Repair pitot tube mount per maintenance manual",
    hours: "1.5",
    status: "open",
  },
];

const demoComplianceItems = [
  {
    id: "ci-1",
    reference: "AD 2023-15-06",
    description: "Wing spar inspection per AD 2023-15-06",
    status: "compliant",
  },
  {
    id: "ci-2",
    reference: "AD 2024-02-11",
    description: "Fuel selector valve modification",
    status: "non_compliant",
  },
  {
    id: "ci-3",
    reference: "AD 2022-19-04",
    description: "Seat rail lock inspection",
    status: "compliant",
  },
  {
    id: "ci-4",
    reference: "SB 2024-123",
    description: "Oil leak remediation per service bulletin",
    status: "deferred",
  },
  {
    id: "ci-5",
    reference: "AD 2025-08-02",
    description: "Engine mount bolt torque verification",
    status: "compliant",
  },
];

const demoDocuments = [
  {
    id: "doc-1",
    name: "FAA Form 8130-3 (Airworthiness Approval Tag)",
    fileType: "pdf",
    size: "245 KB",
    date: "Mar 1, 2026",
  },
  {
    id: "doc-2",
    name: "Annual Inspection Report",
    fileType: "pdf",
    size: "1.2 MB",
    date: "Mar 2, 2026",
  },
  {
    id: "doc-3",
    name: "Wing Root Corrosion Photo",
    fileType: "image",
    size: "3.8 MB",
    date: "Mar 2, 2026",
  },
  {
    id: "doc-4",
    name: "Engine Logbook Extract",
    fileType: "pdf",
    size: "512 KB",
    date: "Mar 3, 2026",
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(ts: number | undefined): string {
  if (!ts) return "--";
  return new Date(ts).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatWorkOrderType(type: string): string {
  return type
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function priorityLabel(priority: string): string {
  return priority.toUpperCase();
}

function priorityColor(priority: string): string {
  switch (priority) {
    case "aog":
      return "text-ios-red";
    case "urgent":
      return "text-ios-orange";
    default:
      return "text-ios-green";
  }
}

function severityIconBg(severity: string): string {
  switch (severity) {
    case "critical":
      return "bg-red-100";
    case "major":
      return "bg-orange-100";
    case "minor":
      return "bg-yellow-100";
    default:
      return "bg-ios-gray5";
  }
}

function severityIconColor(severity: string): string {
  switch (severity) {
    case "critical":
      return "text-ios-red";
    case "major":
      return "text-ios-orange";
    case "minor":
      return "text-yellow-500";
    default:
      return "text-ios-gray";
  }
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function WorkOrderDetail() {
  const { id } = useParams();
  const workOrderId = id as Id<"workOrders">;
  const { orgId, isLoaded } = useCurrentOrg();
  const [tab, setTab] = useState<Tab>("overview");

  const data = useQuery(
    api.workOrders.getWorkOrder,
    isLoaded && orgId && id
      ? { workOrderId, organizationId: orgId }
      : "skip",
  );

  const loading = data === undefined;
  const wo = data?.workOrder;
  const aircraft = data?.aircraft;
  const taskCards = (data?.taskCards ?? []) as Array<Record<string, unknown>>;
  const discrepancies = (data?.discrepancies ?? []) as Array<Record<string, unknown>>;

  // Task stats
  const hasRealTasks = taskCards.length > 0;
  const taskList = hasRealTasks ? taskCards : demoTasks;
  const totalTasks = taskList.length;
  const completedTasks = hasRealTasks
    ? taskCards.filter((t) => t.status === "completed").length
    : demoTasks.filter((t) => t.status === "completed").length;

  if (loading) {
    return (
      <div>
        <IOSNavBar
          title="Loading..."
          backHref="/work-orders"
          backLabel="Work Orders"
          largeTitle={false}
        />
        <IOSLoadingSpinner />
      </div>
    );
  }

  if (!wo) {
    return (
      <div>
        <IOSNavBar
          title="Not Found"
          backHref="/work-orders"
          backLabel="Work Orders"
          largeTitle={false}
        />
        <IOSEmptyState
          icon={<Wrench className="w-[48px] h-[48px]" />}
          title="Work Order Not Found"
          subtitle="This work order may have been removed or you don't have access."
        />
      </div>
    );
  }

  const woRecord = wo as Record<string, unknown>;
  const reg =
    aircraft?.currentRegistration ??
    (woRecord.aircraftRegistration as string | undefined) ??
    "N/A";
  const acType = aircraft
    ? `${aircraft.make} ${aircraft.model}`
    : "Unknown Aircraft";
  const woNumber = (woRecord.workOrderNumber as string) ?? id?.slice(-6) ?? "";
  const status = (woRecord.status as string) ?? "open";
  const priority = (woRecord.priority as string) ?? "routine";
  const workOrderType = (woRecord.workOrderType as string) ?? "routine";

  return (
    <div>
      {/* Nav Bar */}
      <IOSNavBar
        title={`WO-${woNumber}`}
        backHref="/work-orders"
        backLabel="Work Orders"
        largeTitle={false}
        rightAction={
          <button className="text-ios-blue text-[17px] font-normal">
            Edit
          </button>
        }
      />

      {/* Hero Card */}
      <div className="px-4 pt-2 pb-1">
        <div className="ios-card">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-[24px] font-bold leading-[30px] text-ios-label">
                {reg}
              </div>
              <div className="text-[15px] text-ios-label-secondary mt-0.5">
                {acType}
              </div>
            </div>
            <IOSStatusBadge status={status} />
          </div>

          {/* Stat boxes row */}
          <div className="flex mt-4 gap-3">
            <div className="flex-1 bg-ios-bg rounded-[10px] p-3 text-center">
              <div className="text-[20px] font-bold text-ios-label">
                {completedTasks}/{totalTasks}
              </div>
              <div className="text-[12px] text-ios-label-secondary mt-0.5">
                Tasks
              </div>
            </div>
            <div className="flex-1 bg-ios-bg rounded-[10px] p-3 text-center">
              <div className={`text-[20px] font-bold ${priorityColor(priority)}`}>
                {priorityLabel(priority)}
              </div>
              <div className="text-[12px] text-ios-label-secondary mt-0.5">
                Priority
              </div>
            </div>
            <div className="flex-1 bg-ios-bg rounded-[10px] p-3 text-center">
              <div className="text-[20px] font-bold text-ios-label">
                {formatWorkOrderType(workOrderType).split(" ")[0]}
              </div>
              <div className="text-[12px] text-ios-label-secondary mt-0.5">
                Type
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
        {tab === "overview" && (
          <OverviewTab wo={woRecord} acType={acType} reg={reg} />
        )}
        {tab === "squawks" && (
          <SquawksTab realDiscrepancies={discrepancies.length > 0 ? discrepancies : null} />
        )}
        {tab === "tasks" && (
          <TasksTab realTasks={hasRealTasks ? taskCards : null} />
        )}
        {tab === "compliance" && <ComplianceTab />}
        {tab === "docs" && <DocsTab />}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Overview Tab
// ---------------------------------------------------------------------------

interface OverviewTabProps {
  wo: Record<string, unknown>;
  acType: string;
  reg: string;
}

function OverviewTab({ wo, acType, reg }: OverviewTabProps) {
  return (
    <IOSGroupedList
      sections={[
        {
          header: "Details",
          items: [
            <IOSListRow
              key="customer"
              title="Customer"
              detail={(wo.customerName as string) ?? "Not assigned"}
              accessory={undefined}
            />,
            <IOSListRow
              key="description"
              title="Description"
              subtitle={(wo.description as string) ?? "No description"}
              accessory={undefined}
            />,
            <IOSListRow
              key="created"
              title="Created Date"
              detail={formatDate(wo.openedAt as number | undefined)}
              accessory={undefined}
            />,
            <IOSListRow
              key="promised"
              title="Promised Delivery"
              detail={formatDate(wo.promisedDeliveryDate as number | undefined)}
              accessory={undefined}
            />,
          ],
        },
        {
          header: "Aircraft",
          items: [
            <IOSListRow
              key="registration"
              title="Registration"
              detail={reg}
              accessory={undefined}
            />,
            <IOSListRow
              key="type-model"
              title="Type / Model"
              detail={acType}
              accessory={undefined}
            />,
            <IOSListRow
              key="total-time"
              title="Total Time"
              detail={`${((wo.aircraftTotalTimeAtOpen as number) ?? 0).toLocaleString()} hrs`}
              accessory={undefined}
            />,
            <IOSListRow
              key="cycles"
              title="Cycles"
              detail={`${((wo.aircraftCyclesAtOpen as number) ?? 0).toLocaleString()}`}
              accessory={undefined}
            />,
          ],
        },
      ]}
    />
  );
}

// ---------------------------------------------------------------------------
// Squawks Tab
// ---------------------------------------------------------------------------

interface SquawksTabProps {
  realDiscrepancies: Array<Record<string, unknown>> | null;
}

function SquawksTab({ realDiscrepancies }: SquawksTabProps) {
  const squawks = realDiscrepancies
    ? realDiscrepancies.map((d) => ({
        id: d._id as string,
        description: (d.description as string) ?? "No description",
        system: (d.aircraftSystem as string) ?? "General",
        severity: (d.severity as string) ?? "minor",
      }))
    : demoSquawks;

  if (squawks.length === 0) {
    return (
      <IOSEmptyState
        icon={<AlertTriangle className="w-[48px] h-[48px]" />}
        title="No Squawks"
        subtitle="No discrepancies have been logged for this work order."
      />
    );
  }

  return (
    <IOSGroupedList
      sections={[
        {
          header: "Discrepancies",
          items: squawks.map((sq) => (
            <IOSListRow
              key={sq.id}
              title={sq.description}
              subtitle={sq.system}
              icon={
                <AlertTriangle
                  className={`w-[14px] h-[14px] ${severityIconColor(sq.severity)}`}
                />
              }
              iconBg={severityIconBg(sq.severity)}
              detail={
                <IOSStatusBadge
                  status={sq.severity}
                  label={sq.severity.charAt(0).toUpperCase() + sq.severity.slice(1)}
                />
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
// Tasks Tab
// ---------------------------------------------------------------------------

interface TasksTabProps {
  realTasks: Array<Record<string, unknown>> | null;
}

function TasksTab({ realTasks }: TasksTabProps) {
  const tasks = realTasks
    ? realTasks.map((tc) => ({
        id: tc._id as string,
        description: (tc.title as string) ?? "Untitled Task",
        hours: String((tc.estimatedHours as number) ?? 0),
        status: (tc.status as string) ?? "open",
      }))
    : demoTasks;

  function taskStatusIcon(status: string) {
    if (status === "completed") {
      return (
        <CheckCircle2
          className="w-[14px] h-[14px] text-ios-green"
          fill="currentColor"
          stroke="white"
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

  function taskIconBg(status: string): string {
    if (status === "completed") return "bg-green-50";
    return "bg-ios-gray5";
  }

  if (tasks.length === 0) {
    return (
      <IOSEmptyState
        icon={<Wrench className="w-[48px] h-[48px]" />}
        title="No Tasks"
        subtitle="No task cards have been created for this work order yet."
      />
    );
  }

  return (
    <IOSGroupedList
      sections={[
        {
          header: "Task Cards",
          items: tasks.map((task) => (
            <IOSListRow
              key={task.id}
              title={task.description}
              subtitle={`${task.hours} labor hr${parseFloat(task.hours) !== 1 ? "s" : ""}`}
              icon={taskStatusIcon(task.status)}
              iconBg={taskIconBg(task.status)}
              detail={<IOSStatusBadge status={task.status} />}
              accessory="disclosure"
            />
          )),
        },
      ]}
    />
  );
}

// ---------------------------------------------------------------------------
// Compliance Tab
// ---------------------------------------------------------------------------

function ComplianceTab() {
  return (
    <IOSGroupedList
      sections={[
        {
          header: "Compliance Items",
          items: demoComplianceItems.map((item) => (
            <IOSListRow
              key={item.id}
              title={item.reference}
              subtitle={item.description}
              icon={<Shield className="w-[14px] h-[14px]" />}
              iconBg={
                item.status === "compliant"
                  ? "bg-green-100"
                  : item.status === "non_compliant"
                    ? "bg-red-100"
                    : "bg-yellow-100"
              }
              detail={<IOSStatusBadge status={item.status} />}
              accessory="disclosure"
            />
          )),
        },
      ]}
    />
  );
}

// ---------------------------------------------------------------------------
// Docs Tab
// ---------------------------------------------------------------------------

function DocsTab() {
  function fileIcon(fileType: string) {
    switch (fileType) {
      case "image":
        return <Image className="w-[17px] h-[17px]" />;
      default:
        return <FileText className="w-[17px] h-[17px]" />;
    }
  }

  function fileIconBg(fileType: string): string {
    switch (fileType) {
      case "image":
        return "bg-blue-100";
      default:
        return "bg-red-100";
    }
  }

  return (
    <IOSGroupedList
      sections={[
        {
          header: "Attached Documents",
          items: demoDocuments.map((doc) => (
            <IOSListRow
              key={doc.id}
              title={doc.name}
              subtitle={`${doc.fileType.toUpperCase()} \u00B7 ${doc.size}`}
              icon={fileIcon(doc.fileType)}
              iconBg={fileIconBg(doc.fileType)}
              detail={doc.date}
              accessory="disclosure"
            />
          )),
        },
      ]}
    />
  );
}
