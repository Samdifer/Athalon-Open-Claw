"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Circle, CheckCircle2, Loader2 } from "lucide-react";

const STAGES = ["observe", "assist", "supervised", "evaluated"] as const;
type Stage = (typeof STAGES)[number];

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  jacketId: Id<"ojtJackets">;
  technicianId: Id<"technicians">;
  task: {
    _id: Id<"ojtTasks">;
    description: string;
    ataChapter: string;
    approvedDataRef?: string;
  };
  completedStages: Stage[];
  technicians: Array<{ _id: Id<"technicians">; legalName: string }>;
};

export function StageSignOffDialog({
  open,
  onOpenChange,
  organizationId,
  jacketId,
  technicianId,
  task,
  completedStages,
  technicians,
}: Props) {
  const [stage, setStage] = useState<Stage | "">("");
  const [trainerId, setTrainerId] = useState<string>("");
  const [trainingMethod, setTrainingMethod] = useState<string>("hands-on");
  const [actualMinutes, setActualMinutes] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const auth = useQuery(api.ojt.getTrainerAuthForTech, open ? { organizationId, technicianId } : "skip");
  const recordStageEvent = useMutation(api.ojt.recordStageEvent);

  const nextStage = useMemo<Stage | null>(() => STAGES.find((s) => !completedStages.includes(s)) ?? null, [completedStages]);

  const authorizedTrainerIds = useMemo(() => {
    const now = Date.now();
    return new Set(
      (auth ?? [])
        .filter((a) => !a.revokedAt && (!a.expiresAt || a.expiresAt > now))
        .map((a) => a.technicianId),
    );
  }, [auth]);

  const trainerOptions = useMemo(
    () => technicians.filter((t) => authorizedTrainerIds.has(t._id) && t._id !== technicianId),
    [technicians, authorizedTrainerIds, technicianId],
  );

  // Derive effective selected stage: explicit user pick, or auto-advance to next
  const selectedStage: Stage | null = (stage || nextStage) ?? null;

  const canSubmit = !!selectedStage && !!trainerId && !isSubmitting;

  const handleOpenChange = (value: boolean) => {
    if (!isSubmitting) onOpenChange(value);
    if (!value) {
      setStage("");
      setTrainerId("");
      setTrainingMethod("hands-on");
      setActualMinutes("");
      setNotes("");
    }
  };

  const handleSubmit = async () => {
    if (!selectedStage || !trainerId) {
      toast.error("Select a stage and trainer");
      return;
    }

    setIsSubmitting(true);
    try {
      await recordStageEvent({
        organizationId,
        jacketId,
        taskId: task._id,
        technicianId,
        stage: selectedStage,
        trainerId: trainerId as Id<"technicians">,
        approvedDataRef: task.approvedDataRef,
        trainingMethod,
        actualMinutes: actualMinutes ? Number(actualMinutes) : undefined,
        notes: notes || undefined,
      });
      toast.success("Stage signed off");
      handleOpenChange(false);
    } catch (error: any) {
      const message = error?.message ?? "Failed to sign off stage";
      if (message.toLowerCase().includes("prior stage") || message.toLowerCase().includes("cannot record")) {
        toast.error(`Sequential stage validation failed: ${message}`);
      } else {
        toast.error(message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Sign Off Task Stage</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1">
            <p className="text-sm font-medium">{task.description}</p>
            <p className="text-xs text-muted-foreground">ATA {task.ataChapter}</p>
            <p className="text-xs text-muted-foreground">Approved Data: {task.approvedDataRef ?? "Not provided"}</p>
          </div>

          <div className="space-y-2">
            <Label>Current Stage Progress</Label>
            <div className="flex flex-wrap gap-2">
              {STAGES.map((s) => (
                <Badge key={s} variant={completedStages.includes(s) ? "default" : "outline"} className="capitalize">
                  {completedStages.includes(s) ? <CheckCircle2 className="w-3 h-3 mr-1" /> : <Circle className="w-3 h-3 mr-1" />} {s}
                </Badge>
              ))}
            </div>
            {nextStage ? (
              <p className="text-xs text-muted-foreground">Next stage: <span className="font-medium capitalize text-foreground">{nextStage}</span></p>
            ) : (
              <p className="text-xs text-green-600">All stages complete for this task.</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Stage to Sign Off</Label>
            <Select value={(selectedStage ?? "") as string} onValueChange={(v) => setStage(v as Stage)}>
              <SelectTrigger className="h-11">
                <SelectValue placeholder="Select stage" />
              </SelectTrigger>
              <SelectContent>
                {STAGES.map((s) => {
                  const idx = STAGES.indexOf(s);
                  const nextIdx = nextStage ? STAGES.indexOf(nextStage) : STAGES.length;
                  const disabled = completedStages.includes(s) || idx > nextIdx;
                  return (
                    <SelectItem key={s} value={s} disabled={disabled} className="capitalize">{s}</SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Authorized Trainer</Label>
            <Select value={trainerId} onValueChange={setTrainerId}>
              <SelectTrigger className="h-11">
                <SelectValue placeholder={trainerOptions.length ? "Select trainer" : "No authorized trainers found"} />
              </SelectTrigger>
              <SelectContent>
                {trainerOptions.map((t) => (
                  <SelectItem key={t._id} value={t._id}>{t.legalName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Training Method</Label>
              <Select value={trainingMethod} onValueChange={setTrainingMethod}>
                <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
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

          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" className="h-11" onClick={() => handleOpenChange(false)} disabled={isSubmitting}>Cancel</Button>
          <Button className="h-11" onClick={handleSubmit} disabled={!canSubmit || !nextStage}>
            {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin mr-1" />Signing…</> : "Sign Off"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
