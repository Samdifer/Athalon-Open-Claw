"use client";

import { useEffect, useRef } from "react";
import { useMutation } from "convex/react";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import { usePagePrereqs } from "@/hooks/usePagePrereqs";
import { Settings } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ActionableEmptyState } from "@/components/zero-state/ActionableEmptyState";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import FacilitiesAndBaysTab from "./_components/FacilitiesAndBaysTab";
import SupportedAircraftTab from "./_components/SupportedAircraftTab";
import WorkStagesTab from "./_components/WorkStagesTab";
import SchedulingPreferencesTab from "./_components/SchedulingPreferencesTab";

export default function StationConfigPage() {
  const { orgId, isLoaded } = useCurrentOrg();
  const bootstrapStationConfig = useMutation(api.stationConfig.bootstrapStationConfig);
  const hasBootstrappedRef = useRef(false);
  const prereq = usePagePrereqs({
    requiresOrg: true,
    isDataLoading: !isLoaded,
  });

  useEffect(() => {
    if (!orgId || hasBootstrappedRef.current) return;
    hasBootstrappedRef.current = true;
    void bootstrapStationConfig({
      organizationId: orgId as Id<"organizations">,
    }).catch(() => {
      hasBootstrappedRef.current = false;
    });
  }, [bootstrapStationConfig, orgId]);

  if (prereq.state === "loading_context" || prereq.state === "loading_data") {
    return (
      <div className="space-y-5" data-testid="page-loading-state">
        <Skeleton className="h-7 w-56" />
        <Skeleton className="h-10 w-full max-w-xl" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (prereq.state === "missing_context") {
    return (
      <ActionableEmptyState
        title="Station configuration requires organization setup"
        missingInfo="Complete onboarding before configuring your repair station."
        primaryActionLabel="Complete Setup"
        primaryActionType="link"
        primaryActionTarget="/onboarding"
      />
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg sm:text-xl md:text-2xl font-semibold text-foreground flex items-center gap-2">
          <Settings className="w-5 h-5 text-muted-foreground" />
          Station Configuration
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Facilities, aircraft types, workflow stages, and scheduling preferences
        </p>
      </div>

      <Tabs defaultValue="facilities">
        <TabsList className="h-9 bg-muted/40 p-0.5 mb-4">
          <TabsTrigger value="facilities" className="text-xs sm:text-sm">
            Facilities & Bays
          </TabsTrigger>
          <TabsTrigger value="aircraft" className="text-xs sm:text-sm">
            Supported Aircraft
          </TabsTrigger>
          <TabsTrigger value="stages" className="text-xs sm:text-sm">
            Work Stages
          </TabsTrigger>
          <TabsTrigger value="scheduling" className="text-xs sm:text-sm">
            Scheduling
          </TabsTrigger>
        </TabsList>

        <TabsContent value="facilities">
          <FacilitiesAndBaysTab />
        </TabsContent>
        <TabsContent value="aircraft">
          <SupportedAircraftTab />
        </TabsContent>
        <TabsContent value="stages">
          <WorkStagesTab />
        </TabsContent>
        <TabsContent value="scheduling">
          <SchedulingPreferencesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
