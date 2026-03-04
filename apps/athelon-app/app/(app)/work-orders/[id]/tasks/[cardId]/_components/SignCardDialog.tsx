"use client";

/**
 * SignCardDialog.tsx
 * Extracted from tasks/[cardId]/page.tsx (TD-009).
 * The card-level sign-off dialog (14 CFR 43.9 certification).
 */

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Lock, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
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
import { Separator } from "@/components/ui/separator";

// ─── Types ────────────────────────────────────────────────────────────────────

type RatingValue = "airframe" | "powerplant" | "ia" | "none";

const RATING_OPTIONS: { value: RatingValue; label: string }[] = [
  { value: "airframe", label: "Airframe (A)" },
  { value: "powerplant", label: "Powerplant (P)" },
  { value: "ia", label: "Inspection Authorization (IA)" },
  { value: "none", label: "No rating required" },
];

// ─── Props ────────────────────────────────────────────────────────────────────

export interface SignCardDialogProps {
  open: boolean;
  onClose: () => void;
  taskCardTitle: string;
  orgId: Id<"organizations">;
  techId: Id<"technicians">;
  taskCardId: Id<"taskCards">;
  onSuccess: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function SignCardDialog({
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

  // BUG-LT4-002: Reset error (and PIN) when the dialog re-opens after a failed
  // attempt. Without this, a tech who enters the wrong PIN, sees "Invalid PIN"
  // in red, clicks Cancel, then re-opens the dialog to try again still sees
  // the old error banner immediately — before typing anything. Looks like the
  // dialog is broken or that the same PIN is already rejected. Clearing on
  // open ensures a clean slate each time.
  //
  // BUG-LT-HUNT-007: Also reset `statement` and `rating` on open.
  // A tech who writes a partial return-to-service statement ("I certify this
  // Cessna 172 alternator was replaced per..."), clicks Cancel, then opens
  // SignCardDialog for a *different* task card (e.g. a landing gear inspection)
  // will see the previous card's statement pre-filled. If they don't notice and
  // submit, the signed RTS statement references the wrong work on a wrong
  // component — a permanent maintenance record error under 14 CFR 43.9(a)(2).
  // The `rating` field has the same issue: "Powerplant" selected for an engine
  // card carries over to an airframe card sign-off.
  useEffect(() => {
    if (open) {
      setPin("");
      setError(null);
      setStatement("");
      setRating("airframe");
    }
  }, [open]);

  const trainingRecords = useQuery(
    api.training.listTrainingRecords,
    techId ? { technicianId: techId } : "skip",
  );
  const expiredTraining = (trainingRecords ?? []).filter(
    (r) => r.status === "expired" || (!!r.expiresAt && r.expiresAt <= Date.now()),
  );
  const [trainingWarningOpen, setTrainingWarningOpen] = useState(false);

  const createAuthEvent = useMutation(api.workOrders.createSignatureAuthEvent);
  const signTaskCard = useMutation(api.taskCards.signTaskCard);

  async function handleSign(bypassTrainingWarning = false) {
    if (!bypassTrainingWarning && expiredTraining.length > 0) {
      setTrainingWarningOpen(true);
      return;
    }

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
      // BUG-QCM-SCD-001: No success toast after card-level sign-off. For a
      // 14 CFR 43.9 certification event (permanently locking a task card), the
      // dialog was closing silently. A QCM or IA had no confirmation the record
      // was written before the Convex subscription re-rendered the card as
      // "Signed & Complete". On slow connections this window could be several
      // seconds with no feedback at all.
      toast.success("Task card signed & locked");
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
    // BUG-LT2-007 (sister): Same mid-submit guard for card-level sign-off.
    // Closing the dialog while signTaskCard is in-flight would leave a signed
    // card in the backend but the UI still showing it as unsigned, with no way
    // to re-sign (backend would reject a second signTaskCard call on an already
    // complete card). The IA then has no way to tell if the card was certified.
    <Dialog open={open} onOpenChange={(v) => { if (!v && !isSubmitting) onClose(); }}>
      <DialogContent className="max-w-[95vw] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Lock className="w-4 h-4 text-green-400" aria-hidden="true" />
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
            <Label htmlFor="sign-card-rating" className="text-xs font-medium mb-1.5 block">
              Rating Exercised <span className="text-red-400" aria-hidden="true">*</span>
            </Label>
            <Select
              value={rating}
              onValueChange={(v) => setRating(v as RatingValue)}
            >
              <SelectTrigger id="sign-card-rating" className="h-9 text-sm bg-muted/30 border-border/60" aria-required="true" aria-label="Rating exercised (required)">
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
            <Label htmlFor="sign-card-statement" className="text-xs font-medium mb-1.5 block">
              Return-to-Service Statement{" "}
              <span className="text-red-400" aria-hidden="true">*</span>
              <span className="text-muted-foreground font-normal ml-1">
                (min. 50 chars, 14 CFR 43.9)
              </span>
            </Label>
            {/* BUG-LT-HUNT-054: RTS statement textarea had no maxLength cap.
                A tech pasting AMM chapter text could exceed the backend schema
                limit and get a cryptic validation error with no indication of
                what went wrong or how to fix it. 2000 chars is generous for a
                return-to-service statement (43.9 requires a concise description
                of work performed; not an essay). Character counter turns amber
                near the limit so the tech knows to trim before submitting. */}
            <Textarea
              id="sign-card-statement"
              value={statement}
              onChange={(e) => setStatement(e.target.value.slice(0, 2000))}
              placeholder="I certify that the work identified in this task card was performed in accordance with [approved data reference] and that the aircraft/component is approved for return to service..."
              rows={4}
              maxLength={2000}
              className="text-sm bg-muted/30 border-border/60 resize-none"
              aria-required="true"
              aria-describedby="sign-card-statement-hint"
            />
            {/* BUG-LT2-002: Use trimmed length to match the disabled check
                (statement.trim().length < 50). Showing raw length let a tech
                type 50 spaces, see "50/50", and wonder why Sign is still grey. */}
            <p id="sign-card-statement-hint" className={`text-[10px] mt-1 flex justify-between ${statement.length >= 1900 ? "text-amber-400" : "text-muted-foreground"}`}>
              <span>{statement.trim().length}/50 chars minimum</span>
              <span>{statement.length}/2000</span>
            </p>
          </div>

          <Separator className="opacity-40" />

          {/* PIN */}
          <div>
            <Label htmlFor="sign-card-pin" className="text-xs font-medium mb-1.5 block">
              Re-enter PIN <span className="text-red-400" aria-hidden="true">*</span>
            </Label>
            <Input
              id="sign-card-pin"
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="4–6 digit PIN"
              maxLength={6}
              inputMode="numeric"
              className="h-9 font-mono text-sm bg-muted/30 border-border/60"
              aria-required="true"
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

      <Dialog open={trainingWarningOpen} onOpenChange={setTrainingWarningOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">Expired Training Warning</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <p className="text-sm text-muted-foreground">
              Training records show expired required training. Continue only if administrative override is approved.
            </p>
            <ul className="list-disc pl-5 text-xs text-amber-400 space-y-1">
              {expiredTraining.slice(0, 5).map((r) => (
                <li key={r._id}>{r.courseName}</li>
              ))}
            </ul>
          </div>
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setTrainingWarningOpen(false)}>Cancel</Button>
            <Button size="sm" onClick={() => { setTrainingWarningOpen(false); void handleSign(true); }}>
              Continue Sign-Off
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
