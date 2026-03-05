"use client";

import { useEffect, useMemo, useState } from "react";
import { useConvex } from "convex/react";
import { Award, CheckCircle2, Flag, ShieldCheck, Star } from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type MilestoneKey =
  | "first_signoff"
  | "section_complete"
  | "halfway"
  | "fully_qualified"
  | "multi_type";

type MilestoneState = Record<MilestoneKey, boolean>;

const BASE_STATE: MilestoneState = {
  first_signoff: false,
  section_complete: false,
  halfway: false,
  fully_qualified: false,
  multi_type: false,
};

export function MilestoneBadges({ technicianId }: { technicianId?: Id<"technicians"> }) {
  const convex = useConvex();
  const { techId } = useCurrentOrg();
  const [state, setState] = useState<MilestoneState | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const targetTech = technicianId ?? (techId as Id<"technicians"> | undefined);
      if (!targetTech) {
        setState(BASE_STATE);
        return;
      }

      const jackets = await convex.query(api.ojt.listJacketsByTechnician, { technicianId: targetTech });
      if (jackets.length === 0) {
        setState(BASE_STATE);
        return;
      }

      const eventsByJacket = await Promise.all(
        jackets.map((j) => convex.query(api.ojt.listStageEvents, { jacketId: j._id })),
      );

      const milestones: MilestoneState = { ...BASE_STATE };
      milestones.first_signoff = eventsByJacket.some((events) => events.some((e) => Boolean(e.trainerSignedAt)));

      const aircraftQualified = new Set<string>();

      for (const jacket of jackets) {
        const [tasks, sections, events, curriculum] = await Promise.all([
          convex.query(api.ojt.listTasksByCurriculum, { curriculumId: jacket.curriculumId }),
          convex.query(api.ojt.listSections, { curriculumId: jacket.curriculumId }),
          convex.query(api.ojt.listStageEvents, { jacketId: jacket._id }),
          convex.query(api.ojt.getCurriculum, { id: jacket.curriculumId }),
        ]);

        const isRepetition = curriculum?.signOffModel === "repetition_5col";
        const maxPerTask = isRepetition ? 5 : 4;

        const taskCompletionMap = new Map<string, Set<string | number>>();
        for (const event of events) {
          if (!event.trainerSignedAt) continue;
          const key = String(event.taskId);
          const items = taskCompletionMap.get(key) ?? new Set<string | number>();
          if (isRepetition && event.columnNumber) {
            items.add(event.columnNumber);
          } else {
            items.add(event.stage);
          }
          taskCompletionMap.set(key, items);
        }

        const masteredTasks = tasks.filter((task) => (taskCompletionMap.get(String(task._id))?.size ?? 0) === maxPerTask).length;

        if (tasks.length > 0 && masteredTasks / tasks.length >= 0.5) milestones.halfway = true;

        if (jacket.status === "fully_qualified" || (tasks.length > 0 && masteredTasks === tasks.length)) {
          milestones.fully_qualified = true;
          if (curriculum?.aircraftType) aircraftQualified.add(curriculum.aircraftType);
        }

        if (sections.length > 0 && tasks.length > 0) {
          const sectionMastered = sections.some((section) => {
            const sectionTasks = tasks.filter((task) => task.sectionId === section._id);
            if (sectionTasks.length === 0) return false;
            return sectionTasks.every((task) => (taskCompletionMap.get(String(task._id))?.size ?? 0) === maxPerTask);
          });
          if (sectionMastered) milestones.section_complete = true;
        }
      }

      milestones.multi_type = aircraftQualified.size >= 2;
      if (!cancelled) setState(milestones);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [convex, techId, technicianId]);

  const badges = useMemo(
    () => [
      { key: "first_signoff" as const, label: "First Sign-off", Icon: Flag, earned: state?.first_signoff ?? false, color: "text-blue-600" },
      { key: "section_complete" as const, label: "Section Complete", Icon: CheckCircle2, earned: state?.section_complete ?? false, color: "text-green-600" },
      { key: "halfway" as const, label: "Halfway There", Icon: Star, earned: state?.halfway ?? false, color: "text-amber-500" },
      { key: "fully_qualified" as const, label: "Fully Qualified", Icon: ShieldCheck, earned: state?.fully_qualified ?? false, color: "text-violet-600" },
      { key: "multi_type" as const, label: "Multi-Type Certified", Icon: Award, earned: state?.multi_type ?? false, color: "text-fuchsia-600" },
    ],
    [state],
  );

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Milestone Badges</CardTitle>
      </CardHeader>
      <CardContent>
        {!state ? (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-lg" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {badges.map(({ key, label, Icon, earned, color }) => (
              <div
                key={key}
                className={`rounded-lg border p-3 text-center touch-manipulation ${
                  earned ? "bg-primary/5 border-primary/30" : "bg-muted/30 border-muted"
                }`}
              >
                <Icon className={`mx-auto h-6 w-6 ${earned ? color : "text-muted-foreground"}`} />
                <p className={`mt-2 text-xs font-medium ${earned ? "text-foreground" : "text-muted-foreground"}`}>{label}</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
