"use client";

import { useState, useMemo, Fragment } from "react";
import {
  BarChart3,
  Users,
  AlertTriangle,
  Clock,
  Warehouse,
  ChevronDown,
  ChevronRight,
  Shield,
  Zap,
  PlaneTakeoff,
  Wrench,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";

// ─── Constants ────────────────────────────────────────────────────────────────

const DAYS_PER_WEEK = 7;
const WEEKS_TO_SHOW = 4;
const STANDARD_DAY_HOURS = 8;

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function round1(n: number): string {
  return n.toFixed(1);
}

function heatCellColor(hours: number, isWorkDay: boolean): string {
  if (!isWorkDay) return "bg-zinc-800/60 text-zinc-500";
  if (hours === 0) return "bg-zinc-800/40 text-zinc-500";
  if (hours < 6) return "bg-emerald-600/70 text-emerald-100";
  if (hours <= 8) return "bg-amber-500/70 text-amber-100";
  return "bg-red-500/70 text-red-100";
}

function utilizationColor(pct: number): string {
  if (pct > 100) return "text-red-600 dark:text-red-400";
  if (pct > 85) return "text-amber-600 dark:text-amber-400";
  return "text-emerald-600 dark:text-emerald-400";
}

function utilizationBg(pct: number): string {
  if (pct > 100) return "bg-red-500";
  if (pct > 85) return "bg-amber-500";
  return "bg-emerald-500";
}

function priorityColor(priority: string | undefined): string {
  switch (priority) {
    case "aog":
      return "bg-red-500/80 border-red-500/40 text-red-100";
    case "urgent":
      return "bg-amber-500/70 border-amber-500/40 text-amber-100";
    default:
      return "bg-sky-500/60 border-sky-500/40 text-sky-100";
  }
}

function priorityLabel(priority: string | undefined): string {
  switch (priority) {
    case "aog":
      return "AOG";
    case "urgent":
      return "Urgent";
    default:
      return "Routine";
  }
}

function bayTypeIcon(type: string) {
  switch (type) {
    case "hangar":
      return <Warehouse className="w-3.5 h-3.5" />;
    case "ramp":
      return <PlaneTakeoff className="w-3.5 h-3.5" />;
    case "paint":
      return <Wrench className="w-3.5 h-3.5" />;
    default:
      return <Warehouse className="w-3.5 h-3.5" />;
  }
}

function formatDate(ms: number): string {
  return new Date(ms).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface DailyCell {
  date: Date;
  dayLabel: string;
  weekLabel: string;
  scheduledHours: number;
  isWorkDay: boolean;
  woNames: string[];
}

interface TechHeatRow {
  techId: string;
  name: string;
  employeeId?: string;
  certLevel: string;
  availableWeeklyHours: number;
  totalScheduledHours: number;
  cells: DailyCell[];
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function CapacitySkeleton() {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="border-border/60">
            <CardContent className="p-4 space-y-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-7 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card className="border-border/60">
        <CardHeader className="pb-2">
          <Skeleton className="h-4 w-40" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex gap-1">
              <Skeleton className="h-8 w-32" />
              {Array.from({ length: 7 }).map((_, j) => (
                <Skeleton key={j} className="h-8 w-10" />
              ))}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  valueClass,
  icon,
}: {
  label: string;
  value: string;
  sub?: string;
  valueClass?: string;
  icon?: React.ReactNode;
}) {
  return (
    <Card className="border-border/60">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-1">
          {icon && <span className="text-muted-foreground">{icon}</span>}
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
            {label}
          </p>
        </div>
        <p
          className={`text-2xl font-semibold tabular-nums ${valueClass ?? "text-foreground"}`}
        >
          {value}
        </p>
        {sub && (
          <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Heat Map Cell ────────────────────────────────────────────────────────────

function HeatCell({
  cell,
  onClick,
}: {
  cell: DailyCell;
  onClick: () => void;
}) {
  const bg = heatCellColor(cell.scheduledHours, cell.isWorkDay);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={onClick}
          className={`h-8 w-full min-w-[36px] rounded-sm flex items-center justify-center text-[11px] font-medium tabular-nums cursor-pointer transition-all hover:ring-1 hover:ring-foreground/30 ${bg}`}
        >
          {cell.isWorkDay && cell.scheduledHours > 0
            ? round1(cell.scheduledHours)
            : cell.isWorkDay
              ? "—"
              : ""}
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[200px]">
        <div className="text-xs space-y-1">
          <p className="font-medium">{cell.dayLabel}</p>
          {!cell.isWorkDay ? (
            <p className="text-muted-foreground">Day off</p>
          ) : (
            <>
              <p>Scheduled: {round1(cell.scheduledHours)}h</p>
              {cell.woNames.length > 0 && (
                <div className="border-t border-border/40 pt-1 mt-1">
                  {cell.woNames.map((n, i) => (
                    <p key={i} className="text-muted-foreground">
                      {n}
                    </p>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

// ─── Cell Detail Panel ────────────────────────────────────────────────────────

function CellDetailPanel({
  techName,
  cell,
  onClose,
}: {
  techName: string;
  cell: DailyCell;
  onClose: () => void;
}) {
  return (
    <Card className="border-border/60 bg-card/80">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-sm font-semibold">{techName}</p>
            <p className="text-xs text-muted-foreground">{cell.dayLabel}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            ✕
          </Button>
        </div>
        {cell.woNames.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No work orders assigned this day.
          </p>
        ) : (
          <div className="space-y-1.5">
            {cell.woNames.map((name, i) => (
              <div
                key={i}
                className="flex items-center gap-2 text-sm px-2 py-1.5 bg-muted/40 rounded"
              >
                <Wrench className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                <span>{name}</span>
              </div>
            ))}
            <p className="text-xs text-muted-foreground mt-2">
              Total: {round1(cell.scheduledHours)}h scheduled
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Bottleneck Item ──────────────────────────────────────────────────────────

function BottleneckItem({
  icon,
  label,
  detail,
  severity,
}: {
  icon: React.ReactNode;
  label: string;
  detail: string;
  severity: "red" | "amber";
}) {
  const borderColor =
    severity === "red" ? "border-l-red-500" : "border-l-amber-500";
  return (
    <div
      className={`border-l-2 ${borderColor} pl-3 py-1.5 flex items-start gap-2`}
    >
      <span className="flex-shrink-0 mt-0.5">{icon}</span>
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{detail}</p>
      </div>
    </div>
  );
}

// ─── Tech Detail Row ──────────────────────────────────────────────────────────

function TechExpandableRow({
  tech,
  workloadDetail,
}: {
  tech: TechHeatRow;
  workloadDetail?: {
    assignedActiveCards: number;
    estimatedRemainingHours: number;
    daysOfWeek: number[];
    startHour: number;
    endHour: number;
  };
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border-b border-border/30">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted/30 transition-colors text-left"
      >
        {expanded ? (
          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
        )}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-medium flex-shrink-0">
            {tech.name.charAt(0)}
          </div>
          <span className="text-sm font-medium truncate">{tech.name}</span>
          <Badge
            variant="outline"
            className="text-[10px] px-1.5 py-0 flex-shrink-0"
          >
            {tech.certLevel}
          </Badge>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <span className="text-xs text-muted-foreground tabular-nums">
            {round1(tech.totalScheduledHours)}h /{" "}
            {round1(tech.availableWeeklyHours * WEEKS_TO_SHOW)}h
          </span>
          <span
            className={`text-xs font-semibold tabular-nums ${utilizationColor(
              tech.availableWeeklyHours > 0
                ? Math.round(
                    (tech.totalScheduledHours /
                      (tech.availableWeeklyHours * WEEKS_TO_SHOW)) *
                      100,
                  )
                : 0,
            )}`}
          >
            {tech.availableWeeklyHours > 0
              ? Math.round(
                  (tech.totalScheduledHours /
                    (tech.availableWeeklyHours * WEEKS_TO_SHOW)) *
                    100,
                )
              : 0}
            %
          </span>
        </div>
      </button>
      {expanded && workloadDetail && (
        <div className="px-4 pb-3 pl-12 space-y-2">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <p className="text-muted-foreground">Active Tasks</p>
              <p className="font-medium tabular-nums">
                {workloadDetail.assignedActiveCards}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Est. Remaining</p>
              <p className="font-medium tabular-nums">
                {round1(workloadDetail.estimatedRemainingHours)}h
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Shift</p>
              <p className="font-medium tabular-nums">
                {workloadDetail.startHour}:00 – {workloadDetail.endHour}:00
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Work Days</p>
              <p className="font-medium">
                {workloadDetail.daysOfWeek
                  .map((d) => DAY_LABELS[d])
                  .join(", ")}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <Shield className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-muted-foreground">
              Certification: {tech.certLevel}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CapacityPage() {
  const { orgId, isLoaded } = useCurrentOrg();

  // ── Queries ─────────────────────────────────────────────────────────────
  const utilization = useQuery(
    api.capacity.getCapacityUtilization,
    orgId ? { organizationId: orgId, periodWeeks: WEEKS_TO_SHOW } : "skip",
  );

  const techWorkload = useQuery(
    api.capacity.getTechnicianWorkload,
    orgId ? { organizationId: orgId } : "skip",
  );

  const nowMs = Date.now();
  const fourWeeksMs = WEEKS_TO_SHOW * 7 * 24 * 60 * 60 * 1000;

  const shopCapacity = useQuery(
    api.capacity.getShopCapacity,
    orgId
      ? { organizationId: orgId, startDateMs: nowMs, endDateMs: nowMs + fourWeeksMs }
      : "skip",
  );

  const scheduledWOs = useQuery(
    api.scheduling.getScheduledWOs,
    orgId ? { organizationId: orgId } : "skip",
  );

  const bays = useQuery(
    api.hangarBays.listBays,
    orgId ? { organizationId: orgId } : "skip",
  );

  const activeWOs = useQuery(
    api.workOrders.listActive,
    orgId ? { organizationId: orgId, limit: 100 } : "skip",
  );

  const techs = useQuery(
    api.technicians.list,
    orgId ? { organizationId: orgId } : "skip",
  );

  // ── State ───────────────────────────────────────────────────────────────
  const [selectedCell, setSelectedCell] = useState<{
    techName: string;
    cell: DailyCell;
  } | null>(null);
  const [weekOffset, setWeekOffset] = useState(0);

  // ── Loading ─────────────────────────────────────────────────────────────
  const loading =
    !isLoaded ||
    utilization === undefined ||
    techWorkload === undefined ||
    shopCapacity === undefined;

  // ── Build heat map data ─────────────────────────────────────────────────
  const { heatRows, dayColumns, shopTotals, overtimeHours } = useMemo(() => {
    if (!shopCapacity || !techWorkload || !scheduledWOs) {
      return { heatRows: [], dayColumns: [] as Date[], shopTotals: [] as number[], overtimeHours: 0 };
    }

    const startDate = new Date();
    startDate.setHours(0, 0, 0, 0);
    // Adjust to Monday
    const dayOfWeek = startDate.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    startDate.setDate(startDate.getDate() + mondayOffset + weekOffset * 7);

    const totalDays = WEEKS_TO_SHOW * DAYS_PER_WEEK;
    const columns: Date[] = [];
    for (let i = 0; i < totalDays; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      columns.push(d);
    }

    const totals = new Array(totalDays).fill(0);
    let totalOvertime = 0;

    const rows: TechHeatRow[] = shopCapacity.byTechnician.map((tech) => {
      const workload = techWorkload.find(
        (w) => w.technicianId === tech.technicianId,
      );
      const daysOfWeek = workload?.daysOfWeek ?? tech.shiftDays;
      const hoursPerDay =
        (tech.endHour - tech.startHour) * tech.efficiencyMultiplier;

      // Find WOs assigned to this tech via task cards
      const techEstHours = workload?.estimatedRemainingHours ?? 0;

      // Distribute hours across work days proportionally
      const workDaysInPeriod = columns.filter((d) =>
        daysOfWeek.includes(d.getDay()),
      ).length;
      const avgHoursPerDay =
        workDaysInPeriod > 0 ? techEstHours / workDaysInPeriod : 0;

      // Determine cert level from techs list
      const techInfo = techs?.find(
        (t) => String(t._id) === String(tech.technicianId),
      );
      const certLevel =
        (techInfo as Record<string, unknown>)?.certificationLevel === "ia"
          ? "IA"
          : "AMT";

      const cells: DailyCell[] = columns.map((date, idx) => {
        const dow = date.getDay();
        const isWorkDay = daysOfWeek.includes(dow);
        const scheduledHours = isWorkDay ? avgHoursPerDay : 0;

        if (isWorkDay) {
          totals[idx] += scheduledHours;
          if (scheduledHours > STANDARD_DAY_HOURS) {
            totalOvertime += scheduledHours - STANDARD_DAY_HOURS;
          }
        }

        const weekNum = Math.floor(idx / 7) + 1;
        return {
          date,
          dayLabel: `${DAY_LABELS[dow]}, ${date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`,
          weekLabel: `Wk ${weekNum}`,
          scheduledHours,
          isWorkDay,
          woNames: isWorkDay && scheduledHours > 0 ? [`${round1(scheduledHours)}h estimated work`] : [],
        };
      });

      return {
        techId: tech.technicianId,
        name: tech.name,
        employeeId: workload?.employeeId,
        certLevel,
        availableWeeklyHours: hoursPerDay * daysOfWeek.length,
        totalScheduledHours: techEstHours,
        cells,
      };
    });

    return {
      heatRows: rows,
      dayColumns: columns,
      shopTotals: totals,
      overtimeHours: totalOvertime,
    };
  }, [shopCapacity, techWorkload, scheduledWOs, techs, weekOffset]);

  // ── Bottleneck detection ────────────────────────────────────────────────
  const bottlenecks = useMemo(() => {
    if (!utilization) return { overloaded: [], atRisk: [], suggestions: [] };

    const overloaded = utilization.byTechnician.filter(
      (t) => t.utilizationPercent > 90,
    );

    const underloaded = utilization.byTechnician.filter(
      (t) => t.utilizationPercent < 50,
    );

    const suggestions: string[] = [];
    for (const over of overloaded) {
      const under = underloaded[0];
      if (under) {
        suggestions.push(
          `Reassign work from ${over.name} (${over.utilizationPercent}%) to ${under.name} (${under.utilizationPercent}%)`,
        );
      }
    }

    return { overloaded, atRisk: [], suggestions };
  }, [utilization]);

  // ── Render ──────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-6 w-56 mb-1" />
            <Skeleton className="h-3 w-40" />
          </div>
          <Skeleton className="h-9 w-32" />
        </div>
        <CapacitySkeleton />
      </div>
    );
  }

  const {
    totalAvailableHours,
    committedHours,
    utilizationPercent,
    bufferPercent,
    isOverCapacity,
    isNearBuffer,
  } = utilization!;

  return (
    <TooltipProvider delayDuration={150}>
      <div className="space-y-5">
        {/* ── Header ───────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row gap-2 sm:items-start sm:justify-between">
          <div>
            <h1 className="text-lg sm:text-xl md:text-2xl font-semibold text-foreground flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-muted-foreground" />
              Capacity Management
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Technician workload, bay utilization, and bottleneck detection —
              next {WEEKS_TO_SHOW} weeks.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            asChild
            className="w-full sm:w-auto"
          >
            <Link to="/personnel">Adjust Shifts</Link>
          </Button>
        </div>

        {/* ── Warning Banner ───────────────────────────────────────────── */}
        {(isNearBuffer || isOverCapacity) && (
          <div
            className={`rounded-lg border p-3 sm:p-4 flex items-start gap-3 ${
              isOverCapacity
                ? "border-red-500/40 bg-red-500/8"
                : "border-amber-500/40 bg-amber-500/8"
            }`}
            aria-live="polite"
          >
            <AlertTriangle
              className={`w-4 h-4 flex-shrink-0 mt-0.5 ${
                isOverCapacity
                  ? "text-red-600 dark:text-red-400"
                  : "text-amber-600 dark:text-amber-400"
              }`}
            />
            <div>
              <p
                className={`text-sm font-semibold ${
                  isOverCapacity
                    ? "text-red-600 dark:text-red-400"
                    : "text-amber-600 dark:text-amber-400"
                }`}
              >
                {isOverCapacity ? "Over Capacity" : "Near Capacity"} —
                Committed hours exceed{" "}
                {isOverCapacity ? "available" : "buffer"} capacity.
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Review task assignments or adjust technician shifts.
              </p>
            </div>
          </div>
        )}

        {/* ── Shop Capacity Overview Cards ─────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard
            label="Available Hours"
            value={`${round1(totalAvailableHours)}h`}
            sub="Total shift hours this period"
            icon={<Clock className="w-3.5 h-3.5" />}
          />
          <StatCard
            label="Scheduled Hours"
            value={`${round1(committedHours)}h`}
            sub="From assigned task cards"
            icon={<Wrench className="w-3.5 h-3.5" />}
          />
          <StatCard
            label="Utilization"
            value={`${utilizationPercent}%`}
            sub={
              isOverCapacity
                ? "Over capacity"
                : isNearBuffer
                  ? "Near buffer"
                  : "On track"
            }
            valueClass={utilizationColor(utilizationPercent)}
            icon={<BarChart3 className="w-3.5 h-3.5" />}
          />
          <StatCard
            label="Overtime Hours"
            value={`${round1(overtimeHours)}h`}
            sub={`Buffer: ${bufferPercent}% reserved`}
            valueClass={
              overtimeHours > 0
                ? "text-red-600 dark:text-red-400"
                : "text-muted-foreground"
            }
            icon={<Zap className="w-3.5 h-3.5" />}
          />
        </div>

        {/* ── Capacity Heat Map ────────────────────────────────────────── */}
        <Card className="border-border/60">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Users className="w-4 h-4 text-muted-foreground" />
                Technician Capacity Heat Map
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setWeekOffset((o) => o - 1)}
                >
                  ← Prev
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setWeekOffset(0)}
                >
                  Current
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setWeekOffset((o) => o + 1)}
                >
                  Next →
                </Button>
              </div>
            </div>
            {/* Legend */}
            <div className="flex items-center gap-3 text-[10px] text-muted-foreground mt-2">
              <div className="flex items-center gap-1">
                <span className="inline-block h-3 w-5 rounded-sm bg-emerald-600/70" />
                <span>&lt;6h</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="inline-block h-3 w-5 rounded-sm bg-amber-500/70" />
                <span>6-8h</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="inline-block h-3 w-5 rounded-sm bg-red-500/70" />
                <span>&gt;8h (OT)</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="inline-block h-3 w-5 rounded-sm bg-zinc-800/60" />
                <span>Off</span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {heatRows.length === 0 ? (
              <div className="py-12 text-center px-4">
                <Users className="w-7 h-7 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  No active technicians. Add technicians in{" "}
                  <Link
                    to="/personnel"
                    className="underline underline-offset-2 hover:opacity-80 transition-opacity"
                  >
                    Personnel
                  </Link>{" "}
                  to see capacity.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="border-collapse text-sm w-full">
                  <thead>
                    <tr>
                      <th className="sticky left-0 z-10 bg-background text-left p-2 min-w-[140px] border-b border-border/40 text-xs font-medium text-muted-foreground">
                        Technician
                      </th>
                      {dayColumns.map((d, i) => {
                        const isMonday = d.getDay() === 1;
                        return (
                          <th
                            key={i}
                            className={`p-0.5 text-center font-medium border-b border-border/40 text-[10px] min-w-[40px] text-muted-foreground ${
                              isMonday ? "border-l border-border/30" : ""
                            }`}
                          >
                            <div>{DAY_LABELS[d.getDay()]}</div>
                            <div className="text-[9px] opacity-60">
                              {d.getDate()}
                            </div>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {heatRows.map((row) => (
                      <tr key={row.techId}>
                        <td className="sticky left-0 z-10 bg-background p-2 border-b border-border/30">
                          <div className="flex items-center gap-2">
                            <div className="h-5 w-5 rounded-full bg-primary/20 flex items-center justify-center text-[9px] font-medium flex-shrink-0">
                              {row.name.charAt(0)}
                            </div>
                            <span className="truncate max-w-[100px] text-xs font-medium">
                              {row.name}
                            </span>
                          </div>
                        </td>
                        {row.cells.map((cell, ci) => {
                          const isMonday = cell.date.getDay() === 1;
                          return (
                            <td
                              key={ci}
                              className={`p-0.5 border-b border-border/20 ${
                                isMonday ? "border-l border-border/30" : ""
                              }`}
                            >
                              <HeatCell
                                cell={cell}
                                onClick={() =>
                                  setSelectedCell({
                                    techName: row.name,
                                    cell,
                                  })
                                }
                              />
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                    {/* Totals row */}
                    <tr className="bg-muted/20">
                      <td className="sticky left-0 z-10 bg-muted/20 p-2 text-xs font-semibold text-muted-foreground">
                        Shop Total
                      </td>
                      {shopTotals.map((total, i) => {
                        const isMonday = dayColumns[i]?.getDay() === 1;
                        return (
                          <td
                            key={i}
                            className={`p-0.5 text-center text-[10px] font-semibold tabular-nums text-muted-foreground ${
                              isMonday ? "border-l border-border/30" : ""
                            }`}
                          >
                            {total > 0 ? round1(total) : ""}
                          </td>
                        );
                      })}
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Cell detail panel */}
        {selectedCell && (
          <CellDetailPanel
            techName={selectedCell.techName}
            cell={selectedCell.cell}
            onClose={() => setSelectedCell(null)}
          />
        )}

        {/* ── Hangar Bay Timeline ──────────────────────────────────────── */}
        <Card className="border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Warehouse className="w-4 h-4 text-muted-foreground" />
              Hangar Bay Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!bays || bays.length === 0 ? (
              <div className="py-8 text-center">
                <Warehouse className="w-7 h-7 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  No bays configured. Set up bays in{" "}
                  <Link
                    to="/scheduling/bays"
                    className="underline underline-offset-2 hover:opacity-80 transition-opacity"
                  >
                    Hangar Bays
                  </Link>
                  .
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {bays.map((bay) => {
                  // Find WO assigned to this bay
                  const assignedWO = scheduledWOs?.find(
                    (wo) =>
                      (wo as Record<string, unknown>).assignedBayId ===
                      String(bay._id),
                  );
                  const activeWO = activeWOs?.find(
                    (wo) =>
                      bay.currentWorkOrderId &&
                      String(wo._id) === String(bay.currentWorkOrderId),
                  );
                  const woDisplay = activeWO ?? assignedWO;

                  const isAvailable = bay.status === "available";
                  const isMaintenance = bay.status === "maintenance";

                  return (
                    <div
                      key={String(bay._id)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border ${
                        isAvailable
                          ? "border-emerald-500/30 bg-emerald-500/5"
                          : isMaintenance
                            ? "border-amber-500/30 bg-amber-500/5"
                            : "border-border/40 bg-card/60"
                      }`}
                    >
                      <span className="text-muted-foreground flex-shrink-0">
                        {bayTypeIcon(bay.type)}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">
                            {bay.name}
                          </span>
                          <Badge
                            variant="outline"
                            className={`text-[10px] px-1.5 py-0 ${
                              isAvailable
                                ? "border-emerald-500/40 text-emerald-600 dark:text-emerald-400"
                                : isMaintenance
                                  ? "border-amber-500/40 text-amber-600 dark:text-amber-400"
                                  : "border-sky-500/40 text-sky-600 dark:text-sky-400"
                            }`}
                          >
                            {bay.status}
                          </Badge>
                        </div>
                        {woDisplay && (
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">
                            {String((woDisplay as Record<string, unknown>)
                              .workOrderNumber ??
                              (woDisplay as Record<string, unknown>)
                                .description ??
                              "Work order assigned")}
                            {(woDisplay as Record<string, unknown>)
                              .scheduledStartDate
                              ? ` • ${formatDate((woDisplay as Record<string, unknown>).scheduledStartDate as number)}`
                              : ""}
                            {(woDisplay as Record<string, unknown>)
                              .promisedDeliveryDate
                              ? ` → ${formatDate((woDisplay as Record<string, unknown>).promisedDeliveryDate as number)}`
                              : ""}
                          </p>
                        )}
                        {isAvailable && !woDisplay && (
                          <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">
                            Available for scheduling
                          </p>
                        )}
                      </div>
                      {woDisplay &&
                        (woDisplay as Record<string, unknown>).priority && (
                          <Badge
                            className={`text-[10px] px-1.5 py-0 ${priorityColor(
                              (woDisplay as Record<string, unknown>)
                                .priority as string,
                            )}`}
                          >
                            {priorityLabel(
                              (woDisplay as Record<string, unknown>)
                                .priority as string,
                            )}
                          </Badge>
                        )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Bottleneck Detection Panel ───────────────────────────────── */}
        <Card className="border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              Bottleneck Detection
            </CardTitle>
          </CardHeader>
          <CardContent>
            {bottlenecks.overloaded.length === 0 &&
            bottlenecks.suggestions.length === 0 ? (
              <div className="py-6 text-center">
                <p className="text-sm text-muted-foreground">
                  ✓ No bottlenecks detected. All technicians within capacity.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Overloaded techs */}
                {bottlenecks.overloaded.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Techs at &gt;90% Capacity
                    </p>
                    {bottlenecks.overloaded.map((tech) => (
                      <BottleneckItem
                        key={tech.technicianId}
                        icon={
                          <Users className="w-3.5 h-3.5 text-red-400" />
                        }
                        label={`${tech.name} — ${tech.utilizationPercent}%`}
                        detail={`${round1(tech.assignedEstimatedHours)}h assigned / ${round1(tech.availableHours)}h available`}
                        severity={
                          tech.utilizationPercent > 100 ? "red" : "amber"
                        }
                      />
                    ))}
                  </div>
                )}

                {/* Suggestions */}
                {bottlenecks.suggestions.length > 0 && (
                  <div className="space-y-2 mt-3">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Suggested Actions
                    </p>
                    {bottlenecks.suggestions.map((s, i) => (
                      <BottleneckItem
                        key={i}
                        icon={
                          <Zap className="w-3.5 h-3.5 text-sky-400" />
                        }
                        label={s}
                        detail="Consider reassigning tasks to balance workload"
                        severity="amber"
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Tech Workload Detail (Expandable) ────────────────────────── */}
        <Card className="border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Users className="w-4 h-4 text-muted-foreground" />
              Technician Workload Detail
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {heatRows.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-sm text-muted-foreground">
                  No technician data available.
                </p>
              </div>
            ) : (
              <div className="divide-y-0">
                {heatRows.map((row) => {
                  const wl = techWorkload?.find(
                    (w) => String(w.technicianId) === String(row.techId),
                  );
                  return (
                    <TechExpandableRow
                      key={row.techId}
                      tech={row}
                      workloadDetail={
                        wl
                          ? {
                              assignedActiveCards: wl.assignedActiveCards,
                              estimatedRemainingHours:
                                wl.estimatedRemainingHours,
                              daysOfWeek: wl.daysOfWeek,
                              startHour: wl.startHour,
                              endHour: wl.endHour,
                            }
                          : undefined
                      }
                    />
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}
