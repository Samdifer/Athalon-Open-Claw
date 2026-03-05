"use client";

import { useMemo } from "react";
import { useQuery } from "convex/react";
import type { Id } from "@/convex/_generated/dataModel";
import { api } from "@/convex/_generated/api";
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Shield,
  Users,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { RosterWorkspaceViewModel } from "./types";

export interface SchedulingRosterDockPreviewProps {
  organizationId: Id<"organizations">;
  shopLocationId?: Id<"shopLocations"> | "all";
  focusDateMs?: number;
  isOpen: boolean;
  onToggle: () => void;
  width?: number;
  isPoppedOut: boolean;
  onPopOut: () => void;
}

function RolePill({ source }: { source: string }) {
  if (source === "technician_override") {
    return <span className="text-[10px] text-cyan-300">Override</span>;
  }
  if (source === "team_shift") {
    return <span className="text-[10px] text-emerald-300">Team Shift</span>;
  }
  return <span className="text-[10px] text-amber-300">Org Default</span>;
}

export default function SchedulingRosterDockPreview({
  organizationId,
  shopLocationId,
  focusDateMs,
  isOpen,
  onToggle,
  width = 340,
  isPoppedOut,
  onPopOut,
}: SchedulingRosterDockPreviewProps) {
  const workspace = useQuery(
    api.schedulerRoster.getRosterWorkspace,
    organizationId
      ? {
          organizationId,
          shopLocationId,
          focusDateMs,
          dateMode: focusDateMs ? "focus" : "today",
        }
      : "skip",
  ) as RosterWorkspaceViewModel | undefined;

  const topTeams = useMemo(
    () =>
      (workspace?.teams ?? [])
        .slice()
        .sort((a, b) => b.onShiftCount - a.onShiftCount || b.memberCount - a.memberCount)
        .slice(0, 4),
    [workspace?.teams],
  );

  const topTechs = useMemo(
    () =>
      (workspace?.technicians ?? [])
        .slice()
        .sort(
          (a, b) =>
            b.assignedActiveCards - a.assignedActiveCards ||
            b.estimatedRemainingHours - a.estimatedRemainingHours,
        )
        .slice(0, 6),
    [workspace?.technicians],
  );

  return (
    <div
      className="bg-slate-950 border-l border-slate-800 flex flex-col h-full shrink-0 shadow-xl z-30 transition-all duration-300 ease-in-out relative overflow-hidden"
      style={isPoppedOut ? undefined : { width: isOpen ? width : 40 }}
      data-testid="roster-panel"
    >
      {!isOpen && !isPoppedOut && (
        <div
          onClick={onToggle}
          className="absolute inset-0 w-10 flex flex-col items-center py-4 cursor-pointer hover:bg-slate-900/70 transition-colors"
          title="Expand roster panel"
        >
          <button className="p-1 rounded text-cyan-400 mb-4" aria-hidden>
            <ChevronLeft size={18} />
          </button>
          <div className="[writing-mode:vertical-lr] text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap flex items-center gap-3">
            <span className="text-cyan-400 flex items-center gap-2">
              <Users size={11} />
              Roster
            </span>
          </div>
        </div>
      )}

      <div
        className={`flex flex-col h-full w-full transition-opacity duration-300 ${
          isOpen || isPoppedOut ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        <div
          onClick={!isPoppedOut ? onToggle : undefined}
          className={`p-3 border-b border-slate-800 flex justify-between items-center bg-slate-900/60 transition-colors ${
            !isPoppedOut ? "cursor-pointer hover:bg-slate-900" : ""
          }`}
        >
          <div className="min-w-0">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-200 flex items-center gap-2">
              <Users size={14} className="text-cyan-400" />
              Roster & Teams
            </h3>
            <p className="text-[10px] text-slate-500 mt-0.5">
              {workspace ? `${workspace.analysis.activeTechnicians} technicians` : "Loading..."}
            </p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {!isPoppedOut && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onPopOut();
                }}
                className="p-1 rounded text-slate-500 hover:text-cyan-300 hover:bg-slate-800"
                aria-label="Pop out roster"
              >
                <ExternalLink size={14} />
              </button>
            )}
            {!isPoppedOut && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggle();
                }}
                className="p-1 rounded text-slate-500 hover:text-cyan-300 hover:bg-slate-800"
                aria-label={isOpen ? "Collapse roster" : "Expand roster"}
              >
                <ChevronRight size={14} />
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-2 bg-slate-950">
          {!workspace && (
            <div className="space-y-2">
              <Skeleton className="h-16 w-full bg-slate-900/70" />
              <Skeleton className="h-16 w-full bg-slate-900/70" />
              <Skeleton className="h-16 w-full bg-slate-900/70" />
            </div>
          )}

          {workspace && workspace.focus.observedHoliday && (
            <div className="rounded border border-amber-600/40 bg-amber-600/10 p-2">
              <p className="text-[11px] font-semibold text-amber-300 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                Holiday Observed
              </p>
              {/* BUG-LT-HUNT-119: text-amber-200 unreadable in light mode */}
              <p className="text-[10px] text-amber-800/80 dark:text-amber-200/80 mt-0.5">
                {workspace.focus.observedHoliday.name} ({workspace.focus.focusDateKey})
              </p>
            </div>
          )}

          {workspace && (
            <div className="grid grid-cols-3 gap-1.5">
              <div className="rounded border border-slate-800 bg-slate-900/70 p-1.5">
                <div className="text-[9px] uppercase tracking-wide text-slate-500">Teams</div>
                <div className="text-xs font-semibold text-slate-100">
                  {workspace.analysis.activeTeams}
                </div>
              </div>
              <div className="rounded border border-slate-800 bg-slate-900/70 p-1.5">
                <div className="text-[9px] uppercase tracking-wide text-slate-500">On Shift</div>
                <div className="text-xs font-semibold text-slate-100">
                  {workspace.analysis.onShiftTechnicians}
                </div>
              </div>
              <div className="rounded border border-slate-800 bg-slate-900/70 p-1.5">
                <div className="text-[9px] uppercase tracking-wide text-slate-500">Unsupervised</div>
                <div className="text-xs font-semibold text-amber-300">
                  {workspace.analysis.unsupervisedTeams}
                </div>
              </div>
            </div>
          )}

          {workspace && (
            <div className="rounded border border-slate-800 bg-slate-900/50 p-2 space-y-1.5">
              <div className="text-[10px] uppercase tracking-wide text-slate-500">Top Teams</div>
              {topTeams.length === 0 && (
                <div className="text-[11px] text-slate-500">No roster teams configured.</div>
              )}
              {topTeams.map((team) => (
                <div key={team.teamId} className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium text-slate-100 truncate">{team.name}</p>
                    <p className="text-[10px] text-slate-500 truncate">
                      {team.onShiftCount}/{team.memberCount} on shift
                    </p>
                  </div>
                  {team.isUnsupervised && (
                    <Badge variant="outline" className="text-[9px] border-amber-700 text-amber-300">
                      <Shield className="h-2.5 w-2.5 mr-0.5" />
                      UNSUP
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          )}

          {workspace && (
            <div className="rounded border border-slate-800 bg-slate-900/50 p-2 space-y-1.5">
              <div className="text-[10px] uppercase tracking-wide text-slate-500">Top Load</div>
              {topTechs.length === 0 && (
                <div className="text-[11px] text-slate-500">No active technicians.</div>
              )}
              {topTechs.map((tech) => (
                <div key={tech.technicianId} className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium text-slate-100 truncate">{tech.name}</p>
                    <p className="text-[10px] text-slate-500 truncate">
                      {tech.assignedActiveCards} cards · {Math.round(tech.estimatedRemainingHours)}h
                    </p>
                  </div>
                  <RolePill source={tech.shiftSource} />
                </div>
              ))}
            </div>
          )}

          <div className="rounded border border-slate-800 bg-slate-900/30 p-2 text-[11px] text-slate-300">
            <Link to="/scheduling/roster" className="inline-flex items-center gap-1 hover:text-cyan-300">
              Open full roster workspace
              <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
