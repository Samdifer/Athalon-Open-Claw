"use client";

/**
 * WorkItemsList.tsx
 * AI-053: Wire "Log Squawk" button to LogSquawkDialog (was dead/no onClick).
 * AI-054: Make FindingRow clickable — open DiscrepancyDispositionDialog inline.
 */

import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ChevronRight,
  Wrench,
  AlertTriangle,
  Filter,
  ClipboardList,
  SearchX,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CheckCircle2, Circle } from "lucide-react";
import type { Id } from "@/convex/_generated/dataModel";
import { LogSquawkDialog } from "./LogSquawkDialog";
import { DiscrepancyDispositionDialog } from "@/components/DiscrepancyDispositionDialog";

// ── Types ────────────────────────────────────────────────────────────────────

type AircraftSystem =
  | "airframe"
  | "engine_left"
  | "engine_right"
  | "engine_center"
  | "engine_single"
  | "avionics"
  | "landing_gear"
  | "fuel_system"
  | "hydraulics"
  | "electrical"
  | "other";

type SquawkOrigin =
  | "inspection_finding"
  | "customer_reported"
  | "rts_finding"
  | "routine_check"
  | "ad_compliance_check";

export type TaskCardItem = {
  kind: "task";
  id: string;
  number: string;
  title: string;
  status: string;
  taskType: string;
  stepCount: number;
  completedStepCount: number;
  aircraftSystem?: AircraftSystem;
  isInspectionItem?: boolean;
  isCustomerReported?: boolean;
};

export type DiscrepancyItem = {
  kind: "finding";
  id: string;
  number: string;
  description: string;
  status: string;
  severity?: string;
  disposition?: string;
  foundBy?: string;
  foundDate?: string;
  aircraftSystem?: AircraftSystem;
  squawkOrigin?: SquawkOrigin;
  isCustomerReported?: boolean;
  foundDuringRts?: boolean;
};

export type WorkItem = TaskCardItem | DiscrepancyItem;

export interface WorkItemsListProps {
  items: WorkItem[];
  workOrderId: string;
  /** AI-053/054: Optional Convex-typed WO ID for dialog integrations */
  workOrderIdTyped?: Id<"workOrders">;
  /** AI-053: Props required to open LogSquawkDialog */
  orgId?: Id<"organizations">;
  techId?: Id<"technicians">;
  aircraftCurrentHours?: number | null;
  /** BUG-LT-HUNT-008: WO status for gating the Add Task Card button. */
  workOrderStatus?: string;
}

// ── Constants ────────────────────────────────────────────────────────────────

type TypeFilter = "all" | "task" | "finding";

const SYSTEM_LABELS: Record<AircraftSystem, string> = {
  airframe: "Airframe",
  engine_left: "Engine (L)",
  engine_right: "Engine (R)",
  engine_center: "Engine (C)",
  engine_single: "Engine",
  avionics: "Avionics",
  landing_gear: "Landing Gear",
  fuel_system: "Fuel System",
  hydraulics: "Hydraulics",
  electrical: "Electrical",
  other: "Other",
};

const ORIGIN_LABELS: Record<SquawkOrigin, string> = {
  inspection_finding: "Inspection Finding",
  customer_reported: "Customer Reported",
  rts_finding: "RTS Finding",
  routine_check: "Routine Check",
  ad_compliance_check: "AD Compliance Check",
};

const TASK_STATUS_STYLES: Record<string, string> = {
  complete: "bg-green-500/15 text-green-400 border-green-500/30",
  in_progress: "bg-sky-500/15 text-sky-400 border-sky-500/30",
  not_started: "bg-slate-500/15 text-slate-400 border-slate-500/30",
  incomplete_na_steps: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  voided: "bg-slate-500/15 text-slate-400 border-slate-500/30",
};

const TASK_STATUS_LABELS: Record<string, string> = {
  complete: "Signed",
  in_progress: "In Progress",
  not_started: "Not Started",
  incomplete_na_steps: "Needs IA Review",
  voided: "Voided",
};

const FINDING_STATUS_STYLES: Record<string, string> = {
  open: "bg-red-500/15 text-red-400 border-red-500/30",
  deferred: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  corrected: "bg-green-500/15 text-green-400 border-green-500/30",
};

const SEVERITY_STYLES: Record<string, string> = {
  airworthiness: "text-red-400 border-red-500/30",
  safety: "text-amber-400 border-amber-500/30",
  cosmetic: "text-slate-400 border-slate-500/30",
};

// ── Component ────────────────────────────────────────────────────────────────

export function WorkItemsList({
  items,
  workOrderId,
  workOrderIdTyped,
  orgId,
  techId,
  aircraftCurrentHours,
  workOrderStatus,
}: WorkItemsListProps) {
  // BUG-LT-HUNT-008: Gate the Add Task Card CTA to editable WO statuses.
  const addableStatuses = ["open", "in_progress", "open_discrepancies", "pending_inspection"];
  const canAddCards = !workOrderStatus || addableStatuses.includes(workOrderStatus);

  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [systemFilter, setSystemFilter] = useState<string>("all");
  const [originFilter, setOriginFilter] = useState<string>("all");

  // AI-053: Log Squawk dialog state
  const [logSquawkOpen, setLogSquawkOpen] = useState(false);

  // AI-054: Disposition dialog state — tracks which finding is being actioned
  const [dispositionFinding, setDispositionFinding] = useState<{
    id: string;
    description: string;
  } | null>(null);

  // Apply filters
  const filtered = items.filter((item) => {
    if (typeFilter !== "all" && item.kind !== typeFilter) return false;
    if (systemFilter !== "all" && (item.aircraftSystem ?? "") !== systemFilter) return false;
    if (originFilter !== "all") {
      if (item.kind === "finding") {
        if ((item.squawkOrigin ?? "") !== originFilter) return false;
      } else {
        return false;
      }
    }
    return true;
  });

  const taskCount = filtered.filter((i) => i.kind === "task").length;
  const findingCount = filtered.filter((i) => i.kind === "finding").length;

  return (
    <div className="space-y-3">
      {/* Filter bar */}
      <div className="flex items-center gap-2 flex-wrap">
        <Filter className="w-3.5 h-3.5 text-muted-foreground" />

        {/* Type segmented control */}
        <div className="flex items-center rounded-md border border-border/60 overflow-hidden">
          {(
            [
              { value: "all", label: "All" },
              { value: "task", label: "Tasks" },
              { value: "finding", label: "Findings" },
            ] as const
          ).map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => setTypeFilter(value)}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                typeFilter === value
                  ? "bg-primary text-primary-foreground"
                  : "bg-transparent text-muted-foreground hover:bg-muted/40"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* System dropdown */}
        <Select value={systemFilter} onValueChange={setSystemFilter}>
          <SelectTrigger className="h-8 w-[150px] text-xs border-border/60">
            <SelectValue placeholder="All Systems" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Systems</SelectItem>
            {(Object.entries(SYSTEM_LABELS) as [AircraftSystem, string][]).map(
              ([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ),
            )}
          </SelectContent>
        </Select>

        {/* Origin dropdown */}
        <Select value={originFilter} onValueChange={setOriginFilter}>
          <SelectTrigger className="h-8 w-[170px] text-xs border-border/60">
            <SelectValue placeholder="All Sources" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sources</SelectItem>
            {(Object.entries(ORIGIN_LABELS) as [SquawkOrigin, string][]).map(
              ([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ),
            )}
          </SelectContent>
        </Select>

        {/* Count summary */}
        <span className="text-[11px] text-muted-foreground ml-auto">
          {taskCount} task{taskCount !== 1 ? "s" : ""} · {findingCount} finding
          {findingCount !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Items list */}
      {filtered.length === 0 ? (
        <div className="py-10 text-center">
          <SearchX className="w-6 h-6 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">
            No items match the current filters
          </p>
          <p className="text-xs text-muted-foreground/60 mt-1">
            Try adjusting your filter criteria.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-border/40">
          {filtered.map((item) =>
            item.kind === "task" ? (
              <TaskRow key={item.id} item={item} workOrderId={workOrderId} />
            ) : (
              <FindingRow
                key={item.id}
                item={item}
                onDisposition={
                  workOrderIdTyped
                    ? () =>
                        setDispositionFinding({
                          id: item.id,
                          description: item.description,
                        })
                    : undefined
                }
              />
            ),
          )}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-2 pt-1">
        {/* BUG-LT-HUNT-008: Gate Add Task Card to editable WO statuses */}
        {canAddCards ? (
          <Button
            asChild
            variant="outline"
            size="sm"
            className="flex-1 h-9 text-xs border-border/60 border-dashed gap-1.5"
          >
            <Link to={`/work-orders/${workOrderId}/tasks/new`}>
              <Wrench className="w-3.5 h-3.5" />
              Add Task Card
            </Link>
          </Button>
        ) : (
          <div className="flex-1 flex items-center justify-center gap-1.5 text-xs text-muted-foreground/50 h-9 border border-border/30 border-dashed rounded-md">
            <Lock className="w-3 h-3" />
            Locked — no new task cards
          </div>
        )}
        {/* AI-053: Wire Log Squawk button to LogSquawkDialog */}
        <Button
          variant="outline"
          size="sm"
          className="flex-1 h-9 text-xs border-border/60 border-dashed gap-1.5"
          onClick={
            orgId && techId && workOrderIdTyped
              ? () => setLogSquawkOpen(true)
              : undefined
          }
          disabled={!orgId || !techId || !workOrderIdTyped}
          title={
            !orgId || !techId || !workOrderIdTyped
              ? "Organization or technician context not available"
              : undefined
          }
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          Log Squawk
        </Button>
      </div>

      {/* AI-053: LogSquawkDialog — wired when org/tech context is available */}
      {orgId && techId && workOrderIdTyped && (
        <LogSquawkDialog
          open={logSquawkOpen}
          onClose={() => setLogSquawkOpen(false)}
          workOrderId={workOrderIdTyped}
          orgId={orgId}
          techId={techId}
          aircraftCurrentHours={aircraftCurrentHours ?? null}
        />
      )}

      {/* AI-054: DiscrepancyDispositionDialog — opens when a FindingRow is clicked */}
      {dispositionFinding && workOrderIdTyped && (
        <DiscrepancyDispositionDialog
          open={Boolean(dispositionFinding)}
          onOpenChange={(o) => { if (!o) setDispositionFinding(null); }}
          discrepancyId={dispositionFinding.id as Id<"discrepancies">}
          discrepancyNumber={dispositionFinding.description}
          workOrderId={workOrderIdTyped}
        />
      )}
    </div>
  );
}

// ── Task Card Row ────────────────────────────────────────────────────────────

function TaskRow({
  item,
  workOrderId,
}: {
  item: TaskCardItem;
  workOrderId: string;
}) {
  const statusStyle =
    TASK_STATUS_STYLES[item.status] ?? "bg-muted text-muted-foreground";
  const statusLabel = TASK_STATUS_LABELS[item.status] ?? item.status;

  return (
    <Link
      to={`/work-orders/${workOrderId}/tasks/${item.id}`}
      className="flex items-center gap-3 py-3 px-1 hover:bg-muted/20 transition-colors group"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
          <span className="font-mono text-xs text-muted-foreground font-medium">
            {item.number}
          </span>
          <Badge
            variant="outline"
            className="text-[10px] font-medium bg-sky-500/10 text-sky-400 border-sky-500/30"
          >
            TASK
          </Badge>
          {item.aircraftSystem && (
            <Badge
              variant="outline"
              className="text-[10px] text-muted-foreground border-border/50"
            >
              {SYSTEM_LABELS[item.aircraftSystem] ?? item.aircraftSystem}
            </Badge>
          )}
          {/* BUG-LT-WIL-002: Show "Inspection Item" badge for task cards
              marked isInspectionItem. The field was in the TaskCardItem type
              but never displayed in WorkItemsList. A lead tech or IA scanning
              the WO task list had no visual cue which cards require IA
              sign-off at the inspection-item level — they'd have to click into
              each card to find out. Under 14 CFR 65.95, an IA must personally
              observe the work on inspection items; missing this at a glance
              causes scheduling failures (IA walks away before signing). */}
          {item.isInspectionItem && (
            <Badge
              variant="outline"
              className="text-[10px] font-medium bg-violet-500/10 text-violet-400 border-violet-500/30"
            >
              Insp. Item
            </Badge>
          )}
          {/* BUG-LT-WIL-001: Show "Awaiting Sign-Off" badge when all steps are
              done but the card hasn't been card-signed yet. Previously the
              badge stayed "In Progress" even after the last step was signed —
              giving no indication that the card-level 14 CFR 43.9 sign-off was
              still needed. A lead tech or shop manager scanning the WO detail
              page had no way to identify which cards were stalled at
              card-sign-off vs actively being worked. They had to click into
              each "In Progress" card individually.
              My Work page had this badge (BUG-LT2-005); now WO detail matches. */}
          {item.stepCount > 0 &&
          item.completedStepCount === item.stepCount &&
          item.status !== "complete" &&
          item.status !== "voided" ? (
            <Badge
              variant="outline"
              className="text-[10px] font-medium bg-amber-500/10 text-amber-400 border-amber-500/30"
            >
              <Lock className="w-2.5 h-2.5 mr-1" />
              Awaiting Sign-Off
            </Badge>
          ) : (
          <Badge
            variant="outline"
            className={`text-[10px] font-medium border ${statusStyle}`}
          >
            {item.status === "complete" && (
              <CheckCircle2 className="w-2.5 h-2.5 mr-1" />
            )}
            {item.status === "in_progress" && (
              <Circle className="w-2.5 h-2.5 mr-1" />
            )}
            {statusLabel}
          </Badge>
          )}
        </div>
        <p className="text-sm font-medium text-foreground truncate">
          {item.title}
        </p>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          {item.completedStepCount}/{item.stepCount} steps
        </p>
      </div>
      <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors flex-shrink-0" />
    </Link>
  );
}

// ── Finding / Discrepancy Row ────────────────────────────────────────────────

/**
 * AI-054: FindingRow now accepts an optional `onDisposition` callback.
 * When provided, the row becomes interactive — clicking it opens the
 * DiscrepancyDispositionDialog so a tech can act on the finding without
 * navigating away from the work order detail page.
 */
function FindingRow({
  item,
  onDisposition,
}: {
  item: DiscrepancyItem;
  onDisposition?: () => void;
}) {
  const statusStyle =
    FINDING_STATUS_STYLES[item.status] ?? "bg-muted text-muted-foreground";
  const statusLabel =
    item.status.charAt(0).toUpperCase() + item.status.slice(1);
  const severityStyle = item.severity
    ? SEVERITY_STYLES[item.severity] ?? "text-muted-foreground border-border/40"
    : null;

  // Dispositioned findings (corrected/deferred) are read-only — no action needed
  const isActionable = onDisposition && item.status === "open";

  return (
    <div
      className={`flex items-start gap-3 py-3 px-1 ${
        isActionable
          ? "hover:bg-muted/20 transition-colors cursor-pointer group"
          : ""
      }`}
      onClick={isActionable ? onDisposition : undefined}
      role={isActionable ? "button" : undefined}
      tabIndex={isActionable ? 0 : undefined}
      onKeyDown={
        isActionable
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onDisposition();
              }
            }
          : undefined
      }
      aria-label={
        isActionable ? `Disposition finding ${item.number}: ${item.description}` : undefined
      }
    >
      <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
          <span className="font-mono text-xs text-muted-foreground font-medium">
            {item.number}
          </span>
          <Badge
            variant="outline"
            className="text-[10px] font-medium bg-amber-500/10 text-amber-400 border-amber-500/30"
          >
            SQUAWK
          </Badge>
          {item.aircraftSystem && (
            <Badge
              variant="outline"
              className="text-[10px] text-muted-foreground border-border/50"
            >
              {SYSTEM_LABELS[item.aircraftSystem] ?? item.aircraftSystem}
            </Badge>
          )}
          {item.severity && severityStyle && (
            <Badge
              variant="outline"
              className={`text-[10px] border ${severityStyle}`}
            >
              {item.severity.charAt(0).toUpperCase() + item.severity.slice(1)}
            </Badge>
          )}
          <Badge
            variant="outline"
            className={`text-[10px] font-medium border ${statusStyle}`}
          >
            {statusLabel}
          </Badge>
        </div>
        <p className="text-sm text-foreground line-clamp-2">
          {item.description}
        </p>
        {(item.foundBy || item.foundDate) && (
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {item.foundBy && <>Found by {item.foundBy}</>}
            {item.foundBy && item.foundDate && <> · </>}
            {item.foundDate}
          </p>
        )}
      </div>
      {/* AI-054: Chevron hint for actionable open findings */}
      {isActionable && (
        <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors flex-shrink-0 mt-0.5 self-center" />
      )}
    </div>
  );
}
