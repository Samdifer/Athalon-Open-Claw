"use client";

import { useMemo } from "react";
import { useQueries, useQuery } from "convex/react";
import { useUser } from "@clerk/clerk-react";
import type { Id } from "@/convex/_generated/dataModel";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type Props = { orgId: Id<"organizations"> };

export function TrainerRecords({ orgId }: Props) {
  const { user } = useUser();
  const technicians = useQuery(api.technicians.list, { organizationId: orgId });

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
      for (const task of value as any[]) map.set(task._id, { description: task.description, ataChapter: task.ataChapter });
    }
    return map;
  }, [tasksByCurriculum]);

  const trainerEvents = useMemo(() => {
    const rows = Object.values(stageEventsByJacket ?? {}).flatMap((v: any) =>
      Array.isArray(v) ? v : [],
    ) as any[];
    if (!currentTech) return [];
    return rows
      .filter((e) => e.trainerId === currentTech._id)
      .sort((a, b) => b.createdAt - a.createdAt);
  }, [stageEventsByJacket, currentTech]);

  const stats = useMemo(() => {
    const techs = new Set(trainerEvents.map((e) => e.technicianId));
    const totalMinutes = trainerEvents.reduce((acc, e) => acc + (e.actualMinutes ?? 0), 0);
    const ataCounts = new Map<string, number>();
    for (const event of trainerEvents) {
      const ata = taskMap.get(event.taskId)?.ataChapter ?? "Unknown";
      ataCounts.set(ata, (ataCounts.get(ata) ?? 0) + 1);
    }
    const topAta = Array.from(ataCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([ata, count]) => ({ ata, count }));

    return {
      totalTechsTrained: techs.size,
      totalHours: Math.round((totalMinutes / 60) * 10) / 10,
      topAta,
    };
  }, [trainerEvents, taskMap]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Trainer Records</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!currentTech ? (
          <p className="text-sm text-muted-foreground">No technician profile mapped to your user.</p>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-md border p-3">
                <p className="text-xs text-muted-foreground">Total Techs Trained</p>
                <p className="text-2xl font-semibold">{stats.totalTechsTrained}</p>
              </div>
              <div className="rounded-md border p-3">
                <p className="text-xs text-muted-foreground">Total Hours</p>
                <p className="text-2xl font-semibold">{stats.totalHours}</p>
              </div>
              <div className="rounded-md border p-3">
                <p className="text-xs text-muted-foreground mb-1">Most-Trained ATA</p>
                <div className="flex flex-wrap gap-1">
                  {stats.topAta.length === 0 ? (
                    <span className="text-sm text-muted-foreground">—</span>
                  ) : (
                    stats.topAta.map((row) => (
                      <Badge key={row.ata} variant="outline">ATA {row.ata} ({row.count})</Badge>
                    ))
                  )}
                </div>
              </div>
            </div>

            {trainerEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground">No trainer-delivered stage events found.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="py-2 pr-3">Date</th>
                      <th className="py-2 pr-3">Technician</th>
                      <th className="py-2 pr-3">Task</th>
                      <th className="py-2 pr-3">Stage</th>
                      <th className="py-2 pr-3">Minutes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trainerEvents.map((event) => {
                      const task = taskMap.get(event.taskId);
                      return (
                        <tr key={event._id} className="border-b last:border-0">
                          <td className="py-2 pr-3">{new Date(event.createdAt).toLocaleDateString("en-US", { timeZone: "UTC" })}</td>
                          <td className="py-2 pr-3 font-medium">{techMap.get(event.technicianId) ?? "Unknown"}</td>
                          <td className="py-2 pr-3">{task?.description ?? event.taskId}</td>
                          <td className="py-2 pr-3 capitalize">{event.stage}</td>
                          <td className="py-2 pr-3">{event.actualMinutes ?? 0}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
