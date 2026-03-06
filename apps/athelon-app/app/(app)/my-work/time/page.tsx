"use client";

import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import {
  type TimerContextType,
  formatDuration,
  formatTimestamp,
  formatDateShort,
  getOpenEntryElapsedMinutes,
  getOpenEntryElapsedMs,
  formatDurationWithSeconds,
  normalizeApprovalStatus,
  getWeekStart,
  DAY_LABELS,
} from "@/lib/time-utils";
import {
  AlertCircle,
  Clock,
  Pause,
  Play,
  Square,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function approvalBadge(status: "pending" | "approved" | "rejected") {
  if (status === "approved") {
    return (
      <Badge className="bg-green-500/15 text-green-400 border border-green-500/30 text-[10px]">
        Approved
      </Badge>
    );
  }
  if (status === "rejected") {
    return (
      <Badge className="bg-red-500/15 text-red-400 border border-red-500/30 text-[10px]">
        Rejected
      </Badge>
    );
  }
  return (
    <Badge className="bg-amber-500/15 text-amber-500 border border-amber-500/30 text-[10px]">
      Pending
    </Badge>
  );
}

function getEntryContextLabel(entry: {
  entryType?: string;
  workOrderId?: string;
  shopActivityCode?: string;
}): string {
  const entryType = entry.entryType ?? "work_order";
  if (entryType === "shop") return entry.shopActivityCode ? `Shop \u00B7 ${entry.shopActivityCode}` : "Shop";
  if (entryType === "task") return "Task Card";
  if (entryType === "step") return "Task Step";
  if (entryType === "shift") return "Shift";
  if (entryType === "break") return "Break";
  if (entryType === "admin") return "Admin";
  return "Work Order";
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function MyTimeSkeleton() {
  return (
    <div className="space-y-5">
      <div className="space-y-1.5">
        <Skeleton className="h-6 w-28" />
        <Skeleton className="h-4 w-48" />
      </div>
      <Skeleton className="h-40 rounded-lg" />
      <div className="grid grid-cols-7 gap-2">
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-lg" />
        ))}
      </div>
      <Skeleton className="h-64 rounded-lg" />
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function MyTimePage() {
  const { orgId, techId, isLoaded } = useCurrentOrg();

  // ── Convex queries ──────────────────────────────────────────────────────────
  const activeTimer = useQuery(
    api.timeClock.getActiveTimerForTechnician,
    orgId && techId ? { orgId, technicianId: techId } : "skip",
  );

  const entries = useQuery(
    api.timeClock.listTimeEntries,
    orgId && techId ? { orgId, technicianId: techId } : "skip",
  );

  const workOrders = useQuery(
    api.workOrders.listActive,
    orgId ? { organizationId: orgId, limit: 200 } : "skip",
  );

  // ── Mutations ───────────────────────────────────────────────────────────────
  const startTimer = useMutation(api.timeClock.startTimer);
  const stopTimer = useMutation(api.timeClock.stopTimer);
  const pauseTimer = useMutation(api.timeClock.pauseTimer);
  const resumeTimer = useMutation(api.timeClock.resumeTimer);

  // ── Clock-in form state ─────────────────────────────────────────────────────
  const [contextType, setContextType] = useState<TimerContextType>("work_order");
  const [selectedWOId, setSelectedWOId] = useState<string>("");
  const [selectedTaskCardId, setSelectedTaskCardId] = useState<string>("");
  const [selectedStepId, setSelectedStepId] = useState<string>("");
  const [shopActivityCode, setShopActivityCode] = useState("");
  const [notes, setNotes] = useState("");

  // ── Action state ────────────────────────────────────────────────────────────
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ── History filters ─────────────────────────────────────────────────────────
  const [filterEntryType, setFilterEntryType] = useState<string>("all");
  const [filterApproval, setFilterApproval] = useState<string>("all");

  // 1-second tick to drive live elapsed display for the active timer card.
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!activeTimer || activeTimer.isPaused) return;
    const id = window.setInterval(() => setTick((v) => v + 1), 1_000);
    return () => window.clearInterval(id);
  }, [activeTimer?.isPaused, activeTimer !== null]);

  // ── Conditional queries for clock-in cascading selects ──────────────────────
  const taskCardsForSelectedWO = useQuery(
    api.taskCards.listTaskCardsForWorkOrder,
    orgId && selectedWOId && (contextType === "task" || contextType === "step")
      ? {
          workOrderId: selectedWOId as Id<"workOrders">,
          organizationId: orgId,
        }
      : "skip",
  );

  const selectedTaskCard = useMemo(() => {
    if (!selectedTaskCardId || !taskCardsForSelectedWO || !Array.isArray(taskCardsForSelectedWO)) {
      return null;
    }
    return taskCardsForSelectedWO.find((card) => card._id === selectedTaskCardId) ?? null;
  }, [selectedTaskCardId, taskCardsForSelectedWO]);

  const availableSteps = useMemo(
    () =>
      (selectedTaskCard?.steps ?? []).filter(
        (step: { status: string }) => step.status !== "completed" && step.status !== "na",
      ),
    [selectedTaskCard],
  );

  // ── Derived data ────────────────────────────────────────────────────────────
  const openWorkOrders = useMemo(
    () =>
      (workOrders ?? []).filter((wo: { status: string }) =>
        ["open", "in_progress", "pending_inspection", "pending_signoff", "on_hold"].includes(wo.status),
      ),
    [workOrders],
  );

  const weeklySummary = useMemo(() => {
    if (!entries) return { days: Array.from({ length: 7 }, () => 0), total: 0 };

    const weekStart = getWeekStart(Date.now());
    const weekStartMs = weekStart.getTime();
    const weekEndMs = weekStartMs + 7 * 24 * 60 * 60 * 1000;

    const days = Array.from({ length: 7 }, () => 0);
    let total = 0;

    for (const entry of entries) {
      if (entry.clockInAt < weekStartMs || entry.clockInAt >= weekEndMs) continue;
      if (normalizeApprovalStatus(entry) === "rejected") continue;

      const minutes =
        entry.durationMinutes !== undefined
          ? entry.durationMinutes
          : getOpenEntryElapsedMinutes({
              clockInAt: entry.clockInAt,
              totalPausedMinutes: entry.totalPausedMinutes,
              pausedAt: entry.pausedAt,
            });

      const entryDate = new Date(entry.clockInAt);
      const dayOfWeek = entryDate.getDay();
      const dayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Monday = 0

      days[dayIndex] += minutes;
      total += minutes;
    }

    return { days, total };
  }, [entries]);

  const filteredEntries = useMemo(() => {
    let result = entries ?? [];

    if (filterEntryType !== "all") {
      result = result.filter((entry) => (entry.entryType ?? "work_order") === filterEntryType);
    }

    if (filterApproval !== "all") {
      result = result.filter((entry) => normalizeApprovalStatus(entry) === filterApproval);
    }

    return result;
  }, [entries, filterEntryType, filterApproval]);

  // ── WO number lookup (from the active WO list) ─────────────────────────────
  const woMap = useMemo(
    () => new Map((workOrders ?? []).map((wo: { _id: string; workOrderNumber: string }) => [wo._id, wo.workOrderNumber])),
    [workOrders],
  );

  // ── Handlers ────────────────────────────────────────────────────────────────

  const resetClockInForm = () => {
    setContextType("work_order");
    setSelectedWOId("");
    setSelectedTaskCardId("");
    setSelectedStepId("");
    setShopActivityCode("");
    setNotes("");
  };

  const handleClockIn = async () => {
    if (!orgId || !techId) return;

    if ((contextType === "work_order" || contextType === "task" || contextType === "step") && !selectedWOId) {
      setError("Select a work order.");
      return;
    }
    if ((contextType === "task" || contextType === "step") && !selectedTaskCardId) {
      setError("Select a task card.");
      return;
    }
    if (contextType === "step" && !selectedStepId) {
      setError("Select a task step.");
      return;
    }

    setActionLoading("start");
    setError(null);
    try {
      await startTimer({
        orgId,
        technicianId: techId,
        entryType: contextType,
        workOrderId:
          contextType === "work_order" || contextType === "task" || contextType === "step"
            ? (selectedWOId as Id<"workOrders">)
            : undefined,
        taskCardId:
          contextType === "task" || contextType === "step"
            ? (selectedTaskCardId as Id<"taskCards">)
            : undefined,
        taskStepId:
          contextType === "step" ? (selectedStepId as Id<"taskCardSteps">) : undefined,
        shopActivityCode: contextType === "shop" ? (shopActivityCode.trim() || undefined) : undefined,
        notes: notes.trim() || undefined,
        source: "my_time",
      });

      resetClockInForm();
      toast.success("Timer started");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start timer.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleStopTimer = async (timeEntryId: Id<"timeEntries">) => {
    if (!orgId) return;
    setActionLoading(`stop-${timeEntryId}`);
    setError(null);
    try {
      await stopTimer({ orgId, timeEntryId });
      toast.success("Timer stopped");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to stop timer.";
      toast.error(msg);
      setError(msg);
    } finally {
      setActionLoading(null);
    }
  };

  const handlePauseTimer = async (timeEntryId: Id<"timeEntries">) => {
    if (!orgId) return;
    setActionLoading(`pause-${timeEntryId}`);
    setError(null);
    try {
      await pauseTimer({ orgId, timeEntryId, source: "my_time" });
      toast.success("Timer paused");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to pause timer.";
      toast.error(msg);
      setError(msg);
    } finally {
      setActionLoading(null);
    }
  };

  const handleResumeTimer = async (timeEntryId: Id<"timeEntries">) => {
    if (!orgId) return;
    setActionLoading(`resume-${timeEntryId}`);
    setError(null);
    try {
      await resumeTimer({ orgId, timeEntryId, source: "my_time" });
      toast.success("Timer resumed");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to resume timer.";
      toast.error(msg);
      setError(msg);
    } finally {
      setActionLoading(null);
    }
  };

  // ── Loading & empty states ──────────────────────────────────────────────────

  if (!isLoaded) {
    return <MyTimeSkeleton />;
  }

  if (!orgId || !techId) {
    return (
      <div className="space-y-5">
        <div>
          <h1 className="text-lg sm:text-xl md:text-2xl font-semibold text-foreground">My Time</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Personal time tracking</p>
        </div>
        <Card className="border-border/60">
          <CardContent className="py-16 text-center">
            <Clock className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm font-medium text-muted-foreground">
              No technician profile linked
            </p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              Your account isn't linked to a technician record yet. Visit Personnel to create or connect one.
            </p>
            <Button asChild size="sm" className="mt-4">
              <Link to="/personnel">Go to Personnel</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (activeTimer === undefined || entries === undefined) {
    return <MyTimeSkeleton />;
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  const hasActiveTimer = activeTimer !== null;
  const isPaused = hasActiveTimer && activeTimer.isPaused;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-lg sm:text-xl md:text-2xl font-semibold text-foreground">My Time</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Personal time tracking</p>
      </div>

      {/* Error banner */}
      {error && (
        <div className="flex items-center gap-2 p-3 rounded-md bg-red-500/10 border border-red-500/30 text-sm text-red-400">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Section 1: Active Timer Card */}
      {hasActiveTimer && (
        <Card
          className={`border ${
            isPaused
              ? "border-amber-500/30 bg-amber-500/5"
              : "border-green-500/30 bg-green-500/5"
          }`}
        >
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              {isPaused ? (
                <>
                  <div className="w-2 h-2 rounded-full bg-amber-500" />
                  <span className="text-amber-500">Paused</span>
                </>
              ) : (
                <>
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-green-400">Active Timer</span>
                </>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className="text-[10px] font-medium border border-border/60"
                  >
                    {activeTimer.entry.entryType === "shop"
                      ? "Shop"
                      : activeTimer.entry.entryType === "task"
                        ? "Task"
                        : activeTimer.entry.entryType === "step"
                          ? "Step"
                          : "Work Order"}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {getEntryContextLabel({
                      entryType: activeTimer.entry.entryType,
                      workOrderId: activeTimer.entry.workOrderId as string | undefined,
                      shopActivityCode: activeTimer.entry.shopActivityCode,
                    })}
                    {activeTimer.entry.workOrderId &&
                      woMap.get(activeTimer.entry.workOrderId as string) &&
                      ` \u00B7 ${woMap.get(activeTimer.entry.workOrderId as string)}`}
                  </span>
                </div>
                <p className="text-2xl font-bold text-foreground tabular-nums">
                  {formatDurationWithSeconds(getOpenEntryElapsedMs(activeTimer.entry))}
                </p>
                <p className="text-xs text-muted-foreground">
                  Started {formatTimestamp(activeTimer.entry.clockInAt)}
                  {activeTimer.pausedMinutes > 0 && (
                    <> &middot; {formatDuration(activeTimer.pausedMinutes)} paused</>
                  )}
                </p>
              </div>

              <div className="flex items-center gap-2">
                {isPaused ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleResumeTimer(activeTimer.entry._id)}
                    disabled={actionLoading === `resume-${activeTimer.entry._id}`}
                    className="h-8 gap-1.5 text-xs border-green-500/40 text-green-400 hover:bg-green-500/10"
                  >
                    <Play className="w-3.5 h-3.5" />
                    {actionLoading === `resume-${activeTimer.entry._id}` ? "..." : "Resume"}
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handlePauseTimer(activeTimer.entry._id)}
                    disabled={actionLoading === `pause-${activeTimer.entry._id}`}
                    className="h-8 gap-1.5 text-xs border-amber-500/40 text-amber-500 hover:bg-amber-500/10"
                  >
                    <Pause className="w-3.5 h-3.5" />
                    {actionLoading === `pause-${activeTimer.entry._id}` ? "..." : "Pause"}
                  </Button>
                )}

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleStopTimer(activeTimer.entry._id)}
                  disabled={actionLoading === `stop-${activeTimer.entry._id}`}
                  className="h-8 gap-1.5 text-xs border-red-500/40 text-red-400 hover:bg-red-500/10"
                >
                  <Square className="w-3.5 h-3.5" />
                  {actionLoading === `stop-${activeTimer.entry._id}` ? "..." : "Stop"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Section 2: Clock-In Card (only when no active timer) */}
      {!hasActiveTimer && (
        <Card className="border-border/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Play className="w-4 h-4 text-muted-foreground" />
              Clock In
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Entry type */}
            <div className="space-y-1.5">
              <Label className="text-xs">Entry Type</Label>
              <Select
                value={contextType}
                onValueChange={(value) => {
                  const next = value as TimerContextType;
                  setContextType(next);
                  setSelectedWOId("");
                  setSelectedTaskCardId("");
                  setSelectedStepId("");
                  setShopActivityCode("");
                }}
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="shop">Shop / Internal</SelectItem>
                  <SelectItem value="work_order">Work Order</SelectItem>
                  <SelectItem value="task">Task Card</SelectItem>
                  <SelectItem value="step">Task Step</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Shop activity code */}
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

            {/* Work order select */}
            {(contextType === "work_order" || contextType === "task" || contextType === "step") && (
              <div className="space-y-1.5">
                <Label className="text-xs">Work Order *</Label>
                <Select
                  value={selectedWOId}
                  onValueChange={(value) => {
                    setSelectedWOId(value);
                    setSelectedTaskCardId("");
                    setSelectedStepId("");
                  }}
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Select work order" />
                  </SelectTrigger>
                  <SelectContent>
                    {openWorkOrders.map((wo: { _id: string; workOrderNumber: string; description: string }) => (
                      <SelectItem key={wo._id} value={wo._id}>
                        {wo.workOrderNumber} — {wo.description.slice(0, 40)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Task card select */}
            {(contextType === "task" || contextType === "step") && (
              <div className="space-y-1.5">
                <Label className="text-xs">Task Card *</Label>
                <Select
                  value={selectedTaskCardId}
                  onValueChange={(value) => {
                    setSelectedTaskCardId(value);
                    setSelectedStepId("");
                  }}
                  disabled={!selectedWOId}
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder={selectedWOId ? "Select task card" : "Select work order first"} />
                  </SelectTrigger>
                  <SelectContent>
                    {(Array.isArray(taskCardsForSelectedWO) ? taskCardsForSelectedWO : []).map(
                      (card: { _id: string; taskCardNumber: string; title: string }) => (
                        <SelectItem key={card._id} value={card._id}>
                          {card.taskCardNumber} — {card.title.slice(0, 38)}
                        </SelectItem>
                      ),
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Step select */}
            {contextType === "step" && (
              <div className="space-y-1.5">
                <Label className="text-xs">Task Step *</Label>
                <Select
                  value={selectedStepId}
                  onValueChange={setSelectedStepId}
                  disabled={!selectedTaskCardId}
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder={selectedTaskCardId ? "Select step" : "Select task card first"} />
                  </SelectTrigger>
                  <SelectContent>
                    {availableSteps.map((step: { _id: string; stepNumber: number; description: string }) => (
                      <SelectItem key={step._id} value={step._id}>
                        Step {step.stepNumber} — {step.description.slice(0, 44)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Notes */}
            <div className="space-y-1.5">
              <Label className="text-xs">Notes (optional)</Label>
              <Input
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Work notes..."
                className="h-9 text-sm"
              />
            </div>

            {/* Clock In button */}
            <Button
              size="sm"
              onClick={handleClockIn}
              disabled={actionLoading === "start"}
              className="h-8 gap-1.5 text-xs bg-green-600 hover:bg-green-700"
            >
              <Play className="w-3.5 h-3.5" />
              {actionLoading === "start" ? "Clocking in..." : "Clock In"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Section 3: Weekly Summary */}
      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">This Week</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-7 gap-2">
            {DAY_LABELS.map((label, i) => {
              const minutes = weeklySummary.days[i];
              const hasTime = minutes > 0;
              return (
                <div
                  key={label}
                  className={`rounded-md border p-2 text-center ${
                    hasTime
                      ? "border-primary/30 bg-primary/5"
                      : "border-border/40 bg-muted/20"
                  }`}
                >
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                    {label}
                  </p>
                  <p
                    className={`text-sm font-semibold mt-0.5 tabular-nums ${
                      hasTime ? "text-foreground" : "text-muted-foreground/40"
                    }`}
                  >
                    {hasTime ? formatDuration(minutes) : "\u2014"}
                  </p>
                </div>
              );
            })}
          </div>
          <div className="flex items-center justify-between pt-1 border-t border-border/40">
            <span className="text-xs text-muted-foreground font-medium">Weekly Total</span>
            <span className="text-sm font-bold text-foreground tabular-nums">
              {formatDuration(weeklySummary.total)}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Section 4: Time History Table */}
      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="text-sm font-medium">Time History</CardTitle>
            <div className="flex items-center gap-2">
              <Select value={filterEntryType} onValueChange={setFilterEntryType}>
                <SelectTrigger className="h-7 w-32 text-xs border-border/60">
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="shop">Shop</SelectItem>
                  <SelectItem value="work_order">Work Order</SelectItem>
                  <SelectItem value="task">Task</SelectItem>
                  <SelectItem value="step">Step</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterApproval} onValueChange={setFilterApproval}>
                <SelectTrigger className="h-7 w-32 text-xs border-border/60">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {filteredEntries.length === 0 ? (
            <div className="py-12 text-center">
              <Clock className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No time entries yet</p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                Clock in above to start tracking your time.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/50">
                    <TableHead className="text-xs">Date</TableHead>
                    <TableHead className="text-xs">Context</TableHead>
                    <TableHead className="text-xs">In</TableHead>
                    <TableHead className="text-xs">Out</TableHead>
                    <TableHead className="text-xs text-right">Duration</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEntries.map((entry) => {
                    const approvalStatus = normalizeApprovalStatus(entry);
                    const isOpen = entry.clockOutAt === undefined;
                    const entryIsPaused = isOpen && entry.pausedAt !== undefined;
                    const openDuration = isOpen
                      ? getOpenEntryElapsedMinutes({
                          clockInAt: entry.clockInAt,
                          totalPausedMinutes: entry.totalPausedMinutes,
                          pausedAt: entry.pausedAt,
                        })
                      : undefined;

                    const contextLabel = getEntryContextLabel({
                      entryType: entry.entryType,
                      workOrderId: entry.workOrderId as string | undefined,
                      shopActivityCode: entry.shopActivityCode,
                    });

                    const woNumber = entry.workOrderId
                      ? woMap.get(entry.workOrderId as string)
                      : undefined;

                    return (
                      <TableRow key={entry._id} className="border-border/40">
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDateShort(entry.clockInAt)}
                        </TableCell>
                        <TableCell className="text-sm">
                          {contextLabel}
                          {woNumber && (
                            <span className="text-muted-foreground"> {woNumber}</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">{formatTimestamp(entry.clockInAt)}</TableCell>
                        <TableCell className="text-sm">
                          {entry.clockOutAt ? (
                            formatTimestamp(entry.clockOutAt)
                          ) : entryIsPaused ? (
                            <Badge className="bg-amber-500/15 text-amber-500 border border-amber-500/30 text-[10px]">
                              Paused
                            </Badge>
                          ) : (
                            <Badge className="bg-green-500/15 text-green-400 border border-green-500/30 text-[10px]">
                              Active
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-sm font-medium text-right tabular-nums">
                          {isOpen ? formatDuration(openDuration) : formatDuration(entry.durationMinutes)}
                        </TableCell>
                        <TableCell>{approvalBadge(approvalStatus)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
          {filteredEntries.length > 0 && (
            <div className="px-4 py-2 border-t border-border/40 text-[10px] text-muted-foreground text-right">
              {filteredEntries.length} {filteredEntries.length === 1 ? "entry" : "entries"}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
