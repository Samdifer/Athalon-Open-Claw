"use client";

/**
 * CloseReadinessPanel — AI-013 + AI-014
 *
 * AI-013: Fixed stub close handler — the old `handleClose` was a toast.success()
 * that never called any backend mutation. WOs were never actually closed.
 * Now the button navigates to /work-orders/[id]/rts which has the full
 * authorizeReturnToService flow with signatureAuthEventId, RTS statement,
 * and aircraft hours. closeWorkOrder requires pending_signoff status and all
 * those fields — the RTS page is the correct entry point.
 *
 * AI-014: Fixed fragile string-matching checklist — the old code used
 * b.toLowerCase().includes("task card") etc. to map backend blocker messages
 * to synthetic checklist rows. This silently missed the status blocker
 * ("Work order status is 'X'") which matched nothing and showed green.
 * Now we display the actual backend blockers directly — no guessing.
 */

import { useQuery } from "convex/react";
import { useNavigate } from "react-router-dom";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Loader2, ShieldCheck, ArrowRight } from "lucide-react";
import type { Id } from "@/convex/_generated/dataModel";

interface CloseReadinessPanelProps {
  workOrderId: Id<"workOrders">;
  organizationId: Id<"organizations">;
}

export function CloseReadinessPanel({
  workOrderId,
  organizationId,
}: CloseReadinessPanelProps) {
  const navigate = useNavigate();

  const readiness = useQuery(api.workOrders.getCloseReadiness, {
    workOrderId,
    organizationId,
  });

  // ── Loading state ──────────────────────────────────────────────────────────
  if (readiness === undefined) {
    return (
      <Card>
        <CardContent className="py-8 flex justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  // ── Null (WO not found or access denied) ───────────────────────────────────
  if (readiness === null) {
    return null;
  }

  const canClose = readiness.canClose ?? false;
  const blockers: string[] = readiness.blockers ?? [];

  // Navigate to the RTS authorization page which has the full form:
  // signatureAuthEventId, returnToServiceStatement, aircraftHoursAtRts
  function handleGoToRts() {
    navigate(`/work-orders/${workOrderId}/rts`);
  }

  return (
    <Card
      className={
        canClose
          ? "border-green-500/30 bg-green-500/5"
          : "border-amber-500/30 bg-amber-500/5"
      }
    >
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <ShieldCheck className="w-4 h-4" />
          Close Readiness
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {canClose ? (
          /* ── All clear — ready for RTS sign-off ─────────────────────────── */
          <div className="flex items-start gap-2 text-xs">
            <CheckCircle2 className="w-3.5 h-3.5 text-green-500 flex-shrink-0 mt-0.5" />
            <span className="text-green-700 dark:text-green-400 font-medium">
              All pre-conditions met. Ready for Return-to-Service authorization.
            </span>
          </div>
        ) : (
          /* ── Blockers — show backend messages verbatim (no string guessing) ── */
          <div className="space-y-1.5">
            <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">
              {blockers.length} blocker{blockers.length !== 1 ? "s" : ""} remaining
            </p>
            <ul className="space-y-1.5">
              {blockers.map((blocker, idx) => (
                <li
                  key={idx}
                  className="flex items-start gap-2 text-xs"
                >
                  <XCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0 mt-0.5" />
                  <span className="text-foreground">{blocker}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* ── RTS navigation button ──────────────────────────────────────────
            Disabled when there are still blockers. When enabled, opens the
            RTS page which calls authorizeReturnToService with all required
            fields (signatureAuthEventId, statement, hours).
        ─────────────────────────────────────────────────────────────────── */}
        <Button
          className="w-full gap-2"
          variant={canClose ? "default" : "outline"}
          disabled={!canClose}
          onClick={handleGoToRts}
        >
          <ShieldCheck className="w-4 h-4" />
          Authorize Return to Service
          {canClose && <ArrowRight className="w-3.5 h-3.5 ml-auto" />}
        </Button>

        {!canClose && (
          <p className="text-[11px] text-muted-foreground text-center">
            Resolve all blockers above before authorizing RTS.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
