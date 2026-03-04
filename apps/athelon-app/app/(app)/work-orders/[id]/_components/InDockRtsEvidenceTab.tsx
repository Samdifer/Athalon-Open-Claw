"use client";

import { useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import {
  AlertCircle,
  Download,
  ExternalLink,
  FileText,
  Loader2,
  PlayCircle,
  Trash2,
  Upload,
  Video,
} from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { formatDateTime } from "@/lib/format";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const EVIDENCE_TABLE = "workOrderEvidence";
const MAX_VIDEO_FILE_SIZE = 2 * 1024 * 1024 * 1024; // 2 GB
const MAX_CHECKLIST_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

type EvidenceBucket = {
  key: "in_dock_checklist" | "in_dock_video" | "rts_checklist" | "rts_video";
  title: string;
  subtitle: string;
  inspectionLabel: string;
  accept: string;
  multiple: boolean;
  isVideo: boolean;
  maxSizeBytes: number;
};

const EVIDENCE_BUCKETS: EvidenceBucket[] = [
  {
    key: "in_dock_checklist",
    title: "In-dock Checklist",
    subtitle: "Upload incoming checklist templates or completed checklist evidence.",
    inspectionLabel: "in_dock_checklist",
    accept: ".pdf,.doc,.docx,.xlsx,.xls,.txt,.jpg,.jpeg,.png",
    multiple: true,
    isVideo: false,
    maxSizeBytes: MAX_CHECKLIST_FILE_SIZE,
  },
  {
    key: "in_dock_video",
    title: "Incoming Inspection Liability Video",
    subtitle: "Mobile upload for 10-20 minute incoming walk-around footage.",
    inspectionLabel: "in_dock_video",
    accept: "video/*",
    multiple: true,
    isVideo: true,
    maxSizeBytes: MAX_VIDEO_FILE_SIZE,
  },
  {
    key: "rts_checklist",
    title: "Return-to-Service Checklist",
    subtitle: "Upload final release checklists and supporting forms.",
    inspectionLabel: "return_to_service_checklist",
    accept: ".pdf,.doc,.docx,.xlsx,.xls,.txt,.jpg,.jpeg,.png",
    multiple: true,
    isVideo: false,
    maxSizeBytes: MAX_CHECKLIST_FILE_SIZE,
  },
  {
    key: "rts_video",
    title: "Return-to-Service Liability Video",
    subtitle: "Mobile upload for final interior/exterior return-to-service footage.",
    inspectionLabel: "return_to_service_video",
    accept: "video/*",
    multiple: true,
    isVideo: true,
    maxSizeBytes: MAX_VIDEO_FILE_SIZE,
  },
];

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function extensionFor(fileName: string): string {
  const idx = fileName.lastIndexOf(".");
  if (idx === -1) return "";
  return fileName.slice(idx);
}

function buildAutoName(
  registration: string,
  inspectionLabel: string,
  sourceName: string,
  seq: number,
): string {
  const reg = (registration || "AIRCRAFT").replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  return `${reg}_${inspectionLabel}_${stamp}_${seq}${extensionFor(sourceName)}`;
}

function EvidenceRow({
  document,
  onPreview,
  onDelete,
  deleting,
}: {
  document: {
    _id: Id<"documents">;
    storageId: Id<"_storage">;
    fileName: string;
    fileSize: number;
    mimeType: string;
    uploadedAt: number;
  };
  onPreview: (doc: {
    _id: Id<"documents">;
    fileName: string;
    storageId: Id<"_storage">;
    mimeType: string;
  }) => void;
  onDelete: (id: Id<"documents">) => void;
  deleting: boolean;
}) {
  const url = useQuery(api.documents.getDocumentUrl, { storageId: document.storageId });

  return (
    <div className="flex items-center gap-2 py-2 border-b border-border/30 last:border-b-0">
      {document.mimeType.startsWith("video/") ? (
        <Video className="w-4 h-4 text-sky-400 flex-shrink-0" />
      ) : (
        <FileText className="w-4 h-4 text-amber-400 flex-shrink-0" />
      )}
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-foreground truncate">{document.fileName}</p>
        <p className="text-[11px] text-muted-foreground">
          {formatFileSize(document.fileSize)} · {formatDateTime(document.uploadedAt)}
        </p>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        {url ? (
          <>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              title="Preview"
              onClick={() =>
                onPreview({
                  _id: document._id,
                  fileName: document.fileName,
                  storageId: document.storageId,
                  mimeType: document.mimeType,
                })
              }
            >
              {document.mimeType.startsWith("video/") ? (
                <PlayCircle className="w-3.5 h-3.5" />
              ) : (
                <ExternalLink className="w-3.5 h-3.5" />
              )}
            </Button>
            <Button asChild variant="ghost" size="icon" className="h-7 w-7" title="Download">
              <a href={url} target="_blank" rel="noopener noreferrer" download={document.fileName}>
                <Download className="w-3.5 h-3.5" />
              </a>
            </Button>
          </>
        ) : (
          <Button variant="ghost" size="icon" className="h-7 w-7" disabled>
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-destructive"
          disabled={deleting}
          title="Delete"
          onClick={() => onDelete(document._id)}
        >
          {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
        </Button>
      </div>
    </div>
  );
}

function EvidenceBucketCard({
  organizationId,
  workOrderId,
  aircraftRegistration,
  bucket,
}: {
  organizationId: Id<"organizations">;
  workOrderId: string;
  aircraftRegistration: string;
  bucket: EvidenceBucket;
}) {
  const attachedToId = `${workOrderId}:${bucket.key}`;
  const documents = useQuery(api.documents.listDocuments, {
    attachedToTable: EVIDENCE_TABLE,
    attachedToId,
  });

  const generateUploadUrl = useMutation(api.documents.generateUploadUrl);
  const saveDocument = useMutation(api.documents.saveDocument);
  const deleteDocument = useMutation(api.documents.deleteDocument);

  const [isUploading, setIsUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<Id<"documents"> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewDoc, setPreviewDoc] = useState<{
    _id: Id<"documents">;
    fileName: string;
    storageId: Id<"_storage">;
    mimeType: string;
  } | null>(null);
  const previewUrl = useQuery(
    api.documents.getDocumentUrl,
    previewDoc ? { storageId: previewDoc.storageId } : "skip",
  );

  const orderedDocs = useMemo(
    () => [...(documents ?? [])].sort((a, b) => b.uploadedAt - a.uploadedAt),
    [documents],
  );

  async function uploadFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    const allFiles = Array.from(fileList);

    // BUG-QCM-HUNT-001: Previously the validation loop used `return` on the first
    // invalid file, which aborted the entire batch upload. A QCM uploading 5 RTS
    // checklist PDFs where one is 60 MB (over the 50 MB limit) would see ONE error
    // toast and then nothing — the other 4 valid PDFs were silently never uploaded.
    // They'd close the dialog thinking all files failed, leaving the RTS evidence
    // package incomplete. Fix: partition into valid and invalid sets, warn about each
    // invalid file, and continue uploading the valid ones.
    const invalid: { name: string; reason: string }[] = [];
    const files = allFiles.filter((file) => {
      if (file.size > bucket.maxSizeBytes) {
        invalid.push({
          name: file.name,
          reason: `exceeds max file size (${formatFileSize(bucket.maxSizeBytes)})`,
        });
        return false;
      }
      if (bucket.isVideo && !file.type.startsWith("video/")) {
        invalid.push({ name: file.name, reason: "not a supported video file" });
        return false;
      }
      if (!bucket.isVideo && file.type.startsWith("video/")) {
        invalid.push({ name: file.name, reason: "is a video — upload it in the video section" });
        return false;
      }
      return true;
    });

    // Warn for each skipped file individually so the QCM knows exactly what failed.
    for (const { name, reason } of invalid) {
      toast.warning(`${name} skipped: ${reason}.`);
    }

    // If ALL files failed validation, nothing left to do.
    if (files.length === 0) return;

    setIsUploading(true);
    let uploaded = 0;
    try {
      for (let idx = 0; idx < files.length; idx++) {
        const file = files[idx];
        const uploadUrl = await generateUploadUrl();
        const uploadResponse = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": file.type || "application/octet-stream" },
          body: file,
        });
        if (!uploadResponse.ok) {
          throw new Error(`Upload failed for ${file.name} (${uploadResponse.status})`);
        }
        const { storageId } = await uploadResponse.json();

        await saveDocument({
          organizationId,
          attachedToTable: EVIDENCE_TABLE,
          attachedToId,
          storageId,
          fileName: buildAutoName(aircraftRegistration, bucket.inspectionLabel, file.name, idx + 1),
          fileSize: file.size,
          mimeType: file.type || "application/octet-stream",
          documentType: bucket.isVideo ? "photo" : "approved_data",
          description: bucket.title,
        });
        uploaded += 1;
      }

      toast.success(`${uploaded} file${uploaded === 1 ? "" : "s"} uploaded.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setIsUploading(false);
    }
  }

  async function handleDelete(documentId: Id<"documents">) {
    setDeletingId(documentId);
    try {
      await deleteDocument({
        organizationId,
        documentId,
      });
      toast.success("Evidence file deleted.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete evidence file.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-foreground">{bucket.title}</CardTitle>
        <p className="text-xs text-muted-foreground">{bucket.subtitle}</p>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <Badge variant="outline" className="text-[10px] border-border/60">
            {orderedDocs.length} file{orderedDocs.length === 1 ? "" : "s"}
          </Badge>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept={bucket.accept}
            multiple={bucket.multiple}
            onChange={(e) => {
              void uploadFiles(e.target.files);
              e.currentTarget.value = "";
            }}
            disabled={isUploading}
          />
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-[11px] gap-1"
            disabled={isUploading}
            onClick={() => fileInputRef.current?.click()}
          >
            {isUploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
            Upload
          </Button>
        </div>

        {bucket.isVideo && (
          <div className="flex items-start gap-2 rounded-md border border-sky-500/30 bg-sky-500/5 p-2">
            <AlertCircle className="w-3.5 h-3.5 text-sky-400 mt-0.5 flex-shrink-0" />
            <p className="text-[11px] text-sky-300">
              Mobile upload is supported. Recommended clip duration is 10-20 minutes per file.
            </p>
          </div>
        )}

        {orderedDocs.length === 0 ? (
          <div className="rounded-md border border-dashed border-border/50 py-8 text-center text-xs text-muted-foreground">
            No evidence uploaded in this section.
          </div>
        ) : (
          <div>
            {orderedDocs.map((doc) => (
              <EvidenceRow
                key={String(doc._id)}
                document={{
                  _id: doc._id,
                  storageId: doc.storageId,
                  fileName: doc.fileName,
                  fileSize: doc.fileSize,
                  mimeType: doc.mimeType,
                  uploadedAt: doc.uploadedAt,
                }}
                onPreview={(selected) => setPreviewDoc(selected)}
                onDelete={(docId) => {
                  void handleDelete(docId);
                }}
                deleting={deletingId === doc._id}
              />
            ))}
          </div>
        )}

        <Dialog open={!!previewDoc} onOpenChange={(open) => !open && setPreviewDoc(null)}>
          <DialogContent className="sm:max-w-3xl">
            <DialogHeader>
              <DialogTitle>{previewDoc?.fileName}</DialogTitle>
            </DialogHeader>
            {previewDoc && previewDoc.mimeType.startsWith("video/") ? (
              previewUrl ? (
                <video src={previewUrl} controls className="w-full max-h-[70vh] rounded bg-black" />
              ) : (
                <div className="h-40 flex items-center justify-center text-sm text-muted-foreground">Loading preview…</div>
              )
            ) : previewUrl ? (
              <iframe title={previewDoc?.fileName} src={previewUrl} className="w-full h-[70vh] rounded border" />
            ) : (
              <div className="h-40 flex items-center justify-center text-sm text-muted-foreground">Loading preview…</div>
            )}
            {previewUrl && (
              <div className="flex justify-end gap-2">
                <Button asChild size="sm" variant="outline">
                  <a href={previewUrl} target="_blank" rel="noopener noreferrer" download={previewDoc?.fileName}>
                    <Download className="w-3.5 h-3.5 mr-1.5" />
                    Download
                  </a>
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

export function InDockRtsEvidenceTab({
  organizationId,
  workOrderId,
  aircraftRegistration,
}: {
  organizationId: Id<"organizations">;
  workOrderId: string;
  aircraftRegistration: string;
}) {
  return (
    <div className="space-y-4" data-testid="wo-evidence-tab">
      <div>
        <h3 className="text-sm font-semibold text-foreground">In-dock Evidence</h3>
        <p className="text-xs text-muted-foreground">
          Capture incoming inspection checklist records and liability videos.
        </p>
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
        {EVIDENCE_BUCKETS.filter((b) => b.key.startsWith("in_dock")).map((bucket) => (
          <EvidenceBucketCard
            key={bucket.key}
            organizationId={organizationId}
            workOrderId={workOrderId}
            aircraftRegistration={aircraftRegistration}
            bucket={bucket}
          />
        ))}
      </div>

      <div>
        <h3 className="text-sm font-semibold text-foreground">Return-to-Service Evidence</h3>
        <p className="text-xs text-muted-foreground">
          Store release checklist records and final walk-around liability videos.
        </p>
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
        {EVIDENCE_BUCKETS.filter((b) => b.key.startsWith("rts")).map((bucket) => (
          <EvidenceBucketCard
            key={bucket.key}
            organizationId={organizationId}
            workOrderId={workOrderId}
            aircraftRegistration={aircraftRegistration}
            bucket={bucket}
          />
        ))}
      </div>
    </div>
  );
}
