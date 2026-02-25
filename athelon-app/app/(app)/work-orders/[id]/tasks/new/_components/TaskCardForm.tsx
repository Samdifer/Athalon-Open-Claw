"use client";

import { Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
            <Input
              id="tcNumber"
              value={taskCardNumber}
              onChange={(e) => onTaskCardNumberChange(e.target.value)}
              placeholder="e.g. TC-001, INSP-A01"
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

        <div>
          <Label
            htmlFor="title"
            className="text-xs text-muted-foreground mb-1 block"
          >
            Title <span className="text-destructive">*</span>
          </Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
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
            Approved data source <span className="text-destructive">*</span>
            <span className="text-muted-foreground/70 ml-1">
              (14 CFR 43.9(a)(1))
            </span>
          </Label>
          <Input
            id="approvedData"
            value={approvedDataSource}
            onChange={(e) => onApprovedDataSourceChange(e.target.value)}
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
              onChange={(e) => onApprovedDataRevisionChange(e.target.value)}
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
          <Textarea
            id="notes"
            value={notes}
            onChange={(e) => onNotesChange(e.target.value)}
            placeholder="Additional context, cautions, or references…"
            className="min-h-[64px] text-sm border-border/60 resize-none"
          />
        </div>
      </CardContent>
    </Card>
  );
}
