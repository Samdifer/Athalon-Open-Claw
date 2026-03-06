"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

type Task = {
  _id: Id<"ojtTasks">;
  description: string;
  ataChapter: string;
};

type ColumnSignOffDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  jacketId: Id<"ojtJackets">;
  technicianId: Id<"technicians">;
  task: Task;
  columnNumber: number;
  completedColumns: number[];
  technicians: Array<{ _id: Id<"technicians">; legalName: string }>;
};

const COLUMN_LABELS: Record<number, string> = {
  1: "(1) Instructor Observation",
  2: "(2) Instructor Observation",
  3: "(3) Instructor Observation",
  4: "(4) Instructor Observation",
  5: "(5) Authorization / Test",
};

export function ColumnSignOffDialog({
  open,
  onOpenChange,
  organizationId,
  jacketId,
  technicianId,
  task,
  columnNumber,
  completedColumns,
  technicians,
}: ColumnSignOffDialogProps) {
  const [trainerId, setTrainerId] = useState("");
  const [trainingMethod, setTrainingMethod] = useState("hands-on");
  const [actualMinutes, setActualMinutes] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const recordColumnSignOff = useMutation(api.ojt.recordColumnSignOff);

  // Filter out self from trainer options
  const trainerOptions = technicians.filter((t) => t._id !== technicianId);

  const canSubmit = !!trainerId && !isSubmitting;

  function handleOpenChange(value: boolean) {
    if (!isSubmitting) onOpenChange(value);
    if (!value) {
      setTrainerId("");
      setTrainingMethod("hands-on");
      setActualMinutes("");
      setNotes("");
    }
  }

  async function handleSubmit() {
    if (!trainerId) {
      toast.error("Select a trainer");
      return;
    }

    setIsSubmitting(true);
    try {
      await recordColumnSignOff({
        organizationId,
        jacketId,
        taskId: task._id,
        technicianId,
        columnNumber,
        trainerId: trainerId as Id<"technicians">,
        trainingMethod,
        actualMinutes: actualMinutes ? Number(actualMinutes) : undefined,
        notes: notes || undefined,
      });
      toast.success(
        columnNumber === 5
          ? "Authorization signed off"
          : `Column ${columnNumber} signed off`,
      );
      handleOpenChange(false);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to sign off column";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Column Sign-Off</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Task info */}
          <div className="space-y-1">
            <p className="text-sm font-medium">{task.description}</p>
            <p className="text-xs text-muted-foreground">ATA {task.ataChapter}</p>
          </div>

          {/* Column progress visualization */}
          <div className="space-y-2">
            <Label>Column Progress</Label>
            <div className="flex gap-1.5">
              {[1, 2, 3, 4, 5].map((col) => {
                const isCompleted = completedColumns.includes(col);
                const isCurrent = col === columnNumber;
                const isAuth = col === 5;

                return (
                  <div
                    key={col}
                    className={`flex items-center justify-center h-9 w-9 rounded-full border text-xs font-medium ${
                      isCompleted
                        ? "bg-green-500/20 text-green-400 border-green-500/40"
                        : isCurrent
                          ? "bg-blue-500/20 text-blue-400 border-blue-500/40 ring-2 ring-blue-500/30"
                          : "border-muted-foreground/20 text-muted-foreground/40"
                    }`}
                  >
                    {isAuth ? "Auth" : col}
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground">
              Signing: <span className="font-medium text-foreground">{COLUMN_LABELS[columnNumber]}</span>
            </p>
          </div>

          {/* Trainer select */}
          <div className="space-y-2">
            <Label>Trainer / Instructor</Label>
            <Select value={trainerId} onValueChange={setTrainerId}>
              <SelectTrigger className="h-11">
                <SelectValue
                  placeholder={
                    trainerOptions.length
                      ? "Select trainer"
                      : "No trainers available"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {trainerOptions.map((t) => (
                  <SelectItem key={t._id} value={t._id}>
                    {t.legalName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Training method and minutes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Training Method</Label>
              <Select value={trainingMethod} onValueChange={setTrainingMethod}>
                <SelectTrigger className="h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hands-on">Hands-on</SelectItem>
                  <SelectItem value="classroom">Classroom</SelectItem>
                  <SelectItem value="CBT">CBT</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Actual Minutes</Label>
              <Input
                type="number"
                min={0}
                value={actualMinutes}
                onChange={(e) => setActualMinutes(e.target.value)}
                placeholder="e.g. 45"
                className="h-11"
              />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Optional sign-off notes..."
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            className="h-11"
            onClick={() => handleOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button className="h-11" onClick={handleSubmit} disabled={!canSubmit}>
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-1" />
                Signing...
              </>
            ) : columnNumber === 5 ? (
              "Authorize"
            ) : (
              "Sign Off"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
