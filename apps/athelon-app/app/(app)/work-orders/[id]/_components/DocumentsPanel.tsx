"use client";

/**
 * DocumentsPanel.tsx — MBP-0067: Document Attachment on Work Orders
 *
 * Full document management panel for work orders:
 *   - Upload actual files via Convex file storage
 *   - List attached documents with download links
 *   - File type icons, upload date, uploader name
 *   - Delete with confirmation dialog
 *   - Category tabs for filtering
 */

import { useMemo, useState, useCallback, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { toast } from "sonner";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FileText,
  Download,
  Eye,
  Upload,
  Trash2,
  Image as ImageIcon,
  FileSpreadsheet,
  FileArchive,
  File,
  Loader2,
} from "lucide-react";
import { formatDateTime } from "@/lib/format";

// ─── Types ──────────────────────────────────────────────────────────────────

type DocumentCategory = "compliance" | "reference" | "photo" | "general";

type DocumentType =
  | "approved_data"
  | "ad_document"
  | "work_authorization"
  | "photo"
  | "parts_8130"
  | "vendor_invoice"
  | "other";

type DocumentsPanelProps = {
  workOrderId: string;
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function categoryForDocument(documentType: string): DocumentCategory {
  if (["ad_document", "parts_8130", "approved_data"].includes(documentType))
    return "compliance";
  if (documentType === "photo") return "photo";
  if (["work_authorization", "vendor_invoice"].includes(documentType))
    return "reference";
  return "general";
}

const CATEGORY_STYLES: Record<DocumentCategory, string> = {
  compliance: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  reference: "bg-sky-500/15 text-sky-400 border-sky-500/30",
  photo: "bg-violet-500/15 text-violet-400 border-violet-500/30",
  general: "bg-muted text-muted-foreground border-border/60",
};

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith("image/")) return ImageIcon;
  if (mimeType === "application/pdf") return FileText;
  if (
    mimeType.includes("spreadsheet") ||
    mimeType.includes("excel") ||
    mimeType.includes("csv")
  )
    return FileSpreadsheet;
  if (mimeType.includes("zip") || mimeType.includes("compressed"))
    return FileArchive;
  return File;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  approved_data: "Approved Data",
  ad_document: "AD Document",
  work_authorization: "Work Authorization",
  photo: "Photo",
  parts_8130: "8130-3 Tag",
  vendor_invoice: "Vendor Invoice",
  other: "Other",
};

// ─── Component ──────────────────────────────────────────────────────────────

export function DocumentsPanel({ workOrderId }: DocumentsPanelProps) {
  const { orgId } = useCurrentOrg();
  const [activeTab, setActiveTab] = useState<"all" | DocumentCategory>("all");
  const [uploading, setUploading] = useState(false);
  const [selectedDocType, setSelectedDocType] = useState<DocumentType>("other");
  const [deleteTarget, setDeleteTarget] = useState<{
    id: Id<"documents">;
    name: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const generateUploadUrl = useMutation(api.documents.generateUploadUrl);
  const saveDocument = useMutation(api.documents.saveDocument);
  const deleteDocument = useMutation(api.documents.deleteDocument);

  const documents = useQuery(api.documents.listDocuments, {
    attachedToTable: "workOrders",
    attachedToId: workOrderId,
  });

  const docs = useMemo(() => {
    const list = (documents ?? []).map((doc) => ({
      ...doc,
      category: categoryForDocument(doc.documentType),
    }));
    if (activeTab === "all") return list;
    return list.filter((doc) => doc.category === activeTab);
  }, [documents, activeTab]);

  const handleUpload = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0 || !orgId) return;

      setUploading(true);
      let successCount = 0;

      try {
        for (const file of Array.from(files)) {
          // 50MB limit
          if (file.size > 50 * 1024 * 1024) {
            toast.error(`${file.name} exceeds 50MB limit`);
            continue;
          }

          const uploadUrl = await generateUploadUrl();

          const response = await fetch(uploadUrl, {
            method: "POST",
            headers: { "Content-Type": file.type || "application/octet-stream" },
            body: file,
          });

          if (!response.ok) {
            toast.error(`Failed to upload ${file.name}`);
            continue;
          }

          const { storageId } = (await response.json()) as {
            storageId: Id<"_storage">;
          };

          // Auto-detect document type for images
          const docType: DocumentType = file.type.startsWith("image/")
            ? "photo"
            : selectedDocType;

          await saveDocument({
            organizationId: orgId,
            attachedToTable: "workOrders",
            attachedToId: workOrderId,
            storageId,
            fileName: file.name,
            fileSize: file.size,
            mimeType: file.type || "application/octet-stream",
            documentType: docType,
          });

          successCount++;
        }

        if (successCount > 0) {
          toast.success(
            successCount === 1
              ? "Document uploaded"
              : `${successCount} documents uploaded`,
          );
        }
      } catch (err) {
        toast.error("Upload failed");
        console.error(err);
      } finally {
        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    },
    [orgId, workOrderId, generateUploadUrl, saveDocument, selectedDocType],
  );

  const handleDelete = useCallback(async () => {
    if (!deleteTarget || !orgId) return;

    try {
      await deleteDocument({
        documentId: deleteTarget.id,
        organizationId: orgId,
      });
      toast.success(`Deleted "${deleteTarget.name}"`);
    } catch (err) {
      toast.error("Delete failed");
      console.error(err);
    } finally {
      setDeleteTarget(null);
    }
  }, [deleteTarget, orgId, deleteDocument]);

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <Tabs
          value={activeTab}
          onValueChange={(v) =>
            setActiveTab(v as "all" | DocumentCategory)
          }
        >
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="compliance">Compliance</TabsTrigger>
            <TabsTrigger value="reference">Reference</TabsTrigger>
            <TabsTrigger value="photo">Photos</TabsTrigger>
            <TabsTrigger value="general">General</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex items-center gap-2">
          <Select
            value={selectedDocType}
            onValueChange={(v) => setSelectedDocType(v as DocumentType)}
          >
            <SelectTrigger className="w-[160px] h-8 text-xs">
              <SelectValue placeholder="Doc type" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(DOCUMENT_TYPE_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => handleUpload(e.target.files)}
          />
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            disabled={uploading || !orgId}
            onClick={() => fileInputRef.current?.click()}
          >
            {uploading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Upload className="w-3.5 h-3.5" />
            )}
            {uploading ? "Uploading…" : "Upload"}
          </Button>
        </div>
      </div>

      {/* Document List */}
      <Card className="border-border/60">
        <CardContent className="p-0">
          {documents === undefined ? (
            <div className="p-4 text-sm text-muted-foreground">
              Loading documents…
            </div>
          ) : docs.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              <FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
              No documents in this category.
              <br />
              <span className="text-xs">
                Click Upload to attach files to this work order.
              </span>
            </div>
          ) : (
            <div className="divide-y divide-border/40">
              {docs.map((doc) => (
                <DocumentRow
                  key={doc._id}
                  doc={doc}
                  onDelete={(id, name) => setDeleteTarget({ id, name })}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete document?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete &quot;{deleteTarget?.name}&quot;.
              This action cannot be undone. Verify this document is not needed
              for FAA compliance traceability.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── Row ────────────────────────────────────────────────────────────────────

function DocumentRow({
  doc,
  onDelete,
}: {
  doc: {
    _id: Id<"documents">;
    storageId: Id<"_storage">;
    fileName: string;
    fileSize: number;
    uploadedByUserId: string;
    uploadedAt: number;
    mimeType: string;
    documentType: string;
    category: DocumentCategory;
  };
  onDelete: (id: Id<"documents">, name: string) => void;
}) {
  const url = useQuery(api.documents.getDocumentUrl, {
    storageId: doc.storageId,
  });
  const Icon = getFileIcon(doc.mimeType);

  return (
    <div className="px-4 py-3 flex items-center gap-3 group hover:bg-muted/30 transition-colors">
      <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-medium text-foreground truncate">
            {doc.fileName}
          </p>
          <Badge
            variant="outline"
            className={`text-[10px] capitalize border ${CATEGORY_STYLES[doc.category]}`}
          >
            {doc.category}
          </Badge>
          <span className="text-[10px] text-muted-foreground">
            {formatFileSize(doc.fileSize)}
          </span>
        </div>
        <p className="text-[11px] text-muted-foreground">
          Uploaded by {doc.uploadedByUserId} ·{" "}
          {formatDateTime(doc.uploadedAt)}
        </p>
      </div>
      <div className="flex items-center gap-1">
        {doc.mimeType === "application/pdf" && url && (
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="gap-1 text-xs"
          >
            <a href={url} target="_blank" rel="noreferrer">
              <Eye className="w-3.5 h-3.5" />
              View
            </a>
          </Button>
        )}
        {url && (
          <Button
            asChild
            variant="outline"
            size="sm"
            className="gap-1 text-xs"
          >
            <a href={url} target="_blank" rel="noreferrer" download>
              <Download className="w-3.5 h-3.5" />
            </a>
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="gap-1 text-xs text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={() => onDelete(doc._id, doc.fileName)}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}
