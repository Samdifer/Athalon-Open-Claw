"use client";

/**
 * FileUpload.tsx — MBP-0064: Reusable File Upload Component
 *
 * Drag-and-drop file upload using Convex file storage with:
 * - File type validation (images, PDFs, docs)
 * - Size limit (configurable, default 50MB)
 * - Upload progress indicator
 * - Preview (thumbnail for images, icon for docs)
 * - Uses generateUploadUrl → fetch PUT → storeFileMetadata
 *
 * Usage:
 *   <FileUpload
 *     onUpload={(file) => { ... }}
 *     accept="images"          // "images" | "documents" | "all"
 *     maxSizeMB={50}
 *     multiple
 *   />
 */

import { useState, useRef, useCallback } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import { Upload, X, Loader2, ImageIcon, FileIcon, FileText } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface UploadedFile {
  storageId: string;
  url: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
}

interface FileUploadProps {
  /** Called once per file after successful upload */
  onUpload: (file: UploadedFile) => void;
  /** "images" restricts to image/*; "documents" adds PDFs/docs; "all" allows anything */
  accept?: "images" | "documents" | "all";
  /** Max file size in MB. Default 50 */
  maxSizeMB?: number;
  /** Allow selecting multiple files */
  multiple?: boolean;
  /** Compact mode (smaller drop zone) */
  compact?: boolean;
  /** Disabled state */
  disabled?: boolean;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const IMAGE_ACCEPT = "image/jpeg,image/png,image/gif,image/webp,image/tiff";
const DOCUMENT_ACCEPT =
  "image/jpeg,image/png,image/gif,image/webp,image/tiff,.pdf,.doc,.docx,.xls,.xlsx";
const ALL_ACCEPT =
  "image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv";

const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/tiff",
]);

const ALLOWED_DOC_TYPES = new Set([
  ...ALLOWED_IMAGE_TYPES,
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

function isFileTypeAllowed(
  file: File,
  accept: "images" | "documents" | "all",
): boolean {
  if (accept === "all") return true;
  if (accept === "images") return ALLOWED_IMAGE_TYPES.has(file.type);
  return ALLOWED_DOC_TYPES.has(file.type);
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getAcceptDescription(accept: "images" | "documents" | "all"): string {
  if (accept === "images") return "JPEG, PNG, GIF, WebP, TIFF";
  if (accept === "documents") return "Images, PDF, Word, Excel";
  return "Images, PDF, Office docs, Text";
}

interface PendingFile {
  file: File;
  id: string;
  progress: number;
  status: "pending" | "uploading" | "done" | "error";
  previewUrl?: string;
  error?: string;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function FileUpload({
  onUpload,
  accept = "all",
  maxSizeMB = 50,
  multiple = false,
  compact = false,
  disabled = false,
}: FileUploadProps) {
  const [pending, setPending] = useState<PendingFile[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const generateUploadUrl = useMutation(api.fileStorage.generateUploadUrl);

  const maxBytes = maxSizeMB * 1024 * 1024;
  const acceptAttr =
    accept === "images"
      ? IMAGE_ACCEPT
      : accept === "documents"
        ? DOCUMENT_ACCEPT
        : ALL_ACCEPT;

  const uploadFile = useCallback(
    async (file: File, id: string) => {
      // Validate size
      if (file.size > maxBytes) {
        setPending((p) =>
          p.map((f) =>
            f.id === id
              ? {
                  ...f,
                  status: "error",
                  error: `Too large (${formatSize(file.size)}). Max ${maxSizeMB}MB.`,
                }
              : f,
          ),
        );
        return;
      }

      // Validate type
      if (!isFileTypeAllowed(file, accept)) {
        setPending((p) =>
          p.map((f) =>
            f.id === id
              ? {
                  ...f,
                  status: "error",
                  error: `File type not allowed. Accepted: ${getAcceptDescription(accept)}.`,
                }
              : f,
          ),
        );
        return;
      }

      setPending((p) =>
        p.map((f) =>
          f.id === id ? { ...f, status: "uploading", progress: 10 } : f,
        ),
      );

      try {
        // 1. Get upload URL
        const uploadUrl = await generateUploadUrl();

        setPending((p) =>
          p.map((f) => (f.id === id ? { ...f, progress: 30 } : f)),
        );

        // 2. POST file
        const res = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": file.type || "application/octet-stream" },
          body: file,
        });

        if (!res.ok) throw new Error(`Upload failed: ${res.statusText}`);

        const { storageId } = await res.json();

        setPending((p) =>
          p.map((f) => (f.id === id ? { ...f, progress: 80 } : f)),
        );

        setPending((p) =>
          p.map((f) =>
            f.id === id ? { ...f, progress: 100, status: "done" } : f,
          ),
        );

        onUpload({
          storageId,
          url: "", // URL resolved by consumer via getFileUrl query
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type || "application/octet-stream",
        });

        // Remove from pending after a beat
        setTimeout(() => {
          setPending((p) => p.filter((f) => f.id !== id));
        }, 1500);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Upload failed";
        setPending((p) =>
          p.map((f) =>
            f.id === id ? { ...f, status: "error", error: msg } : f,
          ),
        );
        toast.error(`Failed to upload ${file.name}: ${msg}`);
      }
    },
    [generateUploadUrl, maxBytes, maxSizeMB, accept, onUpload],
  );

  const processFiles = useCallback(
    (files: FileList | File[]) => {
      const arr = Array.from(files);
      const toProcess = multiple ? arr : arr.slice(0, 1);

      const newPending: PendingFile[] = toProcess.map((file) => {
        const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const previewUrl = file.type.startsWith("image/")
          ? URL.createObjectURL(file)
          : undefined;
        return {
          file,
          id,
          progress: 0,
          status: "pending" as const,
          previewUrl,
        };
      });

      setPending((p) => [...p, ...newPending]);

      // Start uploads
      for (const pf of newPending) {
        uploadFile(pf.file, pf.id);
      }
    },
    [multiple, uploadFile],
  );

  // ─── Drag handlers ─────────────────────────────────────────────────────

  const onDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (!disabled) setDragOver(true);
    },
    [disabled],
  );

  const onDragLeave = useCallback(() => setDragOver(false), []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      if (disabled) return;
      if (e.dataTransfer.files.length > 0) {
        processFiles(e.dataTransfer.files);
      }
    },
    [disabled, processFiles],
  );

  const onInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        processFiles(e.target.files);
        e.target.value = "";
      }
    },
    [processFiles],
  );

  // ─── Render ───────────────────────────────────────────────────────────

  const isUploading = pending.some((f) => f.status === "uploading");

  const DropIcon =
    accept === "images" ? ImageIcon : isUploading ? Loader2 : Upload;

  return (
    <div className="space-y-2">
      {/* Drop zone */}
      <Card
        className={`relative border-dashed cursor-pointer transition-colors ${
          dragOver
            ? "border-primary bg-primary/5"
            : "border-border/60 hover:border-border"
        } ${disabled ? "opacity-50 pointer-events-none" : ""} ${
          compact ? "p-3" : "p-6"
        }`}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept={acceptAttr}
          multiple={multiple}
          onChange={onInputChange}
          className="hidden"
          disabled={disabled}
        />
        <div
          className={`flex flex-col items-center gap-1.5 text-center ${compact ? "" : "py-2"}`}
        >
          <DropIcon
            className={`w-5 h-5 ${isUploading ? "text-primary animate-spin" : "text-muted-foreground"}`}
          />
          <div>
            <p className="text-xs font-medium text-foreground">
              {dragOver
                ? "Drop files here"
                : compact
                  ? "Click or drop files"
                  : "Drag & drop files here, or click to browse"}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {getAcceptDescription(accept)} · Max {maxSizeMB}MB
              {multiple ? " · Multiple files" : ""}
            </p>
          </div>
        </div>
      </Card>

      {/* Pending uploads */}
      {pending.length > 0 && (
        <div className="space-y-1.5">
          {pending.map((pf) => (
            <div
              key={pf.id}
              className="flex items-center gap-2 p-2 rounded-md bg-muted/30 border border-border/40"
            >
              {/* Thumbnail */}
              {pf.previewUrl ? (
                <img
                  src={pf.previewUrl}
                  alt=""
                  className="w-8 h-8 rounded object-cover flex-shrink-0"
                />
              ) : pf.file.type === "application/pdf" ? (
                <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              ) : (
                <FileIcon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              )}

              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-medium truncate">
                  {pf.file.name}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {formatSize(pf.file.size)}
                </p>
                {pf.status === "uploading" && (
                  <Progress value={pf.progress} className="h-1 mt-1" />
                )}
                {pf.status === "error" && (
                  <p className="text-[10px] text-red-400 mt-0.5">{pf.error}</p>
                )}
                {pf.status === "done" && (
                  <p className="text-[10px] text-green-400 mt-0.5">
                    ✓ Uploaded
                  </p>
                )}
              </div>

              {(pf.status === "error" || pf.status === "done") && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 flex-shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (pf.previewUrl) URL.revokeObjectURL(pf.previewUrl);
                    setPending((p) => p.filter((f) => f.id !== pf.id));
                  }}
                >
                  <X className="w-3 h-3" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
