"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, usePaginatedQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import type { Id } from "@/convex/_generated/dataModel";
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ClipboardList,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";

// ─── IA Steps Table ───────────────────────────────────────────────────────────

type IAStep = {
  _id: string;
  taskCardId: Id<"taskCards">;
  stepNumber: number;
  description: string;
  status: string;
  taskCardTitle: string;
  taskCardNumber: string;
  workOrderNumber: string;
  aircraftRegistration: string;
};

function groupByWorkOrder(steps: IAStep[]): Record<string, IAStep[]> {
  return steps.reduce(
    (acc, step) => {
      const key = step.workOrderNumber;
      if (!acc[key]) acc[key] = [];
      acc[key].push(step);
      return acc;
    },
    {} as Record<string, IAStep[]>,
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "complete")
    return (
      <Badge className="bg-green-500/10 text-green-400 border-green-500/30 text-[10px]">
        Complete
      </Badge>
    );
  if (status === "in_progress")
    return (
      <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/30 text-[10px]">
        In Progress
      </Badge>
    );
  return (
    <Badge
      variant="outline"
      className="text-[10px] text-muted-foreground border-border/40"
    >
      {status}
    </Badge>
  );
}

// ─── Close Readiness Panel ────────────────────────────────────────────────────

function CloseReadinessPanel({
  orgId,
  workOrders,
}: {
  orgId: Id<"organizations">;
  workOrders: Array<{ _id: Id<"workOrders">; workOrderNumber: string }>;
}) {
  const [selectedWoId, setSelectedWoId] =
    useState<Id<"workOrders"> | null>(null);

  const readiness = useQuery(
    api.maintenanceRecords.getWorkOrderCloseReadinessV2,
    selectedWoId
      ? { workOrderId: selectedWoId, organizationId: orgId }
      : "skip",
  );

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <ClipboardList className="w-4 h-4 text-muted-foreground" />
          Work Order Close Readiness
        </CardTitle>
        <CardDescription className="text-xs">
          Select a work order to view its close readiness checklist.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* WO Selector */}
        <Select
          value={selectedWoId ?? ""}
          onValueChange={(v) => setSelectedWoId(v as Id<"workOrders">)}
        >
          <SelectTrigger className="h-9 text-sm border-border/60">
            <SelectValue placeholder="Select work order…" />
          </SelectTrigger>
          <SelectContent>
            {workOrders.map((wo) => (
              <SelectItem key={wo._id} value={wo._id}>
                <span className="font-mono text-xs">{wo.workOrderNumber}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Readiness result */}
        {selectedWoId && readiness === undefined && (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        )}

        {selectedWoId && readiness === null && (
          <p className="text-sm text-muted-foreground text-center py-4">
            Work order not found.
          </p>
        )}

        {readiness && (
          <div className="space-y-3">
            {/* Can-Close indicator */}
            <div
              className={`flex items-center gap-2 p-3 rounded-md border ${
                readiness.canClose
                  ? "bg-green-500/5 border-green-500/30"
                  : "bg-red-500/5 border-red-500/30"
              }`}
            >
              {readiness.canClose ? (
                <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
              ) : (
                <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
              )}
              <span className="text-sm font-medium">
                {readiness.canClose
                  ? "Ready to close"
                  : `Not ready — ${readiness.blockers?.length ?? 0} blocker(s)`}
              </span>
              {readiness.canClose && (
                <Button asChild size="sm" className="ml-auto h-7 text-xs">
                  <Link href={`/work-orders/${selectedWoId}/signature`}>
                    Sign Off &amp; Close
                  </Link>
                </Button>
              )}
            </div>

            {/* Blockers */}
            {(readiness.blockers?.length ?? 0) > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-red-400 uppercase tracking-wide">
                  Blockers
                </p>
                {readiness.blockers!.map((b: string, i: number) => (
                  <div
                    key={i}
                    className="flex items-start gap-2 text-[11px] text-muted-foreground"
                  >
                    <XCircle className="w-3 h-3 text-red-400 flex-shrink-0 mt-0.5" />
                    {b}
                  </div>
                ))}
              </div>
            )}

            {/* Advisories */}
            {(readiness.advisories?.length ?? 0) > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-amber-400 uppercase tracking-wide">
                  Advisories
                </p>
                {readiness.advisories!.map((a: string, i: number) => (
                  <div
                    key={i}
                    className="flex items-start gap-2 text-[11px] text-muted-foreground"
                  >
                    <AlertTriangle className="w-3 h-3 text-amber-400 flex-shrink-0 mt-0.5" />
                    {a}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function QcmReviewPage() {
  const { orgId, isLoaded } = useCurrentOrg();

  const iaSteps = useQuery(
    api.gapFixes.listStepsRequiringIAReview,
    orgId ? { organizationId: orgId } : "skip",
  );

  const { results: workOrders } = usePaginatedQuery(
    api.workOrders.listWorkOrders,
    orgId ? { organizationId: orgId } : "skip",
    { initialNumItems: 200 },
  );

  const isLoading = !isLoaded || iaSteps === undefined;

  const grouped = iaSteps ? groupByWorkOrder(iaSteps as IAStep[]) : {};
  const woEntries = Object.entries(grouped);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-muted-foreground" />
            QCM Review Dashboard
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            IA sign-off queue and work order close readiness
          </p>
        </div>
      </div>

      {/* ── IA Sign-Off Queue ─────────────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-foreground">
            IA Sign-Off Queue
          </h2>
          {!isLoading && (
            <Badge
              variant="secondary"
              className={`text-[10px] ${
                (iaSteps?.length ?? 0) > 0
                  ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                  : "bg-muted"
              }`}
            >
              {iaSteps?.length ?? 0}
            </Badge>
          )}
        </div>

        {isLoading && (
          <Card className="border-border/60">
            <CardContent className="p-6 space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </CardContent>
          </Card>
        )}

        {!isLoading && (iaSteps?.length ?? 0) === 0 && (
          <Card className="border-border/60">
            <CardContent className="py-12 text-center">
              <CheckCircle2 className="w-8 h-8 text-green-400/50 mx-auto mb-3" />
              <p className="text-sm font-medium text-muted-foreground">
                No steps pending IA review
              </p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                All IA-required steps have been signed off.
              </p>
            </CardContent>
          </Card>
        )}

        {!isLoading && woEntries.length > 0 && (
          <div className="space-y-4">
            {woEntries.map(([woNumber, steps]) => (
              <Card key={woNumber} className="border-border/60">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                    <span className="font-mono text-sm text-foreground">
                      {woNumber}
                    </span>
                    <span className="text-muted-foreground">—</span>
                    <span>{steps[0].aircraftRegistration}</span>
                    <Badge
                      variant="secondary"
                      className="ml-auto text-[10px] bg-muted"
                    >
                      {steps.length} step{steps.length > 1 ? "s" : ""}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="rounded-md border border-border/40 overflow-hidden">
                    {/* Table header */}
                    <div className="grid grid-cols-[80px_120px_1fr_60px_1fr_100px_100px] gap-2 px-3 py-2 bg-muted/30 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                      <span>WO #</span>
                      <span>Aircraft</span>
                      <span>Task Card</span>
                      <span>Step</span>
                      <span>Description</span>
                      <span>Status</span>
                      <span></span>
                    </div>

                    {steps.map((step, i) => (
                      <div key={step._id}>
                        {i > 0 && <Separator className="opacity-30" />}
                        <div className="grid grid-cols-[80px_120px_1fr_60px_1fr_100px_100px] gap-2 px-3 py-2.5 items-center hover:bg-muted/20 transition-colors">
                          <span className="font-mono text-xs text-muted-foreground truncate">
                            {step.workOrderNumber}
                          </span>
                          <span className="text-xs font-mono font-medium truncate">
                            {step.aircraftRegistration}
                          </span>
                          <span className="text-xs truncate">
                            {step.taskCardNumber} — {step.taskCardTitle}
                          </span>
                          <span className="text-xs text-center font-mono">
                            {step.stepNumber}
                          </span>
                          <span className="text-xs text-muted-foreground truncate">
                            {step.description}
                          </span>
                          <StatusBadge status={step.status} />
                          <div className="flex justify-end">
                            <Button
                              asChild
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs gap-1 border-primary/40 text-primary hover:bg-primary/5"
                            >
                              <Link
                                href={`/work-orders/${step.taskCardId}/tasks/${step.taskCardId}`}
                              >
                                IA Sign Off
                                <ChevronRight className="w-3 h-3" />
                              </Link>
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* ── Work Order Close Readiness ─────────────────────────────────────── */}
      {orgId && (
        <CloseReadinessPanel
          orgId={orgId}
          workOrders={(workOrders ?? []).map((wo) => ({
            _id: wo._id,
            workOrderNumber: wo.workOrderNumber,
          }))}
        />
      )}
    </div>
  );
}
