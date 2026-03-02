"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AlertCircle, Loader2, CheckCircle } from "lucide-react";
import { FileUpload, type UploadedFile } from "@/components/FileUpload";
import { PhotoGallery } from "@/components/PhotoGallery";

interface InductAircraftDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workOrderId: Id<"workOrders">;
  aircraftId: Id<"aircraft">;
  organizationId: Id<"organizations">;
}

export function InductAircraftDialog({
  open,
  onOpenChange,
  workOrderId,
  aircraftId,
  organizationId,
}: InductAircraftDialogProps) {
  const [totalTimeAtInduction, setTotalTimeAtInduction] = useState("");
  const [inductionNotes, setInductionNotes] = useState("");
  const [walkAroundFindings, setWalkAroundFindings] = useState("");
  const [logbookReviewNotes, setLogbookReviewNotes] = useState("");
  const [photoStorageIds, setPhotoStorageIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [updatedTT, setUpdatedTT] = useState<number | null>(null);

  const inductAircraft = useMutation(api.gapFixes.inductAircraft);
  const saveDocument = useMutation(api.documents.saveDocument);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!totalTimeAtInduction) return;

    setSubmitting(true);
    setError(null);

    try {
      await inductAircraft({
        aircraftId,
        workOrderId,
        totalTimeAtInduction: parseFloat(totalTimeAtInduction),
        inductionNotes: inductionNotes.trim() || undefined,
        walkAroundFindings: walkAroundFindings.trim() || undefined,
        logbookReviewNotes: logbookReviewNotes.trim() || undefined,
      });
      // Save induction photos as documents
      for (const storageId of photoStorageIds) {
        try {
          await saveDocument({
            organizationId,
            attachedToTable: "workOrders",
            attachedToId: workOrderId as string,
            storageId: storageId as Id<"_storage">,
            fileName: "induction-photo.jpg",
            fileSize: 0,
            mimeType: "image/jpeg",
            documentType: "photo",
            description: "Aircraft induction photo",
          });
        } catch {
          // Non-blocking
        }
      }

      setUpdatedTT(parseFloat(totalTimeAtInduction));
      setSuccess(true);
      toast.success("Aircraft inducted successfully");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to induct aircraft";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  function handleClose() {
    // BUG-LT-26-002: Guard against mid-flight dismissal via Escape/outside-click.
    // Previously onOpenChange(false) fired unconditionally, which could close
    // the dialog while the induction mutation was in-flight. The aircraft total
    // time update and status change might succeed on the backend but the UI
    // would show the dialog as closed — and the parent wouldn't re-query.
    if (submitting) return;
    onOpenChange(false);
    setTimeout(() => {
      setTotalTimeAtInduction("");
      setInductionNotes("");
      setWalkAroundFindings("");
      setLogbookReviewNotes("");
      setError(null);
      setSubmitting(false);
      setSuccess(false);
      setUpdatedTT(null);
    }, 300);
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Induct Aircraft</DialogTitle>
          <DialogDescription>
            Record aircraft arrival and initial inspection findings. Updates
            total time and sets work order status to{" "}
            <span className="text-sky-400">received_inspection_pending</span>.
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="space-y-4 py-2">
            <div className="flex items-center gap-3 p-3 rounded-md bg-green-500/10 border border-green-500/30">
              <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-green-400">
                  Aircraft Inducted
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Total Time: {updatedTT?.toFixed(1)} hrs · Status:{" "}
                  <span className="text-sky-400">
                    received_inspection_pending
                  </span>
                </p>
              </div>
            </div>
            <Button className="w-full" onClick={handleClose}>
              Close
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label
                htmlFor="tt-at-induction"
                className="text-xs font-medium mb-1.5 block"
              >
                Total Time at Induction (hours){" "}
                <span className="text-red-400">*</span>
              </Label>
              <Input
                id="tt-at-induction"
                type="number"
                step="0.1"
                min="0"
                value={totalTimeAtInduction}
                onChange={(e) => setTotalTimeAtInduction(e.target.value)}
                placeholder="e.g. 3421.5"
                className="h-9 text-sm bg-muted/30 border-border/60 font-mono"
                required
              />
            </div>

            <div>
              <Label
                htmlFor="induction-notes"
                className="text-xs font-medium mb-1.5 block"
              >
                Induction Notes{" "}
                <span className="text-muted-foreground font-normal">
                  (optional)
                </span>
              </Label>
              <Textarea
                id="induction-notes"
                value={inductionNotes}
                onChange={(e) => setInductionNotes(e.target.value)}
                placeholder="General notes about the induction..."
                rows={2}
                className="text-sm bg-muted/30 border-border/60 resize-none"
              />
            </div>

            <div>
              <Label
                htmlFor="walkaround"
                className="text-xs font-medium mb-1.5 block"
              >
                Walk-Around Findings{" "}
                <span className="text-muted-foreground font-normal">
                  (optional)
                </span>
              </Label>
              <Textarea
                id="walkaround"
                value={walkAroundFindings}
                onChange={(e) => setWalkAroundFindings(e.target.value)}
                placeholder="Physical inspection findings on arrival..."
                rows={2}
                className="text-sm bg-muted/30 border-border/60 resize-none"
              />
            </div>

            <div>
              <Label
                htmlFor="logbook"
                className="text-xs font-medium mb-1.5 block"
              >
                Logbook Review Notes{" "}
                <span className="text-muted-foreground font-normal">
                  (optional)
                </span>
              </Label>
              <Textarea
                id="logbook"
                value={logbookReviewNotes}
                onChange={(e) => setLogbookReviewNotes(e.target.value)}
                placeholder="Notes from reviewing aircraft logbooks..."
                rows={2}
                className="text-sm bg-muted/30 border-border/60 resize-none"
              />
            </div>

            {/* Induction Photos */}
            <div>
              <Label className="text-xs font-medium mb-1.5 block">
                Induction Photos{" "}
                <span className="text-muted-foreground font-normal">(optional)</span>
              </Label>
              {photoStorageIds.length > 0 && (
                <div className="mb-2">
                  <PhotoGallery
                    storageIds={photoStorageIds}
                    onDelete={(id) =>
                      setPhotoStorageIds((prev) => prev.filter((s) => s !== id))
                    }
                    confirmDelete={false}
                  />
                </div>
              )}
              <FileUpload
                accept="images"
                multiple
                compact
                maxSizeMB={10}
                onUpload={(file) =>
                  setPhotoStorageIds((prev) => [...prev, file.storageId])
                }
                disabled={submitting}
              />
            </div>

            {error && (
              <div className="flex items-start gap-2 p-3 rounded-md border border-red-500/30 bg-red-500/5">
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-red-400">{error}</p>
              </div>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleClose}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting || !totalTimeAtInduction}
                className="gap-2"
              >
                {submitting && (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                )}
                Induct Aircraft
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
