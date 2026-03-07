"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Clock3, Pause, Play, Square } from "lucide-react";
import { getOpenEntryElapsedMs, formatDurationWithSeconds } from "@/lib/time-utils";

type TimerContextType = "shop" | "work_order" | "task" | "step";

function shortId(id: string): string {
  return id.length > 10 ? `${id.slice(0, 6)}…` : id;
}

export function GlobalTimerWidget() {
  const { orgId, techId } = useCurrentOrg();

  const [open, setOpen] = useState(false);
  const [contextType, setContextType] = useState<TimerContextType>("shop");
  const [workOrderId, setWorkOrderId] = useState("");
  const [taskCardId, setTaskCardId] = useState("");
  const [stepId, setStepId] = useState("");
  const [shopActivityCode, setShopActivityCode] = useState("");
  const [notes, setNotes] = useState("");
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  const active = useQuery(
    api.timeClock.getActiveTimerForTechnician,
    orgId && techId
      ? { orgId, technicianId: techId }
      : "skip",
  );

  const activeWorkOrders = useQuery(
    api.workOrders.listActive,
    orgId ? { organizationId: orgId, limit: 100 } : "skip",
  );

  const taskCards = useQuery(
    api.taskCards.listTaskCardsForWorkOrder,
    orgId && workOrderId && (contextType === "task" || contextType === "step")
      ? {
          workOrderId: workOrderId as Id<"workOrders">,
          organizationId: orgId,
        }
      : "skip",
  );

  const selectedTaskCard = useMemo(() => {
    if (!taskCardId || !Array.isArray(taskCards)) return null;
    return taskCards.find((card) => card._id === taskCardId) ?? null;
  }, [taskCards, taskCardId]);

  const availableSteps = useMemo(
    () => (selectedTaskCard?.steps ?? []).filter((step) => step.status !== "completed" && step.status !== "na"),
    [selectedTaskCard],
  );

  const startTimer = useMutation(api.timeClock.startTimer);
  const stopTimer = useMutation(api.timeClock.stopTimer);
  const pauseTimer = useMutation(api.timeClock.pauseTimer);
  const resumeTimer = useMutation(api.timeClock.resumeTimer);

  // Tick to keep elapsed display live while preserving server-authoritative state.
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setTick((value) => value + 1), 1_000);
    return () => window.clearInterval(id);
  }, []);

  if (!orgId || !techId) return null;
  const safeOrgId = orgId;
  const safeTechId = techId;

  const activeEntry = active?.entry;
  const isActivePaused = Boolean(activeEntry?.pausedAt);

  const contextLabel = (() => {
    if (!activeEntry) return "";
    const type = activeEntry.entryType ?? "work_order";
    if (type === "shop") return activeEntry.shopActivityCode ? `Shop · ${activeEntry.shopActivityCode}` : "Shop";
    if (type === "task") return `Task ${activeEntry.taskCardId ? shortId(activeEntry.taskCardId as string) : "—"}`;
    if (type === "step") return `Step ${activeEntry.taskStepId ? shortId(activeEntry.taskStepId as string) : "—"}`;
    if (type === "work_order") return `WO ${activeEntry.workOrderId ? shortId(activeEntry.workOrderId as string) : "—"}`;
    return type;
  })();

  async function handleStart() {
    if ((contextType === "work_order" || contextType === "task" || contextType === "step") && !workOrderId) {
      toast.error("Select a work order.");
      return;
    }
    if ((contextType === "task" || contextType === "step") && !taskCardId) {
      toast.error("Select a work card.");
      return;
    }
    if (contextType === "step" && !stepId) {
      toast.error("Select a task step.");
      return;
    }

    setLoadingAction("start");
    try {
      await startTimer({
        orgId: safeOrgId,
        technicianId: safeTechId,
        entryType: contextType,
        workOrderId:
          contextType === "work_order" || contextType === "task" || contextType === "step"
            ? (workOrderId as Id<"workOrders">)
            : undefined,
        taskCardId:
          contextType === "task" || contextType === "step"
            ? (taskCardId as Id<"taskCards">)
            : undefined,
        taskStepId: contextType === "step" ? (stepId as Id<"taskCardSteps">) : undefined,
        shopActivityCode: contextType === "shop" ? (shopActivityCode.trim() || undefined) : undefined,
        notes: notes.trim() || undefined,
        source: "global_timer_widget",
      });

      setOpen(false);
      setWorkOrderId("");
      setTaskCardId("");
      setStepId("");
      setShopActivityCode("");
      setNotes("");
    } catch (error) {
      toast.error((error as Error).message ?? "Failed to start timer.");
    } finally {
      setLoadingAction(null);
    }
  }

  async function handlePause() {
    if (!activeEntry) return;
    setLoadingAction("pause");
    try {
      await pauseTimer({ orgId: safeOrgId, timeEntryId: activeEntry._id, source: "global_timer_widget" });
    } catch (error) {
      toast.error((error as Error).message ?? "Failed to pause timer.");
    } finally {
      setLoadingAction(null);
    }
  }

  async function handleResume() {
    if (!activeEntry) return;
    setLoadingAction("resume");
    try {
      await resumeTimer({ orgId: safeOrgId, timeEntryId: activeEntry._id, source: "global_timer_widget" });
    } catch (error) {
      toast.error((error as Error).message ?? "Failed to resume timer.");
    } finally {
      setLoadingAction(null);
    }
  }

  async function handleStop() {
    if (!activeEntry) return;
    setLoadingAction("stop");
    try {
      await stopTimer({ orgId: safeOrgId, timeEntryId: activeEntry._id });
    } catch (error) {
      toast.error((error as Error).message ?? "Failed to stop timer.");
    } finally {
      setLoadingAction(null);
    }
  }

  return (
    <>
      {activeEntry ? (
        <div className="flex items-center gap-1.5">
          <Badge
            className={`text-[10px] border ${
              isActivePaused
                ? "bg-amber-500/15 text-amber-500 border-amber-500/30"
                : "bg-green-500/15 text-green-400 border-green-500/30"
            }`}
          >
            {isActivePaused ? "Paused" : "Active"} · {formatDurationWithSeconds(getOpenEntryElapsedMs(activeEntry))}
          </Badge>
          <span className="hidden lg:inline text-[11px] text-muted-foreground max-w-[140px] truncate">
            {contextLabel}
          </span>
          {isActivePaused ? (
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              onClick={handleResume}
              disabled={loadingAction === "resume"}
              title="Resume timer"
              aria-label="Resume timer"
            >
              <Play className="w-4 h-4" />
            </Button>
          ) : (
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              onClick={handlePause}
              disabled={loadingAction === "pause"}
              title="Pause timer"
              aria-label="Pause timer"
            >
              <Pause className="w-4 h-4" />
            </Button>
          )}
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-red-400"
            onClick={handleStop}
            disabled={loadingAction === "stop"}
            title="Stop timer"
            aria-label="Stop timer"
          >
            <Square className="w-4 h-4" />
          </Button>
        </div>
      ) : (
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 text-xs"
          onClick={() => setOpen(true)}
        >
          <Clock3 className="w-3.5 h-3.5" />
          Start Timer
        </Button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Start Timer</DialogTitle>
            <DialogDescription>
              Quick start a timer for your current work context.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Context *</Label>
              <Select
                value={contextType}
                onValueChange={(nextValue) => {
                  const nextContext = nextValue as TimerContextType;
                  setContextType(nextContext);
                  setWorkOrderId("");
                  setTaskCardId("");
                  setStepId("");
                  setShopActivityCode("");
                }}
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Select context" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="shop">Shop / Internal</SelectItem>
                  <SelectItem value="work_order">Work Order</SelectItem>
                  <SelectItem value="task">Work Card</SelectItem>
                  <SelectItem value="step">Task Step</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {contextType === "shop" && (
              <div className="space-y-1.5">
                <Label className="text-xs">Shop Activity Code (optional)</Label>
                <Input
                  value={shopActivityCode}
                  onChange={(event) => setShopActivityCode(event.target.value)}
                  placeholder="training, admin, tooling..."
                  className="h-9 text-sm"
                />
              </div>
            )}

            {(contextType === "work_order" || contextType === "task" || contextType === "step") && (
              <div className="space-y-1.5">
                <Label className="text-xs">Work Order *</Label>
                <Select
                  value={workOrderId}
                  onValueChange={(value) => {
                    setWorkOrderId(value);
                    setTaskCardId("");
                    setStepId("");
                  }}
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Select work order" />
                  </SelectTrigger>
                  <SelectContent>
                    {(activeWorkOrders ?? []).map((workOrder) => (
                      <SelectItem key={workOrder._id} value={workOrder._id}>
                        {workOrder.workOrderNumber} — {workOrder.description.slice(0, 36)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {(contextType === "task" || contextType === "step") && (
              <div className="space-y-1.5">
                <Label className="text-xs">Work Card *</Label>
                <Select
                  value={taskCardId}
                  onValueChange={(value) => {
                    setTaskCardId(value);
                    setStepId("");
                  }}
                  disabled={!workOrderId}
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder={workOrderId ? "Select work card" : "Select work order first"} />
                  </SelectTrigger>
                  <SelectContent>
                    {(Array.isArray(taskCards) ? taskCards : []).map((taskCard) => (
                      <SelectItem key={taskCard._id} value={taskCard._id}>
                        {taskCard.taskCardNumber} — {taskCard.title.slice(0, 36)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {contextType === "step" && (
              <div className="space-y-1.5">
                <Label className="text-xs">Step *</Label>
                <Select value={stepId} onValueChange={setStepId} disabled={!taskCardId}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder={taskCardId ? "Select step" : "Select work card first"} />
                  </SelectTrigger>
                  <SelectContent>
                    {availableSteps.map((step) => (
                      <SelectItem key={step._id} value={step._id}>
                        Step {step.stepNumber} — {step.description.slice(0, 42)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs">Notes (optional)</Label>
              <Input
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Work notes..."
                className="h-9 text-sm"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              className="gap-1.5"
              onClick={handleStart}
              disabled={loadingAction === "start"}
            >
              <Play className="w-3.5 h-3.5" />
              {loadingAction === "start" ? "Starting..." : "Start"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
