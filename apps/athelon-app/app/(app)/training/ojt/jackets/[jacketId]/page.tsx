"use client";

import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import { ArrowLeft, Circle, CheckCircle2, GraduationCap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { StageSignOffDialog } from "@/app/(app)/training/ojt/_components/StageSignOffDialog";

const STAGES = ["observe", "assist", "supervised", "evaluated"] as const;
type Stage = (typeof STAGES)[number];

function jacketStatusBadge(status?: string) {
  switch (status) {
    case "fully_qualified":
      return <Badge className="bg-green-500/15 text-green-600 border-green-500/30">Fully Qualified</Badge>;
    case "in_progress":
      return <Badge className="bg-blue-500/15 text-blue-600 border-blue-500/30">In Progress</Badge>;
    case "suspended":
      return <Badge className="bg-red-500/15 text-red-600 border-red-500/30">Suspended</Badge>;
    default:
      return <Badge variant="outline">Not Started</Badge>;
  }
}

function formatDate(ms?: number) {
  return ms ? new Date(ms).toLocaleDateString("en-US", { timeZone: "UTC" }) : "—";
}

export default function OjtJacketDetailPage() {
  const { jacketId } = useParams();
  const { orgId } = useCurrentOrg();
  const [selectedTaskId, setSelectedTaskId] = useState<Id<"ojtTasks"> | null>(null);

  const jacket = useQuery(api.ojt.getJacket, jacketId ? { id: jacketId as Id<"ojtJackets"> } : "skip");
  const curriculum = useQuery(api.ojt.getCurriculum, jacket?.curriculumId ? { id: jacket.curriculumId } : "skip");
  const technicians = useQuery(api.technicians.list, orgId ? { organizationId: orgId } : "skip");
  const sections = useQuery(api.ojt.listSections, jacket?.curriculumId ? { curriculumId: jacket.curriculumId } : "skip");
  const tasks = useQuery(api.ojt.listTasksByCurriculum, jacket?.curriculumId ? { curriculumId: jacket.curriculumId } : "skip");
  const stageEvents = useQuery(api.ojt.listStageEvents, jacketId ? { jacketId: jacketId as Id<"ojtJackets"> } : "skip");

  const technician = useMemo(() => technicians?.find((t) => t._id === jacket?.technicianId), [technicians, jacket?.technicianId]);

  const scoreByTask = useMemo(() => {
    const map = new Map<string, Set<Stage>>();
    for (const event of stageEvents ?? []) {
      if (!event.trainerSignedAt) continue;
      if (!map.has(event.taskId)) map.set(event.taskId, new Set<Stage>());
      map.get(event.taskId)!.add(event.stage);
    }
    return map;
  }, [stageEvents]);

  const sectionList = useMemo(() => [...(sections ?? [])].sort((a, b) => a.displayOrder - b.displayOrder), [sections]);
  const taskList = useMemo(() => [...(tasks ?? [])].sort((a, b) => a.displayOrder - b.displayOrder), [tasks]);

  const totals = useMemo(() => {
    const totalTasks = taskList.length;
    const maxScore = totalTasks * 4;
    const totalScore = [...scoreByTask.values()].reduce((sum, stages) => sum + stages.size, 0);
    const pct = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;
    return { totalScore, maxScore, pct };
  }, [taskList.length, scoreByTask]);

  const selectedTask = selectedTaskId ? taskList.find((t) => t._id === selectedTaskId) : null;

  if (!jacketId) {
    return <div className="text-sm text-muted-foreground">Missing jacket ID.</div>;
  }

  if (jacket === undefined || !technicians || !sections || !tasks || !stageEvents) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!jacket) {
    return <div className="text-sm text-muted-foreground">Jacket not found.</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <Button asChild variant="ghost" className="h-11 px-3">
          <Link to="/training/ojt/jackets">
            <ArrowLeft className="w-4 h-4 mr-1" /> Back to Jackets
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2">
              <GraduationCap className="w-5 h-5 mt-0.5 text-muted-foreground" />
              <div>
                <p className="text-lg font-semibold">{technician?.legalName ?? "Unknown Technician"}</p>
                <p className="text-sm text-muted-foreground">{curriculum?.name ?? "OJT Curriculum"}</p>
              </div>
            </div>
            {jacketStatusBadge(jacket.status)}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
            <p><span className="text-muted-foreground">Started:</span> {formatDate(jacket.startedAt)}</p>
            <p><span className="text-muted-foreground">Qualified:</span> {formatDate(jacket.qualifiedAt)}</p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Overall Progress</span>
              <span className="font-medium">{totals.totalScore} / {totals.maxScore}</span>
            </div>
            <Progress value={totals.pct} />
          </div>
        </CardContent>
      </Card>

      {sectionList.map((section) => {
        const sectionTasks = taskList.filter((t) => t.sectionId === section._id);
        const sectionCompleted = sectionTasks.filter((t) => (scoreByTask.get(t._id)?.size ?? 0) === 4).length;

        return (
          <Card key={section._id}>
            <CardHeader>
              <CardTitle className="text-base flex items-center justify-between gap-3">
                <span>{section.name}</span>
                <Badge variant="outline">{sectionCompleted}/{sectionTasks.length} complete</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {sectionTasks.length === 0 ? (
                <p className="text-sm text-muted-foreground">No tasks in this section.</p>
              ) : (
                sectionTasks.map((task) => {
                  const completed = scoreByTask.get(task._id) ?? new Set<Stage>();
                  return (
                    <button
                      key={task._id}
                      className="w-full min-h-11 rounded-md border p-3 text-left hover:bg-muted/50 transition-colors"
                      onClick={() => setSelectedTaskId(task._id)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-medium">{task.description}</p>
                          <p className="text-xs text-muted-foreground">ATA {task.ataChapter}</p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {STAGES.map((s) =>
                            completed.has(s) ? (
                              <CheckCircle2 key={s} className="w-4 h-4 text-green-600" />
                            ) : (
                              <Circle key={s} className="w-4 h-4 text-muted-foreground" />
                            ),
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </CardContent>
          </Card>
        );
      })}

      {orgId && jacket && selectedTask && (
        <StageSignOffDialog
          open={!!selectedTask}
          onOpenChange={(open) => {
            if (!open) setSelectedTaskId(null);
          }}
          organizationId={orgId}
          jacketId={jacket._id}
          technicianId={jacket.technicianId}
          task={{
            _id: selectedTask._id,
            description: selectedTask.description,
            ataChapter: selectedTask.ataChapter,
            approvedDataRef: selectedTask.approvedDataRef,
          }}
          completedStages={Array.from(scoreByTask.get(selectedTask._id) ?? [])}
          technicians={(technicians ?? []).map((t) => ({ _id: t._id, legalName: t.legalName }))}
        />
      )}
    </div>
  );
}
