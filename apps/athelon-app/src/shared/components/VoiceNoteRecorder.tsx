"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Loader2, Mic, RotateCcw, Save, Square } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { formatVoiceNoteDuration } from "@/lib/voiceNotes";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { TranscriptionStatusBadge } from "@/components/TranscriptionStatusBadge";

type VoiceNoteRecorderProps = {
  organizationId: string;
  technicianId: Id<"technicians">;
  workOrderId?: Id<"workOrders">;
  taskCardId?: Id<"taskCards">;
  disabled?: boolean;
  className?: string;
};

type RecorderMode = "idle" | "recording" | "processing" | "ready";

const MAX_RECORDING_MS = 3 * 60 * 1000;

export function VoiceNoteRecorder({
  organizationId,
  technicianId,
  workOrderId,
  taskCardId,
  disabled = false,
  className,
}: VoiceNoteRecorderProps) {
  const [mode, setMode] = useState<RecorderMode>("idle");
  const [elapsedMs, setElapsedMs] = useState(0);
  const [durationMs, setDurationMs] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [createdNoteId, setCreatedNoteId] = useState<Id<"voiceNotes"> | null>(null);
  const [editableTranscript, setEditableTranscript] = useState("");
  const [isSavingTranscript, setIsSavingTranscript] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const startedAtRef = useRef<number | null>(null);
  const elapsedIntervalRef = useRef<number | null>(null);

  const generateUploadUrl = useMutation(api.voiceNotes.generateUploadUrl);
  const createVoiceNote = useMutation(api.voiceNotes.create);
  const updateTranscript = useMutation(api.voiceNotes.updateTranscript);

  const createdNote = useQuery(api.voiceNotes.get, createdNoteId ? { id: createdNoteId } : "skip");

  useEffect(() => {
    if (!createdNote?.transcript) return;
    setEditableTranscript(createdNote.transcript);
  }, [createdNote?.transcript]);

  const clearElapsedInterval = useCallback(() => {
    if (elapsedIntervalRef.current !== null) {
      window.clearInterval(elapsedIntervalRef.current);
      elapsedIntervalRef.current = null;
    }
  }, []);

  const stopAndReleaseStream = useCallback(() => {
    if (!mediaStreamRef.current) return;
    mediaStreamRef.current.getTracks().forEach((track) => track.stop());
    mediaStreamRef.current = null;
  }, []);

  const revokePreview = useCallback((url: string | null) => {
    if (url) URL.revokeObjectURL(url);
  }, []);

  const clearDraft = useCallback(() => {
    clearElapsedInterval();
    stopAndReleaseStream();
    mediaRecorderRef.current = null;
    chunksRef.current = [];
    startedAtRef.current = null;

    setMode("idle");
    setElapsedMs(0);
    setDurationMs(0);
    setAudioBlob(null);
    setPreviewUrl((prev) => {
      revokePreview(prev);
      return null;
    });
  }, [clearElapsedInterval, revokePreview, stopAndReleaseStream]);

  const startRecording = async () => {
    if (disabled || mode === "recording") return;
    if (typeof window === "undefined") return;
    if (typeof MediaRecorder === "undefined") {
      toast.error("This browser does not support voice recording.");
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      toast.error("Microphone access is not available in this browser.");
      return;
    }

    clearDraft();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaStreamRef.current = stream;
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      const startedAt = Date.now();
      startedAtRef.current = startedAt;
      setElapsedMs(0);
      setDurationMs(0);

      recorder.ondataavailable = (event: BlobEvent) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };

      recorder.onerror = () => {
        toast.error("Recording failed. Please try again.");
        clearDraft();
      };

      recorder.onstop = () => {
        clearElapsedInterval();
        stopAndReleaseStream();

        const stoppedAt = Date.now();
        const started = startedAtRef.current ?? stoppedAt;
        const nextDuration = Math.max(0, stoppedAt - started);
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });

        if (blob.size === 0) {
          toast.error("No audio was captured.");
          clearDraft();
          return;
        }

        setDurationMs(nextDuration);
        setElapsedMs(nextDuration);
        setAudioBlob(blob);
        setPreviewUrl((prev) => {
          revokePreview(prev);
          return URL.createObjectURL(blob);
        });
        setMode("ready");
      };

      recorder.start();
      setMode("recording");
      elapsedIntervalRef.current = window.setInterval(() => {
        if (startedAtRef.current === null) return;
        setElapsedMs(Date.now() - startedAtRef.current);
      }, 250);
    } catch {
      toast.error("Microphone access denied or unavailable.");
      clearDraft();
    }
  };

  const stopRecording = () => {
    if (mode !== "recording") return;
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === "inactive") return;
    setMode("processing");
    clearElapsedInterval();
    recorder.stop();
  };

  const handleUploadAndCreate = async () => {
    if (!audioBlob) return;
    setIsSaving(true);
    try {
      const uploadUrl = await generateUploadUrl({});
      const uploadResponse = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": audioBlob.type || "audio/webm" },
        body: audioBlob,
      });

      if (!uploadResponse.ok) {
        throw new Error("Failed to upload audio.");
      }

      const uploadResult = (await uploadResponse.json()) as { storageId?: Id<"_storage"> };
      if (!uploadResult.storageId) {
        throw new Error("Upload did not return a storage id.");
      }

      const noteId = await createVoiceNote({
        organizationId,
        workOrderId,
        taskCardId,
        technicianId,
        audioStorageId: uploadResult.storageId,
        audioDurationSeconds: Math.max(1, Math.round(durationMs / 1000)),
      });

      setCreatedNoteId(noteId);
      toast.success("Voice note uploaded. Transcription queued.");
      clearDraft();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save voice note.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveTranscript = async () => {
    if (!createdNoteId) return;
    setIsSavingTranscript(true);
    try {
      await updateTranscript({
        id: createdNoteId,
        transcript: editableTranscript.trim(),
        transcriptionStatus: "manual",
      });
      toast.success("Transcript updated.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update transcript.");
    } finally {
      setIsSavingTranscript(false);
    }
  };

  useEffect(() => {
    if (mode !== "recording") return;
    if (elapsedMs < MAX_RECORDING_MS) return;

    toast.info("Max recording length reached (3 minutes). Stopping recording.");
    stopRecording();
  }, [elapsedMs, mode]);

  useEffect(() => {
    return () => {
      clearDraft();
    };
  }, [clearDraft]);

  return (
    <div className={cn("space-y-3 rounded-lg border border-border/60 bg-muted/20 p-3", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {mode === "recording" ? (
            <span className="relative inline-flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500/75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
            </span>
          ) : (
            <Mic className="h-3.5 w-3.5 text-muted-foreground" />
          )}
          <p className="text-xs font-semibold text-foreground">Voice Note Recorder</p>
        </div>
        <p className="font-mono text-xs text-muted-foreground">
          {formatVoiceNoteDuration(mode === "recording" ? elapsedMs : durationMs)}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {mode === "recording" ? (
          <Button variant="destructive" size="sm" className="h-7 text-xs" onClick={stopRecording} disabled={disabled}>
            <Square className="h-3 w-3" />
            Stop
          </Button>
        ) : (
          <Button size="sm" className="h-7 text-xs" onClick={startRecording} disabled={disabled || mode === "processing" || isSaving}>
            <Mic className="h-3.5 w-3.5" />
            Record
          </Button>
        )}

        {(mode === "ready" || mode === "processing") && (
          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={clearDraft} disabled={isSaving}>
            <RotateCcw className="h-3.5 w-3.5" />
            Discard
          </Button>
        )}
      </div>

      {previewUrl && <audio controls src={previewUrl} className="h-8 w-full" />}

      {mode === "processing" && <p className="text-xs text-muted-foreground">Processing recording...</p>}

      {mode === "ready" && (
        <div className="flex justify-end">
          <Button size="sm" className="h-7 text-xs" onClick={handleUploadAndCreate} disabled={isSaving}>
            {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Upload Voice Note
          </Button>
        </div>
      )}

      {createdNote && (
        <div className="space-y-2 rounded-md border border-border/60 bg-background/50 p-2.5">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-medium text-foreground">Latest transcription</p>
            <TranscriptionStatusBadge status={createdNote.transcriptionStatus} />
          </div>
          <Textarea
            value={editableTranscript}
            onChange={(event) => setEditableTranscript(event.target.value)}
            placeholder="Transcript will appear here when available..."
            rows={3}
            className="min-h-[88px] text-xs"
          />
          <div className="flex justify-end">
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={handleSaveTranscript} disabled={isSavingTranscript}>
              {isSavingTranscript ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              Save Transcript
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
