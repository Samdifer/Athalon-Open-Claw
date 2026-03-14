"use client";

import { useReducer } from "react";
import {
  CheckCircle2,
  Loader2,
  XCircle,
  Upload,
  Scan,
  FileSearch,
  Sparkles,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import type { DocumentExtractionBatchResult } from "@/src/shared/lib/documentIntelligence";

// ─── State Machine ────────────────────────────────────────────────────────────

interface StepInfo {
  label: string;
  detail: string;
  icon: "upload" | "scan" | "extract" | "done" | "error";
}

type ExtractionPhase =
  | { phase: "idle" }
  | { phase: "uploading"; fileIndex: number; total: number; fileName: string }
  | { phase: "extracting"; docIndex: number; total: number; docName: string }
  | { phase: "complete"; results: DocumentExtractionBatchResult }
  | { phase: "error"; message: string };

type ExtractionAction =
  | { type: "START_UPLOAD"; total: number }
  | { type: "UPLOADING_FILE"; fileIndex: number; fileName: string }
  | { type: "START_EXTRACTION"; total: number }
  | { type: "EXTRACTING_DOC"; docIndex: number; docName: string }
  | { type: "COMPLETE"; results: DocumentExtractionBatchResult }
  | { type: "ERROR"; message: string }
  | { type: "RESET" };

function reducer(_state: ExtractionPhase, action: ExtractionAction): ExtractionPhase {
  switch (action.type) {
    case "START_UPLOAD":
      return { phase: "uploading", fileIndex: 0, total: action.total, fileName: "" };
    case "UPLOADING_FILE":
      return {
        phase: "uploading",
        fileIndex: action.fileIndex,
        total: _state.phase === "uploading" ? _state.total : 1,
        fileName: action.fileName,
      };
    case "START_EXTRACTION":
      return { phase: "extracting", docIndex: 0, total: action.total, docName: "" };
    case "EXTRACTING_DOC":
      return {
        phase: "extracting",
        docIndex: action.docIndex,
        total: _state.phase === "extracting" ? _state.total : 1,
        docName: action.docName,
      };
    case "COMPLETE":
      return { phase: "complete", results: action.results };
    case "ERROR":
      return { phase: "error", message: action.message };
    case "RESET":
      return { phase: "idle" };
  }
}

// ─── Step Display ─────────────────────────────────────────────────────────────

function StepRow({
  step,
  status,
}: {
  step: StepInfo;
  status: "pending" | "active" | "done" | "error";
}) {
  const Icon =
    step.icon === "upload"
      ? Upload
      : step.icon === "scan"
        ? Scan
        : step.icon === "extract"
          ? FileSearch
          : step.icon === "done"
            ? Sparkles
            : Sparkles;

  return (
    <div className="flex items-start gap-3 py-2">
      <div className="mt-0.5">
        {status === "active" ? (
          <Loader2 className="w-4 h-4 text-primary animate-spin" />
        ) : status === "done" ? (
          <CheckCircle2 className="w-4 h-4 text-green-600" />
        ) : status === "error" ? (
          <XCircle className="w-4 h-4 text-red-600" />
        ) : (
          <Icon className="w-4 h-4 text-muted-foreground/40" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p
          className={`text-sm font-medium ${
            status === "active"
              ? "text-foreground"
              : status === "done"
                ? "text-muted-foreground"
                : status === "error"
                  ? "text-red-600"
                  : "text-muted-foreground/50"
          }`}
        >
          {step.label}
        </p>
        <p className="text-xs text-muted-foreground">{step.detail}</p>
      </div>
    </div>
  );
}

// ─── Modal Component ──────────────────────────────────────────────────────────

export function useExtractionProgress() {
  const [state, dispatch] = useReducer(reducer, { phase: "idle" });
  return { state, dispatch };
}

export function ExtractionProgressModal({
  open,
  state,
  onClose,
  onViewResults,
}: {
  open: boolean;
  state: ExtractionPhase;
  onClose: () => void;
  onViewResults?: () => void;
}) {
  const isProcessing = state.phase === "uploading" || state.phase === "extracting";

  const steps: { step: StepInfo; status: "pending" | "active" | "done" | "error" }[] = [];

  if (state.phase === "uploading") {
    steps.push({
      step: {
        label: `Uploading files (${state.fileIndex + 1}/${state.total})`,
        detail: state.fileName ? `Current: ${state.fileName}` : "Preparing files for analysis...",
        icon: "upload",
      },
      status: "active",
    });
    steps.push({
      step: {
        label: "Analyzing documents with AI vision",
        detail: "Waiting for upload to complete...",
        icon: "scan",
      },
      status: "pending",
    });
    steps.push({
      step: {
        label: "Extracting structured part data",
        detail: "Identifying part numbers, serial numbers, and specifications...",
        icon: "extract",
      },
      status: "pending",
    });
  } else if (state.phase === "extracting") {
    steps.push({
      step: {
        label: "Files uploaded",
        detail: "All files uploaded to storage",
        icon: "upload",
      },
      status: "done",
    });
    steps.push({
      step: {
        label: `Analyzing document ${state.docIndex + 1}/${state.total}`,
        detail: state.docName
          ? `Processing: ${state.docName}`
          : "Sending to Claude Vision API...",
        icon: "scan",
      },
      status: "active",
    });
    steps.push({
      step: {
        label: "Extracting structured part data",
        detail: "Identifying part numbers, serial numbers, and specifications...",
        icon: "extract",
      },
      status: state.docIndex > 0 ? "active" : "pending",
    });
  } else if (state.phase === "complete") {
    const r = state.results;
    steps.push({
      step: {
        label: "Files uploaded",
        detail: `${r.totalProcessed} files uploaded`,
        icon: "upload",
      },
      status: "done",
    });
    steps.push({
      step: {
        label: "Documents analyzed",
        detail: `${r.successCount} succeeded, ${r.failCount} failed`,
        icon: "scan",
      },
      status: r.failCount > 0 ? "error" : "done",
    });
    steps.push({
      step: {
        label: "Data extraction complete",
        detail: `${r.successCount} document(s) ready for review`,
        icon: "done",
      },
      status: "done",
    });
  } else if (state.phase === "error") {
    steps.push({
      step: {
        label: "Processing failed",
        detail: state.message,
        icon: "error",
      },
      status: "error",
    });
  }

  const progressPercent =
    state.phase === "uploading"
      ? Math.round(((state.fileIndex + 1) / state.total) * 40)
      : state.phase === "extracting"
        ? 40 + Math.round(((state.docIndex + 1) / state.total) * 60)
        : state.phase === "complete"
          ? 100
          : 0;

  return (
    <Dialog open={open} onOpenChange={isProcessing ? undefined : onClose}>
      <DialogContent
        className="sm:max-w-md"
        onPointerDownOutside={isProcessing ? (e) => e.preventDefault() : undefined}
        onEscapeKeyDown={isProcessing ? (e) => e.preventDefault() : undefined}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Scan className="w-5 h-5" />
            Document Intelligence
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Progress value={progressPercent} className="h-2" />

          <div className="divide-y">
            {steps.map((s, i) => (
              <StepRow key={i} step={s.step} status={s.status} />
            ))}
          </div>

          {state.phase === "complete" && (
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={onClose}>
                Close
              </Button>
              {onViewResults && (
                <Button size="sm" onClick={onViewResults}>
                  Review Extracted Data
                </Button>
              )}
            </div>
          )}

          {state.phase === "error" && (
            <div className="flex justify-end pt-2">
              <Button variant="outline" size="sm" onClick={onClose}>
                Close
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
