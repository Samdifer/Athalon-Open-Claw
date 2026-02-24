"use client";

/**
 * SignCardDialog.tsx
 * Extracted from tasks/[cardId]/page.tsx (TD-009).
 * The card-level sign-off dialog (14 CFR 43.9 certification).
 */

import { useState } from "react";
import { useMutation } from "convex/react";
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
