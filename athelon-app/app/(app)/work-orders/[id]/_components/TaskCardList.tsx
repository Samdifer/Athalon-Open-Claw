"use client";

/**
 * TaskCardList.tsx
 * Extracted from work-orders/[id]/page.tsx (TD-009).
 * Renders the "Task Cards" tab content: list of task cards with progress,
 * and the "Add Task Card" CTA button.
 */

import { Link } from "react-router-dom";
import {
  ClipboardList,
  CheckCircle2,
  Circle,
  ChevronRight,
  Wrench,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  type TaskStatus,
  TASK_STATUS_LABEL,
  TASK_STATUS_STYLES,
} from "@/lib/mro-constants";

// ─── Local helpers ────────────────────────────────────────────────────────────

const TASK_TYPE_LABEL: Record<string, string> = {
  inspection: "Inspection",
  repair: "Repair",
  replacement: "Replacement",
  ad_compliance: "AD Compliance",
  functional_check: "Functional Check",
  rigging: "Rigging",
  return_to_service: "Return to Service",
  overhaul: "Overhaul",
  modification: "Modification",
};

// ─── Prop types ───────────────────────────────────────────────────────────────

interface TaskCardStep {
  status: string;
}

interface TaskCard {
  _id: string;
  taskCardNumber: string;
  status: string;
  taskType: string;
  title: string;
  approvedDataSource: string;
  steps: TaskCardStep[];
}

export interface TaskCardListProps {
  taskCards: TaskCard[];
  workOrderId: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function TaskCardList({ taskCards, workOrderId }: TaskCardListProps) {
  return (
    <div className="space-y-2">
      {taskCards.length === 0 ? (
        <Card className="border-border/60">
          <CardContent className="py-10 text-center">
            <ClipboardList className="w-6 h-6 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              No task cards on this work order
            </p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              Add task cards to begin maintenance work.
            </p>
          </CardContent>
        </Card>
      ) : (
        taskCards.map((tc) => {
          const completedSteps = tc.steps.filter(
            (s) => s.status === "completed" || s.status === "na",
          ).length;
          const totalSteps = tc.steps.length;
          // Detect "all steps done, awaiting card-level sign-off" state.
          // BUG-LT3-003: Must mirror the same fix applied to task card page
          // (BUG-LT3-002): a 0-step card is always "all steps done" — it's
          // just a card with no itemized steps. Without the fix, 0-step cards
          // never show the amber "Awaiting Sign-Off" highlight here on the WO
          // detail, so the shop manager or QCM can't tell which cards need
          // cert action vs which have no work required.
          const awaitingSignOff =
            (totalSteps === 0 || completedSteps === totalSteps) &&
            tc.status !== "complete" &&
            tc.status !== "voided";

          return (
            <Link
              key={tc._id}
              to={`/work-orders/${workOrderId}/tasks/${tc._id}`}
            >
              <Card className={`border-border/60 hover:border-primary/30 hover:bg-card/80 transition-all cursor-pointer ${awaitingSignOff ? "border-amber-500/30 bg-amber-500/5" : ""}`}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="font-mono text-xs text-muted-foreground font-medium">
                          {tc.taskCardNumber}
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
                          className={`text-[10px] font-medium border ${TASK_STATUS_STYLES[tc.status as TaskStatus] ?? "bg-muted text-muted-foreground"}`}
                        >
                          {tc.status === "complete" && (
                            <CheckCircle2 className="w-2.5 h-2.5 mr-1" />
                          )}
                          {tc.status === "in_progress" && (
                            <Circle className="w-2.5 h-2.5 mr-1" />
                          )}
                          {TASK_STATUS_LABEL[tc.status as TaskStatus] ?? tc.status}
                        </Badge>
                        )}
                        <Badge
                          variant="outline"
                          className="text-[10px] text-muted-foreground border-border/40"
                        >
                          {TASK_TYPE_LABEL[tc.taskType] ?? tc.taskType}
                        </Badge>
                      </div>
                      <p className="text-sm font-medium text-foreground">
                        {tc.title}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {tc.approvedDataSource}
                      </p>
                    </div>
                    <div className="flex-shrink-0 flex items-center gap-3">
                      {totalSteps > 0 && (
                        <div className="text-right">
                          <div className="flex items-center gap-1.5 mb-1 justify-end">
                            <span className="text-[11px] text-muted-foreground">
                              {completedSteps}/{totalSteps} steps
                            </span>
                          </div>
                          <Progress
                            value={(completedSteps / totalSteps) * 100}
                            className="h-1 w-16"
                          />
                        </div>
                      )}
                      <ChevronRight className="w-4 h-4 text-muted-foreground/50" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })
      )}

      {/* Add Task Card CTA */}
      <Button
        asChild
        variant="outline"
        size="sm"
        className="w-full h-9 text-xs border-border/60 border-dashed gap-1.5 mt-2"
      >
        <Link to={`/work-orders/${workOrderId}/tasks/new`}>
          <Wrench className="w-3.5 h-3.5" />
          Add Task Card
        </Link>
      </Button>
    </div>
  );
}
