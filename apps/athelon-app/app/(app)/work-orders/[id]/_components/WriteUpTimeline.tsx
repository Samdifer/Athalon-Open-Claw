"use client";

import { useState } from "react";
import { AlertTriangle, Wrench, FileText, RefreshCw, User, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { formatDateTime } from "@/lib/format";

// ─── Types ──────────────────────────────────────────────────────────────────

type EntryType = "discrepancy_writeup" | "corrective_action" | "note" | "status_change";

export interface WriteUpEntry {
  _id: string;
  text: string;
  technicianName: string;
  certificateNumber?: string;
  createdAt: number;
  entryType: EntryType;
}

export interface WriteUpTimelineProps {
  entries: WriteUpEntry[];
  entryType: EntryType;
  onAddEntry: (text: string) => void;
  readOnly?: boolean;
  emptyLabel?: string;
  isSubmitting?: boolean;
}

// ─── Entry type config ──────────────────────────────────────────────────────

const ENTRY_TYPE_CONFIG: Record<EntryType, {
  icon: typeof AlertTriangle;
  color: string;
  label: string;
  addLabel: string;
}> = {
  discrepancy_writeup: {
    icon: AlertTriangle,
    color: "text-amber-500 bg-amber-500/10",
    label: "Finding Write-Up",
    addLabel: "Add finding entry",
  },
  corrective_action: {
    icon: Wrench,
    color: "text-green-600 bg-green-500/10",
    label: "Corrective Action",
    addLabel: "Add corrective action entry",
  },
  note: {
    icon: FileText,
    color: "text-blue-500 bg-blue-500/10",
    label: "Note",
    addLabel: "Add note",
  },
  status_change: {
    icon: RefreshCw,
    color: "text-purple-500 bg-purple-500/10",
    label: "Status Change",
    addLabel: "Add status change note",
  },
};

// ─── Component ──────────────────────────────────────────────────────────────

export function WriteUpTimeline({
  entries,
  entryType,
  onAddEntry,
  readOnly = false,
  emptyLabel,
  isSubmitting = false,
}: WriteUpTimelineProps) {
  const [newText, setNewText] = useState("");
  const config = ENTRY_TYPE_CONFIG[entryType];
  const Icon = config.icon;

  const sorted = [...entries].sort((a, b) => b.createdAt - a.createdAt);

  function handleSubmit() {
    if (newText.trim().length === 0) return;
    onAddEntry(newText.trim());
    setNewText("");
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className={`w-5 h-5 rounded-full flex items-center justify-center ${config.color}`}>
          <Icon className="w-3 h-3" />
        </div>
        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {config.label}
        </h4>
        <span className="text-[10px] text-muted-foreground/60">
          ({sorted.length} {sorted.length === 1 ? "entry" : "entries"})
        </span>
      </div>

      {/* Add entry form (at top, before history) */}
      {!readOnly && (
        <div className="flex gap-2">
          <Textarea
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            placeholder={config.addLabel}
            className="min-h-[60px] text-sm resize-none border-border/60"
            maxLength={4000}
          />
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={newText.trim().length === 0 || isSubmitting}
            className="h-auto self-end px-3"
          >
            <Send className="w-3.5 h-3.5" />
          </Button>
        </div>
      )}

      {/* Empty state */}
      {sorted.length === 0 && (
        <div className="py-4 text-center text-xs text-muted-foreground/60">
          {emptyLabel ?? `No ${config.label.toLowerCase()} entries yet.`}
        </div>
      )}

      {/* Timeline entries */}
      {sorted.length > 0 && (
        <div className="relative pl-6">
          {/* Vertical line */}
          <div className="absolute left-[11px] top-2 bottom-2 w-px bg-border/50" />

          <div className="space-y-3">
            {sorted.map((entry) => (
              <div key={entry._id} className="relative flex items-start gap-3">
                {/* Dot */}
                <div
                  className={`absolute -left-6 w-[22px] h-[22px] rounded-full flex items-center justify-center ${config.color} ring-2 ring-background`}
                >
                  <Icon className="w-3 h-3" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 pt-0.5">
                  {/* Narrative text */}
                  <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                    {entry.text}
                  </p>

                  {/* Attribution line */}
                  <div className="flex items-center gap-1.5 mt-1">
                    <User className="w-3 h-3 text-muted-foreground/60 flex-shrink-0" />
                    <span className="text-[11px] text-muted-foreground font-medium">
                      {entry.technicianName}
                    </span>
                    {entry.certificateNumber && (
                      <>
                        <span className="text-muted-foreground/40">·</span>
                        <span className="text-[10px] text-muted-foreground/70 font-mono">
                          #{entry.certificateNumber}
                        </span>
                      </>
                    )}
                    <span className="text-muted-foreground/40">·</span>
                    <time className="font-mono text-[10px] text-muted-foreground/70">
                      {formatDateTime(entry.createdAt)}
                    </time>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
