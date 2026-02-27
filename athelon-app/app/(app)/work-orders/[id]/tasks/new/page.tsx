"use client";

import { useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import { useRouter } from "@/hooks/useRouter";
import { Link } from "react-router-dom";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import type { Id } from "@/convex/_generated/dataModel";
import {
  ArrowLeft,
  Plus,
  AlertCircle,
  Loader2,
  ClipboardList,
  LayoutTemplate,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TaskCardForm, type TaskType } from "./_components/TaskCardForm";
import { StepBuilder, type StepDraft } from "./_components/StepBuilder";

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

// ─── Template Picker Dialog ───────────────────────────────────────────────────

interface TemplatePickerProps {
  open: boolean;
  onClose: () => void;
  orgId: Id<"organizations">;
  onSelect: (tpl: {
    approvedDataSource: string;
    approvedDataRevision?: string;
    steps: StepDraft[];
  }) => void;
}

function TemplatePickerDialog({ open, onClose, orgId, onSelect }: TemplatePickerProps) {
  const templates = useQuery(
    api.gapFixes.listInspectionTemplates,
    orgId ? { organizationId: orgId } : "skip",
  );

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-[95vw] sm:max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <LayoutTemplate className="w-4 h-4 text-muted-foreground" />
            Load from Template
          </DialogTitle>
        </DialogHeader>

        {templates === undefined ? (
          <div className="py-8 text-center text-sm text-muted-foreground">Loading templates…</div>
        ) : templates.length === 0 ? (
          <div className="py-8 text-center">
            <LayoutTemplate className="w-7 h-7 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              No templates found.{" "}
              <Link to="/work-orders/templates" className="text-primary underline underline-offset-2">
                Create one first.
              </Link>
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {templates
              .filter((t) => t.active)
              .map((tpl) => (
                <button
                  key={tpl._id}
                  type="button"
                  className="w-full text-left p-3 rounded-lg border border-border/60 hover:bg-muted/20 hover:border-primary/30 transition-colors group"
                  onClick={() => {
                    onSelect({
                      approvedDataSource: tpl.approvedDataSource,
                      approvedDataRevision: tpl.approvedDataRevision,
                      steps: tpl.steps.map((s) => ({
                        id: crypto.randomUUID(),
                        description: s.description,
                        requiresSpecialTool: s.requiresSpecialTool,
                        specialToolReference: s.specialToolReference ?? "",
                        signOffRequired: s.signOffRequired,
                        signOffRequiresIa: s.signOffRequiresIa,
                      })),
                    });
                    onClose();
                  }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{tpl.name}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {tpl.inspectionType}
                        {(tpl.aircraftMake || tpl.aircraftModel) && (
                          <> · {[tpl.aircraftMake, tpl.aircraftModel].filter(Boolean).join(" ")}</>
                        )}
                      </p>
                      {tpl.approvedDataSource && (
                        <p className="text-[11px] text-muted-foreground/70 mt-0.5 truncate">
                          {tpl.approvedDataSource}
                          {tpl.approvedDataRevision && ` · Rev ${tpl.approvedDataRevision}`}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Badge variant="secondary" className="text-[10px]">
                        {tpl.steps.length} steps
                      </Badge>
                      <Check className="w-3.5 h-3.5 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                </button>
              ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function NewTaskCardPage() {
  const params = useParams();
  const router = useRouter();
  const workOrderId = params.id as string;
  const { orgId, isLoaded } = useCurrentOrg();

  // Form state
  const [taskCardNumber, setTaskCardNumber] = useState("");
  const [title, setTitle] = useState("");
  const [taskType, setTaskType] = useState<TaskType>("inspection");
  const [aircraftSystem, setAircraftSystem] = useState<string>("");
  const [isInspectionItem, setIsInspectionItem] = useState(false);
  const [approvedDataSource, setApprovedDataSource] = useState("");
  const [approvedDataRevision, setApprovedDataRevision] = useState("");
  const [assignedTechId, setAssignedTechId] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [steps, setSteps] = useState<StepDraft[]>([newStepDraft()]);
  // estimatedHours: tracked in UI but not passed to createTaskCard (not in mutation schema)
  const [estimatedHours, setEstimatedHours] = useState<string>("");

  const [templatePickerOpen, setTemplatePickerOpen] = useState(false);
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

  // ── Template load ────────────────────────────────────────────────────────────

  const handleTemplateLoad = useCallback(
    (tpl: { approvedDataSource: string; approvedDataRevision?: string; steps: StepDraft[] }) => {
      setApprovedDataSource(tpl.approvedDataSource);
      setApprovedDataRevision(tpl.approvedDataRevision ?? "");
      setSteps(tpl.steps.length > 0 ? tpl.steps : [newStepDraft()]);
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
      setSubmitError(
        err instanceof Error ? err.message : "Failed to create task card.",
      );
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
          <Link to="/work-orders">Back to Work Orders</Link>
        </Button>
      </div>
    );
  }

  const woData = wo.workOrder;
  const canAddCards =
    woData.status === "open" || woData.status === "in_progress";

  if (!canAddCards) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center">
        <AlertCircle className="w-8 h-8 text-amber-400/60 mx-auto mb-3" />
        <p className="text-sm font-medium text-foreground">
          Cannot add task cards
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Work order is in status &quot;{woData.status}&quot;. Task cards can
          only be added to open or in-progress work orders.
        </p>
        <Button asChild variant="outline" size="sm" className="mt-4">
          <Link to={`/work-orders/${workOrderId}`}>Back to Work Order</Link>
        </Button>
      </div>
    );
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <Button asChild variant="ghost" size="sm" className="h-8 gap-1.5 text-xs">
            <Link to={`/work-orders/${workOrderId}`}>
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

          {/* Load from Template button */}
          {orgId && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 text-xs border-primary/30 text-primary hover:bg-primary/5"
              onClick={() => setTemplatePickerOpen(true)}
            >
              <LayoutTemplate className="w-3.5 h-3.5" />
              Load from Template
            </Button>
          )}
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

        {/* Task Card Details Form */}
        <TaskCardForm
          taskCardNumber={taskCardNumber}
          onTaskCardNumberChange={setTaskCardNumber}
          title={title}
          onTitleChange={setTitle}
          taskType={taskType}
          onTaskTypeChange={setTaskType}
          aircraftSystem={aircraftSystem}
          onAircraftSystemChange={setAircraftSystem}
          isInspectionItem={isInspectionItem}
          onIsInspectionItemChange={setIsInspectionItem}
          approvedDataSource={approvedDataSource}
          onApprovedDataSourceChange={setApprovedDataSource}
          approvedDataRevision={approvedDataRevision}
          onApprovedDataRevisionChange={setApprovedDataRevision}
          assignedTechId={assignedTechId}
          onAssignedTechIdChange={setAssignedTechId}
          notes={notes}
          onNotesChange={setNotes}
          technicians={technicians}
        />

        {/* Estimated Hours (UI only — not in createTaskCard schema) */}
        <Card className="border-border/60">
          <CardContent className="p-4">
            <div className="max-w-[200px]">
              <Label htmlFor="estimatedHours" className="text-xs text-muted-foreground mb-1 block">
                Estimated hours
              </Label>
              <Input
                id="estimatedHours"
                type="number"
                min={0}
                step={0.5}
                value={estimatedHours}
                onChange={(e) => setEstimatedHours(e.target.value)}
                placeholder="e.g. 4"
                className="h-9 text-sm border-border/60"
              />
              <p className="text-[10px] text-muted-foreground/60 mt-1">
                For planning purposes only.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Steps */}
        <StepBuilder
          steps={steps}
          onAdd={addStep}
          onRemove={removeStep}
          onChange={updateStep}
        />

        {/* Error */}
        {submitError && (
          <Alert variant="destructive">
            <AlertCircle className="w-4 h-4" />
            <AlertDescription>{submitError}</AlertDescription>
          </Alert>
        )}

        {/* Actions */}
        <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-3 pb-8">
          <Button
            asChild
            variant="outline"
            size="sm"
            className="h-9 border-border/60"
          >
            <Link to={`/work-orders/${workOrderId}`}>Cancel</Link>
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

      {/* Template picker — outside form to avoid submit conflicts */}
      {orgId && (
        <TemplatePickerDialog
          open={templatePickerOpen}
          onClose={() => setTemplatePickerOpen(false)}
          orgId={orgId}
          onSelect={handleTemplateLoad}
        />
      )}
    </>
  );
}
