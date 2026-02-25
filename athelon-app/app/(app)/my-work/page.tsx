"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import {
  ClipboardCheck,
  Wrench,
  AlertTriangle,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  type TaskStatus,
  TASK_STATUS_LABEL,
  TASK_STATUS_STYLES,
} from "@/lib/mro-constants";
import { formatDateTime } from "@/lib/format";

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function MyWorkSkeleton() {
  return (
    <div className="space-y-5">
      <div className="space-y-1.5">
        <Skeleton className="h-6 w-28" />
        <Skeleton className="h-4 w-48" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-lg" />
        ))}
      </div>
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-lg" />
        ))}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function MyWorkPage() {
  const { orgId, techId, isLoaded, tech } = useCurrentOrg();

  const taskCards = useQuery(
    api.taskCards.listTaskCardsForTechnician,
    orgId && techId ? { organizationId: orgId, technicianId: techId } : "skip",
  );

  const isLoading = !isLoaded || taskCards === undefined;

  if (isLoading) {
    return <MyWorkSkeleton />;
  }

  const cards = taskCards ?? [];
  const inProgressCount = cards.filter((c) => c.status === "in_progress").length;
  const totalPendingSteps = cards.reduce((sum, c) => sum + c.pendingSteps, 0);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-foreground">My Work</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {tech?.legalName
            ? `Assigned to ${tech.legalName}`
            : "Your assigned task cards"}
        </p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="border-border/60">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">
              Total Assigned
            </p>
            <p className="text-2xl font-bold text-foreground">{cards.length}</p>
            <p className="text-xs text-muted-foreground mt-0.5">task cards</p>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">
              In Progress
            </p>
            <p className="text-2xl font-bold text-sky-400">{inProgressCount}</p>
            <p className="text-xs text-muted-foreground mt-0.5">active cards</p>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">
              Pending Steps
            </p>
            <p className="text-2xl font-bold text-amber-400">
              {totalPendingSteps}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              steps remaining
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Task card list */}
      {cards.length === 0 ? (
        <Card className="border-border/60">
          <CardContent className="py-16 text-center">
            <ClipboardCheck className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm font-medium text-muted-foreground">
              No task cards assigned to you
            </p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              Task cards assigned to you by your supervisor will appear here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {cards.map((card) => {
            const completedSteps = card.totalSteps - card.pendingSteps;
            const progressPct =
              card.totalSteps > 0
                ? Math.round((completedSteps / card.totalSteps) * 100)
                : 0;

            const statusLabel =
              TASK_STATUS_LABEL[card.status as TaskStatus] ?? card.status;
            const statusStyle =
              TASK_STATUS_STYLES[card.status as TaskStatus] ??
              "bg-muted text-muted-foreground";

            const lastHandoffNote =
              card.handoffNotes && card.handoffNotes.length > 0
                ? card.handoffNotes[card.handoffNotes.length - 1]
                : null;

            return (
              <Card
                key={card._id}
                className="border-border/60 hover:border-primary/30 transition-all"
              >
                <CardContent className="p-4 space-y-3">
                  {/* Row 1: Card number + title + status + continue button */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs text-muted-foreground font-medium">
                          {card.taskCardNumber}
                        </span>
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-medium border ${statusStyle}`}
                        >
                          {statusLabel}
                        </Badge>
                      </div>
                      <p className="text-sm font-semibold text-foreground mt-0.5 truncate">
                        {card.title}
                      </p>
                    </div>
                    <Button
                      asChild
                      size="sm"
                      className="flex-shrink-0 h-7 text-xs gap-1.5"
                    >
                      <Link
                        href={`/work-orders/${card.workOrderId}/tasks/${card._id}`}
                      >
                        Continue
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    </Button>
                  </div>

                  {/* Row 2: Work order link */}
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Wrench className="w-3 h-3 flex-shrink-0" />
                    <span>Work Order</span>
                    <Link
                      href={`/work-orders/${card.workOrderId}`}
                      className="font-mono text-primary hover:underline"
                    >
                      {card.workOrderNumber}
                    </Link>
                  </div>

                  {/* Row 3: Step progress bar */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Steps completed</span>
                      <span>
                        {completedSteps} / {card.totalSteps}
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-muted/50 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                  </div>

                  {/* Row 4: Handoff note preview */}
                  {lastHandoffNote && (
                    <div className="rounded-md bg-amber-500/10 border border-amber-500/20 px-3 py-2">
                      <div className="flex items-center gap-1.5 mb-1">
                        <AlertTriangle className="w-3 h-3 text-amber-400 flex-shrink-0" />
                        <span className="text-[10px] font-medium text-amber-400 uppercase tracking-wide">
                          Handoff Note
                        </span>
                        <span className="text-[10px] text-muted-foreground ml-auto">
                          {formatDateTime(lastHandoffNote.createdAt)}
                        </span>
                      </div>
                      <p className="text-xs text-amber-200/90 line-clamp-2">
                        {lastHandoffNote.note}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        — {lastHandoffNote.technicianName}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
