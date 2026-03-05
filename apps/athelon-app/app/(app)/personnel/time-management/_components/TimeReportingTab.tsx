"use client";

import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, Clock, Users, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  formatDuration,
  getOpenEntryElapsedMinutes,
  getWeekStart,
  DAY_LABELS,
  DAILY_THRESHOLD_MINUTES,
  WEEKLY_THRESHOLD_MINUTES,
} from "@/lib/time-utils";
import type { TimeManagementTabProps } from "../page";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const MS_PER_DAY = 86_400_000;

function weekLabel(weekStart: Date): string {
  const weekEnd = new Date(weekStart.getTime() + 6 * MS_PER_DAY);
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return `${fmt(weekStart)} - ${fmt(weekEnd)}`;
}

function isThisWeek(weekStart: Date): boolean {
  const current = getWeekStart(Date.now());
  return weekStart.getTime() === current.getTime();
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function TimeReportingTab({
  entries,
  activeTimers,
  technicians,
  techMap,
}: TimeManagementTabProps) {
  const [weekOffset, setWeekOffset] = useState(0); // 0 = this week, -1 = last, etc.

  const weekStart = useMemo(() => {
    const base = getWeekStart(Date.now());
    return new Date(base.getTime() + weekOffset * 7 * MS_PER_DAY);
  }, [weekOffset]);

  const weekEnd = useMemo(
    () => new Date(weekStart.getTime() + 7 * MS_PER_DAY),
    [weekStart],
  );

  // ---- Build per-tech, per-day grid ----
  const gridData = useMemo(() => {
    const weekStartMs = weekStart.getTime();

    type RowData = {
      techId: string;
      name: string;
      dailyMinutes: number[];
      weeklyTotal: number;
    };

    const rows: RowData[] = technicians.map((tech) => {
      const dailyMinutes = [0, 0, 0, 0, 0, 0, 0];

      // Closed entries in this week
      const techEntries = entries.filter(
        (e) =>
          e.technicianId === tech._id &&
          e.clockInAt >= weekStartMs &&
          e.clockInAt < weekEnd.getTime() &&
          e.approvalStatus !== "rejected",
      );

      for (const e of techEntries) {
        const dayIdx = Math.floor((e.clockInAt - weekStartMs) / MS_PER_DAY);
        if (dayIdx >= 0 && dayIdx < 7) {
          if (e.durationMinutes !== undefined && e.clockOutAt !== undefined) {
            dailyMinutes[dayIdx] += e.durationMinutes;
          } else {
            dailyMinutes[dayIdx] += getOpenEntryElapsedMinutes(e);
          }
        }
      }

      const weeklyTotal = dailyMinutes.reduce((a, b) => a + b, 0);
      return { techId: tech._id as string, name: tech.legalName, dailyMinutes, weeklyTotal };
    });

    // Compute footer totals
    const footerTotals = [0, 0, 0, 0, 0, 0, 0];
    let grandTotal = 0;
    for (const r of rows) {
      for (let i = 0; i < 7; i++) {
        footerTotals[i] += r.dailyMinutes[i];
      }
      grandTotal += r.weeklyTotal;
    }

    return { rows, footerTotals, grandTotal };
  }, [entries, technicians, weekStart, weekEnd]);

  // ---- Summary stats ----
  const stats = useMemo(() => {
    const totalHours = gridData.grandTotal;
    const techsWithHours = gridData.rows.filter((r) => r.weeklyTotal > 0).length;
    const avgPerTech =
      techsWithHours > 0 ? Math.round(totalHours / techsWithHours) : 0;
    const techsWorkingToday = activeTimers.length;
    return { totalHours, avgPerTech, techsWorkingToday };
  }, [gridData, activeTimers]);

  // ---- Cell styling ----
  function cellClass(dailyMinutes: number): string {
    if (dailyMinutes >= DAILY_THRESHOLD_MINUTES) return "bg-red-500/10 text-red-400";
    if (dailyMinutes >= DAILY_THRESHOLD_MINUTES * 0.9)
      return "bg-amber-500/10 text-amber-500";
    return "";
  }

  return (
    <div className="space-y-6">
      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="border-border/60">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <Clock className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Team Hours</p>
              <p className="text-lg font-semibold tabular-nums">
                {formatDuration(stats.totalHours)}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/60">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <BarChart3 className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Avg per Tech</p>
              <p className="text-lg font-semibold tabular-nums">
                {formatDuration(stats.avgPerTech)}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/60">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-500/10">
              <Users className="h-4 w-4 text-green-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Working Today</p>
              <p className="text-lg font-semibold tabular-nums">
                {stats.techsWorkingToday}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Week selector + grid */}
      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">Weekly Hours Grid</CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => setWeekOffset((o) => o - 1)}
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              <span className="min-w-[160px] text-center text-xs font-medium">
                {weekLabel(weekStart)}
                {isThisWeek(weekStart) && (
                  <Badge variant="secondary" className="ml-2 text-[10px]">
                    This Week
                  </Badge>
                )}
              </span>
              <Button
                variant="outline"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => setWeekOffset((o) => o + 1)}
                disabled={weekOffset >= 0}
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {gridData.rows.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
              <Users className="h-8 w-8 opacity-30" />
              <p className="text-xs">No team members found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-border/40">
                  <TableHead className="text-xs">Technician</TableHead>
                  {DAY_LABELS.map((day) => (
                    <TableHead key={day} className="text-center text-xs">
                      {day}
                    </TableHead>
                  ))}
                  <TableHead className="text-center text-xs font-semibold">
                    Total
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {gridData.rows.map((row) => (
                  <TableRow key={row.techId} className="border-border/40">
                    <TableCell className="text-sm font-medium">{row.name}</TableCell>
                    {row.dailyMinutes.map((mins, i) => (
                      <TableCell
                        key={i}
                        className={`text-center font-mono text-xs tabular-nums ${cellClass(mins)}`}
                      >
                        {mins > 0 ? formatDuration(mins) : "\u2014"}
                      </TableCell>
                    ))}
                    <TableCell
                      className={`text-center font-mono text-xs font-semibold tabular-nums ${
                        row.weeklyTotal >= WEEKLY_THRESHOLD_MINUTES
                          ? "bg-red-500/10 text-red-400"
                          : row.weeklyTotal >= WEEKLY_THRESHOLD_MINUTES * 0.9
                            ? "bg-amber-500/10 text-amber-500"
                            : ""
                      }`}
                    >
                      {formatDuration(row.weeklyTotal)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow className="border-border/40 bg-muted/30">
                  <TableCell className="text-xs font-semibold">Shop Total</TableCell>
                  {gridData.footerTotals.map((mins, i) => (
                    <TableCell
                      key={i}
                      className="text-center font-mono text-xs font-semibold tabular-nums"
                    >
                      {mins > 0 ? formatDuration(mins) : "\u2014"}
                    </TableCell>
                  ))}
                  <TableCell className="text-center font-mono text-xs font-bold tabular-nums">
                    {formatDuration(gridData.grandTotal)}
                  </TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
