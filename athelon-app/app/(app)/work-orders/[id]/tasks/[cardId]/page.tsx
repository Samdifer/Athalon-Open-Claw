"use client";

import { useState } from "react";
import { useParams } from "react-router-dom";
import { Link } from "react-router-dom";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import type { Id } from "@/convex/_generated/dataModel";
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
  Building2,
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

const INITIAL_VENDOR_SERVICES: AttachedVendorService[] = [
  {
    id: "avs-1",
    vendorId: "v-1",
    vendorName: "Southwest NDT Services",
    serviceName: "Fluorescent Penetrant Inspection",
    serviceType: "ndt",
    status: "planned",
    estimatedCost: 275,
  },
];

const INITIAL_COMPLIANCE_ITEMS: TaskComplianceItem[] = [
  {
    id: "ci-1",
    referenceType: "ad",
    reference: "AD 2023-15-01",
    description: "Brake assembly torque requirements per AD 2023-15-01",
    complianceStatus: "compliant",
    history: [
      {
        status: "pending",
        notes: "Item added during task setup",
        changedByName: "Ray Kowalski",
        changedAt: Date.now() - 86400000,
      },
    ],
  },
  {
    id: "ci-2",
    referenceType: "amm",
    reference: "AMM 32-40-01 Rev 5",
    description: "Brake replacement procedure per Aircraft Maintenance Manual",
    complianceStatus: "pending",
    history: [],
  },
];

// ─── Loading skeleton ─────────────────────────────────────────────────────────

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
  const [signCardOpen, setSignCardOpen] = useState(false);
  const [findingOpen, setFindingOpen] = useState(false);
  const [handoffNote, setHandoffNote] = useState("");
  const [handoffSubmitting, setHandoffSubmitting] = useState(false);
  const addHandoffNote = useMutation(api.taskCards.addHandoffNote);

  // Vendor services state
  const [vendorServices, setVendorServices] = useState<AttachedVendorService[]>(INITIAL_VENDOR_SERVICES);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [updatingVendorSvcId, setUpdatingVendorSvcId] = useState<string | null>(null);
  const [vendorSvcUpdateStatus, setVendorSvcUpdateStatus] = useState<VendorServiceStatus>("planned");
  const [vendorSvcActualCost, setVendorSvcActualCost] = useState("");

  // Compliance section state
  const [complianceItems, setComplianceItems] = useState<TaskComplianceItem[]>(INITIAL_COMPLIANCE_ITEMS);
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

  const isLoading = !orgLoaded || taskCards === undefined;

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

  const pendingSteps = taskCard.steps.filter((s) => s.status === "pending");
  const completedCount = taskCard.steps.filter(
    (s) => s.status === "completed" || s.status === "na",
  ).length;
  const totalSteps = taskCard.steps.length;
  const allStepsDone = pendingSteps.length === 0 && totalSteps > 0;
  const cardIsComplete = taskCard.status === "complete";
  const cardIsVoided = taskCard.status === "voided";

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
          <div className="text-2xl font-bold font-mono text-foreground">
            {completedCount}
            <span className="text-base text-muted-foreground">
              /{totalSteps}
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground">steps done</p>
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
                onSignClick={setSignStepTarget}
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
                      {hn.technicianName}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(hn.createdAt).toLocaleString()}
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
              <Textarea
                value={handoffNote}
                onChange={(e) => setHandoffNote(e.target.value)}
                placeholder="Add a shift handoff note..."
                rows={2}
                className="text-xs bg-muted/30 border-border/60 resize-none flex-1"
                aria-label="Shift handoff note"
              />
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
                  } catch {
                    // Error will show in console; could add toast later
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
              onClick={() => setShowAddForm((prev) => !prev)}
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
                  onChange={(e) => setAddReference(e.target.value)}
                  placeholder="e.g. AD 2023-15-01"
                  className="text-xs h-8"
                />
              </div>
            </div>
            <div>
              <label className="text-[11px] text-muted-foreground mb-1 block">
                Description (optional)
              </label>
              <Textarea
                value={addDescription}
                onChange={(e) => setAddDescription(e.target.value)}
                placeholder="What must be complied with..."
                rows={2}
                className="text-xs bg-muted/30 border-border/60 resize-none"
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
              <Button
                size="sm"
                className="h-7 text-xs"
                disabled={!addReference.trim()}
                onClick={() => {
                  const newItem: TaskComplianceItem = {
                    id: `ci-${Date.now()}`,
                    referenceType: addRefType,
                    reference: addReference.trim(),
                    description: addDescription.trim() || undefined,
                    complianceStatus: "pending",
                    history: [],
                  };
                  setComplianceItems((prev) => [...prev, newItem]);
                  setShowAddForm(false);
                  setAddRefType("ad");
                  setAddReference("");
                  setAddDescription("");
                }}
              >
                Save
              </Button>
            </div>
          </div>
        )}

        {/* Items list */}
        {complianceItems.length === 0 ? (
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
                        onChange={(e) => setUpdateNotes(e.target.value)}
                        placeholder="Reason for status change..."
                        rows={2}
                        className="text-xs bg-muted/30 border-border/60 resize-none"
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
                        onClick={() => {
                          setComplianceItems((prev) =>
                            prev.map((ci) => {
                              if (ci.id !== item.id) return ci;
                              const historyEntry: ComplianceHistoryEntry = {
                                status: ci.complianceStatus,
                                notes: updateNotes.trim() || undefined,
                                changedByName: taskCard.assignedTechnicianName ?? "Current User",
                                changedAt: Date.now(),
                              };
                              return {
                                ...ci,
                                complianceStatus: updateStatus,
                                history: [historyEntry, ...ci.history],
                              };
                            }),
                          );
                          setUpdatingStatusId(null);
                          setUpdateNotes("");
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
                                {new Date(entry.changedAt).toLocaleString()}
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
        {vendorServices.length === 0 ? (
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
                        onClick={() => {
                          const costNum = vendorSvcActualCost.trim()
                            ? parseFloat(vendorSvcActualCost)
                            : undefined;
                          setVendorServices((prev) =>
                            prev.map((item) => {
                              if (item.id !== svc.id) return item;
                              return {
                                ...item,
                                status: vendorSvcUpdateStatus,
                                actualCost:
                                  vendorSvcUpdateStatus === "completed" && costNum !== undefined && !isNaN(costNum)
                                    ? costNum
                                    : item.actualCost,
                              };
                            }),
                          );
                          setUpdatingVendorSvcId(null);
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
        onAttach={(details: AttachmentDetails) => {
          const newSvc: AttachedVendorService = {
            id: `avs-${Date.now()}`,
            vendorId: details.vendorId,
            vendorName: details.vendorName,
            serviceName: details.serviceName,
            serviceType: details.serviceType,
            status: details.status,
            estimatedCost: details.estimatedCost,
            notes: details.notes,
          };
          setVendorServices((prev) => [...prev, newSvc]);
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
                    : allStepsDone
                    ? "All steps complete — ready for card-level sign-off."
                    : `Complete all ${pendingSteps.length} remaining step${
                        pendingSteps.length !== 1 ? "s" : ""
                      } before signing the card.`}
                </p>
              </div>

              {!cardIsComplete && orgId && techId && (
                <Button
                  variant={allStepsDone ? "default" : "outline"}
                  size="sm"
                  disabled={!allStepsDone}
                  className="gap-1.5 flex-shrink-0"
                  onClick={() => setSignCardOpen(true)}
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
          aircraftHours={0}
          taskCardTitle={taskCard.title}
        />
      )}
    </div>
  );
}
