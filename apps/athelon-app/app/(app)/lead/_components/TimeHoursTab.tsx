"use client";

import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { TeamOverviewTab } from "@/app/(app)/personnel/time-management/_components/TeamOverviewTab";
import { TimeCorrectionsTab } from "@/app/(app)/personnel/time-management/_components/TimeCorrectionsTab";
import type { TimeManagementTabProps } from "@/app/(app)/personnel/time-management/page";

// ---------------------------------------------------------------------------
// TimeHoursTab — Tab 4 of Lead Center
//
// Embeds the Team Overview and Corrections sub-tabs from time management.
// Reuses the same data-fetching and team-filtering pattern from
// personnel/time-management/page.tsx.
// ---------------------------------------------------------------------------

interface TimeHoursTabProps {
  orgId: Id<"organizations">;
}

export function TimeHoursTab({ orgId }: TimeHoursTabProps) {
  const { techId, tech } = useCurrentOrg();

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

  // Team filtering (same logic as time-management/page.tsx)
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

  if (
    !techId ||
    rawActiveTimers === undefined ||
    rawEntries === undefined ||
    rawTechnicians === undefined
  ) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {isLead ? "Showing your team's time data" : "Showing all technician time data"}
        </p>
        <Button asChild variant="outline" size="sm" className="h-7 text-xs gap-1.5">
          <Link to="/personnel/time-management">
            Full Time Management
            <ExternalLink className="w-3 h-3" />
          </Link>
        </Button>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="h-8 bg-muted/40 p-0.5">
          <TabsTrigger value="overview" className="h-7 px-3 text-xs">
            Team Overview
          </TabsTrigger>
          <TabsTrigger value="corrections" className="h-7 px-3 text-xs">
            Corrections
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <TeamOverviewTab {...tabProps} />
        </TabsContent>
        <TabsContent value="corrections">
          <TimeCorrectionsTab {...tabProps} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
