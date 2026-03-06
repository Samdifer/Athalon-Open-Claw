"use client";

import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  AlertTriangle,
  BarChart3,
  ExternalLink,
  ShieldCheck,
  Users,
} from "lucide-react";
import { RosterStatCard } from "../shared/RosterStatCard";
import type { RosterAnalysis, RosterTeamRow, RosterTechnicianRow } from "../types";

// ─── Props ──────────────────────────────────────────────────────────────────

interface RosterAnalysisTabProps {
  analysis: RosterAnalysis;
  teams: RosterTeamRow[];
  technicians: RosterTechnicianRow[];
}

// ─── Component ──────────────────────────────────────────────────────────────

export function RosterAnalysisTab({
  analysis,
  teams,
  technicians,
}: RosterAnalysisTabProps) {
  const sortedTeams = useMemo(() => {
    return [...teams].sort((a, b) => {
      if (a.isUnsupervised !== b.isUnsupervised) {
        return a.isUnsupervised ? -1 : 1;
      }
      return b.memberCount - a.memberCount;
    });
  }, [teams]);

  // Compute load per team
  const teamLoadMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const tech of technicians) {
      if (tech.teamId) {
        map.set(tech.teamId, (map.get(tech.teamId) ?? 0) + tech.estimatedRemainingHours);
      }
    }
    return map;
  }, [technicians]);

  const efficiencyTone =
    analysis.averageEfficiency >= 0.9 ? "green" as const : "amber" as const;

  const coverageTone =
    analysis.supervisorCoveragePercent >= 100
      ? "green" as const
      : analysis.supervisorCoveragePercent < 50
        ? "red" as const
        : "amber" as const;

  const unsupervisedTone =
    analysis.unsupervisedTeams > 0 ? "amber" as const : "default" as const;

  return (
    <div className="space-y-6">
      {/* Section 1: KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        <RosterStatCard
          label="Active Technicians"
          value={analysis.activeTechnicians}
          icon={<Users className="h-3 w-3" />}
        />
        <RosterStatCard
          label="On Shift Today"
          value={analysis.onShiftTechnicians}
        />
        <RosterStatCard
          label="Active Teams"
          value={analysis.activeTeams}
        />
        <RosterStatCard
          label="Unsupervised Teams"
          value={analysis.unsupervisedTeams}
          tone={unsupervisedTone}
          icon={analysis.unsupervisedTeams > 0 ? <AlertTriangle className="h-3 w-3" /> : undefined}
        />
        <RosterStatCard
          label="Assigned Cards"
          value={analysis.assignedCards}
        />
        <RosterStatCard
          label="Remaining Hours"
          value={`${Math.round(analysis.remainingHours)}h`}
        />
        <RosterStatCard
          label="Avg Efficiency"
          value={`${Math.round(analysis.averageEfficiency * 100)}%`}
          tone={efficiencyTone}
        />
        <RosterStatCard
          label="Supervisor Coverage"
          value={`${Math.round(analysis.supervisorCoveragePercent)}%`}
          tone={coverageTone}
          icon={<ShieldCheck className="h-3 w-3" />}
        />
      </div>

      {/* Section 2: Team Risk Radar */}
      <Card>
        <CardContent className="pt-5">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4" />
              Team Risk Radar
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Supervisory coverage, workload, and team status
            </p>
          </div>

          {sortedTeams.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-6">
              No teams configured
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/60">
                    <th className="text-left text-[11px] uppercase tracking-wide text-muted-foreground py-2 pr-4">
                      Team
                    </th>
                    <th className="text-center text-[11px] uppercase tracking-wide text-muted-foreground py-2 px-3">
                      Members
                    </th>
                    <th className="text-center text-[11px] uppercase tracking-wide text-muted-foreground py-2 px-3">
                      On Shift
                    </th>
                    <th className="text-center text-[11px] uppercase tracking-wide text-muted-foreground py-2 px-3">
                      Load
                    </th>
                    <th className="text-center text-[11px] uppercase tracking-wide text-muted-foreground py-2 px-3">
                      Supervisor
                    </th>
                    <th className="text-center text-[11px] uppercase tracking-wide text-muted-foreground py-2 pl-3">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedTeams.map((team) => {
                    const teamLoad = teamLoadMap.get(team.teamId) ?? 0;
                    return (
                      <tr
                        key={team.teamId}
                        className="border-b border-border/30 last:border-0"
                      >
                        <td className="py-2.5 pr-4">
                          <div className="flex items-center gap-2">
                            <span
                              className={`inline-block h-2.5 w-2.5 rounded-full ${team.colorToken}`}
                            />
                            <span className="font-medium text-foreground">
                              {team.name}
                            </span>
                          </div>
                        </td>
                        <td className="text-center py-2.5 px-3 font-mono">
                          {team.memberCount}
                        </td>
                        <td className="text-center py-2.5 px-3 font-mono">
                          {team.onShiftCount}
                        </td>
                        <td className="text-center py-2.5 px-3 font-mono text-muted-foreground">
                          {Math.round(teamLoad)}h
                        </td>
                        <td className="text-center py-2.5 px-3">
                          {team.hasSupervisorCoverage ? (
                            <ShieldCheck className="h-4 w-4 text-emerald-500 inline-block" />
                          ) : (
                            <Badge
                              variant="outline"
                              className="text-[10px] border-amber-500/50 text-amber-500 font-semibold"
                            >
                              UNSUP
                            </Badge>
                          )}
                        </td>
                        <td className="text-center py-2.5 pl-3">
                          {team.isUnsupervised ? (
                            <Badge
                              variant="outline"
                              className="text-[10px] border-amber-500/50 text-amber-500"
                            >
                              <AlertTriangle className="h-3 w-3 mr-0.5" />
                              At Risk
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="text-[10px] border-emerald-500/50 text-emerald-500"
                            >
                              Covered
                            </Badge>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section 3: Quick Links */}
      <div className="flex flex-wrap items-center gap-2">
        <Button asChild variant="outline" size="sm">
          <Link to="/scheduling/capacity">
            <BarChart3 className="h-3.5 w-3.5 mr-1.5" />
            View Capacity Forecast
            <ExternalLink className="h-3 w-3 ml-1.5 opacity-50" />
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link to="/personnel">
            <Users className="h-3.5 w-3.5 mr-1.5" />
            Personnel Command
            <ExternalLink className="h-3 w-3 ml-1.5 opacity-50" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
