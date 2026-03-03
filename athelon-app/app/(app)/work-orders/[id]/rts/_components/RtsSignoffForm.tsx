"use client";

import { Link } from "react-router-dom";
import { FileText, User, Gauge, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface RtsSignoffFormProps {
  workOrderId: string;
  signatureAuthEventId: string;
  onSignatureAuthEventIdChange: (value: string) => void;
  aircraftHoursAtRts: string;
  onAircraftHoursAtRtsChange: (value: string) => void;
  rtsStatement: string;
  onRtsStatementChange: (value: string) => void;
  limitations: string;
  onLimitationsChange: (value: string) => void;
  currentHoursOnFile?: number | null;
}

// ─── Component ─────────────────────────────────────────────────────────────────

export function RtsSignoffForm({
  workOrderId,
  signatureAuthEventId,
  onSignatureAuthEventIdChange,
  aircraftHoursAtRts,
  onAircraftHoursAtRtsChange,
  rtsStatement,
  onRtsStatementChange,
  limitations,
  onLimitationsChange,
  currentHoursOnFile,
}: RtsSignoffFormProps) {
  return (
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
            <span className="text-red-600 dark:text-red-400">*</span>
          </Label>
          <Input
            value={signatureAuthEventId}
            onChange={(e) => onSignatureAuthEventIdChange(e.target.value)}
            placeholder="Paste the signature auth event ID from the re-authentication step…"
            className="font-mono text-xs h-9"
          />
          <p className="text-[11px] text-muted-foreground">
            Obtain a 5-minute auth event from{" "}
            {/* BUG-HUNTER-001: Include returnTo + intendedTable so the
                signature page can redirect back here automatically and the
                authEventId gets appended to the URL query string. Without
                these params the "Continue to Sign-Off" button never appears
                on the signature page and the user is stuck. */}
            <Link
              to={`/work-orders/${workOrderId}/signature?returnTo=/work-orders/${workOrderId}/rts&intendedTable=returnToService`}
              className="text-primary hover:underline"
            >
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
            <span className="text-red-600 dark:text-red-400">*</span>
          </Label>
          <Input
            type="number"
            step="0.1"
            min="0"
            value={aircraftHoursAtRts}
            onChange={(e) => onAircraftHoursAtRtsChange(e.target.value)}
            placeholder={`Current on file: ${currentHoursOnFile?.toFixed(1) ?? "?"} hr`}
            className="font-mono text-xs h-9 w-48"
          />
          {/* Real-time regression warning — catches PRE-3 failure before Authorize is clicked */}
          {aircraftHoursAtRts &&
            currentHoursOnFile != null &&
            !isNaN(parseFloat(aircraftHoursAtRts)) &&
            parseFloat(aircraftHoursAtRts) < currentHoursOnFile && (
              <div className="flex items-start gap-2 p-2 rounded-md border border-amber-500/40 bg-amber-500/5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                <p className="text-[11px] text-amber-600 dark:text-amber-400">
                  Entered hours ({parseFloat(aircraftHoursAtRts).toFixed(1)}) are less than aircraft
                  time on file ({currentHoursOnFile.toFixed(1)} hr). PRE-3 will fail — aircraft
                  total time cannot decrease.
                </p>
              </div>
            )}
        </div>

        {/* RTS Statement */}
        <div className="space-y-1.5">
          {/* BUG-QCM-054: RTS Statement textarea had no maxLength cap. BUG-LT-HUNT-054
              fixed the SignCardDialog textarea (2000-char limit) but the RTS page form
              was left unbounded. A QCM pasting a full AMM compliance reference excerpt
              could exceed the backend schema limit, triggering a cryptic validation error
              after committing their signature auth event — with no indication to trim.
              Now: maxLength=2000 with a live dual counter ("X / 50 min" for progress to
              minimum; amber "≥ 1900" warning when approaching the cap). */}
          <Label className="text-xs font-medium flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-muted-foreground" />
              Return-to-Service Statement
              <span className="text-red-600 dark:text-red-400">*</span>
            </span>
            <span
              className={`text-[11px] ${
                rtsStatement.trim().length >= 1900
                  ? "text-amber-600 dark:text-amber-400"
                  : rtsStatement.trim().length < 50
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-green-600 dark:text-green-400"
              }`}
            >
              {rtsStatement.trim().length < 50
                ? `${rtsStatement.trim().length} / 50 min`
                : `${rtsStatement.trim().length} / 2000`}
            </span>
          </Label>
          <Textarea
            value={rtsStatement}
            onChange={(e) => onRtsStatementChange(e.target.value.slice(0, 2000))}
            maxLength={2000}
            placeholder="I certify that this aircraft has been inspected and returned to airworthy condition in accordance with 14 CFR Part 43…"
            rows={4}
            className="text-xs resize-none"
          />
          <p className="text-[11px] text-muted-foreground">
            Per 14 CFR 43.9, this statement must describe the work performed
            and certify the aircraft is airworthy. Minimum 50 characters.
          </p>
        </div>

        {/* Limitations (optional) */}
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground">
            Limitations / MEL Deferrals (optional)
          </Label>
          <Textarea
            value={limitations}
            onChange={(e) => onLimitationsChange(e.target.value)}
            placeholder="List any MEL deferrals, operational limitations, or conditions on airworthiness…"
            rows={2}
            className="text-xs resize-none"
          />
        </div>
      </CardContent>
    </Card>
  );
}
