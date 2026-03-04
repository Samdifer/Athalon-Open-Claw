"use client";

import { useMemo, useState } from "react";
import { useMutation, useQueries, useQuery } from "convex/react";
import { useUser } from "@clerk/clerk-react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type Props = {
  orgId: Id<"organizations">;
};

export function TrainerSignOffQueue({ orgId }: Props) {
  const { user } = useUser();
  const [submittingId, setSubmittingId] = useState<string | null>(null);

  const technicians = useQuery(api.technicians.list, { organizationId: orgId });
  const recordStageEvent = useMutation(api.ojt.recordStageEvent);
  const countersign = useMutation(api.ojt.chiefInspectorCountersign);

  const currentTech = useMemo(
    () => (technicians ?? []).find((t) => t.userId && user?.id && t.userId === user.id),
    [technicians, user?.id],
  );

  const jacketQueries = useMemo(() => {
    const entries = (technicians ?? []).map((t) => [
      t._id,
      { query: api.ojt.listJacketsByTechnician, args: { technicianId: t._id } },
    ] as const);
    return Object.fromEntries(entries);
  }, [technicians]);
  const jacketsByTech = useQueries(jacketQueries);

  const jackets = useMemo(() => {
    const all = Object.values(jacketsByTech ?? {}).flatMap((v: any) =>
      Array.isArray(v) ? v : [],
    );
    const seen = new Set<string>();
    return all.filter((j: any) => {
      if (seen.has(j._id)) return false;
      seen.add(j._id);
      return true;
    });
  }, [jacketsByTech]);

  const stageEventQueries = useMemo(() => {
    const entries = jackets.map((j: any) => [
      j._id,
      { query: api.ojt.listStageEvents, args: { jacketId: j._id } },
    ] as const);
    return Object.fromEntries(entries);
  }, [jackets]);
  const stageEventsByJacket = useQueries(stageEventQueries);

  const taskQueries = useMemo(() => {
    const curriculumIds = Array.from(new Set(jackets.map((j: any) => j.curriculumId)));
    const entries = curriculumIds.map((curriculumId) => [
      curriculumId,
      { query: api.ojt.listTasksByCurriculum, args: { curriculumId } },
    ] as const);
    return Object.fromEntries(entries);
  }, [jackets]);
  const tasksByCurriculum = useQueries(taskQueries);

  const techMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const t of technicians ?? []) map.set(t._id, t.legalName);
    return map;
  }, [technicians]);

  const taskMap = useMemo(() => {
    const map = new Map<string, { description: string; ataChapter: string }>();
    for (const value of Object.values(tasksByCurriculum ?? {})) {
      if (!Array.isArray(value)) continue;
      for (const task of value as any[]) {
        map.set(task._id, { description: task.description, ataChapter: task.ataChapter });
      }
    }
    return map;
  }, [tasksByCurriculum]);

  const pendingRows = useMemo(() => {
    const rows = Object.values(stageEventsByJacket ?? {}).flatMap((v: any) =>
      Array.isArray(v) ? v : [],
    ) as any[];

    return rows
      .filter((e) => !e.trainerSignedAt || (e.stage === "evaluated" && !e.chiefInspectorSignedAt))
      .sort((a, b) => b.createdAt - a.createdAt);
  }, [stageEventsByJacket]);

  async function handleTrainerSign(event: any) {
    if (!currentTech) {
      toast.error("No technician profile mapped to your user");
      return;
    }
    setSubmittingId(event._id);
    try {
      await recordStageEvent({
        organizationId: event.organizationId,
        jacketId: event.jacketId,
        taskId: event.taskId,
        technicianId: event.technicianId,
        stage: event.stage,
        trainerId: currentTech._id,
        approvedDataRef: event.approvedDataRef,
        trainingMethod: event.trainingMethod,
        actualMinutes: event.actualMinutes,
        notes: event.notes,
      });
      toast.success("Trainer sign-off recorded");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to record trainer sign-off");
    } finally {
      setSubmittingId(null);
    }
  }

  async function handleCountersign(eventId: Id<"ojtStageEvents">) {
    if (!currentTech) {
      toast.error("No technician profile mapped to your user");
      return;
    }
    setSubmittingId(eventId);
    try {
      await countersign({ eventId, chiefInspectorId: currentTech._id });
      toast.success("Chief inspector countersign complete");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to countersign");
    } finally {
      setSubmittingId(null);
    }
  }

  const loading = technicians === undefined;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Trainer Sign-Off Queue</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading sign-off queue…</p>
        ) : pendingRows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No pending sign-offs.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="py-2 pr-3">Trainer</th>
                  <th className="py-2 pr-3">Technician</th>
                  <th className="py-2 pr-3">Task</th>
                  <th className="py-2 pr-3">Stage</th>
                  <th className="py-2 pr-3">Date</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {pendingRows.map((event) => {
                  const task = taskMap.get(event.taskId);
                  const needsTrainerSign = !event.trainerSignedAt;
                  const needsCountersign = event.stage === "evaluated" && !event.chiefInspectorSignedAt;

                  return (
                    <tr key={event._id} className="border-b last:border-0 align-top">
                      <td className="py-2 pr-3">{techMap.get(event.trainerId) ?? "Unknown"}</td>
                      <td className="py-2 pr-3 font-medium">{techMap.get(event.technicianId) ?? "Unknown"}</td>
                      <td className="py-2 pr-3">
                        <p>{task?.description ?? event.taskId}</p>
                        <p className="text-xs text-muted-foreground">ATA {task?.ataChapter ?? "—"}</p>
                      </td>
                      <td className="py-2 pr-3 capitalize">{event.stage}</td>
                      <td className="py-2 pr-3">
                        {new Date(event.createdAt).toLocaleDateString("en-US", { timeZone: "UTC" })}
                      </td>
                      <td className="py-2 pr-3">
                        {needsTrainerSign ? (
                          <Badge variant="outline">Trainer Sign-Off Pending</Badge>
                        ) : (
                          <Badge className="bg-amber-500/15 text-amber-700 border-amber-500/30">
                            Chief Inspector Pending
                          </Badge>
                        )}
                      </td>
                      <td className="py-2">
                        {needsTrainerSign ? (
                          <Button
                            size="sm"
                            onClick={() => handleTrainerSign(event)}
                            disabled={submittingId === event._id}
                          >
                            Trainer Sign
                          </Button>
                        ) : needsCountersign ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleCountersign(event._id)}
                            disabled={submittingId === event._id}
                          >
                            Countersign
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">Complete</span>
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
  );
}
