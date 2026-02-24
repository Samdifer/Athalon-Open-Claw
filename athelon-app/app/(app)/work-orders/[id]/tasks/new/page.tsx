"use client";

import { useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import type { Id } from "@/convex/_generated/dataModel";
import {
  ArrowLeft,
  Plus,
  Trash2,
  AlertCircle,
  Loader2,
  ClipboardList,
  Wrench,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// ─── Types ────────────────────────────────────────────────────────────────────

type TaskType =
  | "inspection"
  | "repair"
  | "replacement"
  | "ad_compliance"
  | "functional_check"
  | "rigging"
  | "return_to_service"
  | "overhaul"
  | "modification";

const TASK_TYPE_OPTIONS: { value: TaskType; label: string }[] = [
  { value: "inspection", label: "Inspection" },
  { value: "repair", label: "Repair" },
  { value: "replacement", label: "Replacement" },
  { value: "ad_compliance", label: "AD Compliance" },
  { value: "functional_check", label: "Functional Check" },
  { value: "rigging", label: "Rigging" },
  { value: "return_to_service", label: "Return to Service" },
  { value: "overhaul", label: "Overhaul" },
  { value: "modification", label: "Modification" },
];

interface StepDraft {
  id: string; // local draft ID for React key
  description: string;
  requiresSpecialTool: boolean;
  specialToolReference: string;
  signOffRequired: boolean;
  signOffRequiresIa: boolean;
}

function newStepDraft(): StepDraft {
  return {
    id: crypto.randomUUID(),
    description: "",
    requiresSpecialTool: false,
    specialToolReference: "",
    signOffRequired: true,
    signOffRequiresIa: false,
  };
}

// ─── Step Row ─────────────────────────────────────────────────────────────────

interface StepRowProps {
  step: StepDraft;
  index: number;
  totalSteps: number;
  onChange: (id: string, field: keyof StepDraft, value: string | boolean) => void;
  onRemove: (id: string) => void;
}

function StepRow({ step, index, totalSteps, onChange, onRemove }: StepRowProps) {
  const stepNum = index + 1;
  return (
    <Card className="border-border/50 bg-muted/20">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {/* Step number badge */}
          <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center mt-0.5">
            <span className="text-xs font-bold text-primary">{stepNum}</span>
          </div>

          <div className="flex-1 space-y-3">
            {/* Description */}
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">
                Step description <span className="text-destructive">*</span>
              </Label>
              <Textarea
                value={step.description}
                onChange={(e) => onChange(step.id, "description", e.target.value)}
                placeholder="Describe the maintenance action for this step…"
                className="min-h-[72px] text-sm bg-background border-border/60 resize-none"
              />
            </div>

            {/* Toggles row */}
            <div className="flex flex-wrap gap-4">
              {/* Special tool */}
              <div className="flex items-center gap-2">
                <input
                  id={`tool-${step.id}`}
                  type="checkbox"
                  className="rounded border-border"
                  checked={step.requiresSpecialTool}
                  onChange={(e) =>
                    onChange(step.id, "requiresSpecialTool", e.target.checked)
                  }
                />
                <Label htmlFor={`tool-${step.id}`} className="text-xs cursor-pointer">
                  Requires special tool
                </Label>
              </div>

              {/* Sign-off required */}
              <div className="flex items-center gap-2">
                <input
                  id={`sign-${step.id}`}
                  type="checkbox"
                  className="rounded border-border"
                  checked={step.signOffRequired}
                  onChange={(e) =>
                    onChange(step.id, "signOffRequired", e.target.checked)
                  }
                />
                <Label htmlFor={`sign-${step.id}`} className="text-xs cursor-pointer">
                  Sign-off required
                </Label>
              </div>

              {/* IA required */}
              <div className="flex items-center gap-2">
                <input
                  id={`ia-${step.id}`}
                  type="checkbox"
                  className="rounded border-border"
                  checked={step.signOffRequiresIa}
                  onChange={(e) =>
                    onChange(step.id, "signOffRequiresIa", e.target.checked)
                  }
                />
                <Label htmlFor={`ia-${step.id}`} className="text-xs cursor-pointer">
                  IA sign-off required
                </Label>
              </div>
            </div>

            {/* Special tool ref */}
            {step.requiresSpecialTool && (
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">
                  Tool reference / P/N
                </Label>
                <Input
                  value={step.specialToolReference}
                  onChange={(e) =>
                    onChange(step.id, "specialToolReference", e.target.value)
                  }
                  placeholder="e.g. Torque wrench — 0-50 ft-lb"
                  className="h-8 text-sm border-border/60 bg-background"
                />
              </div>
            )}
          </div>

          {/* Remove button */}
          {totalSteps > 1 && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 flex-shrink-0 text-muted-foreground hover:text-destructive"
              onClick={() => onRemove(step.id)}
              title="Remove step"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function NewTaskCardPage() {
  const params = useParams();
  const router = useRouter();
  const workOrderId = params.id as string;
  const { orgId, techId, isLoaded } = useCurrentOrg();

  // Form state
  const [taskCardNumber, setTaskCardNumber] = useState("");
  const [title, setTitle] = useState("");
  const [taskType, setTaskType] = useState<TaskType>("inspection");
  const [approvedDataSource, setApprovedDataSource] = useState("");
  const [approvedDataRevision, setApprovedDataRevision] = useState("");
  const [assignedTechId, setAssignedTechId] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [steps, setSteps] = useState<StepDraft[]>([newStepDraft()]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Load work order info
  const wo = useQuery(
    api.workOrders.getWorkOrder,
    orgId && workOrderId
      ? { workOrderId: workOrderId as Id<"workOrders">, organizationId: orgId }
      : "skip",
  );

  // Load technicians for assignment dropdown
  const technicians = useQuery(
    api.technicians.list,
    orgId ? { organizationId: orgId } : "skip",
  );

  const createTaskCard = useMutation(api.taskCards.createTaskCard);

  // ── Step management ─────────────────────────────────────────────────────────

  const addStep = useCallback(() => {
    setSteps((prev) => [...prev, newStepDraft()]);
  }, []);

  const removeStep = useCallback((id: string) => {
    setSteps((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const updateStep = useCallback(
    (id: string, field: keyof StepDraft, value: string | boolean) => {
      setSteps((prev) =>
        prev.map((s) => (s.id === id ? { ...s, [field]: value } : s)),
      );
    },
    [],
  );

  // ── Validation ──────────────────────────────────────────────────────────────

  function validate(): string | null {
    if (!taskCardNumber.trim()) return "Task card number is required.";
    if (!title.trim()) return "Title is required.";
    if (!approvedDataSource.trim())
      return "Approved data source is required (14 CFR 43.9(a)(1)).";
    for (let i = 0; i < steps.length; i++) {
      if (!steps[i].description.trim())
        return `Step ${i + 1} description is required.`;
    }
    return null;
  }

  // ── Submit ──────────────────────────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    const err = validate();
    if (err) {
      setSubmitError(err);
      return;
    }
    if (!orgId) {
      setSubmitError("Organization not loaded. Please wait and try again.");
      return;
    }

    setIsSubmitting(true);

    try {
      const cardId = await createTaskCard({
        workOrderId: workOrderId as Id<"workOrders">,
        organizationId: orgId,
        taskCardNumber: taskCardNumber.trim(),
        title: title.trim(),
        taskType,
        approvedDataSource: approvedDataSource.trim(),
        approvedDataRevision: approvedDataRevision.trim() || undefined,
        assignedToTechnicianId: assignedTechId
          ? (assignedTechId as Id<"technicians">)
          : undefined,
        notes: notes.trim() || undefined,
        steps: steps.map((s, i) => ({
          stepNumber: i + 1,
          description: s.description.trim(),
          requiresSpecialTool: s.requiresSpecialTool,
          specialToolReference: s.specialToolReference.trim() || undefined,
          signOffRequired: s.signOffRequired,
          signOffRequiresIa: s.signOffRequiresIa,
        })),
      });

      router.push(`/work-orders/${workOrderId}/tasks/${cardId}`);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Failed to create task card.");
      setIsSubmitting(false);
    }
  }

  // ── Loading state ────────────────────────────────────────────────────────────

  if (!isLoaded || wo === undefined) {
    return (
      <div className="space-y-4 max-w-2xl mx-auto">
        <div className="h-8 w-48 bg-muted/40 rounded animate-pulse" />
        <div className="h-64 bg-muted/20 rounded animate-pulse" />
      </div>
    );
  }

  if (wo === null) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center">
        <AlertCircle className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">Work order not found.</p>
        <Button asChild variant="outline" size="sm" className="mt-4">
          <Link href="/work-orders">Back to Work Orders</Link>
        </Button>
      </div>
    );
  }

  const woData = wo.workOrder;
  const canAddCards = woData.status === "open" || woData.status === "in_progress";

  if (!canAddCards) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center">
        <AlertCircle className="w-8 h-8 text-amber-400/60 mx-auto mb-3" />
        <p className="text-sm font-medium text-foreground">
          Cannot add task cards
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Work order is in status &quot;{woData.status}&quot;. Task cards can only be added
          to open or in-progress work orders.
        </p>
        <Button asChild variant="outline" size="sm" className="mt-4">
          <Link href={`/work-orders/${workOrderId}`}>Back to Work Order</Link>
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="sm" className="h-8 gap-1.5 text-xs">
          <Link href={`/work-orders/${workOrderId}`}>
            <ArrowLeft className="w-3.5 h-3.5" />
            Back
          </Link>
        </Button>
        <Separator orientation="vertical" className="h-4" />
        <div className="flex-1">
          <h1 className="text-base font-semibold text-foreground flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-muted-foreground" />
            New Task Card
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            WO {woData.workOrderNumber} ·{" "}
            {wo.aircraft?.currentRegistration ?? "Unknown"}
          </p>
        </div>
      </div>

      {/* Work order context */}
      <Card className="border-border/60 bg-muted/10">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="text-[10px] border-border/50">
              {woData.workOrderType.replace(/_/g, " ")}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {woData.description}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Card info */}
      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Wrench className="w-4 h-4 text-muted-foreground" />
            Task Card Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="tcNumber" className="text-xs text-muted-foreground mb-1 block">
                Card number <span className="text-destructive">*</span>
              </Label>
              <Input
                id="tcNumber"
                value={taskCardNumber}
                onChange={(e) => setTaskCardNumber(e.target.value)}
                placeholder="e.g. TC-001, INSP-A01"
                className="h-9 text-sm border-border/60"
              />
            </div>
            <div>
              <Label htmlFor="taskType" className="text-xs text-muted-foreground mb-1 block">
                Task type <span className="text-destructive">*</span>
              </Label>
              <Select
                value={taskType}
                onValueChange={(v) => setTaskType(v as TaskType)}
              >
                <SelectTrigger id="taskType" className="h-9 text-sm border-border/60">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TASK_TYPE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="title" className="text-xs text-muted-foreground mb-1 block">
              Title <span className="text-destructive">*</span>
            </Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Annual Inspection — Airframe"
              className="h-9 text-sm border-border/60"
            />
          </div>

          {/* Approved data source */}
          <div>
            <Label
              htmlFor="approvedData"
              className="text-xs text-muted-foreground mb-1 block"
            >
              Approved data source{" "}
              <span className="text-destructive">*</span>
              <span className="text-muted-foreground/70 ml-1">(14 CFR 43.9(a)(1))</span>
            </Label>
            <Input
              id="approvedData"
              value={approvedDataSource}
              onChange={(e) => setApprovedDataSource(e.target.value)}
              placeholder='e.g. "AMM 27-20-00 Rev 15" or "FAA AD 2024-15-07"'
              className="h-9 text-sm border-border/60"
            />
            <div className="flex items-start gap-1.5 mt-1.5">
              <Info className="w-3 h-3 text-sky-400 flex-shrink-0 mt-0.5" />
              <p className="text-[11px] text-muted-foreground">
                Must reference approved maintenance data. Acceptable formats:{" "}
                <span className="text-foreground/70">AMM XX-XX-XX</span>,{" "}
                <span className="text-foreground/70">FAA AD YYYY-NN-NN</span>,{" "}
                <span className="text-foreground/70">SB XXXX-XXX</span>,{" "}
                <span className="text-foreground/70">AC 43.13-1B</span>
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label
                htmlFor="dataRevision"
                className="text-xs text-muted-foreground mb-1 block"
              >
                Revision / issue
              </Label>
              <Input
                id="dataRevision"
                value={approvedDataRevision}
                onChange={(e) => setApprovedDataRevision(e.target.value)}
                placeholder="e.g. Rev 15, Issue 3"
                className="h-9 text-sm border-border/60"
              />
            </div>
            <div>
              <Label
                htmlFor="assignedTech"
                className="text-xs text-muted-foreground mb-1 block"
              >
                Assigned technician
              </Label>
              <Select
                value={assignedTechId}
                onValueChange={setAssignedTechId}
              >
                <SelectTrigger
                  id="assignedTech"
                  className="h-9 text-sm border-border/60"
                >
                  <SelectValue placeholder="Unassigned" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Unassigned</SelectItem>
                  {(technicians ?? [])
                    .filter((t) => t.status === "active")
                    .map((t) => (
                      <SelectItem key={t._id} value={t._id}>
                        {t.legalName}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label
              htmlFor="notes"
              className="text-xs text-muted-foreground mb-1 block"
            >
              Notes
            </Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional context, cautions, or references…"
              className="min-h-[64px] text-sm border-border/60 resize-none"
            />
          </div>
        </CardContent>
      </Card>

      {/* Steps */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-foreground">
              Steps
              <Badge
                variant="secondary"
                className="ml-2 text-[10px] bg-muted"
              >
                {steps.length}
              </Badge>
            </h2>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              At least one step is required. Steps must be completed in order.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addStep}
            className="h-8 gap-1.5 text-xs border-border/60"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Step
          </Button>
        </div>

        <div className="space-y-2">
          {steps.map((step, i) => (
            <StepRow
              key={step.id}
              step={step}
              index={i}
              totalSteps={steps.length}
              onChange={updateStep}
              onRemove={removeStep}
            />
          ))}
        </div>
      </div>

      {/* Error */}
      {submitError && (
        <Alert variant="destructive">
          <AlertCircle className="w-4 h-4" />
          <AlertDescription>{submitError}</AlertDescription>
        </Alert>
      )}

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pb-8">
        <Button asChild variant="outline" size="sm" className="h-9 border-border/60">
          <Link href={`/work-orders/${workOrderId}`}>Cancel</Link>
        </Button>
        <Button
          type="submit"
          size="sm"
          className="h-9 min-w-[140px]"
          disabled={isSubmitting || !isLoaded}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
              Creating…
            </>
          ) : (
            <>
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              Create Task Card
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
