"use client";

import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export type TranscriptionStatus = "pending" | "processing" | "completed" | "failed" | "manual";

const STATUS_STYLES: Record<TranscriptionStatus, string> = {
  pending: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30",
  processing: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30",
  completed: "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/30",
  failed: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/30",
  manual: "bg-muted text-muted-foreground border-border/40",
};

const STATUS_LABELS: Record<TranscriptionStatus, string> = {
  pending: "Pending",
  processing: "Processing",
  completed: "Completed",
  failed: "Failed",
  manual: "Manual",
};

export function TranscriptionStatusBadge({ status }: { status: TranscriptionStatus }) {
  return (
    <Badge variant="outline" className={`text-[10px] font-medium border ${STATUS_STYLES[status]}`}>
      {status === "processing" && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
      {STATUS_LABELS[status]}
    </Badge>
  );
}
