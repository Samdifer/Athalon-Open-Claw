"use client";

import { useState, useMemo } from "react";
import { CheckCircle2, XCircle, ArrowRight, Shield, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { ExtractionFieldConfidenceBadge } from "./ExtractionFieldConfidenceBadge";
import {
  computeFieldDiff,
  type ExtractedPartData,
  type FieldDiff,
  type FieldConfidence,
} from "@/src/shared/lib/documentIntelligence";

interface ExistingPart {
  _id: string;
  partNumber: string;
  partName: string;
  serialNumber?: string;
  condition: string;
  location: string;
  [key: string]: unknown;
}

export function ExistingPartDiffPanel({
  existingPart,
  extractedData,
  fieldConfidences,
  onApply,
  onSkip,
  applying,
}: {
  existingPart: ExistingPart;
  extractedData: ExtractedPartData;
  fieldConfidences: Partial<Record<string, FieldConfidence>>;
  onApply: (approvedFieldKeys: string[]) => void;
  onSkip: () => void;
  applying?: boolean;
}) {
  const diffs = useMemo(
    () => computeFieldDiff(existingPart, extractedData, fieldConfidences),
    [existingPart, extractedData, fieldConfidences],
  );

  const autoFillFields = diffs.filter((d) => d.autoApply);
  const conflictFields = diffs.filter((d) => d.requiresApproval);

  // Track user approval per conflict field — default is reject (false)
  const [approvals, setApprovals] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    for (const d of conflictFields) {
      initial[d.fieldKey] = false;
    }
    return initial;
  });

  const toggleApproval = (fieldKey: string) => {
    setApprovals((prev) => ({ ...prev, [fieldKey]: !prev[fieldKey] }));
  };

  const handleApply = () => {
    const approved = [
      ...autoFillFields.map((d) => d.fieldKey),
      ...conflictFields.filter((d) => approvals[d.fieldKey]).map((d) => d.fieldKey),
    ];
    onApply(approved);
  };

  const approvedConflictCount = Object.values(approvals).filter(Boolean).length;
  const totalChanges = autoFillFields.length + approvedConflictCount;

  if (diffs.length === 0) {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardContent className="py-4">
          <div className="flex items-center gap-2 text-green-700">
            <CheckCircle2 className="w-4 h-4" />
            <span className="text-sm font-medium">
              All extracted data matches the existing part — no changes needed.
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="py-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Shield className="w-4 h-4 text-blue-600" />
            Existing Part Found — Review Changes
          </CardTitle>
          <Link
            to={`/parts`}
            className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1"
          >
            View Part <ExternalLink className="w-3 h-3" />
          </Link>
        </div>
        <div className="flex gap-4 text-xs text-muted-foreground mt-1">
          <span>P/N: <span className="font-mono font-medium text-foreground">{existingPart.partNumber}</span></span>
          {existingPart.serialNumber && (
            <span>S/N: <span className="font-mono font-medium text-foreground">{existingPart.serialNumber}</span></span>
          )}
          <Badge variant="outline" className="text-[10px]">{existingPart.condition}</Badge>
        </div>
      </CardHeader>

      <CardContent className="pt-0 space-y-4">
        {/* Auto-fill section */}
        {autoFillFields.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
              <span className="text-xs font-medium text-green-700">
                Auto-fill ({autoFillFields.length} empty fields)
              </span>
            </div>
            <div className="rounded-md border border-green-200 bg-green-50/50 divide-y divide-green-100">
              {autoFillFields.map((diff) => (
                <DiffRow key={diff.fieldKey} diff={diff} mode="autofill" />
              ))}
            </div>
          </div>
        )}

        {/* Conflict section */}
        {conflictFields.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-3.5 h-3.5 text-amber-600" />
              <span className="text-xs font-medium text-amber-700">
                Requires Approval ({approvedConflictCount}/{conflictFields.length} approved)
              </span>
            </div>
            <div className="rounded-md border border-amber-200 bg-amber-50/50 divide-y divide-amber-100">
              {conflictFields.map((diff) => (
                <div key={diff.fieldKey} className="flex items-center gap-2 px-3 py-2">
                  <div className="flex-1">
                    <DiffRow diff={diff} mode="conflict" />
                  </div>
                  <Switch
                    checked={approvals[diff.fieldKey] ?? false}
                    onCheckedChange={() => toggleApproval(diff.fieldKey)}
                    disabled={applying}
                  />
                  <span className="text-[10px] text-muted-foreground w-14">
                    {approvals[diff.fieldKey] ? "Overwrite" : "Keep"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <Separator />

        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {totalChanges} field(s) will be updated
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onSkip} disabled={applying}>
              Skip
            </Button>
            <Button size="sm" onClick={handleApply} disabled={applying || totalChanges === 0}>
              {applying ? "Applying..." : `Apply ${totalChanges} Change${totalChanges !== 1 ? "s" : ""}`}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function DiffRow({
  diff,
  mode,
}: {
  diff: FieldDiff;
  mode: "autofill" | "conflict";
}) {
  return (
    <div className={`flex items-center gap-2 ${mode === "autofill" ? "px-3 py-2" : ""}`}>
      <span className="text-xs text-muted-foreground w-28 shrink-0 truncate">
        {diff.fieldLabel}
      </span>
      {mode === "conflict" && (
        <>
          <span className="text-xs font-mono line-through text-muted-foreground truncate max-w-[120px]">
            {String(diff.existingValue ?? "—")}
          </span>
          <ArrowRight className="w-3 h-3 text-muted-foreground shrink-0" />
        </>
      )}
      <span
        className={`text-xs font-mono truncate max-w-[160px] ${
          diff.confidence === "low" ? "text-amber-700" : "text-foreground"
        }`}
      >
        {String(diff.extractedValue)}
      </span>
      <ExtractionFieldConfidenceBadge confidence={diff.confidence} />
      {diff.confidence === "low" && (
        <span className="text-[10px] text-amber-600 italic">Verify</span>
      )}
    </div>
  );
}
