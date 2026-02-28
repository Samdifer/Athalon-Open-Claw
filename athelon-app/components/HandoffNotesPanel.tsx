"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import { MessageSquare, Send, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import type { Id } from "@/convex/_generated/dataModel";

type HandoffNote = {
  technicianId: string;
  technicianName: string;
  note: string;
  createdAt: number;
};

interface HandoffNotesPanelProps {
  taskCardId: Id<"taskCards">;
  notes: HandoffNote[];
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function HandoffNotesPanel({ taskCardId, notes }: HandoffNotesPanelProps) {
  const { orgId, techId } = useCurrentOrg();
  const addNote = useMutation(api.taskCards.addHandoffNote);
  const [noteText, setNoteText] = useState("");
  const [sending, setSending] = useState(false);

  const handleSubmit = async () => {
    if (!noteText.trim() || !orgId || !techId) return;
    setSending(true);
    try {
      await addNote({
        taskCardId,
        organizationId: orgId,
        callerTechnicianId: techId,
        note: noteText.trim(),
      });
      setNoteText("");
      toast.success("Handoff note added");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add note");
    } finally {
      setSending(false);
    }
  };

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-muted-foreground" />
          Shift Handoff Notes
          {notes.length > 0 && (
            <span className="text-xs font-normal text-muted-foreground">
              ({notes.length})
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Notes list */}
        {notes.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">
            No handoff notes yet. Add a note for the next shift.
          </p>
        ) : (
          <div className="space-y-3 max-h-[300px] overflow-y-auto">
            {[...notes].reverse().map((n, i) => (
              <div key={`${n.createdAt}-${i}`} className="flex gap-2.5">
                <Avatar className="h-7 w-7 flex-shrink-0">
                  <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                    {initials(n.technicianName)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-foreground">
                      {n.technicianName}
                    </span>
                    <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                      <Clock className="h-2.5 w-2.5" />
                      {timeAgo(n.createdAt)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed whitespace-pre-wrap">
                    {n.note}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {notes.length > 0 && <Separator />}

        {/* Add note input */}
        <div className="flex gap-2">
          <Textarea
            placeholder="Add a handoff note for the next shift..."
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            className="min-h-[60px] text-xs resize-none"
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                handleSubmit();
              }
            }}
          />
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={!noteText.trim() || sending || !techId}
            className="self-end h-8 w-8 p-0"
          >
            <Send className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
