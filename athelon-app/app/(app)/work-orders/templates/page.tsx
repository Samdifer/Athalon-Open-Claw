"use client";

import { useState, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import type { Id } from "@/convex/_generated/dataModel";
import {
  Plus,
  LayoutTemplate,
  ChevronUp,
  ChevronDown,
  Trash2,
  Loader2,
  AlertCircle,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface StepDraft {
  id: string;
  description: string;
  requiresSpecialTool: boolean;
  specialToolReference: string;
  signOffRequired: boolean;
  signOffRequiresIa: boolean;
  estimatedDurationMinutes: string;
  zoneReference: string;
}

function newStep(): StepDraft {
  return {
    id: crypto.randomUUID(),
    description: "",
    requiresSpecialTool: false,
    specialToolReference: "",
    signOffRequired: true,
    signOffRequiresIa: false,
    estimatedDurationMinutes: "",
    zoneReference: "",
  };
}

// ─── Step Row ──────────────────────────────────────────────────────────────────

interface StepRowProps {
  step: StepDraft;
  index: number;
  total: number;
  onChange: (id: string, field: keyof StepDraft, value: string | boolean) => void;
  onRemove: (id: string) => void;
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
}

function TemplateStepRow({ step, index, total, onChange, onRemove, onMoveUp, onMoveDown }: StepRowProps) {
  return (
    <Card className="border-border/50 bg-muted/10">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {/* Number + reorder */}
          <div className="flex flex-col items-center gap-1 flex-shrink-0">
            <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-xs font-bold text-primary">{index + 1}</span>
            </div>
            <button
              type="button"
              onClick={() => onMoveUp(step.id)}
              disabled={index === 0}
              className="p-0.5 rounded hover:bg-muted disabled:opacity-30"
              aria-label="Move step up"
            >
              <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
            <button
              type="button"
              onClick={() => onMoveDown(step.id)}
              disabled={index === total - 1}
              className="p-0.5 rounded hover:bg-muted disabled:opacity-30"
              aria-label="Move step down"
            >
              <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          </div>

          <div className="flex-1 space-y-3">
            {/* Description */}
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">
                Description <span className="text-destructive">*</span>
              </Label>
              <Textarea
                value={step.description}
                onChange={(e) => onChange(step.id, "description", e.target.value)}
                placeholder="Describe the maintenance action…"
                className="min-h-[60px] text-sm border-border/60 resize-none"
              />
            </div>

            {/* Row: checkboxes */}
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <Checkbox
                  id={`tool-${step.id}`}
                  checked={step.requiresSpecialTool}
                  onCheckedChange={(v) => onChange(step.id, "requiresSpecialTool", Boolean(v))}
                />
                <Label htmlFor={`tool-${step.id}`} className="text-xs cursor-pointer">
                  Special tool required
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id={`sign-${step.id}`}
                  checked={step.signOffRequired}
                  onCheckedChange={(v) => onChange(step.id, "signOffRequired", Boolean(v))}
                />
                <Label htmlFor={`sign-${step.id}`} className="text-xs cursor-pointer">
                  Sign-off required
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id={`ia-${step.id}`}
                  checked={step.signOffRequiresIa}
                  onCheckedChange={(v) => onChange(step.id, "signOffRequiresIa", Boolean(v))}
                />
                <Label htmlFor={`ia-${step.id}`} className="text-xs cursor-pointer">
                  IA required
                </Label>
              </div>
            </div>

            {/* Conditional: special tool ref */}
            {step.requiresSpecialTool && (
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">
                  Tool reference / P/N
                </Label>
                <Input
                  value={step.specialToolReference}
                  onChange={(e) => onChange(step.id, "specialToolReference", e.target.value)}
                  placeholder="e.g. Torque wrench 0–50 ft-lb"
                  className="h-8 text-sm border-border/60"
                />
              </div>
            )}

            {/* Est. duration + zone */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">
                  Est. duration (min)
                </Label>
                <Input
                  type="number"
                  min={1}
                  value={step.estimatedDurationMinutes}
                  onChange={(e) => onChange(step.id, "estimatedDurationMinutes", e.target.value)}
                  placeholder="e.g. 30"
                  className="h-8 text-sm border-border/60"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">
                  Zone reference
                </Label>
                <Input
                  value={step.zoneReference}
                  onChange={(e) => onChange(step.id, "zoneReference", e.target.value)}
                  placeholder="e.g. Zone 100"
                  className="h-8 text-sm border-border/60"
                />
              </div>
            </div>
          </div>

          {/* Remove */}
          {total > 1 && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 flex-shrink-0 text-muted-foreground hover:text-destructive"
              onClick={() => onRemove(step.id)}
              aria-label="Remove step"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Create Template Dialog ────────────────────────────────────────────────────

interface CreateTemplateDialogProps {
  open: boolean;
  onClose: () => void;
  orgId: Id<"organizations">;
}

function CreateTemplateDialog({ open, onClose, orgId }: CreateTemplateDialogProps) {
  const createTemplate = useMutation(api.gapFixes.createInspectionTemplate);

  const [name, setName] = useState("");
  const [aircraftMake, setAircraftMake] = useState("");
  const [aircraftModel, setAircraftModel] = useState("");
  const [inspectionType, setInspectionType] = useState("");
  const [approvedDataSource, setApprovedDataSource] = useState("");
  const [approvedDataRevision, setApprovedDataRevision] = useState("");
  const [steps, setSteps] = useState<StepDraft[]>([newStep()]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function resetForm() {
    setName("");
    setAircraftMake("");
    setAircraftModel("");
    setInspectionType("");
    setApprovedDataSource("");
    setApprovedDataRevision("");
    setSteps([newStep()]);
    setError(null);
  }

  function handleClose() {
    resetForm();
    onClose();
  }

  const addStep = useCallback(() => setSteps((p) => [...p, newStep()]), []);

  const removeStep = useCallback(
    (id: string) => setSteps((p) => p.filter((s) => s.id !== id)),
    [],
  );

  const updateStep = useCallback(
    (id: string, field: keyof StepDraft, value: string | boolean) =>
      setSteps((p) => p.map((s) => (s.id === id ? { ...s, [field]: value } : s))),
    [],
  );

  const moveUp = useCallback((id: string) => {
    setSteps((p) => {
      const idx = p.findIndex((s) => s.id === id);
      if (idx <= 0) return p;
      const next = [...p];
      [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
      return next;
    });
  }, []);

  const moveDown = useCallback((id: string) => {
    setSteps((p) => {
      const idx = p.findIndex((s) => s.id === id);
      if (idx < 0 || idx === p.length - 1) return p;
      const next = [...p];
      [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
      return next;
    });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim()) { setError("Template name is required."); return; }
    if (!inspectionType.trim()) { setError("Inspection type is required."); return; }
    if (!approvedDataSource.trim()) { setError("Approved data source is required."); return; }
    for (let i = 0; i < steps.length; i++) {
      if (!steps[i].description.trim()) {
        setError(`Step ${i + 1} description is required.`);
        return;
      }
    }

    setSubmitting(true);
    try {
      await createTemplate({
        organizationId: orgId,
        name: name.trim(),
        aircraftMake: aircraftMake.trim() || undefined,
        aircraftModel: aircraftModel.trim() || undefined,
        inspectionType: inspectionType.trim(),
        approvedDataSource: approvedDataSource.trim(),
        approvedDataRevision: approvedDataRevision.trim() || undefined,
        steps: steps.map((s, i) => ({
          stepNumber: i + 1,
          description: s.description.trim(),
          requiresSpecialTool: s.requiresSpecialTool,
          specialToolReference: s.specialToolReference.trim() || undefined,
          signOffRequired: s.signOffRequired,
          signOffRequiresIa: s.signOffRequiresIa,
          estimatedDurationMinutes: s.estimatedDurationMinutes
            ? parseInt(s.estimatedDurationMinutes, 10)
            : undefined,
          zoneReference: s.zoneReference.trim() || undefined,
        })),
      });
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create template.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LayoutTemplate className="w-4 h-4 text-muted-foreground" />
            New Inspection Template
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Header fields */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label className="text-xs text-muted-foreground mb-1 block">
                Template name <span className="text-destructive">*</span>
              </Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Annual 100-Hour Inspection"
                className="h-9 text-sm border-border/60"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">
                Aircraft make
              </Label>
              <Input
                value={aircraftMake}
                onChange={(e) => setAircraftMake(e.target.value)}
                placeholder="e.g. Cessna"
                className="h-9 text-sm border-border/60"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">
                Aircraft model
              </Label>
              <Input
                value={aircraftModel}
                onChange={(e) => setAircraftModel(e.target.value)}
                placeholder="e.g. 172SP"
                className="h-9 text-sm border-border/60"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">
                Inspection type <span className="text-destructive">*</span>
              </Label>
              <Input
                value={inspectionType}
                onChange={(e) => setInspectionType(e.target.value)}
                placeholder="e.g. Annual, 100-Hour, AD"
                className="h-9 text-sm border-border/60"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">
                Approved data revision
              </Label>
              <Input
                value={approvedDataRevision}
                onChange={(e) => setApprovedDataRevision(e.target.value)}
                placeholder="e.g. Rev 15"
                className="h-9 text-sm border-border/60"
              />
            </div>
            <div className="col-span-2">
              <Label className="text-xs text-muted-foreground mb-1 block">
                Approved data source <span className="text-destructive">*</span>
              </Label>
              <Input
                value={approvedDataSource}
                onChange={(e) => setApprovedDataSource(e.target.value)}
                placeholder='e.g. AMM 05-10-00 Rev 15 or FAA AC 43.13-1B'
                className="h-9 text-sm border-border/60"
              />
            </div>
          </div>

          {/* Steps section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-foreground">
                  Steps
                  <Badge variant="secondary" className="ml-2 text-[10px]">
                    {steps.length}
                  </Badge>
                </h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  At least one step is required.
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
                <TemplateStepRow
                  key={step.id}
                  step={step}
                  index={i}
                  total={steps.length}
                  onChange={updateStep}
                  onRemove={removeStep}
                  onMoveUp={moveUp}
                  onMoveDown={moveDown}
                />
              ))}
            </div>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="w-4 h-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" size="sm" onClick={handleClose} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={submitting} className="min-w-[140px]">
              {submitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  Creating…
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5 mr-1.5" />
                  Create Template
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function TemplatesPage() {
  const { orgId, isLoaded } = useCurrentOrg();
  const [dialogOpen, setDialogOpen] = useState(false);

  const templates = useQuery(
    api.gapFixes.listInspectionTemplates,
    orgId ? { organizationId: orgId } : "skip",
  );

  const isLoading = !isLoaded || templates === undefined;

  return (
    <div className="space-y-5">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <LayoutTemplate className="w-5 h-5 text-muted-foreground" />
            Inspection Templates
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Reusable step libraries for task card creation.
          </p>
        </div>
        {orgId && (
          <Button
            size="sm"
            className="h-9 gap-1.5"
            onClick={() => setDialogOpen(true)}
          >
            <Plus className="w-3.5 h-3.5" />
            New Template
          </Button>
        )}
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-2" role="status" aria-label="Loading">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-14 rounded-lg" />
          ))}
        </div>
      ) : !templates || templates.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-center border border-dashed border-border/50 rounded-lg">
          <LayoutTemplate className="w-8 h-8 text-muted-foreground/40" />
          <div>
            <p className="text-sm font-medium text-foreground">No templates yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Create your first inspection template to speed up task card creation.
            </p>
          </div>
          {orgId && (
            <Button
              variant="outline"
              size="sm"
              className="mt-2 gap-1.5"
              onClick={() => setDialogOpen(true)}
            >
              <Plus className="w-3.5 h-3.5" />
              New Template
            </Button>
          )}
        </div>
      ) : (
        <div className="rounded-lg border border-border/60 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/20">
                <TableHead className="text-xs font-semibold text-muted-foreground">Name</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground">Aircraft</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground">Inspection Type</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground text-center">Steps</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {templates.map((tpl) => (
                <TableRow key={tpl._id} className="hover:bg-muted/10">
                  <TableCell className="font-medium text-sm text-foreground">
                    {tpl.name}
                    {tpl.approvedDataSource && (
                      <p className="text-[11px] text-muted-foreground font-normal mt-0.5">
                        {tpl.approvedDataSource}
                        {tpl.approvedDataRevision && ` · Rev ${tpl.approvedDataRevision}`}
                      </p>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {tpl.aircraftMake && tpl.aircraftModel
                      ? `${tpl.aircraftMake} ${tpl.aircraftModel}`
                      : tpl.aircraftMake ?? tpl.aircraftModel ?? "—"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {tpl.inspectionType}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="secondary" className="text-xs tabular-nums">
                      {tpl.steps.length}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {tpl.active ? (
                      <div className="flex items-center gap-1.5 text-green-400">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span className="text-xs font-medium">Active</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <XCircle className="w-3.5 h-3.5" />
                        <span className="text-xs font-medium">Inactive</span>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Dialog */}
      {orgId && (
        <CreateTemplateDialog
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          orgId={orgId}
        />
      )}
    </div>
  );
}
