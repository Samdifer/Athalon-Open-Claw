"use client";

import { useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, ArrowLeft, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import { toast } from "sonner";
import { UploadDropZone } from "./_components/UploadDropZone";
import { ColumnMapper } from "./_components/ColumnMapper";
import { ValidationPreview } from "./_components/ValidationPreview";
import { CommitProgress, type CommitResult } from "./_components/CommitProgress";
import { ResultsReport } from "./_components/ResultsReport";
import type {
  ColumnMapping,
  MappedPartRow,
  RowValidationResult,
  DuplicateResolution,
} from "@/src/shared/lib/partsImport";

// ─── Step definitions ─────────────────────────────────────────────────────────

type Step = 1 | 2 | 3 | 4 | 5;

const STEP_LABELS: Record<Step, string> = {
  1: "Upload",
  2: "Map Columns",
  3: "Validate",
  4: "Commit",
  5: "Results",
};

// ─── Stepper ──────────────────────────────────────────────────────────────────

function Stepper({ currentStep }: { currentStep: Step }) {
  const steps: Step[] = [1, 2, 3, 4, 5];

  return (
    <div className="flex items-center gap-0">
      {steps.map((step, idx) => {
        const isCompleted = currentStep > step;
        const isActive = currentStep === step;
        const isLast = idx === steps.length - 1;

        return (
          <div key={step} className="flex items-center">
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={`
                  w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold
                  transition-colors shrink-0
                  ${
                    isCompleted
                      ? "bg-green-500 text-white"
                      : isActive
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted border-2 border-border/60 text-muted-foreground"
                  }
                `}
              >
                {isCompleted ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : (
                  step
                )}
              </div>
              <span
                className={`text-[11px] font-medium whitespace-nowrap ${
                  isActive
                    ? "text-foreground"
                    : isCompleted
                    ? "text-green-600 dark:text-green-400"
                    : "text-muted-foreground"
                }`}
              >
                {STEP_LABELS[step]}
              </span>
            </div>

            {!isLast && (
              <div
                className={`h-0.5 w-12 sm:w-16 md:w-20 mx-1 mb-5 transition-colors ${
                  isCompleted ? "bg-green-500" : "bg-border/60"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PartsUploadPage() {
  const { orgId } = useCurrentOrg();

  const createBatch = useMutation(api.partsBulkUpload.createUploadBatch);

  // ── Wizard state ──────────────────────────────────────────────────────────
  const [step, setStep] = useState<Step>(1);

  // Step 1 output
  const [parsedData, setParsedData] = useState<{ headers: string[]; rows: string[][] } | null>(null);
  const [fileName, setFileName] = useState("");
  const [batchLabel, setBatchLabel] = useState("");

  // Step 2 output (columnMapping stored but passed down via child state)
  const [mappedRows, setMappedRows] = useState<MappedPartRow[]>([]);
  const [validationResults, setValidationResults] = useState<RowValidationResult[]>([]);

  // Step 3 output
  const [duplicateResolutions, setDuplicateResolutions] = useState<Map<number, DuplicateResolution>>(
    new Map(),
  );

  // Step 4 output
  const [commitResults, setCommitResults] = useState<CommitResult[]>([]);
  const [batchId, setBatchId] = useState<Id<"partUploadBatches"> | null>(null);
  const [batchCreating, setBatchCreating] = useState(false);

  // ── Step 1 → 2 ────────────────────────────────────────────────────────────
  function handleParsed(
    data: { headers: string[]; rows: string[][] },
    name: string,
    label: string,
  ) {
    setParsedData(data);
    setFileName(name);
    setBatchLabel(label);
    setStep(2);
  }

  // ── Step 2 → 3 ────────────────────────────────────────────────────────────
  function handleMappingComplete(
    _mapping: ColumnMapping,
    rows: MappedPartRow[],
    results: RowValidationResult[],
  ) {
    setMappedRows(rows);
    setValidationResults(results);
    setStep(3);
  }

  // ── Step 3 → 4 ────────────────────────────────────────────────────────────
  async function handleProceedToCommit(resolutions: Map<number, DuplicateResolution>) {
    if (!orgId) {
      toast.error("Organization not loaded. Please try again.");
      return;
    }

    setDuplicateResolutions(resolutions);
    setBatchCreating(true);

    try {
      const id = await createBatch({
        organizationId: orgId as Id<"organizations">,
        batchLabel: batchLabel || fileName,
        fileName,
        totalRows: mappedRows.length,
      });
      setBatchId(id);
      setStep(4);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create batch. Please try again.");
    } finally {
      setBatchCreating(false);
    }
  }

  // ── Step 4 → 5 ────────────────────────────────────────────────────────────
  function handleCommitComplete(results: CommitResult[]) {
    setCommitResults(results);
    setStep(5);
    const successCount = results.filter((r) => r.success).length;
    const failCount = results.length - successCount;
    if (failCount > 0) {
      toast.warning(`Commit complete: ${successCount} succeeded, ${failCount} failed.`);
    } else {
      toast.success(`${successCount} part${successCount !== 1 ? "s" : ""} added to inventory.`);
    }
  }

  // ── Reset ─────────────────────────────────────────────────────────────────
  function handleReset() {
    setParsedData(null);
    setFileName("");
    setBatchLabel("");
    setMappedRows([]);
    setValidationResults([]);
    setDuplicateResolutions(new Map());
    setCommitResults([]);
    setBatchId(null);
    setStep(1);
  }

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link to="/parts">
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            Parts Inventory
          </Link>
        </Button>
      </div>

      <div>
        <h1 className="text-lg sm:text-xl md:text-2xl font-semibold text-foreground flex items-center gap-2">
          <Upload className="w-5 h-5 text-muted-foreground" />
          Bulk Parts Upload
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Import multiple parts from a CSV or Excel spreadsheet. Map columns, validate, and commit
          in one guided workflow.
        </p>
      </div>

      {/* Stepper */}
      <div className="overflow-x-auto pb-1">
        <Stepper currentStep={step} />
      </div>

      {/* Step content */}
      <Card className="border-border/60">
        <CardContent className="p-6">
          {step === 1 && (
            <UploadDropZone onParsed={handleParsed} />
          )}

          {step === 2 && parsedData && (
            <ColumnMapper
              headers={parsedData.headers}
              rows={parsedData.rows}
              onMappingComplete={handleMappingComplete}
              onBack={() => setStep(1)}
            />
          )}

          {step === 3 && orgId && !batchCreating && (
            <ValidationPreview
              organizationId={orgId as Id<"organizations">}
              mappedRows={mappedRows}
              validationResults={validationResults}
              onProceed={(resolutions) => {
                void handleProceedToCommit(resolutions);
              }}
              onBack={() => setStep(2)}
            />
          )}

          {step === 3 && batchCreating && (
            <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
              Creating upload batch…
            </div>
          )}

          {step === 4 && orgId && batchId && (
            <CommitProgress
              organizationId={orgId as Id<"organizations">}
              batchId={batchId}
              rows={mappedRows}
              duplicateResolutions={duplicateResolutions}
              validationStatuses={validationResults.map((r) => r.status)}
              onComplete={handleCommitComplete}
            />
          )}

          {step === 5 && batchId && (
            <ResultsReport
              results={commitResults}
              batchId={String(batchId)}
              mappedRows={mappedRows}
              onUploadAnother={handleReset}
            />
          )}
        </CardContent>
      </Card>

      {/* Compliance note (steps 1-3 only) */}
      {step <= 3 && (
        <Card className="border-border/60 bg-muted/20">
          <CardContent className="p-4">
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              <span className="font-semibold text-foreground">Part 145 Note:</span> All parts
              imported via bulk upload will be placed in{" "}
              <span className="font-medium">Pending Inspection</span> status. A receiving
              inspection must be completed before parts are available for installation. Ensure all
              parts have traceable documentation (FAA Form 8130-3, Certificate of Conformity, or
              equivalent) before releasing to inventory.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
