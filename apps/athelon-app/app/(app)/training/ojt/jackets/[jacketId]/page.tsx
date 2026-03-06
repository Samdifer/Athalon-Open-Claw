"use client";

import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import { toast } from "sonner";
import { ArrowLeft, BookOpen, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { JacketHeaderCard } from "@/app/(app)/training/ojt/_components/JacketHeaderCard";
import { SectionAccordion } from "@/app/(app)/training/ojt/_components/SectionAccordion";
import { FiveColumnTaskRow } from "@/app/(app)/training/ojt/_components/FiveColumnTaskRow";
import { ColumnSignOffDialog } from "@/app/(app)/training/ojt/_components/ColumnSignOffDialog";
import { AuthorizationSection } from "@/app/(app)/training/ojt/_components/AuthorizationSection";
import { JacketActivityLog } from "@/app/(app)/training/ojt/_components/JacketActivityLog";
import { JacketScoringCard } from "@/app/(app)/training/ojt/_components/JacketScoringCard";

type Task = Doc<"ojtTasks">;
type Section = Doc<"ojtCurriculumSections">;

export default function OjtJacketDetailPage() {
  const { jacketId } = useParams<{ jacketId: string }>();
  const { orgId, techId } = useCurrentOrg();

  // ---- Data queries ----
  const jacket = useQuery(
    api.ojt.getJacket,
    jacketId ? { id: jacketId as Id<"ojtJackets"> } : "skip",
  );

  const curriculum = useQuery(
    api.ojt.getCurriculum,
    jacket?.curriculumId ? { id: jacket.curriculumId } : "skip",
  );

  const technicians = useQuery(
    api.technicians.list,
    orgId ? { organizationId: orgId as Id<"organizations"> } : "skip",
  ) ?? [];

  const sections = useQuery(
    api.ojt.listSections,
    jacket?.curriculumId ? { curriculumId: jacket.curriculumId } : "skip",
  ) ?? [];

  const tasks = useQuery(
    api.ojt.listTasksByCurriculum,
    jacket?.curriculumId ? { curriculumId: jacket.curriculumId } : "skip",
  ) ?? [];

  const columnProgress = useQuery(
    api.ojt.getJacketColumnProgress,
    jacketId ? { jacketId: jacketId as Id<"ojtJackets"> } : "skip",
  );

  const authorizations = useQuery(
    api.ojtAuthorizations.listForJacket,
    jacketId ? { jacketId: jacketId as Id<"ojtJackets"> } : "skip",
  ) ?? [];

  const stageEvents = useQuery(
    api.ojt.listStageEvents,
    jacketId ? { jacketId: jacketId as Id<"ojtJackets"> } : "skip",
  ) ?? [];

  // ---- Mutations ----
  const grantAuth = useMutation(api.ojtAuthorizations.grantAuthorization);
  const revokeAuth = useMutation(api.ojtAuthorizations.revokeAuthorization);

  // ---- Sign-off dialog state ----
  const [signOffDialog, setSignOffDialog] = useState<{
    task: Task;
    columnNumber: number;
    completedColumns: number[];
  } | null>(null);

  // ---- Computed data ----
  const techMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const t of technicians) {
      map.set(t._id, t.legalName);
    }
    return map;
  }, [technicians]);

  const orderedSections = useMemo(
    () => [...sections].sort((a, b) => a.displayOrder - b.displayOrder),
    [sections],
  );

  const tasksBySection = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const task of tasks) {
      const bucket = map.get(task.sectionId) ?? [];
      bucket.push(task);
      map.set(task.sectionId, bucket);
    }
    for (const [key, bucket] of map.entries()) {
      map.set(key, bucket.sort((a, b) => a.displayOrder - b.displayOrder));
    }
    return map;
  }, [tasks]);

  // Separate top-level sections from sub-sections
  const { topLevelSections, subSectionsByParent } = useMemo(() => {
    const topLevel: Section[] = [];
    const byParent = new Map<string, Section[]>();

    for (const section of orderedSections) {
      if (section.parentSectionId) {
        const bucket = byParent.get(section.parentSectionId) ?? [];
        bucket.push(section);
        byParent.set(section.parentSectionId, bucket);
      } else {
        topLevel.push(section);
      }
    }

    return { topLevelSections: topLevel, subSectionsByParent: byParent };
  }, [orderedSections]);

  // Determine which tasks are fully complete (all 5 columns signed off)
  const completedTaskIds = useMemo(() => {
    if (!columnProgress) return new Set<string>();
    const set = new Set<string>();
    for (const [taskId, columns] of Object.entries(columnProgress)) {
      if (columns.length >= 5) {
        set.add(taskId);
      }
    }
    return set;
  }, [columnProgress]);

  // Count completed tasks per section
  const sectionCompletion = useMemo(() => {
    const result = new Map<string, { completed: number; total: number }>();
    for (const section of orderedSections) {
      const sectionTasks = tasksBySection.get(section._id) ?? [];
      const completed = sectionTasks.filter((t) => completedTaskIds.has(t._id)).length;
      result.set(section._id, { completed, total: sectionTasks.length });
    }
    return result;
  }, [orderedSections, tasksBySection, completedTaskIds]);

  // Overall stats
  const totalTasks = tasks.length;
  const totalCompletedTasks = completedTaskIds.size;
  const authGrantedCount = authorizations.filter((a) => a.isGranted).length;

  // Last activity = most recent event
  const lastActivity = useMemo(() => {
    if (stageEvents.length === 0) return undefined;
    return Math.max(...stageEvents.map((e) => e.createdAt));
  }, [stageEvents]);

  // Scoring data for sections
  const scoringData = useMemo(() => {
    return topLevelSections.map((section) => {
      const sectionTasks = tasksBySection.get(section._id) ?? [];
      // Also include tasks from sub-sections
      const subSections = subSectionsByParent.get(section._id) ?? [];
      const allTasks = [
        ...sectionTasks,
        ...subSections.flatMap((ss) => tasksBySection.get(ss._id) ?? []),
      ];

      const maxPerTask = 5;
      const maxScore = allTasks.length * maxPerTask;

      let totalScore = 0;
      let completedTasks = 0;
      for (const task of allTasks) {
        const cols = columnProgress?.[task._id] ?? [];
        totalScore += cols.length;
        if (cols.length >= 5) completedTasks++;
      }

      const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;

      return {
        sectionId: section._id,
        sectionName: section.name,
        taskCount: allTasks.length,
        completedTasks,
        totalScore,
        maxScore,
        percentage,
      };
    });
  }, [topLevelSections, tasksBySection, subSectionsByParent, columnProgress]);

  // ---- Handlers ----
  function handleColumnClick(task: Task, columnNumber: number) {
    const cols = columnProgress?.[task._id] ?? [];
    const completedCols = cols.map((c) => c.columnNumber);
    setSignOffDialog({ task, columnNumber, completedColumns: completedCols });
  }

  async function handleGrantAuth(authId: Id<"ojtAuthorizations">, notes?: string) {
    if (!techId) {
      toast.error("Unable to determine current technician");
      return;
    }
    const techName = techMap.get(techId) ?? "Unknown";
    try {
      await grantAuth({
        id: authId,
        grantedByTechnicianId: techId as Id<"technicians">,
        grantedByName: techName,
        notes,
      });
      toast.success("Authorization granted");
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to grant authorization");
    }
  }

  async function handleRevokeAuth(authId: Id<"ojtAuthorizations">, reason?: string) {
    if (!techId) {
      toast.error("Unable to determine current technician");
      return;
    }
    try {
      await revokeAuth({
        id: authId,
        revokedByTechnicianId: techId as Id<"technicians">,
        revokedReason: reason,
      });
      toast.success("Authorization revoked");
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to revoke authorization");
    }
  }

  // ---- Render helpers ----
  function renderSectionContent(section: Section) {
    const sectionType = section.sectionType ?? "standard";
    const sectionTasks = tasksBySection.get(section._id) ?? [];
    const completion = sectionCompletion.get(section._id) ?? { completed: 0, total: 0 };
    const subSections = subSectionsByParent.get(section._id) ?? [];

    if (sectionType === "reference") {
      return (
        <Card key={section._id}>
          <CardHeader className="py-3">
            <div className="flex items-center gap-2">
              <Info className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium text-sm">{section.name}</span>
              <Badge variant="outline" className="text-xs">Reference</Badge>
            </div>
          </CardHeader>
          {section.description && (
            <CardContent className="pt-0">
              <p className="text-sm text-muted-foreground">{section.description}</p>
            </CardContent>
          )}
        </Card>
      );
    }

    if (sectionType === "procedural") {
      return (
        <SectionAccordion
          key={section._id}
          name={section.name}
          sectionType={sectionType}
          completedCount={completion.completed}
          totalCount={completion.total}
          proficiencyTier={sectionTasks[0]?.proficiencyTier}
        >
          {sectionTasks.length > 0 ? (
            sectionTasks.map((task) => {
              const cols = columnProgress?.[task._id] ?? [];
              const isComplete = completedTaskIds.has(task._id);
              return (
                <div
                  key={task._id}
                  className={`flex items-center gap-3 rounded-md border p-3 ${
                    isComplete ? "border-green-500/30 bg-green-500/5" : ""
                  }`}
                >
                  <div className="flex items-center justify-center h-5 w-5 shrink-0">
                    {isComplete ? (
                      <div className="h-4 w-4 rounded-sm bg-green-500 flex items-center justify-center">
                        <svg className="h-3 w-3 text-white" viewBox="0 0 12 12" fill="none">
                          <path d="M2 6L5 9L10 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                    ) : (
                      <div className="h-4 w-4 rounded-sm border-2 border-muted-foreground/30" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium leading-tight">{task.description}</p>
                    <p className="text-xs text-muted-foreground">ATA {task.ataChapter}</p>
                  </div>
                  {!isComplete && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="shrink-0"
                      onClick={() => {
                        const nextCol = cols.length + 1;
                        if (nextCol <= 5) handleColumnClick(task, nextCol);
                      }}
                    >
                      Sign Off
                    </Button>
                  )}
                </div>
              );
            })
          ) : (
            <p className="text-sm text-muted-foreground py-2">
              No checklist items in this section.
            </p>
          )}
          {subSections.map((sub) => renderSubSection(sub))}
        </SectionAccordion>
      );
    }

    // Default: standard or authorization sections with 5-column task rows
    return (
      <SectionAccordion
        key={section._id}
        name={section.name}
        sectionType={sectionType}
        completedCount={completion.completed}
        totalCount={completion.total}
        proficiencyTier={sectionTasks[0]?.proficiencyTier}
      >
        {sectionTasks.length > 0 ? (
          sectionTasks.map((task) => {
            const cols = columnProgress?.[task._id] ?? [];
            return (
              <FiveColumnTaskRow
                key={task._id}
                description={task.description}
                ataChapter={task.ataChapter}
                columnProgress={cols}
                techniciansMap={techMap}
                onColumnClick={(colNum) => handleColumnClick(task, colNum)}
              />
            );
          })
        ) : (
          <p className="text-sm text-muted-foreground py-2">
            No tasks in this section.
          </p>
        )}
        {subSections.map((sub) => renderSubSection(sub))}
      </SectionAccordion>
    );
  }

  function renderSubSection(section: Section) {
    const sectionTasks = tasksBySection.get(section._id) ?? [];
    const completion = sectionCompletion.get(section._id) ?? { completed: 0, total: 0 };
    const sectionType = section.sectionType ?? "standard";

    return (
      <SectionAccordion
        key={section._id}
        name={section.name}
        sectionType={sectionType}
        completedCount={completion.completed}
        totalCount={completion.total}
        isSubSection
        proficiencyTier={sectionTasks[0]?.proficiencyTier}
        defaultOpen={false}
      >
        {sectionTasks.length > 0 ? (
          sectionTasks.map((task) => {
            const cols = columnProgress?.[task._id] ?? [];
            return (
              <FiveColumnTaskRow
                key={task._id}
                description={task.description}
                ataChapter={task.ataChapter}
                columnProgress={cols}
                techniciansMap={techMap}
                onColumnClick={(colNum) => handleColumnClick(task, colNum)}
              />
            );
          })
        ) : (
          <p className="text-sm text-muted-foreground py-2">
            No tasks in this sub-section.
          </p>
        )}
      </SectionAccordion>
    );
  }

  // ---- Loading state ----
  if (!jacketId) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        Missing jacket ID.
      </div>
    );
  }

  if (jacket === undefined || !curriculum) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (jacket === null) {
    return (
      <div className="space-y-4 p-6">
        <Link
          to="/training/ojt/jackets"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Training Jackets
        </Link>
        <p className="text-sm text-muted-foreground">Jacket not found.</p>
      </div>
    );
  }

  const techName = techMap.get(jacket.technicianId) ?? "Technician";

  return (
    <div className="space-y-6 p-6">
      {/* Back link */}
      <div>
        <Link
          to="/training/ojt/jackets"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Training Jackets
        </Link>
      </div>

      {/* Header card */}
      <JacketHeaderCard
        technicianName={techName}
        curriculumName={curriculum.name}
        version={curriculum.version}
        status={jacket.status}
        startedAt={jacket.startedAt}
        lastActivity={lastActivity}
        totalTasks={totalTasks}
        completedTasks={totalCompletedTasks}
        authorizationsGranted={authGrantedCount}
        authorizationsTotal={authorizations.length}
      />

      {/* Main tabbed content */}
      <Tabs defaultValue="progress">
        <TabsList>
          <TabsTrigger value="progress">
            <BookOpen className="h-4 w-4 mr-1.5" />
            Progress
          </TabsTrigger>
          <TabsTrigger value="activity">Activity Log</TabsTrigger>
          <TabsTrigger value="scoring">Scoring</TabsTrigger>
        </TabsList>

        {/* === PROGRESS TAB === */}
        <TabsContent value="progress" className="space-y-4 mt-4">
          {/* Authorization capabilities (if any exist) */}
          {authorizations.length > 0 && (
            <AuthorizationSection
              authorizations={authorizations}
              techniciansMap={techMap}
              onGrant={handleGrantAuth}
              onRevoke={handleRevokeAuth}
            />
          )}

          {/* Sections */}
          {topLevelSections.length === 0 ? (
            <Card>
              <CardContent className="py-8">
                <p className="text-center text-muted-foreground">
                  No curriculum sections defined. Add sections in the curriculum editor.
                </p>
              </CardContent>
            </Card>
          ) : (
            topLevelSections.map((section) => renderSectionContent(section))
          )}
        </TabsContent>

        {/* === ACTIVITY LOG TAB === */}
        <TabsContent value="activity" className="mt-4">
          <JacketActivityLog
            events={stageEvents}
            tasks={tasks}
            sections={sections}
            techniciansMap={techMap}
          />
        </TabsContent>

        {/* === SCORING TAB === */}
        <TabsContent value="scoring" className="mt-4">
          <JacketScoringCard sections={scoringData} />
        </TabsContent>
      </Tabs>

      {/* Column sign-off dialog */}
      {signOffDialog && jacket && (
        <ColumnSignOffDialog
          open={!!signOffDialog}
          onOpenChange={(v) => {
            if (!v) setSignOffDialog(null);
          }}
          organizationId={jacket.organizationId}
          jacketId={jacket._id}
          technicianId={jacket.technicianId}
          task={signOffDialog.task}
          columnNumber={signOffDialog.columnNumber}
          completedColumns={signOffDialog.completedColumns}
          technicians={technicians}
        />
      )}
    </div>
  );
}
