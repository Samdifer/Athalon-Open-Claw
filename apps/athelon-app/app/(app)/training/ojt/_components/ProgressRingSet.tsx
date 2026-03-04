"use client";

import { useEffect, useMemo, useState } from "react";
import { useConvex } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

type CurriculumProgress = {
  curriculumId: Id<"ojtCurricula">;
  name: string;
  aircraftType: string;
  completionPct: number;
  masteredTasks: number;
  totalTasks: number;
  anomalyWarning: string | null;
};

export function ProgressRingSet() {
  const convex = useConvex();
  const { orgId } = useCurrentOrg();
  const [rows, setRows] = useState<CurriculumProgress[] | null>(null);
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    setAnimate(true);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!orgId) {
        setRows([]);
        return;
      }

      const curricula = await convex.query(api.ojt.listCurricula, { organizationId: orgId });

      const computed = await Promise.all(
        curricula.map(async (curriculum) => {
          const [tasks, jackets] = await Promise.all([
            convex.query(api.ojt.listTasksByCurriculum, { curriculumId: curriculum._id }),
            convex.query(api.ojt.listJacketsByCurriculum, { curriculumId: curriculum._id }),
          ]);

          const eventsByJacket = await Promise.all(
            jackets.map((jacket) => convex.query(api.ojt.listStageEvents, { jacketId: jacket._id })),
          );

          const taskIds = new Set(tasks.map((t) => String(t._id)));
          const requiredTotalStages = tasks.length * 4 * jackets.length;
          let signedStages = 0;
          let masteredTasks = 0;

          const trainerTechDay = new Map<string, Set<string>>();

          for (const events of eventsByJacket) {
            const perTaskStage = new Map<string, Set<string>>();
            for (const event of events) {
              if (!event.trainerSignedAt || !taskIds.has(String(event.taskId))) continue;
              signedStages += 1;

              const taskKey = String(event.taskId);
              const stages = perTaskStage.get(taskKey) ?? new Set<string>();
              stages.add(event.stage);
              perTaskStage.set(taskKey, stages);

              const day = new Date(event.trainerSignedAt).toISOString().slice(0, 10);
              const key = `${String(event.trainerId)}::${String(event.technicianId)}::${day}`;
              const signed = trainerTechDay.get(key) ?? new Set<string>();
              signed.add(taskKey);
              trainerTechDay.set(key, signed);
            }

            masteredTasks += Array.from(perTaskStage.values()).filter((stages) => stages.size === 4).length;
          }

          const anomaly = Array.from(trainerTechDay.values()).some((signed) => signed.size > 15)
            ? "Anomaly: a trainer signed >15 tasks/day for one technician. Review sign-off quality."
            : null;

          return {
            curriculumId: curriculum._id,
            name: curriculum.name,
            aircraftType: curriculum.aircraftType,
            completionPct: requiredTotalStages > 0 ? Math.round((signedStages / requiredTotalStages) * 100) : 0,
            masteredTasks,
            totalTasks: tasks.length * jackets.length,
            anomalyWarning: anomaly,
          } satisfies CurriculumProgress;
        }),
      );

      if (!cancelled) setRows(computed);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [convex, orgId]);

  const sorted = useMemo(() => (rows ?? []).sort((a, b) => b.completionPct - a.completionPct), [rows]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Curriculum Mastery Progress</CardTitle>
      </CardHeader>
      <CardContent>
        {!rows ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-[172px] w-full rounded-xl" />
            ))}
          </div>
        ) : sorted.length === 0 ? (
          <p className="text-sm text-muted-foreground">No curriculum progress yet.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {sorted.map((row) => {
              const radius = 44;
              const stroke = 9;
              const normalized = radius - stroke / 2;
              const circumference = normalized * 2 * Math.PI;
              const targetOffset = circumference - (row.completionPct / 100) * circumference;

              return (
                <div key={row.curriculumId} className="rounded-xl border p-4 min-h-[170px] touch-manipulation">
                  <div className="flex items-center gap-4">
                    <svg height={radius * 2} width={radius * 2} className="shrink-0">
                      <circle
                        stroke="hsl(var(--muted))"
                        fill="transparent"
                        strokeWidth={stroke}
                        r={normalized}
                        cx={radius}
                        cy={radius}
                      />
                      <circle
                        stroke="hsl(var(--primary))"
                        fill="transparent"
                        strokeLinecap="round"
                        strokeWidth={stroke}
                        strokeDasharray={`${circumference} ${circumference}`}
                        style={{
                          strokeDashoffset: animate ? targetOffset : circumference,
                          transition: "stroke-dashoffset 900ms ease-out",
                        }}
                        r={normalized}
                        cx={radius}
                        cy={radius}
                        transform={`rotate(-90 ${radius} ${radius})`}
                      />
                      <text
                        x="50%"
                        y="50%"
                        dominantBaseline="middle"
                        textAnchor="middle"
                        className="fill-foreground"
                        style={{ fontSize: 14, fontWeight: 700 }}
                      >
                        {row.completionPct}%
                      </text>
                    </svg>

                    <div className="min-w-0 space-y-1">
                      <p className="text-sm font-semibold truncate" title={row.name}>{row.name}</p>
                      <Badge variant="outline" className="text-[11px]">{row.aircraftType}</Badge>
                      <p className="text-xs text-muted-foreground">{row.masteredTasks}/{row.totalTasks} tasks mastered</p>
                      <p className="text-xs text-muted-foreground">Mastery is trainer-sign-off gated, never speed-based.</p>
                    </div>
                  </div>
                  {row.anomalyWarning ? (
                    <p className="text-xs text-amber-600 mt-3">{row.anomalyWarning}</p>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
