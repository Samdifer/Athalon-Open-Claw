"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  Play,
  Pause,
  Square,
  Users,
  Activity,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  formatDuration,
  getOpenEntryElapsedMinutes,
  DAILY_THRESHOLD_MINUTES,
} from "@/lib/time-utils";
import type { TimeManagementTabProps } from "../page";

// ---------------------------------------------------------------------------
// Active timer row — re-renders every 15s for live elapsed
// ---------------------------------------------------------------------------
function ActiveTimerRow({
  timer,
  techName,
  orgId,
}: {
  timer: TimeManagementTabProps["activeTimers"][number];
  techName: string;
  orgId: Id<"organizations">;
}) {
  const [elapsed, setElapsed] = useState(() => getOpenEntryElapsedMinutes(timer));

  useEffect(() => {
    const id = setInterval(() => setElapsed(getOpenEntryElapsedMinutes(timer)), 15_000);
    return () => clearInterval(id);
  }, [timer]);

  const stopMut = useMutation(api.timeClock.stopTimer);
  const pauseMut = useMutation(api.timeClock.pauseTimer);
  const resumeMut = useMutation(api.timeClock.resumeTimer);

  const isPaused = timer.pausedAt !== undefined && timer.pausedAt > 0;

  const handleStop = useCallback(async () => {
    try {
      await stopMut({ orgId, timeEntryId: timer._id });
      toast.success(`Stopped timer for ${techName}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to stop timer");
    }
  }, [stopMut, orgId, timer._id, techName]);

  const handlePauseResume = useCallback(async () => {
    try {
      if (isPaused) {
        await resumeMut({ orgId, timeEntryId: timer._id });
        toast.success(`Resumed timer for ${techName}`);
      } else {
        await pauseMut({ orgId, timeEntryId: timer._id });
        toast.success(`Paused timer for ${techName}`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Timer action failed");
    }
  }, [isPaused, resumeMut, pauseMut, orgId, timer._id, techName]);

  return (
    <div className="flex items-center justify-between rounded-md border border-green-500/20 bg-green-500/5 px-3 py-2">
      <div className="flex items-center gap-3">
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-green-500/20">
          <Activity className="h-3.5 w-3.5 text-green-500" />
        </div>
        <div>
          <p className="text-sm font-medium">{techName}</p>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="h-5 text-[10px]">
              {timer.entryType.replace(/_/g, " ")}
            </Badge>
            {timer.shopActivityCode && (
              <span className="text-[10px] text-muted-foreground">
                {timer.shopActivityCode}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <span className="font-mono text-sm tabular-nums text-green-600 dark:text-green-400">
          {formatDuration(elapsed)}
        </span>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={handlePauseResume}
            title={isPaused ? "Resume" : "Pause"}
          >
            {isPaused ? (
              <Play className="h-3.5 w-3.5 text-green-500" />
            ) : (
              <Pause className="h-3.5 w-3.5 text-amber-500" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={handleStop}
            title="Stop"
          >
            <Square className="h-3.5 w-3.5 text-red-400" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main tab component
// ---------------------------------------------------------------------------
export function TeamOverviewTab({
  orgId,
  entries,
  activeTimers,
  technicians,
  techMap,
}: TimeManagementTabProps) {
  // Force re-render for elapsed calculations
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  // ---- Today boundary ----
  const todayStart = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }, []);

  // ---- Today's entries per tech ----
  const todayRows = useMemo(() => {
    // Build a set of active timer IDs for quick lookup
    const activeTimerIds = new Set(activeTimers.map((t) => t._id as string));

    // Compute hours for each technician today
    return technicians.map((tech) => {
      const techIdStr = tech._id as string;

      // Closed entries today
      const todayEntries = entries.filter(
        (e) =>
          e.technicianId === tech._id &&
          e.clockInAt >= todayStart &&
          e.approvalStatus !== "rejected",
      );

      let totalMinutes = 0;
      for (const e of todayEntries) {
        if (e.durationMinutes !== undefined && e.clockOutAt !== undefined) {
          totalMinutes += e.durationMinutes;
        } else {
          totalMinutes += getOpenEntryElapsedMinutes(e);
        }
      }

      // Determine status
      const hasActiveTimer = activeTimers.some(
        (t) => (t.technicianId as string) === techIdStr,
      );
      const isPaused =
        hasActiveTimer &&
        activeTimers.some(
          (t) =>
            (t.technicianId as string) === techIdStr &&
            t.pausedAt !== undefined &&
            t.pausedAt > 0,
        );

      let status: "active" | "paused" | "off-clock" = "off-clock";
      if (hasActiveTimer) status = isPaused ? "paused" : "active";

      // Overtime
      const OT_APPROACH = DAILY_THRESHOLD_MINUTES * 0.9; // 432 min (7.2h)
      let overtime: "normal" | "approaching" | "exceeded" = "normal";
      if (totalMinutes >= DAILY_THRESHOLD_MINUTES) overtime = "exceeded";
      else if (totalMinutes >= OT_APPROACH) overtime = "approaching";

      return {
        techId: tech._id,
        name: tech.legalName,
        status,
        totalMinutes,
        overtime,
      };
    });
  }, [technicians, entries, activeTimers, todayStart]);

  return (
    <div className="space-y-6">
      {/* Active Now */}
      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Activity className="h-4 w-4 text-green-500" />
            Active Now
            {activeTimers.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 text-[10px]">
                {activeTimers.length}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activeTimers.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
              <Users className="h-8 w-8 opacity-30" />
              <p className="text-xs">No team members currently clocked in</p>
            </div>
          ) : (
            <div className="space-y-2">
              {activeTimers.map((timer) => (
                <ActiveTimerRow
                  key={timer._id as string}
                  timer={timer}
                  techName={techMap.get(timer.technicianId as string) ?? "Unknown"}
                  orgId={orgId}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Today's Hours */}
      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Today&apos;s Hours</CardTitle>
        </CardHeader>
        <CardContent>
          {todayRows.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
              <Users className="h-8 w-8 opacity-30" />
              <p className="text-xs">No team members found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-border/40">
                  <TableHead className="text-xs">Technician</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs">Hours Today</TableHead>
                  <TableHead className="text-xs">Overtime</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {todayRows.map((row) => (
                  <TableRow key={row.techId as string} className="border-border/40">
                    <TableCell className="text-sm font-medium">{row.name}</TableCell>
                    <TableCell>
                      {row.status === "active" && (
                        <Badge className="bg-green-500/15 text-green-600 dark:text-green-400 border-0 text-[10px]">
                          Active
                        </Badge>
                      )}
                      {row.status === "paused" && (
                        <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-0 text-[10px]">
                          Paused
                        </Badge>
                      )}
                      {row.status === "off-clock" && (
                        <Badge variant="secondary" className="text-[10px]">
                          Off-Clock
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-sm tabular-nums">
                      {formatDuration(row.totalMinutes)}
                    </TableCell>
                    <TableCell>
                      {row.overtime === "exceeded" && (
                        <Badge className="border-0 bg-red-500/10 text-red-400 text-[10px]">
                          <AlertTriangle className="mr-1 h-3 w-3" />
                          Exceeded
                        </Badge>
                      )}
                      {row.overtime === "approaching" && (
                        <Badge className="border-0 bg-amber-500/10 text-amber-500 text-[10px]">
                          Approaching
                        </Badge>
                      )}
                      {row.overtime === "normal" && (
                        <span className="text-xs text-muted-foreground">--</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
