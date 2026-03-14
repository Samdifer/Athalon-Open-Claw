"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useAction, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import type { MappedPartRow, DuplicateResolution } from "@/src/shared/lib/partsImport";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CommitResult {
  rowIndex: number;
  success: boolean;
  partId?: string;
  error?: string;
}

interface CommitProgressProps {
  organizationId: Id<"organizations">;
  batchId: Id<"partUploadBatches">;
  rows: MappedPartRow[];
  duplicateResolutions: Map<number, DuplicateResolution>;
  validationStatuses: Array<"valid" | "warning" | "error">;
  onComplete: (results: CommitResult[]) => void;
}

const CHUNK_SIZE = 25;

// ─── Component ────────────────────────────────────────────────────────────────

export function CommitProgress({
  organizationId,
  batchId,
  rows,
  duplicateResolutions,
  validationStatuses,
  onComplete,
}: CommitProgressProps) {
  const commitChunk = useAction(api.partsBulkUpload.commitPartsBatch);
  const finalizeBatch = useMutation(api.partsBulkUpload.finalizeBatch);

  const [currentChunk, setCurrentChunk] = useState(0);
  const [totalChunks, setTotalChunks] = useState(0);
  const [successCount, setSuccessCount] = useState(0);
  const [failCount, setFailCount] = useState(0);
  const [statusMessage, setStatusMessage] = useState("Preparing commit…");
  const [progress, setProgress] = useState(0);
  const hasStarted = useRef(false);

  useEffect(() => {
    if (hasStarted.current) return;
    hasStarted.current = true;

    void (async () => {
      // 1. Filter rows: skip error rows and "skip" duplicate resolutions
      const committableRows = rows
        .map((row, idx) => ({ row, idx }))
        .filter(({ idx }) => {
          const status = validationStatuses[idx];
          if (status === "error") return false;
          const resolution = duplicateResolutions.get(idx);
          if (resolution?.action === "skip") return false;
          return true;
        });

      if (committableRows.length === 0) {
        setStatusMessage("No rows to commit.");
        await finalizeBatch({ batchId, successCount: 0, errorCount: 0, warningCount: 0 });
        onComplete([]);
        return;
      }

      // 2. Chunk
      const chunks: typeof committableRows[] = [];
      for (let i = 0; i < committableRows.length; i += CHUNK_SIZE) {
        chunks.push(committableRows.slice(i, i + CHUNK_SIZE));
      }
      setTotalChunks(chunks.length);

      const allResults: CommitResult[] = [];
      let totalSuccess = 0;
      let totalError = 0;

      for (let chunkIdx = 0; chunkIdx < chunks.length; chunkIdx++) {
        const chunk = chunks[chunkIdx];
        setCurrentChunk(chunkIdx + 1);
        setStatusMessage(`Processing chunk ${chunkIdx + 1} of ${chunks.length}…`);

        try {
          const chunkRows = chunk.map(({ row }) => ({
            partNumber: row.partNumber,
            partName: row.partName,
            condition: row.condition,
            isSerialized: row.isSerialized,
            isOwnerSupplied: row.isOwnerSupplied,
            isLifeLimited: row.isLifeLimited,
            hasShelfLifeLimit: row.hasShelfLifeLimit,
            receivingDate: row.receivingDate,
            description: row.description,
            serialNumber: row.serialNumber,
            supplier: row.supplier,
            purchaseOrderNumber: row.purchaseOrderNumber,
            lifeLimitHours: row.lifeLimitHours,
            lifeLimitCycles: row.lifeLimitCycles,
            hoursAccumulatedBeforeInstall: row.hoursAccumulatedBeforeInstall,
            cyclesAccumulatedBeforeInstall: row.cyclesAccumulatedBeforeInstall,
            shelfLifeLimitDate: row.shelfLifeLimitDate,
            notes: row.notes,
            partCategory: row.partCategory,
          }));

          const chunkResults = await commitChunk({
            organizationId,
            batchId,
            chunkIndex: chunkIdx,
            rows: chunkRows,
          });

          // Map results back to original row indices
          for (let i = 0; i < chunkResults.length; i++) {
            const originalIdx = chunk[i]?.idx ?? chunkResults[i].rowIndex;
            allResults.push({
              rowIndex: originalIdx,
              success: chunkResults[i].success,
              partId: chunkResults[i].partId,
              error: chunkResults[i].error,
            });
            if (chunkResults[i].success) {
              totalSuccess++;
            } else {
              totalError++;
            }
          }

          setSuccessCount(totalSuccess);
          setFailCount(totalError);
        } catch (e) {
          // Whole chunk failed
          for (const { idx } of chunk) {
            allResults.push({
              rowIndex: idx,
              success: false,
              error: e instanceof Error ? e.message : "Chunk failed",
            });
            totalError++;
          }
          setFailCount(totalError);
        }

        setProgress(Math.round(((chunkIdx + 1) / chunks.length) * 100));
      }

      // 3. Finalize
      setStatusMessage("Finalizing batch…");
      const warningCount = validationStatuses.filter((s) => s === "warning").length;
      try {
        await finalizeBatch({
          batchId,
          successCount: totalSuccess,
          errorCount: totalError,
          warningCount,
        });
      } catch {
        // Non-fatal — results are still valid
      }

      setStatusMessage("Complete.");
      setProgress(100);
      onComplete(allResults);
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-6">
      <Card className="border-border/60">
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center gap-3">
            {progress < 100 ? (
              <Loader2 className="w-5 h-5 text-primary animate-spin flex-shrink-0" />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
            )}
            <div>
              <p className="text-sm font-medium">{statusMessage}</p>
              {totalChunks > 0 && progress < 100 && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  Chunk {currentChunk} of {totalChunks}
                </p>
              )}
            </div>
          </div>

          <Progress value={progress} className="h-2" />

          <div className="flex items-center gap-6 text-sm">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              <span>
                <span className="font-medium">{successCount}</span>{" "}
                <span className="text-muted-foreground">succeeded</span>
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <XCircle className="w-4 h-4 text-destructive" />
              <span>
                <span className="font-medium">{failCount}</span>{" "}
                <span className="text-muted-foreground">failed</span>
              </span>
            </div>
          </div>

          {progress < 100 && (
            <p className="text-xs text-muted-foreground">
              Please keep this page open until the commit is complete.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
