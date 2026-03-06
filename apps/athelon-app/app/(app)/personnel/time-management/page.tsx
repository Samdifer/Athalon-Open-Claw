"use client";

import { useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import { Clock, Users } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { TeamOverviewTab } from "./_components/TeamOverviewTab";
import { TimeReportingTab } from "./_components/TimeReportingTab";
import { TimeCorrectionsTab } from "./_components/TimeCorrectionsTab";
import { TimeExportTab } from "./_components/TimeExportTab";

// ---------------------------------------------------------------------------
// Shared props interface exported for all tab components
// ---------------------------------------------------------------------------
export interface TimeManagementTabProps {
  orgId: Id<"organizations">;
  techId: Id<"technicians">;
  entries: Array<{
    _id: Id<"timeEntries">;
    technicianId: Id<"technicians">;
    entryType: string;
    workOrderId?: Id<"workOrders">;
    taskCardId?: Id<"taskCards">;
    taskStepId?: Id<"taskCardSteps">;
    shopActivityCode?: string;
    clockInAt: number;
    clockOutAt?: number;
    durationMinutes?: number;
    totalPausedMinutes?: number;
    pausedAt?: number;
    approvalStatus: string;
    billingClass?: string;
    notes?: string;
  }>;
  activeTimers: Array<{
    _id: Id<"timeEntries">;
    technicianId: Id<"technicians">;
    entryType: string;
    workOrderId?: Id<"workOrders">;
    shopActivityCode?: string;
    clockInAt: number;
    totalPausedMinutes?: number;
    pausedAt?: number;
  }>;
  technicians: Array<{
    _id: Id<"technicians">;
    legalName: string;
    rosterTeamId?: Id<"rosterTeams">;
    role?: string;
    status?: string;
  }>;
  techMap: Map<string, string>;
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------
export default function TimeManagementPage() {
  const { orgId, techId, tech, isLoaded } = useCurrentOrg();

  // ---- Convex queries (loaded once, passed as props) ----
  const rawActiveTimers = useQuery(
    api.timeClock.listActiveTimers,
    orgId ? { orgId } : "skip",
  );
  const rawEntries = useQuery(
    api.timeClock.listTimeEntries,
    orgId ? { orgId } : "skip",
  );
  const rawTechnicians = useQuery(
    api.technicians.list,
    orgId ? { organizationId: orgId } : "skip",
  );

  // ---- Team filtering ----
  const isLead = tech?.role === "lead_technician";
  const myTeamId = tech?.rosterTeamId;

  const teamTechs = useMemo(() => {
    if (!rawTechnicians) return [];
    if (isLead && myTeamId) {
      return rawTechnicians.filter(
        (t: { rosterTeamId?: Id<"rosterTeams"> }) => t.rosterTeamId === myTeamId,
      );
    }
    return rawTechnicians;
  }, [rawTechnicians, isLead, myTeamId]);

  const teamTechIds = useMemo(
    () => new Set(teamTechs.map((t: { _id: Id<"technicians"> }) => t._id as string)),
    [teamTechs],
  );

  const teamEntries = useMemo(
    () =>
      (rawEntries ?? []).filter((e: { technicianId: Id<"technicians"> }) =>
        teamTechIds.has(e.technicianId as string),
      ),
    [rawEntries, teamTechIds],
  );

  const teamActiveTimers = useMemo(
    () =>
      (rawActiveTimers ?? []).filter((e: { technicianId: Id<"technicians"> }) =>
        teamTechIds.has(e.technicianId as string),
      ),
    [rawActiveTimers, teamTechIds],
  );

  const techMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const t of teamTechs) {
      m.set(t._id as string, t.legalName);
    }
    return m;
  }, [teamTechs]);

  // ---- Loading / empty states ----
  if (!isLoaded) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-10 w-96" />
        <div className="grid grid-cols-3 gap-4">
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
      </div>
    );
  }

  if (!orgId || !techId) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-24 text-muted-foreground">
        <Users className="h-10 w-10 opacity-40" />
        <p className="text-sm">No organization context found.</p>
      </div>
    );
  }

  const dataLoading =
    rawActiveTimers === undefined ||
    rawEntries === undefined ||
    rawTechnicians === undefined;

  if (dataLoading) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-10 w-96" />
        <div className="grid grid-cols-3 gap-4">
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
      </div>
    );
  }

  const tabProps: TimeManagementTabProps = {
    orgId,
    techId,
    entries: teamEntries as TimeManagementTabProps["entries"],
    activeTimers: teamActiveTimers as TimeManagementTabProps["activeTimers"],
    technicians: teamTechs as TimeManagementTabProps["technicians"],
    techMap,
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
          <Clock className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Time Management</h1>
          <p className="text-xs text-muted-foreground">
            Monitor team hours, manage corrections, and export time data
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="h-8 bg-muted/40 p-0.5">
          <TabsTrigger value="overview" className="h-7 px-3 text-xs">
            Team Overview
          </TabsTrigger>
          <TabsTrigger value="reporting" className="h-7 px-3 text-xs">
            Reporting
          </TabsTrigger>
          <TabsTrigger value="corrections" className="h-7 px-3 text-xs">
            Corrections
          </TabsTrigger>
          <TabsTrigger value="export" className="h-7 px-3 text-xs">
            Export
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <TeamOverviewTab {...tabProps} />
        </TabsContent>
        <TabsContent value="reporting">
          <TimeReportingTab {...tabProps} />
        </TabsContent>
        <TabsContent value="corrections">
          <TimeCorrectionsTab {...tabProps} />
        </TabsContent>
        <TabsContent value="export">
          <TimeExportTab {...tabProps} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
