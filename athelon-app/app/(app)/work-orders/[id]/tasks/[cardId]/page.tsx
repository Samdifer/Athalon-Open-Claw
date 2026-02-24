"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import type { Id } from "@/convex/_generated/dataModel";
import {
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  Wrench,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { SignStepDialog } from "./_components/SignStepDialog";
import { SignCardDialog } from "./_components/SignCardDialog";
import { TaskStepRow } from "./_components/TaskStepRow";
import {
  type TaskStatus,
  TASK_STATUS_LABEL,
  TASK_STATUS_STYLES,
} from "@/lib/mro-constants";

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function TaskCardSkeleton() {
  return (
    <div className="space-y-5">
      <Skeleton className="h-7 w-24" />
      <div className="space-y-2">
        <Skeleton className="h-7 w-64" />
        <Skeleton className="h-5 w-48" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-lg" />
        ))}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function TaskCardPage() {
  const params = useParams();
  const workOrderId = params.id as string;
  const cardId = params.cardId as string;

  const { orgId, techId, isLoaded: orgLoaded } = useCurrentOrg();

  const [signStepTarget, setSignStepTarget] = useState<{
    stepId: Id<"taskCardSteps">;
    stepNumber: number;
    description: string;
    requiresIa: boolean;
  } | null>(null);
  const [signCardOpen, setSignCardOpen] = useState(false);

  const taskCards = useQuery(
    api.taskCards.listTaskCardsForWorkOrder,
    orgId && workOrderId
      ? {
          workOrderId: workOrderId as Id<"workOrders">,
          organizationId: orgId,
        }
      : "skip",
  );

  const isLoading = !orgLoaded || taskCards === undefined;

  if (isLoading) return <TaskCardSkeleton />;

  if (!taskCards) {
    return (
      <div className="text-center py-20">
        <p className="text-sm text-muted-foreground">Work order not found</p>
        <Button asChild variant="ghost" size="sm" className="mt-4">
          <Link href={`/work-orders/${workOrderId}`}>← Back to Work Order</Link>
        </Button>
      </div>
    );
  }

  const taskCard = taskCards.find((tc) => tc._id === cardId);

  if (!taskCard) {
    return (
      <div className="text-center py-20">
        <p className="text-sm text-muted-foreground">Task card not found</p>
        <Button asChild variant="ghost" size="sm" className="mt-4">
          <Link href={`/work-orders/${workOrderId}`}>← Back to Work Order</Link>
        </Button>
      </div>
    );
  }

  const pendingSteps = taskCard.steps.filter((s) => s.status === "pending");
  const completedCount = taskCard.steps.filter(
    (s) => s.status === "completed" || s.status === "na",
  ).length;
  const totalSteps = taskCard.steps.length;
  const allStepsDone = pendingSteps.length === 0 && totalSteps > 0;
  const cardIsComplete = taskCard.status === "complete";
  const cardIsVoided = taskCard.status === "voided";

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Back */}
      <Button
        asChild
        variant="ghost"
        size="sm"
        className="h-7 -ml-2 text-xs text-muted-foreground"
      >
        <Link href={`/work-orders/${workOrderId}`}>
          <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
          Back to Work Order
        </Link>
      </Button>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="font-mono text-xs text-muted-foreground font-medium">
              {taskCard.taskCardNumber}
            </span>
            <Badge
              variant="outline"
              className={`text-[10px] font-medium border ${
                TASK_STATUS_STYLES[taskCard.status as TaskStatus] ?? "bg-muted text-muted-foreground"
              }`}
            >
              {cardIsComplete && (
                <CheckCircle2 className="w-2.5 h-2.5 mr-1" />
              )}
              {cardIsComplete
                ? "Signed & Complete"
                : TASK_STATUS_LABEL[taskCard.status as TaskStatus] ?? taskCard.status}
            </Badge>
          </div>
          <h1 className="text-lg font-semibold text-foreground">
            {taskCard.title}
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Approved Data: {taskCard.approvedDataSource}
            {taskCard.approvedDataRevision && (
              <span className="ml-1">Rev. {taskCard.approvedDataRevision}</span>
            )}
          </p>
          {taskCard.assignedTechnicianName && (
            <p className="text-xs text-muted-foreground mt-0.5">
              Assigned: {taskCard.assignedTechnicianName}
            </p>
          )}
        </div>

        {/* Progress */}
        <div className="text-right flex-shrink-0">
          <div className="text-2xl font-bold font-mono text-foreground">
            {completedCount}
            <span className="text-base text-muted-foreground">
              /{totalSteps}
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground">steps done</p>
        </div>
      </div>

      {/* Voided banner */}
      {cardIsVoided && (
        <Card className="border-slate-500/30 bg-slate-500/5">
          <CardContent className="p-3">
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" />
              This task card has been voided and cannot be modified.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Steps (extracted via TaskStepRow) */}
      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
            <Wrench className="w-3.5 h-3.5" />
            Steps
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-0">
          {taskCard.steps
            .slice()
            .sort((a, b) => a.stepNumber - b.stepNumber)
            .map((step, idx) => (
              <TaskStepRow
                key={step._id}
                step={step}
                idx={idx}
                cardIsVoided={cardIsVoided}
                cardIsComplete={cardIsComplete}
                orgId={orgId}
                techId={techId}
                onSignClick={setSignStepTarget}
              />
            ))}
        </CardContent>
      </Card>

      {/* Card-level sign-off */}
      {!cardIsVoided && (
        <Card
          className={`border ${
            cardIsComplete
              ? "border-green-500/30 bg-green-500/5"
              : allStepsDone
              ? "border-primary/30 bg-primary/5"
              : "border-border/60"
          }`}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-foreground flex items-center gap-2">
                  {cardIsComplete ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-green-400" />
                      Task Card Signed &amp; Complete
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4 text-muted-foreground" />
                      Card-Level Sign-Off
                    </>
                  )}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {cardIsComplete
                    ? "This task card has been certified per 14 CFR 43.9."
                    : allStepsDone
                    ? "All steps complete — ready for card-level sign-off."
                    : `Complete all ${pendingSteps.length} remaining step${
                        pendingSteps.length !== 1 ? "s" : ""
                      } before signing the card.`}
                </p>
              </div>

              {!cardIsComplete && orgId && techId && (
                <Button
                  variant={allStepsDone ? "default" : "outline"}
                  size="sm"
                  disabled={!allStepsDone}
                  className="gap-1.5 flex-shrink-0"
                  onClick={() => setSignCardOpen(true)}
                >
                  <Lock className="w-3.5 h-3.5" />
                  Sign Card
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dialogs (extracted) */}
      {signStepTarget && orgId && techId && (
        <SignStepDialog
          open={!!signStepTarget}
          onClose={() => setSignStepTarget(null)}
          stepNumber={signStepTarget.stepNumber}
          stepDescription={signStepTarget.description}
          requiresIa={signStepTarget.requiresIa}
          orgId={orgId}
          techId={techId}
          taskCardId={taskCard._id as Id<"taskCards">}
          stepId={signStepTarget.stepId}
          onSuccess={() => setSignStepTarget(null)}
        />
      )}

      {signCardOpen && orgId && techId && (
        <SignCardDialog
          open={signCardOpen}
          onClose={() => setSignCardOpen(false)}
          taskCardTitle={taskCard.title}
          orgId={orgId}
          techId={techId}
          taskCardId={taskCard._id as Id<"taskCards">}
          onSuccess={() => setSignCardOpen(false)}
        />
      )}
    </div>
  );
}
