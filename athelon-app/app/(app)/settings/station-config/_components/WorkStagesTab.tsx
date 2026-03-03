"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import {
  GripVertical,
  Plus,
  Trash2,
  Layers,
  RotateCcw,
  Save,
} from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  STAGE_COLORS,
  STAGE_PRESETS,
} from "./StagePresets";

type WorkOrderStatus =
  | "draft"
  | "open"
  | "in_progress"
  | "on_hold"
  | "pending_inspection"
  | "pending_signoff"
  | "open_discrepancies"
  | "closed"
  | "cancelled"
  | "voided";

type StageConfig = {
  id: string;
  label: string;
  description?: string;
  color: string;
  sortOrder: number;
  statusMappings: WorkOrderStatus[];
};

const WORK_ORDER_STATUS_OPTIONS: Array<{ value: WorkOrderStatus; label: string }> = [
  { value: "draft", label: "Draft" },
  { value: "open", label: "Open" },
  { value: "pending_inspection", label: "Pending Inspection" },
  { value: "in_progress", label: "In Progress" },
  { value: "on_hold", label: "On Hold" },
  { value: "open_discrepancies", label: "Open Discrepancies" },
  { value: "pending_signoff", label: "Pending Signoff" },
  { value: "closed", label: "Closed" },
  { value: "cancelled", label: "Cancelled" },
  { value: "voided", label: "Voided" },
];

let nextId = 1;
function generateId(): string {
  return `stage-${Date.now()}-${nextId++}`;
}

function inferStatusMappings(label: string, sortOrder: number): WorkOrderStatus[] {
  const lower = label.toLowerCase();
  if (lower.includes("quote")) return ["draft"];
  if (lower.includes("dock") || lower.includes("intake") || lower.includes("induction")) {
    return ["open"];
  }
  if (lower.includes("inspect")) return ["pending_inspection"];
  if (lower.includes("repair") || lower.includes("service")) {
    return ["in_progress", "on_hold", "open_discrepancies"];
  }
  if (lower.includes("rts") || lower.includes("sign") || lower.includes("return")) {
    return ["pending_signoff"];
  }
  if (lower.includes("review") || lower.includes("close") || lower.includes("complete")) {
    return ["closed", "cancelled", "voided"];
  }
  return sortOrder === 0 ? ["draft"] : [];
}

function presetToStages(presetId: string): StageConfig[] {
  const preset = STAGE_PRESETS.find((value) => value.id === presetId);
  if (!preset) return [];
  return preset.stages.map((stage, index) => ({
    id: generateId(),
    label: stage.label,
    description: stage.description,
    color: stage.color,
    sortOrder: index,
    statusMappings: inferStatusMappings(stage.label, index),
  }));
}

function normalizeStages(stages: StageConfig[]): StageConfig[] {
  return stages.map((stage, index) => ({
    id: stage.id || generateId(),
    label: stage.label.trim(),
    description: stage.description?.trim() || undefined,
    color: stage.color,
    sortOrder: index,
    statusMappings: Array.from(new Set(stage.statusMappings)),
  }));
}

export default function WorkStagesTab() {
  const { orgId } = useCurrentOrg();
  const organizationId = orgId as Id<"organizations"> | undefined;

  const stageConfig = useQuery(
    api.stationConfig.getWorkOrderStageConfig,
    organizationId ? { organizationId } : "skip",
  ) as StageConfig[] | undefined;
  const saveWorkOrderStageConfig = useMutation(api.stationConfig.saveWorkOrderStageConfig);

  const [initialStages, setInitialStages] = useState<StageConfig[]>([]);
  const [localStages, setLocalStages] = useState<StageConfig[]>([]);
  const [selectedPresetId, setSelectedPresetId] = useState("");
  const [colorPickerOpenId, setColorPickerOpenId] = useState<string | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);

  const dragCounter = useRef<Record<string, number>>({});

  useEffect(() => {
    if (!stageConfig) return;
    const normalized = normalizeStages(stageConfig);
    setInitialStages(normalized);
    setLocalStages(normalized.map((stage) => ({ ...stage })));
  }, [stageConfig]);

  const hasUnsavedChanges = useMemo(
    () => JSON.stringify(localStages) !== JSON.stringify(initialStages),
    [initialStages, localStages],
  );

  const selectedPreset = STAGE_PRESETS.find((preset) => preset.id === selectedPresetId);

  const handleLoadPreset = useCallback(
    (mode: "replace" | "add") => {
      if (!selectedPresetId) {
        toast.error("Select a preset first");
        return;
      }

      const newStages = presetToStages(selectedPresetId);
      if (newStages.length === 0) return;

      if (mode === "replace") {
        setLocalStages(normalizeStages(newStages));
        toast.success("Stages replaced with preset");
        return;
      }

      setLocalStages((prev) =>
        normalizeStages([...prev, ...newStages.map((stage) => ({ ...stage, id: generateId() }))]),
      );
      toast.success("Preset stages appended");
    },
    [selectedPresetId],
  );

  const handleAddStage = useCallback(() => {
    setLocalStages((prev) =>
      normalizeStages([
        ...prev,
        {
          id: generateId(),
          label: "",
          description: "",
          color: "bg-slate-500",
          sortOrder: prev.length,
          statusMappings: [],
        },
      ]),
    );
  }, []);

  const handleDeleteStage = useCallback((id: string) => {
    setLocalStages((prev) => normalizeStages(prev.filter((stage) => stage.id !== id)));
    toast("Stage removed");
  }, []);

  const handleUpdateStage = useCallback(
    (id: string, field: "label" | "description" | "color", value: string) => {
      setLocalStages((prev) =>
        prev.map((stage) => (stage.id === id ? { ...stage, [field]: value } : stage)),
      );
    },
    [],
  );

  const handleToggleStatusMapping = useCallback((id: string, status: WorkOrderStatus) => {
    setLocalStages((prev) =>
      prev.map((stage) => {
        if (stage.id !== id) return stage;
        const hasStatus = stage.statusMappings.includes(status);
        return {
          ...stage,
          statusMappings: hasStatus
            ? stage.statusMappings.filter((value) => value !== status)
            : [...stage.statusMappings, status],
        };
      }),
    );
  }, []);

  const handleReorder = useCallback((dragId: string, dropId: string) => {
    if (dragId === dropId) return;
    setLocalStages((prev) => {
      const dragIndex = prev.findIndex((stage) => stage.id === dragId);
      const dropIndex = prev.findIndex((stage) => stage.id === dropId);
      if (dragIndex === -1 || dropIndex === -1) return prev;

      const reordered = [...prev];
      const [moved] = reordered.splice(dragIndex, 1);
      reordered.splice(dropIndex, 0, moved);
      return normalizeStages(reordered);
    });
  }, []);

  const onDragStart = useCallback((event: React.DragEvent<HTMLDivElement>, id: string) => {
    setDraggedId(id);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", id);
  }, []);

  const onDragEnter = useCallback(
    (id: string) => {
      if (!draggedId || id === draggedId) return;
      dragCounter.current[id] = (dragCounter.current[id] ?? 0) + 1;
      setDropTargetId(id);
    },
    [draggedId],
  );

  const onDragLeave = useCallback(
    (id: string) => {
      dragCounter.current[id] = (dragCounter.current[id] ?? 0) - 1;
      if ((dragCounter.current[id] ?? 0) <= 0) {
        dragCounter.current[id] = 0;
        if (dropTargetId === id) setDropTargetId(null);
      }
    },
    [dropTargetId],
  );

  const onDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>, dropId: string) => {
      event.preventDefault();
      const dragId = event.dataTransfer.getData("text/plain");
      if (dragId && dropId) handleReorder(dragId, dropId);
      setDraggedId(null);
      setDropTargetId(null);
      dragCounter.current = {};
    },
    [handleReorder],
  );

  const onDragEnd = useCallback(() => {
    setDraggedId(null);
    setDropTargetId(null);
    dragCounter.current = {};
  }, []);

  const handleSave = useCallback(async () => {
    if (!organizationId) return;

    const normalized = normalizeStages(localStages);
    for (const stage of normalized) {
      if (!stage.label) {
        toast.error("Each stage requires a label");
        return;
      }
    }

    try {
      await saveWorkOrderStageConfig({
        organizationId,
        stages: normalized,
      });
      setInitialStages(normalized.map((stage) => ({ ...stage })));
      setLocalStages(normalized.map((stage) => ({ ...stage })));
      toast.success("Work stages saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save work stages");
    }
  }, [localStages, organizationId, saveWorkOrderStageConfig]);

  const handleReset = useCallback(() => {
    setLocalStages(initialStages.map((stage) => ({ ...stage })));
    toast("Changes reset");
  }, [initialStages]);

  if (stageConfig === undefined) {
    return (
      <Card className="border-border/60">
        <CardHeader>
          <Skeleton className="h-6 w-52" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/60">
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <Layers className="w-4 h-4 text-muted-foreground" />
          Work Order Lifecycle Stages
        </CardTitle>
        <CardDescription className="text-xs">
          Configure variable-count stages and map each stage to one or more underlying work-order statuses.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-5">
        <div className="space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={selectedPresetId} onValueChange={setSelectedPresetId}>
              <SelectTrigger className="h-8 text-xs w-56">
                <SelectValue placeholder="Load a preset..." />
              </SelectTrigger>
              <SelectContent>
                {STAGE_PRESETS.map((preset) => (
                  <SelectItem key={preset.id} value={preset.id} className="text-xs">
                    {preset.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs gap-1"
              disabled={!selectedPresetId}
              onClick={() => handleLoadPreset("replace")}
            >
              Replace All
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs gap-1"
              disabled={!selectedPresetId}
              onClick={() => handleLoadPreset("add")}
            >
              Add to Existing
            </Button>
          </div>

          {selectedPreset && (
            <p className="text-[11px] text-muted-foreground pl-0.5">
              {selectedPreset.description} - {selectedPreset.stages.length} stages
            </p>
          )}
        </div>

        <div className="space-y-2">
          {localStages.map((stage) => (
            <div
              key={stage.id}
              draggable
              onDragStart={(event) => onDragStart(event, stage.id)}
              onDragEnter={() => onDragEnter(stage.id)}
              onDragLeave={() => onDragLeave(stage.id)}
              onDragOver={onDragOver}
              onDrop={(event) => onDrop(event, stage.id)}
              onDragEnd={onDragEnd}
              className={`
                rounded-md border border-border/60 bg-background px-2 py-2 space-y-2
                transition-all duration-150
                ${draggedId === stage.id ? "opacity-50" : ""}
                ${dropTargetId === stage.id && draggedId !== stage.id ? "ring-2 ring-primary" : ""}
              `}
            >
              <div className="flex items-center gap-2">
                <div className="cursor-grab active:cursor-grabbing text-muted-foreground/60 hover:text-muted-foreground">
                  <GripVertical className="w-4 h-4" />
                </div>

                <div className="relative">
                  <button
                    type="button"
                    className={`w-6 h-6 rounded-md border border-border/80 ${stage.color} shrink-0`}
                    title="Change color"
                    onClick={() =>
                      setColorPickerOpenId(colorPickerOpenId === stage.id ? null : stage.id)
                    }
                  />
                  {colorPickerOpenId === stage.id && (
                    <div className="absolute top-8 left-0 z-50 grid grid-cols-6 gap-1 p-2 rounded-lg border border-border bg-popover shadow-md">
                      {STAGE_COLORS.map((color) => (
                        <button
                          key={color}
                          type="button"
                          className={`w-5 h-5 rounded-sm ${color} border border-border/40 hover:scale-110 transition-transform ${
                            stage.color === color
                              ? "ring-2 ring-primary ring-offset-1 ring-offset-background"
                              : ""
                          }`}
                          onClick={() => {
                            handleUpdateStage(stage.id, "color", color);
                            setColorPickerOpenId(null);
                          }}
                        />
                      ))}
                    </div>
                  )}
                </div>

                <Input
                  value={stage.label}
                  onChange={(event) => handleUpdateStage(stage.id, "label", event.target.value)}
                  placeholder="Stage name"
                  className="h-8 text-sm w-44 shrink-0"
                />

                <Input
                  value={stage.description ?? ""}
                  onChange={(event) =>
                    handleUpdateStage(stage.id, "description", event.target.value)
                  }
                  placeholder="Description"
                  className="h-8 text-xs flex-1 min-w-0"
                />

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={() => handleDeleteStage(stage.id)}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>

              <div className="flex flex-wrap gap-1.5 pl-7">
                {WORK_ORDER_STATUS_OPTIONS.map((option) => {
                  const isSelected = stage.statusMappings.includes(option.value);
                  return (
                    <Badge
                      key={`${stage.id}-${option.value}`}
                      variant={isSelected ? "default" : "outline"}
                      className="cursor-pointer text-[10px]"
                      onClick={() => handleToggleStatusMapping(stage.id, option.value)}
                    >
                      {option.label}
                    </Badge>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <Button
          variant="outline"
          size="sm"
          className="h-8 text-xs gap-1.5"
          onClick={handleAddStage}
        >
          <Plus className="w-3.5 h-3.5" />
          Add Stage
        </Button>

        {hasUnsavedChanges && (
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/40">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs gap-1.5"
              onClick={handleReset}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset
            </Button>
            <Button size="sm" className="h-8 text-xs gap-1.5" onClick={() => void handleSave()}>
              <Save className="w-3.5 h-3.5" />
              Save Changes
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
