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

interface PersonnelAnalysisData {
  activeTechnicians: number;
  activeTeams: number;
  unsupervisedTeams: number;
  onShiftTechnicians: number;
  assignedCards: number;
  remainingHours: number;
  averageEfficiency: number;
  supervisorCoveragePercent: number;
}

interface TeamRiskRow {
  teamId: string;
  name: string;
  colorToken: string;
  memberCount: number;
  onShiftCount: number;
  hasSupervisorCoverage: boolean;
  isUnsupervised: boolean;
}

interface PersonnelAnalysisTabProps {
  analysis: PersonnelAnalysisData | null;
  teams: TeamRiskRow[];
  expiringCertsCount: number;
}

type KpiTone = "default" | "green" | "amber" | "red";

function toneClasses(tone: KpiTone): string {
  switch (tone) {
    case "green":
      return "text-emerald-600 dark:text-emerald-400";
    case "amber":
      return "text-amber-500 dark:text-amber-400";
    case "red":
      return "text-red-600 dark:text-red-400";
    default:
      return "text-foreground";
  }
}

function KpiCard({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string | number;
  tone?: KpiTone;
}) {
  return (
    <div className="rounded border border-border/60 p-3">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className={`text-xl font-mono font-semibold mt-1 ${toneClasses(tone)}`}>
        {value}
      </div>
    </div>
  );
}

export function PersonnelAnalysisTab({
  analysis,
  teams,
  expiringCertsCount,
}: PersonnelAnalysisTabProps) {
  const sortedTeams = useMemo(() => {
    return [...teams].sort((a, b) => {
      if (a.isUnsupervised !== b.isUnsupervised) {
        return a.isUnsupervised ? -1 : 1;
      }
      return b.memberCount - a.memberCount;
    });
  }, [teams]);

  if (!analysis) {
    return (
      <div className="space-y-4 p-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="rounded border border-border/60 p-3">
              <div className="h-3 w-20 bg-muted rounded animate-pulse" />
              <div className="h-6 w-12 bg-muted rounded animate-pulse mt-2" />
            </div>
          ))}
        </div>
        <div className="text-sm text-muted-foreground text-center py-8">
          Loading analysis...
        </div>
      </div>
    );
  }

  const efficiencyTone: KpiTone =
    analysis.averageEfficiency >= 90 ? "green" : "amber";

  const coverageTone: KpiTone =
    analysis.supervisorCoveragePercent >= 100
      ? "green"
      : analysis.supervisorCoveragePercent < 50
        ? "red"
        : "amber";

  const unsupervisedTone: KpiTone =
    analysis.unsupervisedTeams > 0 ? "amber" : "default";

  const expiringCertsTone: KpiTone =
    expiringCertsCount > 0 ? "red" : "default";

  return (
    <div className="space-y-6">
      {/* Section 1: KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        <KpiCard label="Active Technicians" value={analysis.activeTechnicians} />
        <KpiCard label="On Shift Today" value={analysis.onShiftTechnicians} />
        <KpiCard label="Active Teams" value={analysis.activeTeams} />
        <KpiCard
          label="Unsupervised Teams"
          value={analysis.unsupervisedTeams}
          tone={unsupervisedTone}
        />
        <KpiCard label="Assigned Cards" value={analysis.assignedCards} />
        <KpiCard
          label="Remaining Hours"
          value={analysis.remainingHours.toFixed(1)}
        />
        <KpiCard
          label="Avg Efficiency"
          value={`${Math.round(analysis.averageEfficiency)}%`}
          tone={efficiencyTone}
        />
        <KpiCard
          label="Supervisor Coverage"
          value={`${Math.round(analysis.supervisorCoveragePercent)}%`}
          tone={coverageTone}
        />
        <KpiCard
          label="Expiring Certs"
          value={expiringCertsCount}
          tone={expiringCertsTone}
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
              Supervisory coverage and workload status by team
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
                      Supervisor
                    </th>
                    <th className="text-center text-[11px] uppercase tracking-wide text-muted-foreground py-2 pl-3">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedTeams.map((team) => (
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
                  ))}
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
          <Link to="/scheduling/roster">
            <Users className="h-3.5 w-3.5 mr-1.5" />
            Open Roster Workspace
            <ExternalLink className="h-3 w-3 ml-1.5 opacity-50" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
