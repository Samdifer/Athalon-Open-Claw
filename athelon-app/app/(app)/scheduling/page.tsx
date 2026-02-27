"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import { GanttBoard } from "./_components/GanttBoard";
import { BacklogSidebar } from "./_components/BacklogSidebar";
import { Skeleton } from "@/components/ui/skeleton";

// ─────────────────────────────────────────────────────────────────────────────
// LOADING SKELETON
// ─────────────────────────────────────────────────────────────────────────────

function GanttSkeleton() {
  return (
    <div className="flex flex-col h-full">
      {/* Toolbar skeleton */}
      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border/50">
        <Skeleton className="h-7 w-40 rounded-md" />
        <Skeleton className="h-4 w-px" />
        <Skeleton className="h-4 w-44" />
        <div className="flex-1" />
        <Skeleton className="h-7 w-24" />
        <Skeleton className="h-7 w-7" />
        <Skeleton className="h-7 w-7" />
        <Skeleton className="h-7 w-16" />
      </div>
      {/* Row skeletons */}
      <div className="flex flex-1 overflow-hidden">
        <div className="w-40 flex-shrink-0 border-r border-border/40 space-y-0">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="flex flex-col justify-center px-3 border-b border-border/30"
              style={{ height: 48 }}
            >
              <Skeleton className="h-3 w-20 mb-1" />
              <Skeleton className="h-2.5 w-28" />
            </div>
          ))}
        </div>
        <div className="flex-1 overflow-hidden space-y-0">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="relative border-b border-border/30 px-3 flex items-center"
              style={{ height: 48 }}
            >
              <Skeleton
                className="h-7 rounded"
                style={{
                  width: `${Math.floor(Math.random() * 200) + 80}px`,
                  marginLeft: `${i * 30}px`,
                }}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGE COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export default function SchedulingPage() {
  const { orgId, isLoaded } = useCurrentOrg();
  const [backlogOpen, setBacklogOpen] = useState(false);

  const data = useQuery(
    api.workOrders.getWorkOrdersWithScheduleRisk,
    orgId ? { organizationId: orgId } : "skip",
  );

  const workOrders = data ?? [];
  const unscheduledCount = workOrders.filter(
    (wo) => !wo.promisedDeliveryDate || !wo.scheduledStartDate,
  ).length;

  // Show skeleton while auth/org context is loading or query is in-flight
  if (!isLoaded || data === undefined) {
    return (
      <div className="h-full flex flex-col">
        <GanttSkeleton />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col relative">
      <GanttBoard
        workOrders={workOrders}
        onOpenBacklog={() => setBacklogOpen(true)}
        unscheduledCount={unscheduledCount}
      />
      <BacklogSidebar
        workOrders={workOrders}
        isOpen={backlogOpen}
        onClose={() => setBacklogOpen(false)}
      />
    </div>
  );
}
