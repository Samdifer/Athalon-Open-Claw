"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  BatteryCharging,
  CalendarDays,
  Gauge,
  Settings2,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import { useSelectedLocation } from "@/components/LocationSwitcher";
import { usePagePrereqs } from "@/hooks/usePagePrereqs";
import { ActionableEmptyState } from "@/components/zero-state/ActionableEmptyState";
import CapacityForecaster from "../_components/CapacityForecaster";
import {
  buildDailyCapacityPoints,
  summarizeCapacityPoints,
} from "../_lib/capacityModel";
import { SchedulingSubNav } from "../_components/SchedulingSubNav";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";

const DAY_MS = 24 * 60 * 60 * 1000;

type ViewMode = "day" | "week" | "month";

const RANGE_PRESETS = [60, 120, 180] as const;
const VIEW_CELL_WIDTHS: Record<ViewMode, number> = {
  day: 40,
  week: 10,
  month: 4,
};

function round1(value: number): string {
  return value.toFixed(1);
}

function utilizationColor(pct: number): string {
  if (pct > 100) return "text-rose-600 dark:text-rose-400";
  if (pct > 85) return "text-amber-600 dark:text-amber-400";
  return "text-emerald-600 dark:text-emerald-400";
}

function utilizationBg(pct: number): string {
  if (pct > 100) return "bg-red-500/10";
  if (pct > 85) return "bg-amber-500/10";
  return "bg-green-500/10";
}

function msFromDateKey(dateKey: string): number {
  const [year, month, day] = dateKey.split("-").map((value) => Number(value));
  return new Date(year, month - 1, day).getTime();
}

function CapacitySkeleton() {
  return (
    <div className="space-y-4" data-testid="page-loading-state">
      <div className="flex items-center gap-2 border-b border-border/30 pb-2">
        <Skeleton className="h-7 w-24" />
        <Skeleton className="h-7 w-16" />
        <Skeleton className="h-7 w-20" />
        <Skeleton className="h-7 w-32" />
      </div>
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-4 w-80" />
        </div>
        <Skeleton className="h-9 w-32" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="border-border/60">
            <CardContent className="p-4 space-y-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-7 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card className="border-border/60">
        <CardContent className="p-0">
          <Skeleton className="h-[260px] w-full" />
        </CardContent>
      </Card>
    </div>
  );
}

export default function CapacityPage() {
  const { orgId, isLoaded } = useCurrentOrg();
  const { selectedLocationId } = useSelectedLocation(orgId);
  const selectedShopLocationFilter =
    selectedLocationId === "all"
      ? "all"
      : (selectedLocationId as Id<"shopLocations">);

  const todayMs = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today.getTime();
  }, []);

  const [rangeDays, setRangeDays] = useState<(typeof RANGE_PRESETS)[number]>(120);
  const [viewMode, setViewMode] = useState<ViewMode>("day");
  const [timelineStartMs, setTimelineStartMs] = useState(() => todayMs - 30 * DAY_MS);
  const [forecasterOpen, setForecasterOpen] = useState(true);

  const [capacityBufferPercent, setCapacityBufferPercent] = useState("");
  const [defaultStartHour, setDefaultStartHour] = useState("");
  const [defaultEndHour, setDefaultEndHour] = useState("");
  const [defaultEfficiency, setDefaultEfficiency] = useState("");
  const [savingSettings, setSavingSettings] = useState(false);

  const capacityScrollRef = useRef<HTMLDivElement>(null);

  const workOrders = useQuery(
    api.workOrders.getWorkOrdersWithScheduleRisk,
    orgId
      ? {
          organizationId: orgId,
          shopLocationId: selectedShopLocationFilter,
        }
      : "skip",
  );

  const plannerProjects = useQuery(
    api.schedulerPlanning.listPlannerProjects,
    orgId
      ? {
          organizationId: orgId,
          includeArchived: true,
          shopLocationId: selectedShopLocationFilter,
        }
      : "skip",
  );

  const technicianWorkload = useQuery(
    api.capacity.getTechnicianWorkload,
    orgId
      ? {
          organizationId: orgId,
          shopLocationId: selectedShopLocationFilter,
        }
      : "skip",
  );

  const schedulingSettings = useQuery(
    api.capacity.getSchedulingSettings,
    orgId ? { organizationId: orgId } : "skip",
  );
  const timelineHolidays = useQuery(
    api.schedulerRoster.listSchedulingHolidaysForRange,
    orgId
      ? {
          organizationId: orgId,
          shopLocationId: selectedShopLocationFilter,
          startDateMs: timelineStartMs,
          endDateMs: timelineStartMs + rangeDays * DAY_MS,
        }
      : "skip",
  );
  const timelineCursorConfig = useQuery(
    api.stationConfig.getTimelineCursorConfig,
    orgId ? { organizationId: orgId } : "skip",
  );

  const upsertSchedulingSettings = useMutation(api.capacity.upsertSchedulingSettings);

  const prereq = usePagePrereqs({
    requiresOrg: true,
    isDataLoading:
      !isLoaded ||
      workOrders === undefined ||
      plannerProjects === undefined ||
      technicianWorkload === undefined ||
      schedulingSettings === undefined ||
      timelineHolidays === undefined ||
      timelineCursorConfig === undefined,
  });

  useEffect(() => {
    if (!schedulingSettings) return;
    setCapacityBufferPercent(String(schedulingSettings.capacityBufferPercent ?? 15));
    setDefaultStartHour(String(schedulingSettings.defaultStartHour ?? 7));
    setDefaultEndHour(String(schedulingSettings.defaultEndHour ?? 17));
    setDefaultEfficiency(String(schedulingSettings.defaultEfficiencyMultiplier ?? 1));
  }, [schedulingSettings]);

  const scheduledProjects = useMemo(
    () => (plannerProjects ?? []).filter((project) => project.archivedAt === undefined),
    [plannerProjects],
  );

  const timelineCellWidth = VIEW_CELL_WIDTHS[viewMode];
  const timelineTotalDays = rangeDays;
  const currentTimelineDay = Math.max(
    0,
    Math.min(timelineTotalDays - 1, Math.floor((todayMs - timelineStartMs) / DAY_MS)),
  );

  const dailyCapacityData = useMemo(
    () =>
      buildDailyCapacityPoints({
        timelineTotalDays,
        timelineStartMs,
        scheduledProjects,
        workOrders: workOrders ?? [],
        technicianWorkload: technicianWorkload ?? [],
      }),
    [scheduledProjects, technicianWorkload, timelineStartMs, timelineTotalDays, workOrders],
  );

  const bufferPercent = schedulingSettings?.capacityBufferPercent ?? 15;

  const capacitySummary = useMemo(
    () => summarizeCapacityPoints(dailyCapacityData, currentTimelineDay, bufferPercent),
    [dailyCapacityData, currentTimelineDay, bufferPercent],
  );

  const holidayDayIndexes = useMemo(
    () =>
      (timelineHolidays ?? [])
        .map((holiday) => Math.floor((msFromDateKey(holiday.dateKey) - timelineStartMs) / DAY_MS))
        .filter((dayIndex) => dayIndex >= 0 && dayIndex < timelineTotalDays),
    [timelineHolidays, timelineStartMs, timelineTotalDays],
  );

  const plannerCursors = useMemo(
    () =>
      (timelineCursorConfig?.cursors ?? []).map((cursor) => ({
        id: cursor.id,
        dayOffset: cursor.dayOffset,
        colorClass: cursor.colorClass,
        enabled: cursor.enabled,
      })),
    [timelineCursorConfig],
  );

  const isOverCapacity =
    capacitySummary.totalLoadHours > capacitySummary.totalAvailableHours + 0.1;
  const isNearBuffer =
    !isOverCapacity && capacitySummary.utilizationPercent > 100 - bufferPercent;

  useEffect(() => {
    if (!capacityScrollRef.current) return;
    capacityScrollRef.current.scrollLeft = Math.max(0, currentTimelineDay * timelineCellWidth - 220);
  }, [currentTimelineDay, timelineCellWidth, timelineStartMs]);

  function handleSetRange(nextRange: (typeof RANGE_PRESETS)[number]) {
    setRangeDays(nextRange);
    setTimelineStartMs(todayMs - Math.round(nextRange / 4) * DAY_MS);
  }

  function handleRecenterToday() {
    setTimelineStartMs(todayMs - Math.round(rangeDays / 4) * DAY_MS);
  }

  async function handleSaveSettings() {
    if (!orgId || !schedulingSettings) return;

    setSavingSettings(true);
    try {
      await upsertSchedulingSettings({
        organizationId: orgId,
        capacityBufferPercent:
          Number(capacityBufferPercent) || schedulingSettings.capacityBufferPercent,
        defaultStartHour: Number(defaultStartHour) || schedulingSettings.defaultStartHour,
        defaultEndHour: Number(defaultEndHour) || schedulingSettings.defaultEndHour,
        defaultEfficiencyMultiplier:
          Number(defaultEfficiency) || schedulingSettings.defaultEfficiencyMultiplier,
      });
      toast.success("Scheduling settings saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save scheduling settings");
    } finally {
      setSavingSettings(false);
    }
  }

  if (prereq.state === "loading_context" || prereq.state === "loading_data") {
    return <CapacitySkeleton />;
  }

  if (prereq.state === "missing_context") {
    return (
      <ActionableEmptyState
        title="Capacity planning requires organization setup"
        missingInfo="Complete onboarding before tracking technician capacity."
        primaryActionLabel="Complete Setup"
        primaryActionType="link"
        primaryActionTarget="/onboarding"
      />
    );
  }

  if (!orgId || !schedulingSettings) return null;

  return (
    <div className="space-y-4" data-testid="capacity-command-center-page">
      <SchedulingSubNav />

      <div className="flex flex-col sm:flex-row gap-2 sm:items-start sm:justify-between">
        <div>
          <h1 className="text-lg sm:text-xl md:text-2xl font-semibold text-foreground flex items-center gap-2">
            <BatteryCharging className="w-5 h-5 text-primary" />
            Capacity Planning
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Load-vs-capacity forecasting with live technician and assignment data.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-[11px]">
            {rangeDays} day horizon
          </Badge>
          <Button variant="outline" size="sm" asChild className="text-xs h-8 border-border/60">
            <Link to="/personnel">Adjust Shifts</Link>
          </Button>
        </div>
      </div>

      {(isNearBuffer || isOverCapacity) && (
        <div
          className={`rounded-lg border p-3 flex items-start gap-2 ${
            isOverCapacity
              ? "border-l-2 border-l-red-500 bg-red-500/5 dark:bg-red-500/10 border-border/40"
              : "border-l-2 border-l-amber-500 bg-amber-500/5 dark:bg-amber-500/10 border-border/40"
          }`}
          aria-live="polite"
        >
          <AlertTriangle
            className={`w-4 h-4 mt-0.5 flex-shrink-0 ${isOverCapacity ? "text-red-600 dark:text-red-400" : "text-amber-600 dark:text-amber-400"}`}
          />
          <div className="space-y-0.5">
            <p className={`text-sm font-semibold ${isOverCapacity ? "text-red-700 dark:text-red-300" : "text-amber-700 dark:text-amber-300"}`}>
              {isOverCapacity ? "Over Capacity" : "Near Capacity"} in the selected window.
            </p>
            <p className="text-xs text-muted-foreground">
              Current view exceeds {isOverCapacity ? "available" : "buffer"} threshold. Rebalance assignments or update shift defaults.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="border-border/60">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Available</p>
                <p className="text-2xl font-bold font-mono text-foreground mt-1">
                  {round1(capacitySummary.totalAvailableHours)}h
                </p>
              </div>
              <div className="p-2 rounded-lg bg-sky-500/10">
                <BatteryCharging className="w-4 h-4 text-sky-600 dark:text-sky-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/60">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Planned Load</p>
                <p className="text-2xl font-bold font-mono text-foreground mt-1">
                  {round1(capacitySummary.totalLoadHours)}h
                </p>
              </div>
              <div className="p-2 rounded-lg bg-amber-500/10">
                <Gauge className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/60">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Utilization</p>
                <p className={`text-2xl font-bold font-mono mt-1 ${utilizationColor(capacitySummary.utilizationPercent)}`}>
                  {capacitySummary.utilizationPercent}%
                </p>
              </div>
              <div className={`p-2 rounded-lg ${utilizationBg(capacitySummary.utilizationPercent)}`}>
                <Gauge className={`w-4 h-4 ${utilizationColor(capacitySummary.utilizationPercent)}`} />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/60">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Peak Day</p>
                <p className={`text-2xl font-bold font-mono mt-1 ${utilizationColor(Math.round(capacitySummary.peakUtilization))}`}>
                  {Math.round(capacitySummary.peakUtilization)}%
                </p>
              </div>
              <div className={`p-2 rounded-lg ${utilizationBg(Math.round(capacitySummary.peakUtilization))}`}>
                <CalendarDays className={`w-4 h-4 ${utilizationColor(Math.round(capacitySummary.peakUtilization))}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/60">
        <CardContent className="p-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs uppercase tracking-wider text-muted-foreground">Range</span>
            {RANGE_PRESETS.map((preset) => (
              <Button
                key={preset}
                size="sm"
                variant={rangeDays === preset ? "secondary" : "outline"}
                className="h-7 text-xs"
                onClick={() => handleSetRange(preset)}
              >
                {preset}d
              </Button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs uppercase tracking-wider text-muted-foreground">Zoom</span>
            {(["day", "week", "month"] as const).map((mode) => (
              <Button
                key={mode}
                size="sm"
                variant={viewMode === mode ? "secondary" : "outline"}
                className="h-7 text-xs capitalize"
                onClick={() => setViewMode(mode)}
              >
                {mode}
              </Button>
            ))}
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={handleRecenterToday}>
              <CalendarDays className="w-3.5 h-3.5" />
              Today
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="rounded-xl border border-border/60 bg-card overflow-hidden" data-testid="capacity-forecaster-shell">
        <CapacityForecaster
          data={dailyCapacityData}
          timelineStartMs={timelineStartMs}
          cellWidth={timelineCellWidth}
          isOpen={forecasterOpen}
          onToggle={() => setForecasterOpen((prev) => !prev)}
          isPoppedOut={false}
          onPopOut={() => {}}
          showPopOutAction={false}
          statusText="Standalone Timeline"
          scrollRef={capacityScrollRef}
          currentDayIndex={currentTimelineDay}
          holidayDayIndexes={holidayDayIndexes}
          cursors={plannerCursors}
          height={236}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)] gap-4">
        <Card className="border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Users className="w-4 h-4 text-muted-foreground" />
              Technician Utilization
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {(technicianWorkload ?? []).length === 0 ? (
              <ActionableEmptyState
                title="No active technicians yet"
                missingInfo="Add technicians and shifts to start tracking available capacity."
                primaryActionLabel="Open Personnel"
                primaryActionType="link"
                primaryActionTarget="/personnel"
              />
            ) : (
              <div className="divide-y divide-border/40">
                {(technicianWorkload ?? []).map((tech) => {
                  const availableHours =
                    (tech.daysOfWeek?.length ?? 0) *
                    Math.max(0, (tech.endHour ?? 0) - (tech.startHour ?? 0)) *
                    (tech.efficiencyMultiplier ?? 1);
                  const assignedHours = tech.estimatedRemainingHours ?? 0;
                  const utilizationPercent =
                    availableHours > 0 ? Math.round((assignedHours / availableHours) * 100) : 0;
                  const utilizationWidth = Math.min(utilizationPercent, 100);

                  return (
                    <div key={String(tech.technicianId)} className="px-4 py-3 space-y-2 hover:bg-muted/30 transition-colors">
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-foreground truncate">{tech.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {round1(assignedHours)}h / {round1(availableHours)}h
                          </div>
                        </div>
                        <div className={`text-xs font-semibold font-mono ${utilizationColor(utilizationPercent)}`}>
                          {utilizationPercent}%
                        </div>
                      </div>
                      <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            utilizationPercent > 100
                              ? "bg-rose-500"
                              : utilizationPercent > 85
                                ? "bg-amber-500"
                                : "bg-emerald-500"
                          }`}
                          style={{ width: `${utilizationWidth}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Settings2 className="w-4 h-4 text-muted-foreground" />
              Capacity Defaults
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="capacity-buffer-percent">Capacity Buffer %</Label>
              <Input
                id="capacity-buffer-percent"
                value={capacityBufferPercent}
                onChange={(e) => setCapacityBufferPercent(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="capacity-default-start">Default Start Hour</Label>
                <Input
                  id="capacity-default-start"
                  value={defaultStartHour}
                  onChange={(e) => setDefaultStartHour(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="capacity-default-end">Default End Hour</Label>
                <Input
                  id="capacity-default-end"
                  value={defaultEndHour}
                  onChange={(e) => setDefaultEndHour(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="capacity-default-efficiency">Default Efficiency</Label>
              <Input
                id="capacity-default-efficiency"
                value={defaultEfficiency}
                onChange={(e) => setDefaultEfficiency(e.target.value)}
              />
            </div>
            <Button
              size="sm"
              onClick={handleSaveSettings}
              disabled={savingSettings}
              data-testid="capacity-save-scheduling-settings"
            >
              {savingSettings ? "Saving..." : "Save Capacity Defaults"}
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <Gauge className="w-3.5 h-3.5" />
        <span>
          {capacitySummary.overloadedDayCount} overloaded day(s), {capacitySummary.nearBufferDayCount} day(s) near buffer in this view.
        </span>
      </div>
    </div>
  );
}
