"use client";

import {
  AlertTriangle,
  BarChart3,
  ChevronsDown,
  ChevronsUp,
  Clock3,
  DollarSign,
  ExternalLink,
  FolderKanban,
} from "lucide-react";
import type { ReactNode } from "react";

type AnalyticsMetrics = {
  scheduledCount: number;
  unscheduledCount: number;
  conflictsCount: number;
  quoteCoveragePercent: number;
  avgUtilization: number;
  peakUtilization: number;
  projectedNet: number;
  overtimeHours: number;
  overtimeCost: number;
};

interface SchedulingAnalyticsPanelProps {
  metrics: AnalyticsMetrics;
  isOpen: boolean;
  onToggle: () => void;
  isPoppedOut: boolean;
  onPopOut: () => void;
  height?: number;
}

function StatCard({
  label,
  value,
  icon,
  tone = "slate",
}: {
  label: string;
  value: string;
  icon: ReactNode;
  tone?: "slate" | "amber" | "rose" | "emerald" | "cyan";
}) {
  const toneClass =
    tone === "amber"
      ? "border-amber-800/60 bg-amber-950/25 text-amber-300"
      : tone === "rose"
        ? "border-rose-800/60 bg-rose-950/25 text-rose-300"
        : tone === "emerald"
          ? "border-emerald-800/60 bg-emerald-950/25 text-emerald-300"
          : tone === "cyan"
            ? "border-cyan-800/60 bg-cyan-950/25 text-cyan-300"
            : "border-slate-700/80 bg-slate-900/70 text-slate-300";

  return (
    <div className={`rounded border px-2 py-2 ${toneClass}`}>
      <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide opacity-80">
        {icon}
        <span>{label}</span>
      </div>
      <div className="mt-1 text-base font-mono font-semibold leading-none">{value}</div>
    </div>
  );
}

export default function SchedulingAnalyticsPanel({
  metrics,
  isOpen,
  onToggle,
  isPoppedOut,
  onPopOut,
  height = 180,
}: SchedulingAnalyticsPanelProps) {
  const overUtilized = metrics.peakUtilization > 100;
  const netPositive = metrics.projectedNet >= 0;

  return (
    <div
      className={`bg-slate-900 flex flex-col shrink-0 select-none relative z-20 w-full transition-all duration-300 ease-in-out overflow-hidden ${
        isPoppedOut ? "h-full flex-1 border-none" : "border-t border-slate-700"
      }`}
      style={isPoppedOut ? undefined : { height: isOpen ? height : 32 }}
      data-testid="analytics-panel"
    >
      <div
        onClick={!isPoppedOut ? onToggle : undefined}
        className={`px-3 py-2 bg-slate-900/50 border-b border-slate-700/50 flex justify-between items-center shrink-0 z-30 transition-colors group h-8 ${
          !isPoppedOut ? "cursor-pointer hover:bg-slate-800/50" : ""
        }`}
      >
        <h3 className="text-[10px] font-bold text-indigo-400 font-tactical uppercase tracking-widest flex items-center gap-2">
          {isOpen ? <BarChart3 size={12} /> : null}
          <span>{isOpen ? "Scheduling Analytics" : "Analytics"}</span>
        </h3>
        <div className="flex items-center gap-2">
          {isOpen && !isPoppedOut && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onPopOut();
              }}
              className="text-slate-500 hover:text-indigo-300"
              aria-label="Pop out analytics"
            >
              <ExternalLink size={16} />
            </button>
          )}
          {!isPoppedOut && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggle();
              }}
              className="text-slate-500 hover:text-indigo-300"
              aria-label={isOpen ? "Collapse analytics" : "Expand analytics"}
            >
              {isOpen ? <ChevronsDown size={16} /> : <ChevronsUp size={16} />}
            </button>
          )}
        </div>
      </div>

      <div
        className={`transition-opacity duration-300 ${
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        <div className="p-3 grid grid-cols-2 lg:grid-cols-4 gap-2">
          <StatCard
            label="Scheduled"
            value={metrics.scheduledCount.toString()}
            icon={<FolderKanban size={10} />}
            tone="cyan"
          />
          <StatCard
            label="Unscheduled"
            value={metrics.unscheduledCount.toString()}
            icon={<FolderKanban size={10} />}
            tone={metrics.unscheduledCount > 0 ? "amber" : "slate"}
          />
          <StatCard
            label="Conflicts"
            value={metrics.conflictsCount.toString()}
            icon={<AlertTriangle size={10} />}
            tone={metrics.conflictsCount > 0 ? "rose" : "slate"}
          />
          <StatCard
            label="Quote Coverage"
            value={`${Math.round(metrics.quoteCoveragePercent)}%`}
            icon={<BarChart3 size={10} />}
            tone="slate"
          />
          <StatCard
            label="Avg Utilization"
            value={`${Math.round(metrics.avgUtilization)}%`}
            icon={<BarChart3 size={10} />}
            tone={metrics.avgUtilization >= 85 ? "emerald" : "slate"}
          />
          <StatCard
            label="Peak Utilization"
            value={`${Math.round(metrics.peakUtilization)}%`}
            icon={<AlertTriangle size={10} />}
            tone={overUtilized ? "rose" : "emerald"}
          />
          <StatCard
            label="Projected Net"
            value={`${netPositive ? "+" : "-"}$${Math.abs(Math.round(metrics.projectedNet)).toLocaleString()}`}
            icon={<DollarSign size={10} />}
            tone={netPositive ? "emerald" : "rose"}
          />
          <StatCard
            label="OT Impact"
            value={`${metrics.overtimeHours.toFixed(1)}h / $${Math.round(metrics.overtimeCost).toLocaleString()}`}
            icon={<Clock3 size={10} />}
            tone={metrics.overtimeHours > 0 ? "amber" : "slate"}
          />
        </div>
      </div>
    </div>
  );
}
