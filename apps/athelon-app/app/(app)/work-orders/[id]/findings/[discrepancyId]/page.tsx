"use client";

import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import { useRbac } from "@/hooks/useRbac";
import type { Id } from "@/convex/_generated/dataModel";
import { toast } from "sonner";
import { ArrowLeft, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { WorkItemHeader } from "../../_components/WorkItemHeader";
import { WriteUpTimeline } from "../../_components/WriteUpTimeline";
import {
  ActivityTimeline,
  type ActivityTimelineEvent,
} from "../../_components/ActivityTimeline";
import { WOBreadcrumb } from "../../_components/WOBreadcrumb";

type DispositionValue = "deferred" | "corrected" | "rejected" | "accepted";

const DISPOSITION_OPTIONS: { value: DispositionValue; label: string }[] = [
  { value: "corrected", label: "Corrected" },
  { value: "accepted", label: "Accepted" },
  { value: "deferred", label: "Deferred" },
  { value: "rejected", label: "Rejected" },
];

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

export default function DiscrepancyDetailPage() {
  const params = useParams();
  const workOrderId = params.id as string;
  const discrepancyId = params.discrepancyId as string;

  const { orgId, techId, isLoaded: orgLoaded } = useCurrentOrg();
  const { role } = useRbac();

  const workOrderData = useQuery(
    api.workOrders.getWorkOrder,
    orgId && workOrderId
      ? { workOrderId: workOrderId as Id<"workOrders">, organizationId: orgId }
      : "skip",
  );
  const woNumber = workOrderData?.workOrder?.workOrderNumber ?? workOrderId;

  const discrepancy = useQuery(
    api.discrepancies.getDiscrepancy,
    discrepancyId
      ? { discrepancyId: discrepancyId as Id<"discrepancies"> }
      : "skip",
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
  const dispositionFindingMutation = useMutation(api.discrepancies.dispositionFinding);

  const [writeUpSubmitting, setWriteUpSubmitting] = useState(false);
  const [dispositionValue, setDispositionValue] = useState<DispositionValue | "">("");
  const [dispositionNotes, setDispositionNotes] = useState("");
  const [dispositionSubmitting, setDispositionSubmitting] = useState(false);

  const isLoading = !orgLoaded || discrepancy === undefined;

  if (isLoading) return <DiscrepancyDetailSkeleton />;

  if (discrepancy === null) {
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

  const canDisposition =
    role === "qcm_inspector" || role === "shop_manager" || role === "admin";

  const isTechnician =
    role === "technician" || role === "lead_technician";

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

  async function handleDispositionSubmit() {
    if (!orgId || !dispositionValue) return;
    setDispositionSubmitting(true);
    try {
      await dispositionFindingMutation({
        discrepancyId: discrepancyId as Id<"discrepancies">,
        disposition: dispositionValue,
        notes: dispositionNotes.trim() || undefined,
        dispositionedBy: role,
        organizationId: orgId,
      });
      toast.success(
        `Finding dispositioned as "${dispositionValue}".`,
      );
      setDispositionValue("");
      setDispositionNotes("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Disposition failed");
    } finally {
      setDispositionSubmitting(false);
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
      <WOBreadcrumb
        woId={workOrderId}
        woNumber={woNumber}
        pageName={`Finding ${discrepancy.discrepancyNumber}`}
      />

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

      {/* QCM action required notice for technicians */}
      {!isDispositioned && isTechnician && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="p-4 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
            <p className="text-sm text-amber-700 dark:text-amber-300">
              QCM Inspector action required
            </p>
            <Badge
              variant="outline"
              className="ml-auto border-amber-500/40 text-amber-700 dark:text-amber-300 text-xs"
            >
              Pending Disposition
            </Badge>
          </CardContent>
        </Card>
      )}

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

      {/* Dispositioning controls — QCM Inspector, Shop Manager, Admin only */}
      {!isDispositioned && canDisposition && (
        <Card className="border-border/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Disposition Finding
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-4">
            <div className="space-y-1.5">
              <Label>Disposition</Label>
              <Select
                value={dispositionValue}
                onValueChange={(v) => setDispositionValue(v as DispositionValue)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select disposition…" />
                </SelectTrigger>
                <SelectContent>
                  {DISPOSITION_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Notes (optional)</Label>
              <Textarea
                value={dispositionNotes}
                onChange={(e) => setDispositionNotes(e.target.value)}
                placeholder="Additional notes or justification…"
                rows={3}
              />
            </div>
            <Button
              onClick={handleDispositionSubmit}
              disabled={!dispositionValue || dispositionSubmitting}
              size="sm"
            >
              Submit Disposition
            </Button>
          </CardContent>
        </Card>
      )}

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
            {discrepancy.dispositionNotes && (
              <p className="text-xs text-muted-foreground mt-1">
                {discrepancy.dispositionNotes}
              </p>
            )}
            {discrepancy.dispositionedBy && (
              <p className="text-xs text-muted-foreground/60 mt-1">
                By: {discrepancy.dispositionedBy}
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
