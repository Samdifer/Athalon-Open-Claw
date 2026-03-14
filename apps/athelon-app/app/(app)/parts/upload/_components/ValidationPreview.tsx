"use client";

import { Fragment, useState } from "react";
import { ChevronDown, ChevronRight, AlertCircle, CheckCircle2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  type MappedPartRow,
  type RowValidationResult,
  type DuplicateResolution,
} from "@/src/shared/lib/partsImport";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ValidationPreviewProps {
  organizationId: Id<"organizations">;
  mappedRows: MappedPartRow[];
  validationResults: RowValidationResult[];
  onProceed: (duplicateResolutions: Map<number, DuplicateResolution>) => void;
  onBack: () => void;
}

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: "valid" | "warning" | "error" }) {
  if (status === "valid") {
    return (
      <Badge className="bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30 text-[10px] h-5">
        Valid
      </Badge>
    );
  }
  if (status === "warning") {
    return (
      <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30 text-[10px] h-5">
        Warning
      </Badge>
    );
  }
  return (
    <Badge variant="destructive" className="text-[10px] h-5">
      Error
    </Badge>
  );
}

// ─── Single duplicate checker (per part number) ───────────────────────────────

interface DuplicateCardProps {
  organizationId: Id<"organizations">;
  row: MappedPartRow;
  rowIndex: number;
  resolution: DuplicateResolution | undefined;
  onResolve: (rowIndex: number, resolution: DuplicateResolution) => void;
}

function DuplicateCard({
  organizationId,
  row,
  rowIndex,
  resolution,
  onResolve,
}: DuplicateCardProps) {
  const exactMatches = useQuery(api.partsBulkUpload.checkExactDuplicate, {
    organizationId,
    partNumber: row.partNumber,
    serialNumber: row.serialNumber,
  });

  const nearMatches = useQuery(api.partsBulkUpload.checkNearMatchCandidates, {
    organizationId,
    partNumber: row.partNumber,
  });

  // Only show card if there are matches
  const hasExact = exactMatches && exactMatches.length > 0;
  const hasNear =
    nearMatches &&
    nearMatches.length > 0 &&
    !nearMatches.some((m) => m.partNumber === row.partNumber);

  if (!hasExact && !hasNear) return null;

  return (
    <Card className="border-amber-500/30 bg-amber-500/5">
      <CardHeader className="pb-2 pt-3 px-4">
        <CardTitle className="text-xs font-medium flex items-center gap-2">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
          <span className="font-mono">{row.partNumber}</span>
          {hasExact ? (
            <Badge className="bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30 text-[10px]">
              Exact match
            </Badge>
          ) : (
            <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30 text-[10px]">
              Near match
            </Badge>
          )}
          {resolution && (
            <Badge variant="secondary" className="ml-auto text-[10px]">
              Resolved: {resolution.action.replace("_", " ")}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-3">
        {/* New row vs existing */}
        {hasExact && exactMatches.slice(0, 2).map((existing) => (
          <div key={String(existing._id)} className="grid grid-cols-2 gap-3 text-xs">
            <div className="rounded bg-background/60 border border-border/60 p-2.5 space-y-1">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                New (from CSV)
              </p>
              <p className="font-mono font-medium">{row.partNumber}</p>
              <p>{row.partName}</p>
              {row.serialNumber && <p className="text-muted-foreground">S/N: {row.serialNumber}</p>}
              <p className="text-muted-foreground capitalize">{row.condition}</p>
              {row.quantityOnHand !== undefined && (
                <p className="text-muted-foreground">Qty: {row.quantityOnHand}</p>
              )}
            </div>
            <div className="rounded bg-background/60 border border-border/60 p-2.5 space-y-1">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                Existing in inventory
              </p>
              <p className="font-mono font-medium">{existing.partNumber}</p>
              <p>{existing.partName}</p>
              {existing.serialNumber && (
                <p className="text-muted-foreground">S/N: {existing.serialNumber}</p>
              )}
              <p className="text-muted-foreground capitalize">{existing.condition}</p>
              {existing.quantityOnHand !== undefined && (
                <p className="text-muted-foreground">Qty: {existing.quantityOnHand}</p>
              )}
              <p className="text-muted-foreground capitalize text-[10px]">
                Location: {existing.location.replace(/_/g, " ")}
              </p>
            </div>
          </div>
        ))}

        {hasNear && !hasExact && nearMatches.slice(0, 2).map((near) => (
          <div key={String(near._id)} className="grid grid-cols-2 gap-3 text-xs">
            <div className="rounded bg-background/60 border border-border/60 p-2.5 space-y-1">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                New (from CSV)
              </p>
              <p className="font-mono font-medium">{row.partNumber}</p>
              <p>{row.partName}</p>
            </div>
            <div className="rounded bg-background/60 border border-border/60 p-2.5 space-y-1">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                Similar in inventory
              </p>
              <p className="font-mono font-medium">{near.partNumber}</p>
              <p>{near.partName}</p>
              <p className="text-muted-foreground capitalize">{near.condition}</p>
            </div>
          </div>
        ))}

        {/* Resolution buttons */}
        <div className="flex items-center gap-2 pt-1">
          <Button
            size="sm"
            variant={resolution?.action === "skip" ? "default" : "outline"}
            className="h-7 text-xs"
            onClick={() => onResolve(rowIndex, { action: "skip" })}
          >
            Skip
          </Button>
          {hasExact && (
            <Button
              size="sm"
              variant={resolution?.action === "update_quantity" ? "default" : "outline"}
              className="h-7 text-xs"
              onClick={() =>
                onResolve(rowIndex, {
                  action: "update_quantity",
                  quantityDelta: row.quantityOnHand ?? 1,
                  existingPartId: String(exactMatches[0]._id),
                })
              }
            >
              Update Qty (+{row.quantityOnHand ?? 1})
            </Button>
          )}
          <Button
            size="sm"
            variant={resolution?.action === "keep_separate" ? "default" : "outline"}
            className="h-7 text-xs"
            onClick={() => onResolve(rowIndex, { action: "keep_separate" })}
          >
            Keep Separate
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ValidationPreview({
  organizationId,
  mappedRows,
  validationResults,
  onProceed,
  onBack,
}: ValidationPreviewProps) {
  const [expandedRow, setExpandedRow] = useState<number | null>(null);
  const [duplicateResolutions, setDuplicateResolutions] = useState<Map<number, DuplicateResolution>>(
    new Map(),
  );

  const validCount = validationResults.filter((r) => r.status === "valid").length;
  const warningCount = validationResults.filter((r) => r.status === "warning").length;
  const errorCount = validationResults.filter((r) => r.status === "error").length;
  const committableCount = validCount + warningCount;

  // Rows to check for duplicates (non-error rows only)
  const committableRows = mappedRows.filter(
    (_, idx) => validationResults[idx]?.status !== "error",
  );
  // Unique part numbers across committable rows (for near-match dedup display)
  const uniqueCommittablePNs = Array.from(
    new Set(committableRows.map((r, i) => ({ pn: r.partNumber, idx: i }))),
  );
  void uniqueCommittablePNs; // used for display below

  function handleResolve(rowIndex: number, resolution: DuplicateResolution) {
    setDuplicateResolutions((prev) => {
      const next = new Map(prev);
      next.set(rowIndex, resolution);
      return next;
    });
  }

  function handleCommit() {
    onProceed(duplicateResolutions);
  }

  return (
    <div className="space-y-5">
      {/* Summary bar */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="border-green-500/30 bg-green-500/5">
          <CardContent className="p-3 text-center">
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
              <span className="text-lg font-bold text-green-700 dark:text-green-400">{validCount}</span>
            </div>
            <p className="text-[11px] text-green-700 dark:text-green-400 font-medium">Ready</p>
          </CardContent>
        </Card>
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="p-3 text-center">
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span className="text-lg font-bold text-amber-700 dark:text-amber-400">{warningCount}</span>
            </div>
            <p className="text-[11px] text-amber-700 dark:text-amber-400 font-medium">Warnings</p>
          </CardContent>
        </Card>
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="p-3 text-center">
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <AlertCircle className="w-4 h-4 text-destructive" />
              <span className="text-lg font-bold text-destructive">{errorCount}</span>
            </div>
            <p className="text-[11px] text-destructive font-medium">Errors</p>
          </CardContent>
        </Card>
      </div>

      {errorCount > 0 && (
        <p className="text-xs text-muted-foreground">
          Error rows will be skipped during commit. Only rows with{" "}
          <span className="font-medium">Valid</span> or{" "}
          <span className="font-medium">Warning</span> status ({committableCount} rows) will be committed.
        </p>
      )}

      {/* Preview table */}
      <Card className="border-border/60">
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm">Row Preview</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-auto max-h-[50vh]">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-muted/80 backdrop-blur-sm">
                <tr className="border-b border-border/60">
                  <th className="text-left px-4 py-2 font-medium text-muted-foreground w-14">#</th>
                  <th className="text-left px-4 py-2 font-medium text-muted-foreground">Part Number</th>
                  <th className="text-left px-4 py-2 font-medium text-muted-foreground">Part Name</th>
                  <th className="text-left px-4 py-2 font-medium text-muted-foreground">Category</th>
                  <th className="text-left px-4 py-2 font-medium text-muted-foreground">Condition</th>
                  <th className="text-right px-4 py-2 font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {mappedRows.map((row, idx) => {
                  const result = validationResults[idx];
                  const isExpanded = expandedRow === idx;
                  const rowBg =
                    result?.status === "error"
                      ? "bg-red-500/5"
                      : result?.status === "warning"
                      ? "bg-amber-500/5"
                      : "";

                  return (
                    <Fragment key={idx}>
                      <tr
                        className={`border-b border-border/40 cursor-pointer hover:bg-muted/30 transition-colors ${rowBg}`}
                        onClick={() => setExpandedRow(isExpanded ? null : idx)}
                      >
                        <td className="px-4 py-2.5 text-muted-foreground">
                          <span className="flex items-center gap-1">
                            {isExpanded ? (
                              <ChevronDown className="w-3 h-3" />
                            ) : (
                              <ChevronRight className="w-3 h-3" />
                            )}
                            {idx + 1}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 font-mono font-medium">{row.partNumber || "—"}</td>
                        <td className="px-4 py-2.5 max-w-[200px] truncate">{row.partName || "—"}</td>
                        <td className="px-4 py-2.5 text-muted-foreground capitalize">
                          {row.partCategory ?? "—"}
                        </td>
                        <td className="px-4 py-2.5 text-muted-foreground capitalize">
                          {row.condition}
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          {result && <StatusBadge status={result.status} />}
                        </td>
                      </tr>
                      {isExpanded && result && (result.errors.length > 0 || result.warnings.length > 0) && (
                        <tr key={`${idx}-expanded`} className={`border-b border-border/40 ${rowBg}`}>
                          <td colSpan={6} className="px-4 py-3">
                            <div className="space-y-2 pl-4">
                              {result.errors.map((err, i) => (
                                <div key={`err-${i}`} className="flex items-start gap-2">
                                  <AlertCircle className="w-3.5 h-3.5 text-destructive mt-0.5 flex-shrink-0" />
                                  <div>
                                    <span className="font-medium text-destructive text-[11px]">
                                      {err.field}:
                                    </span>{" "}
                                    <span className="text-[11px] text-destructive/80">{err.message}</span>
                                  </div>
                                </div>
                              ))}
                              {result.warnings.map((warn, i) => (
                                <div key={`warn-${i}`} className="flex items-start gap-2">
                                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                                  <div>
                                    <span className="font-medium text-amber-700 dark:text-amber-400 text-[11px]">
                                      {warn.field}:
                                    </span>{" "}
                                    <span className="text-[11px] text-muted-foreground">{warn.message}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Duplicate resolution section */}
      {committableRows.length > 0 && (
        <div className="space-y-3">
          <div>
            <p className="text-sm font-medium">Duplicate Detection</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Checking for exact and near matches against your current inventory. Resolve any
              conflicts below before committing.
            </p>
          </div>

          <div className="space-y-3">
            {committableRows.map((row, localIdx) => {
              const originalIdx = mappedRows.indexOf(row);
              return (
                <DuplicateCard
                  key={originalIdx}
                  organizationId={organizationId}
                  row={row}
                  rowIndex={originalIdx}
                  resolution={duplicateResolutions.get(originalIdx)}
                  onResolve={handleResolve}
                />
              );
            })}
          </div>

          {committableRows.every((row) => {
            const originalIdx = mappedRows.indexOf(row);
            return !duplicateResolutions.has(originalIdx);
          }) && (
            <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              No duplicate conflicts detected — all {committableCount} rows are ready to commit.
            </p>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" onClick={onBack}>
          Back
        </Button>
        <Button
          size="sm"
          onClick={handleCommit}
          disabled={committableCount === 0}
        >
          Commit ({committableCount} parts)
        </Button>
        {committableCount === 0 && (
          <span className="text-xs text-muted-foreground">No valid rows to commit.</span>
        )}
      </div>
    </div>
  );
}
