"use client";

import { useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, AlertCircle, Download, ExternalLink, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { CommitResult } from "./CommitProgress";
import type { MappedPartRow } from "@/src/shared/lib/partsImport";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ResultsReportProps {
  results: CommitResult[];
  batchId: string;
  mappedRows: MappedPartRow[];
  onUploadAnother: () => void;
}

type ErrorFilter = "all" | "error";

// ─── CSV export helper ────────────────────────────────────────────────────────

function downloadCsv(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// ─── Condition badge ──────────────────────────────────────────────────────────

function ConditionBadge({ condition }: { condition: string }) {
  const colorMap: Record<string, string> = {
    new: "bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30",
    serviceable: "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30",
    overhauled: "bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-500/30",
    repaired: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30",
    unserviceable: "bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30",
    quarantine: "bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-500/30",
    scrapped: "bg-gray-500/15 text-gray-700 dark:text-gray-400 border-gray-500/30",
  };
  const cls = colorMap[condition] ?? "bg-secondary text-secondary-foreground";
  return (
    <Badge className={`${cls} text-[10px] h-5 capitalize`}>
      {condition}
    </Badge>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ResultsReport({ results, batchId, mappedRows, onUploadAnother }: ResultsReportProps) {
  const [errorFilter, setErrorFilter] = useState<ErrorFilter>("all");

  const successResults = results.filter((r) => r.success);
  const failResults = results.filter((r) => !r.success);

  function handleExportSuccess() {
    const rows = successResults.map((r) => {
      const row = mappedRows[r.rowIndex];
      if (!row) return null;
      return [
        row.partNumber,
        row.partName,
        row.condition,
        row.partCategory ?? "",
        row.supplier ?? "",
        r.partId ?? "",
      ];
    }).filter(Boolean) as string[][];

    const header = "Part Number,Part Name,Condition,Category,Supplier,Part ID";
    const csv = [header, ...rows.map((r) => r.map((c) => `"${c}"`).join(","))].join("\n");
    downloadCsv(`parts-import-success-${batchId.slice(0, 8)}.csv`, csv);
  }

  function handleExportErrors() {
    const rows = failResults.map((r) => {
      const row = mappedRows[r.rowIndex];
      return [
        String(r.rowIndex + 1),
        row?.partNumber ?? "",
        row?.partName ?? "",
        r.error ?? "Unknown error",
      ];
    });

    const header = "Row #,Part Number,Part Name,Error";
    const csv = [header, ...rows.map((r) => r.map((c) => `"${c}"`).join(","))].join("\n");
    downloadCsv(`parts-import-errors-${batchId.slice(0, 8)}.csv`, csv);
  }

  const filteredErrors = errorFilter === "all" ? failResults : failResults;

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="border-green-500/30 bg-green-500/5">
          <CardContent className="p-4 flex items-center gap-3">
            <CheckCircle2 className="w-8 h-8 text-green-500 flex-shrink-0" />
            <div>
              <p className="text-2xl font-bold text-green-700 dark:text-green-400">
                {successResults.length}
              </p>
              <p className="text-xs text-green-700 dark:text-green-400 font-medium">
                Parts added to inventory
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className={failResults.length > 0 ? "border-destructive/30 bg-destructive/5" : "border-border/60"}>
          <CardContent className="p-4 flex items-center gap-3">
            <AlertCircle
              className={`w-8 h-8 flex-shrink-0 ${
                failResults.length > 0 ? "text-destructive" : "text-muted-foreground"
              }`}
            />
            <div>
              <p className={`text-2xl font-bold ${failResults.length > 0 ? "text-destructive" : "text-muted-foreground"}`}>
                {failResults.length}
              </p>
              <p className={`text-xs font-medium ${failResults.length > 0 ? "text-destructive" : "text-muted-foreground"}`}>
                Rows failed
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="success">
        <TabsList className="w-full">
          <TabsTrigger value="success" className="flex-1">
            Successfully Added ({successResults.length})
          </TabsTrigger>
          <TabsTrigger value="errors" className="flex-1">
            Errors & Warnings ({failResults.length})
          </TabsTrigger>
        </TabsList>

        {/* Success tab */}
        <TabsContent value="success" className="space-y-3 mt-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              {successResults.length} part{successResults.length !== 1 ? "s" : ""} added to
              inventory and queued for receiving inspection.
            </p>
            {successResults.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 h-7 text-xs"
                onClick={handleExportSuccess}
              >
                <Download className="w-3.5 h-3.5" />
                Export CSV
              </Button>
            )}
          </div>

          {successResults.length === 0 ? (
            <Card className="border-border/60">
              <CardContent className="p-6 text-center">
                <p className="text-sm text-muted-foreground">No parts were successfully added.</p>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-border/60">
              <CardContent className="p-0">
                <div className="overflow-auto max-h-[60vh]">
                  <div className="divide-y divide-border/40">
                    {successResults.map((r) => {
                      const row = mappedRows[r.rowIndex];
                      if (!row) return null;
                      return (
                        <div
                          key={r.rowIndex}
                          className="flex items-center gap-3 px-4 py-3"
                        >
                          <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-semibold text-sm">
                                {row.partNumber}
                              </span>
                              <ConditionBadge condition={row.condition} />
                            </div>
                            <p className="text-xs text-muted-foreground truncate mt-0.5">
                              {row.partName}
                              {row.supplier && ` · ${row.supplier}`}
                            </p>
                          </div>
                          {r.partId && (
                            <Button asChild variant="ghost" size="sm" className="h-7 text-xs shrink-0">
                              <Link to={`/parts/${r.partId}`}>
                                <ExternalLink className="w-3 h-3 mr-1" />
                                View
                              </Link>
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Errors tab */}
        <TabsContent value="errors" className="space-y-3 mt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <p className="text-xs text-muted-foreground">
                {failResults.length} row{failResults.length !== 1 ? "s" : ""} could not be committed.
              </p>
              <div className="flex items-center gap-1">
                <Button
                  variant={errorFilter === "all" ? "secondary" : "ghost"}
                  size="sm"
                  className="h-6 text-xs"
                  onClick={() => setErrorFilter("all")}
                >
                  All
                </Button>
                <Button
                  variant={errorFilter === "error" ? "secondary" : "ghost"}
                  size="sm"
                  className="h-6 text-xs"
                  onClick={() => setErrorFilter("error")}
                >
                  Errors only
                </Button>
              </div>
            </div>
            {failResults.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 h-7 text-xs"
                onClick={handleExportErrors}
              >
                <Download className="w-3.5 h-3.5" />
                Export Error Report
              </Button>
            )}
          </div>

          {failResults.length === 0 ? (
            <Card className="border-green-500/30 bg-green-500/5">
              <CardContent className="p-6 text-center">
                <CheckCircle2 className="w-8 h-8 text-green-500 mx-auto mb-2" />
                <p className="text-sm text-green-700 dark:text-green-400 font-medium">
                  No errors — all rows committed successfully!
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-border/60">
              <CardContent className="p-0">
                <div className="overflow-auto max-h-[60vh]">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-muted/80 backdrop-blur-sm">
                      <tr className="border-b border-border/60">
                        <th className="text-left px-4 py-2 font-medium text-muted-foreground w-14">Row</th>
                        <th className="text-left px-4 py-2 font-medium text-muted-foreground">Part Number</th>
                        <th className="text-left px-4 py-2 font-medium text-muted-foreground">Error Message</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredErrors.map((r) => {
                        const row = mappedRows[r.rowIndex];
                        return (
                          <tr key={r.rowIndex} className="border-b border-border/40 bg-destructive/5">
                            <td className="px-4 py-2.5 text-muted-foreground">{r.rowIndex + 1}</td>
                            <td className="px-4 py-2.5 font-mono font-medium">
                              {row?.partNumber ?? "—"}
                            </td>
                            <td className="px-4 py-2.5 text-destructive/80 max-w-[400px]">
                              {r.error ?? "Unknown error"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Footer links */}
      <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-border/60">
        <Button asChild variant="ghost" size="sm" className="gap-1.5">
          <Link to="/parts/upload/issues">
            <ExternalLink className="w-3.5 h-3.5" />
            View Issue Queue
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link to="/parts">Back to Parts Inventory</Link>
        </Button>
        <Button
          variant="secondary"
          size="sm"
          className="gap-1.5 ml-auto"
          onClick={onUploadAnother}
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Upload Another Batch
        </Button>
      </div>
    </div>
  );
}
