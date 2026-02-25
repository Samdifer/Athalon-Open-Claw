"use client";

import Link from "next/link";
import { FileText, User, Gauge } from "lucide-react";
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
            <span className="text-red-400">*</span>
          </Label>
          <Input
            value={signatureAuthEventId}
            onChange={(e) => onSignatureAuthEventIdChange(e.target.value)}
            placeholder="Paste the signature auth event ID from the re-authentication step…"
            className="font-mono text-xs h-9"
          />
          <p className="text-[11px] text-muted-foreground">
            Obtain a 5-minute auth event from{" "}
            <Link
              href={`/work-orders/${workOrderId}/signature`}
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
            <span className="text-red-400">*</span>
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
        </div>

        {/* RTS Statement */}
        <div className="space-y-1.5">
          <Label className="text-xs font-medium flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-muted-foreground" />
              Return-to-Service Statement
              <span className="text-red-400">*</span>
            </span>
            <span
              className={`text-[11px] ${
                rtsStatement.trim().length < 50
                  ? "text-amber-400"
                  : "text-green-400"
              }`}
            >
              {rtsStatement.trim().length} / 50 min
            </span>
          </Label>
          <Textarea
            value={rtsStatement}
            onChange={(e) => onRtsStatementChange(e.target.value)}
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
