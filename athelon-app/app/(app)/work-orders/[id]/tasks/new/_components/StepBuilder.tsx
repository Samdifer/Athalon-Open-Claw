"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface StepDraft {
  id: string;
  description: string;
  requiresSpecialTool: boolean;
  specialToolReference: string;
  signOffRequired: boolean;
  signOffRequiresIa: boolean;
}

interface StepRowProps {
  step: StepDraft;
  index: number;
  totalSteps: number;
  onChange: (id: string, field: keyof StepDraft, value: string | boolean) => void;
  onRemove: (id: string) => void;
}

interface StepBuilderProps {
  steps: StepDraft[];
  onAdd: () => void;
  onRemove: (id: string) => void;
  onChange: (id: string, field: keyof StepDraft, value: string | boolean) => void;
}

// ─── Step Row ─────────────────────────────────────────────────────────────────

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
                onChange={(e) =>
                  onChange(step.id, "description", e.target.value)
                }
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
                <Label
                  htmlFor={`tool-${step.id}`}
                  className="text-xs cursor-pointer"
                >
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
                <Label
                  htmlFor={`sign-${step.id}`}
                  className="text-xs cursor-pointer"
                >
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
                <Label
                  htmlFor={`ia-${step.id}`}
                  className="text-xs cursor-pointer"
                >
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

// ─── Component ─────────────────────────────────────────────────────────────────

export function StepBuilder({ steps, onAdd, onRemove, onChange }: StepBuilderProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-foreground">
            Steps
            <Badge variant="secondary" className="ml-2 text-[10px] bg-muted">
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
          onClick={onAdd}
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
            onChange={onChange}
            onRemove={onRemove}
          />
        ))}
      </div>
    </div>
  );
}
