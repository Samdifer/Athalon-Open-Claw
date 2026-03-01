"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import type { Id } from "@/convex/_generated/dataModel";
import { GanttBoard } from "./_components/GanttBoard";
import { BacklogSidebar } from "./_components/BacklogSidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Sparkles, Warehouse } from "lucide-react";
import { toast } from "sonner";
import { autoSchedule } from "@/lib/scheduling/autoSchedule";
import { detectConflicts } from "@/lib/scheduling/conflicts";
import type { ScheduledWO } from "@/lib/scheduling/conflicts";
import { usePagePrereqs } from "@/hooks/usePagePrereqs";
import { ActionableEmptyState } from "@/components/zero-state/ActionableEmptyState";

// ─────────────────────────────────────────────────────────────────────────────
// LOADING SKELETON
// ─────────────────────────────────────────────────────────────────────────────

function GanttSkeleton() {
  return (
    <div className="flex flex-col h-full">
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
  const [autoScheduling, setAutoScheduling] = useState(false);

  const data = useQuery(
    api.workOrders.getWorkOrdersWithScheduleRisk,
    orgId ? { organizationId: orgId } : "skip",
  );

  const bays = useQuery(
    api.hangarBays.listBays,
    orgId ? { organizationId: orgId } : "skip",
  );

  const updateSchedule = useMutation(api.scheduling.updateWOSchedule);
  const prereq = usePagePrereqs({
    requiresOrg: true,
    isDataLoading: !isLoaded || data === undefined || bays === undefined,
  });

  const workOrders = data ?? [];
  const unscheduledCount = workOrders.filter(
    (wo) => !wo.promisedDeliveryDate || !wo.scheduledStartDate,
  ).length;

  // ── Conflict detection ────────────────────────────────────────────────
  const conflicts = useMemo(() => {
    const scheduled: ScheduledWO[] = workOrders
      .filter((wo) => wo.scheduledStartDate && wo.promisedDeliveryDate)
      .map((wo) => ({
        woId: wo._id,
        workOrderNumber: wo.workOrderNumber,
        startDate: wo.scheduledStartDate!,
        endDate: wo.promisedDeliveryDate!,
        promisedDeliveryDate: wo.promisedDeliveryDate,
      }));
    return detectConflicts(scheduled);
  }, [workOrders]);

  // ── Auto-schedule handler ─────────────────────────────────────────────
  async function handleAutoSchedule() {
    if (!orgId) return;

    const unscheduled = workOrders.filter(
      (wo) => !wo.scheduledStartDate || !wo.promisedDeliveryDate,
    );

    if (unscheduled.length === 0) {
      toast.info("All work orders are already scheduled");
      return;
    }

    const bayList: { bayId: string; name: string; bookings: { startDate: number; endDate: number }[] }[] = (bays ?? []).map((b) => ({
      bayId: b._id,
      name: b.name,
      bookings: workOrders
        .filter((wo) => wo.scheduledStartDate && wo.promisedDeliveryDate)
        .map((wo) => ({
          startDate: wo.scheduledStartDate!,
          endDate: wo.promisedDeliveryDate!,
        })),
    }));

    // If no bays, create a virtual bay
    if (bayList.length === 0) {
      bayList.push({
        bayId: "virtual",
        name: "Default",
        bookings: workOrders
          .filter((wo) => wo.scheduledStartDate && wo.promisedDeliveryDate)
          .map((wo) => ({
            startDate: wo.scheduledStartDate!,
            endDate: wo.promisedDeliveryDate!,
          })),
      });
    }

    const assignments = autoSchedule(
      unscheduled.map((wo) => ({
        woId: wo._id,
        priority: wo.priority,
        promisedDeliveryDate: wo.promisedDeliveryDate,
        estimatedDurationDays: Math.max(1, Math.ceil(wo.effectiveEstimatedHours / 8)),
      })),
      bayList,
    );

    if (assignments.length === 0) {
      toast.warning("Could not find slots for any work orders");
      return;
    }

    setAutoScheduling(true);
    try {
      let successCount = 0;
      for (const a of assignments) {
        try {
          await updateSchedule({
            woId: a.woId as Id<"workOrders">,
            startDate: a.startDate,
            endDate: a.endDate,
          });
          successCount++;
        } catch {
          // Continue with remaining
        }
      }
      toast.success(`Auto-scheduled ${successCount} work order${successCount !== 1 ? "s" : ""}`);
    } finally {
      setAutoScheduling(false);
    }
  }

  if (prereq.state === "loading_context" || prereq.state === "loading_data") {
    return (
      <div className="h-full flex flex-col" data-testid="page-loading-state">
        <GanttSkeleton />
      </div>
    );
  }

  if (prereq.state === "missing_context") {
    return (
      <ActionableEmptyState
        title="Scheduling requires organization setup"
        missingInfo="Complete onboarding before creating or scheduling work orders."
        primaryActionLabel="Complete Setup"
        primaryActionType="link"
        primaryActionTarget="/onboarding"
      />
    );
  }

  if (!orgId || !data || !bays) return null;

  if (workOrders.length === 0) {
    return (
      <ActionableEmptyState
        title="No work orders to schedule yet"
        missingInfo="Create your first work order to populate the Gantt board and assign bay time."
        primaryActionLabel="Create Work Order"
        primaryActionType="link"
        primaryActionTarget="/work-orders/new"
        secondaryActionLabel="Manage Bays"
        secondaryActionTarget="/scheduling/bays"
      />
    );
  }

  return (
    <div className="h-full flex flex-col relative">
      {/* Sub-nav toolbar */}
      <div className="flex items-center gap-2 px-2 sm:px-4 py-2 border-b border-border/30 bg-muted/20 flex-shrink-0">
        <Button variant="ghost" size="sm" className="text-xs h-7" asChild>
          <Link to="/scheduling">Gantt Board</Link>
        </Button>
        <Button variant="ghost" size="sm" className="text-xs h-7" asChild>
          <Link to="/scheduling/bays">
            <Warehouse className="w-3.5 h-3.5" />
            Bays
          </Link>
        </Button>
        <Button variant="ghost" size="sm" className="text-xs h-7" asChild>
          <Link to="/scheduling/capacity">Capacity</Link>
        </Button>

        <div className="flex-1" />

        <Button
          variant="outline"
          size="sm"
          className="text-xs h-7"
          onClick={handleAutoSchedule}
          disabled={autoScheduling}
        >
          <Sparkles className="w-3.5 h-3.5" />
          {autoScheduling ? "Scheduling..." : "Auto Schedule"}
        </Button>
      </div>

      <div className="flex-1 min-h-0">
        <GanttBoard
          workOrders={workOrders}
          onOpenBacklog={() => setBacklogOpen(true)}
          unscheduledCount={unscheduledCount}
          bays={bays as { _id: string; name: string; type: string; status: string }[] | undefined}
          conflicts={conflicts}
        />
      </div>

      <BacklogSidebar
        workOrders={workOrders}
        isOpen={backlogOpen}
        onClose={() => setBacklogOpen(false)}
      />
    </div>
  );
}
