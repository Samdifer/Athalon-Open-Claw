/**
 * DeferDismissDialog — Defer or dismiss a finding with a required reason.
 */

import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import type { UnaccountedFinding } from "../types";
import { useDeferFinding, useDismissFinding } from "../api";

interface DeferDismissDialogProps {
  finding: UnaccountedFinding | null;
  mode: "defer" | "dismiss";
  onClose: () => void;
}

export function DeferDismissDialog({ finding, mode, onClose }: DeferDismissDialogProps) {
  const [reason, setReason] = useState("");
  const [deferUntil, setDeferUntil] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const deferMutation = useDeferFinding();
  const dismissMutation = useDismissFinding();

  const handleSubmit = async () => {
    if (!finding || !reason.trim()) return;
    setSubmitting(true);
    try {
      if (mode === "defer") {
        const deferDate = deferUntil ? new Date(deferUntil).getTime() : undefined;
        await deferMutation(finding._id, reason, deferDate);
      } else {
        await dismissMutation(finding._id, reason);
      }
      onClose();
      setReason("");
      setDeferUntil("");
    } catch (err) {
      console.error(`${mode} failed:`, err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      onClose();
      setReason("");
      setDeferUntil("");
    }
  };

  const isDefer = mode === "defer";

  return (
    <AlertDialog open={!!finding} onOpenChange={handleOpenChange}>
      <AlertDialogContent data-testid={`${mode}-dialog`}>
        <AlertDialogHeader>
          <AlertDialogTitle className="text-sm">
            {isDefer ? "Defer Finding" : "Dismiss Finding"}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-xs">
            {isDefer
              ? "Defer this finding for later review. A reason is required for audit trail."
              : "Dismiss this finding. This action requires a documented reason and is tracked in the audit log."}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {finding && (
          <div className="space-y-4 py-2">
            <div className="bg-muted/30 rounded p-3 space-y-1">
              <div className="flex gap-2">
                <Badge variant="outline" className="text-[10px]">
                  {finding.referenceNumber}
                </Badge>
                <Badge variant="outline" className="text-[10px]">
                  {finding.aircraftRegistration}
                </Badge>
              </div>
              <p className="text-xs text-foreground mt-1">{finding.title}</p>
            </div>

            <div>
              <label className="text-xs font-medium text-foreground mb-1.5 block">
                Reason <span className="text-red-400">*</span>
              </label>
              <Textarea
                placeholder={
                  isDefer
                    ? "Why is this being deferred? When should it be revisited?"
                    : "Why is this finding being dismissed? Include regulatory justification if applicable."
                }
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                className="text-xs"
                data-testid={`${mode}-reason`}
              />
            </div>

            {isDefer && (
              <div>
                <label className="text-xs font-medium text-foreground mb-1.5 block">
                  Defer Until (optional)
                </label>
                <Input
                  type="date"
                  value={deferUntil}
                  onChange={(e) => setDeferUntil(e.target.value)}
                  className="h-8 text-xs"
                  data-testid="defer-until"
                />
              </div>
            )}

            {!isDefer && finding.severity === "critical" && (
              <div className="bg-red-500/10 border border-red-500/30 rounded p-2">
                <p className="text-[11px] text-red-400 font-medium">
                  ⚠️ This is a critical severity finding. Dismissal requires strong justification
                  and may be flagged during compliance audits.
                </p>
              </div>
            )}
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel className="text-xs" onClick={onClose}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleSubmit}
            disabled={!reason.trim() || submitting}
            className={`text-xs ${!isDefer ? "bg-destructive hover:bg-destructive/90" : ""}`}
            data-testid={`${mode}-submit`}
          >
            {submitting
              ? "Saving…"
              : isDefer
                ? "Defer Finding"
                : "Dismiss Finding"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
