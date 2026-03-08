"use client";

import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import type { Id } from "@/convex/_generated/dataModel";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { WorkItemHeader } from "../../_components/WorkItemHeader";
import { WriteUpTimeline } from "../../_components/WriteUpTimeline";
import {
  ActivityTimeline,
  type ActivityTimelineEvent,
} from "../../_components/ActivityTimeline";

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function DiscrepancyDetailSkeleton() {
  return (
    <div className="space-y-5" role="status" aria-label="Loading finding">
      <Skeleton className="h-7 w-24" />
      <div className="space-y-2">
        <Skeleton className="h-7 w-64" />
        <Skeleton className="h-5 w-48" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-lg" />
        ))}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function DiscrepancyDetailPage() {
  const params = useParams();
  const workOrderId = params.id as string;
  const discrepancyId = params.discrepancyId as string;

  const { orgId, techId, isLoaded: orgLoaded } = useCurrentOrg();

  const discrepancies = useQuery(
    api.discrepancies.listDiscrepancies,
    orgId ? { organizationId: orgId } : "skip",
  );

  const writeUpEntries = useQuery(
    api.workItemEntries.listEntriesForDiscrepancy,
    discrepancyId
      ? { discrepancyId: discrepancyId as Id<"discrepancies"> }
      : "skip",
  );
  const historyEvents = useQuery(
    api.discrepancies.getDiscrepancyHistory,
    orgId && discrepancyId
      ? {
          discrepancyId: discrepancyId as Id<"discrepancies">,
          organizationId: orgId,
        }
      : "skip",
  );

  const addEntryMutation = useMutation(api.workItemEntries.addEntry);
  const [writeUpSubmitting, setWriteUpSubmitting] = useState(false);

  const isLoading = !orgLoaded || discrepancies === undefined;

  if (isLoading) return <DiscrepancyDetailSkeleton />;

  const discrepancy = (discrepancies ?? []).find(
    (d) => d._id === discrepancyId,
  );

  if (!discrepancy) {
    return (
      <div className="text-center py-20">
        <p className="text-sm text-muted-foreground">Finding not found</p>
        <Button asChild variant="ghost" size="sm" className="mt-4">
          <Link to={`/work-orders/${workOrderId}`}>← Back to Work Order</Link>
        </Button>
      </div>
    );
  }

  const isDispositioned = discrepancy.status === "dispositioned";

  async function handleAddEntry(
    entryType: "discrepancy_writeup" | "corrective_action",
    text: string,
  ) {
    if (!orgId || !techId) return;
    setWriteUpSubmitting(true);
    try {
      await addEntryMutation({
        organizationId: orgId,
        workOrderId: workOrderId as Id<"workOrders">,
        discrepancyId: discrepancyId as Id<"discrepancies">,
        entryType,
        text,
        technicianId: techId,
      });
      toast.success(
        entryType === "discrepancy_writeup"
          ? "Finding write-up added"
          : "Corrective action added",
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add entry");
    } finally {
      setWriteUpSubmitting(false);
    }
  }

  const discrepancyEntries = (writeUpEntries ?? [])
    .filter((e) => e.entryType === "discrepancy_writeup")
    .map((e) => ({
      _id: e._id,
      text: e.text,
      technicianName: e.technicianName,
      certificateNumber: e.certificateNumber,
      createdAt: e.createdAt,
      entryType: e.entryType as "discrepancy_writeup",
    }));

  const correctiveActionEntries = (writeUpEntries ?? [])
    .filter((e) => e.entryType === "corrective_action")
    .map((e) => ({
      _id: e._id,
      text: e.text,
      technicianName: e.technicianName,
      certificateNumber: e.certificateNumber,
      createdAt: e.createdAt,
      entryType: e.entryType as "corrective_action",
    }));

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Back */}
      <Button
        asChild
        variant="ghost"
        size="sm"
        className="h-7 -ml-2 text-xs text-muted-foreground"
      >
        <Link to={`/work-orders/${workOrderId}`}>
          <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
          Back to Work Order
        </Link>
      </Button>

      {/* Header — OP-1003 fields */}
      <Card className="border-border/60">
        <CardContent className="p-4">
          <WorkItemHeader
            kind="discrepancy"
            discrepancyNumber={discrepancy.discrepancyNumber}
            description={discrepancy.description}
            status={discrepancy.status}
            discrepancyType={discrepancy.discrepancyType}
            systemType={discrepancy.systemType}
            aircraftSystem={discrepancy.aircraftSystem}
            discoveredWhen={discrepancy.discoveredWhen}
            riiRequired={discrepancy.riiRequired}
            stcRelated={discrepancy.stcRelated}
            stcNumber={discrepancy.stcNumber}
            customerApprovalStatus={discrepancy.customerApprovalStatus}
            addedToQuote={discrepancy.addedToQuote}
            addedToQuoteInitials={discrepancy.addedToQuoteInitials}
            mhEstimate={discrepancy.mhEstimate}
            mhActual={discrepancy.mhActual}
            severity={discrepancy.severity}
            priority={discrepancy.priority}
            disposition={discrepancy.disposition}
          />
        </CardContent>
      </Card>

      {/* Discrepancy Write-Up & Corrective Action (stacked vertical) */}
      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Write-Up
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-4">
          <WriteUpTimeline
            entries={discrepancyEntries}
            entryType="discrepancy_writeup"
            onAddEntry={(text) => handleAddEntry("discrepancy_writeup", text)}
            readOnly={isDispositioned}
            isSubmitting={writeUpSubmitting}
          />

          <Separator className="opacity-30" />

          <WriteUpTimeline
            entries={correctiveActionEntries}
            entryType="corrective_action"
            onAddEntry={(text) => handleAddEntry("corrective_action", text)}
            readOnly={isDispositioned}
            isSubmitting={writeUpSubmitting}
          />
        </CardContent>
      </Card>

      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Finding History
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <ActivityTimeline
            events={(historyEvents ?? []) as ActivityTimelineEvent[]}
            testId="finding-history-timeline"
          />
        </CardContent>
      </Card>

      {/* Disposition info (if dispositioned) */}
      {isDispositioned && discrepancy.disposition && (
        <Card className="border-green-500/30 bg-green-500/5">
          <CardContent className="p-4">
            <p className="text-sm font-medium text-foreground flex items-center gap-2">
              Disposition: {discrepancy.disposition.replace(/_/g, " ")}
            </p>
            {discrepancy.correctiveAction && (
              <p className="text-xs text-muted-foreground mt-1">
                {discrepancy.correctiveAction}
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
