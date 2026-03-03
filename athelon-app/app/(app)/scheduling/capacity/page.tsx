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
  if (pct > 100) return "text-rose-400";
  if (pct > 85) return "text-amber-400";
  return "text-emerald-400";
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
              <Skeleton className="h-8 w-20" />
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

  const upsertSchedulingSettings = useMutation(api.capacity.upsertSchedulingSettings);

  const prereq = usePagePrereqs({
    requiresOrg: true,
    isDataLoading:
      !isLoaded ||
      workOrders === undefined ||
      plannerProjects === undefined ||
      technicianWorkload === undefined ||
      schedulingSettings === undefined,
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
      <div className="flex items-center gap-1 flex-wrap border-b border-border/30 pb-2 -mb-1">
        <Button variant="ghost" size="sm" className="text-xs h-7" asChild>
          <Link to="/scheduling">Gantt Board</Link>
        </Button>
        <Button variant="ghost" size="sm" className="text-xs h-7" asChild>
          <Link to="/scheduling/bays">Bays</Link>
        </Button>
        <Button variant="secondary" size="sm" className="text-xs h-7" asChild>
          <Link to="/scheduling/capacity">Capacity</Link>
        </Button>
        <Button variant="ghost" size="sm" className="text-xs h-7" asChild>
          <Link to="/scheduling/roster">Roster & Teams</Link>
        </Button>
        <Button variant="ghost" size="sm" className="text-xs h-7" asChild>
          <Link to="/scheduling/financial-planning">Financial Planning</Link>
        </Button>
      </div>

      <div className="rounded-xl border border-slate-700/70 bg-gradient-to-br from-slate-950 to-slate-900 p-4 shadow-[0_0_0_1px_rgba(15,23,42,0.4)]">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold text-slate-100 flex items-center gap-2">
              <BatteryCharging className="w-5 h-5 text-blue-400" />
              Capacity Command Center
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Dedicated load-vs-capacity forecasting with live technician and assignment data.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="bg-slate-800 text-slate-200 border-slate-700">
              {rangeDays} day horizon
            </Badge>
            <Button variant="outline" size="sm" asChild className="text-xs h-8 border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800">
              <Link to="/personnel">Adjust Shifts</Link>
            </Button>
          </div>
        </div>

        {(isNearBuffer || isOverCapacity) && (
          <div
            className={`mt-3 rounded-lg border p-3 flex items-start gap-2 ${
              isOverCapacity
                ? "border-rose-500/40 bg-rose-500/10"
                : "border-amber-500/40 bg-amber-500/10"
            }`}
            aria-live="polite"
          >
            <AlertTriangle
              className={`w-4 h-4 mt-0.5 ${isOverCapacity ? "text-rose-400" : "text-amber-400"}`}
            />
            <div className="space-y-0.5">
              <p className={`text-sm font-semibold ${isOverCapacity ? "text-rose-300" : "text-amber-300"}`}>
                {isOverCapacity ? "Over Capacity" : "Near Capacity"} in the selected window.
              </p>
              <p className="text-xs text-slate-400">
                Current view exceeds {isOverCapacity ? "available" : "buffer"} threshold. Rebalance assignments or update shift defaults.
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="border-slate-700 bg-slate-900/60">
          <CardContent className="p-4">
            <p className="text-[11px] uppercase tracking-wide text-slate-500">Available</p>
            <p className="text-2xl font-semibold font-mono text-slate-100 mt-1">
              {round1(capacitySummary.totalAvailableHours)}h
            </p>
          </CardContent>
        </Card>
        <Card className="border-slate-700 bg-slate-900/60">
          <CardContent className="p-4">
            <p className="text-[11px] uppercase tracking-wide text-slate-500">Planned Load</p>
            <p className="text-2xl font-semibold font-mono text-slate-100 mt-1">
              {round1(capacitySummary.totalLoadHours)}h
            </p>
          </CardContent>
        </Card>
        <Card className="border-slate-700 bg-slate-900/60">
          <CardContent className="p-4">
            <p className="text-[11px] uppercase tracking-wide text-slate-500">Utilization</p>
            <p className={`text-2xl font-semibold font-mono mt-1 ${utilizationColor(capacitySummary.utilizationPercent)}`}>
              {capacitySummary.utilizationPercent}%
            </p>
          </CardContent>
        </Card>
        <Card className="border-slate-700 bg-slate-900/60">
          <CardContent className="p-4">
            <p className="text-[11px] uppercase tracking-wide text-slate-500">Peak Day</p>
            <p className={`text-2xl font-semibold font-mono mt-1 ${utilizationColor(Math.round(capacitySummary.peakUtilization))}`}>
              {Math.round(capacitySummary.peakUtilization)}%
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-700 bg-slate-900/60">
        <CardContent className="p-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs uppercase tracking-wider text-slate-500">Range</span>
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
            <span className="text-xs uppercase tracking-wider text-slate-500">Zoom</span>
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

      <div className="rounded-xl border border-slate-700 bg-slate-900/60 overflow-hidden" data-testid="capacity-forecaster-shell">
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
          holidayDayIndexes={[]}
          height={236}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(320px,0.9fr)_minmax(0,1.1fr)] gap-4">
        <Card className="border-slate-700 bg-slate-900/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-100 flex items-center gap-2">
              <Settings2 className="w-4 h-4 text-slate-400" />
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

        <Card className="border-slate-700 bg-slate-900/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-100 flex items-center gap-2">
              <Users className="w-4 h-4 text-slate-400" />
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
              <div className="divide-y divide-slate-800">
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
                    <div key={String(tech.technicianId)} className="px-4 py-3 space-y-2">
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-slate-100 truncate">{tech.name}</div>
                          <div className="text-xs text-slate-500">
                            {round1(assignedHours)}h / {round1(availableHours)}h
                          </div>
                        </div>
                        <div className={`text-xs font-semibold font-mono ${utilizationColor(utilizationPercent)}`}>
                          {utilizationPercent}%
                        </div>
                      </div>
                      <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
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
