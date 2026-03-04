"use client";

import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { useQueries, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ExperienceSummaryCard } from "../../_components/ExperienceSummaryCard";
import {
  AircraftExperienceTable,
  type AircraftExperienceRow,
} from "../../_components/AircraftExperienceTable";
import { ATAChapterHeatmap } from "../../_components/ATAChapterHeatmap";

const STAGES = ["observe", "assist", "supervised", "evaluated"] as const;

type Stage = (typeof STAGES)[number];

export default function CareerProfilePage() {
  const { techId } = useParams<{ techId: string }>();
  const { orgId } = useCurrentOrg();

  const technicians = useQuery(
    api.technicians.list,
    orgId ? { organizationId: orgId } : "skip",
  );

  const curricula = useQuery(api.ojt.listCurricula, orgId ? { organizationId: orgId } : "skip");

  const jackets = useQuery(
    api.ojt.listJacketsByTechnician,
    techId ? { technicianId: techId as Id<"technicians"> } : "skip",
  );

  const trainingRecords = useQuery(
    api.training.listTrainingRecords,
    techId ? { technicianId: techId as Id<"technicians"> } : "skip",
  );

  const stageEventQueries = useMemo(() => {
    const entries = (jackets ?? []).map((j) => [
      j._id,
      { query: api.ojt.listStageEvents, args: { jacketId: j._id } },
    ] as const);
    return Object.fromEntries(entries);
  }, [jackets]);
  const stageEventsByJacket = useQueries(stageEventQueries);

  const taskQueries = useMemo(() => {
    const ids = Array.from(new Set((jackets ?? []).map((j) => j.curriculumId)));
    const entries = ids.map((curriculumId) => [
      curriculumId,
      { query: api.ojt.listTasksByCurriculum, args: { curriculumId } },
    ] as const);
    return Object.fromEntries(entries);
  }, [jackets]);
  const tasksByCurriculum = useQueries(taskQueries);

  const technician = useMemo(
    () => (technicians ?? []).find((t) => t._id === techId),
    [technicians, techId],
  );

  const curriculumMap = useMemo(() => {
    const m = new Map<string, { name: string; aircraftType: string }>();
    for (const c of curricula ?? []) m.set(c._id, { name: c.name, aircraftType: c.aircraftType });
    return m;
  }, [curricula]);

  const taskMap = useMemo(() => {
    const m = new Map<string, { ataChapter: string; curriculumId: string }>();
    for (const value of Object.values(tasksByCurriculum ?? {})) {
      if (!Array.isArray(value)) continue;
      for (const task of value as any[]) {
        m.set(task._id, { ataChapter: task.ataChapter, curriculumId: task.curriculumId });
      }
    }
    return m;
  }, [tasksByCurriculum]);

  const allEvents = useMemo(
    () => Object.values(stageEventsByJacket ?? {}).flatMap((v: any) => (Array.isArray(v) ? v : [])) as any[],
    [stageEventsByJacket],
  );

  const certSummary = useMemo(() => {
    const certNos = new Set<string>();
    let hasIA = false;
    const ratings = new Set<string>();
    for (const rec of trainingRecords ?? []) {
      const name = rec.courseName.toLowerCase();
      if (name.includes("a&p") || name.includes("a&p")) {
        ratings.add("airframe");
        ratings.add("powerplant");
      }
      if (name.includes("ia") || name.includes("inspection authorization")) hasIA = true;
      if (rec.certificateNumber) certNos.add(rec.certificateNumber);
    }
    return {
      numbers: Array.from(certNos),
      hasIA,
      ratings: Array.from(ratings),
    };
  }, [trainingRecords]);

  const aircraftRows: AircraftExperienceRow[] = useMemo(() => {
    return (jackets ?? []).map((j) => {
      const events = (stageEventsByJacket as any)?.[j._id];
      const rows = Array.isArray(events) ? events : [];
      const minutes = rows.reduce((acc: number, e: any) => acc + (e.actualMinutes ?? 0), 0);
      const lastWorkedAt = rows.reduce(
        (acc: number, e: any) => Math.max(acc, e.trainerSignedAt ?? e.createdAt ?? 0),
        0,
      );
      const uniqueStages = new Set(rows.filter((e: any) => e.trainerSignedAt).map((e: any) => e.stage as Stage));
      const proficiencyLevel: AircraftExperienceRow["proficiencyLevel"] =
        j.status === "fully_qualified"
          ? "expert"
          : uniqueStages.size >= 3
            ? "proficient"
            : uniqueStages.size >= 1
              ? "developing"
              : "not_started";

      return {
        aircraftType: curriculumMap.get(j.curriculumId)?.aircraftType ?? "Unknown Type",
        totalHours: minutes / 60,
        lastWorkedAt: lastWorkedAt || undefined,
        proficiencyLevel,
      };
    });
  }, [jackets, stageEventsByJacket, curriculumMap]);

  const ataRows = useMemo(() => {
    const map = new Map<string, Record<Stage, number>>();
    for (const event of allEvents) {
      const task = taskMap.get(event.taskId);
      if (!task) continue;
      const chapter = task.ataChapter || "Unknown";
      if (!map.has(chapter)) map.set(chapter, { observe: 0, assist: 0, supervised: 0, evaluated: 0 });
      const bucket = map.get(chapter)!;
      if (STAGES.includes(event.stage)) {
        bucket[event.stage as Stage] += 1;
      }
    }
    return Array.from(map.entries())
      .map(([ataChapter, counts]) => ({ ataChapter, ...counts }))
      .sort((a, b) => a.ataChapter.localeCompare(b.ataChapter));
  }, [allEvents, taskMap]);

  const summary = useMemo(() => {
    const totalHours = aircraftRows.reduce((acc, row) => acc + row.totalHours, 0);
    const completed = (jackets ?? []).filter((j) => j.status === "fully_qualified").length;
    const ojtCompletionPercent = (jackets ?? []).length
      ? Math.round((completed / (jackets ?? []).length) * 100)
      : 0;
    return {
      totalAircraftTypes: aircraftRows.length,
      totalHours,
      certificationsHeld: certSummary.numbers.length,
      ojtCompletionPercent,
    };
  }, [aircraftRows, jackets, certSummary]);

  if (!technicians || !curricula || !jackets || !trainingRecords) {
    return <Skeleton className="h-72 w-full" />;
  }

  if (!technician) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-muted-foreground">
          Technician not found in this organization.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold">Career Profile — {technician.legalName}</h1>
        <p className="text-sm text-muted-foreground">Technician experience dashboard and OJT progression.</p>
      </div>

      <ExperienceSummaryCard {...summary} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Certifications</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            <span className="text-muted-foreground">A&amp;P Numbers:</span>{" "}
            {certSummary.numbers.length ? certSummary.numbers.join(", ") : "Not recorded"}
          </p>
          <p>
            <span className="text-muted-foreground">IA Status:</span>{" "}
            {certSummary.hasIA ? "Active/Recorded" : "No IA record found"}
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-muted-foreground">Ratings Held:</span>
            {certSummary.ratings.length ? (
              certSummary.ratings.map((r) => <Badge key={r} variant="outline" className="capitalize">{r}</Badge>)
            ) : (
              <span>Not recorded</span>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Aircraft Experience</CardTitle>
        </CardHeader>
        <CardContent>
          <AircraftExperienceTable rows={aircraftRows} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Systems Proficiency (ATA Chapters)</CardTitle>
        </CardHeader>
        <CardContent>
          {ataRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No ATA chapter stage events available yet.</p>
          ) : (
            <ATAChapterHeatmap rows={ataRows} />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Training Jackets</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {jackets.length === 0 ? (
            <p className="text-sm text-muted-foreground">No jackets assigned.</p>
          ) : (
            jackets.map((j) => (
              <div key={j._id} className="rounded-md border p-3 flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium">{curriculumMap.get(j.curriculumId)?.name ?? "Unknown Curriculum"}</p>
                  <p className="text-xs text-muted-foreground">
                    {curriculumMap.get(j.curriculumId)?.aircraftType ?? "Unknown Type"} · Status: {j.status.replace("_", " ")}
                  </p>
                </div>
                <Link className="text-sm underline underline-offset-2" to={`/personnel/training?techId=${techId}&jacketId=${j._id}`}>
                  View Jacket
                </Link>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Employment History</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          <div className="rounded-md border p-3">
            <p className="font-medium">Current Role: {technician.role ?? "Technician"}</p>
            <p className="text-muted-foreground">
              Organization start record: {new Date(technician.createdAt).toLocaleDateString("en-US", { timeZone: "UTC" })}
            </p>
          </div>
          <p className="text-xs text-muted-foreground">
            Detailed position timeline is not currently captured in a dedicated history table.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
