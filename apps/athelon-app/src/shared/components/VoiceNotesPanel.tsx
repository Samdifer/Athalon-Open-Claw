"use client";

import { useMemo, useRef, useState, type MutableRefObject } from "react";
import { useMutation, useQuery } from "convex/react";
import { MessageSquare, Pause, Pencil, Play, Save, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { formatDateTime } from "@/lib/format";
import { formatVoiceNoteDuration } from "@/lib/voiceNotes";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { TranscriptionStatusBadge } from "@/components/TranscriptionStatusBadge";
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

type VoiceNotesPanelProps = {
  organizationId: Id<"organizations">;
  workOrderId?: Id<"workOrders">;
  taskCardId?: Id<"taskCards">;
  compact?: boolean;
  className?: string;
};

function VoiceNoteAudio({ noteId, storageId, playingId, setPlayingId, audioRefs }: {
  noteId: string;
  storageId?: Id<"_storage">;
  playingId: string | null;
  setPlayingId: (id: string | null) => void;
  audioRefs: MutableRefObject<Record<string, HTMLAudioElement | null>>;
}) {
  const audioUrl = useQuery(
    api.documents.getDocumentUrl,
    storageId ? { storageId } : "skip",
  );

  const handleTogglePlay = async () => {
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

  return (
    <>
      <Button
        variant="outline"
        size="icon-xs"
        className="h-10 w-10 sm:h-6 sm:w-6"
        onClick={() => void handleTogglePlay()}
        disabled={!audioUrl}
        title={playingId === noteId ? "Stop playback" : "Play voice note"}
      >
        {playingId === noteId ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
      </Button>
      <audio
        ref={(element) => {
          audioRefs.current[noteId] = element;
        }}
        src={audioUrl ?? undefined}
        onEnded={() => {
          if (playingId === noteId) setPlayingId(null);
        }}
        onPause={() => {
          if (playingId === noteId) setPlayingId(null);
        }}
        className="hidden"
        preload="metadata"
      />
    </>
  );
}

export function VoiceNotesPanel({ organizationId, workOrderId, taskCardId, compact = false, className }: VoiceNotesPanelProps) {
  const notes = useQuery(api.voiceNotes.list, { workOrderId, taskCardId }) ?? [];
  const technicians = useQuery(api.technicians.list, { organizationId }) ?? [];
  const updateTranscript = useMutation(api.voiceNotes.updateTranscript);
  const removeNote = useMutation(api.voiceNotes.remove);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftTranscript, setDraftTranscript] = useState("");
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const audioRefs = useRef<Record<string, HTMLAudioElement | null>>({});

  const techNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const tech of technicians) map.set(String(tech._id), tech.legalName);
    return map;
  }, [technicians]);

  const sortedNotes = useMemo(
    () => [...notes].sort((a, b) => b.createdAt - a.createdAt),
    [notes],
  );

  const deleteTarget = sortedNotes.find((note) => note._id === deleteTargetId) ?? null;

  const handleStartEdit = (note: Doc<"voiceNotes">) => {
    setEditingId(note._id);
    setDraftTranscript(note.transcript ?? "");
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    setIsSavingEdit(true);
    try {
      await updateTranscript({
        id: editingId as Id<"voiceNotes">,
        transcript: draftTranscript.trim(),
        transcriptionStatus: "manual",
      });
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
      await removeNote({ id: deleteTargetId as Id<"voiceNotes"> });
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
            key={note._id}
            className={cn(
              "rounded-md border border-border/60 bg-muted/20",
              compact ? "space-y-1.5 p-2" : "space-y-2 p-3",
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex min-w-0 items-center gap-1.5">
                <VoiceNoteAudio
                  noteId={note._id}
                  storageId={note.audioStorageId}
                  playingId={playingId}
                  setPlayingId={setPlayingId}
                  audioRefs={audioRefs}
                />
                <div className="min-w-0">
                  <div className="flex min-w-0 items-center gap-1.5">
                    <p className={cn("truncate font-medium text-foreground", compact ? "text-[11px]" : "text-xs")}>
                      {techNameById.get(String(note.technicianId)) ?? "Unknown Technician"}
                    </p>
                    <TranscriptionStatusBadge status={note.transcriptionStatus} />
                  </div>
                  <p className={cn("text-muted-foreground", compact ? "text-[10px]" : "text-[11px]")}>
                    {formatDateTime(note.createdAt)} • {formatVoiceNoteDuration((note.audioDurationSeconds ?? 0) * 1000)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                {editingId === note._id ? (
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
                    onClick={() => handleStartEdit(note)}
                    title="Edit transcript"
                  >
                    <Pencil className="h-3 w-3" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon-xs"
                  className="h-10 w-10 sm:h-6 sm:w-6 text-destructive hover:text-destructive"
                  onClick={() => setDeleteTargetId(note._id)}
                  title="Delete voice note"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>

            {editingId === note._id ? (
              <Textarea
                rows={compact ? 2 : 3}
                value={draftTranscript}
                onChange={(event) => setDraftTranscript(event.target.value)}
                className={cn("min-h-16 text-xs", compact && "text-[11px]")}
              />
            ) : (
              <p className={cn("whitespace-pre-wrap text-muted-foreground", compact ? "text-[11px]" : "text-xs")}>
                {note.transcript?.trim() || "No transcript yet."}
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
              This will remove the audio and transcript for this note.
              {deleteTarget ? ` (${formatDateTime(deleteTarget.createdAt)})` : ""}
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
