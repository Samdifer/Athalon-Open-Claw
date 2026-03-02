"use client";

import { Link } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import {
  ClipboardCheck,
  Wrench,
  AlertTriangle,
  ArrowRight,
  Calendar,
  TrendingUp,
  Filter,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
import {
  type TaskStatus,
  TASK_STATUS_LABEL,
  TASK_STATUS_STYLES,
} from "@/lib/mro-constants";
import { formatDateTime, formatDate } from "@/lib/format";

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

  // BUG-031: Active-only filter — techs with many historical cards need to
  // quickly isolate open work without scrolling past completed cards.
  const [activeOnly, setActiveOnly] = useState(false);

  const taskCards = useQuery(
    api.taskCards.listTaskCardsForTechnician,
    orgId && techId ? { organizationId: orgId, technicianId: techId } : "skip",
  );

  // Still waiting for OrgContext to resolve
  if (!isLoaded) {
    return <MyWorkSkeleton />;
  }

  // Context loaded but no technician record — query is skipped, show empty state
  if (!orgId || !techId) {
    return (
      <div className="space-y-5">
        <div>
          <h1 className="text-lg sm:text-xl md:text-2xl font-semibold text-foreground">My Work</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Your assigned task cards</p>
        </div>
        <Card className="border-border/60">
          <CardContent className="py-16 text-center" data-testid="empty-state">
            <ClipboardCheck className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm font-medium text-muted-foreground">
              No technician profile linked
            </p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              Your account isn't linked to a technician record yet. Visit Personnel to create or connect one.
            </p>
            <Button asChild size="sm" className="mt-4" data-testid="empty-state-primary-action">
              <Link to="/personnel">Go to Personnel</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Query is active but still loading
  if (taskCards === undefined) {
    return <MyWorkSkeleton />;
  }

  // Sort cards by urgency: overdue → at_risk → no_date,
  // then by active status: in_progress → pending → complete/voided.
  // A lead tech must see AOG and overdue cards at the top without hunting.
  const SCHEDULE_RISK_ORDER: Record<string, number> = {
    overdue: 0,
    at_risk: 1,
    no_date: 2,
  };
  // BUG-LT2-004: STATUS_ORDER previously used "pending" (not a valid TaskStatus).
  // Valid TaskStatus values are: not_started | in_progress | incomplete_na_steps | complete | voided.
  // "not_started" and "incomplete_na_steps" were falling through to order 99 (default) and
  // sorting AFTER completed and voided cards — brand-new unstarted assignments appeared at the
  // bottom of a tech's My Work list, below already-completed jobs.
  const STATUS_ORDER: Record<string, number> = {
    in_progress: 0,
    not_started: 1,
    incomplete_na_steps: 2,
    complete: 3,
    voided: 4,
  };
  const cards = [...taskCards].sort((a, b) => {
    const riskA = SCHEDULE_RISK_ORDER[a.scheduleRisk ?? "no_date"] ?? 2;
    const riskB = SCHEDULE_RISK_ORDER[b.scheduleRisk ?? "no_date"] ?? 2;
    if (riskA !== riskB) return riskA - riskB;
    const statusA = STATUS_ORDER[a.status] ?? 99;
    const statusB = STATUS_ORDER[b.status] ?? 99;
    return statusA - statusB;
  });

  const inProgressCount = cards.filter((c) => c.status === "in_progress").length;
  // Only count pending steps on active cards (exclude voided/complete)
  const totalPendingSteps = cards
    .filter((c) => c.status !== "voided" && c.status !== "complete")
    .reduce((sum, c) => sum + c.pendingSteps, 0);

  // BUG-031: Apply active-only filter before rendering.
  // Card statuses: "not_started", "incomplete_na_steps" (active), "complete", "voided" (terminal).
  const displayedCards = activeOnly
    ? cards.filter((c) => c.status !== "complete" && c.status !== "voided")
    : cards;
  const hiddenCount = cards.length - displayedCards.length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-lg sm:text-xl md:text-2xl font-semibold text-foreground">My Work</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {tech?.legalName
              ? `Assigned to ${tech.legalName}`
              : "Your assigned task cards"}
          </p>
        </div>
        {/* BUG-031: Active-only filter toggle */}
        <Button
          variant={activeOnly ? "secondary" : "outline"}
          size="sm"
          className="h-8 gap-1.5 text-xs flex-shrink-0"
          onClick={() => setActiveOnly((prev) => !prev)}
          aria-pressed={activeOnly}
        >
          <Filter className="w-3.5 h-3.5" />
          {activeOnly ? "Active only" : "All cards"}
        </Button>
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
            <p className="text-2xl font-bold text-sky-600 dark:text-sky-400">{inProgressCount}</p>
            <p className="text-xs text-muted-foreground mt-0.5">active cards</p>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">
              Pending Steps
            </p>
            <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              {totalPendingSteps}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              steps remaining
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Task card list */}
      {displayedCards.length === 0 ? (
        <Card className="border-border/60">
          <CardContent className="py-16 text-center" data-testid="empty-state">
            <ClipboardCheck className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm font-medium text-muted-foreground">
              {activeOnly
                ? "No active task cards"
                : "No task cards assigned to you"}
            </p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              {activeOnly
                ? `All ${hiddenCount} card${hiddenCount !== 1 ? "s" : ""} are completed or voided. Toggle "All cards" to see history.`
                : "Task cards assigned to you by your supervisor will appear here."}
            </p>
            {activeOnly && hiddenCount > 0 && (
              <Button
                size="sm"
                variant="ghost"
                className="mt-3 text-xs h-7"
                onClick={() => setActiveOnly(false)}
              >
                Show all {cards.length} cards
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {activeOnly && hiddenCount > 0 && (
            <p className="text-xs text-muted-foreground/60">
              Showing {displayedCards.length} active card{displayedCards.length !== 1 ? "s" : ""} ·{" "}
              <button
                type="button"
                className="underline underline-offset-2 hover:text-foreground transition-colors"
                onClick={() => setActiveOnly(false)}
              >
                show {hiddenCount} completed/voided
              </button>
            </p>
          )}
          {displayedCards.map((card) => {
            const completedSteps = card.totalSteps - card.pendingSteps;
            const progressPct =
              card.totalSteps > 0
                ? Math.round((completedSteps / card.totalSteps) * 100)
                : 0;

            // BUG-LT2-005: Detect "Awaiting Sign-Off" state — all steps done
            // but card not yet certified. The WO detail page (TaskCardList.tsx)
            // shows an amber "Awaiting Sign-Off" badge for this via AI-076, but
            // My Work uses its own card rendering and was never updated. Without
            // this, a tech who finished all their steps just sees "In Progress"
            // and has no visual cue that they need to open the card and sign it.
            const awaitingSignOff =
              card.totalSteps > 0 &&
              card.pendingSteps === 0 &&
              card.status !== "complete" &&
              card.status !== "voided";

            const statusLabel =
              TASK_STATUS_LABEL[card.status as TaskStatus] ?? card.status;
            const statusStyle =
              TASK_STATUS_STYLES[card.status as TaskStatus] ??
              "bg-muted text-muted-foreground";

            const lastHandoffNote =
              card.handoffNotes && card.handoffNotes.length > 0
                ? card.handoffNotes[card.handoffNotes.length - 1]
                : null;

            // BUG-029: "Continue" label is wrong for signed/voided cards.
            // A complete card is locked — showing "Continue" implies there's
            // more work to do. Use "View" for terminal states.
            // Active card statuses: "not_started", "incomplete_na_steps".
            // Terminal card statuses: "complete", "voided".
            const isActionable =
              card.status !== "complete" && card.status !== "voided";

            const scheduleRisk = card.scheduleRisk ?? "no_date";
            const riskBorderClass =
              scheduleRisk === "overdue"
                ? "border-l-4 border-l-red-500"
                : scheduleRisk === "at_risk"
                  ? "border-l-4 border-l-amber-500"
                  : "";
            const dueDateTextClass =
              scheduleRisk === "overdue"
                ? "text-red-400"
                : scheduleRisk === "at_risk"
                  ? "text-amber-400"
                  : "text-muted-foreground";

            return (
              <Card
                key={card._id}
                className={`border-border/60 hover:border-primary/30 transition-all ${riskBorderClass}${awaitingSignOff ? " border-amber-500/30 bg-amber-500/5" : ""}`}
              >
                <CardContent className="p-4 space-y-3">
                  {/* Row 1: Card number + title + status + continue button */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs text-muted-foreground font-medium">
                          {card.taskCardNumber}
                        </span>
                        {awaitingSignOff ? (
                          <Badge
                            variant="outline"
                            className="text-[10px] font-medium border bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30"
                          >
                            <Lock className="w-2.5 h-2.5 mr-1" />
                            Awaiting Sign-Off
                          </Badge>
                        ) : (
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-medium border ${statusStyle}`}
                        >
                          {statusLabel}
                        </Badge>
                        )}
                      </div>
                      <p className="text-sm font-semibold text-foreground mt-0.5 truncate">
                        {card.title}
                      </p>
                    </div>
                    <Button
                      asChild
                      size="sm"
                      variant={isActionable ? "default" : "outline"}
                      className="flex-shrink-0 h-7 text-xs gap-1.5"
                    >
                      <Link
                        to={`/work-orders/${card.workOrderId}/tasks/${card._id}`}
                      >
                        {isActionable ? "Continue" : "View"}
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    </Button>
                  </div>

                  {/* Row 2: Work order link + due date */}
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Wrench className="w-3 h-3 flex-shrink-0" />
                      <span>Work Order</span>
                      <Link
                        to={`/work-orders/${card.workOrderId}`}
                        className="font-mono text-primary hover:underline"
                      >
                        {card.workOrderNumber}
                      </Link>
                    </div>
                    {card.promisedDeliveryDate && (
                      <div className={`flex items-center gap-1 text-xs ${dueDateTextClass}`}>
                        {scheduleRisk === "overdue" && (
                          <TrendingUp className="w-3 h-3 flex-shrink-0" />
                        )}
                        <Calendar className="w-3 h-3 flex-shrink-0" />
                        <span>
                          {scheduleRisk === "overdue" ? "Overdue — " : scheduleRisk === "at_risk" ? "Due soon — " : "Due "}
                          {formatDate(card.promisedDeliveryDate)}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Row 3: Step progress bar */}
                  {/* BUG-LT-26-003: Label was "Steps completed" but the count
                      (totalSteps - pendingSteps) includes in_progress steps —
                      steps the tech has started but NOT yet signed. Calling
                      in_progress steps "completed" is incorrect and causes a
                      tech to think sign-offs are done when they aren't.
                      Changed label to "Steps started/done" to reflect the
                      actual meaning: steps that are no longer in "pending"
                      state. Backend BACKEND-NEEDED: expose inProgressSteps
                      count to split "started" from "signed" accurately. */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Steps started/done</span>
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
                        <AlertTriangle className="w-3 h-3 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                        <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400 uppercase tracking-wide">
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
