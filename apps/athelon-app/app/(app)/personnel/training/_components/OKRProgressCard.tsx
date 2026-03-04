"use client";

import { useMemo, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Goal = {
  _id: Id<"ojtTrainingGoals">;
  period: "weekly" | "monthly" | "quarterly" | "yearly";
  periodStart: number;
  periodEnd: number;
  targetType: "stages_completed" | "tasks_completed" | "hours_trained";
  targetValue: number;
  actualValue?: number;
  status: "active" | "completed" | "missed" | "cancelled";
};

export function OKRProgressCard({ goal, technicianName }: { goal: Goal; technicianName: string }) {
  const [open, setOpen] = useState(false);
  const [actualValue, setActualValue] = useState(String(goal.actualValue ?? 0));
  const [status, setStatus] = useState<Goal["status"]>(goal.status);
  const updateGoalProgress = useMutation(api.ojt.updateGoalProgress);

  const progress = useMemo(() => {
    const actual = goal.actualValue ?? 0;
    if (goal.targetValue <= 0) return 0;
    return Math.max(0, Math.min(100, Math.round((actual / goal.targetValue) * 100)));
  }, [goal.actualValue, goal.targetValue]);

  async function handleSave() {
    const nextActual = Number(actualValue);
    if (Number.isNaN(nextActual) || nextActual < 0) {
      toast.error("Actual value must be 0 or greater");
      return;
    }

    try {
      await updateGoalProgress({
        id: goal._id,
        actualValue: nextActual,
        status,
      });
      toast.success("Goal progress updated");
      setOpen(false);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to update goal");
    }
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base capitalize">{goal.period} Goal · {technicianName}</CardTitle>
          <Badge variant={goal.status === "active" ? "outline" : "default"} className="capitalize">
            {goal.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          {goal.targetType.replaceAll("_", " ")}: <span className="text-foreground font-medium">{goal.actualValue ?? 0}</span> / {goal.targetValue}
        </p>
        <Progress value={progress} />
        <p className="text-xs text-muted-foreground">
          {new Date(goal.periodStart).toLocaleDateString("en-US", { timeZone: "UTC" })} → {new Date(goal.periodEnd).toLocaleDateString("en-US", { timeZone: "UTC" })}
        </p>
        <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
          Update Progress
        </Button>
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Goal Progress</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Actual Value</Label>
              <Input type="number" min={0} value={actualValue} onChange={(e) => setActualValue(e.target.value)} />
            </div>
            <div>
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as Goal["status"])}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="missed">Missed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
