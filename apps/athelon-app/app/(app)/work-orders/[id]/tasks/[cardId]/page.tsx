"use client";

import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Link } from "react-router-dom";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import type { Id } from "@/convex/_generated/dataModel";
import { toast } from "sonner";
import { formatDateTime } from "@/lib/format";
import {
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  Wrench,
  Lock,
  MessageSquare,
  Send,
  ShieldCheck,
  Plus,
  ChevronDown,
  History,
  Clock,
  Play,
  Square,
  Building2,
  Loader2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SignStepDialog } from "./_components/SignStepDialog";
import { SignCardDialog } from "./_components/SignCardDialog";
import { RaiseFindingDialog } from "./_components/RaiseFindingDialog";
import { MarkNaDialog } from "./_components/MarkNaDialog";
import { TaskStepRow } from "./_components/TaskStepRow";
import {
  VendorServicePickerModal,
  type AttachmentDetails,
} from "@/app/(app)/work-orders/[id]/_components/VendorServicePickerModal";
import {
  type TaskStatus,
  TASK_STATUS_LABEL,
  TASK_STATUS_STYLES,
} from "@/lib/mro-constants";

// ─── Compliance types & constants ─────────────────────────────────────────────

type ComplianceStatus = "pending" | "compliant" | "non_compliant" | "deferred" | "na";
type ReferenceType = "ad" | "sb" | "amm" | "cmm" | "faa_approved_data" | "part_145" | "other";

type ComplianceHistoryEntry = {
  status: ComplianceStatus;
  notes?: string;
  changedByName: string;
  changedAt: number;
};

type TaskComplianceItem = {
  id: string;
  referenceType: ReferenceType;
  reference: string;
  description?: string;
  complianceStatus: ComplianceStatus;
  history: ComplianceHistoryEntry[];
  notes?: string;
};

const REFERENCE_TYPE_LABEL: Record<ReferenceType, string> = {
  ad: "AD",
  sb: "Service Bulletin",
  amm: "AMM",
  cmm: "CMM",
  faa_approved_data: "FAA Approved Data",
  part_145: "Part 145",
  other: "Other",
};

const REFERENCE_TYPE_STYLES: Record<ReferenceType, string> = {
  ad: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/30",
  sb: "bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/30",
  amm: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30",
  cmm: "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/30",
  faa_approved_data: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
  part_145: "bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border-cyan-500/30",
  other: "bg-muted text-muted-foreground border-border/40",
};

const COMPLIANCE_STATUS_LABEL: Record<ComplianceStatus, string> = {
  pending: "Pending",
  compliant: "Compliant",
  non_compliant: "Non-Compliant",
  deferred: "Deferred",
  na: "N/A",
};

const COMPLIANCE_STATUS_STYLES: Record<ComplianceStatus, string> = {
  pending: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30",
  compliant: "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/30",
  non_compliant: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/30",
  deferred: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30",
  na: "bg-muted text-muted-foreground border-border/40",
};

// ─── Vendor service types & constants ────────────────────────────────────────

type VendorServiceStatus = "planned" | "sent_for_work" | "in_progress" | "completed" | "cancelled";

type AttachedVendorService = {
  id: string;
  vendorId: string;
  vendorName: string;
  serviceName: string;
  serviceType?: string;
  status: VendorServiceStatus;
  estimatedCost?: number;
  actualCost?: number;
  notes?: string;
};

const VENDOR_STATUS_LABEL: Record<VendorServiceStatus, string> = {
  planned: "Planned",
  sent_for_work: "Sent for Work",
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

const VENDOR_STATUS_STYLES: Record<VendorServiceStatus, string> = {
  planned: "bg-muted text-muted-foreground border-border/40",
  sent_for_work: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30",
  in_progress: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30",
  completed: "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/30",
  cancelled: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/30 line-through",
};

const VENDOR_SVC_TYPE_STYLES: Record<string, string> = {
  ndt: "bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30",
  repair: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30",
  overhaul: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30",
  calibration: "bg-green-500/15 text-green-600 dark:text-green-400 border-green-500/30",
  inspection: "bg-green-500/15 text-green-600 dark:text-green-400 border-green-500/30",
  fabrication: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
  cleaning: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
  plating: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
  painting: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
  test: "bg-muted text-muted-foreground border-muted-foreground/30",
  other: "bg-muted text-muted-foreground border-muted-foreground/30",
};

// (INITIAL_VENDOR_SERVICES and INITIAL_COMPLIANCE_ITEMS removed — data comes from Convex)

// ─── Loading skeleton ─────────────────────────────────────────────────────────

// ─── Utility: format elapsed ms as H:MM:SS or MM:SS ─────────────────────────

function fmtElapsed(ms: number): string {
  const totalSec = Math.floor(Math.max(0, ms) / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function TaskCardSkeleton() {
  return (
    <div className="space-y-5" role="status" aria-label="Loading task card">
      <Skeleton className="h-7 w-24" />
      <div className="space-y-2">
        <Skeleton className="h-7 w-64" />
        <Skeleton className="h-5 w-48" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-lg" />
        ))}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function TaskCardPage() {
  const params = useParams();
  const workOrderId = params.id as string;
  const cardId = params.cardId as string;

  const { orgId, techId, isLoaded: orgLoaded } = useCurrentOrg();

  const [signStepTarget, setSignStepTarget] = useState<{
    stepId: Id<"taskCardSteps">;
    stepNumber: number;
    description: string;
    requiresIa: boolean;
  } | null>(null);
  const [naTarget, setNaTarget] = useState<{
    stepId: Id<"taskCardSteps">;
    stepNumber: number;
    description: string;
  } | null>(null);
  const [signCardOpen, setSignCardOpen] = useState(false);
  const [findingOpen, setFindingOpen] = useState(false);
  const [handoffNote, setHandoffNote] = useState("");
  const [handoffSubmitting, setHandoffSubmitting] = useState(false);
  // GAP-18: Start step tracking
  const [startingStepId, setStartingStepId] = useState<string | null>(null);
  const [timerActionLoading, setTimerActionLoading] = useState<"task-start" | "step-toggle" | "stop" | null>(null);
  const addHandoffNote = useMutation(api.taskCards.addHandoffNote);
  const startStepMutation = useMutation(api.gapFixes.startStep);
  const startTimerMutation = useMutation(api.timeClock.startTimer);
  const stopTimerMutation = useMutation(api.timeClock.stopTimer);

  const activeTimer = useQuery(
    api.timeClock.getActiveTimerForTechnician,
    orgId && techId ? { orgId, technicianId: techId } : "skip",
  );

  // ── Compliance — Convex queries/mutations (AI-004) ────────────────────────
  const complianceItemsRaw = useQuery(
    api.taskCompliance.getComplianceItemsForTask,
    cardId ? { taskCardId: cardId as Id<"taskCards"> } : "skip",
  );
  const addComplianceItemMutation = useMutation(api.taskCompliance.addComplianceItem);
  const updateComplianceStatusMutation = useMutation(api.taskCompliance.updateComplianceStatus);
  const removeComplianceItemMutation = useMutation(api.taskCompliance.removeComplianceItem);
  const selfData = useQuery(
    api.technicians.getSelf,
    orgId ? { organizationId: orgId } : "skip",
  );

  // ── Vendor services — Convex queries/mutations (AI-005) ───────────────────
  const vendorServicesRaw = useQuery(
    api.taskCardVendorServices.getVendorServicesForTask,
    cardId ? { taskCardId: cardId as Id<"taskCards"> } : "skip",
  );
  const addVendorServiceMutation = useMutation(api.taskCardVendorServices.addVendorServiceToTask);
  const updateVendorServiceMutation = useMutation(api.taskCardVendorServices.updateVendorServiceStatus);

  // Vendor services UI state
  const [pickerOpen, setPickerOpen] = useState(false);
  const [updatingVendorSvcId, setUpdatingVendorSvcId] = useState<string | null>(null);
  const [vendorSvcUpdateStatus, setVendorSvcUpdateStatus] = useState<VendorServiceStatus>("planned");
  const [vendorSvcActualCost, setVendorSvcActualCost] = useState("");

  // Compliance UI state
  const [showAddForm, setShowAddForm] = useState(false);
  const [addRefType, setAddRefType] = useState<ReferenceType>("ad");
  const [addReference, setAddReference] = useState("");
  const [addDescription, setAddDescription] = useState("");
  const [expandedHistory, setExpandedHistory] = useState<Set<string>>(new Set());
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);
  const [updateStatus, setUpdateStatus] = useState<ComplianceStatus>("compliant");
  const [updateNotes, setUpdateNotes] = useState("");

  const taskCards = useQuery(
    api.taskCards.listTaskCardsForWorkOrder,
    orgId && workOrderId
      ? {
          workOrderId: workOrderId as Id<"workOrders">,
          organizationId: orgId,
        }
      : "skip",
  );

  // Fetch work order (with aircraft join) so we can pass real aircraft hours to
  // RaiseFindingDialog. Every finding must record aircraft hours at time of
  // discovery per 14 CFR 43 — hardcoding 0 is a data integrity violation.
  const workOrderResult = useQuery(
    api.workOrders.getWorkOrder,
    orgId && workOrderId
      ? { workOrderId: workOrderId as Id<"workOrders">, organizationId: orgId }
      : "skip",
  );
  const currentAircraftHours =
    workOrderResult?.aircraft?.totalTimeAirframeHours ?? 0;

  // Wait for both taskCards AND workOrderResult so aircraft hours are
  // always accurate when the page first renders — prevents findings from
  // being raised with 0 hours if workOrderResult resolves after taskCards.
  const isLoading = !orgLoaded || taskCards === undefined || workOrderResult === undefined;

  if (isLoading) return <TaskCardSkeleton />;

  if (!taskCards) {
    return (
      <div className="text-center py-20">
        <p className="text-sm text-muted-foreground">Work order not found</p>
        <Button asChild variant="ghost" size="sm" className="mt-4">
          <Link to={`/work-orders/${workOrderId}`}>← Back to Work Order</Link>
        </Button>
      </div>
    );
  }

  const taskCard = taskCards.find((tc) => tc._id === cardId);

  if (!taskCard) {
    return (
      <div className="text-center py-20">
        <p className="text-sm text-muted-foreground">Task card not found</p>
        <Button asChild variant="ghost" size="sm" className="mt-4">
          <Link to={`/work-orders/${workOrderId}`}>← Back to Work Order</Link>
        </Button>
      </div>
    );
  }

  // BUG-LT2-006: Include "in_progress" steps in the "remaining steps" count.
  // Previously only counted "pending" steps — if Step 3 is in_progress and
  // Steps 4–5 are pending, the sign-off card would say "Complete all 2 remaining
  // steps" but the tech actually needs to sign 3 steps (Step 3 is started but
  // not yet signed). This gives a wrong count of remaining work and can make the
  // tech think they're closer to sign-off than they actually are.
  const pendingSteps = taskCard.steps.filter(
    (s) => s.status === "pending" || s.status === "in_progress",
  );
  const completedCount = taskCard.steps.filter(
    (s) => s.status === "completed" || s.status === "na",
  ).length;
  const totalSteps = taskCard.steps.length;
  // BUG-028: allStepsDone must require EVERY step to be completed or na.
  // Previously only checked pendingSteps.length === 0, which allowed
  // in_progress steps to be ignored — a tech could sign the card while
  // a step was started but not yet signed. Under 14 CFR 43.9 every step
  // must be signed off before card-level certification.
  //
  // BUG-LT3-002: Also allow sign-off when totalSteps === 0.
  // A task card with no itemized steps is valid — e.g. "Perform ops check per
  // POH section 4-4" where the card IS the record. Previously allStepsDone
  // was false for empty cards (due to totalSteps > 0 guard), making the Sign
  // button permanently disabled and showing "Complete all 0 remaining steps"
  // — a nonsensical message with no way to proceed. An empty steps list
  // means there are no steps left to complete, so sign-off should be allowed.
  const allStepsDone =
    totalSteps === 0 ||
    taskCard.steps.every((s) => s.status === "completed" || s.status === "na");
  const cardIsComplete = taskCard.status === "complete";
  const cardIsVoided = taskCard.status === "voided";
  const activeTimerEntry = activeTimer?.entry;
  const activeTaskTimerForThisCard =
    activeTimerEntry &&
    (activeTimerEntry.entryType ?? "work_order") === "task" &&
    activeTimerEntry.taskCardId === cardId;
  const activeStepTimerForThisCard =
    activeTimerEntry &&
    (activeTimerEntry.entryType ?? "work_order") === "step" &&
    activeTimerEntry.taskCardId === cardId;

  // BUG-LT-HUNT-076: Live elapsed display for the active timer.
  // Without this, when a task timer is running the header only shows
  // "Stop Task Clock" with no time indicator. The tech has no idea if
  // they forgot to stop the clock from the previous shift or just
  // started it 5 minutes ago — they have to navigate to Time Clock to check.
  // Ticks every second while any timer entry is active; resets on stop.
  const [timerElapsedMs, setTimerElapsedMs] = useState<number>(0);
  useEffect(() => {
    if (!activeTimerEntry) {
      setTimerElapsedMs(0);
      return;
    }
    const clockInAt = (activeTimerEntry as { clockInAt?: number }).clockInAt;
    if (!clockInAt) return;
    setTimerElapsedMs(Date.now() - clockInAt);
    const id = setInterval(() => setTimerElapsedMs(Date.now() - clockInAt), 1000);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [(activeTimerEntry as { _id?: string } | undefined)?._id]);

  // ── Map Convex compliance items to local shape ────────────────────────────
  const complianceItems: TaskComplianceItem[] = (complianceItemsRaw ?? []).map((item) => ({
    id: item._id as string,
    referenceType: item.referenceType as ReferenceType,
    reference: item.reference,
    description: item.description,
    complianceStatus: item.complianceStatus as ComplianceStatus,
    history: item.history.map((h) => ({
      status: h.status as ComplianceStatus,
      notes: h.notes,
      changedByName: h.changedByName,
      changedAt: h.changedAt,
    })),
    notes: item.notes,
  }));

  // ── AI-078: Compliance gate for Sign Card button ──────────────────────────
  // If any compliance items are non_compliant or pending, the card cannot be
  // signed — the AD/SB/AMM reference hasn't been complied with or is unknown.
  const blockingComplianceItems = complianceItems.filter(
    (item) => item.complianceStatus === "non_compliant" || item.complianceStatus === "pending",
  );
  const complianceBlocksSignOff = blockingComplianceItems.length > 0;

  // ── GAP-18: Start a step (mark as in_progress) ───────────────────────────
  // BUG-LT-HUNT-052: isStarting only disables the specific step being started.
  // A tech can click Start on step 2 while step 1's mutation is still in-flight,
  // since TaskStepRow receives isStarting={startingStepId === step._id}. Two
  // concurrent startStep mutations could both succeed, leaving two steps in
  // in_progress simultaneously — impossible to sign both cleanly without voiding.
  // Fix: track a global "any step is starting" flag and pass it to all rows so
  // ALL Start buttons are disabled while any one mutation is in-flight.
  const isAnyStepStarting = startingStepId !== null;

  async function handleStartStep(stepId: Id<"taskCardSteps">) {
    if (!techId) return;
    if (isAnyStepStarting) return; // guard against concurrent starts
    setStartingStepId(stepId as string);
    try {
      await startStepMutation({ stepId, technicianId: techId });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to start step");
    } finally {
      setStartingStepId(null);
    }
  }

  async function handleStartTaskTimer() {
    if (!orgId || !techId) return;
    if (activeTimerEntry) {
      toast.error("Stop your active timer before starting a task timer.");
      return;
    }

    setTimerActionLoading("task-start");
    try {
      await startTimerMutation({
        orgId,
        technicianId: techId,
        entryType: "task",
        workOrderId: workOrderId as Id<"workOrders">,
        taskCardId: cardId as Id<"taskCards">,
        source: "task_card_page",
      });
      toast.success("Task timer started.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to start task timer.");
    } finally {
      setTimerActionLoading(null);
    }
  }

  async function handleStopActiveTimer() {
    if (!orgId || !activeTimerEntry) return;

    setTimerActionLoading("stop");
    try {
      await stopTimerMutation({ orgId, timeEntryId: activeTimerEntry._id });
      toast.success("Active timer stopped.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to stop active timer.");
    } finally {
      setTimerActionLoading(null);
    }
  }

  async function handleStepTimerClick(stepId: Id<"taskCardSteps">) {
    if (!orgId || !techId) return;

    const activeStepForThisStep =
      activeTimerEntry &&
      (activeTimerEntry.entryType ?? "work_order") === "step" &&
      activeTimerEntry.taskStepId === stepId;

    if (activeStepForThisStep) {
      await handleStopActiveTimer();
      return;
    }

    if (activeTimerEntry) {
      toast.error("Stop your active timer before starting a step timer.");
      return;
    }

    setTimerActionLoading("step-toggle");
    try {
      await startTimerMutation({
        orgId,
        technicianId: techId,
        entryType: "step",
        workOrderId: workOrderId as Id<"workOrders">,
        taskCardId: cardId as Id<"taskCards">,
        taskStepId: stepId,
        source: "task_card_page",
      });
      toast.success("Step timer started.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to start step timer.");
    } finally {
      setTimerActionLoading(null);
    }
  }

  function handleSignStepIntent(target: {
    stepId: Id<"taskCardSteps">;
    stepNumber: number;
    description: string;
    requiresIa: boolean;
  }) {
    if (activeTimerEntry && (activeTimerEntry.entryType ?? "work_order") === "step") {
      toast.error("Stop the active step timer before signing a step.");
      return;
    }
    setSignStepTarget(target);
  }

  // ── Map Convex vendor services to local shape ─────────────────────────────
  const vendorServices: AttachedVendorService[] = (vendorServicesRaw ?? []).map((svc) => ({
    id: svc._id as string,
    vendorId: svc.vendorId as string,
    vendorName: svc.vendorName,
    serviceName: svc.serviceName,
    serviceType: svc.serviceType,
    status: svc.status as VendorServiceStatus,
    estimatedCost: svc.estimatedCost,
    actualCost: svc.actualCost,
    notes: svc.notes,
  }));

  // ── BUG-LT-HUNT-083: Vendor services gate for Sign Card button ─────────────
  // A tech must not sign RTS while a component is still at the vendor for NDT,
  // overhaul, or repair. planned/sent_for_work/in_progress all mean the work
  // has not been returned — certifying airworthiness at that point creates a
  // false maintenance record under 14 CFR 43.9. Only completed/cancelled
  // services allow sign-off (work is back or not needed).
  const blockingVendorServices = vendorServices.filter(
    (svc) =>
      svc.status === "planned" ||
      svc.status === "sent_for_work" ||
      svc.status === "in_progress",
  );
  const vendorServicesBlockSignOff = blockingVendorServices.length > 0;

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Back */}
      <Button
        asChild
        variant="ghost"
        size="sm"
        className="h-7 -ml-2 text-xs text-muted-foreground"
      >
        <Link to={`/work-orders/${workOrderId}`}>
          <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
          Back to Work Order
        </Link>
      </Button>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="font-mono text-xs text-muted-foreground font-medium">
              {taskCard.taskCardNumber}
            </span>
            <Badge
              variant="outline"
              className={`text-[10px] font-medium border ${
                TASK_STATUS_STYLES[taskCard.status as TaskStatus] ?? "bg-muted text-muted-foreground"
              }`}
            >
              {cardIsComplete && (
                <CheckCircle2 className="w-2.5 h-2.5 mr-1" />
              )}
              {cardIsComplete
                ? "Signed & Complete"
                : TASK_STATUS_LABEL[taskCard.status as TaskStatus] ?? taskCard.status}
            </Badge>
          </div>
          <h1 className="text-lg sm:text-xl md:text-2xl font-semibold text-foreground">
            {taskCard.title}
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Approved Data: {taskCard.approvedDataSource}
            {taskCard.approvedDataRevision && (
              <span className="ml-1">Rev. {taskCard.approvedDataRevision}</span>
            )}
          </p>
          {taskCard.assignedTechnicianName && (
            <p className="text-xs text-muted-foreground mt-0.5">
              Assigned: {taskCard.assignedTechnicianName}
            </p>
          )}
        </div>

        {/* Progress */}
        <div className="text-right flex-shrink-0">
          {/* BUG-LT-060: 0-step task cards showed "0/0 steps done" —
              confusing for a card with no itemized work steps (just a
              card-level sign-off requirement). "0/0" looks like a display
              bug or a loading failure, not "this card has no steps".
              Cards with no steps show "—" and "sign-off only" instead. */}
          <div className="text-2xl font-bold font-mono text-foreground">
            {totalSteps === 0 ? (
              <span className="text-xl text-muted-foreground">—</span>
            ) : (
              <>
                {completedCount}
                <span className="text-base text-muted-foreground">
                  /{totalSteps}
                </span>
              </>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground">
            {totalSteps === 0 ? "sign-off only" : "steps done"}
          </p>
          {!cardIsVoided && !cardIsComplete && orgId && techId && (
            <div className="mt-2 flex items-center justify-end gap-1.5">
              {activeTaskTimerForThisCard ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs gap-1 border-red-500/40 text-red-400 hover:bg-red-500/10"
                  onClick={handleStopActiveTimer}
                  disabled={timerActionLoading === "stop"}
                >
                  <Square className="w-3 h-3" />
                  {timerActionLoading === "stop"
                    ? "Stopping..."
                    : timerElapsedMs > 0
                    ? fmtElapsed(timerElapsedMs)
                    : "Stop Task Clock"}
                </Button>
              ) : activeTimerEntry ? (
                // BUG-LT-061: When the tech has an active timer on a
                // different task card or WO, the header showed an amber
                // "Active step" badge with no context and no way to stop it.
                // The tech was blocked from starting the task timer (guarded
                // by "stop your active timer first") with no Stop button
                // visible. They had to navigate to the Time Clock to stop it.
                // Now we show a Stop Timer button for ANY active timer —
                // the mutation targets activeTimerEntry._id regardless of
                // which card or WO it belongs to.
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs gap-1 border-amber-500/40 text-amber-400 hover:bg-amber-500/10"
                  onClick={handleStopActiveTimer}
                  disabled={timerActionLoading === "stop"}
                  title={`Stop active ${activeTimerEntry.entryType ?? "timer"} timer`}
                >
                  <Square className="w-3 h-3" />
                  {timerActionLoading === "stop" ? "Stopping..." : "Stop Timer"}
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs gap-1 border-green-500/40 text-green-400 hover:bg-green-500/10"
                  onClick={handleStartTaskTimer}
                  disabled={timerActionLoading === "task-start"}
                >
                  <Play className="w-3 h-3" />
                  {timerActionLoading === "task-start" ? "Clocking..." : "Clock Task"}
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Voided banner */}
      {cardIsVoided && (
        <Card className="border-slate-500/30 bg-slate-500/5">
          <CardContent className="p-3">
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" />
              This task card has been voided and cannot be modified.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Steps (extracted via TaskStepRow) */}
      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
            <Wrench className="w-3.5 h-3.5" aria-hidden="true" />
            Steps
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-0" aria-live="polite" aria-label="Task steps">
          {taskCard.steps
            .slice()
            .sort((a, b) => a.stepNumber - b.stepNumber)
            .map((step, idx) => (
              <TaskStepRow
                key={step._id}
                step={step}
                idx={idx}
                cardIsVoided={cardIsVoided}
                cardIsComplete={cardIsComplete}
                orgId={orgId}
                techId={techId}
                onSignClick={handleSignStepIntent}
                onStartClick={handleStartStep}
                // BUG-LT-HUNT-081: isStarting now only flags THIS specific
                // step's mutation (controls spinner). anyMutationPending covers
                // ALL-step locking without erroneously spinning other rows.
                isStarting={startingStepId === step._id}
                anyMutationPending={isAnyStepStarting}
                onNaClick={setNaTarget}
                onStepTimerClick={handleStepTimerClick}
                isStepTimerActive={
                  !!activeTimerEntry &&
                  (activeTimerEntry.entryType ?? "work_order") === "step" &&
                  activeTimerEntry.taskStepId === step._id
                }
                isStepTimerBusy={
                  timerActionLoading === "step-toggle" ||
                  timerActionLoading === "stop"
                }
                stepTimerClockInAt={
                  activeTimerEntry &&
                  (activeTimerEntry.entryType ?? "work_order") === "step" &&
                  activeTimerEntry.taskStepId === step._id
                    ? (activeTimerEntry as { clockInAt?: number }).clockInAt
                    : undefined
                }
              />
            ))}
        </CardContent>
      </Card>

      {/* Shift Handoff Notes (Gap 5) */}
      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
            <MessageSquare className="w-3.5 h-3.5" />
            Shift Handoff Notes
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-3">
          {/* Existing notes */}
          {(taskCard.handoffNotes ?? []).length > 0 ? (
            <div className="space-y-2">
              {(taskCard.handoffNotes ?? []).map((hn, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-md bg-amber-500/5 border border-amber-500/20"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[11px] font-medium text-foreground">
                      {/* BUG-LT-011: Guard against null/undefined technicianName if
                          the technician record was deleted after the note was written. */}
                      {hn.technicianName ?? "Unknown Technician"}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {formatDateTime(hn.createdAt)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">{hn.note}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground italic">
              No handoff notes yet.
            </p>
          )}

          {/* Add note form */}
          {!cardIsVoided && !cardIsComplete && orgId && techId && (
            <div className="flex gap-2">
              {/* BUG-LT4-004: Add maxLength cap to the handoff note textarea.
                  Previously unbounded — a tech typing a long note would hit a
                  backend size limit and get a cryptic schema error with no
                  indication of how to fix it. 500 chars is generous for a
                  shift note (shift-handoff notes should be brief, actionable
                  summaries, not essays). Character counter added below the
                  textarea so the tech can see how close they are. */}
              <div className="flex-1 space-y-1">
                <Textarea
                  value={handoffNote}
                  onChange={(e) => setHandoffNote(e.target.value.slice(0, 500))}
                  placeholder="Add a shift handoff note..."
                  rows={2}
                  maxLength={500}
                  className="text-xs bg-muted/30 border-border/60 resize-none w-full"
                  aria-label="Shift handoff note"
                />
                <p className={`text-[10px] text-right ${handoffNote.length >= 480 ? "text-amber-400" : "text-muted-foreground/50"}`}>
                  {handoffNote.length}/500
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="h-auto self-end gap-1 text-xs"
                disabled={!handoffNote.trim() || handoffSubmitting}
                aria-label="Submit handoff note"
                onClick={async () => {
                  setHandoffSubmitting(true);
                  try {
                    await addHandoffNote({
                      taskCardId: taskCard._id as Id<"taskCards">,
                      organizationId: orgId,
                      callerTechnicianId: techId,
                      note: handoffNote.trim(),
                    });
                    setHandoffNote("");
                    // BUG-LT-HUNT-011: Add success toast so the tech gets
                    // positive confirmation the note was saved. Previously the
                    // textarea just silently cleared — if the notes list was
                    // scrolled off-screen, the tech had no feedback and might
                    // re-submit the same note a second time, creating duplicate
                    // handoff entries in the maintenance record.
                    toast.success("Handoff note added");
                  } catch (err) {
                    toast.error(
                      err instanceof Error ? err.message : "Failed to add handoff note — please try again",
                    );
                  } finally {
                    setHandoffSubmitting(false);
                  }
                }}
              >
                <Send className="w-3 h-3" />
                Add
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ─── Compliance section ──────────────────────────────────────────── */}
      <div>
        {/* Section header */}
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
            Compliance
          </h2>
          {!cardIsVoided && !cardIsComplete && (
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs gap-1"
              onClick={() => {
                // BUG-LT-HUNT-089: "Add Item" toggle button didn't reset the
                // compliance add-form fields when closing the form via the
                // toggle (vs the explicit Cancel button). A QCM who fills in
                // AD 2023-15-01, then clicks "Add Item" again to collapse the
                // form without saving, then later re-opens it would see the
                // previous AD reference pre-filled. Without noticing, they
                // could submit the old reference on the wrong task card. Fix:
                // reset all form fields whenever the toggle closes the form.
                setShowAddForm((prev) => {
                  if (prev) {
                    setAddRefType("ad");
                    setAddReference("");
                    setAddDescription("");
                  }
                  return !prev;
                });
              }}
            >
              <Plus className="w-3 h-3" />
              Add Item
            </Button>
          )}
        </div>

        {/* Status summary strip */}
        {complianceItems.length > 0 && (() => {
          const counts: Record<ComplianceStatus, number> = {
            pending: 0,
            compliant: 0,
            non_compliant: 0,
            deferred: 0,
            na: 0,
          };
          for (const item of complianceItems) {
            counts[item.complianceStatus]++;
          }
          return (
            <div className="flex flex-wrap items-center gap-1.5 mb-3">
              {counts.compliant > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium bg-green-500/10 text-green-700 dark:text-green-400">
                  {counts.compliant} compliant
                </span>
              )}
              {counts.pending > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium bg-amber-500/10 text-amber-700 dark:text-amber-400">
                  {counts.pending} pending
                </span>
              )}
              {counts.non_compliant > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium bg-red-500/10 text-red-700 dark:text-red-400">
                  {counts.non_compliant} non-compliant
                </span>
              )}
              {counts.deferred > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium bg-blue-500/10 text-blue-700 dark:text-blue-400">
                  {counts.deferred} deferred
                </span>
              )}
              {counts.na > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium bg-muted text-muted-foreground">
                  {counts.na} n/a
                </span>
              )}
            </div>
          );
        })()}

        {/* Add item form */}
        {showAddForm && (
          <div className="mb-3 p-3 rounded-md border border-border/60 bg-muted/20 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] text-muted-foreground mb-1 block">
                  Reference Type
                </label>
                <Select
                  value={addRefType}
                  onValueChange={(val) => setAddRefType(val as ReferenceType)}
                >
                  <SelectTrigger size="sm" className="w-full text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(REFERENCE_TYPE_LABEL) as ReferenceType[]).map((rt) => (
                      <SelectItem key={rt} value={rt} className="text-xs">
                        {REFERENCE_TYPE_LABEL[rt]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-[11px] text-muted-foreground mb-1 block">
                  Reference
                </label>
                <Input
                  value={addReference}
                  onChange={(e) => setAddReference(e.target.value.slice(0, 100))}
                  placeholder="e.g. AD 2023-15-01"
                  className="text-xs h-8"
                  maxLength={100}
                />
              </div>
            </div>
            <div>
              <label className="text-[11px] text-muted-foreground mb-1 block">
                Description (optional)
              </label>
              <Textarea
                value={addDescription}
                onChange={(e) => setAddDescription(e.target.value.slice(0, 500))}
                placeholder="What must be complied with..."
                rows={2}
                className="text-xs bg-muted/30 border-border/60 resize-none"
                maxLength={500}
              />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => {
                  setShowAddForm(false);
                  setAddRefType("ad");
                  setAddReference("");
                  setAddDescription("");
                }}
              >
                Cancel
              </Button>
              {/* BUG-LT-COMPL-001: Explain why Save is disabled when the task
                  card has no aircraft linked. Previously the button was just
                  silently grayed out — a tech couldn't add an AD/SB compliance
                  item and had no idea why. The work order must have an aircraft
                  assigned before compliance tracking can be linked to the
                  logbook record. */}
              {!taskCard.aircraftId && (
                <p className="text-[10px] text-amber-400/80 mr-auto">
                  Compliance tracking requires an aircraft on the work order.
                </p>
              )}
              <Button
                size="sm"
                className="h-7 text-xs"
                // BUG-HUNTER-003: Guard against silent save failure.
                // The onClick already early-returns if aircraftId is missing,
                // but the button remained visually enabled — user clicks and
                // nothing happens with no feedback. Include the same guards in
                // disabled so the button correctly reflects save-ability.
                disabled={!addReference.trim() || !orgId || !taskCard.workOrderId || !taskCard.aircraftId}
                onClick={async () => {
                  if (!orgId || !taskCard.workOrderId || !taskCard.aircraftId) return;
                  try {
                    await addComplianceItemMutation({
                      taskCardId: cardId as Id<"taskCards">,
                      workOrderId: taskCard.workOrderId as Id<"workOrders">,
                      aircraftId: taskCard.aircraftId as Id<"aircraft">,
                      organizationId: orgId,
                      referenceType: addRefType,
                      reference: addReference.trim(),
                      description: addDescription.trim() || undefined,
                    });
                    toast.success("Compliance item added");
                    setShowAddForm(false);
                    setAddRefType("ad");
                    setAddReference("");
                    setAddDescription("");
                  } catch {
                    toast.error("Failed to add compliance item");
                  }
                }}
              >
                Save
              </Button>
            </div>
          </div>
        )}

        {/* Items list */}
        {complianceItemsRaw === undefined ? (
          <div className="flex items-center gap-2 py-4 text-muted-foreground">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span className="text-xs">Loading compliance items…</span>
          </div>
        ) : complianceItems.length === 0 ? (
          <p className="text-xs text-muted-foreground italic py-4">
            No compliance items added. Use &quot;Add Item&quot; to link regulatory
            references to this task.
          </p>
        ) : (
          <div className="space-y-0 divide-y divide-border/40">
            {complianceItems.map((item) => (
              <div key={item.id} className="py-2.5 first:pt-0 last:pb-0">
                {/* Main row */}
                <div className="flex items-start gap-2">
                  <Badge
                    variant="outline"
                    className={`text-[10px] font-medium border flex-shrink-0 ${REFERENCE_TYPE_STYLES[item.referenceType]}`}
                  >
                    {REFERENCE_TYPE_LABEL[item.referenceType]}
                  </Badge>
                  <div className="flex-1 min-w-0">
                    <span className="font-mono text-xs text-foreground">
                      {item.reference}
                    </span>
                    {item.description && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                        {item.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <Badge
                      variant="outline"
                      className={`text-[10px] font-medium border ${COMPLIANCE_STATUS_STYLES[item.complianceStatus]}`}
                    >
                      {COMPLIANCE_STATUS_LABEL[item.complianceStatus]}
                    </Badge>
                    {!cardIsVoided && !cardIsComplete && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-1.5 text-[10px] text-muted-foreground"
                        onClick={() => {
                          if (updatingStatusId === item.id) {
                            setUpdatingStatusId(null);
                          } else {
                            setUpdatingStatusId(item.id);
                            setUpdateStatus(item.complianceStatus);
                            setUpdateNotes("");
                          }
                        }}
                      >
                        Update
                      </Button>
                    )}
                    {!cardIsVoided && !cardIsComplete && item.history.length === 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                        aria-label="Remove compliance item"
                        onClick={async () => {
                          try {
                            await removeComplianceItemMutation({
                              itemId: item.id as Id<"taskComplianceItems">,
                            });
                            toast.success("Compliance item removed");
                          } catch {
                            toast.error("Failed to remove compliance item");
                          }
                        }}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                </div>

                {/* Inline status update form */}
                {updatingStatusId === item.id && (
                  <div className="mt-2 ml-0 p-2.5 rounded-md border border-border/60 bg-muted/20 space-y-2">
                    <div>
                      <label className="text-[11px] text-muted-foreground mb-1 block">
                        New Status
                      </label>
                      <Select
                        value={updateStatus}
                        onValueChange={(val) => setUpdateStatus(val as ComplianceStatus)}
                      >
                        <SelectTrigger size="sm" className="w-full text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {(Object.keys(COMPLIANCE_STATUS_LABEL) as ComplianceStatus[]).map((s) => (
                            <SelectItem key={s} value={s} className="text-xs">
                              {COMPLIANCE_STATUS_LABEL[s]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-[11px] text-muted-foreground mb-1 block">
                        Notes (optional)
                      </label>
                      <Textarea
                        value={updateNotes}
                        onChange={(e) => setUpdateNotes(e.target.value.slice(0, 500))}
                        placeholder="Reason for status change..."
                        rows={2}
                        className="text-xs bg-muted/30 border-border/60 resize-none"
                        maxLength={500}
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => setUpdatingStatusId(null)}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        className="h-7 text-xs"
                        onClick={async () => {
                          if (!techId) return;
                          try {
                            await updateComplianceStatusMutation({
                              itemId: item.id as Id<"taskComplianceItems">,
                              status: updateStatus,
                              notes: updateNotes.trim() || undefined,
                              technicianId: techId,
                              technicianName: selfData?.legalName ?? "Unknown",
                            });
                            toast.success("Compliance status updated");
                            setUpdatingStatusId(null);
                            setUpdateNotes("");
                          } catch {
                            toast.error("Failed to update compliance status");
                          }
                        }}
                      >
                        Save
                      </Button>
                    </div>
                  </div>
                )}

                {/* History toggle */}
                {item.history.length > 0 && (
                  <div className="mt-1.5">
                    <button
                      type="button"
                      className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                      onClick={() => {
                        setExpandedHistory((prev) => {
                          const next = new Set(prev);
                          if (next.has(item.id)) {
                            next.delete(item.id);
                          } else {
                            next.add(item.id);
                          }
                          return next;
                        });
                      }}
                    >
                      <History className="w-3 h-3" />
                      History ({item.history.length})
                      <ChevronDown
                        className={`w-3 h-3 transition-transform ${
                          expandedHistory.has(item.id) ? "rotate-180" : ""
                        }`}
                      />
                    </button>

                    {expandedHistory.has(item.id) && (
                      <div className="mt-1.5 ml-4 space-y-1.5">
                        {item.history.map((entry, idx) => (
                          <div
                            key={idx}
                            className="flex items-start gap-2 text-[10px] text-muted-foreground"
                          >
                            <Clock className="w-3 h-3 mt-0.5 flex-shrink-0" />
                            <div>
                              <span className="font-medium text-foreground/80">
                                {entry.changedByName}
                              </span>{" "}
                              set status to{" "}
                              <Badge
                                variant="outline"
                                className={`text-[9px] px-1 py-0 font-medium border ${COMPLIANCE_STATUS_STYLES[entry.status]}`}
                              >
                                {COMPLIANCE_STATUS_LABEL[entry.status]}
                              </Badge>{" "}
                              <span className="text-muted-foreground/60">
                                {formatDateTime(entry.changedAt)}
                              </span>
                              {entry.notes && (
                                <p className="text-muted-foreground mt-0.5">
                                  {entry.notes}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ─── Vendor Services section ─────────────────────────────────── */}
      <div>
        {/* Section header */}
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5" aria-hidden="true" />
            Vendor Services
          </h2>
          {!cardIsVoided && !cardIsComplete && (
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs gap-1"
              onClick={() => setPickerOpen(true)}
            >
              <Plus className="w-3 h-3" />
              Attach Service
            </Button>
          )}
        </div>

        {/* Status summary strip */}
        {vendorServices.length > 0 && (() => {
          const counts: Record<VendorServiceStatus, number> = {
            planned: 0,
            sent_for_work: 0,
            in_progress: 0,
            completed: 0,
            cancelled: 0,
          };
          for (const svc of vendorServices) {
            counts[svc.status]++;
          }
          return (
            <div className="flex flex-wrap items-center gap-1.5 mb-3">
              {counts.planned > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium bg-muted text-muted-foreground">
                  {counts.planned} planned
                </span>
              )}
              {counts.sent_for_work > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium bg-blue-500/10 text-blue-700 dark:text-blue-400">
                  {counts.sent_for_work} sent for work
                </span>
              )}
              {counts.in_progress > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium bg-amber-500/10 text-amber-700 dark:text-amber-400">
                  {counts.in_progress} in progress
                </span>
              )}
              {counts.completed > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium bg-green-500/10 text-green-700 dark:text-green-400">
                  {counts.completed} completed
                </span>
              )}
              {counts.cancelled > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium bg-red-500/10 text-red-700 dark:text-red-400">
                  {counts.cancelled} cancelled
                </span>
              )}
            </div>
          );
        })()}

        {/* Services list */}
        {vendorServicesRaw === undefined ? (
          <div className="flex items-center gap-2 py-4 text-muted-foreground">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span className="text-xs">Loading vendor services…</span>
          </div>
        ) : vendorServices.length === 0 ? (
          <p className="text-xs text-muted-foreground italic py-4">
            No vendor services attached. Use &quot;Attach Service&quot; to assign
            external work to a vendor.
          </p>
        ) : (
          <div className="space-y-0 divide-y divide-border/40">
            {vendorServices.map((svc) => (
              <div key={svc.id} className="py-2.5 first:pt-0 last:pb-0">
                {/* Main row */}
                <div className="flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium text-foreground">
                      {svc.vendorName}
                    </span>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {svc.serviceName}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0 flex-wrap justify-end">
                    {svc.serviceType && (
                      <Badge
                        variant="outline"
                        className={`text-[10px] font-medium border ${
                          VENDOR_SVC_TYPE_STYLES[svc.serviceType] ?? "bg-muted text-muted-foreground border-border/40"
                        }`}
                      >
                        {svc.serviceType.toUpperCase()}
                      </Badge>
                    )}
                    <Badge
                      variant="outline"
                      className={`text-[10px] font-medium border ${VENDOR_STATUS_STYLES[svc.status]}`}
                    >
                      {VENDOR_STATUS_LABEL[svc.status]}
                    </Badge>
                    {svc.estimatedCost !== undefined && (
                      <span className="text-[10px] text-muted-foreground font-mono">
                        ${svc.estimatedCost}
                      </span>
                    )}
                    {!cardIsVoided && !cardIsComplete && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-1.5 text-[10px] text-muted-foreground"
                        onClick={() => {
                          if (updatingVendorSvcId === svc.id) {
                            setUpdatingVendorSvcId(null);
                          } else {
                            setUpdatingVendorSvcId(svc.id);
                            setVendorSvcUpdateStatus(svc.status);
                            setVendorSvcActualCost(svc.actualCost?.toString() ?? "");
                          }
                        }}
                      >
                        Update Status
                      </Button>
                    )}
                  </div>
                </div>

                {/* Inline status update form */}
                {updatingVendorSvcId === svc.id && (
                  <div className="mt-2 p-2.5 rounded-md border border-border/60 bg-muted/20 space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[11px] text-muted-foreground mb-1 block">
                          Status
                        </label>
                        <Select
                          value={vendorSvcUpdateStatus}
                          onValueChange={(val) => setVendorSvcUpdateStatus(val as VendorServiceStatus)}
                        >
                          <SelectTrigger size="sm" className="w-full text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {(Object.keys(VENDOR_STATUS_LABEL) as VendorServiceStatus[]).map((s) => (
                              <SelectItem key={s} value={s} className="text-xs">
                                {VENDOR_STATUS_LABEL[s]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      {(vendorSvcUpdateStatus === "completed") && (
                        <div>
                          <label className="text-[11px] text-muted-foreground mb-1 block">
                            Actual Cost
                          </label>
                          <Input
                            value={vendorSvcActualCost}
                            onChange={(e) => setVendorSvcActualCost(e.target.value)}
                            type="number"
                            placeholder="0.00"
                            className="text-xs h-8"
                          />
                        </div>
                      )}
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => setUpdatingVendorSvcId(null)}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        className="h-7 text-xs"
                        onClick={async () => {
                          try {
                            const costNum = vendorSvcActualCost.trim()
                              ? parseFloat(vendorSvcActualCost)
                              : undefined;
                            await updateVendorServiceMutation({
                              id: svc.id as Id<"taskCardVendorServices">,
                              status: vendorSvcUpdateStatus,
                              actualCost:
                                vendorSvcUpdateStatus === "completed" && costNum !== undefined && !isNaN(costNum)
                                  ? costNum
                                  : undefined,
                            });
                            toast.success("Vendor service status updated");
                            setUpdatingVendorSvcId(null);
                          } catch {
                            toast.error("Failed to update vendor service status");
                          }
                        }}
                      >
                        Save
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Vendor Service Picker Modal */}
      <VendorServicePickerModal
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        taskCardId={cardId}
        onAttach={async (details: AttachmentDetails) => {
          if (!orgId || !taskCard.workOrderId) return;
          try {
            await addVendorServiceMutation({
              taskCardId: cardId as Id<"taskCards">,
              workOrderId: taskCard.workOrderId as Id<"workOrders">,
              organizationId: orgId,
              vendorId: details.vendorId as Id<"vendors">,
              vendorServiceId: details.vendorServiceId as Id<"vendorServices"> | undefined,
              vendorName: details.vendorName,
              serviceName: details.serviceName,
              serviceType: details.serviceType,
              estimatedCost: details.estimatedCost,
              notes: details.notes,
            });
            toast.success("Vendor service attached");
          } catch {
            toast.error("Failed to attach vendor service");
          }
        }}
      />

      {/* Raise Finding button */}
      {!cardIsVoided && !cardIsComplete && orgId && techId && (
        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs border-amber-500/40 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10"
            onClick={() => setFindingOpen(true)}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            Raise Finding
          </Button>
        </div>
      )}

      {/* Card-level sign-off */}
      {!cardIsVoided && (
        <Card
          className={`border ${
            cardIsComplete
              ? "border-green-500/30 bg-green-500/5"
              : (complianceBlocksSignOff || vendorServicesBlockSignOff) && allStepsDone
              ? "border-amber-500/30 bg-amber-500/5"
              : allStepsDone
              ? "border-primary/30 bg-primary/5"
              : "border-border/60"
          }`}
        >
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-foreground flex items-center gap-2">
                  {cardIsComplete ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
                      Task Card Signed &amp; Complete
                    </>
                  ) : complianceBlocksSignOff && allStepsDone ? (
                    <>
                      <AlertTriangle className="w-4 h-4 text-amber-500 dark:text-amber-400" />
                      Compliance Items Blocking Sign-Off
                    </>
                  ) : vendorServicesBlockSignOff && allStepsDone ? (
                    <>
                      <AlertTriangle className="w-4 h-4 text-amber-500 dark:text-amber-400" />
                      Vendor Work Pending — Sign-Off Blocked
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4 text-muted-foreground" />
                      Card-Level Sign-Off
                    </>
                  )}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {cardIsComplete
                    ? "This task card has been certified per 14 CFR 43.9."
                    : complianceBlocksSignOff && allStepsDone
                    ? `${blockingComplianceItems.length} compliance item${blockingComplianceItems.length !== 1 ? "s" : ""} require resolution before this card can be signed. Resolve all non-compliant and pending items above.`
                    : vendorServicesBlockSignOff && allStepsDone
                    ? `${blockingVendorServices.length} vendor service${blockingVendorServices.length !== 1 ? "s" : ""} ${blockingVendorServices.length !== 1 ? "are" : "is"} still open (${blockingVendorServices.map((s) => s.vendorName).join(", ")}). Mark ${blockingVendorServices.length !== 1 ? "them" : "it"} completed or cancelled before signing RTS.`
                    : allStepsDone
                    ? totalSteps === 0
                      ? "No steps required — ready for card-level sign-off."
                      : "All steps complete — ready for card-level sign-off."
                    : `Complete all ${pendingSteps.length} remaining step${
                        pendingSteps.length !== 1 ? "s" : ""
                      } before signing the card.`}
                </p>
              </div>

              {!cardIsComplete && orgId && techId && (
                <Button
                  variant={allStepsDone && !complianceBlocksSignOff && !vendorServicesBlockSignOff ? "default" : "outline"}
                  size="sm"
                  disabled={!allStepsDone || complianceBlocksSignOff || vendorServicesBlockSignOff}
                  className="gap-1.5 flex-shrink-0"
                  onClick={() => {
                    // BUG-LT-HUNT-077: Guard against signing the card while a
                    // timer is still running. If the tech signs the card while
                    // a step or task timer is active, the timer continues
                    // accumulating after the card is certified — billing for
                    // labor that doesn't exist. The backend sign-off succeeds
                    // regardless, but the open time entry is orphaned. Show a
                    // blocking toast so the tech stops the clock first. This is
                    // especially important for the task timer (activeTaskTimerForThisCard)
                    // but we also guard on any timer for this card.
                    if (activeStepTimerForThisCard) {
                      toast.error(
                        "Stop your active step timer before signing the card.",
                        { description: "An open step timer would continue billing after sign-off." },
                      );
                      return;
                    }
                    if (activeTaskTimerForThisCard) {
                      toast.error(
                        "Stop the task clock before signing the card.",
                        { description: "Your task timer is still running. Stop it to close the billing entry." },
                      );
                      return;
                    }
                    setSignCardOpen(true);
                  }}
                >
                  <Lock className="w-3.5 h-3.5" />
                  Sign Card
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dialogs (extracted) */}
      {signStepTarget && orgId && techId && (
        <SignStepDialog
          open={!!signStepTarget}
          onClose={() => setSignStepTarget(null)}
          stepNumber={signStepTarget.stepNumber}
          stepDescription={signStepTarget.description}
          requiresIa={signStepTarget.requiresIa}
          orgId={orgId}
          techId={techId}
          taskCardId={taskCard._id as Id<"taskCards">}
          stepId={signStepTarget.stepId}
          onSuccess={() => setSignStepTarget(null)}
        />
      )}

      {signCardOpen && orgId && techId && (
        <SignCardDialog
          open={signCardOpen}
          onClose={() => setSignCardOpen(false)}
          taskCardTitle={taskCard.title}
          orgId={orgId}
          techId={techId}
          taskCardId={taskCard._id as Id<"taskCards">}
          onSuccess={() => setSignCardOpen(false)}
        />
      )}

      {findingOpen && orgId && techId && (
        <RaiseFindingDialog
          open={findingOpen}
          onClose={() => setFindingOpen(false)}
          workOrderId={workOrderId as Id<"workOrders">}
          orgId={orgId}
          techId={techId}
          aircraftHours={currentAircraftHours}
          taskCardTitle={taskCard.title}
        />
      )}

      {/* BUG-LT2-001: Mark step N/A dialog — previously had no UI to call
          completeStep({ action: "mark_na" }), leaving techs stuck on steps
          that don't apply to their aircraft or work scope. */}
      {naTarget && orgId && techId && (
        <MarkNaDialog
          open={!!naTarget}
          onClose={() => setNaTarget(null)}
          stepNumber={naTarget.stepNumber}
          stepDescription={naTarget.description}
          orgId={orgId}
          techId={techId}
          taskCardId={taskCard._id as Id<"taskCards">}
          stepId={naTarget.stepId}
          onSuccess={() => setNaTarget(null)}
        />
      )}
    </div>
  );
}
