"use client";

/**
 * FilePreview.tsx — MBP-0064
 * Thumbnail preview for uploaded files with lightbox for images.
 *
 * Usage:
 *   <FilePreview
 *     storageId="abc123"
 *     fileName="photo.jpg"
 *     mimeType="image/jpeg"
 *     onDelete={() => { ... }}
 *   />
 */

import { useState, useCallback } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  X,
  Loader2,
  ImageIcon,
  FileText,
  FileSpreadsheet,
  File as FileIcon,
  Download,
  Maximize2,
} from "lucide-react";
import { Button } from "@/components/ui/button";

// ─── Types ──────────────────────────────────────────────────────────────────

interface FilePreviewProps {
  storageId: string;
  fileName: string;
  mimeType: string;
  onDelete?: () => void;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith("image/")) return ImageIcon;
  if (mimeType === "application/pdf") return FileText;
  if (
    mimeType.includes("spreadsheet") ||
    mimeType.includes("excel") ||
    mimeType === "text/csv"
  )
    return FileSpreadsheet;
  if (mimeType.includes("document") || mimeType.includes("word"))
    return FileText;
  return FileIcon;
}

function isImage(mimeType: string): boolean {
  return mimeType.startsWith("image/");
}

// ─── Lightbox ───────────────────────────────────────────────────────────────

function Lightbox({
  url,
  fileName,
  onClose,
}: {
  url: string;
  fileName: string;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center"
      onClick={onClose}
    >
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-4 right-4 text-white hover:bg-white/20 z-10"
        onClick={onClose}
      >
        <X className="w-5 h-5" />
      </Button>

      <div className="absolute top-4 left-4 text-white/70 text-sm z-10 max-w-[60vw] truncate">
        {fileName}
      </div>

      <div
        className="max-w-[90vw] max-h-[85vh] flex items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={url}
          alt={fileName}
          className="max-w-full max-h-[85vh] object-contain rounded-md"
        />
      </div>
    </div>
  );
}

// ─── Component ──────────────────────────────────────────────────────────────

export function FilePreview({
  storageId,
  fileName,
  mimeType,
  onDelete,
}: FilePreviewProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const url = useQuery(api.fileStorage.getFileUrl, {
    storageId: storageId as Id<"_storage">,
  });

  const Icon = getFileIcon(mimeType);
  const imageFile = isImage(mimeType);

  const handleDownload = useCallback(() => {
    if (!url) return;
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.target = "_blank";
    a.click();
  }, [url, fileName]);

  return (
    <>
      <div className="relative group rounded-md overflow-hidden bg-muted/30 border border-border/40">
        {url === undefined ? (
          <div className="flex items-center justify-center w-full h-20">
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          </div>
        ) : url === null ? (
          <div className="flex items-center justify-center w-full h-20">
            <Icon className="w-5 h-5 text-muted-foreground/50" />
          </div>
        ) : imageFile ? (
          <div className="aspect-square relative">
            <img
              src={url}
              alt={fileName}
              className="w-full h-full object-cover cursor-pointer transition-transform hover:scale-105"
              onClick={() => setLightboxOpen(true)}
              loading="lazy"
            />
            {/* Expand button overlay */}
            <Button
              variant="ghost"
              size="icon"
              className="absolute bottom-1 left-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 hover:bg-black/70 text-white"
              onClick={(e) => {
                e.stopPropagation();
                setLightboxOpen(true);
              }}
            >
              <Maximize2 className="w-3 h-3" />
            </Button>
          </div>
        ) : (
          <div
            className="flex flex-col items-center justify-center gap-1.5 p-3 h-20 cursor-pointer"
            onClick={handleDownload}
          >
            <Icon className="w-5 h-5 text-muted-foreground" />
            <p className="text-[10px] text-muted-foreground truncate max-w-full px-1">
              {fileName}
            </p>
          </div>
        )}

        {/* Action buttons overlay */}
        <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {url && !imageFile && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 bg-black/50 hover:bg-black/70 text-white"
              onClick={(e) => {
                e.stopPropagation();
                handleDownload();
              }}
            >
              <Download className="w-3 h-3" />
            </Button>
          )}
          {onDelete && (
            <Button
              variant="destructive"
              size="icon"
              className="h-6 w-6"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
            >
              <X className="w-3 h-3" />
            </Button>
          )}
        </div>

        {/* File name for images */}
        {imageFile && (
          <div className="px-1.5 py-1 bg-background/80">
            <p className="text-[10px] text-muted-foreground truncate">
              {fileName}
            </p>
          </div>
        )}
      </div>

      {lightboxOpen && url && (
        <Lightbox
          url={url}
          fileName={fileName}
          onClose={() => setLightboxOpen(false)}
        />
      )}
    </>
  );
}
