"use client";

import { useState } from "react";
import { Filter, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export type ViewMode = "day" | "week" | "month";

export interface GanttFilters {
  priorities: string[];
  statuses: string[];
  aircraftTypes: string[];
  technicianIds: string[];
  zoom: ViewMode;
}

export const DEFAULT_FILTERS: GanttFilters = {
  priorities: [],
  statuses: [],
  aircraftTypes: [],
  technicianIds: [],
  zoom: "day",
};

interface GanttFilterBarProps {
  filters: GanttFilters;
  onFiltersChange: (filters: GanttFilters) => void;
  aircraftTypes?: string[];
  technicians?: { _id: string; name: string }[];
}

// ─────────────────────────────────────────────────────────────────────────────
// MULTI-SELECT DROPDOWN
// ─────────────────────────────────────────────────────────────────────────────

function MultiSelect({
  label,
  options,
  selected,
  onToggle,
  getLabel,
}: {
  label: string;
  options: string[];
  selected: string[];
  onToggle: (val: string) => void;
  getLabel?: (val: string) => string;
}) {
  const [open, setOpen] = useState(false);
  const labelFn = getLabel ?? ((v: string) => v);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-7 gap-1 text-xs">
          {label}
          {selected.length > 0 && (
            <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">
              {selected.length}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-44 p-2" align="start">
        <div className="space-y-0.5">
          {options.map((opt) => {
            const active = selected.includes(opt);
            return (
              <button
                key={opt}
                onClick={() => onToggle(opt)}
                className={cn(
                  "flex w-full items-center rounded-sm px-2 py-1.5 text-sm transition-colors hover:bg-accent",
                  active && "bg-accent font-medium",
                )}
              >
                <span
                  className={cn(
                    "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border",
                    active
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-muted-foreground/30",
                  )}
                >
                  {active && (
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </span>
                {labelFn(opt)}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// LABELS
// ─────────────────────────────────────────────────────────────────────────────

const PRIORITY_OPTIONS = ["aog", "urgent", "routine", "deferred"];
const PRIORITY_LABELS: Record<string, string> = {
  aog: "AOG",
  urgent: "Urgent",
  routine: "Routine",
  deferred: "Deferred",
};

const STATUS_OPTIONS = ["open", "in_progress", "pending_signoff"];
const STATUS_LABELS: Record<string, string> = {
  open: "Open",
  in_progress: "In Progress",
  pending_signoff: "Pending Signoff",
};

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export function GanttFilterBar({
  filters,
  onFiltersChange,
  aircraftTypes = [],
  technicians = [],
}: GanttFilterBarProps) {
  function toggle(field: keyof Pick<GanttFilters, "priorities" | "statuses" | "aircraftTypes" | "technicianIds">, value: string) {
    const current = filters[field];
    const next = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    onFiltersChange({ ...filters, [field]: next });
  }

  const activeCount =
    filters.priorities.length +
    filters.statuses.length +
    filters.aircraftTypes.length +
    filters.technicianIds.length;

  return (
    <div className="flex flex-wrap items-center gap-1.5 px-2 sm:px-4 py-1.5 border-b border-border/30 bg-muted/10 flex-shrink-0">
      <Filter className="w-3.5 h-3.5 text-muted-foreground" />

      <MultiSelect
        label="Priority"
        options={PRIORITY_OPTIONS}
        selected={filters.priorities}
        onToggle={(v) => toggle("priorities", v)}
        getLabel={(v) => PRIORITY_LABELS[v] ?? v}
      />

      <MultiSelect
        label="Status"
        options={STATUS_OPTIONS}
        selected={filters.statuses}
        onToggle={(v) => toggle("statuses", v)}
        getLabel={(v) => STATUS_LABELS[v] ?? v}
      />

      {aircraftTypes.length > 0 && (
        <MultiSelect
          label="Aircraft"
          options={aircraftTypes}
          selected={filters.aircraftTypes}
          onToggle={(v) => toggle("aircraftTypes", v)}
        />
      )}

      {technicians.length > 0 && (
        <MultiSelect
          label="Technician"
          options={technicians.map((t) => t._id)}
          selected={filters.technicianIds}
          onToggle={(v) => toggle("technicianIds", v)}
          getLabel={(id) => technicians.find((t) => t._id === id)?.name ?? id}
        />
      )}

      {/* Zoom level */}
      <div className="w-px h-4 bg-border/40 mx-1" />
      <div className="flex items-center rounded-md border border-border/60 overflow-hidden">
        {(["day", "week", "month"] as ViewMode[]).map((mode) => (
          <button
            key={mode}
            className={cn(
              "px-2.5 py-1 text-[11px] font-medium transition-colors",
              filters.zoom === mode
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted/50",
              mode !== "day" && "border-l border-border/60",
            )}
            onClick={() => onFiltersChange({ ...filters, zoom: mode })}
          >
            {mode.charAt(0).toUpperCase() + mode.slice(1)}
          </button>
        ))}
      </div>

      {/* Clear all */}
      {activeCount > 0 && (
        <>
          <div className="w-px h-4 bg-border/40 mx-1" />
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-[11px] text-muted-foreground"
            onClick={() => onFiltersChange({ ...DEFAULT_FILTERS, zoom: filters.zoom })}
          >
            <X className="w-3 h-3 mr-1" />
            Clear ({activeCount})
          </Button>
        </>
      )}
    </div>
  );
}
