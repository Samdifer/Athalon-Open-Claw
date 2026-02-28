"use client";

/**
 * DocumentAttachmentPanel.tsx
 * Phase E: Document Attachment System
 *
 * Reusable panel for attaching, viewing, and deleting supporting documents
 * on any entity (work orders, discrepancies, task cards, maintenance records).
 *
 * Upload flow:
 *   1. User selects file → generateUploadUrl (mutation) → short-lived URL
 *   2. Client POSTs file bytes directly to that URL
 *   3. saveDocument (mutation) stores storageId + metadata
 *
 * View flow: each document row calls getDocumentUrl and opens in a new tab.
 *
 * Regulatory context:
 *   Approved data (AMM, SB, AD text) attached here satisfies the 14 CFR
 *   Part 43.9(a)(4) documentation requirement: "description of the work
 *   performed" must reference the approved data used.
 */

import { useState, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { toast } from "sonner";
import {
  Paperclip,
  Upload,
  Trash2,
  ExternalLink,
  FileText,
  Image,
  File,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { formatDateTime } from "@/lib/format";
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

// ─── Types ─────────────────────────────────────────────────────────────────────

type DocumentType =
  | "approved_data"
  | "ad_document"
  | "work_authorization"
  | "photo"
  | "parts_8130"
  | "vendor_invoice"
  | "other";

interface DocumentAttachmentPanelProps {
  organizationId: Id<"organizations">;
  attachedToTable: string;
  attachedToId: string;
  /** Optional: restrict which document types are allowed */
  allowedTypes?: DocumentType[];
  /** Max file size in bytes. Default: 25 MB */
  maxFileSizeBytes?: number;
  /** Whether the user can delete documents */
  canDelete?: boolean;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const DOCUMENT_TYPE_META: Record<
  DocumentType,
  { label: string; badge: string }
> = {
  approved_data: {
    label: "Approved Data",
    badge: "bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30",
  },
  ad_document: {
    label: "AD Document",
    badge: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
  },
  work_authorization: {
    label: "Work Authorization",
    badge: "bg-violet-500/15 text-violet-600 dark:text-violet-400 border-violet-500/30",
  },
  photo: {
    label: "Photo",
    badge: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
  },
  parts_8130: {
    label: "Form 8130-3",
    badge: "bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30",
  },
  vendor_invoice: {
    label: "Vendor Invoice",
    badge: "bg-muted text-muted-foreground border-border/60",
  },
  other: {
    label: "Other",
    badge: "bg-muted text-muted-foreground border-border/60",
  },
};

const ALL_TYPES: DocumentType[] = [
  "approved_data",
  "ad_document",
  "work_authorization",
  "photo",
  "parts_8130",
  "vendor_invoice",
  "other",
];

const MAX_FILE_SIZE_DEFAULT = 25 * 1024 * 1024; // 25 MB

// ─── File icon helper ───────────────────────────────────────────────────────

function FileIcon({ mimeType }: { mimeType: string }) {
  if (mimeType.startsWith("image/"))
    return <Image className="w-4 h-4 text-emerald-400 flex-shrink-0" />;
  if (mimeType === "application/pdf")
    return <FileText className="w-4 h-4 text-red-400 flex-shrink-0" />;
  return <File className="w-4 h-4 text-muted-foreground flex-shrink-0" />;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ─── DocumentRow ─────────────────────────────────────────────────────────────

function DocumentRow({
  doc,
  canDelete,
  onDelete,
}: {
  doc: {
    _id: Id<"documents">;
    storageId: Id<"_storage">;
    fileName: string;
    fileSize: number;
    mimeType: string;
    documentType: DocumentType;
    description?: string;
    uploadedAt: number;
  };
  canDelete: boolean;
  onDelete: (doc: { _id: Id<"documents">; fileName: string; documentType: DocumentType }) => void;
}) {
  const url = useQuery(api.documents.getDocumentUrl, {
    storageId: doc.storageId,
  });
  const meta = DOCUMENT_TYPE_META[doc.documentType];

  return (
    <div className="flex items-center gap-3 py-2.5 px-1 group">
      <FileIcon mimeType={doc.mimeType} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-medium text-foreground truncate max-w-[200px]">
            {doc.fileName}
          </span>
          <Badge className={`border text-[10px] ${meta.badge}`}>
            {meta.label}
          </Badge>
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[10px] text-muted-foreground">
            {formatFileSize(doc.fileSize)}
          </span>
          <span className="text-[10px] text-muted-foreground">·</span>
          <span className="text-[10px] text-muted-foreground">
            {formatDateTime(doc.uploadedAt)}
          </span>
          {doc.description && (
            <>
              <span className="text-[10px] text-muted-foreground">·</span>
              <span className="text-[10px] text-muted-foreground truncate max-w-[180px]">
                {doc.description}
              </span>
            </>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
        {url ? (
          <Button
            asChild
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            title="Open document"
          >
            <a href={url} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </Button>
        ) : (
          <Button variant="ghost" size="icon" className="h-7 w-7" disabled>
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          </Button>
        )}
        {canDelete && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-destructive"
            title="Delete document"
            onClick={() => onDelete(doc)}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}

// ─── Upload form ─────────────────────────────────────────────────────────────

function UploadForm({
  organizationId,
  attachedToTable,
  attachedToId,
  allowedTypes,
  maxFileSizeBytes,
  onUploaded,
}: {
  organizationId: Id<"organizations">;
  attachedToTable: string;
  attachedToId: string;
  allowedTypes: DocumentType[];
  maxFileSizeBytes: number;
  onUploaded: () => void;
}) {
  const [isUploading, setIsUploading] = useState(false);
  const [selectedType, setSelectedType] = useState<DocumentType>("approved_data");
  const [description, setDescription] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const generateUploadUrl = useMutation(api.documents.generateUploadUrl);
  const saveDocument = useMutation(api.documents.saveDocument);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > maxFileSizeBytes) {
      toast.error(
        `File too large: ${formatFileSize(file.size)}. ` +
          `Maximum: ${formatFileSize(maxFileSizeBytes)}.`,
      );
      return;
    }

    setIsUploading(true);
    try {
      // 1. Get upload URL from Convex
      const uploadUrl = await generateUploadUrl();

      // 2. Upload file bytes directly to Convex storage
      const uploadResponse = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });

      if (!uploadResponse.ok) {
        throw new Error(`Upload failed: ${uploadResponse.statusText}`);
      }

      const { storageId } = await uploadResponse.json();

      // 3. Save metadata
      await saveDocument({
        organizationId,
        attachedToTable,
        attachedToId,
        storageId,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type || "application/octet-stream",
        documentType: selectedType,
        description: description.trim() || undefined,
      });

      toast.success(`"${file.name}" attached successfully.`);
      setDescription("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      onUploaded();
    } catch (err) {
      toast.error(
        `Upload failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div className="space-y-3 pt-3 border-t border-border/40">
      <div className="grid grid-cols-2 gap-3">
        {/* Document type */}
        <div className="space-y-1">
          <Label className="text-[11px] font-medium text-muted-foreground">
            Type
          </Label>
          <Select
            value={selectedType}
            onValueChange={(v) => setSelectedType(v as DocumentType)}
            disabled={isUploading}
          >
            <SelectTrigger className="h-8 text-xs border-border/60">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {allowedTypes.map((type) => (
                <SelectItem key={type} value={type} className="text-xs">
                  {DOCUMENT_TYPE_META[type].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Description */}
        <div className="space-y-1">
          <Label className="text-[11px] font-medium text-muted-foreground">
            Description (optional)
          </Label>
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. AMM 27-10-00 Fig. 3"
            className="h-8 text-xs border-border/60"
            disabled={isUploading}
            maxLength={120}
          />
        </div>
      </div>

      {/* File input */}
      <div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,.gif,.tiff,.doc,.docx,.xls,.xlsx,.txt"
          onChange={handleFileChange}
          disabled={isUploading}
          className="hidden"
          id={`file-upload-${attachedToId}`}
        />
        <Button
          asChild
          variant="outline"
          size="sm"
          className="w-full h-9 text-xs border-dashed border-border/60 gap-2"
          disabled={isUploading}
        >
          <label htmlFor={`file-upload-${attachedToId}`} className="cursor-pointer">
            {isUploading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Uploading…
              </>
            ) : (
              <>
                <Upload className="w-3.5 h-3.5" />
                Choose File to Attach
              </>
            )}
          </label>
        </Button>
        <p className="text-[10px] text-muted-foreground mt-1 text-center">
          PDF, JPEG, PNG, Word, Excel · Max {formatFileSize(maxFileSizeBytes)}
        </p>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function DocumentAttachmentPanel({
  organizationId,
  attachedToTable,
  attachedToId,
  allowedTypes = ALL_TYPES,
  maxFileSizeBytes = MAX_FILE_SIZE_DEFAULT,
  canDelete = true,
}: DocumentAttachmentPanelProps) {
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [deletingId, setDeletingId] = useState<Id<"documents"> | null>(null);
  const [deleteConfirmDoc, setDeleteConfirmDoc] = useState<{ id: Id<"documents">; name: string; docType: string } | null>(null);

  const documents = useQuery(api.documents.listDocuments, {
    attachedToTable,
    attachedToId,
  });

  const deleteDocument = useMutation(api.documents.deleteDocument);

  function requestDeleteDoc(doc: { _id: Id<"documents">; fileName: string; documentType: DocumentType }) {
    setDeleteConfirmDoc({
      id: doc._id,
      name: doc.fileName,
      docType: doc.documentType,
    });
  }

  async function handleDelete() {
    if (!deleteConfirmDoc) return;
    setDeletingId(deleteConfirmDoc.id);
    setDeleteConfirmDoc(null);
    try {
      await deleteDocument({ documentId: deleteConfirmDoc.id, organizationId });
      toast.success("Document deleted.");
    } catch (err) {
      toast.error(
        `Delete failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    } finally {
      setDeletingId(null);
    }
  }

  const isLoading = documents === undefined;
  const docList = documents ?? [];

  return (
    <div className="space-y-1">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Paperclip className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-xs font-semibold text-foreground">
            Supporting Documents
          </span>
          {!isLoading && docList.length > 0 && (
            <Badge
              variant="secondary"
              className="text-[10px] bg-muted h-4 px-1.5"
            >
              {docList.length}
            </Badge>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs border-border/60 gap-1.5"
          onClick={() => setShowUploadForm((v) => !v)}
        >
          {showUploadForm ? (
            "Cancel"
          ) : (
            <>
              <Upload className="w-3 h-3" />
              Attach
            </>
          )}
        </Button>
      </div>

      {/* Approved data notice */}
      {docList.some((d) => d.documentType === "approved_data") && (
        <div className="flex items-start gap-2 p-2 rounded-md bg-sky-500/5 border border-sky-500/20 mb-2">
          <ShieldCheck className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400 flex-shrink-0 mt-0.5" />
          <p className="text-[10px] text-sky-600 dark:text-sky-400">
            Approved data attached — 14 CFR Part 43.9(a)(4) satisfied.
          </p>
        </div>
      )}

      {/* Document list */}
      <Card className="border-border/60">
        <CardContent className="px-4 py-2">
          {isLoading ? (
            <div className="space-y-2 py-2">
              {[1, 2].map((i) => (
                <Skeleton key={i} className="h-9 w-full" />
              ))}
            </div>
          ) : docList.length === 0 ? (
            <div className="py-8 text-center">
              <Paperclip className="w-6 h-6 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">
                No documents attached
              </p>
              <p className="text-[11px] text-muted-foreground/60 mt-0.5">
                Attach AMM pages, photos, or work authorizations here.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border/30">
              {docList.map((doc, idx) => (
                <DocumentRow
                  key={doc._id}
                  doc={doc as Parameters<typeof DocumentRow>[0]["doc"]}
                  canDelete={canDelete && deletingId !== doc._id}
                  onDelete={requestDeleteDoc}
                />
              ))}
            </div>
          )}

          {/* Upload form */}
          {showUploadForm && (
            <UploadForm
              organizationId={organizationId}
              attachedToTable={attachedToTable}
              attachedToId={attachedToId}
              allowedTypes={allowedTypes}
              maxFileSizeBytes={maxFileSizeBytes}
              onUploaded={() => {
                // Keep form open for consecutive uploads
              }}
            />
          )}
        </CardContent>
      </Card>

      {/* Delete confirmation */}
      <AlertDialog
        open={!!deleteConfirmDoc}
        onOpenChange={(open) => {
          if (!open) setDeleteConfirmDoc(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete document?</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="font-medium">{deleteConfirmDoc?.name}</span>
              {deleteConfirmDoc?.docType && (
                <> ({deleteConfirmDoc.docType.replace(/_/g, " ")})</>
              )}{" "}
              will be permanently removed from this record. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
            >
              Delete Document
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
