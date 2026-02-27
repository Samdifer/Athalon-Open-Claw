"use client";

import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useMutation } from "convex/react";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { NotFoundCard } from "@/components/NotFoundCard";
import { RtsChecklist } from "./_components/RtsChecklist";
import { RtsSignoffForm } from "./_components/RtsSignoffForm";
import { derivePreconditions } from "./_components/derivePreconditions";

export default function RtsPage() {
  const params = useParams<{ id: string }>();
  const workOrderId = params.id as Id<"workOrders">;
  const { orgId } = useCurrentOrg();

  // Form state
  const [rtsStatement, setRtsStatement] = useState("");
  const [aircraftHoursAtRts, setAircraftHoursAtRts] = useState("");
  const [limitations, setLimitations] = useState("");
  const [signatureAuthEventId, setSignatureAuthEventId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successRtsId, setSuccessRtsId] = useState<string | null>(null);

  // Queries
  const report = useQuery(
    api.returnToService.getCloseReadinessReport,
    orgId && workOrderId
      ? { workOrderId, organizationId: orgId }
      : "skip",
  );

  // Mutation
  const authorizeRts = useMutation(
    api.returnToService.authorizeReturnToService,
  );

  // Handle submit
  async function handleAuthorize() {
    if (!orgId || !workOrderId) return;
    const hours = parseFloat(aircraftHoursAtRts);
    if (isNaN(hours)) {
      setSubmitError("Please enter valid aircraft hours.");
      return;
    }
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const rtsId = await authorizeRts({
        workOrderId,
        signatureAuthEventId: signatureAuthEventId.trim() as Id<"signatureAuthEvents">,
        returnToServiceStatement: rtsStatement.trim(),
        aircraftHoursAtRts: hours,
        limitations: limitations.trim() || undefined,
      });
      setSuccessRtsId(rtsId);
    } catch (err: unknown) {
      setSubmitError(
        err instanceof Error ? err.message : "An unexpected error occurred.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  // ── Success State ──────────────────────────────────────────────────────────
  if (successRtsId) {
    return (
      <div className="space-y-5">
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="h-7 -ml-2 text-xs text-muted-foreground"
        >
          <Link to={`/work-orders/${workOrderId}`}>
            <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
            Work Order
          </Link>
        </Button>
        <Card className="border-green-500/30 bg-green-500/5">
          <CardContent className="p-6 text-center">
            <CheckCircle2 className="w-10 h-10 text-green-600 dark:text-green-400 mx-auto mb-3" />
            <h2 className="text-lg font-semibold text-foreground mb-1">
              Aircraft Returned to Service
            </h2>
            <p className="text-sm text-muted-foreground mb-3">
              The return-to-service record has been created and the aircraft is
              now airworthy.
            </p>
            <p className="font-mono text-xs text-muted-foreground bg-muted/50 px-3 py-2 rounded inline-block">
              RTS Record ID: {successRtsId}
            </p>
            <div className="mt-4">
              <Button asChild variant="outline" size="sm">
                <Link to="/work-orders">Back to Work Orders</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Loading ────────────────────────────────────────────────────────────────
  if (report === undefined) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-7 w-32" />
        <Skeleton className="h-8 w-64" />
        <div className="space-y-2">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      </div>
    );
  }

  // ── Not Found ──────────────────────────────────────────────────────────────
  if (report === null) {
    return (
      <NotFoundCard
        message="Work order not found. It may have been deleted or the link is invalid."
        backHref="/work-orders"
        backLabel="Back to Work Orders"
      />
    );
  }

  // Derive all 9 preconditions
  const preconditions = derivePreconditions(
    report,
    rtsStatement,
    signatureAuthEventId,
  );
  const allPass = preconditions.every((p) => p.status === "PASS");
  const anyFail = preconditions.some((p) => p.status === "FAIL");

  return (
    <div className="space-y-5">
      {/* Back */}
      <Button
        asChild
        variant="ghost"
        size="sm"
        className="h-7 -ml-2 text-xs text-muted-foreground"
      >
        <Link to={`/work-orders/${workOrderId}`}>
          <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
          {report.workOrderNumber}
        </Link>
      </Button>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-foreground flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-muted-foreground" />
            Return to Service Authorization
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            <span className="font-mono">{report.workOrderNumber}</span>
            {" · "}
            <span className="font-mono font-semibold">
              {report.aircraftRegistration}
            </span>{" "}
            {report.aircraftMake} {report.aircraftModel}
          </p>
        </div>
        <Badge
          variant="outline"
          className={`text-[11px] font-medium border ${
            report.isReadyForRts
              ? "bg-green-500/15 text-green-600 dark:text-green-400 border-green-500/30"
              : "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30"
          }`}
        >
          {report.isReadyForRts
            ? "Ready for RTS"
            : `${report.blockers.length} Blocker${report.blockers.length !== 1 ? "s" : ""}`}
        </Badge>
      </div>

      {/* 9 Preconditions */}
      <RtsChecklist preconditions={preconditions} />

      {/* RTS Form */}
      <RtsSignoffForm
        workOrderId={workOrderId}
        signatureAuthEventId={signatureAuthEventId}
        onSignatureAuthEventIdChange={setSignatureAuthEventId}
        aircraftHoursAtRts={aircraftHoursAtRts}
        onAircraftHoursAtRtsChange={setAircraftHoursAtRts}
        rtsStatement={rtsStatement}
        onRtsStatementChange={setRtsStatement}
        limitations={limitations}
        onLimitationsChange={setLimitations}
        currentHoursOnFile={report.aircraftCurrentHours}
      />

      {/* Error Display */}
      {submitError && (
        <Card className="border-red-500/30 bg-red-500/5">
          <CardContent className="p-3 flex items-start gap-2.5">
            <XCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-red-600 dark:text-red-400 mb-0.5">
                RTS Authorization Failed
              </p>
              <p className="text-[11px] text-red-500/80 dark:text-red-300/80">{submitError}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Authorize Button */}
      <div className="flex items-center justify-between">
        <div className="text-[11px] text-muted-foreground">
          {allPass
            ? "All preconditions passed — ready to authorize."
            : anyFail
              ? "One or more preconditions are failing. Resolve all FAIL conditions before authorizing."
              : "Complete all required fields above."}
        </div>
        <Button
          onClick={handleAuthorize}
          disabled={!allPass || isSubmitting}
          className="gap-2"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Authorizing…
            </>
          ) : (
            <>
              <ShieldCheck className="w-4 h-4" />
              Authorize Return to Service
            </>
          )}
        </Button>
      </div>

      {anyFail && !allPass && (
        <Card className="border-red-500/20 bg-red-500/5">
          <CardContent className="p-3">
            <p className="text-xs text-red-600 dark:text-red-400 font-medium mb-1.5 flex items-center gap-1.5">
              <XCircle className="w-3.5 h-3.5" />
              The following conditions are blocking RTS authorization:
            </p>
            <ul className="space-y-1">
              {preconditions
                .filter((p) => p.status === "FAIL")
                .map((p) => (
                  <li
                    key={p.id}
                    className="text-[11px] text-muted-foreground flex items-start gap-1.5"
                  >
                    <span className="text-red-600 dark:text-red-400 font-mono font-bold">✗</span>
                    <span>
                      <strong>{p.label}:</strong>{" "}
                      {p.failureMessage ?? p.description}
                    </span>
                  </li>
                ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
