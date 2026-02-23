"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import type { Id } from "@/convex/_generated/dataModel";
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  Minus,
  AlertTriangle,
  Wrench,
  PenLine,
  Lock,
  Loader2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
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
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

// ─── Types ────────────────────────────────────────────────────────────────────

type RatingValue = "airframe" | "powerplant" | "ia" | "none";

const RATING_OPTIONS: { value: RatingValue; label: string }[] = [
  { value: "airframe", label: "Airframe (A)" },
  { value: "powerplant", label: "Powerplant (P)" },
  { value: "ia", label: "Inspection Authorization (IA)" },
  { value: "none", label: "No rating required" },
];

// ─── Sign Step Dialog ─────────────────────────────────────────────────────────

interface SignStepDialogProps {
  open: boolean;
  onClose: () => void;
  stepNumber: number;
  stepDescription: string;
  requiresIa: boolean;
  orgId: Id<"organizations">;
  techId: Id<"technicians">;
  taskCardId: Id<"taskCards">;
  stepId: Id<"taskCardSteps">;
  onSuccess: () => void;
}

function SignStepDialog({
  open,
  onClose,
  stepNumber,
  stepDescription,
  requiresIa,
  orgId,
  techId,
  taskCardId,
  stepId,
  onSuccess,
}: SignStepDialogProps) {
  const [pin, setPin] = useState("");
  const [rating, setRating] = useState<RatingValue>(
    requiresIa ? "ia" : "airframe",
  );
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createAuthEvent = useMutation(api.workOrders.createSignatureAuthEvent);
  const completeStep = useMutation(api.taskCards.completeStep);

  async function handleSign() {
    setIsSubmitting(true);
    setError(null);
    try {
      // Step 1: Create a 5-minute auth event (re-authentication)
      const { eventId } = await createAuthEvent({
        organizationId: orgId,
        technicianId: techId,
        intendedTable: "taskCardSteps",
        pin,
      });

      // Step 2: Complete the step using the auth event
      await completeStep({
        stepId,
        taskCardId,
        organizationId: orgId,
        action: "complete",
        signatureAuthEventId: eventId,
        ratingsExercised: [rating],
        notes: notes.trim() || undefined,
        callerTechnicianId: techId,
      });

      setPin("");
      setNotes("");
      onSuccess();
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to sign step",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <PenLine className="w-4 h-4 text-primary" />
            Sign Step {stepNumber}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <p className="text-sm text-muted-foreground">{stepDescription}</p>

          {requiresIa && (
            <div className="flex items-start gap-2 p-2.5 rounded-md bg-amber-500/10 border border-amber-500/30">
              <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-400">
                This step requires an IA sign-off. Your Inspection Authorization
                must be current.
              </p>
            </div>
          )}

          {/* Rating Exercised */}
          <div>
            <Label className="text-xs font-medium mb-1.5 block">
              Rating Exercised <span className="text-red-400">*</span>
            </Label>
            <Select
              value={rating}
              onValueChange={(v) => setRating(v as RatingValue)}
            >
              <SelectTrigger className="h-9 text-sm bg-muted/30 border-border/60">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RATING_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div>
            <Label className="text-xs font-medium mb-1.5 block">
              Notes{" "}
              <span className="text-muted-foreground font-normal">
                (optional)
              </span>
            </Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any notes for this step..."
              rows={2}
              className="text-sm bg-muted/30 border-border/60 resize-none"
            />
          </div>

          <Separator className="opacity-40" />

          {/* PIN Re-authentication */}
          <div>
            <Label className="text-xs font-medium mb-1.5 block">
              Re-enter PIN to authorize signature{" "}
              <span className="text-red-400">*</span>
            </Label>
            <Input
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="4–6 digit PIN"
              maxLength={6}
              inputMode="numeric"
              className="h-9 font-mono text-sm bg-muted/30 border-border/60"
            />
            <p className="text-[10px] text-muted-foreground mt-1">
              Creates a 5-minute authorization token for this signature.
            </p>
          </div>

          {error && (
            <div className="flex items-start gap-2 p-2.5 rounded-md border border-red-500/30 bg-red-500/5">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-red-400">{error}</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSign}
            disabled={isSubmitting || pin.length < 4}
            className="gap-2"
            size="sm"
          >
            {isSubmitting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <PenLine className="w-3.5 h-3.5" />
            )}
            Sign Step
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Sign Card Dialog ─────────────────────────────────────────────────────────

interface SignCardDialogProps {
  open: boolean;
  onClose: () => void;
  taskCardTitle: string;
  orgId: Id<"organizations">;
  techId: Id<"technicians">;
  taskCardId: Id<"taskCards">;
  onSuccess: () => void;
}

function SignCardDialog({
  open,
  onClose,
  taskCardTitle,
  orgId,
  techId,
  taskCardId,
  onSuccess,
}: SignCardDialogProps) {
  const [pin, setPin] = useState("");
  const [rating, setRating] = useState<RatingValue>("airframe");
  const [statement, setStatement] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createAuthEvent = useMutation(api.workOrders.createSignatureAuthEvent);
  const signTaskCard = useMutation(api.taskCards.signTaskCard);

  async function handleSign() {
    setIsSubmitting(true);
    setError(null);
    try {
      const { eventId } = await createAuthEvent({
        organizationId: orgId,
        technicianId: techId,
        intendedTable: "taskCards",
        pin,
      });

      await signTaskCard({
        taskCardId,
        organizationId: orgId,
        signatureAuthEventId: eventId,
        ratingsExercised: [rating],
        returnToServiceStatement: statement.trim(),
        callerTechnicianId: techId,
      });

      setPin("");
      setStatement("");
      onSuccess();
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to sign task card",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Lock className="w-4 h-4 text-green-400" />
            Sign Task Card
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <p className="text-sm text-muted-foreground">
            Card-level sign-off for: <strong>{taskCardTitle}</strong>
          </p>

          <div className="flex items-start gap-2 p-2.5 rounded-md bg-sky-500/10 border border-sky-500/30">
            <AlertCircle className="w-4 h-4 text-sky-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-sky-400">
              This is your certification under 14 CFR 43.9 that all work was
              performed in accordance with approved data and the aircraft is
              returned to an airworthy condition.
            </p>
          </div>

          {/* Rating */}
          <div>
            <Label className="text-xs font-medium mb-1.5 block">
              Rating Exercised <span className="text-red-400">*</span>
            </Label>
            <Select
              value={rating}
              onValueChange={(v) => setRating(v as RatingValue)}
            >
              <SelectTrigger className="h-9 text-sm bg-muted/30 border-border/60">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RATING_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Return to Service Statement */}
          <div>
            <Label className="text-xs font-medium mb-1.5 block">
              Return-to-Service Statement{" "}
              <span className="text-red-400">*</span>
              <span className="text-muted-foreground font-normal ml-1">
                (min. 50 chars, 14 CFR 43.9)
              </span>
            </Label>
            <Textarea
              value={statement}
              onChange={(e) => setStatement(e.target.value)}
              placeholder="I certify that the work identified in this task card was performed in accordance with [approved data reference] and that the aircraft/component is approved for return to service..."
              rows={4}
              className="text-sm bg-muted/30 border-border/60 resize-none"
            />
            <p className="text-[10px] text-muted-foreground mt-1">
              {statement.length}/50 chars minimum
            </p>
          </div>

          <Separator className="opacity-40" />

          {/* PIN */}
          <div>
            <Label className="text-xs font-medium mb-1.5 block">
              Re-enter PIN <span className="text-red-400">*</span>
            </Label>
            <Input
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="4–6 digit PIN"
              maxLength={6}
              inputMode="numeric"
              className="h-9 font-mono text-sm bg-muted/30 border-border/60"
            />
          </div>

          {error && (
            <div className="flex items-start gap-2 p-2.5 rounded-md border border-red-500/30 bg-red-500/5">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-red-400">{error}</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSign}
            disabled={
              isSubmitting ||
              pin.length < 4 ||
              statement.trim().length < 50
            }
            className="gap-2"
            size="sm"
          >
            {isSubmitting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Lock className="w-3.5 h-3.5" />
            )}
            Sign & Lock Card
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

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
                cardIsComplete
                  ? "bg-green-500/15 text-green-400 border-green-500/30"
                  : cardIsVoided
                  ? "bg-slate-500/15 text-slate-400 border-slate-500/30"
                  : taskCard.status === "in_progress"
                  ? "bg-sky-500/15 text-sky-400 border-sky-500/30"
                  : "bg-slate-500/15 text-slate-400 border-slate-500/30"
              }`}
            >
              {cardIsComplete && (
                <CheckCircle2 className="w-2.5 h-2.5 mr-1" />
              )}
              {cardIsComplete
                ? "Signed & Complete"
                : taskCard.status === "in_progress"
                ? "In Progress"
                : taskCard.status === "not_started"
                ? "Not Started"
                : taskCard.status === "incomplete_na_steps"
                ? "Needs IA Review"
                : "Voided"}
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

        {/* Progress ring */}
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

      {/* Steps */}
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
              <div key={step._id}>
                {idx > 0 && <Separator className="opacity-20 my-0" />}
                <div className="py-3 flex items-start gap-3">
                  {/* Status icon */}
                  <div className="flex-shrink-0 mt-0.5">
                    {step.status === "completed" ? (
                      <CheckCircle2 className="w-5 h-5 text-green-400" />
                    ) : step.status === "na" ? (
                      <Minus className="w-5 h-5 text-muted-foreground" />
                    ) : (
                      <Circle className="w-5 h-5 text-muted-foreground/40" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      <span className="text-xs font-medium text-muted-foreground">
                        Step {step.stepNumber}
                      </span>
                      {step.signOffRequiresIa && (
                        <Badge className="bg-amber-500/15 text-amber-400 border border-amber-500/30 text-[9px]">
                          IA Required
                        </Badge>
                      )}
                      {step.requiresSpecialTool && step.specialToolReference && (
                        <Badge
                          variant="outline"
                          className="text-[9px] border-border/40 text-muted-foreground"
                        >
                          Tool: {step.specialToolReference}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-foreground">{step.description}</p>

                    {/* Sign-off info */}
                    {step.status === "completed" && (
                      <div className="mt-1 flex items-center gap-1.5 text-[11px] text-green-400/80">
                        <CheckCircle2 className="w-3 h-3" />
                        {step.signerName
                          ? `Signed by ${step.signerName}`
                          : "Signed"}
                        {step.signedAt && (
                          <span className="text-muted-foreground/60">
                            ·{" "}
                            {new Date(step.signedAt).toLocaleString("en-US", {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        )}
                        {step.signedCertificateNumber && (
                          <span className="font-mono text-[10px] text-muted-foreground/60">
                            #{step.signedCertificateNumber}
                          </span>
                        )}
                      </div>
                    )}
                    {step.status === "na" && (
                      <div className="mt-1 text-[11px] text-muted-foreground">
                        N/A: {step.naReason}
                        {step.naAuthorizerName && (
                          <span className="ml-1">
                            · Auth: {step.naAuthorizerName}
                          </span>
                        )}
                      </div>
                    )}
                    {step.notes && step.status !== "pending" && (
                      <p className="text-[11px] text-muted-foreground mt-0.5 italic">
                        Note: {step.notes}
                      </p>
                    )}
                  </div>

                  {/* Action button */}
                  {step.status === "pending" &&
                    !cardIsVoided &&
                    !cardIsComplete &&
                    orgId &&
                    techId && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs flex-shrink-0 gap-1 border-border/60"
                        onClick={() =>
                          setSignStepTarget({
                            stepId: step._id as Id<"taskCardSteps">,
                            stepNumber: step.stepNumber,
                            description: step.description,
                            requiresIa: step.signOffRequiresIa,
                          })
                        }
                      >
                        <PenLine className="w-3 h-3" />
                        Sign
                      </Button>
                    )}
                </div>
              </div>
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
                      Task Card Signed & Complete
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

      {/* Dialogs */}
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
