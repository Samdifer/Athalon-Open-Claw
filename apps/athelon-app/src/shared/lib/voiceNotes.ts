const STORAGE_PREFIX = "athelon:voice-notes:v1";

export type VoiceNotesScope = {
  orgId: string;
  workOrderId: string;
};

export type StoredVoiceNote = {
  id: string;
  taskCardId: string;
  taskCardNumber?: string;
  taskCardTitle?: string;
  transcript: string;
  duration: number;
  recordedAt: number;
  authorId: string | null;
  authorName: string;
  audioDataUrl: string;
  audioMimeType: string;
  createdAt: number;
  updatedAt: number;
};

function keyForScope(scope: VoiceNotesScope): string {
  return `${STORAGE_PREFIX}:${scope.orgId}:${scope.workOrderId}`;
}

function isStoredVoiceNote(value: unknown): value is StoredVoiceNote {
  if (value === null || typeof value !== "object") return false;
  const maybe = value as Partial<StoredVoiceNote>;
  return (
    typeof maybe.id === "string" &&
    typeof maybe.taskCardId === "string" &&
    typeof maybe.transcript === "string" &&
    typeof maybe.duration === "number" &&
    typeof maybe.recordedAt === "number" &&
    (typeof maybe.authorId === "string" || maybe.authorId === null) &&
    typeof maybe.authorName === "string" &&
    typeof maybe.audioDataUrl === "string" &&
    typeof maybe.audioMimeType === "string" &&
    typeof maybe.createdAt === "number" &&
    typeof maybe.updatedAt === "number"
  );
}

export function readVoiceNotesForWorkOrder(scope: VoiceNotesScope): StoredVoiceNote[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(keyForScope(scope));
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isStoredVoiceNote).sort((a, b) => b.recordedAt - a.recordedAt);
  } catch {
    return [];
  }
}

export function writeVoiceNotesForWorkOrder(scope: VoiceNotesScope, notes: StoredVoiceNote[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(keyForScope(scope), JSON.stringify(notes));
}

export function createVoiceNoteId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `vn-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function formatVoiceNoteDuration(durationMs: number): string {
  const totalSeconds = Math.max(0, Math.round(durationMs / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error ?? new Error("Failed to read audio blob"));
    reader.readAsDataURL(blob);
  });
}
