"use client";

/**
 * ShiftHandoffNotes — MBP-0125: Shift Handoff Notes on Task Cards
 *
 * Dedicated component for shift handoff notes section on the task card detail page.
 * Timestamped, attributed to tech, visible to next shift.
 * Uses the Convex `addHandoffNote` mutation and reads from the task card's
 * `handoffNotes` field for persistence.
 */

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { toast } from "sonner";
import { formatDateTime } from "@/lib/format";
import { MessageSquare, Send, Clock, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

type HandoffNote = {
  technicianId: string;
  technicianName: string;
  note: string;
  createdAt: number;
};

interface ShiftHandoffNotesProps {
  taskCardId: Id<"taskCards">;
  organizationId: Id<"organizations">;
  technicianId?: Id<"technicians">;
  handoffNotes: HandoffNote[];
  readOnly?: boolean;
}

export function ShiftHandoffNotes({
  taskCardId,
  organizationId,
  technicianId,
  handoffNotes,
  readOnly = false,
}: ShiftHandoffNotesProps) {
  const [draft, setDraft] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const addHandoffNote = useMutation(api.taskCards.addHandoffNote);

  const canSubmit = !readOnly && !!technicianId && !!draft.trim() && !submitting;

  async function handleSubmit() {
    if (!technicianId || !draft.trim()) return;
    setSubmitting(true);
    try {
      await addHandoffNote({
        taskCardId,
        organizationId,
        callerTechnicianId: technicianId,
        note: draft.trim(),
      });
      setDraft("");
      toast.success("Handoff note added");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to add handoff note — please try again",
      );
    } finally {
      setSubmitting(false);
    }
  }

  // Group notes by date for visual shift separation
  const groupedByDate = handoffNotes.reduce<Record<string, HandoffNote[]>>((acc, note) => {
    const dateKey = new Date(note.createdAt).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(note);
    return acc;
  }, {});

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
            <MessageSquare className="w-3.5 h-3.5" />
            Shift Handoff Notes
          </CardTitle>
          {handoffNotes.length > 0 && (
            <Badge variant="secondary" className="text-[10px]">
              {handoffNotes.length} note{handoffNotes.length !== 1 ? "s" : ""}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        {/* Existing notes grouped by date */}
        {handoffNotes.length > 0 ? (
          <div className="space-y-3">
            {Object.entries(groupedByDate).map(([dateLabel, notes]) => (
              <div key={dateLabel}>
                <p className="text-[10px] text-muted-foreground/70 font-medium uppercase tracking-wider mb-1.5">
                  {dateLabel}
                </p>
                <div className="space-y-2">
                  {notes.map((hn, idx) => (
                    <div
                      key={`${hn.createdAt}-${idx}`}
                      className="p-2.5 rounded-md bg-amber-500/5 border border-amber-500/20"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[11px] font-medium text-foreground flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {hn.technicianName ?? "Unknown Technician"}
                        </span>
                        <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                          <Clock className="w-2.5 h-2.5" />
                          {formatDateTime(hn.createdAt)}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground whitespace-pre-wrap">{hn.note}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground italic">
            No handoff notes yet. Add a note for the next shift.
          </p>
        )}

        {/* Add note form */}
        {!readOnly && technicianId && (
          <div className="border-t border-border/50 pt-3 space-y-2">
            <div className="flex gap-2">
              <div className="flex-1 space-y-1">
                <Textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value.slice(0, 500))}
                  placeholder="Add a shift handoff note for the next technician..."
                  rows={2}
                  maxLength={500}
                  disabled={submitting}
                  className="text-xs bg-muted/30 border-border/60 resize-none w-full"
                  aria-label="Shift handoff note"
                />
                <p
                  className={`text-[10px] text-right ${draft.length >= 480 ? "text-amber-400" : "text-muted-foreground/50"}`}
                >
                  {draft.length}/500
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="h-auto self-end gap-1 text-xs"
                disabled={!canSubmit}
                aria-label="Submit handoff note"
                onClick={handleSubmit}
              >
                <Send className="w-3 h-3" />
                Add
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
