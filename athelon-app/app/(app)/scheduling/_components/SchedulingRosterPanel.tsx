"use client";

import {
  ChevronLeft,
  ChevronRight,
  Clock3,
  ExternalLink,
  FolderKanban,
  Users,
} from "lucide-react";

type TechnicianWorkload = {
  technicianId: string;
  name: string;
  employeeId?: string;
  daysOfWeek: number[];
  startHour: number;
  endHour: number;
  efficiencyMultiplier: number;
  usingDefaultShift: boolean;
  assignedActiveCards: number;
  estimatedRemainingHours: number;
};

interface SchedulingRosterPanelProps {
  technicians: TechnicianWorkload[];
  isOpen: boolean;
  onToggle: () => void;
  width?: number;
  isPoppedOut: boolean;
  onPopOut: () => void;
}

const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"] as const;

function formatHour(hour: number): string {
  const normalized = ((hour % 24) + 24) % 24;
  return `${normalized.toString().padStart(2, "0")}:00`;
}

export default function SchedulingRosterPanel({
  technicians,
  isOpen,
  onToggle,
  width = 320,
  isPoppedOut,
  onPopOut,
}: SchedulingRosterPanelProps) {
  const sortedTechs = [...technicians].sort((a, b) => {
    if (b.assignedActiveCards !== a.assignedActiveCards) {
      return b.assignedActiveCards - a.assignedActiveCards;
    }
    if (b.estimatedRemainingHours !== a.estimatedRemainingHours) {
      return b.estimatedRemainingHours - a.estimatedRemainingHours;
    }
    return a.name.localeCompare(b.name);
  });

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
          <button className="p-1 rounded text-indigo-400 mb-4">
            <ChevronLeft size={18} />
          </button>
          <div className="[writing-mode:vertical-lr] text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap flex items-center gap-3">
            <span className="text-indigo-400 flex items-center gap-2">
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
              <Users size={14} className="text-indigo-400" />
              Active Roster
            </h3>
            <p className="text-[10px] text-slate-500 mt-0.5">
              {sortedTechs.length} technician{sortedTechs.length === 1 ? "" : "s"}
            </p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {!isPoppedOut && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onPopOut();
                }}
                className="p-1 rounded text-slate-500 hover:text-indigo-300 hover:bg-slate-800"
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
                className="p-1 rounded text-slate-500 hover:text-indigo-300 hover:bg-slate-800"
                aria-label={isOpen ? "Collapse roster" : "Expand roster"}
              >
                <ChevronRight size={14} />
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-2 bg-slate-950">
          {sortedTechs.length === 0 ? (
            <div className="h-full flex items-center justify-center text-center text-xs text-slate-500 px-4">
              No active technicians available for this location.
            </div>
          ) : (
            sortedTechs.map((tech) => (
              <div
                key={tech.technicianId}
                className="rounded border border-slate-800 bg-slate-900/60 p-2"
                data-testid={`roster-tech-${tech.technicianId}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-100 truncate">{tech.name}</p>
                    {tech.employeeId && (
                      <p className="text-[10px] text-slate-500 font-mono truncate">
                        {tech.employeeId}
                      </p>
                    )}
                  </div>
                  <div
                    className={`text-[10px] px-1.5 py-0.5 rounded border ${
                      tech.usingDefaultShift
                        ? "border-amber-800/70 text-amber-400 bg-amber-950/20"
                        : "border-emerald-800/70 text-emerald-400 bg-emerald-950/20"
                    }`}
                  >
                    {tech.usingDefaultShift ? "Default" : "Custom"}
                  </div>
                </div>

                <div className="mt-2 text-[10px] text-slate-400 flex items-center gap-1">
                  <Clock3 size={10} />
                  <span>
                    {formatHour(tech.startHour)} - {formatHour(tech.endHour)}
                  </span>
                  <span className="text-slate-600">•</span>
                  <span>{(tech.efficiencyMultiplier * 100).toFixed(0)}% eff</span>
                </div>

                <div className="mt-1 flex items-center gap-1">
                  {DAY_LABELS.map((label, dayIndex) => {
                    const active = tech.daysOfWeek.includes(dayIndex);
                    return (
                      <span
                        key={`${tech.technicianId}-${dayIndex}`}
                        className={`w-4 h-4 rounded text-[9px] flex items-center justify-center ${
                          active
                            ? "bg-indigo-600/70 text-white"
                            : "bg-slate-800 text-slate-500"
                        }`}
                      >
                        {label}
                      </span>
                    );
                  })}
                </div>

                <div className="mt-2 grid grid-cols-2 gap-1.5">
                  <div className="rounded border border-slate-800 bg-slate-950/60 px-1.5 py-1">
                    <div className="text-[9px] uppercase tracking-wide text-slate-500 flex items-center gap-1">
                      <FolderKanban size={9} />
                      Active Cards
                    </div>
                    <div className="text-xs font-mono font-semibold text-slate-200">
                      {tech.assignedActiveCards}
                    </div>
                  </div>
                  <div className="rounded border border-slate-800 bg-slate-950/60 px-1.5 py-1">
                    <div className="text-[9px] uppercase tracking-wide text-slate-500">
                      Remaining Hrs
                    </div>
                    <div className="text-xs font-mono font-semibold text-slate-200">
                      {Math.round(tech.estimatedRemainingHours)}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

