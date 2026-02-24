"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import Link from "next/link";
import {
  ArrowLeft,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Loader2,
  FileText,
  ClipboardCheck,
  User,
  Gauge,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { NotFoundCard } from "@/components/NotFoundCard";

// ─── Types ────────────────────────────────────────────────────────────────────

type PreconditionStatus = "PASS" | "FAIL" | "PENDING";

interface Precondition {
  id: string;
  label: string;
  description: string;
  status: PreconditionStatus;
  failureMessage?: string;
}

// ─── Precondition Badge ───────────────────────────────────────────────────────

function PreconditionBadge({ status }: { status: PreconditionStatus }) {
  if (status === "PASS") {
    return (
      <Badge variant="outline" className="bg-green-500/15 text-green-400 border-green-500/30 text-[10px] font-bold w-16 justify-center">
        <CheckCircle2 className="w-2.5 h-2.5 mr-1" />
        PASS
      </Badge>
    );
  }
  if (status === "FAIL") {
    return (
      <Badge variant="outline" className="bg-red-500/15 text-red-400 border-red-500/30 text-[10px] font-bold w-16 justify-center">
        <XCircle className="w-2.5 h-2.5 mr-1" />
        FAIL
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="bg-amber-500/15 text-amber-400 border-amber-500/30 text-[10px] font-bold w-16 justify-center">
      <Clock className="w-2.5 h-2.5 mr-1" />
      PENDING
    </Badge>
  );
}

// ─── Derive 9 Preconditions from report ──────────────────────────────────────

function derivePreconditions(
  report: NonNullable<ReturnType<typeof useQuery<typeof api.returnToService.getCloseReadinessReport>>>,
  rtsStatement: string,
  signatureAuthEventId: string,
): Precondition[] {
  const hasBlocker = (code: string) =>
    report.blockers.some((b: { code: string }) => b.code === code);
  const getBlocker = (code: string) =>
    report.blockers.find((b: { code: string; description: string }) => b.code === code);

  // PRE-1: Signature auth event
  const pre1Blocker = getBlocker("RTS_AUTH_EVENT_NOT_FOUND") ??
    getBlocker("RTS_AUTH_EVENT_CONSUMED") ??
    getBlocker("RTS_AUTH_EVENT_EXPIRED") ??
    getBlocker("RTS_AUTH_EVENT_WRONG_TABLE");
  const pre1Status: PreconditionStatus = !signatureAuthEventId.trim()
    ? "PENDING"
    : pre1Blocker
    ? "FAIL"
    : "PASS";

  // PRE-2: Work order state
  const pre2Blocker = getBlocker("RTS_WRONG_WO_STATUS");
  const pre2Status: PreconditionStatus = pre2Blocker
    ? "FAIL"
    : report.workOrderStatus === "pending_signoff"
    ? "PASS"
    : "PENDING";

  // PRE-3: Aircraft total time consistent
  const pre3Blocker = getBlocker("RTS_AIRCRAFT_TIME_MISMATCH") ??
    getBlocker("RTS_AIRCRAFT_TIME_DECREASED");
  const pre3Status: PreconditionStatus = pre3Blocker
    ? "FAIL"
    : report.aircraftCurrentHours != null
    ? "PASS"
    : "PENDING";

  // PRE-4: All task cards complete
  const pre4Blocker = getBlocker("RTS_OPEN_TASK_CARDS") ??
    getBlocker("RTS_UNREVIEWED_NA_STEPS");
  const pre4Status: PreconditionStatus = pre4Blocker
    ? "FAIL"
    : report.taskCards.every((tc: { isBlocking: boolean }) => !tc.isBlocking)
    ? "PASS"
    : "PENDING";

  // PRE-5: All discrepancies dispositioned
  const pre5Blocker = getBlocker("RTS_OPEN_DISCREPANCIES");
  const pre5Status: PreconditionStatus = pre5Blocker
    ? "FAIL"
    : report.discrepancies.every((d: { isBlocking: boolean }) => !d.isBlocking)
    ? "PASS"
    : "PENDING";

  // PRE-6: Signing technician authorized (checked at mutation time)
  const pre6Blocker = getBlocker("RTS_TECH_NOT_CERTIFICATED") ??
    getBlocker("RTS_TECH_NO_IA") ??
    getBlocker("RTS_TECH_IA_EXPIRED");
  const pre6Status: PreconditionStatus = pre6Blocker
    ? "FAIL"
    : signatureAuthEventId.trim()
    ? "PASS"
    : "PENDING";

  // PRE-7: AD compliance reviewed (annual/100hr only)
  const pre7Blocker = getBlocker("RTS_AD_OVERDUE") ??
    getBlocker("RTS_AD_REVIEW_NOT_DOCUMENTED");
  const pre7Status: PreconditionStatus = pre7Blocker
    ? "FAIL"
    : report.adComplianceSummary === null
    ? "PASS" // Not required for this WO type
    : report.adComplianceSummary.every((ad: { isBlocking: boolean }) => !ad.isBlocking) &&
      report.inspectionRecordSummary?.adComplianceReviewed !== false
    ? "PASS"
    : "PENDING";

  // PRE-8: Required signatures on maintenance records
  const pre8Blocker = getBlocker("RTS_UNSIGNED_RECORD") ??
    getBlocker("RTS_NO_MAINTENANCE_RECORDS");
  const pre8Status: PreconditionStatus = pre8Blocker
    ? "FAIL"
    : report.maintenanceRecords.length > 0 &&
      report.maintenanceRecords.every((r: { isBlocking: boolean }) => !r.isBlocking)
    ? "PASS"
    : "PENDING";

  // PRE-9: RTS statement provided (UI check)
  const pre9Status: PreconditionStatus = rtsStatement.trim().length === 0
    ? "PENDING"
    : rtsStatement.trim().length < 50
    ? "FAIL"
    : "PASS";

  return [
    {
      id: "pre-1",
      label: "Signature Auth Event",
      description: "A valid, unconsumed re-authentication event for return-to-service signing.",
      status: pre1Status,
      failureMessage: pre1Blocker?.description ??
        (pre1Status === "FAIL" ? "Auth event invalid or not provided." : undefined),
    },
    {
      id: "pre-2",
      label: "Work Order in Pending Sign-Off",
      description: `Work order must be in "pending_signoff" status. Current: "${report.workOrderStatus}".`,
      status: pre2Status,
      failureMessage: pre2Blocker?.description,
    },
    {
      id: "pre-3",
      label: "Aircraft Total Time Consistent",
      description: `Aircraft hours on file: ${report.aircraftCurrentHours?.toFixed(1) ?? "Unknown"} hr. Hours at RTS must be ≥ recorded value.`,
      status: pre3Status,
      failureMessage: pre3Blocker?.description,
    },
    {
      id: "pre-4",
      label: "All Task Cards Complete",
      description: `${report.taskCards.filter((tc: { isBlocking: boolean }) => tc.isBlocking).length} of ${report.taskCards.length} task cards still require attention.`,
      status: pre4Status,
      failureMessage: pre4Blocker?.description,
    },
    {
      id: "pre-5",
      label: "All Discrepancies Dispositioned",
      description: `${report.discrepancies.filter((d: { isBlocking: boolean }) => d.isBlocking).length} of ${report.discrepancies.length} discrepancies require attention.`,
      status: pre5Status,
      failureMessage: pre5Blocker?.description,
    },
    {
      id: "pre-6",
      label: "Technician Authorized (IA Current)",
      description: "Signing technician must hold a current Inspection Authorization. Verified at signature time.",
      status: pre6Status,
      failureMessage: pre6Blocker?.description,
    },
    {
      id: "pre-7",
      label: "AD Compliance Reviewed",
      description: report.adComplianceSummary === null
        ? "Not required for this work order type."
        : `${report.adComplianceSummary.filter((ad: { isBlocking: boolean }) => ad.isBlocking).length} applicable AD(s) require attention.`,
      status: pre7Status,
      failureMessage: pre7Blocker?.description,
    },
    {
      id: "pre-8",
      label: "Maintenance Records Signed",
      description: `${report.maintenanceRecords.filter((r: { isBlocking: boolean }) => r.isBlocking).length} of ${report.maintenanceRecords.length} maintenance record(s) are not signed.`,
      status: pre8Status,
      failureMessage: pre8Blocker?.description,
    },
    {
      id: "pre-9",
      label: "RTS Statement Provided (≥ 50 chars)",
      description: `Return-to-service certification statement. Current length: ${rtsStatement.trim().length} characters.`,
      status: pre9Status,
      failureMessage:
        pre9Status === "FAIL"
          ? `Statement is ${rtsStatement.trim().length} characters. Minimum 50 required per 14 CFR 43.9.`
          : undefined,
    },
  ];
}

// ─── Page ─────────────────────────────────────────────────────────────────────

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
  const authorizeRts = useMutation(api.returnToService.authorizeReturnToService);

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
      setSubmitError(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  }

  // ── Success State ──────────────────────────────────────────────────────────
  if (successRtsId) {
    return (
      <div className="space-y-5">
        <Button asChild variant="ghost" size="sm" className="h-7 -ml-2 text-xs text-muted-foreground">
          <Link href={`/work-orders/${workOrderId}`}>
            <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
            Work Order
          </Link>
        </Button>
        <Card className="border-green-500/30 bg-green-500/5">
          <CardContent className="p-6 text-center">
            <CheckCircle2 className="w-10 h-10 text-green-400 mx-auto mb-3" />
            <h2 className="text-lg font-semibold text-foreground mb-1">Aircraft Returned to Service</h2>
            <p className="text-sm text-muted-foreground mb-3">
              The return-to-service record has been created and the aircraft is now airworthy.
            </p>
            <p className="font-mono text-xs text-muted-foreground bg-muted/50 px-3 py-2 rounded inline-block">
              RTS Record ID: {successRtsId}
            </p>
            <div className="mt-4">
              <Button asChild variant="outline" size="sm">
                <Link href={`/work-orders`}>Back to Work Orders</Link>
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
  const preconditions = derivePreconditions(report, rtsStatement, signatureAuthEventId);
  const allPass = preconditions.every((p) => p.status === "PASS");
  const anyFail = preconditions.some((p) => p.status === "FAIL");

  return (
    <div className="space-y-5">
      {/* Back */}
      <Button asChild variant="ghost" size="sm" className="h-7 -ml-2 text-xs text-muted-foreground">
        <Link href={`/work-orders/${workOrderId}`}>
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
            <span className="font-mono font-semibold">{report.aircraftRegistration}</span>
            {" "}
            {report.aircraftMake} {report.aircraftModel}
          </p>
        </div>
        <Badge
          variant="outline"
          className={`text-[11px] font-medium border ${
            report.isReadyForRts
              ? "bg-green-500/15 text-green-400 border-green-500/30"
              : "bg-amber-500/15 text-amber-400 border-amber-500/30"
          }`}
        >
          {report.isReadyForRts ? "Ready for RTS" : `${report.blockers.length} Blocker${report.blockers.length !== 1 ? "s" : ""}`}
        </Badge>
      </div>

      {/* 9 Preconditions */}
      <Card className="border-border/60">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
            <ClipboardCheck className="w-3.5 h-3.5" />
            RTS Preconditions — All 9 Must Pass
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-1">
            {preconditions.map((pre, idx) => (
              <div key={pre.id}>
                {idx > 0 && <Separator className="opacity-20 my-1" />}
                <div className={`flex items-start gap-3 py-2 rounded-md px-2 ${pre.status === "FAIL" ? "bg-red-500/5" : ""}`}>
                  <div className="flex-shrink-0 mt-0.5">
                    <PreconditionBadge status={pre.status} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-mono text-[10px] text-muted-foreground/60">
                        {String(idx + 1).padStart(2, "0")}
                      </span>
                      <p className="text-xs font-medium text-foreground">{pre.label}</p>
                    </div>
                    <p className="text-[11px] text-muted-foreground">{pre.description}</p>
                    {pre.status === "FAIL" && pre.failureMessage && (
                      <div className="mt-1.5 flex items-start gap-1.5">
                        <AlertTriangle className="w-3 h-3 text-red-400 flex-shrink-0 mt-0.5" />
                        <p className="text-[11px] text-red-400">{pre.failureMessage}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* RTS Form */}
      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
            <FileText className="w-3.5 h-3.5" />
            Return-to-Service Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Auth Event ID */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-muted-foreground" />
              Signature Auth Event ID
              <span className="text-red-400">*</span>
            </Label>
            <Input
              value={signatureAuthEventId}
              onChange={(e) => setSignatureAuthEventId(e.target.value)}
              placeholder="Paste the signature auth event ID from the re-authentication step…"
              className="font-mono text-xs h-9"
            />
            <p className="text-[11px] text-muted-foreground">
              Obtain a 5-minute auth event from{" "}
              <Link href={`/work-orders/${workOrderId}/signature`} className="text-primary hover:underline">
                the signature page
              </Link>
              . Auth events are single-use.
            </p>
          </div>

          {/* Aircraft Hours at RTS */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium flex items-center gap-1.5">
              <Gauge className="w-3.5 h-3.5 text-muted-foreground" />
              Aircraft Total Time at RTS (hours)
              <span className="text-red-400">*</span>
            </Label>
            <Input
              type="number"
              step="0.1"
              min="0"
              value={aircraftHoursAtRts}
              onChange={(e) => setAircraftHoursAtRts(e.target.value)}
              placeholder={`Current on file: ${report.aircraftCurrentHours?.toFixed(1) ?? "?"} hr`}
              className="font-mono text-xs h-9 w-48"
            />
          </div>

          {/* RTS Statement */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                Return-to-Service Statement
                <span className="text-red-400">*</span>
              </span>
              <span className={`text-[11px] ${rtsStatement.trim().length < 50 ? "text-amber-400" : "text-green-400"}`}>
                {rtsStatement.trim().length} / 50 min
              </span>
            </Label>
            <Textarea
              value={rtsStatement}
              onChange={(e) => setRtsStatement(e.target.value)}
              placeholder="I certify that this aircraft has been inspected and returned to airworthy condition in accordance with 14 CFR Part 43…"
              rows={4}
              className="text-xs resize-none"
            />
            <p className="text-[11px] text-muted-foreground">
              Per 14 CFR 43.9, this statement must describe the work performed and certify the aircraft is airworthy. Minimum 50 characters.
            </p>
          </div>

          {/* Limitations (optional) */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">
              Limitations / MEL Deferrals (optional)
            </Label>
            <Textarea
              value={limitations}
              onChange={(e) => setLimitations(e.target.value)}
              placeholder="List any MEL deferrals, operational limitations, or conditions on airworthiness…"
              rows={2}
              className="text-xs resize-none"
            />
          </div>
        </CardContent>
      </Card>

      {/* Error Display */}
      {submitError && (
        <Card className="border-red-500/30 bg-red-500/5">
          <CardContent className="p-3 flex items-start gap-2.5">
            <XCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-red-400 mb-0.5">RTS Authorization Failed</p>
              <p className="text-[11px] text-red-300/80">{submitError}</p>
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
            <p className="text-xs text-red-400 font-medium mb-1.5 flex items-center gap-1.5">
              <XCircle className="w-3.5 h-3.5" />
              The following conditions are blocking RTS authorization:
            </p>
            <ul className="space-y-1">
              {preconditions
                .filter((p) => p.status === "FAIL")
                .map((p) => (
                  <li key={p.id} className="text-[11px] text-muted-foreground flex items-start gap-1.5">
                    <span className="text-red-400 font-mono font-bold">✗</span>
                    <span><strong>{p.label}:</strong> {p.failureMessage ?? p.description}</span>
                  </li>
                ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
