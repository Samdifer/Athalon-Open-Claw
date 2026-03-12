import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const _api = api as any;

export interface ConvexRoutingTemplate {
  _id: Id<"routingTemplates">;
  _creationTime: number;
  organizationId: string;
  name: string;
  description?: string;
  steps: Array<{ name: string; description?: string; estimatedHours: number }>;
  createdBy: string;
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
}

interface TemplateBuilderProps {
  selectedTemplate: ConvexRoutingTemplate | null;
}

export function TemplateBuilder({ selectedTemplate }: TemplateBuilderProps) {
  const updateTemplate = useMutation(_api.routingTemplates.updateTemplate) as (args: {
    templateId: Id<"routingTemplates">;
    steps: Array<{ name: string; description?: string; estimatedHours: number }>;
  }) => Promise<void>;

  const [pendingSteps, setPendingSteps] = useState<
    Array<{ name: string; description?: string; estimatedHours: number }>
  >([]);
  const [editingId, setEditingId] = useState<Id<"routingTemplates"> | null>(null);
  const [saving, setSaving] = useState(false);

  const activeTemplate = selectedTemplate;
  const isEditing = activeTemplate?._id === editingId;
  const displaySteps = isEditing ? pendingSteps : (activeTemplate?.steps ?? []);

  function startEditing() {
    if (!activeTemplate) return;
    setPendingSteps(activeTemplate.steps.map((s) => ({ ...s })));
    setEditingId(activeTemplate._id);
  }

  function cancelEditing() {
    setEditingId(null);
    setPendingSteps([]);
  }

  async function saveSteps() {
    if (!activeTemplate) return;
    setSaving(true);
    try {
      await updateTemplate({ templateId: activeTemplate._id, steps: pendingSteps });
      toast.success("Template steps saved.");
      setEditingId(null);
      setPendingSteps([]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save template.");
    } finally {
      setSaving(false);
    }
  }

  function addStep() {
    setPendingSteps((prev) => [
      ...prev,
      { name: "", description: undefined, estimatedHours: 1 },
    ]);
  }

  function removeStep(index: number) {
    setPendingSteps((prev) => prev.filter((_, i) => i !== index));
  }

  function moveStep(index: number, direction: "up" | "down") {
    setPendingSteps((prev) => {
      const swapIndex = direction === "up" ? index - 1 : index + 1;
      if (swapIndex < 0 || swapIndex >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
      return next;
    });
  }

  function patchStep(
    index: number,
    patch: Partial<{ name: string; description: string; estimatedHours: number }>,
  ) {
    setPendingSteps((prev) =>
      prev.map((step, i) => (i === index ? { ...step, ...patch } : step)),
    );
  }

  if (!activeTemplate) {
    return (
      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="text-base">Template Builder</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Select or create a template to start building routing task sequences.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Template Builder</CardTitle>
          {!isEditing ? (
            <Button type="button" size="sm" variant="outline" className="h-8" onClick={startEditing}>
              Edit Steps
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-8"
                onClick={cancelEditing}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                className="h-8"
                onClick={saveSteps}
                disabled={saving}
              >
                {saving ? "Saving…" : "Save"}
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Template Name</Label>
            <p className="text-sm font-medium">{activeTemplate.name || "Untitled template"}</p>
          </div>
          {activeTemplate.description && (
            <div className="space-y-1.5">
              <Label className="text-xs">Description</Label>
              <p className="text-sm text-muted-foreground">{activeTemplate.description}</p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Steps</p>
            <p className="text-xs text-muted-foreground">
              Ordered sequence applied during work order creation.
            </p>
          </div>
          {isEditing && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 gap-1"
              onClick={addStep}
            >
              <Plus className="h-3.5 w-3.5" />
              Add Step
            </Button>
          )}
        </div>

        <div className="space-y-2">
          {displaySteps.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">
              No steps in this template yet.{isEditing ? " Add a step above." : " Click Edit Steps to begin."}
            </p>
          ) : (
            displaySteps.map((step, index) => (
              <div key={index} className="rounded-md border border-border/60 p-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Badge variant="outline" className="text-[10px]">
                    Step {index + 1}
                  </Badge>
                  {isEditing && (
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => moveStep(index, "up")}
                        disabled={index === 0}
                        aria-label={`Move step ${index + 1} up`}
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => moveStep(index, "down")}
                        disabled={index === displaySteps.length - 1}
                        aria-label={`Move step ${index + 1} down`}
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-muted-foreground hover:text-red-500"
                        onClick={() => removeStep(index)}
                        aria-label={`Remove step ${index + 1}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </div>

                {isEditing ? (
                  <div className="grid gap-2 md:grid-cols-[2fr_1fr]">
                    <div className="space-y-1">
                      <Label className="text-[11px]">Step Name</Label>
                      <Input
                        value={step.name}
                        onChange={(e) => patchStep(index, { name: e.target.value })}
                        placeholder="Inspect magnetos"
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px]">Est. Hours</Label>
                      <Input
                        type="number"
                        min={0}
                        step={0.1}
                        value={step.estimatedHours}
                        onChange={(e) => {
                          const parsed = Number(e.target.value);
                          patchStep(index, {
                            estimatedHours: Number.isFinite(parsed) ? Math.max(0, parsed) : 0,
                          });
                        }}
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="space-y-1 md:col-span-2">
                      <Label className="text-[11px]">Description (optional)</Label>
                      <Input
                        value={step.description ?? ""}
                        onChange={(e) =>
                          patchStep(index, { description: e.target.value || undefined })
                        }
                        placeholder="Additional details"
                        className="h-8 text-sm"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm">{step.name || "Unnamed step"}</p>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {step.estimatedHours}h
                    </span>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
