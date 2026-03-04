"use client";

import { useMemo, useRef, useState } from "react";
import { MessageSquare, Pause, Pencil, Play, Save, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { formatDateTime } from "@/lib/format";
import { formatVoiceNoteDuration } from "@/lib/voiceNotes";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export type VoiceNotePanelItem = {
  id: string;
  transcript: string;
  authorName: string;
  recordedAt: number;
  duration: number;
  audioDataUrl: string;
  taskCardId: string;
  taskCardNumber?: string;
  taskCardTitle?: string;
};

type VoiceNotesPanelProps = {
  notes: VoiceNotePanelItem[];
  onUpdateTranscript: (id: string, transcript: string) => Promise<void> | void;
  onDelete: (id: string) => Promise<void> | void;
  compact?: boolean;
  className?: string;
};

export function VoiceNotesPanel({
  notes,
  onUpdateTranscript,
  onDelete,
  compact = false,
  className,
}: VoiceNotesPanelProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftTranscript, setDraftTranscript] = useState("");
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const audioRefs = useRef<Record<string, HTMLAudioElement | null>>({});

  const sortedNotes = useMemo(
    () => [...notes].sort((a, b) => b.recordedAt - a.recordedAt),
    [notes],
  );

  const deleteTarget = sortedNotes.find((note) => note.id === deleteTargetId) ?? null;

  const handleTogglePlay = async (noteId: string) => {
    const target = audioRefs.current[noteId];
    if (!target) {
      toast.error("Audio preview unavailable.");
      return;
    }

    if (playingId === noteId) {
      target.pause();
      target.currentTime = 0;
      setPlayingId(null);
      return;
    }

    if (playingId) {
      const currentlyPlaying = audioRefs.current[playingId];
      if (currentlyPlaying) {
        currentlyPlaying.pause();
        currentlyPlaying.currentTime = 0;
      }
    }

    try {
      await target.play();
      setPlayingId(noteId);
    } catch {
      toast.error("Unable to play voice note.");
    }
  };

  const handleStartEdit = (noteId: string, transcript: string) => {
    setEditingId(noteId);
    setDraftTranscript(transcript);
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    setIsSavingEdit(true);
    try {
      await onUpdateTranscript(editingId, draftTranscript.trim());
      setEditingId(null);
      setDraftTranscript("");
      toast.success("Transcript updated.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update transcript.");
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTargetId) return;
    setIsDeleting(true);
    try {
      await onDelete(deleteTargetId);
      setDeleteTargetId(null);
      toast.success("Voice note deleted.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete voice note.");
    } finally {
      setIsDeleting(false);
    }
  };

  const notesBody = (
    <div className={cn("space-y-2", compact && "space-y-1.5")}>
      {sortedNotes.length === 0 ? (
        <p className={cn("italic text-muted-foreground", compact ? "text-[11px]" : "text-xs")}>
          No voice notes yet.
        </p>
      ) : (
        sortedNotes.map((note) => (
          <div
            key={note.id}
            className={cn(
              "rounded-md border border-border/60 bg-muted/20",
              compact ? "space-y-1.5 p-2" : "space-y-2 p-3",
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex min-w-0 items-center gap-1.5">
                <Button
                  variant="outline"
                  size="icon-xs"
                  className="h-10 w-10 sm:h-6 sm:w-6"
                  onClick={() => void handleTogglePlay(note.id)}
                  title={playingId === note.id ? "Stop playback" : "Play voice note"}
                >
                  {playingId === note.id ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                </Button>
                <div className="min-w-0">
                  <div className="flex min-w-0 items-center gap-1.5">
                    <p className={cn("truncate font-medium text-foreground", compact ? "text-[11px]" : "text-xs")}>
                      {note.authorName}
                    </p>
                    {note.taskCardNumber && (
                      <Badge variant="outline" className="h-4 px-1 text-[9px]">
                        {note.taskCardNumber}
                      </Badge>
                    )}
                  </div>
                  <p className={cn("text-muted-foreground", compact ? "text-[10px]" : "text-[11px]")}>
                    {formatDateTime(note.recordedAt)} • {formatVoiceNoteDuration(note.duration)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                {editingId === note.id ? (
                  <>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      className="h-10 w-10 sm:h-6 sm:w-6"
                      onClick={() => void handleSaveEdit()}
                      disabled={isSavingEdit}
                      title="Save transcript"
                    >
                      <Save className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      className="h-10 w-10 sm:h-6 sm:w-6"
                      onClick={() => {
                        setEditingId(null);
                        setDraftTranscript("");
                      }}
                      disabled={isSavingEdit}
                      title="Cancel edit"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    className="h-10 w-10 sm:h-6 sm:w-6"
                    onClick={() => handleStartEdit(note.id, note.transcript)}
                    title="Edit transcript"
                  >
                    <Pencil className="h-3 w-3" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon-xs"
                  className="h-10 w-10 sm:h-6 sm:w-6 text-destructive hover:text-destructive"
                  onClick={() => setDeleteTargetId(note.id)}
                  title="Delete voice note"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>

            <audio
              ref={(element) => {
                audioRefs.current[note.id] = element;
              }}
              src={note.audioDataUrl}
              onEnded={() => {
                if (playingId === note.id) setPlayingId(null);
              }}
              onPause={() => {
                if (playingId === note.id) setPlayingId(null);
              }}
              className="hidden"
              preload="metadata"
            />

            {editingId === note.id ? (
              <Textarea
                rows={compact ? 2 : 3}
                value={draftTranscript}
                onChange={(event) => setDraftTranscript(event.target.value)}
                className={cn("min-h-16 text-xs", compact && "text-[11px]")}
              />
            ) : (
              <p className={cn("whitespace-pre-wrap text-muted-foreground", compact ? "text-[11px]" : "text-xs")}>
                {note.transcript.trim() || "No transcript provided."}
              </p>
            )}
          </div>
        ))
      )}
    </div>
  );

  return (
    <>
      {compact ? (
        <div className={cn("space-y-2", className)}>
          <div className="flex items-center gap-1.5">
            <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
            <p className="text-xs font-semibold text-foreground">
              Voice Notes
              <span className="ml-1 text-[10px] text-muted-foreground">({sortedNotes.length})</span>
            </p>
          </div>
          {notesBody}
        </div>
      ) : (
        <Card className={cn("border-border/60", className)}>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <MessageSquare className="h-3.5 w-3.5" />
              Voice Notes
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">{notesBody}</CardContent>
        </Card>
      )}

      <AlertDialog open={deleteTargetId !== null} onOpenChange={(open) => { if (!open) setDeleteTargetId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete voice note?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the audio and transcript from local storage.
              {deleteTarget?.taskCardNumber ? ` (${deleteTarget.taskCardNumber})` : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={isDeleting}
              onClick={(event) => {
                event.preventDefault();
                void handleDelete();
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
