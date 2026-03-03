"use client";

import { Link } from "react-router-dom";
import { Users, Gauge } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ActionableEmptyState } from "@/components/zero-state/ActionableEmptyState";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import { useSelectedLocation } from "@/components/LocationSwitcher";
import { usePagePrereqs } from "@/hooks/usePagePrereqs";
import type { Id } from "@/convex/_generated/dataModel";
import SchedulingRosterWorkspace from "../_components/roster/SchedulingRosterWorkspace";

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
      <div className="flex items-center gap-1 flex-wrap border-b border-border/30 pb-2 -mb-1">
        <Button variant="ghost" size="sm" className="text-xs h-7" asChild>
          <Link to="/scheduling">Gantt Board</Link>
        </Button>
        <Button variant="ghost" size="sm" className="text-xs h-7" asChild>
          <Link to="/scheduling/bays">Bays</Link>
        </Button>
        <Button variant="ghost" size="sm" className="text-xs h-7" asChild>
          <Link to="/scheduling/capacity">Capacity</Link>
        </Button>
        <Button variant="secondary" size="sm" className="text-xs h-7" asChild>
          <Link to="/scheduling/roster">Roster & Teams</Link>
        </Button>
        <Button variant="ghost" size="sm" className="text-xs h-7" asChild>
          <Link to="/scheduling/financial-planning">Financial Planning</Link>
        </Button>
        <Button variant="ghost" size="sm" className="text-xs h-7" asChild>
          <Link to="/scheduling/quotes">Quote Workspace</Link>
        </Button>
      </div>

      <Card className="border-slate-700/70 bg-gradient-to-br from-slate-950 to-slate-900 shadow-[0_0_0_1px_rgba(15,23,42,0.4)]">
        <CardContent className="p-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold text-slate-100 flex items-center gap-2">
              <Users className="w-5 h-5 text-cyan-400" />
              Roster & Teams Command Deck
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Shift-grouped workforce operations with supervisory coverage and holiday-aware planning.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 rounded border border-cyan-700/40 bg-cyan-500/10 px-2.5 py-1 text-xs text-cyan-200">
            <Gauge className="w-3.5 h-3.5" />
            Industrial workspace mode
          </div>
        </CardContent>
      </Card>

      <SchedulingRosterWorkspace
        organizationId={orgId}
        shopLocationId={selectedShopLocationFilter}
      />
    </div>
  );
}
