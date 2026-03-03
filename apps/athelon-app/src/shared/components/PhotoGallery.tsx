"use client";

/**
 * PhotoGallery.tsx — Grid of thumbnail images with lightbox overlay.
 *
 * Usage:
 *   <PhotoGallery
 *     storageIds={["abc123", "def456"]}
 *     onDelete={(storageId) => { ... }}
 *   />
 */

import { useState, useCallback } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Trash2, ChevronLeft, ChevronRight, X, Loader2, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

// ─── Types ──────────────────────────────────────────────────────────────────

interface PhotoGalleryProps {
  /** Convex storage IDs to display */
  storageIds: string[];
  /** Called when delete is clicked. If undefined, no delete button shown. */
  onDelete?: (storageId: string) => void;
  /** Show delete confirmation */
  confirmDelete?: boolean;
}

// ─── Single thumbnail that resolves its own URL ─────────────────────────────

function PhotoThumbnail({
  storageId,
  onClick,
  onDelete,
}: {
  storageId: string;
  onClick: () => void;
  onDelete?: () => void;
}) {
  const url = useQuery(api.documents.getDocumentUrl, {
    storageId: storageId as Id<"_storage">,
  });

  return (
    <div className="relative group aspect-square rounded-md overflow-hidden bg-muted/30 border border-border/40">
      {url === undefined ? (
        <div className="flex items-center justify-center w-full h-full">
          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
        </div>
      ) : url === null ? (
        <div className="flex items-center justify-center w-full h-full">
          <ImageIcon className="w-4 h-4 text-muted-foreground/50" />
        </div>
      ) : (
        <img
          src={url}
          alt=""
          className="w-full h-full object-cover cursor-pointer transition-transform hover:scale-105"
          onClick={onClick}
          loading="lazy"
        />
      )}
      {onDelete && (
        <Button
          variant="destructive"
          size="icon"
          className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
        >
          <Trash2 className="w-3 h-3" />
        </Button>
      )}
    </div>
  );
}

// ─── Lightbox overlay ───────────────────────────────────────────────────────

function Lightbox({
  storageIds,
  currentIndex,
  onClose,
  onPrev,
  onNext,
}: {
  storageIds: string[];
  currentIndex: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  const currentId = storageIds[currentIndex];
  const url = useQuery(api.documents.getDocumentUrl, {
    storageId: currentId as Id<"_storage">,
  });

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center"
      onClick={onClose}
    >
      {/* Close */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-4 right-4 text-white hover:bg-white/20 z-10"
        onClick={onClose}
      >
        <X className="w-5 h-5" />
      </Button>

      {/* Counter */}
      <div className="absolute top-4 left-4 text-white/70 text-sm z-10">
        {currentIndex + 1} / {storageIds.length}
      </div>

      {/* Prev */}
      {storageIds.length > 1 && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 z-10"
          onClick={(e) => {
            e.stopPropagation();
            onPrev();
          }}
        >
          <ChevronLeft className="w-6 h-6" />
        </Button>
      )}

      {/* Next */}
      {storageIds.length > 1 && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 z-10"
          onClick={(e) => {
            e.stopPropagation();
            onNext();
          }}
        >
          <ChevronRight className="w-6 h-6" />
        </Button>
      )}

      {/* Image */}
      <div
        className="max-w-[90vw] max-h-[85vh] flex items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        {url === undefined ? (
          <Loader2 className="w-8 h-8 animate-spin text-white" />
        ) : url === null ? (
          <p className="text-white/60 text-sm">Image not available</p>
        ) : (
          <img
            src={url}
            alt=""
            className="max-w-full max-h-[85vh] object-contain rounded-md"
          />
        )}
      </div>
    </div>
  );
}

// ─── Main component ─────────────────────────────────────────────────────────

export function PhotoGallery({
  storageIds,
  onDelete,
  confirmDelete = true,
}: PhotoGalleryProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const handleDelete = useCallback(
    (storageId: string) => {
      if (!onDelete) return;
      if (confirmDelete && !confirm("Delete this photo? This cannot be undone.")) return;
      onDelete(storageId);
    },
    [onDelete, confirmDelete],
  );

  if (storageIds.length === 0) return null;

  return (
    <>
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
        {storageIds.map((id, idx) => (
          <PhotoThumbnail
            key={id}
            storageId={id}
            onClick={() => setLightboxIndex(idx)}
            onDelete={onDelete ? () => handleDelete(id) : undefined}
          />
        ))}
      </div>

      {lightboxIndex !== null && (
        <Lightbox
          storageIds={storageIds}
          currentIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onPrev={() =>
            setLightboxIndex((i) =>
              i !== null ? (i - 1 + storageIds.length) % storageIds.length : null,
            )
          }
          onNext={() =>
            setLightboxIndex((i) =>
              i !== null ? (i + 1) % storageIds.length : null,
            )
          }
        />
      )}
    </>
  );
}
