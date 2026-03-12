"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { Clock, Calendar, Flag, Plus, Trash2, Save, RotateCcw } from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";

import { CURSOR_COLORS, CURSOR_PRESETS } from "./CursorPresets";
import { AVIATION_TIMEZONES } from "@/src/shared/lib/timezones";

type OperatingDay = {
  dayOfWeek: number; // 0=Mon..6=Sun
  label: string;
  isOpen: boolean;
  openTime: string;
  closeTime: string;
};

type Holiday = {
  id: string;
  serverId?: Id<"schedulingHolidays">;
  shopLocationId?: Id<"shopLocations">;
  date: string;
  name: string;
  isObserved: boolean;
};

type TimelineCursor = {
  id: string;
  label: string;
  dayOffset: number;
  colorClass: string;
  enabled: boolean;
};

const SHIFT_DAY_OPTIONS = [
  { value: 0, label: "Sun" },
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
] as const;

const DAY_LABELS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

function generateTimeOptions(): string[] {
  const options: string[] = [];
  for (let hour = 0; hour < 24; hour += 1) {
    for (let minute = 0; minute < 60; minute += 30) {
      options.push(`${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`);
    }
  }
  return options;
}

const TIME_OPTIONS = generateTimeOptions();

function fallbackSchedule(): OperatingDay[] {
  return DAY_LABELS.map((label, index) => ({
    dayOfWeek: index,
    label,
    isOpen: index < 5,
    openTime: "07:00",
    closeTime: "17:00",
  }));
}

function buildCursorId(): string {
  return `cursor-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function SchedulingPreferencesTab() {
  const { orgId } = useCurrentOrg();
  const organizationId = orgId as Id<"organizations"> | undefined;

  const workspace = useQuery(
    api.stationConfig.getStationConfigWorkspace,
    organizationId ? { organizationId } : "skip",
  );

  const saveSchedulingPreferences = useMutation(api.stationConfig.saveSchedulingPreferences);
  const saveTimelineCursorConfig = useMutation(api.stationConfig.saveTimelineCursorConfig);

  const [schedule, setSchedule] = useState<OperatingDay[]>(fallbackSchedule);
  const [timezone, setTimezone] = useState("America/Denver");
  const [capacityBufferPercent, setCapacityBufferPercent] = useState(15);
  const [defaultShiftDays, setDefaultShiftDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [defaultStartHour, setDefaultStartHour] = useState(7);
  const [defaultEndHour, setDefaultEndHour] = useState(17);
  const [defaultEfficiency, setDefaultEfficiency] = useState(1);

  const [holidays, setHolidays] = useState<Holiday[]>([]);

  const [cursors, setCursors] = useState<TimelineCursor[]>([]);
  const [selectedPreset, setSelectedPreset] = useState(CURSOR_PRESETS[0].id);
  const [colorPickerOpen, setColorPickerOpen] = useState<string | null>(null);
  const colorPickerRef = useRef<HTMLDivElement>(null);

  const [savedSnapshot, setSavedSnapshot] = useState("");

  const isDirty = useMemo(() => {
    const snapshot = JSON.stringify({
      schedule,
      timezone,
      capacityBufferPercent,
      defaultShiftDays,
      defaultStartHour,
      defaultEndHour,
      defaultEfficiency,
      holidays,
      cursors,
    });
    return savedSnapshot !== "" && snapshot !== savedSnapshot;
  }, [
    schedule,
    timezone,
    capacityBufferPercent,
    defaultShiftDays,
    defaultStartHour,
    defaultEndHour,
    defaultEfficiency,
    holidays,
    cursors,
    savedSnapshot,
  ]);

  useEffect(() => {
    if (!workspace) return;

    const preferences = workspace.schedulingPreferences;
    const nextSchedule = (preferences.operatingHours ?? fallbackSchedule()).map((day: any, index: number) => ({
      dayOfWeek: day.dayOfWeek,
      label: DAY_LABELS[index] ?? `Day ${index + 1}`,
      isOpen: day.isOpen,
      openTime: day.openTime,
      closeTime: day.closeTime,
    }));

    const nextHolidays = (workspace.holidays ?? []).map((holiday: any) => ({
      id: String(holiday._id),
      serverId: holiday._id,
      shopLocationId: holiday.shopLocationId,
      date: holiday.dateKey,
      name: holiday.name,
      isObserved: holiday.isObserved,
    }));

    const nextCursors = (workspace.timelineCursorConfig ?? []).map((cursor: any) => ({
      id: cursor.id,
      label: cursor.label,
      dayOffset: cursor.dayOffset,
      colorClass: cursor.colorClass,
      enabled: cursor.enabled,
    }));

    const nextSnapshot = JSON.stringify({
      schedule: nextSchedule,
      timezone: preferences.timezone,
      capacityBufferPercent: preferences.capacityBufferPercent,
      defaultShiftDays: preferences.defaultShiftDays,
      defaultStartHour: preferences.defaultStartHour,
      defaultEndHour: preferences.defaultEndHour,
      defaultEfficiency: preferences.defaultEfficiencyMultiplier,
      holidays: nextHolidays,
      cursors: nextCursors,
    });

    setSchedule(nextSchedule);
    setTimezone(preferences.timezone);
    setCapacityBufferPercent(preferences.capacityBufferPercent);
    setDefaultShiftDays(preferences.defaultShiftDays);
    setDefaultStartHour(preferences.defaultStartHour);
    setDefaultEndHour(preferences.defaultEndHour);
    setDefaultEfficiency(preferences.defaultEfficiencyMultiplier);
    setHolidays(nextHolidays);
    setCursors(nextCursors);
    setSavedSnapshot(nextSnapshot);
  }, [workspace]);

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (colorPickerRef.current && !colorPickerRef.current.contains(event.target as Node)) {
        setColorPickerOpen(null);
      }
    }

    if (colorPickerOpen) {
      document.addEventListener("mousedown", handleClick);
      return () => document.removeEventListener("mousedown", handleClick);
    }
    return undefined;
  }, [colorPickerOpen]);

  const updateDay = useCallback((dayIndex: number, patch: Partial<OperatingDay>) => {
    setSchedule((prev) => prev.map((day, index) => (index === dayIndex ? { ...day, ...patch } : day)));
  }, []);

  const toggleDefaultShiftDay = useCallback((day: number) => {
    setDefaultShiftDays((prev) =>
      prev.includes(day)
        ? prev.filter((value) => value !== day)
        : [...prev, day].sort((a, b) => a - b),
    );
  }, []);

  const addHoliday = useCallback(() => {
    setHolidays((prev) => [
      ...prev,
      {
        id: `new-${Date.now()}`,
        date: "",
        name: "",
        isObserved: true,
      },
    ]);
  }, []);

  const updateHoliday = useCallback((id: string, patch: Partial<Holiday>) => {
    setHolidays((prev) => prev.map((holiday) => (holiday.id === id ? { ...holiday, ...patch } : holiday)));
  }, []);

  const removeHoliday = useCallback((id: string) => {
    setHolidays((prev) => prev.filter((holiday) => holiday.id !== id));
  }, []);

  const applyCursorPreset = useCallback(
    (mode: "replace" | "add") => {
      const preset = CURSOR_PRESETS.find((value) => value.id === selectedPreset);
      if (!preset) return;

      const presetCursors = preset.cursors.map((cursor) => ({
        id: buildCursorId(),
        label: cursor.label,
        dayOffset: cursor.dayOffset,
        colorClass: cursor.color,
        enabled: cursor.enabled,
      }));

      if (mode === "replace") {
        setCursors(presetCursors);
        toast.success(`Replaced cursors with "${preset.name}"`);
        return;
      }

      setCursors((prev) => [...prev, ...presetCursors]);
      toast.success(`Added "${preset.name}" cursors`);
    },
    [selectedPreset],
  );

  const addCursor = useCallback(() => {
    setCursors((prev) => [
      ...prev,
      {
        id: buildCursorId(),
        label: "New Cursor",
        dayOffset: 0,
        colorClass: "bg-sky-500",
        enabled: true,
      },
    ]);
  }, []);

  const updateCursor = useCallback((id: string, patch: Partial<TimelineCursor>) => {
    setCursors((prev) => prev.map((cursor) => (cursor.id === id ? { ...cursor, ...patch } : cursor)));
  }, []);

  const removeCursor = useCallback((id: string) => {
    setCursors((prev) => prev.filter((cursor) => cursor.id !== id));
  }, []);

  const handleSave = useCallback(async () => {
    if (!organizationId) return;

    const invalidHoliday = holidays.find((holiday) => !holiday.date || !holiday.name.trim());
    if (invalidHoliday) {
      toast.error("Each holiday requires both a date and a name");
      return;
    }

    try {
      await saveSchedulingPreferences({
        organizationId,
        timezone,
        operatingHours: schedule.map((day) => ({
          dayOfWeek: day.dayOfWeek,
          isOpen: day.isOpen,
          openTime: day.openTime,
          closeTime: day.closeTime,
        })),
        capacityBufferPercent,
        defaultShiftDays,
        defaultStartHour,
        defaultEndHour,
        defaultEfficiencyMultiplier: defaultEfficiency,
        holidays: holidays.map((holiday) => ({
          id: holiday.serverId,
          shopLocationId: holiday.shopLocationId,
          dateKey: holiday.date,
          name: holiday.name.trim(),
          isObserved: holiday.isObserved,
        })),
      });

      await saveTimelineCursorConfig({
        organizationId,
        cursors: cursors.map((cursor) => ({
          id: cursor.id,
          label: cursor.label,
          dayOffset: cursor.dayOffset,
          colorClass: cursor.colorClass,
          enabled: cursor.enabled,
        })),
      });

      const nextSnapshot = JSON.stringify({
        schedule,
        timezone,
        capacityBufferPercent,
        defaultShiftDays,
        defaultStartHour,
        defaultEndHour,
        defaultEfficiency,
        holidays,
        cursors,
      });
      setSavedSnapshot(nextSnapshot);
      toast.success("Scheduling preferences saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save scheduling preferences");
    }
  }, [
    organizationId,
    timezone,
    schedule,
    capacityBufferPercent,
    defaultShiftDays,
    defaultStartHour,
    defaultEndHour,
    defaultEfficiency,
    holidays,
    cursors,
    saveSchedulingPreferences,
    saveTimelineCursorConfig,
  ]);

  const handleReset = useCallback(() => {
    if (!savedSnapshot) return;
    const parsed = JSON.parse(savedSnapshot) as {
      schedule: OperatingDay[];
      timezone: string;
      capacityBufferPercent: number;
      defaultShiftDays: number[];
      defaultStartHour: number;
      defaultEndHour: number;
      defaultEfficiency: number;
      holidays: Holiday[];
      cursors: TimelineCursor[];
    };

    setSchedule(parsed.schedule);
    setTimezone(parsed.timezone);
    setCapacityBufferPercent(parsed.capacityBufferPercent);
    setDefaultShiftDays(parsed.defaultShiftDays);
    setDefaultStartHour(parsed.defaultStartHour);
    setDefaultEndHour(parsed.defaultEndHour);
    setDefaultEfficiency(parsed.defaultEfficiency);
    setHolidays(parsed.holidays);
    setCursors(parsed.cursors);
    toast("Changes reverted");
  }, [savedSnapshot]);

  if (workspace === undefined) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Clock className="size-4 text-muted-foreground" />
            Operating Hours & Defaults
          </CardTitle>
          <CardDescription>
            Define station working hours, timezone, and baseline scheduling defaults.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            {schedule.map((day, idx) => (
              <div
                key={day.dayOfWeek}
                className="grid grid-cols-[7rem_1fr_auto_1fr_auto] items-center gap-2"
              >
                <span
                  className={`text-sm font-medium ${!day.isOpen ? "text-muted-foreground line-through" : ""}`}
                >
                  {day.label}
                </span>

                <Select
                  value={day.openTime}
                  onValueChange={(value) => updateDay(idx, { openTime: value })}
                  disabled={!day.isOpen}
                >
                  <SelectTrigger size="sm" className="h-8 w-full text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIME_OPTIONS.map((time) => (
                      <SelectItem key={time} value={time} className="text-xs">
                        {time}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <span className="text-xs text-muted-foreground px-1">to</span>

                <Select
                  value={day.closeTime}
                  onValueChange={(value) => updateDay(idx, { closeTime: value })}
                  disabled={!day.isOpen}
                >
                  <SelectTrigger size="sm" className="h-8 w-full text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIME_OPTIONS.map((time) => (
                      <SelectItem key={time} value={time} className="text-xs">
                        {time}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="flex items-center gap-2">
                  <Switch
                    checked={day.isOpen}
                    onCheckedChange={(checked) => updateDay(idx, { isOpen: checked })}
                  />
                  <span className="text-xs text-muted-foreground w-10">
                    {day.isOpen ? "Open" : "Closed"}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <Separator />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="tz-select" className="text-sm font-medium whitespace-nowrap">
                Station Timezone
              </Label>
              <Select value={timezone} onValueChange={setTimezone}>
                <SelectTrigger size="sm" className="h-8 w-full text-xs" id="tz-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AVIATION_TIMEZONES.map((tz) => (
                    <SelectItem key={tz.value} value={tz.value} className="text-xs">
                      {tz.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Capacity Buffer %</Label>
              <Input
                type="number"
                min={0}
                max={100}
                className="h-8 text-xs"
                value={capacityBufferPercent}
                onChange={(event) => setCapacityBufferPercent(Number.parseInt(event.target.value, 10) || 0)}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Default Shift Start Hour</Label>
              <Input
                type="number"
                min={0}
                max={23}
                className="h-8 text-xs"
                value={defaultStartHour}
                onChange={(event) => setDefaultStartHour(Number.parseInt(event.target.value, 10) || 0)}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Default Shift End Hour</Label>
              <Input
                type="number"
                min={1}
                max={24}
                className="h-8 text-xs"
                value={defaultEndHour}
                onChange={(event) => setDefaultEndHour(Number.parseInt(event.target.value, 10) || 0)}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Default Efficiency Multiplier</Label>
              <Input
                type="number"
                min={0}
                step="0.05"
                className="h-8 text-xs"
                value={defaultEfficiency}
                onChange={(event) => setDefaultEfficiency(Number.parseFloat(event.target.value) || 0)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Default Shift Days</Label>
            <div className="flex flex-wrap gap-2">
              {SHIFT_DAY_OPTIONS.map((day) => (
                <label key={day.value} className="inline-flex items-center gap-1.5 text-xs">
                  <Checkbox
                    checked={defaultShiftDays.includes(day.value)}
                    onCheckedChange={() => toggleDefaultShiftDay(day.value)}
                  />
                  <span>{day.label}</span>
                </label>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Calendar className="size-4 text-muted-foreground" />
            Holidays &amp; Blackouts
          </CardTitle>
          <CardDescription>
            Days when the station is closed. These affect scheduling capacity calculations.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {holidays.length === 0 && (
            <p className="text-xs text-muted-foreground py-2">
              No holidays configured. Click "Add Holiday" to get started.
            </p>
          )}

          {holidays.map((holiday) => (
            <div key={holiday.id} className="flex items-center gap-2">
              <Input
                type="date"
                value={holiday.date}
                onChange={(event) => updateHoliday(holiday.id, { date: event.target.value })}
                className="h-8 w-40 text-xs"
              />
              <Input
                type="text"
                value={holiday.name}
                placeholder="Holiday name"
                onChange={(event) => updateHoliday(holiday.id, { name: event.target.value })}
                className="h-8 flex-1 text-xs"
              />
              <button
                type="button"
                onClick={() => updateHoliday(holiday.id, { isObserved: !holiday.isObserved })}
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium border transition-colors ${
                  holiday.isObserved
                    ? "bg-primary/10 text-primary border-primary/30"
                    : "bg-muted text-muted-foreground border-border hover:bg-muted/80"
                }`}
              >
                {holiday.isObserved ? "Observed" : "Not Observed"}
              </button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                onClick={() => removeHoliday(holiday.id)}
              >
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          ))}

          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={addHoliday}>
            <Plus className="size-3.5 mr-1.5" />
            Add Holiday
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Flag className="size-4 text-muted-foreground" />
            Timeline Cursors
          </CardTitle>
          <CardDescription>
            Vertical markers on scheduling and capacity timelines. Station-config is authoritative and planner defaults are auto-synced.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            <Label className="text-xs font-medium whitespace-nowrap">Preset:</Label>
            <Select value={selectedPreset} onValueChange={setSelectedPreset}>
              <SelectTrigger size="sm" className="h-8 w-60 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CURSOR_PRESETS.map((preset) => (
                  <SelectItem key={preset.id} value={preset.id} className="text-xs">
                    {preset.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={() => applyCursorPreset("replace")}
            >
              Replace All
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={() => applyCursorPreset("add")}
            >
              Add to Existing
            </Button>
          </div>

          <Separator />

          <div className="space-y-2">
            {cursors.length === 0 && (
              <p className="text-xs text-muted-foreground py-2">
                No cursors configured. Select a preset or add one manually.
              </p>
            )}

            {cursors.map((cursor) => (
              <div key={cursor.id} className="flex items-center gap-2">
                <Switch
                  checked={cursor.enabled}
                  onCheckedChange={(checked) => updateCursor(cursor.id, { enabled: checked })}
                />

                <div className="relative" ref={colorPickerOpen === cursor.id ? colorPickerRef : undefined}>
                  <button
                    type="button"
                    className={`size-6 rounded-md border border-border shrink-0 ${cursor.colorClass}`}
                    onClick={() => setColorPickerOpen(colorPickerOpen === cursor.id ? null : cursor.id)}
                    aria-label="Pick color"
                  />
                  {colorPickerOpen === cursor.id && (
                    <div className="absolute top-8 left-0 z-50 grid grid-cols-7 gap-1 rounded-lg border bg-popover p-2 shadow-md">
                      {CURSOR_COLORS.map((colorClass) => (
                        <button
                          key={colorClass}
                          type="button"
                          className={`size-5 rounded-md border ${colorClass} ${
                            colorClass === cursor.colorClass
                              ? "ring-2 ring-primary ring-offset-1 ring-offset-background"
                              : "border-transparent hover:border-border"
                          }`}
                          onClick={() => {
                            updateCursor(cursor.id, { colorClass });
                            setColorPickerOpen(null);
                          }}
                          aria-label={colorClass}
                        />
                      ))}
                    </div>
                  )}
                </div>

                <Input
                  value={cursor.label}
                  onChange={(event) => updateCursor(cursor.id, { label: event.target.value })}
                  className="h-8 flex-1 text-xs"
                  placeholder="Cursor label"
                />

                <div className="flex items-center gap-1">
                  <Input
                    type="number"
                    value={cursor.dayOffset}
                    onChange={(event) =>
                      updateCursor(cursor.id, {
                        dayOffset: Number.parseInt(event.target.value, 10) || 0,
                      })
                    }
                    className="h-8 w-20 text-xs text-center"
                  />
                  <span className="text-[10px] text-muted-foreground whitespace-nowrap w-16">
                    {cursor.dayOffset === 0
                      ? "today"
                      : cursor.dayOffset > 0
                        ? `+${cursor.dayOffset}d`
                        : `${cursor.dayOffset}d`}
                  </span>
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={() => removeCursor(cursor.id)}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            ))}
          </div>

          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={addCursor}>
            <Plus className="size-3.5 mr-1.5" />
            Add Cursor
          </Button>
        </CardContent>
      </Card>

      {isDirty && (
        <div className="sticky bottom-4 flex items-center justify-end gap-2 rounded-lg border bg-background/95 px-4 py-3 shadow-lg backdrop-blur-sm">
          <span className="mr-auto text-xs text-muted-foreground">You have unsaved changes</span>
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={handleReset}>
            <RotateCcw className="size-3.5 mr-1.5" />
            Reset
          </Button>
          <Button size="sm" className="h-8 text-xs" onClick={() => void handleSave()}>
            <Save className="size-3.5 mr-1.5" />
            Save Preferences
          </Button>
        </div>
      )}
    </div>
  );
}
