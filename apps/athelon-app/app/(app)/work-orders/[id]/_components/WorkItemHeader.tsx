"use client";

import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  ShieldCheck,
  FileText,
  Wrench,
  Plane,
  AlertTriangle,
  CheckCircle2,
  Clock,
  XCircle,
  Timer,
} from "lucide-react";

// ─── Label & style maps ─────────────────────────────────────────────────────

const TASK_TYPE_LABEL: Record<string, string> = {
  inspection: "Inspection",
  repair: "Repair",
  replacement: "Replacement",
  ad_compliance: "AD Compliance",
  functional_check: "Functional Check",
  rigging: "Rigging",
  return_to_service: "Return to Service",
  overhaul: "Overhaul",
  modification: "Modification",
};

const TASK_STATUS_LABEL: Record<string, string> = {
  not_started: "Not Started",
  in_progress: "In Progress",
  incomplete_na_steps: "Needs IA Review",
  complete: "Complete",
  voided: "Voided",
};

const TASK_STATUS_STYLES: Record<string, string> = {
  not_started: "bg-slate-500/15 text-slate-400 border-slate-500/30",
  in_progress: "bg-sky-500/15 text-sky-400 border-sky-500/30",
  incomplete_na_steps: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  complete: "bg-green-500/15 text-green-400 border-green-500/30",
  voided: "bg-slate-500/15 text-slate-400 border-slate-500/30",
};

const DISCREPANCY_STATUS_LABEL: Record<string, string> = {
  open: "Open",
  under_evaluation: "Under Evaluation",
  dispositioned: "Dispositioned",
};

const DISCREPANCY_STATUS_STYLES: Record<string, string> = {
  open: "bg-red-500/15 text-red-400 border-red-500/30",
  under_evaluation: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  dispositioned: "bg-green-500/15 text-green-400 border-green-500/30",
};

const DISCREPANCY_TYPE_LABEL: Record<string, string> = {
  mandatory: "Mandatory",
  recommended: "Recommended",
  customer_information: "Customer Info",
  ops_check: "Ops Check",
};

const DISCREPANCY_TYPE_STYLES: Record<string, string> = {
  mandatory: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30",
  recommended: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30",
  customer_information: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30",
  ops_check: "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/30",
};

const SYSTEM_TYPE_LABEL: Record<string, string> = {
  airframe: "Airframe",
  engine: "Engine",
  engine_left: "Engine (L)",
  engine_right: "Engine (R)",
  engine_center: "Engine (C)",
  engine_single: "Engine",
  propeller: "Propeller",
  appliance: "Appliance",
  avionics: "Avionics",
  landing_gear: "Landing Gear",
  fuel_system: "Fuel System",
  hydraulics: "Hydraulics",
  electrical: "Electrical",
  other: "Other",
};

const CUSTOMER_APPROVAL_LABEL: Record<string, string> = {
  pending: "Pending",
  approved_by_customer: "Customer Approved",
  approved_by_station: "Station Approved",
  denied: "Denied",
};

const CUSTOMER_APPROVAL_STYLES: Record<string, string> = {
  pending: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30",
  approved_by_customer: "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/30",
  approved_by_station: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
  denied: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30",
};

const SEVERITY_LABEL: Record<string, string> = {
  critical: "Critical",
  major: "Major",
  minor: "Minor",
  observation: "Observation",
};

const PRIORITY_LABEL: Record<string, string> = {
  aog: "AOG",
  urgent: "Urgent",
  routine: "Routine",
  deferred: "Deferred",
};

const DISCOVERED_WHEN_LABEL: Record<string, string> = {
  customer_report: "Customer",
  planning: "Planning",
  inspection: "Inspection",
  post_quote: "Post-Quote",
};

// ─── Props ──────────────────────────────────────────────────────────────────

export type WorkItemHeaderProps =
  | { kind: "task_card" } & TaskCardHeaderData
  | { kind: "discrepancy" } & DiscrepancyHeaderData;

interface TaskCardHeaderData {
  kind: "task_card";
  taskCardNumber: string;
  title: string;
  status: string;
  taskType: string;
  approvedDataSource: string;
  approvedDataRevision?: string;
  aircraftSystem?: string;
  isInspectionItem?: boolean;
  estimatedHours?: number;
  stepCount?: number;
  completedStepCount?: number;
}

interface DiscrepancyHeaderData {
  kind: "discrepancy";
  discrepancyNumber: string;
  description: string;
  status: string;
  discrepancyType?: string;
  systemType?: string;
  aircraftSystem?: string;
  discoveredWhen?: string;
  riiRequired?: boolean;
  stcRelated?: boolean;
  stcNumber?: string;
  customerApprovalStatus?: string;
  addedToQuote?: boolean;
  addedToQuoteInitials?: string;
  mhEstimate?: number;
  mhActual?: number;
  severity?: string;
  priority?: string;
  foundBy?: string;
  disposition?: string;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function WorkItemHeader(props: WorkItemHeaderProps) {
  if (props.kind === "task_card") {
    return <TaskCardHeader {...props} />;
  }
  return <DiscrepancyHeader {...props} />;
}

function TaskCardHeader(data: TaskCardHeaderData) {
  return (
    <div className="space-y-2">
      {/* Line 1: Number + badges */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="font-mono text-sm font-bold text-foreground">
          {data.taskCardNumber}
        </span>
        <Badge variant="outline" className={TASK_STATUS_STYLES[data.status] ?? "bg-muted text-muted-foreground"}>
          {TASK_STATUS_LABEL[data.status] ?? data.status}
        </Badge>
        <Badge variant="outline" className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30">
          {TASK_TYPE_LABEL[data.taskType] ?? data.taskType}
        </Badge>
        {data.aircraftSystem && (
          <Badge variant="outline" className="bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/30">
            <Plane className="w-3 h-3 mr-1" />
            {SYSTEM_TYPE_LABEL[data.aircraftSystem] ?? data.aircraftSystem}
          </Badge>
        )}
        {data.isInspectionItem && (
          <Badge variant="outline" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30">
            <ShieldCheck className="w-3 h-3 mr-1" />
            RII
          </Badge>
        )}
      </div>

      {/* Line 2: Title */}
      <p className="text-sm text-foreground font-medium">{data.title}</p>

      {/* Line 3: Approved data + progress */}
      <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
        <span className="flex items-center gap-1">
          <FileText className="w-3 h-3" />
          {data.approvedDataSource}
          {data.approvedDataRevision && ` Rev ${data.approvedDataRevision}`}
        </span>
        {data.stepCount !== undefined && data.completedStepCount !== undefined && (
          <>
            <Separator orientation="vertical" className="h-3" />
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              Steps: {data.completedStepCount}/{data.stepCount}
            </span>
          </>
        )}
        {data.estimatedHours !== undefined && (
          <>
            <Separator orientation="vertical" className="h-3" />
            <span className="flex items-center gap-1">
              <Timer className="w-3 h-3" />
              Est: {data.estimatedHours}h
            </span>
          </>
        )}
      </div>
    </div>
  );
}

function DiscrepancyHeader(data: DiscrepancyHeaderData) {
  return (
    <div className="space-y-2">
      {/* Line 1: Number + status badges */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="font-mono text-sm font-bold text-foreground">
          {data.discrepancyNumber}
        </span>
        <Badge variant="outline" className={DISCREPANCY_STATUS_STYLES[data.status] ?? "bg-muted text-muted-foreground"}>
          {DISCREPANCY_STATUS_LABEL[data.status] ?? data.status}
        </Badge>
        {data.discrepancyType && (
          <Badge variant="outline" className={DISCREPANCY_TYPE_STYLES[data.discrepancyType] ?? "bg-muted text-muted-foreground"}>
            {DISCREPANCY_TYPE_LABEL[data.discrepancyType] ?? data.discrepancyType}
          </Badge>
        )}
        {(data.systemType || data.aircraftSystem) && (
          <Badge variant="outline" className="bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/30">
            <Plane className="w-3 h-3 mr-1" />
            {SYSTEM_TYPE_LABEL[data.systemType ?? data.aircraftSystem ?? ""] ?? data.systemType ?? data.aircraftSystem}
          </Badge>
        )}
        {data.severity && (
          <Badge variant="outline" className={
            data.severity === "critical" ? "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30"
            : data.severity === "major" ? "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/30"
            : "bg-muted text-muted-foreground border-border/40"
          }>
            {SEVERITY_LABEL[data.severity] ?? data.severity}
          </Badge>
        )}
        {data.riiRequired && (
          <Badge variant="outline" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30">
            <ShieldCheck className="w-3 h-3 mr-1" />
            RII Required
          </Badge>
        )}
      </div>

      {/* Line 2: Description (truncated) */}
      <p className="text-sm text-foreground font-medium line-clamp-2">{data.description}</p>

      {/* Line 3: OP-1003 metadata */}
      <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
        {data.discoveredWhen && (
          <span className="flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            Found: {DISCOVERED_WHEN_LABEL[data.discoveredWhen] ?? data.discoveredWhen}
          </span>
        )}
        {data.priority && (
          <>
            <Separator orientation="vertical" className="h-3" />
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {PRIORITY_LABEL[data.priority] ?? data.priority}
            </span>
          </>
        )}
        {data.customerApprovalStatus && (
          <>
            <Separator orientation="vertical" className="h-3" />
            <Badge variant="outline" className={`text-[10px] py-0 ${CUSTOMER_APPROVAL_STYLES[data.customerApprovalStatus] ?? ""}`}>
              {data.customerApprovalStatus === "denied" && <XCircle className="w-3 h-3 mr-0.5" />}
              {data.customerApprovalStatus === "approved_by_customer" && <CheckCircle2 className="w-3 h-3 mr-0.5" />}
              {CUSTOMER_APPROVAL_LABEL[data.customerApprovalStatus] ?? data.customerApprovalStatus}
            </Badge>
          </>
        )}
        {data.stcRelated && (
          <>
            <Separator orientation="vertical" className="h-3" />
            <span>STC: {data.stcNumber ?? "Yes"}</span>
          </>
        )}
        {data.addedToQuote && (
          <>
            <Separator orientation="vertical" className="h-3" />
            <span>Quote: Added{data.addedToQuoteInitials ? ` (${data.addedToQuoteInitials})` : ""}</span>
          </>
        )}
      </div>

      {/* Line 4: Labor tracking */}
      {(data.mhEstimate !== undefined || data.mhActual !== undefined) && (
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Timer className="w-3 h-3" />
            <Wrench className="w-3 h-3" />
            M/H Est: {data.mhEstimate ?? "—"}
          </span>
          <Separator orientation="vertical" className="h-3" />
          <span>
            Actual: {data.mhActual ?? "—"}
          </span>
        </div>
      )}
    </div>
  );
}
