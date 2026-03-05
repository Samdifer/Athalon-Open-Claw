"use client";

/**
 * PhotoGallery.tsx — MBP-0068: Reusable Photo Gallery Component
 *
 * Features:
 *   - Responsive thumbnail grid
 *   - Click for lightbox / fullscreen view
 *   - Navigate between photos (prev/next + keyboard arrows)
 *   - Download button
 *   - Delete button (with permission check via onDelete prop)
 *   - Caption/description display
 *   - Empty state for no photos
 *
 * Supports two usage modes:
 *   1. Rich mode: pass `photos: PhotoItem[]` with full metadata
 *   2. Legacy mode: pass `storageIds: string[]` with Convex storage IDs
 */

import { useState, useCallback, useEffect, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
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
  ChevronLeft,
  ChevronRight,
  Download,
  Trash2,
  X,
  ImageIcon,
  ZoomIn,
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface PhotoItem {
  /** Unique identifier for the photo */
  id: string;
  /** URL to the full-size image */
  url: string;
  /** URL to a thumbnail (falls back to url if not provided) */
  thumbnailUrl?: string;
  /** File name */
  fileName: string;
  /** Optional caption/description */
  caption?: string;
  /** Upload date (Unix ms) */
  uploadedAt?: number;
  /** Uploader name or ID */
  uploadedBy?: string;
}

// Props when using rich PhotoItem[] mode
interface RichPhotoGalleryProps {
  /** Array of photos to display */
  photos: PhotoItem[];
  storageIds?: never;
  /** Called when user wants to delete a photo. If undefined, delete button is hidden. */
  onDelete?: (photoId: string) => void | Promise<void>;
  /** Whether the current user can delete photos */
  canDelete?: boolean;
  /** Whether to show confirmation dialog before delete (default true) */
  confirmDelete?: boolean;
  /** Loading state */
  loading?: boolean;
  /** Empty state message */
  emptyMessage?: string;
}

// Props when using legacy storageIds mode
interface LegacyPhotoGalleryProps {
  photos?: never;
  /** Array of Convex storage IDs */
  storageIds: string[];
  /** Called when user wants to delete a storage ID */
  onDelete?: (storageId: string) => void | Promise<void>;
  canDelete?: boolean;
  /** Whether to show confirmation dialog before delete (default true) */
  confirmDelete?: boolean;
  loading?: boolean;
  emptyMessage?: string;
}

export type PhotoGalleryProps = RichPhotoGalleryProps | LegacyPhotoGalleryProps;

// ─── Storage ID → URL resolver ─────────────────────────────────────────────

function StoragePhoto({
  storageId,
  onResolved,
}: {
  storageId: string;
  onResolved: (url: string | null) => void;
}) {
  const url = useQuery(api.documents.getDocumentUrl, {
    storageId: storageId as Id<"_storage">,
  });

  useEffect(() => {
    if (url !== undefined) onResolved(url);
  }, [url, onResolved]);

  return null;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function PhotoGallery(props: PhotoGalleryProps) {
  const {
    onDelete,
    canDelete,
    confirmDelete = true,
    loading = false,
    emptyMessage = "No photos yet",
  } = props;

  // Resolve storageIds to URLs for legacy mode
  const [resolvedUrls, setResolvedUrls] = useState<Record<string, string>>({});

  const handleResolved = useCallback(
    (storageId: string, url: string | null) => {
      if (url) {
        setResolvedUrls((prev) => ({ ...prev, [storageId]: url }));
      }
    },
    [],
  );

  // Build unified photos array
  const photos: PhotoItem[] = useMemo(() => {
    if (props.photos) return props.photos;

    // Legacy mode: convert storageIds to PhotoItems
    if (props.storageIds) {
      return props.storageIds
        .filter((id) => resolvedUrls[id])
        .map((id) => ({
          id,
          url: resolvedUrls[id],
          fileName: `Photo`,
        }));
    }

    return [];
  }, [props.photos, props.storageIds, resolvedUrls]);

  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PhotoItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const lightboxOpen = lightboxIndex !== null && lightboxIndex < photos.length;
  const currentPhoto = lightboxOpen ? photos[lightboxIndex] : null;

  // ── Keyboard navigation ─────────────────────────────────────────────────

  const goNext = useCallback(() => {
    if (lightboxIndex === null) return;
    setLightboxIndex((lightboxIndex + 1) % photos.length);
  }, [lightboxIndex, photos.length]);

  const goPrev = useCallback(() => {
    if (lightboxIndex === null) return;
    setLightboxIndex(
      (lightboxIndex - 1 + photos.length) % photos.length,
    );
  }, [lightboxIndex, photos.length]);

  useEffect(() => {
    if (!lightboxOpen) return;

    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") goNext();
      else if (e.key === "ArrowLeft") goPrev();
      else if (e.key === "Escape") setLightboxIndex(null);
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [lightboxOpen, goNext, goPrev]);

  // ── Delete handler ──────────────────────────────────────────────────────

  const handleDeleteDirect = useCallback(
    async (photo: PhotoItem) => {
      if (!onDelete) return;
      await onDelete(photo.id);
    },
    [onDelete],
  );

  const handleDeleteConfirmed = useCallback(async () => {
    if (!deleteTarget || !onDelete) return;
    setDeleting(true);
    try {
      await onDelete(deleteTarget.id);
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  }, [deleteTarget, onDelete]);

  const requestDelete = useCallback(
    (photo: PhotoItem) => {
      if (confirmDelete) {
        setDeleteTarget(photo);
      } else {
        handleDeleteDirect(photo);
      }
    },
    [confirmDelete, handleDeleteDirect],
  );

  // ── Render hidden resolvers for legacy mode ─────────────────────────────

  const resolvers = useMemo(() => {
    if (props.photos || !props.storageIds) return null;
    return props.storageIds.map((id) => (
      <StoragePhoto
        key={id}
        storageId={id}
        onResolved={(url) => handleResolved(id, url)}
      />
    ));
  }, [props.photos, props.storageIds, handleResolved]);

  // ── Loading state ───────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="aspect-square rounded-lg bg-muted animate-pulse"
          />
        ))}
      </div>
    );
  }

  // ── Empty state ─────────────────────────────────────────────────────────

  const showEmpty =
    photos.length === 0 &&
    (!props.storageIds || props.storageIds.length === 0);

  if (showEmpty) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <ImageIcon className="w-12 h-12 mb-3 opacity-30" />
        <p className="text-sm font-medium">{emptyMessage}</p>
        <p className="text-xs mt-1 opacity-60">
          Upload photos to see them here
        </p>
      </div>
    );
  }

  // ── Gallery grid ────────────────────────────────────────────────────────

  return (
    <>
      {resolvers}

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {photos.map((photo, index) => (
          <div
            key={photo.id}
            className="group relative aspect-square rounded-lg overflow-hidden bg-muted cursor-pointer border border-border/40 hover:border-border transition-colors"
            onClick={() => setLightboxIndex(index)}
          >
            <img
              src={photo.thumbnailUrl ?? photo.url}
              alt={photo.caption ?? photo.fileName}
              className="w-full h-full object-cover transition-transform group-hover:scale-105"
              loading="lazy"
            />

            {/* Hover overlay */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
              <ZoomIn className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>

            {/* Delete button on thumbnail */}
            {onDelete && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute top-1 right-1 w-7 h-7 p-0 bg-black/50 hover:bg-red-600 text-white opacity-0 group-hover:opacity-100 transition-opacity rounded-full"
                onClick={(e) => {
                  e.stopPropagation();
                  requestDelete(photo);
                }}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            )}

            {/* Caption */}
            {photo.caption && (
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent px-2 py-1.5">
                <p className="text-[11px] text-white truncate">
                  {photo.caption}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ── Lightbox ─────────────────────────────────────────────────────── */}
      <Dialog
        open={lightboxOpen}
        onOpenChange={(open) => !open && setLightboxIndex(null)}
      >
        <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 bg-black/95 border-none overflow-hidden [&>button]:hidden">
          {currentPhoto && (
            <div className="relative flex flex-col h-[90vh]">
              {/* Top bar */}
              <div className="flex items-center justify-between px-4 py-3 bg-black/80">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-white truncate">
                    {currentPhoto.fileName}
                  </p>
                  {currentPhoto.caption && (
                    <p className="text-xs text-white/60 truncate">
                      {currentPhoto.caption}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <span className="text-xs text-white/50 mr-2">
                    {(lightboxIndex ?? 0) + 1} / {photos.length}
                  </span>

                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-white hover:bg-white/10"
                    asChild
                  >
                    <a
                      href={currentPhoto.url}
                      download={currentPhoto.fileName}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <Download className="w-4 h-4" />
                    </a>
                  </Button>

                  {onDelete && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-400 hover:bg-red-400/10"
                      onClick={(e) => {
                        e.stopPropagation();
                        requestDelete(currentPhoto);
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}

                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-white hover:bg-white/10"
                    onClick={() => setLightboxIndex(null)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Image */}
              <div className="flex-1 flex items-center justify-center relative overflow-hidden">
                <img
                  src={currentPhoto.url}
                  alt={currentPhoto.caption ?? currentPhoto.fileName}
                  className="max-w-full max-h-full object-contain"
                />

                {/* Navigation arrows */}
                {photos.length > 1 && (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute left-2 top-1/2 -translate-y-1/2 text-white bg-black/40 hover:bg-black/60 rounded-full w-10 h-10 p-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        goPrev();
                      }}
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-white bg-black/40 hover:bg-black/60 rounded-full w-10 h-10 p-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        goNext();
                      }}
                    >
                      <ChevronRight className="w-5 h-5" />
                    </Button>
                  </>
                )}
              </div>

              {/* Caption bar */}
              {(currentPhoto.caption || currentPhoto.uploadedBy) && (
                <div className="px-4 py-2 bg-black/80 text-center">
                  {currentPhoto.caption && (
                    <p className="text-sm text-white/80">
                      {currentPhoto.caption}
                    </p>
                  )}
                  {currentPhoto.uploadedBy && (
                    <p className="text-xs text-white/40 mt-0.5">
                      Uploaded by {currentPhoto.uploadedBy}
                      {currentPhoto.uploadedAt &&
                        ` · ${new Date(currentPhoto.uploadedAt).toLocaleDateString()}`}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Delete confirmation ──────────────────────────────────────────── */}
      {confirmDelete && (
        <AlertDialog
          open={!!deleteTarget}
          onOpenChange={(open) => !open && setDeleteTarget(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete photo?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete &quot;{deleteTarget?.fileName}&quot;.
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteConfirmed}
                disabled={deleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleting ? "Deleting…" : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
}
