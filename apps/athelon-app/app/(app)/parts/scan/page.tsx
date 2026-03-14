"use client";

import { useState, useCallback } from "react";
import { Scan, Sparkles, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useMutation, useAction, useQuery } from "convex/react";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { toast } from "sonner";
import {
  DocumentScanDropZone,
  type ScanFile,
} from "@/app/(app)/parts/_components/document-intelligence/DocumentScanDropZone";
import {
  ExtractionProgressModal,
  useExtractionProgress,
} from "@/app/(app)/parts/_components/document-intelligence/ExtractionProgressModal";
import { ExtractionResultCard } from "@/app/(app)/parts/_components/document-intelligence/ExtractionResultCard";
import { ExistingPartDiffPanel } from "@/app/(app)/parts/_components/document-intelligence/ExistingPartDiffPanel";
import { NewPartReviewForm } from "@/app/(app)/parts/_components/document-intelligence/NewPartReviewForm";
import {
  mergeExtractedIntoExisting,
  extractedToReceivePartArgs,
  type ExtractionResult,
  type ExtractedPartData,
  type DocumentExtractionBatchResult,
  type FieldConfidence,
} from "@/src/shared/lib/documentIntelligence";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ExistingPartMatch {
  _id: Id<"parts">;
  partNumber: string;
  serialNumber: string | undefined;
  partName: string;
  condition: string;
  quantityOnHand: number | undefined;
  location: string;
  [key: string]: unknown;
}

interface NearMatch {
  _id: string;
  partNumber: string;
  serialNumber?: string;
  partName: string;
}

interface ReviewItem {
  result: ExtractionResult;
  existingPart: ExistingPartMatch | null;
  nearMatches: NearMatch[];
  status: "pending" | "applied" | "skipped";
}

// ─── Page Component ───────────────────────────────────────────────────────────

export default function DocumentScanPage() {
  const { orgId } = useCurrentOrg();
  const [files, setFiles] = useState<ScanFile[]>([]);
  const [reviewItems, setReviewItems] = useState<ReviewItem[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [applyingIndex, setApplyingIndex] = useState<number | null>(null);

  const { state: progressState, dispatch } = useExtractionProgress();

  const generateUploadUrl = useMutation(api.documents.generateUploadUrl);
  const extractDocuments = useAction(api.documentIntelligence.extractDocuments);
  const patchPart = useMutation(api.parts.patchPartFromExtraction);
  const receivePart = useMutation(api.parts.receivePart);

  // ─── Upload & Extract Pipeline ────────────────────────────────────────────

  const handleExtract = useCallback(async () => {
    if (!orgId || files.length === 0) return;

    dispatch({ type: "START_UPLOAD", total: files.length });

    try {
      // Step 1: Upload all files to Convex storage
      const uploadedDocs: Array<{
        storageId: Id<"_storage">;
        fileName: string;
        mimeType: string;
        documentRole: string;
      }> = [];

      for (let i = 0; i < files.length; i++) {
        const sf = files[i];
        dispatch({ type: "UPLOADING_FILE", fileIndex: i, fileName: sf.file.name });

        const uploadUrl = await generateUploadUrl();
        const uploadResponse = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": sf.file.type },
          body: sf.file,
        });

        if (!uploadResponse.ok) {
          throw new Error(`Upload failed for ${sf.file.name}: ${uploadResponse.statusText}`);
        }

        const { storageId } = (await uploadResponse.json()) as { storageId: Id<"_storage"> };
        uploadedDocs.push({
          storageId,
          fileName: sf.file.name,
          mimeType: sf.file.type,
          documentRole: sf.documentRole,
        });
      }

      // Step 2: Call extraction action
      dispatch({ type: "START_EXTRACTION", total: files.length });

      for (let i = 0; i < uploadedDocs.length; i++) {
        dispatch({
          type: "EXTRACTING_DOC",
          docIndex: i,
          docName: uploadedDocs[i].fileName,
        });
      }

      const batchResult = (await extractDocuments({
        organizationId: orgId,
        documents: uploadedDocs.map((d) => ({
          storageId: d.storageId,
          fileName: d.fileName,
          mimeType: d.mimeType,
          documentRole: d.documentRole as "certificate_of_conformity" | "8130_3_tag" | "vendor_invoice" | "packing_slip" | "material_certification" | "spec_sheet" | "photo" | "other",
        })),
      })) as DocumentExtractionBatchResult;

      dispatch({ type: "COMPLETE", results: batchResult });

      // Step 3: Build review items (match against existing parts)
      const items: ReviewItem[] = [];
      for (const result of batchResult.results) {
        if (result.status === "failed") {
          items.push({ result, existingPart: null, nearMatches: [], status: "skipped" });
          continue;
        }

        items.push({
          result,
          existingPart: null,
          nearMatches: [],
          status: "pending",
        });
      }

      setReviewItems(items);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Extraction failed";
      dispatch({ type: "ERROR", message });
      toast.error("Extraction failed", { description: message });
    }
  }, [orgId, files, generateUploadUrl, extractDocuments, dispatch]);

  // ─── Apply Changes to Existing Part ───────────────────────────────────────

  const handleApplyToExisting = async (
    index: number,
    existingPart: ExistingPartMatch,
    approvedFieldKeys: string[],
  ) => {
    if (!orgId) return;
    setApplyingIndex(index);

    try {
      const item = reviewItems[index];
      const patch = mergeExtractedIntoExisting(
        item.result.extractedData as ExtractedPartData,
        approvedFieldKeys,
      );

      await patchPart({
        organizationId: orgId,
        partId: existingPart._id,
        ...patch as Record<string, never>,
      });

      setReviewItems((prev) =>
        prev.map((r, i) => (i === index ? { ...r, status: "applied" as const } : r)),
      );
      toast.success(`Updated ${approvedFieldKeys.length} field(s) on ${existingPart.partNumber}`);
    } catch (error) {
      toast.error("Failed to apply changes", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setApplyingIndex(null);
    }
  };

  // ─── Create New Part ──────────────────────────────────────────────────────

  const handleCreatePart = async (index: number, data: ExtractedPartData) => {
    if (!orgId) return;
    setApplyingIndex(index);

    try {
      const args = extractedToReceivePartArgs(data);

      await receivePart({
        organizationId: orgId,
        partNumber: (args.partNumber as string) ?? "",
        partName: (args.partName as string) ?? "",
        description: args.description as string | undefined,
        serialNumber: args.serialNumber as string | undefined,
        isSerialized: (args.isSerialized as boolean) ?? false,
        condition: (args.condition as "new" | "serviceable" | "overhauled" | "repaired") ?? "new",
        isOwnerSupplied: false,
        supplier: args.supplier as string | undefined,
        purchaseOrderNumber: args.purchaseOrderNumber as string | undefined,
        receivingDate: Date.now(),
        isLifeLimited: (args.isLifeLimited as boolean) ?? false,
        lifeLimitHours: args.lifeLimitHours as number | undefined,
        lifeLimitCycles: args.lifeLimitCycles as number | undefined,
        hoursAccumulatedBeforeInstall: args.hoursAccumulatedBeforeInstall as number | undefined,
        cyclesAccumulatedBeforeInstall: args.cyclesAccumulatedBeforeInstall as number | undefined,
        hasShelfLifeLimit: (args.hasShelfLifeLimit as boolean) ?? false,
        shelfLifeLimitDate: args.shelfLifeLimitDate as number | undefined,
        eightOneThirtyData: args.eightOneThirtyData as Parameters<typeof receivePart>[0]["eightOneThirtyData"],
      });

      setReviewItems((prev) =>
        prev.map((r, i) => (i === index ? { ...r, status: "applied" as const } : r)),
      );
      toast.success(`Created part ${data.partNumber} — now in Pending Inspection`);
    } catch (error) {
      toast.error("Failed to create part", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setApplyingIndex(null);
    }
  };

  // ─── Skip ─────────────────────────────────────────────────────────────────

  const handleSkip = (index: number) => {
    setReviewItems((prev) =>
      prev.map((r, i) => (i === index ? { ...r, status: "skipped" as const } : r)),
    );
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  const isProcessing = progressState.phase === "uploading" || progressState.phase === "extracting";

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to="/parts" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <Scan className="w-5 h-5" />
            Document Intelligence
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Upload conformity documents, certificates, or photos to extract part data automatically.
          </p>
        </div>
      </div>

      {/* Upload Zone */}
      {!showResults && (
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm">Upload Documents</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <DocumentScanDropZone
              files={files}
              onFilesChange={setFiles}
              disabled={isProcessing}
            />

            {files.length > 0 && (
              <div className="flex justify-end">
                <Button
                  onClick={handleExtract}
                  disabled={isProcessing || files.length === 0}
                  className="gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  Extract Data ({files.length} file{files.length !== 1 ? "s" : ""})
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Progress Modal */}
      <ExtractionProgressModal
        open={progressState.phase !== "idle" && !showResults}
        state={progressState}
        onClose={() => {
          if (progressState.phase === "complete" || progressState.phase === "error") {
            setShowResults(true);
          }
        }}
        onViewResults={() => setShowResults(true)}
      />

      {/* Results & Review */}
      {showResults && reviewItems.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Review Extracted Data</h2>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setShowResults(false);
                setReviewItems([]);
                setFiles([]);
                dispatch({ type: "RESET" });
              }}
            >
              Start Over
            </Button>
          </div>

          {reviewItems.map((item, index) => {
            if (item.status === "applied") {
              return (
                <ExtractionResultCard key={index} result={item.result}>
                  <div className="mt-3 rounded-md bg-green-50 border border-green-200 p-3 text-sm text-green-700">
                    Successfully applied to part inventory.
                  </div>
                </ExtractionResultCard>
              );
            }

            if (item.status === "skipped") {
              return (
                <ExtractionResultCard key={index} result={item.result}>
                  <div className="mt-3 rounded-md bg-muted p-3 text-sm text-muted-foreground">
                    Skipped — no changes applied.
                  </div>
                </ExtractionResultCard>
              );
            }

            return (
              <ExtractionResultCard key={index} result={item.result}>
                <div className="mt-4 border-t pt-4">
                  {item.existingPart ? (
                    <ExistingPartDiffPanel
                      existingPart={item.existingPart}
                      extractedData={item.result.extractedData as ExtractedPartData}
                      fieldConfidences={item.result.fieldConfidences as Partial<Record<string, FieldConfidence>>}
                      onApply={(keys) => handleApplyToExisting(index, item.existingPart!, keys)}
                      onSkip={() => handleSkip(index)}
                      applying={applyingIndex === index}
                    />
                  ) : (
                    <NewPartReviewForm
                      extractedData={item.result.extractedData as ExtractedPartData}
                      fieldConfidences={item.result.fieldConfidences as Partial<Record<string, FieldConfidence>>}
                      nearMatches={item.nearMatches}
                      onCreatePart={(data) => handleCreatePart(index, data)}
                      onSkip={() => handleSkip(index)}
                      creating={applyingIndex === index}
                    />
                  )}
                </div>
              </ExtractionResultCard>
            );
          })}
        </div>
      )}
    </div>
  );
}
