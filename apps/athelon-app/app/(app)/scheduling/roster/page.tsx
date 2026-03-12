"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { ActionableEmptyState } from "@/components/zero-state/ActionableEmptyState";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import { useSelectedLocation } from "@/components/LocationSwitcher";
import { usePagePrereqs } from "@/hooks/usePagePrereqs";
import type { Id } from "@/convex/_generated/dataModel";
import SchedulingRosterWorkspace from "../_components/roster/SchedulingRosterWorkspace";
import { SchedulingSubNav } from "../_components/SchedulingSubNav";

function RosterPageSkeleton() {
  return (
    <div className="space-y-4" data-testid="roster-workspace-loading-page">
      <div className="flex items-center gap-2 border-b border-border/30 pb-2">
        <Skeleton className="h-7 w-24" />
        <Skeleton className="h-7 w-16" />
        <Skeleton className="h-7 w-20" />
        <Skeleton className="h-7 w-32" />
      </div>
      <Skeleton className="h-10 w-80" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

export default function SchedulingRosterPage() {
  const { orgId, isLoaded } = useCurrentOrg();
  const { selectedLocationId } = useSelectedLocation(orgId);

  const selectedShopLocationFilter =
    selectedLocationId === "all"
      ? "all"
      : (selectedLocationId as Id<"shopLocations">);

  const prereq = usePagePrereqs({
    requiresOrg: true,
    isDataLoading: !isLoaded,
  });

  if (prereq.state === "loading_context" || prereq.state === "loading_data") {
    return <RosterPageSkeleton />;
  }

  if (prereq.state === "missing_context") {
    return (
      <ActionableEmptyState
        title="Roster workspace requires organization setup"
        missingInfo="Complete onboarding before opening roster and team planning."
        primaryActionLabel="Complete Setup"
        primaryActionType="link"
        primaryActionTarget="/onboarding"
      />
    );
  }

  if (!orgId) return null;

  return (
    <div className="space-y-4" data-testid="roster-workspace-page">
      <SchedulingSubNav />

      <SchedulingRosterWorkspace
        organizationId={orgId}
        shopLocationId={selectedShopLocationFilter}
      />
    </div>
  );
}
