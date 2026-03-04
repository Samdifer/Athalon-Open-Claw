"use client";

import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export type RoutingTrainingType =
  | "airframe"
  | "powerplant"
  | "inspection"
  | "ndt"
  | "borescope";

export interface RoutingTemplateTaskCard {
  id: string;
  title: string;
  estimatedHours: number;
  requiredTraining: RoutingTrainingType[];
  standardMinutes: number;
}

export interface RoutingTemplate {
  id: string;
  name: string;
  aircraftType: string;
  inspectionType: string;
  taskCards: RoutingTemplateTaskCard[];
  updatedAt: number;
}

const STORAGE_PREFIX = "athelon:routing-templates";

const TRAINING_OPTIONS: Array<{ value: RoutingTrainingType; label: string }> = [
  { value: "airframe", label: "Airframe" },
  { value: "powerplant", label: "Powerplant" },
  { value: "inspection", label: "IA Inspection" },
  { value: "ndt", label: "NDT" },
  { value: "borescope", label: "Borescope" },
];

function defaultTaskCard(): RoutingTemplateTaskCard {
  return {
    id: `card-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title: "",
    estimatedHours: 1,
    requiredTraining: [],
    standardMinutes: 60,
  };
}

export function routingTemplatesStorageKey(orgId: string): string {
  return `${STORAGE_PREFIX}:${orgId}`;
}

export function loadRoutingTemplatesFromStorage(orgId?: string): RoutingTemplate[] {
  if (!orgId || typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(routingTemplatesStorageKey(orgId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as RoutingTemplate[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function persistRoutingTemplatesToStorage(
  orgId: string | undefined,
  templates: RoutingTemplate[],
): void {
  if (!orgId || typeof window === "undefined") return;
  window.localStorage.setItem(
    routingTemplatesStorageKey(orgId),
    JSON.stringify(templates),
  );
}

interface TemplateBuilderProps {
  orgId?: string;
  selectedTemplateId: string | null;
  templates: RoutingTemplate[];
  onTemplatesChange: (next: RoutingTemplate[]) => void;
}

export function TemplateBuilder({
  orgId,
  selectedTemplateId,
  templates,
  onTemplatesChange,
}: TemplateBuilderProps) {
  const selectedTemplate = templates.find((template) => template.id === selectedTemplateId) ?? null;

  function commit(next: RoutingTemplate[]) {
    onTemplatesChange(next);
    persistRoutingTemplatesToStorage(orgId, next);
  }

  function patchSelectedTemplate(patch: (template: RoutingTemplate) => RoutingTemplate) {
    if (!selectedTemplate) return;
    const now = Date.now();
    const next = templates.map((template) =>
      template.id === selectedTemplate.id
        ? {
            ...patch(template),
            updatedAt: now,
          }
        : template,
    );
    commit(next);
  }

  function patchTaskCard(
    taskCardId: string,
    patch: (taskCard: RoutingTemplateTaskCard) => RoutingTemplateTaskCard,
  ) {
    patchSelectedTemplate((template) => ({
      ...template,
      taskCards: template.taskCards.map((taskCard) =>
        taskCard.id === taskCardId ? patch(taskCard) : taskCard,
      ),
    }));
  }

  function moveTaskCard(taskCardId: string, direction: "up" | "down") {
    patchSelectedTemplate((template) => {
      const index = template.taskCards.findIndex((taskCard) => taskCard.id === taskCardId);
      if (index < 0) return template;

      const swapIndex = direction === "up" ? index - 1 : index + 1;
      if (swapIndex < 0 || swapIndex >= template.taskCards.length) return template;

      const reordered = [...template.taskCards];
      [reordered[index], reordered[swapIndex]] = [reordered[swapIndex], reordered[index]];
      return {
        ...template,
        taskCards: reordered,
      };
    });
  }

  function toggleTraining(taskCardId: string, value: RoutingTrainingType) {
    patchTaskCard(taskCardId, (taskCard) => {
      const hasValue = taskCard.requiredTraining.includes(value);
      return {
        ...taskCard,
        requiredTraining: hasValue
          ? taskCard.requiredTraining.filter((item) => item !== value)
          : [...taskCard.requiredTraining, value],
      };
    });
  }

  if (!selectedTemplate) {
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
        <CardTitle className="text-base">Template Builder</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Template Name</Label>
            <Input
              value={selectedTemplate.name}
              onChange={(event) => {
                const value = event.target.value;
                patchSelectedTemplate((template) => ({
                  ...template,
                  name: value,
                }));
              }}
              placeholder="Annual Cessna 172"
              className="h-8 text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Aircraft Type Applicability</Label>
            <Input
              value={selectedTemplate.aircraftType}
              onChange={(event) => {
                const value = event.target.value;
                patchSelectedTemplate((template) => ({
                  ...template,
                  aircraftType: value,
                }));
              }}
              placeholder="C172, PA-28"
              className="h-8 text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Inspection Type</Label>
            <Input
              value={selectedTemplate.inspectionType}
              onChange={(event) => {
                const value = event.target.value;
                patchSelectedTemplate((template) => ({
                  ...template,
                  inspectionType: value,
                }));
              }}
              placeholder="100-hour"
              className="h-8 text-sm"
            />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Task Cards</p>
            <p className="text-xs text-muted-foreground">
              Ordered sequence used during work order creation.
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 gap-1"
            onClick={() => {
              patchSelectedTemplate((template) => ({
                ...template,
                taskCards: [...template.taskCards, defaultTaskCard()],
              }));
            }}
          >
            <Plus className="h-3.5 w-3.5" />
            Add Card
          </Button>
        </div>

        <div className="space-y-2">
          {selectedTemplate.taskCards.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">
              No task cards in this template yet.
            </p>
          ) : (
            selectedTemplate.taskCards.map((taskCard, index) => {
              const selectedTrainingLabels = TRAINING_OPTIONS
                .filter((option) => taskCard.requiredTraining.includes(option.value))
                .map((option) => option.label);

              return (
                <div key={taskCard.id} className="rounded-md border border-border/60 p-3 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant="outline" className="text-[10px]">
                      Card {index + 1}
                    </Badge>
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => moveTaskCard(taskCard.id, "up")}
                        disabled={index === 0}
                        aria-label={`Move card ${index + 1} up`}
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => moveTaskCard(taskCard.id, "down")}
                        disabled={index === selectedTemplate.taskCards.length - 1}
                        aria-label={`Move card ${index + 1} down`}
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-muted-foreground hover:text-red-500"
                        onClick={() => {
                          patchSelectedTemplate((template) => ({
                            ...template,
                            taskCards: template.taskCards.filter((item) => item.id !== taskCard.id),
                          }));
                        }}
                        aria-label={`Remove card ${index + 1}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  <div className="grid gap-2 md:grid-cols-[2fr_1fr_1.2fr_1fr]">
                    <div className="space-y-1">
                      <Label className="text-[11px]">Title</Label>
                      <Input
                        value={taskCard.title}
                        onChange={(event) => {
                          const value = event.target.value;
                          patchTaskCard(taskCard.id, (current) => ({
                            ...current,
                            title: value,
                          }));
                        }}
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
                        value={taskCard.estimatedHours}
                        onChange={(event) => {
                          const parsed = Number(event.target.value);
                          patchTaskCard(taskCard.id, (current) => ({
                            ...current,
                            estimatedHours: Number.isFinite(parsed) ? Math.max(0, parsed) : 0,
                          }));
                        }}
                        className="h-8 text-sm"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-[11px]">Required Training</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button type="button" variant="outline" className="h-8 w-full justify-start text-xs">
                            {selectedTrainingLabels.length > 0
                              ? selectedTrainingLabels.join(", ")
                              : "Select training"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-56 p-2" align="start">
                          <div className="space-y-1">
                            {TRAINING_OPTIONS.map((option) => (
                              <label
                                key={option.value}
                                className="flex items-center gap-2 rounded px-2 py-1.5 text-xs hover:bg-muted/50"
                              >
                                <Checkbox
                                  checked={taskCard.requiredTraining.includes(option.value)}
                                  onCheckedChange={() => toggleTraining(taskCard.id, option.value)}
                                />
                                <span>{option.label}</span>
                              </label>
                            ))}
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-[11px]">Standard Minutes</Label>
                      <Input
                        type="number"
                        min={0}
                        step={1}
                        value={taskCard.standardMinutes}
                        onChange={(event) => {
                          const parsed = Number(event.target.value);
                          patchTaskCard(taskCard.id, (current) => ({
                            ...current,
                            standardMinutes: Number.isFinite(parsed) ? Math.max(0, Math.round(parsed)) : 0,
                          }));
                        }}
                        className="h-8 text-sm"
                      />
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
}
