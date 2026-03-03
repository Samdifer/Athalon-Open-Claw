"use client";

import { Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Wrench } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// ─── Types ─────────────────────────────────────────────────────────────────────

export type TaskType =
  | "inspection"
  | "repair"
  | "replacement"
  | "ad_compliance"
  | "functional_check"
  | "rigging"
  | "return_to_service"
  | "overhaul"
  | "modification";

export const TASK_TYPE_OPTIONS: { value: TaskType; label: string }[] = [
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

export type AircraftSystem =
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

export const AIRCRAFT_SYSTEM_OPTIONS: { value: AircraftSystem; label: string }[] = [
  { value: "airframe", label: "Airframe" },
  { value: "avionics", label: "Avionics" },
  { value: "engine_left", label: "Engine (Left)" },
  { value: "engine_right", label: "Engine (Right)" },
  { value: "engine_center", label: "Engine (Center)" },
  { value: "engine_single", label: "Engine (Single)" },
  { value: "landing_gear", label: "Landing Gear" },
  { value: "fuel_system", label: "Fuel System" },
  { value: "hydraulics", label: "Hydraulics" },
  { value: "electrical", label: "Electrical" },
  { value: "other", label: "Other" },
];

interface Technician {
  _id: string;
  legalName: string;
  status: string;
}

interface TaskCardFormProps {
  taskCardNumber: string;
  onTaskCardNumberChange: (value: string) => void;
  title: string;
  onTitleChange: (value: string) => void;
  taskType: TaskType;
  onTaskTypeChange: (value: TaskType) => void;
  aircraftSystem: string;
  onAircraftSystemChange: (value: string) => void;
  isInspectionItem: boolean;
  onIsInspectionItemChange: (value: boolean) => void;
  approvedDataSource: string;
  onApprovedDataSourceChange: (value: string) => void;
  approvedDataRevision: string;
  onApprovedDataRevisionChange: (value: string) => void;
  assignedTechId: string;
  onAssignedTechIdChange: (value: string) => void;
  notes: string;
  onNotesChange: (value: string) => void;
  technicians: Technician[] | undefined;
}

// ─── Component ─────────────────────────────────────────────────────────────────

export function TaskCardForm({
  taskCardNumber,
  onTaskCardNumberChange,
  title,
  onTitleChange,
  taskType,
  onTaskTypeChange,
  aircraftSystem,
  onAircraftSystemChange,
  isInspectionItem,
  onIsInspectionItemChange,
  approvedDataSource,
  onApprovedDataSourceChange,
  approvedDataRevision,
  onApprovedDataRevisionChange,
  assignedTechId,
  onAssignedTechIdChange,
  notes,
  onNotesChange,
  technicians,
}: TaskCardFormProps) {
  return (
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
            <Label
              htmlFor="tcNumber"
              className="text-xs text-muted-foreground mb-1 block"
            >
              Card number <span className="text-destructive">*</span>
            </Label>
            {/* BUG-LT5-001: Missing maxLength on task card number — user could
                type or paste a very long string that exceeds the backend's
                schema limit, causing a cryptic mutation error on submit after
                the tech has already built out all their steps. 50 chars is
                more than enough for any reasonable card number (e.g.
                "ANNUAL-2024-N12345-001" is 22 chars). */}
            <Input
              id="tcNumber"
              value={taskCardNumber}
              onChange={(e) => onTaskCardNumberChange(e.target.value.slice(0, 50))}
              placeholder="e.g. TC-001, INSP-A01"
              maxLength={50}
              className="h-9 text-sm border-border/60"
            />
          </div>
          <div>
            <Label
              htmlFor="taskType"
              className="text-xs text-muted-foreground mb-1 block"
            >
              Task type <span className="text-destructive">*</span>
            </Label>
            <Select
              value={taskType}
              onValueChange={(v) => onTaskTypeChange(v as TaskType)}
            >
              <SelectTrigger
                id="taskType"
                className="h-9 text-sm border-border/60"
              >
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

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label
              htmlFor="aircraftSystem"
              className="text-xs text-muted-foreground mb-1 block"
            >
              Aircraft system
            </Label>
            <Select value={aircraftSystem} onValueChange={onAircraftSystemChange}>
              <SelectTrigger
                id="aircraftSystem"
                className="h-9 text-sm border-border/60"
              >
                <SelectValue placeholder="None selected" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">None</SelectItem>
                {AIRCRAFT_SYSTEM_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end pb-2">
            <div className="flex items-center gap-2">
              <Checkbox
                id="isInspectionItem"
                checked={isInspectionItem}
                onCheckedChange={(checked) =>
                  onIsInspectionItemChange(checked === true)
                }
              />
              <Label
                htmlFor="isInspectionItem"
                className="text-xs text-muted-foreground cursor-pointer"
              >
                This is an inspection item
              </Label>
            </div>
          </div>
        </div>

        <div>
          <Label
            htmlFor="title"
            className="text-xs text-muted-foreground mb-1 block"
          >
            Title <span className="text-destructive">*</span>
          </Label>
          {/* BUG-LT5-001: Missing maxLength on title. */}
          <Input
            id="title"
            value={title}
            onChange={(e) => onTitleChange(e.target.value.slice(0, 200))}
            placeholder="e.g. Annual Inspection — Airframe"
            maxLength={200}
            className="h-9 text-sm border-border/60"
          />
        </div>

        {/* Approved data source */}
        <div>
          <Label
            htmlFor="approvedData"
            className="text-xs text-muted-foreground mb-1 block"
          >
            Approved data source <span className="text-destructive">*</span>
            <span className="text-muted-foreground/70 ml-1">
              (14 CFR 43.9(a)(1))
            </span>
          </Label>
          {/* BUG-LT5-001: Missing maxLength on approved data source. */}
          <Input
            id="approvedData"
            value={approvedDataSource}
            onChange={(e) => onApprovedDataSourceChange(e.target.value.slice(0, 300))}
            placeholder='e.g. "AMM 27-20-00 Rev 15" or "FAA AD 2024-15-07"'
            maxLength={300}
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
            {/* BUG-LT5-001: Missing maxLength on revision field. */}
            <Input
              id="dataRevision"
              value={approvedDataRevision}
              onChange={(e) => onApprovedDataRevisionChange(e.target.value.slice(0, 100))}
              placeholder="e.g. Rev 15, Issue 3"
              maxLength={100}
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
            <Select value={assignedTechId} onValueChange={onAssignedTechIdChange}>
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
          {/* BUG-LT5-001: Missing maxLength on notes textarea. Without a cap,
              a tech who pastes an entire AMM section into notes would hit a
              backend schema error after completing all step configuration,
              losing their work. 1000 chars is generous for a notes field. */}
          <Textarea
            id="notes"
            value={notes}
            onChange={(e) => onNotesChange(e.target.value.slice(0, 1000))}
            placeholder="Additional context, cautions, or references…"
            maxLength={1000}
            className="min-h-[64px] text-sm border-border/60 resize-none"
          />
        </div>
      </CardContent>
    </Card>
  );
}
