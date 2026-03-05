"use client";

/**
 * ConformityDocumentPanel.tsx
 * Inventory Phase 3: Conformity Document Management
 *
 * Reusable component for managing conformity documentation on parts and lots.
 * Displays a status bar showing which document roles are satisfied (CoC, CoA,
 * 8130-3, Test Report, Material Cert), lists linked documents with role badges,
 * and provides upload/link/unlink functionality.
 *
 * Can be embedded in lot detail, part detail, or receiving inspection views.
 *
 * Upload flow follows the existing Convex file storage pattern:
 *   1. generateUploadUrl → short-lived URL
 *   2. POST file bytes directly to that URL
 *   3. saveDocument → storageId + metadata
 *   4. linkDocument → create partDocuments junction record
 */

import { useState, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { toast } from "sonner";
import {
  CheckCircle2,
  XCircle,
  Upload,
  Trash2,
  ExternalLink,
  FileText,
  Image,
  File,
  Loader2,
  ShieldCheck,
  Link2,
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

type DocumentRole =
  | "certificate_of_conformity"
  | "certificate_of_analysis"
  | "8130_3"
  | "test_report"
  | "material_cert"
  | "receiving_inspection"
  | "other";

interface ConformityDocumentPanelProps {
  organizationId: Id<"organizations">;
  partId?: Id<"parts">;
  lotId?: Id<"lots">;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const DOCUMENT_ROLE_META: Record<
  DocumentRole,
  { label: string; shortLabel: string; badge: string }
> = {
  certificate_of_conformity: {
    label: "Certificate of Conformity (CoC)",
    shortLabel: "CoC",
    badge: "bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30",
  },
  certificate_of_analysis: {
    label: "Certificate of Analysis (CoA)",
    shortLabel: "CoA",
    badge: "bg-violet-500/15 text-violet-600 dark:text-violet-400 border-violet-500/30",
  },
  "8130_3": {
    label: "FAA Form 8130-3",
    shortLabel: "8130-3",
    badge: "bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30",
  },
  test_report: {
    label: "Test Report",
    shortLabel: "Test Rpt",
    badge: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
  },
  material_cert: {
    label: "Material Certificate",
    shortLabel: "Mat Cert",
    badge: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
  },
  receiving_inspection: {
    label: "Receiving Inspection",
    shortLabel: "Recv Insp",
    badge: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30",
  },
  other: {
    label: "Other",
    shortLabel: "Other",
    badge: "bg-muted text-muted-foreground border-border/60",
  },
};

const ALL_ROLES: DocumentRole[] = [
  "certificate_of_conformity",
  "certificate_of_analysis",
  "8130_3",
  "test_report",
  "material_cert",
  "receiving_inspection",
  "other",
];

const CONFORMITY_CHECK_ROLES: Array<{
  key: string;
  label: string;
  statusKey: string;
}> = [
  { key: "certificate_of_conformity", label: "CoC", statusKey: "hasCertificateOfConformity" },
  { key: "certificate_of_analysis", label: "CoA", statusKey: "hasCertificateOfAnalysis" },
  { key: "8130_3", label: "8130-3", statusKey: "has8130_3" },
  { key: "test_report", label: "Test Report", statusKey: "hasTestReport" },
  { key: "material_cert", label: "Material Cert", statusKey: "hasMaterialCert" },
];

// ─── File helpers ───────────────────────────────────────────────────────────

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

// ─── DocumentLinkRow ─────────────────────────────────────────────────────────

// BUG-HUNT-112: View button that resolves the Convex storage URL via a live
// query. Previously handleView opened `#doc-${storageId}` which navigated
// nowhere — the "View document" button was completely non-functional. Now each
// row queries its own serving URL and opens it in a new tab.
function ViewDocumentButton({ storageId }: { storageId: Id<"_storage"> }) {
  const url = useQuery(api.documents.getDocumentUrl, { storageId });
  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-7 w-7"
      title={url ? "View document" : "Loading…"}
      disabled={!url}
      onClick={() => {
        if (url) window.open(url, "_blank", "noopener,noreferrer");
      }}
    >
      <ExternalLink className="w-3.5 h-3.5" />
    </Button>
  );
}

function DocumentLinkRow({
  link,
  onUnlink,
}: {
  link: {
    _id: Id<"partDocuments">;
    documentRole: DocumentRole;
    document: {
      _id: Id<"documents">;
      storageId: Id<"_storage">;
      fileName: string;
      fileSize: number;
      mimeType: string;
      uploadedAt: number;
    } | null;
  };
  onUnlink: (linkId: Id<"partDocuments">, fileName: string) => void;
}) {
  const meta = DOCUMENT_ROLE_META[link.documentRole];
  const doc = link.document;

  if (!doc) {
    return (
      <div className="flex items-center gap-3 py-2.5 px-1 text-muted-foreground text-xs">
        <File className="w-4 h-4 flex-shrink-0" />
        <span>Document not found</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 py-2.5 px-1 group">
      <FileIcon mimeType={doc.mimeType} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-medium text-foreground truncate max-w-[200px]">
            {doc.fileName}
          </span>
          <Badge className={`border text-[10px] ${meta.badge}`}>
            {meta.shortLabel}
          </Badge>
        </div>
        <span className="text-[10px] text-muted-foreground">
          {formatFileSize(doc.fileSize)}
        </span>
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
        <ViewDocumentButton storageId={doc.storageId} />
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-destructive"
          title="Unlink document"
          onClick={() => onUnlink(link._id, doc.fileName)}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}

// ─── Upload + Link Form ─────────────────────────────────────────────────────

function UploadAndLinkForm({
  organizationId,
  partId,
  lotId,
  onUploaded,
}: {
  organizationId: Id<"organizations">;
  partId?: Id<"parts">;
  lotId?: Id<"lots">;
  onUploaded: () => void;
}) {
  const [isUploading, setIsUploading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<DocumentRole>("certificate_of_conformity");
  const [description, setDescription] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const generateUploadUrl = useMutation(api.documents.generateUploadUrl);
  const saveDocument = useMutation(api.documents.saveDocument);
  const linkDocument = useMutation(api.partDocuments.linkDocument);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const maxSize = 25 * 1024 * 1024; // 25 MB
    if (file.size > maxSize) {
      toast.error(
        `File too large: ${formatFileSize(file.size)}. Maximum: ${formatFileSize(maxSize)}.`,
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

      // 3. Save document metadata
      const attachedToTable = lotId ? "lots" : "parts";
      const attachedToId = (lotId ?? partId) as string;

      const documentId = await saveDocument({
        organizationId,
        attachedToTable,
        attachedToId,
        storageId,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type || "application/octet-stream",
        documentType: "other", // Generic type — the role is tracked in partDocuments
        description: description.trim() || undefined,
      });

      // 4. Create the part-document link with the conformity role
      await linkDocument({
        organizationId,
        partId,
        lotId,
        documentId,
        documentRole: selectedRole as "other" | "photo" | "vendor_invoice" | "certificate_of_conformity" | "certificate_of_airworthiness" | "test_report" | "8130_3_tag" | "receiving_inspection_report" | "packing_slip" | "material_certification" | "spec_sheet",
        description: description.trim() || undefined,
        linkedByUserId: "system",
      });

      toast.success(`"${file.name}" attached as ${DOCUMENT_ROLE_META[selectedRole].label}.`);
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
        <div className="space-y-1">
          <Label className="text-[11px] font-medium text-muted-foreground">
            Document Role
          </Label>
          <Select
            value={selectedRole}
            onValueChange={(v) => setSelectedRole(v as DocumentRole)}
            disabled={isUploading}
          >
            <SelectTrigger className="h-8 text-xs border-border/60">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ALL_ROLES.map((role) => (
                <SelectItem key={role} value={role} className="text-xs">
                  {DOCUMENT_ROLE_META[role].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-[11px] font-medium text-muted-foreground">
            Description (optional)
          </Label>
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. Vendor CoC for lot 2026-03"
            className="h-8 text-xs border-border/60"
            disabled={isUploading}
            maxLength={120}
          />
        </div>
      </div>

      <div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,.gif,.tiff,.doc,.docx,.xls,.xlsx,.txt"
          onChange={handleFileChange}
          disabled={isUploading}
          className="hidden"
          id={`conformity-upload-${lotId ?? partId ?? "panel"}`}
        />
        <Button
          asChild
          variant="outline"
          size="sm"
          className="w-full h-9 text-xs border-dashed border-border/60 gap-2"
          disabled={isUploading}
        >
          <label
            htmlFor={`conformity-upload-${lotId ?? partId ?? "panel"}`}
            className="cursor-pointer"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Uploading...
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
          PDF, JPEG, PNG, Word, Excel -- Max 25 MB
        </p>
      </div>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function ConformityDocumentPanel({
  organizationId,
  partId,
  lotId,
}: ConformityDocumentPanelProps) {
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [unlinkTarget, setUnlinkTarget] = useState<{
    linkId: Id<"partDocuments">;
    fileName: string;
  } | null>(null);

  // Fetch linked documents based on props
  const partDocs = useQuery(
    api.partDocuments.listForPart,
    partId ? { partId } : "skip",
  );
  const lotDocs = useQuery(
    api.partDocuments.listForLot,
    lotId ? { lotId } : "skip",
  );

  // Fetch conformity status
  const conformityStatus = useQuery(
    api.partDocuments.getConformityStatus,
    partId || lotId ? { partId, lotId } : "skip",
  );

  const unlinkDocument = useMutation(api.partDocuments.unlinkDocument);

  // Merge part + lot docs, deduplicate by linkage._id
  const allDocs = [...(partDocs ?? []), ...(lotDocs ?? [])];
  const seenIds = new Set<string>();
  const uniqueDocs = allDocs.filter((d) => {
    const id = d.linkage._id;
    if (seenIds.has(id)) return false;
    seenIds.add(id);
    return true;
  });

  const isLoading = (partId && partDocs === undefined) || (lotId && lotDocs === undefined);

  async function handleUnlink() {
    if (!unlinkTarget) return;
    try {
      await unlinkDocument({ partDocumentId: unlinkTarget.linkId });
      toast.success("Document unlinked.");
    } catch (err) {
      toast.error(
        `Unlink failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    } finally {
      setUnlinkTarget(null);
    }
  }

  return (
    <div className="space-y-3">
      {/* Conformity Status Bar */}
      {conformityStatus && (
        <div className="flex items-center gap-1.5 flex-wrap p-2.5 rounded-md bg-muted/30 border border-border/40">
          <ShieldCheck className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0 mr-1" />
          {CONFORMITY_CHECK_ROLES.map((role) => {
            const satisfied =
              conformityStatus[role.statusKey as keyof typeof conformityStatus] as boolean;
            return (
              <div
                key={role.key}
                className="flex items-center gap-1 text-[10px]"
                title={
                  satisfied
                    ? `${role.label}: Attached`
                    : `${role.label}: Missing`
                }
              >
                {satisfied ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                ) : (
                  <XCircle className="w-3.5 h-3.5 text-red-400" />
                )}
                <span
                  className={
                    satisfied
                      ? "text-green-600 dark:text-green-400 font-medium"
                      : "text-muted-foreground"
                  }
                >
                  {role.label}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link2 className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-xs font-semibold text-foreground">
            Conformity Documents
          </span>
          {!isLoading && uniqueDocs.length > 0 && (
            <Badge
              variant="secondary"
              className="text-[10px] bg-muted h-4 px-1.5"
            >
              {uniqueDocs.length}
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

      {/* Document List */}
      <Card className="border-border/60">
        <CardContent className="px-4 py-2">
          {isLoading ? (
            <div className="space-y-2 py-2">
              {[1, 2].map((i) => (
                <Skeleton key={i} className="h-9 w-full" />
              ))}
            </div>
          ) : uniqueDocs.length === 0 ? (
            <div className="py-8 text-center">
              <ShieldCheck className="w-6 h-6 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">
                No conformity documents linked
              </p>
              <p className="text-[11px] text-muted-foreground/60 mt-0.5">
                Attach CoC, 8130-3, test reports, or material certs.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border/30">
              {uniqueDocs.map((link) => (
                <DocumentLinkRow
                  key={link.linkage._id}
                  link={
                    {
                      _id: link.linkage._id,
                      documentRole: link.linkage.documentRole as DocumentRole,
                      document: link.document,
                    } as unknown as {
                      _id: Id<"partDocuments">;
                      documentRole: DocumentRole;
                      document: {
                        _id: Id<"documents">;
                        storageId: Id<"_storage">;
                        fileName: string;
                        fileSize: number;
                        mimeType: string;
                        uploadedAt: number;
                      } | null;
                    }
                  }
                  onUnlink={(linkId, fileName) =>
                    setUnlinkTarget({ linkId, fileName })
                  }
                />
              ))}
            </div>
          )}

          {/* Upload form */}
          {showUploadForm && (
            <UploadAndLinkForm
              organizationId={organizationId}
              partId={partId}
              lotId={lotId}
              onUploaded={() => {
                // Keep form open for consecutive uploads
              }}
            />
          )}
        </CardContent>
      </Card>

      {/* Unlink Confirmation */}
      <AlertDialog
        open={!!unlinkTarget}
        onOpenChange={(open) => {
          if (!open) setUnlinkTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unlink document?</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="font-medium">{unlinkTarget?.fileName}</span> will
              be unlinked from this record. The document itself will not be
              deleted from storage.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleUnlink}
            >
              Unlink Document
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
