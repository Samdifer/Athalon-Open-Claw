// BUG-DOM-HUNT-143: Removed "use client" Next.js directive — same Vite+React
// cleanup as BUG-DOM-120 and BUG-DOM-HUNT-140.

import { useEffect, useMemo, useState } from "react";
import { useConvex, useQuery } from "convex/react";
import { AlertTriangle, TrendingUp } from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

type LeaderRow = {
  technicianId: string;
  name: string;
  completionPct: number;
  previousPct: number;
  gain30d: number;
};

type SectionRow = {
  section: string;
  pct: number;
};

type DashboardData = {
  leaderboard: LeaderRow[];
  teamAverage: number;
  mostImproved: LeaderRow | null;
  sections: SectionRow[];
  anomalies: string[];
};

export function TeamTrainingDashboard() {
  const convex = useConvex();
  const { orgId } = useCurrentOrg();
  const technicians = useQuery(api.technicians.list, orgId ? { organizationId: orgId } : "skip");
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!orgId || !technicians) {
        setData(null);
        return;
      }

      const techNameById = new Map(technicians.map((t) => [String(t._id), t.legalName]));
      const curricula = await convex.query(api.ojt.listCurricula, { organizationId: orgId });
      const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;

      const perTech = new Map<string, { signed: number; signedPrev: number; possible: number }>();
      const perSection = new Map<string, { signed: number; possible: number }>();
      const trainerTechDay = new Map<string, Set<string>>();

      for (const curriculum of curricula) {
        const [tasks, sections, jackets] = await Promise.all([
          convex.query(api.ojt.listTasksByCurriculum, { curriculumId: curriculum._id }),
          convex.query(api.ojt.listSections, { curriculumId: curriculum._id }),
          convex.query(api.ojt.listJacketsByCurriculum, { curriculumId: curriculum._id }),
        ]);

        const isRepetition = curriculum.signOffModel === "repetition_5col";
        const maxPerTask = isRepetition ? 5 : 4;
        const taskSection = new Map(tasks.map((task) => [String(task._id), task.sectionId]));

        for (const jacket of jackets) {
          const events = await convex.query(api.ojt.listStageEvents, { jacketId: jacket._id });
          const techKey = String(jacket.technicianId);
          const base = perTech.get(techKey) ?? { signed: 0, signedPrev: 0, possible: 0 };
          base.possible += tasks.length * maxPerTask;

          for (const event of events) {
            if (!event.trainerSignedAt) continue;
            base.signed += 1;
            if (event.createdAt <= cutoff) base.signedPrev += 1;

            const sectionId = taskSection.get(String(event.taskId));
            const sectionName = sections.find((s) => s._id === sectionId)?.name ?? "General";
            const sec = perSection.get(sectionName) ?? { signed: 0, possible: 0 };
            sec.signed += 1;
            perSection.set(sectionName, sec);

            const day = new Date(event.trainerSignedAt).toISOString().slice(0, 10);
            const key = `${String(event.trainerId)}::${String(event.technicianId)}::${day}`;
            const signedTasks = trainerTechDay.get(key) ?? new Set<string>();
            signedTasks.add(String(event.taskId));
            trainerTechDay.set(key, signedTasks);
          }

          perTech.set(techKey, base);
        }

        for (const section of sections) {
          const sec = perSection.get(section.name) ?? { signed: 0, possible: 0 };
          sec.possible += tasks.filter((t) => t.sectionId === section._id).length * maxPerTask * jackets.length;
          perSection.set(section.name, sec);
        }
      }

      const leaderboard = Array.from(perTech.entries()).map(([techId, v]) => {
        const completionPct = v.possible > 0 ? Math.round((v.signed / v.possible) * 100) : 0;
        const previousPct = v.possible > 0 ? Math.round((v.signedPrev / v.possible) * 100) : 0;
        return {
          technicianId: techId,
          name: techNameById.get(techId) ?? "Unknown technician",
          completionPct,
          previousPct,
          gain30d: completionPct - previousPct,
        };
      }).sort((a, b) => b.completionPct - a.completionPct);

      const teamAverage =
        leaderboard.length > 0
          ? Math.round(leaderboard.reduce((sum, row) => sum + row.completionPct, 0) / leaderboard.length)
          : 0;

      const mostImproved = [...leaderboard].sort((a, b) => b.gain30d - a.gain30d)[0] ?? null;

      const sections = Array.from(perSection.entries())
        .map(([section, v]) => ({ section, pct: v.possible > 0 ? Math.round((v.signed / v.possible) * 100) : 0 }))
        .sort((a, b) => b.pct - a.pct);

      const anomalies = Array.from(trainerTechDay.entries())
        .filter(([, taskSet]) => taskSet.size > 15)
        .map(([key, taskSet]) => {
          const [trainerId, technicianId, day] = key.split("::");
          return `Anomaly ${day}: trainer ${techNameById.get(trainerId) ?? trainerId.slice(-6)} signed ${taskSet.size} tasks for ${techNameById.get(technicianId) ?? technicianId.slice(-6)}.`;
        });

      if (!cancelled) setData({ leaderboard, teamAverage, mostImproved, sections, anomalies });
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [convex, orgId, technicians]);

  const topFive = useMemo(() => data?.leaderboard.slice(0, 5) ?? [], [data]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Team Training Dashboard</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!data ? (
          <Skeleton className="h-[420px] w-full" />
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <StatCard label="Team Average" value={`${data.teamAverage}%`} />
              <StatCard label="Technicians Ranked" value={data.leaderboard.length} />
              <StatCard label="Sections Tracked" value={data.sections.length} />
            </div>

            {data.mostImproved ? (
              <div className="rounded-lg border bg-emerald-50 dark:bg-emerald-950/30 p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Most Improved (30 days)</p>
                <p className="text-sm font-semibold flex items-center gap-2 mt-1">
                  <TrendingUp className="h-4 w-4 text-emerald-600" /> {data.mostImproved.name}
                </p>
                <p className="text-xs text-muted-foreground">+{data.mostImproved.gain30d}% gain</p>
              </div>
            ) : null}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Leaderboard</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {topFive.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No ranked technicians yet.</p>
                  ) : topFive.map((row, index) => (
                    <div key={row.technicianId} className="flex items-center justify-between rounded-md border p-2">
                      <div>
                        <p className="text-sm font-medium">#{index + 1} {row.name}</p>
                        <p className="text-xs text-muted-foreground">30d gain {row.gain30d}%</p>
                      </div>
                      <Badge>{row.completionPct}%</Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Section Breakdown</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {data.sections.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No section progress data yet.</p>
                  ) : data.sections.slice(0, 8).map((row) => (
                    <div key={row.section} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="truncate font-medium">{row.section}</span>
                        <span className="text-muted-foreground">{row.pct}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full bg-blue-500" style={{ width: `${row.pct}%` }} />
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            {data.anomalies.length > 0 ? (
              <div className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/30 p-3">
                <p className="text-sm font-medium flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-amber-600" /> Sign-off Anomaly Warnings</p>
                <ul className="mt-2 space-y-1 text-xs text-amber-800 dark:text-amber-200">
                  {data.anomalies.slice(0, 3).map((warning) => <li key={warning}>• {warning}</li>)}
                </ul>
              </div>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <Card>
      <CardContent className="p-3">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="text-xl font-bold mt-1">{value}</p>
      </CardContent>
    </Card>
  );
}
