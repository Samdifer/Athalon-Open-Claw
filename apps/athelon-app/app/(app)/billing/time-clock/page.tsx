"use client";

import { useMemo, useState } from "react";
import { useMutation, usePaginatedQuery, useQuery } from "convex/react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import type { Id } from "@/convex/_generated/dataModel";
import {
  AlertCircle,
  Clock,
  Pause,
  Play,
  Search,
  Square,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type TimerContextType = "shop" | "work_order" | "task" | "step";

function formatDuration(minutes: number | undefined): string {
  if (minutes === undefined) return "—";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDateShort(ts: number): string {
  return new Date(ts).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function shortId(value: string): string {
  return value.length > 10 ? `${value.slice(0, 6)}…` : value;
}

function getOpenEntryElapsedMinutes(entry: {
  clockInAt: number;
  totalPausedMinutes?: number;
  pausedAt?: number;
}): number {
  const now = Date.now();
  const elapsedMs = now - entry.clockInAt;
  const accruedPauseMs = (entry.totalPausedMinutes ?? 0) * 60_000;
  const activePauseMs = entry.pausedAt ? Math.max(0, now - entry.pausedAt) : 0;
  const activeMs = Math.max(0, elapsedMs - accruedPauseMs - activePauseMs);
  return Math.round(activeMs / 60_000);
}

function normalizeApprovalStatus(entry: {
  approvalStatus?: string;
  approved?: boolean;
}): "pending" | "approved" | "rejected" {
  if (entry.approvalStatus === "approved" || entry.approved === true) return "approved";
  if (entry.approvalStatus === "rejected" || entry.approved === false) return "rejected";
  return "pending";
}

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

export default function TimeClockPage() {
  const { orgId, techId, isLoaded } = useCurrentOrg();

  const entries = useQuery(api.timeClock.listTimeEntries, orgId ? { orgId } : "skip");

  const { results: workOrders, status: woQueryStatus } = usePaginatedQuery(
    api.workOrders.listWorkOrders,
    orgId ? { organizationId: orgId } : "skip",
    { initialNumItems: 100 },
  );

  const technicians = useQuery(
    api.technicians.list,
    orgId ? { organizationId: orgId } : "skip",
  );

  const startTimer = useMutation(api.timeClock.startTimer);
  const stopTimer = useMutation(api.timeClock.stopTimer);
  const pauseTimer = useMutation(api.timeClock.pauseTimer);
  const resumeTimer = useMutation(api.timeClock.resumeTimer);

  const [searchTech, setSearchTech] = useState("");
  const [filterTech, setFilterTech] = useState<string>("all");
  const [filterWO, setFilterWO] = useState<string>("all");

  const [startDialogOpen, setStartDialogOpen] = useState(false);
  const [startTechId, setStartTechId] = useState<string>(techId ?? "");
  const [startContextType, setStartContextType] = useState<TimerContextType>("work_order");
  const [startWOId, setStartWOId] = useState<string>("");
  const [startTaskCardId, setStartTaskCardId] = useState<string>("");
  const [startStepId, setStartStepId] = useState<string>("");
  const [startShopActivityCode, setStartShopActivityCode] = useState("");
  const [startNotes, setStartNotes] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const taskCardsForSelectedWO = useQuery(
    api.taskCards.listTaskCardsForWorkOrder,
    orgId && startWOId && (startContextType === "task" || startContextType === "step")
      ? {
          workOrderId: startWOId as Id<"workOrders">,
          organizationId: orgId,
        }
      : "skip",
  );

  const selectedTaskCard = useMemo(() => {
    if (!startTaskCardId || !taskCardsForSelectedWO || !Array.isArray(taskCardsForSelectedWO)) {
      return null;
    }
    return taskCardsForSelectedWO.find((card) => card._id === startTaskCardId) ?? null;
  }, [startTaskCardId, taskCardsForSelectedWO]);

  const availableSteps = useMemo(
    () => (selectedTaskCard?.steps ?? []).filter((step) => step.status !== "completed" && step.status !== "na"),
    [selectedTaskCard],
  );

  const isLoading = !isLoaded || entries === undefined || woQueryStatus === "LoadingFirstPage";

  const activeEntries = useMemo(
    () => (entries ?? []).filter((entry) => entry.clockOutAt === undefined),
    [entries],
  );

  const techMap = useMemo(
    () => new Map((technicians ?? []).map((tech) => [tech._id as string, tech.legalName])),
    [technicians],
  );

  const woMap = useMemo(
    () => new Map((workOrders ?? []).map((wo) => [wo._id as string, wo.workOrderNumber])),
    [workOrders],
  );

  const getTechName = (technicianId: Id<"technicians">) =>
    techMap.get(technicianId as string) ?? (technicianId as string);

  const getWONumber = (workOrderId: Id<"workOrders"> | undefined) => {
    if (!workOrderId) return "—";
    return woMap.get(workOrderId as string) ?? (workOrderId as string);
  };

  const getEntryContextLabel = (entry: {
    entryType?: string;
    workOrderId?: Id<"workOrders">;
    taskCardId?: Id<"taskCards">;
    taskStepId?: Id<"taskCardSteps">;
    shopActivityCode?: string;
  }): string => {
    const entryType = (entry.entryType ?? "work_order") as TimerContextType | "shift" | "break" | "admin";

    if (entryType === "shop") {
      return entry.shopActivityCode ? `Shop · ${entry.shopActivityCode}` : "Shop";
    }
    if (entryType === "task") {
      return `Task ${entry.taskCardId ? shortId(entry.taskCardId as string) : "—"} · WO ${getWONumber(entry.workOrderId)}`;
    }
    if (entryType === "step") {
      return `Step ${entry.taskStepId ? shortId(entry.taskStepId as string) : "—"} · WO ${getWONumber(entry.workOrderId)}`;
    }
    if (entryType === "shift") return "Shift";
    if (entryType === "break") return "Break";
    if (entryType === "admin") return "Admin";
    return `WO ${getWONumber(entry.workOrderId)}`;
  };

  const filteredEntries = useMemo(() => {
    let result = entries ?? [];

    if (filterTech !== "all") {
      result = result.filter((entry) => entry.technicianId === filterTech);
    }

    if (filterWO !== "all") {
      result = result.filter((entry) => entry.workOrderId === filterWO);
    }

    if (searchTech.trim()) {
      const lower = searchTech.trim().toLowerCase();
      const matchingTechIds = new Set(
        (technicians ?? [])
          .filter((tech) => tech.legalName.toLowerCase().includes(lower))
          .map((tech) => tech._id as string),
      );
      result = result.filter((entry) => matchingTechIds.has(entry.technicianId as string));
    }

    return result;
  }, [entries, filterTech, filterWO, searchTech, technicians]);

  const dailySummary = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayMs = today.getTime();

    const byTech = new Map<string, { techId: Id<"technicians">; totalMinutes: number }>();

    for (const entry of entries ?? []) {
      if (entry.clockInAt < todayMs) continue;

      const key = entry.technicianId as string;
      if (!byTech.has(key)) {
        byTech.set(key, { techId: entry.technicianId, totalMinutes: 0 });
      }

      const minutes =
        entry.durationMinutes !== undefined
          ? entry.durationMinutes
          : getOpenEntryElapsedMinutes({
              clockInAt: entry.clockInAt,
              totalPausedMinutes: entry.totalPausedMinutes,
              pausedAt: entry.pausedAt,
            });

      byTech.get(key)!.totalMinutes += minutes;
    }

    return Array.from(byTech.values());
  }, [entries]);

  const openWorkOrders = useMemo(
    () =>
      (workOrders ?? []).filter((wo) =>
        ["open", "in_progress", "pending_inspection", "pending_signoff", "on_hold"].includes(wo.status),
      ),
    [workOrders],
  );

  const resetStartDialogState = () => {
    setStartTechId(techId ?? "");
    setStartContextType("work_order");
    setStartWOId("");
    setStartTaskCardId("");
    setStartStepId("");
    setStartShopActivityCode("");
    setStartNotes("");
  };

  const handleStartTimer = async () => {
    if (!orgId) return;
    if (!startTechId) {
      setError("Select a technician.");
      return;
    }

    if ((startContextType === "work_order" || startContextType === "task" || startContextType === "step") && !startWOId) {
      setError("Select a work order.");
      return;
    }
    if ((startContextType === "task" || startContextType === "step") && !startTaskCardId) {
      setError("Select a task card.");
      return;
    }
    if (startContextType === "step" && !startStepId) {
      setError("Select a task step.");
      return;
    }

    setActionLoading("start");
    setError(null);
    try {
      await startTimer({
        orgId,
        technicianId: startTechId as Id<"technicians">,
        entryType: startContextType,
        workOrderId:
          startContextType === "work_order" || startContextType === "task" || startContextType === "step"
            ? (startWOId as Id<"workOrders">)
            : undefined,
        taskCardId:
          startContextType === "task" || startContextType === "step"
            ? (startTaskCardId as Id<"taskCards">)
            : undefined,
        taskStepId:
          startContextType === "step" ? (startStepId as Id<"taskCardSteps">) : undefined,
        shopActivityCode: startContextType === "shop" ? (startShopActivityCode.trim() || undefined) : undefined,
        notes: startNotes.trim() || undefined,
        source: "billing_time_clock",
      });

      setStartDialogOpen(false);
      resetStartDialogState();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start timer.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleStopTimer = async (timeEntryId: Id<"timeEntries">) => {
    if (!orgId) return;
    const actionKey = `stop-${timeEntryId}`;
    setActionLoading(actionKey);
    setError(null);
    try {
      await stopTimer({ orgId, timeEntryId });
      toast.success("Timer stopped");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to stop timer.";
      // BUG-BM-004: Use toast.error so failures are visible regardless of scroll position
      toast.error(msg);
      setError(msg);
    } finally {
      setActionLoading(null);
    }
  };

  const handlePauseTimer = async (timeEntryId: Id<"timeEntries">) => {
    if (!orgId) return;
    const actionKey = `pause-${timeEntryId}`;
    setActionLoading(actionKey);
    setError(null);
    try {
      await pauseTimer({ orgId, timeEntryId, source: "billing_time_clock" });
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
    const actionKey = `resume-${timeEntryId}`;
    setActionLoading(actionKey);
    setError(null);
    try {
      await resumeTimer({ orgId, timeEntryId, source: "billing_time_clock" });
      toast.success("Timer resumed");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to resume timer.";
      toast.error(msg);
      setError(msg);
    } finally {
      setActionLoading(null);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <Card className="border-border/60"><CardContent className="p-6"><Skeleton className="h-32 w-full" /></CardContent></Card>
          <Card className="border-border/60"><CardContent className="p-6"><Skeleton className="h-32 w-full" /></CardContent></Card>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg sm:text-xl font-semibold text-foreground">Time Clock</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {activeEntries.length} active · {(entries ?? []).length} total entries
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => {
            resetStartDialogState();
            setStartDialogOpen(true);
          }}
          className="h-8 gap-1.5 text-xs"
        >
          <Play className="w-3.5 h-3.5" />
          Clock In
        </Button>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-md bg-red-500/10 border border-red-500/30 text-sm text-red-400">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {activeEntries.length > 0 && (
        <Card className="border-border/60 border-green-500/30 bg-green-500/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              Active Timers ({activeEntries.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {activeEntries.map((entry) => {
              const isPaused = entry.pausedAt !== undefined;
              const elapsedMinutes = getOpenEntryElapsedMinutes({
                clockInAt: entry.clockInAt,
                totalPausedMinutes: entry.totalPausedMinutes,
                pausedAt: entry.pausedAt,
              });

              return (
                <div
                  key={entry._id}
                  className="flex items-center justify-between p-3 rounded-md bg-background/50 border border-border/50"
                >
                  <div>
                    <p className="text-sm font-medium">{getTechName(entry.technicianId)}</p>
                    <p className="text-xs text-muted-foreground">
                      {getEntryContextLabel(entry)} · Started {formatTime(entry.clockInAt)}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge
                      className={`border text-[10px] ${
                        isPaused
                          ? "bg-amber-500/15 text-amber-500 border-amber-500/30"
                          : "bg-green-500/15 text-green-400 border-green-500/30"
                      }`}
                    >
                      {isPaused ? "PAUSED" : "ACTIVE"} · {formatDuration(elapsedMinutes)}
                    </Badge>

                    {isPaused ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleResumeTimer(entry._id)}
                        disabled={actionLoading === `resume-${entry._id}`}
                        className="h-7 gap-1 text-xs border-green-500/40 text-green-400 hover:bg-green-500/10"
                      >
                        <Play className="w-3 h-3" />
                        {actionLoading === `resume-${entry._id}` ? "..." : "Resume"}
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handlePauseTimer(entry._id)}
                        disabled={actionLoading === `pause-${entry._id}`}
                        className="h-7 gap-1 text-xs border-amber-500/40 text-amber-500 hover:bg-amber-500/10"
                      >
                        <Pause className="w-3 h-3" />
                        {actionLoading === `pause-${entry._id}` ? "..." : "Pause"}
                      </Button>
                    )}

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleStopTimer(entry._id)}
                      disabled={actionLoading === `stop-${entry._id}`}
                      className="h-7 gap-1 text-xs border-red-500/40 text-red-400 hover:bg-red-500/10"
                    >
                      <Square className="w-3 h-3" />
                      {actionLoading === `stop-${entry._id}` ? "..." : "Stop"}
                    </Button>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Card className="border-border/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Today&apos;s Summary</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {dailySummary.length === 0 ? (
              <div className="py-8 text-center">
                <Clock className="w-6 h-6 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">No entries today.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border/50">
                      <TableHead className="text-xs">Technician</TableHead>
                      <TableHead className="text-xs text-right">Hours</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dailySummary.map((row) => (
                      <TableRow key={row.techId as string} className="border-border/40">
                        <TableCell className="text-sm">{getTechName(row.techId)}</TableCell>
                        <TableCell className="text-sm font-medium text-right">
                          {formatDuration(row.totalMinutes)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search technician..."
                value={searchTech}
                onChange={(event) => setSearchTech(event.target.value)}
                className="h-8 pl-8 text-xs bg-muted/30 border-border/60"
              />
            </div>
            <Select value={filterTech} onValueChange={setFilterTech}>
              <SelectTrigger className="h-8 w-40 text-xs border-border/60">
                <SelectValue placeholder="All technicians" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Technicians</SelectItem>
                {(technicians ?? []).map((tech) => (
                  <SelectItem key={tech._id} value={tech._id}>
                    {tech.legalName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterWO} onValueChange={setFilterWO}>
              <SelectTrigger className="h-8 w-40 text-xs border-border/60">
                <SelectValue placeholder="All WOs" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Work Orders</SelectItem>
                {(workOrders ?? []).map((wo) => (
                  <SelectItem key={wo._id} value={wo._id}>
                    {wo.workOrderNumber}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Card className="border-border/60">
            <CardContent className="p-0">
              {filteredEntries.length === 0 ? (
                <div className="py-12 text-center">
                  <Clock className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">No time entries found.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border/50">
                        <TableHead className="text-xs">Technician</TableHead>
                        <TableHead className="text-xs">Context</TableHead>
                        <TableHead className="text-xs">Date</TableHead>
                        <TableHead className="text-xs">In</TableHead>
                        <TableHead className="text-xs">Out</TableHead>
                        <TableHead className="text-xs text-right">Duration</TableHead>
                        <TableHead className="text-xs">Approval</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredEntries.map((entry) => {
                        const approvalStatus = normalizeApprovalStatus(entry);
                        const isOpen = entry.clockOutAt === undefined;
                        const isPaused = isOpen && entry.pausedAt !== undefined;
                        const openDuration = getOpenEntryElapsedMinutes({
                          clockInAt: entry.clockInAt,
                          totalPausedMinutes: entry.totalPausedMinutes,
                          pausedAt: entry.pausedAt,
                        });

                        return (
                          <TableRow key={entry._id} className="border-border/40">
                            <TableCell className="text-sm">{getTechName(entry.technicianId)}</TableCell>
                            <TableCell className="text-sm">{getEntryContextLabel(entry)}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {formatDateShort(entry.clockInAt)}
                            </TableCell>
                            <TableCell className="text-sm">{formatTime(entry.clockInAt)}</TableCell>
                            <TableCell className="text-sm">
                              {entry.clockOutAt ? (
                                formatTime(entry.clockOutAt)
                              ) : isPaused ? (
                                <Badge className="bg-amber-500/15 text-amber-500 border border-amber-500/30 text-[10px]">
                                  Paused
                                </Badge>
                              ) : (
                                <Badge className="bg-green-500/15 text-green-400 border border-green-500/30 text-[10px]">
                                  Active
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-sm font-medium text-right">
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
      </div>

      {/* Clock In Dialog */}
      <Dialog open={startDialogOpen} onOpenChange={setStartDialogOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Clock In</DialogTitle>
            <DialogDescription>
              Select technician and timer context.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Technician *</Label>
              <Select value={startTechId} onValueChange={setStartTechId}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Select technician" />
                </SelectTrigger>
                <SelectContent>
                  {(technicians ?? []).map((tech) => (
                    <SelectItem key={tech._id} value={tech._id}>
                      {tech.legalName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {startTechId && (() => {
              const existingActive = activeEntries.find(
                (entry) => (entry.technicianId as string) === startTechId,
              );
              if (!existingActive) return null;

              return (
                <div className="flex items-start gap-2 p-3 rounded-md bg-amber-500/10 border border-amber-500/30 text-xs text-amber-600 dark:text-amber-400">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold">Technician already has an active timer.</span>
                    {" "}
                    {getEntryContextLabel(existingActive)} since {formatTime(existingActive.clockInAt)}.
                  </div>
                </div>
              );
            })()}

            <div className="space-y-1.5">
              <Label className="text-xs">Context *</Label>
              <Select
                value={startContextType}
                onValueChange={(nextValue) => {
                  const nextContext = nextValue as TimerContextType;
                  setStartContextType(nextContext);
                  setStartWOId("");
                  setStartTaskCardId("");
                  setStartStepId("");
                  setStartShopActivityCode("");
                }}
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Select context" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="shop">Shop / Internal</SelectItem>
                  <SelectItem value="work_order">Work Order</SelectItem>
                  <SelectItem value="task">Task Card</SelectItem>
                  <SelectItem value="step">Task Step</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {startContextType === "shop" && (
              <div className="space-y-1.5">
                <Label className="text-xs">Shop Activity Code (optional)</Label>
                <Input
                  value={startShopActivityCode}
                  onChange={(event) => setStartShopActivityCode(event.target.value)}
                  placeholder="training, admin, tooling..."
                  className="h-9 text-sm"
                />
              </div>
            )}

            {(startContextType === "work_order" || startContextType === "task" || startContextType === "step") && (
              <div className="space-y-1.5">
                <Label className="text-xs">Work Order *</Label>
                <Select
                  value={startWOId}
                  onValueChange={(value) => {
                    setStartWOId(value);
                    setStartTaskCardId("");
                    setStartStepId("");
                  }}
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Select work order" />
                  </SelectTrigger>
                  <SelectContent>
                    {openWorkOrders.map((wo) => (
                      <SelectItem key={wo._id} value={wo._id}>
                        {wo.workOrderNumber} — {wo.description.slice(0, 40)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {(startContextType === "task" || startContextType === "step") && (
              <div className="space-y-1.5">
                <Label className="text-xs">Task Card *</Label>
                <Select
                  value={startTaskCardId}
                  onValueChange={(value) => {
                    setStartTaskCardId(value);
                    setStartStepId("");
                  }}
                  disabled={!startWOId}
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder={startWOId ? "Select task card" : "Select work order first"} />
                  </SelectTrigger>
                  <SelectContent>
                    {(Array.isArray(taskCardsForSelectedWO) ? taskCardsForSelectedWO : []).map((card) => (
                      <SelectItem key={card._id} value={card._id}>
                        {card.taskCardNumber} — {card.title.slice(0, 38)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {startContextType === "step" && (
              <div className="space-y-1.5">
                <Label className="text-xs">Task Step *</Label>
                <Select
                  value={startStepId}
                  onValueChange={setStartStepId}
                  disabled={!startTaskCardId}
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder={startTaskCardId ? "Select step" : "Select task card first"} />
                  </SelectTrigger>
                  <SelectContent>
                    {availableSteps.map((step) => (
                      <SelectItem key={step._id} value={step._id}>
                        Step {step.stepNumber} — {step.description.slice(0, 44)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs">Notes (optional)</Label>
              <Input
                value={startNotes}
                onChange={(event) => setStartNotes(event.target.value)}
                placeholder="Work notes..."
                className="h-9 text-sm"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setStartDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleStartTimer}
              disabled={actionLoading === "start"}
              className="bg-green-600 hover:bg-green-700 gap-1.5"
            >
              <Play className="w-3.5 h-3.5" />
              {actionLoading === "start" ? "Clocking in..." : "Clock In"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
