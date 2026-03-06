import { useMemo } from "react";
import type { FunctionReturnType } from "convex/server";
import type { api } from "@/convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Users } from "lucide-react";

type RosterWorkspace = FunctionReturnType<typeof api.schedulerRoster.getRosterWorkspace>;
type ActiveTimers = FunctionReturnType<typeof api.timeClock.listActiveTimers>;

function shortenName(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length <= 1) return name;
  return `${parts[0]} ${parts[parts.length - 1]![0]}.`;
}

function getRoleBadge(role: string | undefined) {
  const roleMap: Record<string, { label: string; className: string }> = {
    admin: { label: "Admin", className: "bg-purple-500/15 text-purple-400 border-purple-500/30" },
    shop_manager: { label: "Mgr", className: "bg-blue-500/15 text-blue-400 border-blue-500/30" },
    qcm_inspector: { label: "QCM", className: "bg-amber-500/15 text-amber-400 border-amber-500/30" },
    lead_technician: { label: "Lead", className: "bg-teal-500/15 text-teal-400 border-teal-500/30" },
    technician: { label: "AMT", className: "bg-slate-500/15 text-slate-300 border-slate-500/30" },
    parts_clerk: { label: "Parts", className: "bg-sky-500/15 text-sky-400 border-sky-500/30" },
    billing_manager: { label: "Billing", className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  };
  const entry = roleMap[role ?? ""];
  if (!entry) return null;
  return (
    <Badge variant="outline" className={`text-[8px] h-3.5 px-1 ${entry.className}`}>
      {entry.label}
    </Badge>
  );
}

export function AvailablePersonnelWidget({
  roster,
  activeTimers,
}: {
  roster: RosterWorkspace | undefined;
  activeTimers: ActiveTimers | undefined;
}) {
  const { onShiftTechs, teamGroups, totalTechs, onShiftCount } = useMemo(() => {
    if (!roster) {
      return { onShiftTechs: null, teamGroups: null, totalTechs: 0, onShiftCount: 0 };
    }

    const techs = roster.technicians ?? [];
    const onShift = techs.filter((t: { isOnShiftToday: boolean }) => t.isOnShiftToday);

    // Build clocked-in set
    const clockedInTechIds = new Set<string>();
    if (activeTimers) {
      for (const timer of activeTimers) {
        clockedInTechIds.add(String(timer.technicianId));
      }
    }

    // Group by team
    const groups = new Map<string, typeof onShift>();
    for (const tech of onShift) {
      const teamKey = tech.teamName ?? "Unassigned";
      if (!groups.has(teamKey)) groups.set(teamKey, []);
      groups.get(teamKey)!.push(tech);
    }

    const enriched = onShift.map((tech) => ({
      ...tech,
      isClockedIn: clockedInTechIds.has(String(tech.technicianId)),
      shortName: shortenName(tech.name),
    }));

    // Build grouped list
    const teamGroupList = Array.from(groups.entries()).map(([teamName, members]) => ({
      teamName,
      colorToken: members[0]?.teamColorToken ?? "bg-slate-500",
      techs: members.map((m) => ({
        ...m,
        isClockedIn: clockedInTechIds.has(String(m.technicianId)),
        shortName: shortenName(m.name),
      })),
    }));

    return {
      onShiftTechs: enriched,
      teamGroups: teamGroupList,
      totalTechs: techs.length,
      onShiftCount: onShift.length,
    };
  }, [roster, activeTimers]);

  if (!onShiftTechs) {
    return (
      <Card className="border-border/60">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Users className="w-4 h-4 text-muted-foreground" />
            Available Personnel
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[180px] w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Users className="w-4 h-4 text-muted-foreground" />
            Available Personnel
          </CardTitle>
          <Badge variant="secondary" className="text-[10px] h-5 px-2 bg-muted">
            {onShiftCount} on shift
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {onShiftCount === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <Users className="w-6 h-6 mb-2 text-muted-foreground/40" />
            <p className="text-sm">No personnel on shift today</p>
            <p className="text-[11px] mt-1">{totalTechs} total technicians</p>
          </div>
        ) : (
          <div className="space-y-3">
            {teamGroups?.map((group) => (
              <div key={group.teamName}>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <div className={`w-2 h-2 rounded-full ${group.colorToken}`} />
                  <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                    {group.teamName}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {group.techs.map((tech) => (
                    <div
                      key={tech.technicianId}
                      className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted/40 border border-border/40"
                    >
                      {/* Clocked-in indicator */}
                      <div
                        className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                          tech.isClockedIn ? "bg-green-400" : "bg-muted-foreground/30"
                        }`}
                        title={tech.isClockedIn ? "Clocked in" : "Not clocked in"}
                      />
                      <span className="text-[11px] text-foreground font-medium">
                        {tech.shortName}
                      </span>
                      {getRoleBadge(tech.role)}
                      {tech.assignedActiveCards > 0 && (
                        <span className="text-[9px] text-muted-foreground/70">
                          {tech.assignedActiveCards} tasks
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
            <div className="text-[10px] text-muted-foreground/60 pt-1 border-t border-border/30">
              {totalTechs} total technicians · {onShiftCount} on shift ·{" "}
              {onShiftTechs.filter((t) => t.isClockedIn).length} clocked in
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
